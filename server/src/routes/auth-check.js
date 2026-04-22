/**
 * auth-check.js — PUBLIC invite-check endpoint for Auth0 Actions
 *
 * This router is mounted in index.js BEFORE the `/api` requireAuth wall,
 * because the caller here is the Auth0 post-login Action — a server-side
 * script that does not hold a user JWT when it runs. Instead we gate on a
 * shared secret passed in the `X-Invite-Secret` header.
 *
 * Contract:
 *   POST /api/auth/check-invite
 *   Headers:   X-Invite-Secret: <must match process.env.INVITE_CHECK_SECRET>
 *   Body:      { email: string }
 *
 *   200 { valid: true,  roles: ['trainee', ...], inviteId, expiresAt }
 *   200 { valid: false, reason: 'no-active-invite' | 'expired' | 'revoked' | 'no-invite' }
 *   403 { error: 'Forbidden' }   — secret missing / wrong
 *   400 { error: 'email required' }
 *
 * Access policy (per v23 design):
 *   - An invite stays valid for repeat logins — NOT single-use.
 *   - Access is granted if the invite is NOT revoked AND (expiresAt IS NULL
 *     OR expiresAt > now).
 *   - `consumedAt` is set on the first valid check and is analytics-only.
 *
 * Security:
 *   - Shared secret is a 32-byte random value provisioned in Railway AND in
 *     the Auth0 Action secrets panel. Never ship to the client.
 *   - We use a constant-time comparison to avoid timing side-channels.
 */

import { Router } from 'express'
import crypto from 'node:crypto'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function requireSharedSecret(req, res, next) {
  const expected = process.env.INVITE_CHECK_SECRET
  if (!expected) {
    // Deployment misconfiguration — fail closed. Better to block the whole
    // invite flow than to accept any request because the secret is unset.
    console.error('[auth-check] INVITE_CHECK_SECRET is not set on the server')
    return res.status(503).json({ error: 'Invite check unavailable' })
  }
  const got = req.get('X-Invite-Secret') || req.get('x-invite-secret') || ''
  if (!timingSafeEqualStr(expected, got)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

/**
 * POST /api/auth/check-invite
 *
 * Looks up the most recent non-revoked, non-expired invite for the given
 * email. On success, stamps `consumedAt` the first time and returns the
 * roles the inviting admin chose (default 'trainee' if none were set).
 */
router.post('/check-invite', requireSharedSecret, async (req, res, next) => {
  try {
    const rawEmail = (req.body?.email || '').toString().toLowerCase().trim()
    if (!rawEmail) return res.status(400).json({ error: 'email required' })

    // Single Cypher call:
    //   1) find the newest invite for this email
    //   2) return its state so we can classify valid vs reason
    //   3) if currently valid, SET consumedAt on first hit (coalesce preserves
    //      the original timestamp on subsequent repeat logins)
    const rows = await runQuery(
      `
      MATCH (i:Invite { email: $email })
      WITH i ORDER BY coalesce(i.invitedAt, 0) DESC LIMIT 1
      WITH i,
           CASE WHEN i.revokedAt IS NOT NULL THEN false
                WHEN i.expiresAt IS NOT NULL AND i.expiresAt <= timestamp() THEN false
                ELSE true END AS isValid
      FOREACH (_ IN CASE WHEN isValid AND i.consumedAt IS NULL THEN [1] ELSE [] END |
        SET i.consumedAt = timestamp()
      )
      RETURN i.id         AS id,
             i.email      AS email,
             i.roles      AS roles,
             i.invitedAt  AS invitedAt,
             i.expiresAt  AS expiresAt,
             i.revokedAt  AS revokedAt,
             i.consumedAt AS consumedAt,
             isValid      AS isValid
      `,
      { email: rawEmail }
    )

    if (rows.length === 0) {
      return res.json({ valid: false, reason: 'no-invite' })
    }

    const r = rows[0]
    if (!r.isValid) {
      const reason = r.revokedAt ? 'revoked'
                    : (r.expiresAt && r.expiresAt <= Date.now()) ? 'expired'
                    : 'no-active-invite'
      return res.json({ valid: false, reason })
    }

    const roles = (Array.isArray(r.roles) && r.roles.length > 0) ? r.roles : ['trainee']
    return res.json({
      valid: true,
      roles,
      inviteId: r.id,
      expiresAt: r.expiresAt || null,
    })
  } catch (e) {
    console.error('[POST /api/auth/check-invite]', e)
    next(e)
  }
})

export default router
