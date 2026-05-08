/**
 * auth0-management.js — Auth0 Management API client (v25.7.0.25, ISS-024)
 *
 * Wraps the Auth0 Management API for the four operations 3FFFs needs:
 *   • fetch a Management API access token via client-credentials grant
 *   • assign a role to a user
 *   • remove a role from a user
 *   • (helper) check whether the lib is configured at all
 *
 * Why these four and only these four: the M2M application's authorized scopes
 * are deliberately narrow (read:users, update:users, read:roles,
 * read:role_members, create:role_members, delete:role_members). We can't
 * delete users, change passwords, or rotate emails through this lib even if
 * we wanted to — Auth0 itself would reject the call. That's the intended
 * blast-radius limit; broader admin operations stay on the Auth0 dashboard.
 *
 * Token caching: M2M tokens default to 24h validity. We cache the most-recent
 * token in a module-level variable and refresh ~5 minutes before expiry, so
 * the typical role-change request is a single round-trip to Auth0 (the
 * /api/v2/users/:id/roles call), not two (token + call).
 *
 * Configuration: requires three env vars on the server. If any are missing,
 * isAuth0Configured() returns false and the higher-level admin endpoints
 * return a clear 503 instead of silently crashing — which means a partially-
 * configured deploy is recoverable rather than catastrophic.
 *
 *   AUTH0_DOMAIN              e.g. "3fffs-training.us.auth0.com" (no scheme)
 *   AUTH0_M2M_CLIENT_ID       Client ID of the M2M application
 *   AUTH0_M2M_CLIENT_SECRET   Client Secret of the M2M application
 *
 * Role IDs are hardcoded below — Auth0 role IDs are tenant-specific but
 * stable for the life of the role, so hardcoding saves a lookup round-trip
 * on every grant/revoke. If a role is renamed or recreated in Auth0, this
 * table needs updating to match (the tenant-pinning comment is intentional).
 */

// Tenant-pinned to the 3fffs-training Auth0 tenant. If the tenant migrates
// or roles are recreated, these IDs must be refreshed by reading them from
// the Auth0 dashboard (User Management → Roles → click each role → URL).
const ROLE_IDS = {
  trainee: 'rol_GepPsVvm8XJA7DRi',
  manager: 'rol_ye9qNc9xR8KgCMmJ',
  admin:   'rol_wemMbZP48YNuVZ6E',
}

export const VALID_ROLES = Object.keys(ROLE_IDS)

// Module-level token cache. Refreshed on demand; see getManagementToken().
let cachedToken = null
let cachedExpiresAt = 0
const REFRESH_BUFFER_MS = 5 * 60 * 1000  // refresh 5 min before actual expiry

export function isAuth0Configured() {
  return !!(
    process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_M2M_CLIENT_ID &&
    process.env.AUTH0_M2M_CLIENT_SECRET
  )
}

function configError() {
  const err = new Error('Auth0 Management API is not configured. Set AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET on the server.')
  err.code = 'AUTH0_NOT_CONFIGURED'
  return err
}

/**
 * Returns a valid Auth0 Management API access token, fetching a fresh one
 * if the cached token is missing or close to expiry. Throws if Auth0 itself
 * rejects the credentials (typically a Client Secret rotation, the M2M app
 * being deauthorized, or a scope being revoked).
 */
async function getManagementToken() {
  if (!isAuth0Configured()) throw configError()

  if (cachedToken && Date.now() < cachedExpiresAt - REFRESH_BUFFER_MS) {
    return cachedToken
  }

  const domain = process.env.AUTH0_DOMAIN
  const resp = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.AUTH0_M2M_CLIENT_ID,
      client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
      audience:      `https://${domain}/api/v2/`,
      grant_type:    'client_credentials',
    }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    const err = new Error(`Auth0 token endpoint returned ${resp.status}: ${body}`)
    err.code = 'AUTH0_TOKEN_FAILED'
    throw err
  }

  const data = await resp.json()
  cachedToken = data.access_token
  // expires_in is seconds; convert to absolute ms timestamp
  cachedExpiresAt = Date.now() + (data.expires_in * 1000)
  return cachedToken
}

/**
 * Internal helper: makes an authenticated request to the Management API.
 * Retries once on 401 (token may have been invalidated between cache and call).
 */
async function managementRequest(path, init = {}) {
  if (!isAuth0Configured()) throw configError()

  const domain = process.env.AUTH0_DOMAIN
  const url = `https://${domain}/api/v2${path}`

  async function attempt(token) {
    const resp = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        'authorization': `Bearer ${token}`,
        'content-type':  'application/json',
      },
    })
    return resp
  }

  let token = await getManagementToken()
  let resp = await attempt(token)

  // Token may have been invalidated server-side between cache and call.
  // Force a refresh and retry once before giving up.
  if (resp.status === 401) {
    cachedToken = null
    token = await getManagementToken()
    resp = await attempt(token)
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    const err = new Error(`Auth0 Management API ${init.method || 'GET'} ${path} returned ${resp.status}: ${body}`)
    err.code = 'AUTH0_API_FAILED'
    err.status = resp.status
    throw err
  }

  // Auth0 sometimes returns empty body on 204. Be defensive.
  const text = await resp.text()
  return text ? JSON.parse(text) : null
}

/**
 * Assign a role to a user. Idempotent — Auth0 silently no-ops if the user
 * already has the role. Throws if the role name isn't in VALID_ROLES.
 */
export async function assignRoleToUser(auth0UserId, roleName) {
  const roleId = ROLE_IDS[roleName]
  if (!roleId) {
    const err = new Error(`Unknown role: ${roleName}. Valid roles are: ${VALID_ROLES.join(', ')}.`)
    err.code = 'INVALID_ROLE'
    throw err
  }
  await managementRequest(`/users/${encodeURIComponent(auth0UserId)}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roles: [roleId] }),
  })
}

/**
 * Remove a role from a user. Idempotent — Auth0 silently no-ops if the user
 * didn't have the role. Throws if the role name isn't in VALID_ROLES.
 */
export async function removeRoleFromUser(auth0UserId, roleName) {
  const roleId = ROLE_IDS[roleName]
  if (!roleId) {
    const err = new Error(`Unknown role: ${roleName}. Valid roles are: ${VALID_ROLES.join(', ')}.`)
    err.code = 'INVALID_ROLE'
    throw err
  }
  await managementRequest(`/users/${encodeURIComponent(auth0UserId)}/roles`, {
    method: 'DELETE',
    body: JSON.stringify({ roles: [roleId] }),
  })
}
