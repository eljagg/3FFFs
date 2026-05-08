import { Router } from 'express'
import { randomUUID } from 'crypto'
import { runQuery } from '../lib/neo4j.js'
import { requireRole, getUser } from '../lib/auth.js'
import { assignRoleToUser, removeRoleFromUser, isAuth0Configured, VALID_ROLES, describeEnvVar, getEnvDomain, getEnvClientId, getEnvClientSecret } from '../lib/auth0-management.js'

/* -------------------------------------------------------------------------
   /api/admin/* — admin-only user and invite management

   Everything in this router is gated behind the 'admin' role. Mounted
   AFTER the requireAuth / syncUser wall in index.js.

   Endpoints:
     GET    /users              — list all :User nodes with progress rollups
     GET    /users/:id          — full per-user drill-down: bank, managers,
                                  invite history, recent attempts, quiz answers,
                                  completed scenarios. v25.7.0.23.
     PATCH  /users/:id          — admin edit: displayName override and/or
                                  bank reassignment. v25.7.0.24.
     POST   /users/:id/roles    — grant a role to a user via the Auth0
                                  Management API; mirrors the change to the
                                  Neo4j :User node. v25.7.0.25.
     DELETE /users/:id/roles/:role — revoke a role from a user. Same dual-
                                  write to Auth0 + Neo4j. v25.7.0.25.
     GET    /banks              — list all :Bank nodes (for the bank-reassign
                                  dropdown in the user detail modal). v25.7.0.24.
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
// GET /api/admin/debug/auth0-status                          (v25.7.0.25.1)
// ------------------------------------------------------------------
// Diagnostic endpoint. Reports the status of the Auth0 Management API
// configuration WITHOUT exposing actual secret values. Returns:
//   - whether each env var is present
//   - its raw length, trimmed length, first/last char
//   - whether trimming changed it (catches paste-whitespace bugs)
//   - a live token-endpoint test result with the raw Auth0 response
//
// Use this when role grant/revoke fails with `access_denied` and you
// need to know whether the env vars are actually correct or whether
// Auth0 is rejecting the credentials. Admin-only by router-level guard.
//
// Safe to leave in production: no actual secret values in the response,
// only their metadata. The first/last char of a 64-char Client Secret
// is not enough to reconstruct it.
router.get('/debug/auth0-status', async (_req, res, next) => {
  try {
    const env = {
      AUTH0_DOMAIN:            describeEnvVar('AUTH0_DOMAIN'),
      AUTH0_M2M_CLIENT_ID:     describeEnvVar('AUTH0_M2M_CLIENT_ID'),
      AUTH0_M2M_CLIENT_SECRET: describeEnvVar('AUTH0_M2M_CLIENT_SECRET'),
    }

    let tokenTest = { attempted: false, reason: 'env vars not configured' }
    if (isAuth0Configured()) {
      tokenTest = { attempted: true }
      const domain = getEnvDomain()
      try {
        const resp = await fetch(`https://${domain}/oauth/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_id:     getEnvClientId(),
            client_secret: getEnvClientSecret(),
            audience:      `https://${domain}/api/v2/`,
            grant_type:    'client_credentials',
          }),
        })
        const body = await resp.text().catch(() => '')
        let parsedBody = body
        try { parsedBody = JSON.parse(body) } catch { /* keep as text */ }
        tokenTest.status = resp.status
        tokenTest.success = resp.ok
        // For success, redact the actual access_token to avoid logging it,
        // but include the scope field (the actually useful confirmation)
        if (resp.ok && parsedBody && typeof parsedBody === 'object') {
          tokenTest.body = {
            access_token: parsedBody.access_token ? `${parsedBody.access_token.slice(0, 12)}...REDACTED` : null,
            scope:        parsedBody.scope,
            expires_in:   parsedBody.expires_in,
            token_type:   parsedBody.token_type,
          }
        } else {
          tokenTest.body = parsedBody
        }
      } catch (e) {
        tokenTest.success = false
        tokenTest.error = e.message
      }
    }

    res.json({
      configured: isAuth0Configured(),
      env,
      tokenTest,
      hint: 'If hadWhitespace is true on any env var, that env var was pasted with leading/trailing whitespace. v25.7.0.25.1 trims at read time so the system tolerates this; updating the Railway env var to remove the whitespace is still recommended for cleanliness.',
    })
  } catch (e) { next(e) }
})

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
        u.displayName  AS displayName,
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
// GET /api/admin/users/:id                                  (v25.7.0.23)
// ------------------------------------------------------------------
// Full per-user drill-down for the Users tab modal. Six parallel queries
// composed into a single response so the modal opens with one round-trip.
//
// Sections returned:
//   user                 — base node fields
//   bank                 — { id, displayName } via :MEMBER_OF, or null
//   managers             — people who :MANAGES this user (the "managed by")
//   manages              — people this user :MANAGES (only meaningful if
//                          this user has the manager role)
//   invite               — :Invite by matching email, or null. Includes the
//                          extend audit fields added in v25.7.0.22.
//   progress.totals      — same rollups as in GET /users, repeated here so
//                          the modal doesn't need to re-fetch the list row
//   progress.completed   — completed scenarios with timestamps
//   progress.attempts    — last 50 stage attempts (correct/incorrect, scenario)
//   progress.quizAnswers — last 30 quiz answers (correct/incorrect, prompt)
//
// All sub-queries are read-only; no MERGE, no SET, so OBS-021 N/A.
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const [
      userRows, bankRows, managersRows, managesRows,
      inviteRows, totalsRows, completedRows, attemptsRows, quizRows,
    ] = await Promise.all([
      runQuery(`
        MATCH (u:User {id: $id})
        OPTIONAL MATCH (changer:User {id: u.roleChangedBy})
        RETURN u.id AS id, u.email AS email, u.name AS name,
               u.displayName AS displayName,
               u.domain AS domain, u.roles AS roles,
               u.firstSeenAt AS firstSeenAt, u.lastSeenAt AS lastSeenAt,
               u.lastRoleChangeAt AS lastRoleChangeAt,
               u.roleChangedBy AS roleChangedBy,
               changer.email AS roleChangedByEmail
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})-[:MEMBER_OF]->(b:Bank)
        RETURN b.id AS id, b.displayName AS displayName
      `, { id }),
      runQuery(`
        MATCH (mgr:User)-[edge:MANAGES]->(u:User {id: $id})
        RETURN mgr.id AS id, mgr.email AS email, mgr.name AS name,
               edge.assignedAt AS assignedAt, edge.assignedBy AS assignedBy
        ORDER BY mgr.email
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})-[edge:MANAGES]->(report:User)
        RETURN report.id AS id, report.email AS email, report.name AS name,
               edge.assignedAt AS assignedAt
        ORDER BY report.email
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})
        OPTIONAL MATCH (i:Invite {email: u.email})
        OPTIONAL MATCH (inviter:User {id: i.invitedBy})
        OPTIONAL MATCH (extender:User {id: i.extendedBy})
        WITH i, inviter, extender WHERE i IS NOT NULL
        RETURN i.id AS id, i.email AS email, i.roles AS roles, i.notes AS notes,
               i.invitedBy AS invitedBy, inviter.email AS invitedByEmail,
               i.invitedAt AS invitedAt, i.expiresAt AS expiresAt,
               i.revokedAt AS revokedAt, i.consumedAt AS consumedAt,
               i.lastUsedAt AS lastUsedAt, i.useCount AS useCount,
               i.lastExtendedAt AS lastExtendedAt,
               i.extendedBy AS extendedBy, extender.email AS extendedByEmail
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})
        OPTIONAL MATCH (u)-[c:COMPLETED]->(sc:Scenario)
        OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
        OPTIONAL MATCH (u)-[att:ATTEMPTED_STAGE]->(st:Stage)
        RETURN
          count(DISTINCT sc) AS scenariosCompleted,
          count(DISTINCT q)  AS quizzesAnswered,
          sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers,
          count(DISTINCT st) AS stagesAttempted
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})-[c:COMPLETED]->(sc:Scenario)
        RETURN sc.id AS scenarioId, sc.title AS title,
               c.completedAt AS completedAt, c.lastAt AS lastAt
        ORDER BY c.completedAt DESC
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})-[a:ATTEMPTED_STAGE]->(st:Stage)
        OPTIONAL MATCH (sc:Scenario)-[:HAS_STAGE]->(st)
        RETURN st.id AS stageId, st.heading AS heading,
               sc.id AS scenarioId, sc.title AS scenarioTitle,
               a.optionIndex AS optionIndex, a.correct AS correct,
               a.answeredAt AS answeredAt
        ORDER BY a.answeredAt DESC
        LIMIT 50
      `, { id }),
      runQuery(`
        MATCH (u:User {id: $id})-[a:ANSWERED]->(q:Quiz)
        RETURN q.id AS quizId, q.question AS question, q.tacticId AS tacticId,
               a.correct AS correct, a.answeredAt AS answeredAt
        ORDER BY a.answeredAt DESC
        LIMIT 30
      `, { id }),
    ])

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    res.json({
      user: userRows[0],
      bank: bankRows[0] || null,
      managers: managersRows,
      manages: managesRows,
      invite: inviteRows[0] || null,
      progress: {
        totals: totalsRows[0] || {
          scenariosCompleted: 0, quizzesAnswered: 0,
          correctAnswers: 0, stagesAttempted: 0,
        },
        completed: completedRows,
        attempts: attemptsRows,
        quizAnswers: quizRows,
      },
    })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// PATCH /api/admin/users/:id                                (v25.7.0.24)
// ------------------------------------------------------------------
// Body: { displayName?, bankId? }
//   displayName: string  → set User.displayName (override Auth0's name)
//                ''/null → remove the override; UI falls back to Auth0 name
//                undefined → leave displayName untouched
//   bankId:      string  → reassign user to that :Bank (must exist)
//                ''/null → unassign (delete all :MEMBER_OF edges)
//                undefined → leave bank assignment untouched
//
// Architectural note: we do NOT touch User.name or User.roles here. Those
// are owned by Auth0 and overwritten by syncUser() on every login. A
// separate User.displayName property — which syncUser does NOT set —
// gives admins a durable override for the rare case where Auth0's name
// is blank or wrong. Bank reassignment works because we tweaked syncUser
// in the same release to skip the auto-domain link when ANY MEMBER_OF
// edge already exists, so admin overrides survive subsequent logins.
//
// Role changes still route through the Auth0 dashboard for now; a
// future release wires the Auth0 Management API to bring role
// promote/demote into 3FFFs as well.
router.patch('/users/:id', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { id } = req.params
    const body = req.body || {}

    // Verify the user exists before applying edits
    const exists = await runQuery(
      `MATCH (u:User {id: $id}) RETURN u.id AS id`,
      { id }
    )
    if (exists.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // ---- displayName edit (only when the field was explicitly sent) ----
    if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
      const raw = body.displayName
      const trimmed = typeof raw === 'string' ? raw.trim() : null
      if (trimmed) {
        await runQuery(
          `MATCH (u:User {id: $id})
           SET u.displayName = $displayName,
               u.displayNameSetAt = timestamp(),
               u.displayNameSetBy = $me`,
          { id, displayName: trimmed, me: me.id }
        )
      } else {
        // Empty/null → remove the override entirely
        await runQuery(
          `MATCH (u:User {id: $id})
           REMOVE u.displayName, u.displayNameSetAt, u.displayNameSetBy`,
          { id }
        )
      }
    }

    // ---- bankId edit (only when the field was explicitly sent) ----
    if (Object.prototype.hasOwnProperty.call(body, 'bankId')) {
      const raw = body.bankId
      const newBankId = typeof raw === 'string' && raw.trim() ? raw.trim() : null

      // Always clear existing MEMBER_OF first — admin override replaces, not appends.
      // syncUser's auto-domain link will NOT re-add an edge on next login because
      // (in v25.7.0.24) it only fires when zero MEMBER_OF edges exist, and we'll
      // have created exactly one below if newBankId is provided.
      await runQuery(
        `MATCH (u:User {id: $id})-[r:MEMBER_OF]->(:Bank)
         DELETE r`,
        { id }
      )

      if (newBankId) {
        // Verify bank exists; reject the edit cleanly if not (avoids creating
        // a phantom MEMBER_OF to a missing Bank node)
        const bankExists = await runQuery(
          `MATCH (b:Bank {id: $bankId}) RETURN b.id AS id`,
          { bankId: newBankId }
        )
        if (bankExists.length === 0) {
          return res.status(400).json({ error: `Bank ${newBankId} not found.` })
        }
        await runQuery(
          `MATCH (u:User {id: $id})
           MATCH (b:Bank {id: $bankId})
           MERGE (u)-[r:MEMBER_OF]->(b)
             ON CREATE SET r.linkedAt   = timestamp(),
                           r.method     = 'admin-override',
                           r.assignedBy = $me`,
          { id, bankId: newBankId, me: me.id }
        )
      }
      // newBankId === null → user is now unassigned (no MEMBER_OF edges).
      // That's a valid terminal state; the modal will show no Bank line.
    }

    // Return the updated user payload so the client can refresh without a second fetch
    const refreshed = await runQuery(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(b:Bank)
       RETURN u.id AS id, u.email AS email, u.name AS name,
              u.displayName AS displayName,
              u.domain AS domain, u.roles AS roles,
              u.firstSeenAt AS firstSeenAt, u.lastSeenAt AS lastSeenAt,
              b { .id, .displayName } AS bank`,
      { id }
    )
    res.json({ user: refreshed[0], bank: refreshed[0]?.bank || null })
  } catch (e) { next(e) }
})

// ------------------------------------------------------------------
// POST /api/admin/users/:id/roles                            (v25.7.0.25)
// ------------------------------------------------------------------
// Body: { role }   where role ∈ {'trainee','manager','admin'}
//
// Grants a role to a user via the Auth0 Management API, then mirrors the
// change to the local :User node so the UI reflects the new state without
// waiting for the user's next login. The next login's syncUser() will
// re-read roles from Auth0 — so Auth0 remains the source of truth and
// any divergence converges back automatically.
//
// Architectural note: unlike displayName (v25.7.0.24's parallel-field
// pattern), roles MUST round-trip to Auth0 because they affect the JWT
// the Auth0 Action issues — and that JWT is what gates server-side
// authorization. A 3FFFs-only role write would silently fail to grant
// access on the user's next login. This endpoint does both writes and
// fails atomically: if Auth0 rejects, Neo4j is not touched.
//
// Self-demotion guard: an admin cannot revoke their own admin role
// (would lock themselves out instantly). Other self-edits are allowed.
router.post('/users/:id/roles', async (req, res, next) => {
  try {
    if (!isAuth0Configured()) {
      return res.status(503).json({
        error: 'Auth0 Management API not configured. Set AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET on the server.',
      })
    }
    const me = getUser(req)
    const { id } = req.params
    const { role } = req.body || {}

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.` })
    }

    // Verify the user exists in Neo4j (also gives us their current roles
    // for the post-grant array update)
    const userRows = await runQuery(
      `MATCH (u:User {id: $id}) RETURN u.id AS id, u.roles AS roles`,
      { id }
    )
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // Auth0 first. If this throws, Neo4j is untouched — atomicity by ordering.
    await assignRoleToUser(id, role)

    // Mirror to Neo4j. Use list-comprehension to add only if not already
    // present, preserving idempotence (matches Auth0's silent no-op behavior).
    const existing = userRows[0].roles || []
    const merged = existing.includes(role) ? existing : [...existing, role]

    await runQuery(
      `MATCH (u:User {id: $id})
       SET u.roles            = $roles,
           u.lastRoleChangeAt = timestamp(),
           u.roleChangedBy    = $me`,
      { id, roles: merged, me: me.id }
    )

    res.json({ ok: true, granted: role, roles: merged })
  } catch (e) {
    if (e.code === 'AUTH0_API_FAILED') {
      return res.status(502).json({ error: `Auth0 rejected the role grant: ${e.message}` })
    }
    next(e)
  }
})

// ------------------------------------------------------------------
// DELETE /api/admin/users/:id/roles/:role                    (v25.7.0.25)
// ------------------------------------------------------------------
// Revokes a role from a user via the Auth0 Management API + local mirror.
// Same atomicity ordering as POST. Self-demotion of admin is blocked.
router.delete('/users/:id/roles/:role', async (req, res, next) => {
  try {
    if (!isAuth0Configured()) {
      return res.status(503).json({
        error: 'Auth0 Management API not configured. Set AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET on the server.',
      })
    }
    const me = getUser(req)
    const { id, role } = req.params

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.` })
    }

    // Self-demotion guard: an admin revoking their own admin role would
    // lock themselves out instantly (the next request would 403). Block.
    if (id === me.id && role === 'admin') {
      return res.status(400).json({
        error: 'You cannot revoke your own admin role — that would lock you out. Have another admin do it.',
      })
    }

    const userRows = await runQuery(
      `MATCH (u:User {id: $id}) RETURN u.id AS id, u.roles AS roles`,
      { id }
    )
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    await removeRoleFromUser(id, role)

    const existing = userRows[0].roles || []
    const remaining = existing.filter(r => r !== role)

    await runQuery(
      `MATCH (u:User {id: $id})
       SET u.roles            = $roles,
           u.lastRoleChangeAt = timestamp(),
           u.roleChangedBy    = $me`,
      { id, roles: remaining, me: me.id }
    )

    res.json({ ok: true, revoked: role, roles: remaining })
  } catch (e) {
    if (e.code === 'AUTH0_API_FAILED') {
      return res.status(502).json({ error: `Auth0 rejected the role revoke: ${e.message}` })
    }
    next(e)
  }
})

// ------------------------------------------------------------------
// GET /api/admin/banks                                       (v25.7.0.24)
// ------------------------------------------------------------------
// All :Bank nodes, for the bank-reassign dropdown in the user detail
// modal. Lightweight — id + displayName + domains, no membership counts
// (those are queried per-bank elsewhere when needed).
router.get('/banks', async (req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (b:Bank)
      RETURN b.id AS id, b.displayName AS displayName,
             b.name AS name, b.domains AS domains
      ORDER BY b.displayName
    `)
    res.json({ banks: rows })
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
