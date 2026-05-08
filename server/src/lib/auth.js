import { auth as jwtAuth } from 'express-oauth2-jwt-bearer'
import { runQuery } from './neo4j.js'

const NAMESPACE = 'https://3fffs.app'

const domain = process.env.AUTH0_DOMAIN
const audience = process.env.AUTH0_AUDIENCE

if (!domain || !audience) {
  console.warn('⚠  AUTH0_DOMAIN and AUTH0_AUDIENCE not set — auth will be disabled (development mode only)')
}

/**
 * Verifies an Auth0 JWT access token.
 *
 * When AUTH0_DOMAIN is not set (local dev without Auth0), this is a no-op
 * and requests proceed with a synthetic guest user — convenient but should
 * never be used in production.
 */
export const requireAuth = domain && audience
  ? jwtAuth({
      audience,
      issuerBaseURL: `https://${domain}/`,
      tokenSigningAlg: 'RS256',
    })
  : (req, res, next) => {
      req.auth = {
        payload: {
          sub: 'dev|guest',
          email: 'guest@local.dev',
          [`${NAMESPACE}/roles`]: ['trainee'],
        },
      }
      next()
    }

/**
 * Extracts normalized user info from the verified JWT payload.
 */
export function getUser(req) {
  const p = req.auth?.payload || {}
  return {
    id: p.sub,
    email: p[`${NAMESPACE}/email`] || p.email || null,
    name: p.name || null,
    roles: p[`${NAMESPACE}/roles`] || [],
  }
}

/**
 * Middleware: require a specific Auth0 role (trainee | manager | admin).
 * Use this AFTER requireAuth on any route that needs elevated permission.
 */
export function requireRole(...allowed) {
  return (req, res, next) => {
    const user = getUser(req)
    const hasRole = user.roles.some((r) => allowed.includes(r))
    if (!hasRole) {
      return res.status(403).json({
        error: `Requires one of: ${allowed.join(', ')}`,
        yourRoles: user.roles,
      })
    }
    next()
  }
}

/**
 * Middleware: syncs the authenticated user into Neo4j as a :User node
 * on every request. Idempotent — MERGE by Auth0 ID (sub).
 * Also records their effective role for manager-dashboard queries.
 *
 * v25.7.0 (ISS-019a / ISS-021): also auto-maps the user to their Bank
 * via :MEMBER_OF edge based on User.domain (their email domain). Banks
 * are seeded via migrate:banks; mapping is best-effort. If the user's
 * domain doesn't match any Bank, they're left without an edge — the
 * client falls back to a default-theme experience and admin can assign
 * manually later.
 */
export async function syncUser(req, res, next) {
  try {
    const u = getUser(req)
    if (!u.id) return next()
    const domain = (u.email || '').split('@')[1] || null

    // v25.7.0.25.2 — race-condition fix for the role mirror.
    //
    // The bug: when an admin grants a role to a user via POST /users/:id/roles,
    // the dual-write updates Auth0 + Neo4j atomically. But the next request
    // from that user's browser still carries their old JWT (Auth0 doesn't
    // refresh JWTs in-place; the user must re-log in to get a new one with
    // the updated roles claim). syncUser would then overwrite the freshly-
    // mirrored Neo4j roles back to the JWT's stale values, silently undoing
    // the grant.
    //
    // The fix: compare the JWT's iat (issued-at) timestamp against
    // u.lastRoleChangeAt. When lastRoleChangeAt > iat, the local Neo4j state
    // is provably newer than the JWT (because the role grant endpoint sets
    // lastRoleChangeAt to timestamp() AFTER the JWT was issued). In that case
    // we keep the local roles. When iat > lastRoleChangeAt (the normal case,
    // including a fresh login), the JWT is authoritative and we use it as
    // before.
    //
    // Net effect:
    //   - Self-grants persist immediately, no logout cycle needed
    //   - Cross-user grants persist for the affected user until their next
    //     login (which then naturally re-syncs everything)
    //   - Normal logins behave exactly as before
    //   - Auth0 remains the eventual-consistency anchor
    const iatSec = req.auth?.payload?.iat
    const iatMs = iatSec ? iatSec * 1000 : Date.now()

    await runQuery(
      `MERGE (user:User {id: $id})
       ON CREATE SET user.createdAt = timestamp(), user.firstSeenAt = timestamp()
       SET user.email = $email,
           user.name = $name,
           user.roles = CASE
             WHEN user.lastRoleChangeAt IS NOT NULL AND user.lastRoleChangeAt > $iatMs
             THEN user.roles
             ELSE $roles
           END,
           user.lastSeenAt = timestamp(),
           user.domain = $domain`,
      {
        id: u.id,
        email: u.email,
        name: u.name,
        roles: u.roles,
        domain,
        iatMs,
      }
    )

    // v25.7.0: auto-link user to Bank by domain match. Best-effort —
    // OPTIONAL MATCH means no error if no Bank node matches the domain
    // (could be a new domain, or the migration hasn't run yet).
    //
    // v25.7.0.24: auto-link only fires when the user has zero existing
    // MEMBER_OF edges. This makes the auto-domain link a "set the default
    // for new users" operation rather than something that fights with
    // admin overrides. Once an admin has explicitly assigned a user to a
    // bank via PATCH /api/admin/users/:id, that assignment survives every
    // subsequent login regardless of what the email domain implies.
    if (domain) {
      await runQuery(
        `MATCH (user:User {id: $id})
         OPTIONAL MATCH (user)-[existing:MEMBER_OF]->(:Bank)
         WITH user, count(existing) AS existingCount
         OPTIONAL MATCH (b:Bank) WHERE $domain IN b.domains
         FOREACH (_ IN CASE WHEN b IS NULL OR existingCount > 0 THEN [] ELSE [1] END |
           MERGE (user)-[r:MEMBER_OF]->(b)
           ON CREATE SET r.linkedAt = timestamp(), r.method = 'auto-domain'
         )`,
        { id: u.id, domain }
      )
    }
  } catch (err) {
    console.error('syncUser failed:', err.message)
  }
  next()
}
