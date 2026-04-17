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
 */
export async function syncUser(req, res, next) {
  try {
    const u = getUser(req)
    if (!u.id) return next()

    await runQuery(
      `MERGE (user:User {id: $id})
       ON CREATE SET user.createdAt = timestamp(), user.firstSeenAt = timestamp()
       SET user.email = $email,
           user.name = $name,
           user.roles = $roles,
           user.lastSeenAt = timestamp(),
           user.domain = $domain`,
      {
        id: u.id,
        email: u.email,
        name: u.name,
        roles: u.roles,
        domain: (u.email || '').split('@')[1] || null,
      }
    )
  } catch (err) {
    console.error('syncUser failed:', err.message)
  }
  next()
}
