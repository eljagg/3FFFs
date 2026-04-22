/**
 * Auth0 Post-Login Action — Domain Allowlist, Invite Fallback, Default Role
 *
 * Login policy (v23):
 *
 *   1. If the user's email domain is on ALLOWED_DOMAINS → proceed; assign
 *      the "trainee" role on first login if they have no roles yet.
 *
 *   2. Otherwise, call our server's public invite-check endpoint. If a valid
 *      invite exists for the email → proceed; assign whatever roles the
 *      invite specifies (default 'trainee') on first login.
 *
 *   3. Otherwise, deny with a clear message and surface the domain to the
 *      signing-up user so they know to contact an admin.
 *
 * Role claims (access token + id token) are set at the bottom for every
 * user that gets through. Extracts role names from role objects before
 * setting the claim (`event.authorization.roles` returns `[{id, name}]`
 * not `['name']`, so we `.map(r => r.name)` before writing the claim).
 *
 * --- Required secrets (Auth0 Dashboard → Actions → Library → Edit this action):
 *
 *   AUTH0_DOMAIN             — e.g. `3fffs-training.us.auth0.com`
 *   AUTH0_MGMT_CLIENT_ID     — Management API M2M client ID
 *   AUTH0_MGMT_CLIENT_SECRET — Management API M2M client secret
 *   API_BASE_URL             — e.g. `https://server-production-7882.up.railway.app`
 *   INVITE_CHECK_SECRET      — 32-byte random; MUST match server env var
 *
 * Runs on Node 18+ so `fetch` is global.
 */

const ALLOWED_DOMAINS = [
  'barita.com',
  'jncb.com',
  'jm.scotiabank.com',
  'cibccaribbean.com',
];

const DEFAULT_ROLE = 'trainee';
const NAMESPACE = 'https://3fffs.app';
const INVITE_CHECK_TIMEOUT_MS = 5000;

/** Ask the server whether this email has a valid outstanding invite. */
async function checkInvite(event, email) {
  const apiBase = event.secrets.API_BASE_URL;
  const secret = event.secrets.INVITE_CHECK_SECRET;
  if (!apiBase || !secret) {
    // Not configured — treat as "no invite". Fail safe.
    return { valid: false, reason: 'not-configured' };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), INVITE_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(apiBase.replace(/\/$/, '') + '/api/auth/check-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Invite-Secret': secret,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { valid: false, reason: 'http-' + res.status };
    }
    const body = await res.json();
    return body && typeof body === 'object' ? body : { valid: false, reason: 'bad-body' };
  } catch (err) {
    console.log('Invite check error:', err.message);
    return { valid: false, reason: 'exception' };
  } finally {
    clearTimeout(t);
  }
}

/** Assign one or more roles (by name) to the newly created user via the Management API. */
async function assignRolesByName(event, roleNames) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return;
  try {
    const ManagementClient = require('auth0').ManagementClient;
    const management = new ManagementClient({
      domain: event.secrets.AUTH0_DOMAIN,
      clientId: event.secrets.AUTH0_MGMT_CLIENT_ID,
      clientSecret: event.secrets.AUTH0_MGMT_CLIENT_SECRET,
    });

    // Fetch the role IDs. The API accepts a `name_filter` for exact match,
    // so we call once per role to keep the result size tiny.
    const roleIds = [];
    for (const name of roleNames) {
      const resp = await management.roles.getAll({ name_filter: name });
      const id = resp.data?.[0]?.id;
      if (id) roleIds.push(id);
    }

    if (roleIds.length > 0) {
      await management.users.assignRoles(
        { id: event.user.user_id },
        { roles: roleIds }
      );
    }
  } catch (err) {
    console.log('Role assignment failed:', err.message);
  }
}

exports.onExecutePostLogin = async (event, api) => {
  const email = (event.user.email || '').toLowerCase().trim();
  const domain = email.split('@')[1];

  const hasAnyRole = (event.authorization?.roles || []).length > 0;
  const isFirstLogin = event.stats?.logins_count === 1;

  // (1) Domain allowlist path — the 99% case for staff at partner banks.
  if (ALLOWED_DOMAINS.includes(domain)) {
    if (isFirstLogin && !hasAnyRole) {
      await assignRolesByName(event, [DEFAULT_ROLE]);
    }
  } else {
    // (2) Domain not on allowlist — ask the server if there's a valid invite.
    const inviteResult = await checkInvite(event, email);

    if (!inviteResult || !inviteResult.valid) {
      // (3) No invite either — deny.
      api.access.deny(
        `Email domain "${domain}" is not authorized. Contact your administrator.`
      );
      return;
    }

    // Valid invite — assign whatever roles the admin chose, but only on
    // first login. Subsequent logins via the same invite just coast through.
    if (isFirstLogin && !hasAnyRole) {
      const invitedRoles = Array.isArray(inviteResult.roles) && inviteResult.roles.length
        ? inviteResult.roles
        : [DEFAULT_ROLE];
      await assignRolesByName(event, invitedRoles);
    }
  }

  // Extract role names from role objects.
  // event.authorization.roles returns objects like [{id: 'rol_x', name: 'admin'}],
  // but the client expects a string array like ['admin']. Map through r.name.
  // Defensively handles the case where entries are already strings.
  const roleObjects = event.authorization?.roles || [];
  const roleNames = roleObjects.map(r =>
    typeof r === 'string' ? r : (r.name || r)
  );

  // If still empty and this is a first login, fall back to the default role
  // (the Management API call above may not have persisted yet in this same request).
  // For the invite path specifically we also want the assigned roles to show up;
  // trainee is a safe default if the fetch hasn't caught up.
  const roles = roleNames.length > 0
    ? roleNames
    : (isFirstLogin ? [DEFAULT_ROLE] : []);

  // Add role claims to both access token and ID token
  api.accessToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.accessToken.setCustomClaim(`${NAMESPACE}/email`, email);
  api.idToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.idToken.setCustomClaim(`${NAMESPACE}/email`, email);
};
