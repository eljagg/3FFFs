import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

const router = Router()

// Helper: parse stored JSON strings back to arrays
function safeParse(v) {
  if (!v) return []
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return [] }
}

// GET /api/scenarios — list, optionally filtered by role
router.get('/', async (req, res, next) => {
  try {
    const role = (req.query.role || '').toLowerCase()
    const rows = await runQuery(
      `MATCH (s:Scenario)
       ${role ? `WHERE ANY(r IN s.roles WHERE toLower(r) = $role)` : ''}
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage {type: 'primary'})
       WITH s, count(st) AS stageCount
       RETURN s { .*, stageCount: stageCount } AS scenario
       ORDER BY s.severity DESC, s.id`,
      { role }
    )
    res.json({ scenarios: rows.map(r => r.scenario) })
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
      .map(({ stage, technique }) => ({
        ...stage,
        signals: safeParse(stage.signals),
        options: safeParse(stage.options),
        technique,
      }))
    res.json({ scenario, stages: parsed })
  } catch (e) { next(e) }
})

// GET /api/scenarios/:id/path — the FULL branching graph for the visualizer
// Returns primary stages (linear) plus consequence stages attached to them.
router.get('/:id/path', async (req, res, next) => {
  try {
    const rows = await runQuery(
      `MATCH (s:Scenario {id: $id})
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
       OPTIONAL MATCH (st)-[:USES_TECHNIQUE]->(tech:Technique)
       OPTIONAL MATCH (tech)-[:PART_OF]->(tac:Tactic)
       OPTIONAL MATCH (st)-[lt:LEADS_TO]->(branch:Stage)
       WITH s, st, tech, tac, collect({ onOption: lt.onOption, toStageId: branch.id }) AS branches
       ORDER BY st.order
       RETURN s { .* } AS scenario,
              collect({
                stage: st { .* },
                technique: tech { .id, .name, .description },
                tactic: tac { .id, .name, .order, .uniqueToF3 },
                branches: branches
              }) AS path`,
      { id: req.params.id }
    )
    if (!rows.length || !rows[0].scenario) return res.status(404).json({ error: 'Scenario not found' })
    const { scenario, path } = rows[0]

    const cleanPath = path
      .filter(p => p.stage)
      .map(({ stage, technique, tactic, branches }) => ({
        stage: {
          ...stage,
          signals: safeParse(stage.signals),
          options: safeParse(stage.options),
        },
        technique,
        tactic,
        branches: (branches || []).filter(b => b && b.toStageId),
      }))

    // Split into primary + consequence stages for rendering convenience
    const primary = cleanPath.filter(p => p.stage.type === 'primary' || !p.stage.type)
    const consequence = cleanPath.filter(p => p.stage.type === 'consequence')

    res.json({ scenario, path: primary, consequenceStages: consequence })
  } catch (e) { next(e) }
})

// POST /api/scenarios/:id/choose — navigate the branching tree
// Given the current stage and chosen option, return the next stage to show
router.post('/:id/choose', async (req, res, next) => {
  try {
    const user = getUser(req)
    const { stageId, optionIndex } = req.body || {}
    if (!stageId || typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'stageId and optionIndex required' })
    }

    // Determine next stage via branching logic
    // Note: correctness logging lives in /submit — this route focuses on navigation
    // 1. Is there an explicit LEADS_TO for this option?
    const branchRows = await runQuery(
      `MATCH (from:Stage {id: $stageId})-[r:LEADS_TO {onOption: $optionIndex}]->(to:Stage)
       RETURN to.id AS nextStageId`,
      { stageId, optionIndex }
    )
    if (branchRows.length) {
      return res.json({ nextStageId: branchRows[0].nextStageId, branch: true })
    }

    // 2. No branch: proceed to next primary stage in order
    const nextRows = await runQuery(
      `MATCH (current:Stage {id: $stageId})<-[:HAS_STAGE]-(sc:Scenario)-[:HAS_STAGE]->(next:Stage)
       WHERE next.type = 'primary' AND next.order > current.order
       RETURN next.id AS nextStageId
       ORDER BY next.order LIMIT 1`,
      { stageId }
    )
    if (nextRows.length) {
      return res.json({ nextStageId: nextRows[0].nextStageId, branch: false })
    }

    // No next stage — scenario complete
    res.json({ nextStageId: null, branch: false, done: true })
  } catch (e) { next(e) }
})

// POST /api/scenarios/:id/submit — legacy endpoint, still records attempts
router.post('/:id/submit', async (req, res, next) => {
  try {
    const user = getUser(req)
    const { stageId, optionIndex, correct } = req.body || {}
    await runQuery(
      `MATCH (u:User {id: $userId}), (st:Stage {id: $stageId})
       MERGE (u)-[r:ATTEMPTED_STAGE]->(st)
       SET r.optionIndex = $optionIndex, r.correct = $correct, r.answeredAt = timestamp()`,
      { userId: user.id, stageId, optionIndex, correct: !!correct }
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST /api/scenarios/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  try {
    const user = getUser(req)
    await runQuery(
      `MATCH (u:User {id: $userId}), (sc:Scenario {id: $id})
       MERGE (u)-[c:COMPLETED]->(sc)
       ON CREATE SET c.completedAt = timestamp()
       SET c.lastAt = timestamp()`,
      { userId: user.id, id: req.params.id }
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
