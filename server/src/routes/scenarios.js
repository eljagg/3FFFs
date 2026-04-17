import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { role } = req.query

    const rows = await runQuery(
      `
      MATCH (sc:Scenario)
      ${role ? 'WHERE $role IN sc.roles' : ''}
      OPTIONAL MATCH (sc)-[:HAS_STAGE]->(st:Stage)-[:USES_TECHNIQUE]->(tech:Technique)-[:PART_OF]->(tac:Tactic)
      WITH sc, collect(DISTINCT tac.name) AS tactics
      RETURN sc, tactics
      ORDER BY sc.severity DESC, sc.id
      `,
      { role }
    )
    const scenarios = rows.map((r) => ({
      ...r.sc.properties,
      tactics: r.tactics,
    }))
    res.json({ scenarios })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const rows = await runQuery(
      `
      MATCH (sc:Scenario {id: $id})
      OPTIONAL MATCH (sc)-[r:HAS_STAGE]->(st:Stage)-[:USES_TECHNIQUE]->(tech:Technique)-[:PART_OF]->(tac:Tactic)
      WITH sc, st, tech, tac, r.order AS order
      ORDER BY order
      RETURN sc, collect({
        id: st.id,
        order: st.order,
        heading: st.heading,
        narrative: st.narrative,
        question: st.question,
        signals: st.signals,
        options: st.options,
        tacticName: tac.name,
        tacticId: tac.id,
        techniqueName: tech.name,
        techniqueId: tech.id
      }) AS stages
      `,
      { id: req.params.id }
    )

    if (!rows.length) return res.status(404).json({ error: 'Scenario not found' })

    const scenario = {
      ...rows[0].sc.properties,
      stages: rows[0].stages.map((s) => ({
        ...s,
        signals: JSON.parse(s.signals),
        options: JSON.parse(s.options),
      })),
    }
    res.json({ scenario })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
