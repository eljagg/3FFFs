/**
 * framework-phases.js — /api/framework-phases endpoint (v25.6.1)
 *
 * Public reference data, mirroring /api/mitre and /api/frameworks/concepts:
 *   GET /api/framework-phases/:id              → phase node + parent + children
 *   GET /api/framework-phases/:id/practiced-in → scenarios + stages that have
 *                                                 an IN_FRAMEWORK_PHASE edge
 *
 * The roleContent JSON property is parsed back to an object before
 * returning to the client. Same for deliverables. The client picks
 * which roleContent lens to display based on the user's roles.
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/framework-phases/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id)
    const rows = await runQuery(`
      MATCH (p:FrameworkPhase {id: $id})
      OPTIONAL MATCH (parent:FrameworkPhase {id: p.parentId})
      OPTIONAL MATCH (p)-[:HAS_SUBPHASE]->(child:FrameworkPhase)
      WITH p, parent, collect(DISTINCT child { .id, .name, .code, .order }) AS children
      RETURN p { .* } AS phase,
             parent { .id, .name, .code } AS parent,
             [c IN children WHERE c.id IS NOT NULL] AS children
    `, { id })

    if (!rows.length) return res.status(404).json({ error: 'FrameworkPhase not found' })

    const r = rows[0]
    // Parse JSON-stringified properties back to objects
    const phase = normalizeIntegers(r.phase)
    if (phase.deliverables) {
      try { phase.deliverables = JSON.parse(phase.deliverables) } catch { phase.deliverables = [] }
    }
    if (phase.roleContent) {
      try { phase.roleContent = JSON.parse(phase.roleContent) } catch { phase.roleContent = null }
    }

    res.json({
      phase,
      parent: r.parent && r.parent.id ? r.parent : null,
      children: (r.children || [])
        .map(normalizeIntegers)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/framework-phases/:id/practiced-in
// ---------------------------------------------------------------------------
router.get('/:id/practiced-in', async (req, res, next) => {
  try {
    const id = decodeURIComponent(req.params.id)
    // For top-level phases, surface stages practising any of its sub-stages too.
    // For sub-stages, surface stages practising it directly.
    const rows = await runQuery(`
      MATCH (target:FrameworkPhase {id: $id})
      // Either the target itself, or any of its sub-stages
      OPTIONAL MATCH (target)-[:HAS_SUBPHASE]->(sub:FrameworkPhase)
      WITH target, collect(DISTINCT sub) AS subs
      WITH target + subs AS phasesToCheck
      UNWIND phasesToCheck AS phase
      MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)-[:IN_FRAMEWORK_PHASE]->(phase)
      WHERE st.type IS NULL OR st.type = 'primary' OR st.type = 'consequence'
      WITH sc, st, phase
      ORDER BY sc.id, st.order
      RETURN sc.id        AS scenarioId,
             sc.title     AS scenarioTitle,
             sc.severity  AS scenarioSeverity,
             st.id        AS stageId,
             st.order     AS stageOrder,
             coalesce(st.heading, st.title, 'Untitled stage') AS stageHeading,
             phase.id     AS phaseId,
             phase.code   AS phaseCode
    `, { id })

    res.json({
      practicedIn: rows.map(r => ({
        scenarioId:       r.scenarioId,
        scenarioTitle:    r.scenarioTitle,
        scenarioSeverity: r.scenarioSeverity,
        stageId:          r.stageId,
        stageOrder:       toJsNumber(r.stageOrder),
        stageHeading:     r.stageHeading,
        phaseId:          r.phaseId,
        phaseCode:        r.phaseCode,
      })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
