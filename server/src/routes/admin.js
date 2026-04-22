/**
 * admin.js — admin-only user & invite management
 *
 * Every route in this router is gated by requireRole('admin'). Mounted in
 * index.js AFTER the `/api` requireAuth wall, so getUser(req) is always
 * populated.
 *
 * Endpoints:
 *   GET    /api/admin/users                 — read-only list of users (v23)
 *   GET    /api/admin/invites               — list of invites (all states)
 *   POST   /api/admin/invites               — create invite
 *   POST   /api/admin/invites/:id/revoke    — mark invite revoked (idempotent)
 *   DELETE /api/admin/invites/:id           — hard-delete (rare; use revoke)
 *
 * Scope note for v23: role changes on EXISTING users happen in the Auth0
 * dashboard, not here. Inline role editing will land in v24 once we wire
 * the Management API in the server.
 */

import { Router } from 'express'
import crypto from 'node:crypto'
import { runQuery } from '../lib/neo4j.js'
import { requireRole, getUser } from '../lib/auth.js'

const router = Router()

// Everything under /api/admin requires admin role
router.use(requireRole('admin'))

const VALID_ROLES = ['trainee', 'manager', 'admin']

/* --------------------------------------------------------------------------
 * Users
 * ----------------------------------------------------------------------- */

/**
 * GET /api/admin/users
 *
 * Returns every User node with lightweight progress stats rolled up. The v23
 * Users tab is read-only — editing happens in Auth0.
 */
router.get('/users', async (_req, res, next) => {
  try {
    const rows = await runQuery(
      `
      MATCH (user:User)
      OPTIONAL MATCH (user)-[c:COMPLETED]->(sc:Scenario)
      OPTIONAL MATCH (user)-[a:ANSWERED]->(q:Quiz)
      OPTIONAL MATCH (user)-[att:ATTEMPTED_STAGE]->(:Stage)
      WITH user,
           count(DISTINCT sc) AS scenariosCompleted,
           count(DISTINCT q)  AS quizzesAnswered,
           sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers,
           count(DISTINCT att) AS stageAttempts
      RETURN user.id          AS id,
             user.email       AS email,
             user.name        AS name,
             user.domain      AS domain,
             user.roles       AS roles,
             user.firstSeenAt AS firstSeenAt,
             user.lastSeenAt  AS lastSeenAt,
             scenariosCompleted,
             quizzesAnswered,
             correctAnswers,
             stageAttempts
      ORDER BY coalesce(user.lastSeenAt, 0) DESC
      `
    )
    res.json({ users: rows })
  } catch (e) { next(e) }
})

/* --------------------------------------------------------------------------
 * Invites
 * ----------------------------------------------------------------------- */

/**
 * GET /api/admin/invites
 *
 * Returns every invite with computed status (active / expired / revoked /
 * consumed). Newest first. The admin UI filters/labels from `status`.
 */
router.get('/invites', async (_req, res, next) => {
  try {
    const rows = await runQuery(
      `
      MATCH (i:Invite)
      OPTIONAL MATCH (admin:User { id: i.invitedBy })
      RETURN i.id          AS id,
             i.email       AS email,
             i.roles       AS roles,
             i.invitedBy   AS invitedBy,
             admin.email   AS invitedByEmail,
             i.invitedAt   AS invitedAt,
             i.expiresAt   AS expiresAt,
             i.revokedAt   AS revokedAt,
             i.consumedAt  AS consumedAt,
             i.notes       AS notes,
             CASE
               WHEN i.revokedAt IS NOT NULL THEN 'revoked'
               WHEN i.expiresAt IS NOT NULL AND i.expiresAt <= timestamp() THEN 'expired'
               ELSE 'active'
             END AS status
      ORDER BY coalesce(i.invitedAt, 0) DESC
      `
    )
    res.json({ invites: rows })
  } catch (e) { next(e) }
})

/**
 * POST /api/admin/invites
 *
 * Body: { email, roles?, expiresInMs?, notes? }
 *   - email        required, lowercased + trimmed
 *   - roles        defaults to ['trainee']; validated against VALID_ROLES
 *   - expiresInMs  null/undefined => never expires; otherwise a positive int
 *                  (UI maps 24h/7d/30d/never to the right value)
 *   - notes        optional free-text for the admin's own record
 */
router.post('/invites', async (req, res, next) => {
  try {
    const me = getUser(req)
    const email = (req.body?.email || '').toString().toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' })
    }

    const requestedRoles = Array.isArray(req.body?.roles) && req.body.roles.length
      ? req.body.roles
      : ['trainee']
    const roles = requestedRoles
      .map(r => String(r).toLowerCase().trim())
      .filter(r => VALID_ROLES.includes(r))
    if (roles.length === 0) {
      return res.status(400).json({ error: `roles must be a subset of ${VALID_ROLES.join(', ')}` })
    }

    let expiresAt = null
    if (req.body?.expiresInMs !== null && req.body?.expiresInMs !== undefined) {
      const ms = Number(req.body.expiresInMs)
      if (!Number.isFinite(ms) || ms <= 0) {
        return res.status(400).json({ error: 'expiresInMs must be a positive number or null (never)' })
      }
      expiresAt = Date.now() + ms
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 1000) : null
    const id = crypto.randomUUID()

    const rows = await runQuery(
      `
      CREATE (i:Invite {
        id:        $id,
        email:     $email,
        roles:     $roles,
        invitedBy: $invitedBy,
        invitedAt: timestamp(),
        expiresAt: $expiresAt,
        notes:     $notes
      })
      RETURN i.id         AS id,
             i.email      AS email,
             i.roles      AS roles,
             i.invitedBy  AS invitedBy,
             i.invitedAt  AS invitedAt,
             i.expiresAt  AS expiresAt,
             i.revokedAt  AS revokedAt,
             i.consumedAt AS consumedAt,
             i.notes      AS notes
      `,
      { id, email, roles, invitedBy: me.id, expiresAt, notes }
    )
    res.status(201).json({ invite: rows[0] })
  } catch (e) { next(e) }
})

/**
 * POST /api/admin/invites/:id/revoke
 *
 * Idempotent — re-revoking a revoked invite is a no-op that returns 200.
 */
router.post('/invites/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params
    const rows = await runQuery(
      `
      MATCH (i:Invite { id: $id })
      SET i.revokedAt = coalesce(i.revokedAt, timestamp())
      RETURN i.id AS id, i.email AS email, i.revokedAt AS revokedAt
      `,
      { id }
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Invite not found' })
    res.json({ invite: rows[0] })
  } catch (e) { next(e) }
})

/**
 * DELETE /api/admin/invites/:id
 *
 * Hard-deletes the node. Prefer revoke() above for an audit trail; delete
 * is here for cleaning up test data.
 */
router.delete('/invites/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const rows = await runQuery(
      `
      MATCH (i:Invite { id: $id })
      WITH i, i.id AS id
      DETACH DELETE i
      RETURN id
      `,
      { id }
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Invite not found' })
    res.json({ ok: true, id: rows[0].id })
  } catch (e) { next(e) }
})

export default router
