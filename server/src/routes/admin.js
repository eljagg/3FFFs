import { Router } from 'express'
import { randomUUID } from 'crypto'
import { runQuery } from '../lib/neo4j.js'
import { requireRole, getUser } from '../lib/auth.js'

/* -------------------------------------------------------------------------
   /api/admin/* — admin-only user and invite management

   Everything in this router is gated behind the 'admin' role. Mounted
   AFTER the requireAuth / syncUser wall in index.js.

   Endpoints:
     GET    /users              — list all :User nodes with progress rollups
     GET    /invites            — list all :Invite nodes (active, revoked, expired)
     POST   /invites            — create or upsert an invite by email
     POST   /invites/:id/extend — extend expiry (and clear revokedAt if set);
                                  v25.7.0.22, single-attribute lifecycle change
                                  separated from the heavyweight upsert
     DELETE /invites/:id        — soft-revoke an invite (sets revokedAt)

   Invite lifecycle:
     - invitedAt:    when the admin created/re-issued the invite
     - expiresAt:    null for never, otherwise a timestamp
     - revokedAt:    null until admin revokes; non-null blocks future logins
     - consumedAt:   set on first successful login via the shared-secret check
     - lastUsedAt:   updated on every login that matched this invite
     - useCount:     number of logins that matched this invite

   The Auth0 post-login action calls /api/auth/check-invite (see routes/auth-check.js)
   for domains NOT on the allowlist. Invites remain valid for the whole
   expiresAt window — they are not single-use. This is intentional so a
   reviewer can log out and log back in without a new invite.
------------------------------------------------------------------------- */

const router = Router()

// Admin-only. Runs AFTER requireAuth + syncUser (mounted at /api).
router.use(requireRole('admin'))

// ------------------------------------------------------------------
// GET /api/admin/users
// ------------------------------------------------------------------
// Full user list with progress rollups for the Users tab. Read-only.
// Role changes go through the Auth0 dashboard — the Action reads Auth0
// as source of truth for roles on each login.
router.get('/users', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[c:COMPLETED]->(sc:Scenario)
      OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
      OPTIONAL MATCH (u)-[att:ATTEMPTED_STAGE]->(st:Stage)
      WITH u,
           count(DISTINCT sc) AS scenariosCompleted,
           count(DISTINCT q)  AS quizzesAnswered,
           sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers,
           count(DISTINCT st) AS stagesAttempted
      RETURN
        u.id           AS id,
        u.email        AS email,
        u.name         AS name,
        u.domain       AS domain,
        u.roles        AS roles,
        u.firstSeenAt  AS firstSeenAt,
        u.lastSeenAt   AS lastSeenAt,
        scenariosCompleted,
        quizzesAnswered,
        correctAnswers,
        stagesAttempted
      ORDER BY u.lastSeenAt DESC
    `)
    res.json({ users: rows })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// GET /api/admin/invites
// ------------------------------------------------------------------
// Returns every invite ever created, including revoked + expired ones so
// the admin has a full audit trail in the UI.
router.get('/invites', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (i:Invite)
      OPTIONAL MATCH (inviter:User {id: i.invitedBy})
      OPTIONAL MATCH (extender:User {id: i.extendedBy})
      RETURN
        i.id             AS id,
        i.email          AS email,
        i.roles          AS roles,
        i.notes          AS notes,
        i.invitedBy      AS invitedBy,
        inviter.email    AS invitedByEmail,
        i.invitedAt      AS invitedAt,
        i.expiresAt      AS expiresAt,
        i.revokedAt      AS revokedAt,
        i.consumedAt     AS consumedAt,
        i.lastUsedAt     AS lastUsedAt,
        i.useCount       AS useCount,
        i.lastExtendedAt AS lastExtendedAt,
        i.extendedBy     AS extendedBy,
        extender.email   AS extendedByEmail
      ORDER BY i.invitedAt DESC
    `)
    res.json({ invites: rows })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// POST /api/admin/invites
// ------------------------------------------------------------------
// Body: { email, roles, expirationHours, notes }
//   email:            required, lowercased
//   roles:            required, array of strings from ['trainee','manager','admin']
//   expirationHours:  number of hours until expiry, or null for never
//   notes:            optional free-text
//
// If an invite already exists for that email, this UPDATES it (un-revoking
// it if needed, resetting expiry, swapping roles). This makes "re-invite"
// a natural action without needing a separate endpoint.
router.post('/invites', async (req, res, next) => {
  try {
    const me = getUser(req)
    const email = String(req.body?.email || '').toLowerCase().trim()
    const roles = Array.isArray(req.body?.roles) ? req.body.roles : []
    const notes = req.body?.notes ? String(req.body.notes).slice(0, 500) : null
    const expirationHours = req.body?.expirationHours

    // Validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required.' })
    }
    const validRoles = ['trainee', 'manager', 'admin']
    const cleanRoles = roles.filter(r => validRoles.includes(r))
    if (cleanRoles.length === 0) {
      return res.status(400).json({ error: 'At least one role is required.' })
    }
    let expiresAt = null
    if (expirationHours !== null && expirationHours !== undefined) {
      const hours = Number(expirationHours)
      if (!Number.isFinite(hours) || hours <= 0) {
        return res.status(400).json({ error: 'expirationHours must be a positive number or null.' })
      }
      expiresAt = Date.now() + Math.round(hours * 3_600_000)
    }

    // Upsert. Preserve id on re-invite, reset revokedAt, refresh fields.
    const [row] = await runQuery(`
      MERGE (i:Invite {email: $email})
      ON CREATE SET
        i.id         = $newId,
        i.invitedAt  = timestamp(),
        i.useCount   = 0
      SET
        i.roles      = $roles,
        i.notes      = $notes,
        i.invitedBy  = $invitedBy,
        i.expiresAt  = $expiresAt,
        i.revokedAt  = null,
        i.invitedAt  = CASE WHEN i.invitedAt IS NULL THEN timestamp() ELSE i.invitedAt END
      RETURN
        i.id        AS id,
        i.email     AS email,
        i.roles     AS roles,
        i.notes     AS notes,
        i.invitedBy AS invitedBy,
        i.invitedAt AS invitedAt,
        i.expiresAt AS expiresAt,
        i.revokedAt AS revokedAt,
        i.consumedAt AS consumedAt,
        i.lastUsedAt AS lastUsedAt,
        i.useCount  AS useCount
    `, {
      email,
      newId: randomUUID(),
      roles: cleanRoles,
      notes,
      invitedBy: me.id,
      expiresAt,
    })

    res.json({ invite: row })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// POST /api/admin/invites/:id/extend                       (v25.7.0.22)
// ------------------------------------------------------------------
// Body: { expirationHours }
//   expirationHours: number of hours from NOW until new expiry,
//                    or null for "never expires"
//
// Single-responsibility lifecycle endpoint. Does NOT touch email,
// roles, notes, invitedBy, or invitedAt — those keep their original
// values, which is the whole point: the admin's mental model is
// "give this person more time", not "re-invite them from scratch".
//
// Side effect: clears revokedAt if it was set. So the same endpoint
// also restores a previously-revoked invite. The client surfaces this
// as a "Restore" action label when the row is in revoked state, but
// server-side it's the same operation: refresh the deadline, lift
// any block.
//
// Audit: lastExtendedAt + extendedBy capture the action; useCount and
// consumedAt are preserved so the eventual "this invite has been
// extended N times across M months" picture remains intact.
router.post('/invites/:id/extend', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { id } = req.params
    const expirationHours = req.body?.expirationHours

    let newExpiresAt = null
    if (expirationHours !== null && expirationHours !== undefined) {
      const hours = Number(expirationHours)
      if (!Number.isFinite(hours) || hours <= 0) {
        return res.status(400).json({ error: 'expirationHours must be a positive number or null.' })
      }
      newExpiresAt = Date.now() + Math.round(hours * 3_600_000)
    }

    const rows = await runQuery(`
      MATCH (i:Invite {id: $id})
      SET i.expiresAt      = $newExpiresAt,
          i.revokedAt      = null,
          i.lastExtendedAt = timestamp(),
          i.extendedBy     = $me
      RETURN
        i.id             AS id,
        i.email          AS email,
        i.roles          AS roles,
        i.notes          AS notes,
        i.invitedBy      AS invitedBy,
        i.invitedAt      AS invitedAt,
        i.expiresAt      AS expiresAt,
        i.revokedAt      AS revokedAt,
        i.consumedAt     AS consumedAt,
        i.lastUsedAt     AS lastUsedAt,
        i.useCount       AS useCount,
        i.lastExtendedAt AS lastExtendedAt,
        i.extendedBy     AS extendedBy
    `, { id, newExpiresAt, me: me.id })

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found.' })
    }
    res.json({ invite: rows[0] })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// DELETE /api/admin/invites/:id
// ------------------------------------------------------------------
// Soft-revoke. Sets revokedAt; the check-invite endpoint will refuse to
// return roles for a revoked invite, so next login by that email will
// be rejected by the Auth0 Action.
router.delete('/invites/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const rows = await runQuery(`
      MATCH (i:Invite {id: $id})
      SET i.revokedAt = timestamp()
      RETURN i.id AS id, i.email AS email, i.revokedAt AS revokedAt
    `, { id })
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found.' })
    }
    res.json({ invite: rows[0] })
  } catch (e) { next(e) }
})

export default router
