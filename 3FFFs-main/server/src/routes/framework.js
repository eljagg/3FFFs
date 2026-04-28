import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

// GET /api/framework/tactics — tactics with their techniques nested, for the
// Framework encyclopedia page. Each tactic carries its description (from the
// MITRE F3 Excel) and the full list of techniques that sit under it.
router.get('/tactics', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (t:Tactic)
      OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(t)
      WITH t, collect(
        CASE WHEN tech IS NOT NULL
             THEN tech { .id, .name, .description }
             ELSE null END
      ) AS rawTechniques
      WITH t, [x IN rawTechniques WHERE x IS NOT NULL] AS techniques
      RETURN t {
        .*,
        techCount: size(techniques),
        techniques: techniques
      } AS tactic
      ORDER BY t.order
    `)
    res.json({ tactics: rows.map(r => r.tactic) })
  } catch (e) { next(e) }
})

// GET /api/framework/techniques — all techniques with parent tactic
router.get('/techniques', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
      RETURN tech.id AS id, tech.name AS name, tech.description AS description,
             tac.id AS tacticId, tac.name AS tacticName, tac.order AS tacticOrder,
             tac.uniqueToF3 AS uniqueToF3
      ORDER BY tac.order, tech.id
    `)
    res.json({ techniques: rows })
  } catch (e) { next(e) }
})

// GET /api/framework/search?q=... — search techniques + tactics
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toLowerCase()
    if (!q) return res.json({ results: [] })
    const rows = await runQuery(`
      MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
      WHERE toLower(tech.name) CONTAINS $q
         OR toLower(tech.id) CONTAINS $q
         OR toLower(tech.description) CONTAINS $q
      RETURN tech.id AS id, tech.name AS name, tech.description AS description,
             tac.id AS tacticId, tac.name AS tacticName
      ORDER BY tech.id
      LIMIT 50
    `, { q })
    res.json({ results: rows })
  } catch (e) { next(e) }
})

// GET /api/framework/graph — full graph for the Explorer visualization
// Returns nodes (tactics + techniques + scenarios) and links (all relationships)
// One Cypher query — the graph structure, ready for D3 force layout
router.get('/graph', async (_req, res, next) => {
  try {
    const [tactics, techniques, subtechs, scenarios, scenarioTechniques] = await Promise.all([
      runQuery(`
        MATCH (t:Tactic)
        OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(t)
        WITH t, count(tech) AS count
        RETURN t.id AS id, t.name AS name, t.order AS order,
               t.uniqueToF3 AS uniqueToF3, count
        ORDER BY t.order
      `),
      runQuery(`
        MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
        RETURN tech.id AS id, tech.name AS name, tac.id AS tacticId
      `),
      runQuery(`
        MATCH (sub:Technique)-[:SUBTECHNIQUE_OF]->(parent:Technique)
        RETURN sub.id AS child, parent.id AS parent
      `),
      runQuery(`
        MATCH (s:Scenario)
        RETURN s.id AS id, s.title AS title, s.severity AS severity
      `),
      runQuery(`
        MATCH (s:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(tech:Technique)
        RETURN DISTINCT s.id AS scenarioId, tech.id AS techId
      `),
    ])

    const nodes = [
      ...tactics.map(t => ({
        id: t.id, type: 'tactic', name: t.name,
        order: t.order, uniqueToF3: t.uniqueToF3, techCount: t.count,
      })),
      ...techniques.map(t => ({
        id: t.id, type: 'technique', name: t.name, tacticId: t.tacticId,
      })),
      ...scenarios.map(s => ({
        id: s.id, type: 'scenario', name: s.title, severity: s.severity,
      })),
    ]

    const links = [
      // Techniques link to their parent tactic
      ...techniques.map(t => ({ source: t.id, target: t.tacticId, type: 'PART_OF' })),
      // Sub-techniques link to parent techniques
      ...subtechs.map(s => ({ source: s.child, target: s.parent, type: 'SUBTECHNIQUE_OF' })),
      // Scenarios link to every technique they use
      ...scenarioTechniques.map(st => ({ source: st.scenarioId, target: st.techId, type: 'USES_TECHNIQUE' })),
    ]

    res.json({ nodes, links, stats: { tactics: tactics.length, techniques: techniques.length, scenarios: scenarios.length, links: links.length } })
  } catch (e) { next(e) }
})

export default router
