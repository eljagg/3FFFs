/**
 * Auth0 Post-Login Action — Domain Allowlist, Invite Bypass, Default Role
 *
 * Flow on every login:
 *   1. If the user's email domain is on the hardcoded allowlist → proceed.
 *   2. Otherwise, call /api/auth/check-invite on the 3fffs API with a
 *      shared secret. If the email has an active :Invite in Neo4j, the
 *      API returns the roles the user should be assigned; proceed.
 *   3. If neither check passes → deny with a clear message.
 *
 * First-login role assignment:
 *   - Domain-allowlisted users get 'trainee' (the historical default).
 *   - Invited users get the roles specified on their :Invite (e.g. ['trainee']
 *     for an external reviewer, ['manager'] for a partner bank contact).
 *   - Uses the Management API to persist the assignment on the Auth0 user
 *     so subsequent logins already have roles on event.authorization.
 *
 * Claims:
 *   https://3fffs.app/roles   — array of role name strings
 *   https://3fffs.app/email   — normalized (lowercased) email
 *   Set on BOTH the access token and the id token.
 *
 * Secrets required in Auth0 Actions vault:
 *   AUTH0_DOMAIN                — same as VITE_AUTH0_DOMAIN (e.g. 3fffs-training.us.auth0.com)
 *   AUTH0_MGMT_CLIENT_ID        — M2M client with Management API grants
 *   AUTH0_MGMT_CLIENT_SECRET    — its secret
 *   API_BASE_URL                — e.g. https://server-production-7882.up.railway.app
 *   INVITE_CHECK_SECRET         — same value as the INVITE_CHECK_SECRET env on the Railway server
 *
 * Dependencies to add in the Action (top-right panel):
 *   auth0  (already present for ManagementClient)
 */

const ALLOWED_DOMAINS = [
  'barita.com',
  'jncb.com',
  'jm.scotiabank.com',
  'cibccaribbean.com',
];

const DEFAULT_ROLE = 'trainee';
const NAMESPACE = 'https://3fffs.app';

exports.onExecutePostLogin = async (event, api) => {
  const email = (event.user.email || '').toLowerCase().trim();
  const domain = email.split('@')[1];

  // ---------------------------------------------------------------
  // 1. Access decision — domain allowlist first, invite check next
  // ---------------------------------------------------------------
  let inviteRoles = null; // non-null if user was admitted via invite

  if (!ALLOWED_DOMAINS.includes(domain)) {
    // Try the invite bypass. Only call out if the server is configured;
    // otherwise fail closed with the original rejection.
    const apiBase = event.secrets.API_BASE_URL;
    const secret = event.secrets.INVITE_CHECK_SECRET;

    if (!apiBase || !secret) {
      api.access.deny(
        `Email domain "${domain}" is not authorized. Contact your administrator.`
      );
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/api/auth/check-invite`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-invite-secret': secret,
        },
        body: JSON.stringify({ email }),
      });

      if (!resp.ok) {
        console.log(`[invite-check] non-OK status ${resp.status} for ${email}`);
        api.access.deny(
          `Email domain "${domain}" is not authorized. Contact your administrator.`
        );
        return;
      }

      const data = await resp.json();
      if (!data.allowed) {
        console.log(`[invite-check] ${email} denied: ${data.reason}`);
        const msg = data.reason === 'expired'
          ? 'Your invitation has expired. Contact your administrator.'
          : data.reason === 'revoked'
          ? 'Your invitation has been revoked. Contact your administrator.'
          : `Email domain "${domain}" is not authorized. Contact your administrator.`;
        api.access.deny(msg);
        return;
      }

      inviteRoles = Array.isArray(data.roles) && data.roles.length > 0
        ? data.roles
        : [DEFAULT_ROLE];
      console.log(`[invite-check] ${email} admitted via invite with roles: ${inviteRoles.join(', ')}`);
    } catch (err) {
      console.log(`[invite-check] error calling ${apiBase}: ${err.message}`);
      api.access.deny(
        `Email domain "${domain}" is not authorized. Contact your administrator.`
      );
      return;
    }
  }

  // ---------------------------------------------------------------
  // 2. First-login role assignment (Management API)
  // ---------------------------------------------------------------
  const hasAnyRole = (event.authorization?.roles || []).length > 0;
  const isFirstLogin = event.stats?.logins_count === 1;
  const rolesToAssign = inviteRoles || [DEFAULT_ROLE];

  if (isFirstLogin && !hasAnyRole) {
    try {
      const ManagementClient = require('auth0').ManagementClient;
      const management = new ManagementClient({
        domain: event.secrets.AUTH0_DOMAIN,
        clientId: event.secrets.AUTH0_MGMT_CLIENT_ID,
        clientSecret: event.secrets.AUTH0_MGMT_CLIENT_SECRET,
      });

      // Resolve each role name to an Auth0 role id, then assign all at once.
      const roleIds = [];
      for (const roleName of rolesToAssign) {
        const found = await management.roles.getAll({ name_filter: roleName });
        const id = found.data?.[0]?.id;
        if (id) roleIds.push(id);
        else console.log(`[role-assign] Auth0 role "${roleName}" not found`);
      }
      if (roleIds.length > 0) {
        await management.users.assignRoles(
          { id: event.user.user_id },
          { roles: roleIds }
        );
      }
    } catch (err) {
      console.log('[role-assign] failed:', err.message);
    }
  }

  // ---------------------------------------------------------------
  // 3. Shape role claim for the access/id tokens
  // ---------------------------------------------------------------
  // event.authorization.roles is [{id, name}, ...]; map to name strings.
  // Defensively handle already-stringified entries from other Actions.
  const roleObjects = event.authorization?.roles || [];
  const roleNames = roleObjects.map(r =>
    typeof r === 'string' ? r : (r.name || r)
  );

  // Management API assignment in step 2 may not be reflected in
  // event.authorization on this same request. Fall back to rolesToAssign
  // on first login so the very first token carries a role claim.
  const roles = roleNames.length > 0
    ? roleNames
    : (isFirstLogin ? rolesToAssign : []);

  api.accessToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.accessToken.setCustomClaim(`${NAMESPACE}/email`, email);
  api.idToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.idToken.setCustomClaim(`${NAMESPACE}/email`, email);
};
