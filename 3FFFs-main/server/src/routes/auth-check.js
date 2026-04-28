import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

/* -------------------------------------------------------------------------
   /api/auth/* — public endpoints protected by a shared secret, NOT by JWT

   Mounted BEFORE the requireAuth wall in index.js so the Auth0 post-login
   Action can call in before the user has a token.

   Security model:
     - Request must include `x-invite-secret: <INVITE_CHECK_SECRET>` header
     - Secret is a high-entropy string shared between Railway server env
       and the Auth0 Action secrets vault
     - Constant-time comparison to avoid timing side-channels
     - If the secret is not set in env, the endpoint refuses every request
------------------------------------------------------------------------- */

const router = Router()

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function requireSharedSecret(req, res, next) {
  const expected = process.env.INVITE_CHECK_SECRET
  if (!expected) {
    console.error('[auth-check] INVITE_CHECK_SECRET not set — refusing request')
    return res.status(503).json({ error: 'Service unavailable' })
  }
  const provided = req.get('x-invite-secret') || ''
  if (!constantTimeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ------------------------------------------------------------------
// POST /api/auth/check-invite
// ------------------------------------------------------------------
// Body: { email }
// Header: x-invite-secret: <INVITE_CHECK_SECRET>
//
// Called by the Auth0 post-login Action when an email's domain is NOT
// on the hardcoded allowlist. Looks up a matching :Invite and, if it's
// active (not revoked, not expired), returns the roles the Action should
// assign to the user and use as the access_token claim.
//
// Also records consumption telemetry so the admin can see invites being
// used in the Invites tab.
//
// Response shapes:
//   200  { allowed: true,  roles: [...], inviteId: "..." }
//   200  { allowed: false, reason: "no_invite" | "revoked" | "expired" }
//   401  if shared secret is missing/wrong
//   503  if the server has no INVITE_CHECK_SECRET configured
router.post('/check-invite', requireSharedSecret, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim()
    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    // Fetch the invite (if any) without mutating anything yet — so we can
    // distinguish between "no invite", "revoked", and "expired" for clear
    // logging in the Auth0 Action + admin UI.
    const existing = await runQuery(`
      MATCH (i:Invite {email: $email})
      RETURN
        i.id         AS id,
        i.roles      AS roles,
        i.expiresAt  AS expiresAt,
        i.revokedAt  AS revokedAt
    `, { email })

    if (existing.length === 0) {
      return res.json({ allowed: false, reason: 'no_invite' })
    }
    const inv = existing[0]
    if (inv.revokedAt) {
      return res.json({ allowed: false, reason: 'revoked' })
    }
    if (inv.expiresAt && Number(inv.expiresAt) < Date.now()) {
      return res.json({ allowed: false, reason: 'expired' })
    }

    // Valid. Update usage telemetry (consumedAt set once, lastUsedAt/useCount always).
    await runQuery(`
      MATCH (i:Invite {id: $id})
      SET i.consumedAt = coalesce(i.consumedAt, timestamp()),
          i.lastUsedAt = timestamp(),
          i.useCount   = coalesce(i.useCount, 0) + 1
    `, { id: inv.id })

    res.json({
      allowed: true,
      roles: Array.isArray(inv.roles) ? inv.roles : [],
      inviteId: inv.id,
    })
  } catch (e) { next(e) }
})

export default router
