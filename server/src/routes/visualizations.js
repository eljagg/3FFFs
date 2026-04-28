/**
 * routes/visualizations.js — v25.7.0.2 (ISS-023)
 *
 * Endpoints for the Visualization registry:
 *
 *   GET  /api/visualizations
 *        Full list (admin-leaning; used by the /admin/visualizations
 *        preview page). Returns parsed config so the client renderer can
 *        consume directly.
 *
 *   GET  /api/visualizations/for/:entityType/:entityId
 *        Visualizations attached to a given entity (e.g. Tactic/TA0043).
 *        This is the primary read path used by the Framework page and
 *        any future page that hosts visualizations.
 *
 *   POST /api/visualizations/:id/event
 *        Telemetry endpoint. Records a (User)-[:INTERACTED_WITH]->(Viz)
 *        edge with count + timestamps. Body: { type: 'node_selected' | ... }
 *        Required AUTH. Body type validated against an allowlist.
 *
 * The fetch endpoints are mounted PUBLIC (no auth) — visualizations are
 * reference content, same access pattern as /api/framework and /api/mitre.
 * The telemetry POST endpoint is mounted under the auth wall in index.js.
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

// Whitelist of known event types. Unknown types are rejected with 400 so
// the client can't drift the schema by accident.
const VALID_EVENT_TYPES = new Set([
  'viz_opened',       // The viz first became visible to the user
  'node_selected',    // User clicked a node to highlight a path
  'defense_toggled',  // User toggled a defense on or off
  'viz_completed',    // (Reserved for future per-viz completion criteria)
])

// Entity types we support attaching visualizations to. Restricting the
// label here is a safety measure — the route accepts an entity type as
// a path segment and uses it directly in a Cypher MATCH, so we have to
// allowlist it to prevent injection.
const VALID_ENTITY_TYPES = new Set([
  'Tactic',
  'Technique',
  'Concept',
  'Stage',
  'FrameworkPhase',
  'MitreTactic',
  'MitreTechnique',
])

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC router — fetch endpoints, no auth required
// ─────────────────────────────────────────────────────────────────────────
export const publicRouter = Router()

// GET /api/visualizations — full list, admin preview consumer
publicRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (v:Visualization)
      OPTIONAL MATCH (v)-[:VISUALIZES]->(n)
      RETURN v.id AS id, v.kind AS kind, v.title AS title, v.subtitle AS subtitle,
             v.roles AS roles, v.order AS order, v.config AS config,
             labels(n)[0] AS attachedType, n.id AS attachedId
      ORDER BY v.order, v.id
    `)
    const visualizations = rows.map(r => ({
      id:        r.id,
      kind:      r.kind,
      title:     r.title,
      subtitle:  r.subtitle,
      roles:     r.roles || [],
      order:     r.order,
      config:    safeParseConfig(r.config, r.id),
      attachedTo: r.attachedType ? { type: r.attachedType, id: r.attachedId } : null,
    }))
    res.json({ visualizations })
  } catch (e) { next(e) }
})

// GET /api/visualizations/for/:entityType/:entityId — visualizations attached
// to a given graph entity. Returns ordered by Visualization.order.
publicRouter.get('/for/:entityType/:entityId', async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params
    if (!VALID_ENTITY_TYPES.has(entityType)) {
      return res.status(400).json({
        error: `Unsupported entity type: ${entityType}`,
        supported: Array.from(VALID_ENTITY_TYPES),
      })
    }

    // Safe to interpolate entityType into the Cypher because it has been
    // validated against the allowlist above.
    const rows = await runQuery(
      `MATCH (v:Visualization)-[:VISUALIZES]->(n:${entityType} {id: $entityId})
       RETURN v.id AS id, v.kind AS kind, v.title AS title, v.subtitle AS subtitle,
              v.roles AS roles, v.order AS order, v.config AS config
       ORDER BY v.order, v.id`,
      { entityId }
    )
    const visualizations = rows.map(r => ({
      id:       r.id,
      kind:     r.kind,
      title:    r.title,
      subtitle: r.subtitle,
      roles:    r.roles || [],
      order:    r.order,
      config:   safeParseConfig(r.config, r.id),
    }))
    res.json({ visualizations })
  } catch (e) { next(e) }
})

// ─────────────────────────────────────────────────────────────────────────
// AUTHED router — telemetry endpoint, mounted under requireAuth in index.js
// ─────────────────────────────────────────────────────────────────────────
export const authedRouter = Router()

/**
 * POST /api/visualizations/:id/event
 *
 * Body: { type: <one of VALID_EVENT_TYPES> }
 *
 * Records that the current user interacted with the visualization. We do
 * not retain the full event stream — only an aggregated edge with first/
 * last timestamps and a count. The reasoning: this is enough signal to
 * answer "is anyone using these visualizations" without an analytics
 * pipeline. Detailed event logging can be added in a later release if
 * justified by the data we get from this aggregate.
 */
authedRouter.post('/:id/event', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { id } = req.params
    const { type } = req.body || {}

    if (!type || !VALID_EVENT_TYPES.has(type)) {
      return res.status(400).json({
        error: `Invalid event type: ${type}`,
        supported: Array.from(VALID_EVENT_TYPES),
      })
    }

    // Verify the visualization exists. Doing this with a separate read
    // gives us a clean 404 path instead of silently no-op'ing on MERGE
    // against a nonexistent node.
    const exists = await runQuery(
      `MATCH (v:Visualization {id: $id}) RETURN count(v) AS c`,
      { id }
    )
    if (exists[0].c === 0) {
      return res.status(404).json({ error: `Visualization ${id} not found` })
    }

    // Upsert the (User)-[:INTERACTED_WITH]->(Viz) edge.
    await runQuery(
      `MATCH (u:User {id: $userId})
       MATCH (v:Visualization {id: $vizId})
       MERGE (u)-[r:INTERACTED_WITH]->(v)
       ON CREATE SET r.firstAt = timestamp(),
                     r.count   = 1,
                     r.lastEventType = $eventType
       ON MATCH  SET r.count   = coalesce(r.count, 0) + 1,
                     r.lastEventType = $eventType
       SET r.lastAt = timestamp()`,
      { userId: me.id, vizId: id, eventType: type }
    )

    res.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/visualizations/:id/event]', e.message)
    next(e)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Parses the stringified config blob defensively. If parse fails (someone
 * stored a bad blob, or the field is null), we return an empty object so
 * the client renderer can fall back gracefully rather than throwing.
 */
function safeParseConfig(raw, vizId) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (err) {
    console.error(`[visualizations] config parse failed for ${vizId}:`, err.message)
    return {}
  }
}
