/**
 * frameworks.js — read-only API for the AASE/CBEST/TIBER-EU/iCAST graph
 *
 * Mounted under requireAuth at /api/frameworks. All endpoints return JSON.
 *
 * v25.0 ships ONLY this read API — no UI consumers yet. The endpoints exist so
 * that v25.1 (Option A scenario) and v25.4-5 (Option C Frameworks page) can
 * each consume what they need without further server work.
 *
 * Endpoints:
 *   GET /api/frameworks                      list all frameworks
 *   GET /api/frameworks/:id                  one framework with phases, deliverables, concepts
 *   GET /api/frameworks/:id/phases           lifecycle phases for visualisation
 *   GET /api/frameworks/concepts/universal           concepts shared across all four frameworks
 *   GET /api/frameworks/concepts/:id                  one Concept with per-framework summaries (v25.4.2)
 *   GET /api/frameworks/concepts/:id/practiced-in     scenarios+stages that test this concept (v25.4.2)
 *   GET /api/frameworks/threat-actors        the seeded threat actors for the matrix widget
 *   GET /api/frameworks/recommend            recommend a framework given a regulator
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

// Tiny helper — Neo4j returns rows; map to plain JS objects with parsed JSON fields
function parseJsonProps(obj, props = []) {
  if (!obj) return obj
  const out = { ...obj }
  for (const p of props) {
    if (typeof out[p] === 'string') {
      try { out[p] = JSON.parse(out[p]) } catch {}
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// GET /api/frameworks  → list of all frameworks (just headers)
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (f:Framework)
      OPTIONAL MATCH (f)<-[:AUTHORED]-(reg:Regulator)
      RETURN f { .* } AS framework, reg.name AS authoringRegulator
      ORDER BY f.publishedYear ASC
    `)
    res.json({
      frameworks: rows.map(r => ({ ...r.framework, authoringRegulator: r.authoringRegulator })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/:id  → one framework with its phases, roles, deliverables, concepts
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const rows = await runQuery(`
      MATCH (f:Framework {id: $id})
      OPTIONAL MATCH (f)-[hp:HAS_PHASE]->(p:FrameworkPhase)
      WITH f, p ORDER BY p.order
      WITH f, collect(DISTINCT p { .* }) AS phases
      OPTIONAL MATCH (k:Concept)-[:APPEARS_IN_FRAMEWORK]->(f)
      WITH f, phases, collect(DISTINCT k { .* }) AS concepts
      OPTIONAL MATCH (ta:ThreatActor)-[:MODELLED_IN_FRAMEWORK]->(f)
      WITH f, phases, concepts, collect(DISTINCT ta { .* }) AS threatActors
      RETURN f { .* } AS framework, phases, concepts, threatActors
    `, { id })

    if (!rows.length) return res.status(404).json({ error: 'Framework not found' })

    const r = rows[0]
    // Phases come back with stringified keyDecisions — parse for the consumer
    const phases = (r.phases || []).map(p => parseJsonProps(p, ['keyDecisions']))
    const concepts = (r.concepts || []).map(c => parseJsonProps(c, ['examples']))
    const threatActors = r.threatActors || []

    res.json({ framework: r.framework, phases, concepts, threatActors })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/:id/phases  → phases with their deliverables and roles
//                                   (the data needed for the Lifecycle Diagram)
// ---------------------------------------------------------------------------
router.get('/:id/phases', async (req, res, next) => {
  try {
    const { id } = req.params
    // v25.4.1 fix (ISS-006): the previous query had a trailing
    // `ORDER BY p.order` AFTER the RETURN, which Neo4j rejects because
    // `p` is not accessible past the projection that contains
    // collect(DISTINCT ...). The WITH on the line above already orders
    // rows before aggregation, so the trailing ORDER BY was both
    // redundant and broken. Removing it restores the endpoint.
    const rows = await runQuery(`
      MATCH (f:Framework {id: $id})-[:HAS_PHASE]->(p:FrameworkPhase)
      OPTIONAL MATCH (d:Deliverable)-[:IN_PHASE]->(p)
      OPTIONAL MATCH (d)-[:PRODUCED_BY]->(r:Role)
      WITH p, d, r
      ORDER BY p.order
      RETURN p { .* } AS phase,
             collect(DISTINCT { deliverable: d { .* }, producedBy: r { .* } }) AS deliverables
    `, { id })

    const phases = rows.map(row => ({
      ...parseJsonProps(row.phase, ['keyDecisions']),
      deliverables: (row.deliverables || [])
        .filter(d => d.deliverable)  // OPTIONAL MATCH can yield {deliverable: null}
        .map(d => ({
          ...parseJsonProps(d.deliverable, ['contents']),
          producedBy: d.producedBy ? parseJsonProps(d.producedBy, ['keyResponsibilities']) : null,
        })),
    }))

    res.json({ phases })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/concepts/universal
//   → concepts that appear across all four frameworks. Used by the Comparison
//     view in v25.5 to highlight the shared vocabulary.
// ---------------------------------------------------------------------------
router.get('/concepts/universal', async (req, res, next) => {
  try {
    // Note: requires that universal concepts have :APPEARS_IN_FRAMEWORK to all
    // four frameworks (the seed migration handles this).
    const rows = await runQuery(`
      MATCH (k:Concept {universal: true})
      OPTIONAL MATCH (k)-[:APPEARS_IN_FRAMEWORK]->(f:Framework)
      WITH k, collect(DISTINCT f.id) AS frameworkIds
      RETURN k { .* } AS concept, frameworkIds
      ORDER BY k.name
    `)
    res.json({
      concepts: rows.map(r => ({
        ...parseJsonProps(r.concept, ['examples']),
        frameworkIds: r.frameworkIds,
      })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/concepts/:id
//   → single Concept with full details + which frameworks recognise it.
//     Used by the v25.1 ConceptSidebar component on the Scenario page.
//
//     Route ordering note: this MUST come after /concepts/universal because
//     Express matches in declaration order and "universal" would otherwise
//     match the :id parameter.
// ---------------------------------------------------------------------------
router.get('/concepts/:id', async (req, res, next) => {
  try {
    // v25.4.2: now reads per-framework summary from the [:APPEARS_IN_FRAMEWORK]
    // edge (populated by the add-concept-framework-summaries migration).
    // Falls back to Concept.summary on the node when an edge has no summary
    // (defensive — shouldn't happen post-migration, but keeps the response
    // shape sane if the migration hasn't run yet).
    const rows = await runQuery(`
      MATCH (k:Concept {id: $id})
      OPTIONAL MATCH (k)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
      WITH k, collect({
        id:       f.id,
        name:     f.name,
        region:   f.region,
        summary:  coalesce(r.summary, k.summary),
        pending:  coalesce(r.pending, false),
        vintage:  r.vintage
      }) AS frameworks
      RETURN k { .* } AS concept,
             [fw IN frameworks WHERE fw.id IS NOT NULL] AS frameworks
    `, { id: req.params.id })

    if (!rows.length) return res.status(404).json({ error: 'Concept not found' })

    const r = rows[0]
    res.json({
      concept: parseJsonProps(r.concept, ['examples']),
      frameworks: r.frameworks || [],
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/concepts/:id/practiced-in
//   v25.4.2: returns the scenarios + stages where this concept is practiced
//   via :TESTS_CONCEPT edges. Used by the ConceptSidebar to surface
//   "Practiced in: SC010 Stage 1 ↗" cross-links between reference and
//   applied learning.
//
//   Result shape: array of { scenarioId, scenarioTitle, stageOrder, stageId }
//   ordered by scenarioId then stageOrder.
// ---------------------------------------------------------------------------
router.get('/concepts/:id/practiced-in', async (req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)-[:TESTS_CONCEPT]->(c:Concept {id: $id})
      WHERE st.type IS NULL OR st.type = 'primary'
      WITH sc, st
      ORDER BY sc.id, st.order
      RETURN sc.id        AS scenarioId,
             sc.title     AS scenarioTitle,
             sc.severity  AS scenarioSeverity,
             st.id        AS stageId,
             st.order     AS stageOrder,
             st.title     AS stageTitle
    `, { id: req.params.id })

    res.json({
      practicedIn: rows.map(r => ({
        scenarioId:       r.scenarioId,
        scenarioTitle:    r.scenarioTitle,
        scenarioSeverity: r.scenarioSeverity,
        stageId:          r.stageId,
        stageOrder:       typeof r.stageOrder === 'object' && r.stageOrder?.toNumber
                            ? r.stageOrder.toNumber() : r.stageOrder,
        stageTitle:       r.stageTitle,
      })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/threat-actors
//   → all seeded threat actors for the Threat Matrix widget
// ---------------------------------------------------------------------------
router.get('/data/threat-actors', async (req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (ta:ThreatActor)
      RETURN ta { .* } AS actor
      ORDER BY ta.threatRating DESC, ta.name
    `)
    res.json({ actors: rows.map(r => r.actor) })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/frameworks/recommend?regulator=REG-BOJ
//   → Given a regulator, return frameworks ranked by their RECOGNISED edge,
//     with the AUTHORED framework first if any. Caribbean regulators have
//     no AUTHORED edges, so all returns are RECOGNISED.
//
//     This is the wedge query — proves the graph is doing real work.
// ---------------------------------------------------------------------------
router.get('/data/recommend', async (req, res, next) => {
  try {
    const regulatorId = req.query.regulator
    if (!regulatorId) return res.status(400).json({ error: 'regulator query param required' })

    const rows = await runQuery(`
      MATCH (reg:Regulator {id: $regulatorId})
      OPTIONAL MATCH (reg)-[a:AUTHORED]->(authored:Framework)
      OPTIONAL MATCH (reg)-[r:RECOGNISES]->(recognised:Framework)
      WITH reg,
           collect(DISTINCT authored { .*, relationship: 'AUTHORED' }) AS authoredList,
           collect(DISTINCT recognised { .*, relationship: 'RECOGNISED' }) AS recognisedList
      RETURN reg { .* } AS regulator,
             [x IN authoredList WHERE x IS NOT NULL] AS authored,
             [x IN recognisedList WHERE x IS NOT NULL AND NOT x IN authoredList] AS recognised
    `, { regulatorId })

    if (!rows.length) return res.status(404).json({ error: 'Regulator not found' })

    const r = rows[0]
    res.json({
      regulator: r.regulator,
      // Order: AUTHORED first (strongest signal), then RECOGNISED
      frameworks: [...(r.authored || []), ...(r.recognised || [])],
    })
  } catch (e) { next(e) }
})

export default router
