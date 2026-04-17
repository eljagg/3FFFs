import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'
import { SCENARIO_PATH } from '../lib/graph-queries.js'

const router = Router()

// GET /api/scenarios  — list, filtered by optional role
router.get('/', async (req, res, next) => {
  try {
    const role = (req.query.role || '').toLowerCase()
    const rows = await runQuery(
      `MATCH (s:Scenario)
       ${role ? `WHERE ANY(r IN s.roles WHERE toLower(r) = $role)` : ''}
       OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
       WITH s, count(st) AS stageCount
       RETURN s { .*, stageCount: stageCount } AS scenario
       ORDER BY s.severity DESC, s.id`,
      { role }
    )
    res.json({ scenarios: rows.map(r => r.scenario) })
  } catch (e) { next(e) }
})

// GET /api/scenarios/:id  — single scenario with stages
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

    // Parse signals/options back into arrays (stored as JSON strings)
    const parsedStages = stages
      .filter(s => s.stage)
      .map(({ stage, technique }) => ({
        ...stage,
        signals: safeParse(stage.signals),
        options: safeParse(stage.options),
        technique,
      }))
    res.json({ scenario, stages: parsedStages })
  } catch (e) { next(e) }
})

// GET /api/scenarios/:id/path  — graph traversal for the Attack Path Visualizer
router.get('/:id/path', async (req, res, next) => {
  try {
    const rows = await runQuery(SCENARIO_PATH, { scenarioId: req.params.id })
    if (!rows.length || !rows[0].scenario) return res.status(404).json({ error: 'Scenario not found' })
    const { scenario, path } = rows[0]
    const cleanPath = path
      .filter(p => p.stage)
      .map(({ stage, technique, tactic }) => ({
        stage: {
          ...stage,
          signals: safeParse(stage.signals),
          options: safeParse(stage.options),
        },
        technique,
        tactic,
      }))
    res.json({ scenario, path: cleanPath })
  } catch (e) { next(e) }
})

// POST /api/scenarios/:id/submit  — record an answer
router.post('/:id/submit', async (req, res, next) => {
  try {
    const user = getUser(req)
    const { stageId, optionIndex, correct } = req.body || {}
    await runQuery(
      `MATCH (u:User {id: $userId})
       MATCH (st:Stage {id: $stageId})
       MERGE (u)-[r:ATTEMPTED_STAGE]->(st)
       SET r.optionIndex = $optionIndex,
           r.correct = $correct,
           r.answeredAt = timestamp()`,
      { userId: user.id, stageId, optionIndex, correct: !!correct }
    )
    res.json({ ok: true })
  } catch (e) { next(e) }
})

// POST /api/scenarios/:id/complete  — mark scenario as finished
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

function safeParse(v) {
  if (!v) return []
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return [] }
}

export default router
