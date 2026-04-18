/**
 * Auth0 Post-Login Action — Domain Allowlist and Default Role
 *
 * 1. Rejects sign-ups from email domains not on the allowlist
 * 2. Auto-assigns the "trainee" role to new users on first login
 * 3. Adds role claims to the access token AND id token so our API
 *    and the client can check them
 *
 * FIX: Extract role names from role objects before setting the claim.
 *      event.authorization.roles returns [{id, name}, ...] not ['name', ...]
 *      so we must .map(r => r.name) before writing the claim.
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

  // Reject if domain not on allowlist
  if (!ALLOWED_DOMAINS.includes(domain)) {
    api.access.deny(
      `Email domain "${domain}" is not authorized. Contact your administrator.`
    );
    return;
  }

  // Assign default role to new users (first login only)
  const hasAnyRole = (event.authorization?.roles || []).length > 0;
  const isFirstLogin = event.stats?.logins_count === 1;

  if (isFirstLogin && !hasAnyRole) {
    try {
      const ManagementClient = require('auth0').ManagementClient;
      const management = new ManagementClient({
        domain: event.secrets.AUTH0_DOMAIN,
        clientId: event.secrets.AUTH0_MGMT_CLIENT_ID,
        clientSecret: event.secrets.AUTH0_MGMT_CLIENT_SECRET,
      });

      const roles = await management.roles.getAll({ name_filter: DEFAULT_ROLE });
      const roleId = roles.data?.[0]?.id;
      if (roleId) {
        await management.users.assignRoles(
          { id: event.user.user_id },
          { roles: [roleId] }
        );
      }
    } catch (err) {
      console.log('Role assignment failed:', err.message);
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
  // (the Management API call above may not have persisted yet in this same request)
  const roles = roleNames.length > 0
    ? roleNames
    : (isFirstLogin ? [DEFAULT_ROLE] : []);

  // Add role claims to both access token and ID token
  api.accessToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.accessToken.setCustomClaim(`${NAMESPACE}/email`, email);
  api.idToken.setCustomClaim(`${NAMESPACE}/roles`, roles);
  api.idToken.setCustomClaim(`${NAMESPACE}/email`, email);
};
