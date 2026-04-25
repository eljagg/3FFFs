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
2. Actions → Library → click the matching action (e.g. **Domain Allowlist and Default Role**)
3. Select all code in the editor (Ctrl+A) and replace with the updated file contents
4. Confirm all required **Secrets** are set on the right-hand panel (see below)
5. Confirm all required **Dependencies** are listed (see below)
6. Click **Deploy** in Auth0
7. Users must sign out and back in for new tokens to pick up the change

## Files

- `post-login-action.js` — the **Domain Allowlist and Default Role** action,
  attached to the Post-Login flow. Handles three things on every login:
  1. **Domain allowlist.** Emails on `barita.com`, `jncb.com`, `jm.scotiabank.com`,
     and `cibccaribbean.com` are admitted directly.
  2. **Invite bypass.** Non-allowlisted domains are checked against the
     3fffs API's `/api/auth/check-invite` endpoint. If the email has an
     active `:Invite` in Neo4j (created via the in-app Admin Users page),
     the invite's roles are used and the login is admitted.
  3. **Role assignment.** On first login, the user's roles are persisted
     on their Auth0 user record via the Management API, and written into
     the access/id token claims at `https://3fffs.app/roles`.

## Required Secrets

Set these in the Auth0 Action editor's **Secrets** panel (padlock icon on the right):

| Secret | Value | Notes |
|---|---|---|
| `AUTH0_DOMAIN` | `3fffs-training.us.auth0.com` | Same as `VITE_AUTH0_DOMAIN`. |
| `AUTH0_MGMT_CLIENT_ID` | M2M client id | From an M2M app authorized for the Auth0 Management API. |
| `AUTH0_MGMT_CLIENT_SECRET` | M2M client secret | Paired with the above. |
| `API_BASE_URL` | e.g. `https://server-production-7882.up.railway.app` | Base URL of the Railway server. **New in v23.** |
| `INVITE_CHECK_SECRET` | random 32+ byte string | Must match the `INVITE_CHECK_SECRET` env var on the Railway server. **New in v23.** |

### Generating `INVITE_CHECK_SECRET`

Any long, random, URL-safe string works. From a terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Paste the same value into:
- Auth0 Actions → Secrets → `INVITE_CHECK_SECRET`
- Railway server service → Variables → `INVITE_CHECK_SECRET`

Rotate it by updating both places at once (server will refuse requests with
the old value as soon as it redeploys).

## Required Dependencies

In the Auth0 Action editor's **Dependencies** panel (cube icon on the right),
confirm `auth0` is listed (used for `ManagementClient`). The invite check uses
the global `fetch` available in Node 18+ runtimes, so no additional dependency
is needed for it.

## What to do when a reviewer or partner needs access

1. Log in to the app as an admin
2. Go to **Admin → Users** in the top nav
3. Switch to the **Invites** tab
4. Click **Invite user**, enter their email + choose roles + expiration
5. Copy the signup URL from the toast and send it to them
6. They visit the link, create an account with the invited email, and the
   post-login action admits them via the invite bypass

No Auth0 Action code change is required — the reviewer workflow is now
self-service from inside the app.
