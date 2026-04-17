import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

router.get('/tactics', async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (t:Tactic)
      OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(t)
      RETURN t, collect(tech { .id, .name, .description }) AS techniques
      ORDER BY t.order
    `)
    const tactics = rows.map((r) => ({
      ...r.t.properties,
      techniques: r.techniques.filter((x) => x.id),
    }))
    res.json({ tactics })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/techniques', async (req, res) => {
  try {
    const rows = await runQuery(`
      MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
      OPTIONAL MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)-[:USES_TECHNIQUE]->(tech)
      RETURN tech, tac.name AS tacticName, tac.id AS tacticId, collect(DISTINCT sc.title) AS scenarios
      ORDER BY tech.id
    `)
    const techniques = rows.map((r) => ({
      ...r.tech.properties,
      tacticName: r.tacticName,
      tacticId: r.tacticId,
      scenarios: r.scenarios.filter(Boolean),
    }))
    res.json({ techniques })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ results: [] })

  try {
    const rows = await runQuery(
      `
      CALL {
        MATCH (t:Tactic)
        WHERE toLower(t.name) CONTAINS toLower($q) OR toLower(t.summary) CONTAINS toLower($q)
        RETURN 'Tactic' AS kind, t.id AS id, t.name AS label, t.summary AS snippet
        UNION
        MATCH (tech:Technique)
        WHERE toLower(tech.name) CONTAINS toLower($q) OR toLower(tech.description) CONTAINS toLower($q)
        RETURN 'Technique' AS kind, tech.id AS id, tech.name AS label, tech.description AS snippet
        UNION
        MATCH (sc:Scenario)
        WHERE toLower(sc.title) CONTAINS toLower($q) OR toLower(sc.summary) CONTAINS toLower($q)
        RETURN 'Scenario' AS kind, sc.id AS id, sc.title AS label, sc.summary AS snippet
      }
      RETURN kind, id, label, snippet
      LIMIT 20
      `,
      { q }
    )
    res.json({ results: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
