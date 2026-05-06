/**
 * routes/framework-techniques.js — v25.7.0.8
 *
 * Endpoints for the redesigned techniques grid (foundation release).
 * Three new endpoints, all PUBLIC (reference content, no auth):
 *
 *   GET  /api/framework/tactics/:tacticId/techniques-tree
 *        Two-tier hierarchical structure for one tactic's techniques.
 *        Returns parent techniques with their sub-techniques nested.
 *        Single-child parents are flagged for client-side collapse.
 *
 *   GET  /api/framework/techniques/:techId
 *        Single technique with full description, parent (if sub),
 *        siblings (if sub), tactic context, role-relevance.
 *
 *   GET  /api/framework/techniques/:techId/cross-refs
 *        Lists scenarios and storyboard beats that reference this
 *        technique. Used by the sidebar to surface "where this
 *        technique is demonstrated."
 *
 * Why a new route file rather than extending framework.js:
 *   The existing /api/framework/tactics endpoint returns techniques
 *   as a flat list. Modifying it to nest hierarchy would break any
 *   client still using the flat shape. New endpoints isolate the
 *   hierarchical view behind a dedicated path. The Framework page
 *   in v25.7.0.8 will call /tactics for the basic tactic list and
 *   /tactics/:id/techniques-tree on-demand when a tactic expands.
 *
 * Role-relevance (v25.7.0.8 baseline):
 *   Each Technique node MAY carry a `roles` property listing roles
 *   for which this technique is PRIMARY (i.e., the role can act on
 *   or directly observe it). If the property is absent, default is
 *   all four roles — the v25.7.0.8 baseline. Per-tactic role
 *   authoring is planned for v25.7.0.10+.
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

const ALL_ROLES = ['teller', 'analyst', 'soc', 'executive']

function safeParseRoles(rawRoles) {
  // Roles may be stored as a Neo4j list (string[]), or absent.
  // Defensive: anything else falls back to all roles.
  if (Array.isArray(rawRoles) && rawRoles.length > 0) {
    return rawRoles.filter(r => ALL_ROLES.includes(r))
  }
  return [...ALL_ROLES]
}

// ─────────────────────────────────────────────────────────────────────────
// GET /api/framework/tactics/:tacticId/techniques-tree
// Returns hierarchy: [{ parent, subTechniques, isAtomic, collapseToSingle }, ...]
// ─────────────────────────────────────────────────────────────────────────
router.get('/tactics/:tacticId/techniques-tree', async (req, res, next) => {
  try {
    const { tacticId } = req.params
    if (!/^[A-Z]{2}\d{4}$/.test(tacticId)) {
      return res.status(400).json({ error: 'Invalid tactic id format' })
    }

    // Fetch ALL techniques in this tactic, regardless of parent/child status.
    // Then bucket them in JS rather than Cypher because the bucketing logic
    // (single-child collapse, atomic identification) is easier to reason
    // about as imperative code than as graph patterns.
    const rows = await runQuery(
      `MATCH (tech:Technique)-[:PART_OF]->(:Tactic {id: $tacticId})
       OPTIONAL MATCH (tech)-[:SUBTECHNIQUE_OF]->(parent:Technique)
       RETURN tech.id          AS id,
              tech.name        AS name,
              tech.description AS description,
              tech.roles       AS roles,
              parent.id        AS parentId
       ORDER BY tech.id`,
      { tacticId }
    )

    if (rows.length === 0) {
      return res.json({ tactic: { id: tacticId }, tree: [], totalCount: 0 })
    }

    // Bucket: parents = techniques with no parentId; children grouped by parentId.
    const parents = []
    const childrenByParent = {}
    for (const r of rows) {
      const techShape = {
        id: r.id,
        name: r.name,
        description: r.description || '',
        roles: safeParseRoles(r.roles),
      }
      if (r.parentId) {
        if (!childrenByParent[r.parentId]) childrenByParent[r.parentId] = []
        childrenByParent[r.parentId].push(techShape)
      } else {
        parents.push(techShape)
      }
    }

    // Edge case: a sub-technique whose parent is NOT in this tactic.
    // (Shouldn't happen in our F3 seed but defensive.) Promote those
    // orphan children to top-level so they don't disappear.
    const parentIds = new Set(parents.map(p => p.id))
    for (const [pid, kids] of Object.entries(childrenByParent)) {
      if (!parentIds.has(pid)) {
        // Orphans — surface them as standalone parent-equivalent cards
        for (const orphan of kids) {
          parents.push(orphan)
        }
        delete childrenByParent[pid]
      }
    }

    // Sort parents by ID for stable order
    parents.sort((a, b) => a.id.localeCompare(b.id))

    // Build the tree shape the client expects
    const tree = parents.map(p => {
      const subs = (childrenByParent[p.id] || []).sort((a, b) => a.id.localeCompare(b.id))
      const isAtomic = subs.length === 0
      const collapseToSingle = subs.length === 1
      return {
        parent: p,
        subTechniques: subs,
        isAtomic,
        collapseToSingle,
      }
    })

    res.json({
      tactic: { id: tacticId },
      tree,
      totalCount: rows.length,
      parentCount: parents.length,
    })
  } catch (e) { next(e) }
})

// ─────────────────────────────────────────────────────────────────────────
// GET /api/framework/techniques/:techId
// Single technique with hierarchy context + role-relevance
// ─────────────────────────────────────────────────────────────────────────
router.get('/techniques/:techId', async (req, res, next) => {
  try {
    const { techId } = req.params
    // Allow both parent IDs ("F1008") and sub-technique IDs ("F1008.001")
    if (!/^[A-Z]\d{3,4}(\.\d{3})?$/.test(techId)) {
      return res.status(400).json({ error: 'Invalid technique id format' })
    }

    const rows = await runQuery(
      `MATCH (tech:Technique { id: $techId })
       OPTIONAL MATCH (tech)-[:PART_OF]->(tac:Tactic)
       OPTIONAL MATCH (tech)-[:SUBTECHNIQUE_OF]->(parent:Technique)
       OPTIONAL MATCH (sibling:Technique)-[:SUBTECHNIQUE_OF]->(parent)
         WHERE sibling.id <> tech.id
       OPTIONAL MATCH (child:Technique)-[:SUBTECHNIQUE_OF]->(tech)
       RETURN tech.id           AS id,
              tech.name         AS name,
              tech.description  AS description,
              tech.roles        AS roles,
              tac { .id, .name } AS tactic,
              parent { .id, .name } AS parent,
              collect(DISTINCT sibling { .id, .name }) AS siblings,
              collect(DISTINCT child { .id, .name }) AS children`,
      { techId }
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: `Technique ${techId} not found` })
    }

    const r = rows[0]
    res.json({
      technique: {
        id: r.id,
        name: r.name,
        description: r.description || '',
        roles: safeParseRoles(r.roles),
        tactic: r.tactic || null,
        parent: r.parent || null,
        siblings: (r.siblings || []).filter(s => s && s.id),
        children: (r.children || []).filter(c => c && c.id),
      },
    })
  } catch (e) { next(e) }
})

// ─────────────────────────────────────────────────────────────────────────
// GET /api/framework/techniques/:techId/cross-refs
// Scenarios and beats that reference this technique
// ─────────────────────────────────────────────────────────────────────────
router.get('/techniques/:techId/cross-refs', async (req, res, next) => {
  try {
    const { techId } = req.params
    if (!/^[A-Z]\d{3,4}(\.\d{3})?$/.test(techId)) {
      return res.status(400).json({ error: 'Invalid technique id format' })
    }

    // Scenarios: via Stage-[:USES_TECHNIQUE]->Technique
    // Beats: by techId string property on :Beat (no edge, intentional —
    //        v25.7.0.8 doesn't add a migration; future release may add
    //        proper :REFERENCES_TECHNIQUE edges if this query gets slow)
    const [scenarios, beats] = await Promise.all([
      runQuery(
        `MATCH (s:Scenario)-[:HAS_STAGE]->(stage:Stage)-[:USES_TECHNIQUE]->(tech:Technique { id: $techId })
         RETURN DISTINCT s.id    AS id,
                         s.title AS title,
                         s.severity AS severity
         ORDER BY s.id`,
        { techId }
      ),
      runQuery(
        `MATCH (s:Scenario)-[:HAS_BEAT]->(b:Beat { techId: $techId })
         RETURN s.id      AS scenarioId,
                s.title   AS scenarioTitle,
                b.id      AS beatId,
                b.day     AS day,
                b.headline AS headline
         ORDER BY s.id, b.day`,
        { techId }
      ),
    ])

    res.json({
      techId,
      scenarios: scenarios || [],
      beats: beats || [],
    })
  } catch (e) { next(e) }
})

export default router
