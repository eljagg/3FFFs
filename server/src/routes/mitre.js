/**
 * mitre.js — v25.5 server routes (ISS-009 foundation)
 *
 * Endpoints:
 *   GET /api/mitre/tactics                     list of all MitreTactic nodes
 *   GET /api/mitre/techniques                  list of all MitreTechnique nodes
 *                                              (supports ?tactic=TA0001 filter)
 *   GET /api/mitre/techniques/:id              one technique with parent +
 *                                              tactic edges (the sidebar fetcher)
 *   GET /api/mitre/techniques/:id/practiced-in scenarios + stages that use this
 *                                              technique (mirrors v25.4.2 pattern
 *                                              for concepts; populated once SC013/14
 *                                              ship in v25.5.1+)
 *
 * Mounted in index.js under /api/mitre.
 *
 * Vintage data is sourced from MITRE ATT&CK v18.1 under CC-BY 4.0 — see
 * server/src/seed/data/mitre-techniques.js for attribution detail.
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/mitre/tactics
//   → all 14 tactics, ordered by their canonical attack-chain order
// ---------------------------------------------------------------------------
router.get('/tactics', async (req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (ta:MitreTactic)
      RETURN ta { .* } AS tactic
      ORDER BY ta.order
    `)
    res.json({ tactics: rows.map(r => normalizeIntegers(r.tactic)) })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/mitre/techniques?tactic=TA0001
//   → all techniques (or filtered to one tactic). Returns headers only —
//     full technique detail comes from /:id endpoint.
// ---------------------------------------------------------------------------
router.get('/techniques', async (req, res, next) => {
  try {
    const tacticFilter = (req.query.tactic || '').trim()
    let cypher, params
    if (tacticFilter) {
      cypher = `
        MATCH (mt:MitreTechnique)-[:OF_TACTIC]->(ta:MitreTactic {id: $tacticId})
        RETURN mt {
          .id, .name, .platforms, .tactics, .isSubTechnique,
          summary: mt.summary
        } AS technique
        ORDER BY mt.id
      `
      params = { tacticId: tacticFilter }
    } else {
      cypher = `
        MATCH (mt:MitreTechnique)
        RETURN mt {
          .id, .name, .platforms, .tactics, .isSubTechnique,
          summary: mt.summary
        } AS technique
        ORDER BY mt.id
      `
      params = {}
    }
    const rows = await runQuery(cypher, params)
    res.json({
      techniques: rows.map(r => normalizeIntegers(r.technique)),
      filteredByTactic: tacticFilter || null,
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/mitre/techniques/:id
//   → one technique with parent + tactics. The sidebar fetcher.
//
//     Defensive ID handling: T1566.004 etc. The dot is fine in URL paths
//     but some clients double-encode it; we handle both raw and decoded.
// ---------------------------------------------------------------------------
router.get('/techniques/:id', async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id)
    const rows = await runQuery(`
      MATCH (mt:MitreTechnique {id: $id})
      OPTIONAL MATCH (mt)-[:OF_TACTIC]->(ta:MitreTactic)
      OPTIONAL MATCH (mt)-[:SUB_TECHNIQUE_OF]->(parent:MitreTechnique)
      OPTIONAL MATCH (child:MitreTechnique)-[:SUB_TECHNIQUE_OF]->(mt)
      WITH mt, parent,
           collect(DISTINCT ta { .id, .name, .order, .shortName }) AS tactics,
           collect(DISTINCT child { .id, .name }) AS children
      RETURN mt { .* } AS technique,
             parent { .id, .name } AS parent,
             tactics,
             [c IN children WHERE c.id IS NOT NULL] AS subTechniques
    `, { id })

    if (!rows.length) return res.status(404).json({ error: 'Technique not found' })

    const r = rows[0]
    res.json({
      technique: normalizeIntegers(r.technique),
      parent: r.parent && r.parent.id ? r.parent : null,
      // Tactics ordered by their attack-chain order (initial-access → impact)
      tactics: (r.tactics || [])
        .filter(t => t.id)
        .map(normalizeIntegers)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
      subTechniques: r.subTechniques || [],
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/mitre/techniques/:id/practiced-in
//   → scenarios + stages that use this MITRE technique via :USES_MITRE_TECHNIQUE
//     edges. Populated once SC013/SC014 ship in v25.5.1+; until then this
//     endpoint returns empty arrays (same shape, just no data yet).
// ---------------------------------------------------------------------------
router.get('/techniques/:id/practiced-in', async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id)
    const rows = await runQuery(`
      MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)-[:USES_MITRE_TECHNIQUE]->(mt:MitreTechnique {id: $id})
      WHERE st.type IS NULL OR st.type = 'primary'
      WITH sc, st
      ORDER BY sc.id, st.order
      RETURN sc.id        AS scenarioId,
             sc.title     AS scenarioTitle,
             sc.severity  AS scenarioSeverity,
             st.id        AS stageId,
             st.order     AS stageOrder,
             coalesce(st.heading, st.title, 'Untitled stage') AS stageHeading
    `, { id })

    res.json({
      practicedIn: rows.map(r => ({
        scenarioId:       r.scenarioId,
        scenarioTitle:    r.scenarioTitle,
        scenarioSeverity: r.scenarioSeverity,
        stageId:          r.stageId,
        stageOrder:       toJsNumber(r.stageOrder),
        stageHeading:     r.stageHeading,
      })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Neo4j returns Integer objects for integer values. Convert to JS numbers
// so JSON.stringify produces clean output.
function toJsNumber(val) {
  if (val == null) return val
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber()
  return val
}

function normalizeIntegers(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toJsNumber(v)
  }
  return out
}

export default router
