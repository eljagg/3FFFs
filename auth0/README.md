# Auth0 Actions — source of truth

This folder holds the source code for Auth0 Actions attached to the 3fffs tenant.

**These files are NOT automatically deployed.** Auth0 Actions live inside Auth0's own
dashboard (manage.auth0.com → Actions → Library). Keeping the code here lets us:

- Version-control it alongside the rest of the app
- Review changes in PRs
- Restore it if the Auth0 copy ever gets lost

## Deployment process

When a file in this folder changes:

1. Open [manage.auth0.com](https://manage.auth0.com)
2. Actions → Library → click the matching action
3. Select all code in the editor (Ctrl+A) and replace with the updated file contents
4. Click **Deploy** in Auth0
5. Users must sign out and back in for new tokens to pick up the change

## Files

- `post-login-action.js` — the "Domain Allowlist and Default Role" action,
  attached to the Post-Login flow. Enforces the domain allowlist, falls back
  to a per-email invite check for reviewers / external staff, auto-assigns
  the correct role on first login, and writes role claims into the access
  and ID tokens.

## Action secrets

Open the action in Auth0, click **Secrets** in the left rail, and confirm the
following entries exist. Any missing secret causes the corresponding feature
to be skipped at runtime (the action fails safe — no access is granted by
accident).

| Secret | Purpose |
| --- | --- |
| `AUTH0_DOMAIN` | Your Auth0 tenant domain, e.g. `3fffs-training.us.auth0.com`. Used by the Management API client. |
| `AUTH0_MGMT_CLIENT_ID` | Client ID of the M2M app authorized to call the Management API (role read + assign). |
| `AUTH0_MGMT_CLIENT_SECRET` | Client secret for the same M2M app. |
| `API_BASE_URL` | **(v23)** Fully qualified base URL of the 3fffs server, e.g. `https://server-production-7882.up.railway.app`. The action calls `${API_BASE_URL}/api/auth/check-invite`. No trailing slash required — the action strips one if present. |
| `INVITE_CHECK_SECRET` | **(v23)** 32-byte random shared secret. MUST match the `INVITE_CHECK_SECRET` Railway env var on the server. Sent as the `X-Invite-Secret` header on every invite lookup. |

### Generating `INVITE_CHECK_SECRET`

On any machine with Node or OpenSSL installed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# or
openssl rand -base64 32
```

Paste the output into **both** places:

1. Auth0 → Actions → your action → Secrets → `INVITE_CHECK_SECRET`
2. Railway → `server` service → Variables → `INVITE_CHECK_SECRET`

Rotate by generating a new value, updating Railway first (server accepts
new secret), then Auth0 (action sends new secret). Any live sessions that
were already issued tokens are unaffected; only pending invites use the
secret.

## Runtime

The action runs on Auth0's Node 18+ runtime. It uses the global `fetch` for
the invite-check call with a 5-second `AbortController` timeout so the login
flow never hangs if the server is unreachable.
