import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

const router = Router()

function safeParse(v) {
  if (!v) return []
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return [] }
}

// Derives a stable stage ID if the graph was seeded before IDs existed
function ensureStageId(stage, scenarioId, fallbackIndex) {
  if (stage?.id) return stage.id
  return `${scenarioId}-S${stage?.order ?? fallbackIndex}`
}

// GET /api/scenarios — list, optionally filtered by job-function role
//
// Role dimensions:
//   - Auth0 role (admin | manager | trainee) = permissions
//   - ?role=<job>  (teller | analyst | soc | executive) = curriculum targeting
//
// Auth0 admins bypass the curriculum filter entirely so they can see every
// scenario for testing, demoing, and progress-QA, regardless of which
// job function they picked in the RolePicker.
//
// Defensive: includes stages with no type field (old-seed) as well as type='primary'
router.get('/', async (req, res, next) => {
  try {
    const user = getUser(req)
    const isAdmin = (user.roles || []).includes('admin')
    const role = (req.query.role || '').toLowerCase()
    const applyFilter = !!role && !isAdmin

    // Two fixes here vs the v16 version:
    //   1. Severity sort uses a CASE-mapped integer — the previous
    //      `ORDER BY severity DESC` sorted alphabetically so "medium"
    //      ranked above "high", which was the wrong way round.
    //   2. OPTIONAL MATCH joins the current user's COMPLETED edges so
    //      the client can render a "✓ completed" indicator per card
    //      without needing a second request.
    const rows = await runQuery(
      `MATCH (s:Scenario)
       ${applyFilter ? `WHERE ANY(r IN s.roles WHERE toLower(r) = $role)` : ''}
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
       WHERE st.type IS NULL OR st.type = 'primary'
       WITH s, count(st) AS stageCount
       OPTIONAL MATCH (u:User {id: $userId})-[c:COMPLETED]->(s)
       RETURN s {
         .*,
         stageCount: stageCount,
         completed: c IS NOT NULL,
         completedAt: c.completedAt
       } AS scenario
       ORDER BY
         CASE s.severity
           WHEN 'high'   THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low'    THEN 3
           ELSE 99
         END,
         s.id`,
      { role, userId: user.id }
    )
    res.json({
      scenarios: rows.map(r => r.scenario),
      filteredByRole: applyFilter ? role : null,
      adminOverride: isAdmin && !!role,
    })
  } catch (e) { next(e) }
})

// GET /api/scenarios/:id — full scenario with all stages
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await runQuery(
      `MATCH (s:Scenario {id: $id})
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
       OPTIONAL MATCH (st)-[:USES_TECHNIQUE]->(tech:Technique)
       WITH s, st, tech ORDER BY st.order
       RETURN s { .* } AS scenario,
              collect({ stage: st { .* }, technique: tech { .id, .name } }) AS stages`,
      { id: req.params.id }
    )
    if (!rows.length || !rows[0].scenario) return res.status(404).json({ error: 'Scenario not found' })
    const { scenario, stages } = rows[0]
    const parsed = stages
      .filter(s => s.stage)
      .map(({ stage, technique }, i) => ({
        ...stage,
        id: ensureStageId(stage, scenario.id, i + 1),
        signals: safeParse(stage.signals),
        options: safeParse(stage.options),
        technique,
      }))
    res.json({ scenario, stages: parsed })
  } catch (e) { next(e) }
})

// GET /api/scenarios/:id/path — FULL branching graph with defensive fallbacks
router.get('/:id/path', async (req, res, next) => {
  try {
    // Aggregate per-stage to avoid Cartesian-product duplication when
    // a stage has multiple relationships. Branches are gathered first,
    // then stages are joined to their (single) technique and tactic.
    const rows = await runQuery(
      `MATCH (s:Scenario {id: $id})
       // DISTINCT here collapses duplicate HAS_STAGE edges if any exist
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
       WITH s, collect(DISTINCT st) AS stages
       UNWIND (CASE WHEN size(stages) = 0 THEN [null] ELSE stages END) AS st
       WITH s, st ORDER BY st.order
       OPTIONAL MATCH (st)-[lt:LEADS_TO]->(branch:Stage)
       WITH s, st,
            collect(DISTINCT CASE WHEN branch IS NOT NULL
                         THEN { onOption: lt.onOption, toStageId: branch.id }
                         ELSE null END) AS branchList
       OPTIONAL MATCH (st)-[:USES_TECHNIQUE]->(tech:Technique)
       OPTIONAL MATCH (tech)-[:PART_OF]->(tac:Tactic)
       WITH s, st, tech, tac, branchList
       RETURN s { .* } AS scenario,
              collect(DISTINCT {
                stage: st { .* },
                technique: tech { .id, .name, .description },
                tactic: tac { .id, .name, .order, .uniqueToF3 },
                branches: [b IN branchList WHERE b IS NOT NULL]
              }) AS path`,
      { id: req.params.id }
    )
    if (!rows.length || !rows[0].scenario) {
      return res.status(404).json({ error: 'Scenario not found' })
    }
    const { scenario, path } = rows[0]

    // Normalize: ensure every stage has id + type, even on old seed data
    const cleanPath = path
      .filter(p => p.stage)
      .map(({ stage, technique, tactic, branches }, i) => ({
        stage: {
          ...stage,
          id: ensureStageId(stage, scenario.id, i + 1),
          type: stage.type || 'primary',
          signals: safeParse(stage.signals),
          options: safeParse(stage.options),
        },
        technique,
        tactic,
        branches: (branches || []).filter(b => b && b.toStageId),
      }))

    // Dedupe by stage id (in case query still returns duplicates)
    const seenIds = new Set()
    const dedupedPath = cleanPath.filter(p => {
      if (!p.stage?.id || seenIds.has(p.stage.id)) return false
      seenIds.add(p.stage.id)
      return true
    })

    const primary = dedupedPath.filter(p => p.stage.type === 'primary')
    const consequence = dedupedPath.filter(p => p.stage.type === 'consequence')

    // Defensive: if no primary stages but stages exist, promote them to primary
    if (primary.length === 0 && cleanPath.length > 0) {
      console.warn(`Scenario ${scenario.id}: no 'primary' stages, promoting all ${cleanPath.length} stages`)
      return res.json({
        scenario,
        path: cleanPath.map(p => ({ ...p, stage: { ...p.stage, type: 'primary' } })),
        consequenceStages: [],
      })
    }

    res.json({ scenario, path: primary, consequenceStages: consequence })
  } catch (e) {
    console.error(`[/scenarios/${req.params.id}/path]`, e)
    next(e)
  }
})

// POST /api/scenarios/:id/choose — branching navigation
router.post('/:id/choose', async (req, res, next) => {
  try {
    const { stageId, optionIndex } = req.body || {}
    if (!stageId || typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'stageId and optionIndex required' })
    }

    const branchRows = await runQuery(
      `MATCH (from:Stage {id: $stageId})-[r:LEADS_TO {onOption: $optionIndex}]->(to:Stage)
       RETURN to.id AS nextStageId`,
      { stageId, optionIndex }
    )
    if (branchRows.length) {
      return res.json({ nextStageId: branchRows[0].nextStageId, branch: true })
    }

    const nextRows = await runQuery(
      `MATCH (current:Stage {id: $stageId})<-[:HAS_STAGE]-(sc:Scenario)-[:HAS_STAGE]->(next:Stage)
       WHERE (next.type IS NULL OR next.type = 'primary') AND next.order > current.order
       RETURN next.id AS nextStageId
       ORDER BY next.order LIMIT 1`,
      { stageId }
    )
    if (nextRows.length) {
      return res.json({ nextStageId: nextRows[0].nextStageId, branch: false })
    }

    res.json({ nextStageId: null, branch: false, done: true })
  } catch (e) { next(e) }
})

router.post('/:id/submit', async (req, res, next) => {
  try {
    const user = getUser(req)
    const { stageId, optionIndex, correct } = req.body || {}
    // MERGE user node to guarantee it exists even if syncUser race-condition'd
    await runQuery(
      `MERGE (u:User {id: $userId})
       ON CREATE SET u.email = $email, u.name = $name, u.createdAt = timestamp()
       SET u.lastSeenAt = timestamp()
       WITH u
       MATCH (st:Stage {id: $stageId})
       MERGE (u)-[r:ATTEMPTED_STAGE]->(st)
       SET r.optionIndex = $optionIndex, r.correct = $correct, r.answeredAt = timestamp()`,
      {
        userId: user.id,
        email: user.email || null,
        name: user.name || null,
        stageId, optionIndex, correct: !!correct,
      }
    )
    res.json({ ok: true, saved: true })
  } catch (e) {
    console.error('[/submit]', e.message)
    next(e)
  }
})

router.post('/:id/complete', async (req, res, next) => {
  try {
    const user = getUser(req)
    await runQuery(
      `MERGE (u:User {id: $userId})
       ON CREATE SET u.email = $email, u.name = $name, u.createdAt = timestamp()
       SET u.lastSeenAt = timestamp()
       WITH u
       MATCH (sc:Scenario {id: $id})
       MERGE (u)-[c:COMPLETED]->(sc)
       ON CREATE SET c.completedAt = timestamp()
       SET c.lastAt = timestamp()`,
      {
        userId: user.id,
        email: user.email || null,
        name: user.name || null,
        id: req.params.id,
      }
    )
    res.json({ ok: true, saved: true })
  } catch (e) {
    console.error('[/complete]', e.message)
    next(e)
  }
})

export default router
