# v23 Deployment Notes

**Feature:** Admin Users & Invites page — self-service onboarding for
reviewers and partners whose email domain is not on the hardcoded
allowlist.

## What's in this zip

```
server/
  src/
    routes/
      admin.js              ← NEW   /api/admin/users + /api/admin/invites CRUD
      auth-check.js         ← NEW   /api/auth/check-invite (public, shared secret)
    seed/
      add-admin-schema.js   ← NEW   Neo4j Invite uniqueness constraints
    index.js                ← UPDATED — mounts new routers

client/
  src/
    pages/
      AdminUsers.jsx        ← NEW   Admin UI with Users + Invites tabs
    lib/
      api.js                ← UPDATED — admin methods
    components/
      AppShell.jsx          ← UPDATED — Admin nav link (admin role only)
    App.jsx                 ← UPDATED — /admin/users route

auth0/
  post-login-action.js      ← UPDATED — invite-bypass branch before domain deny
  README.md                 ← UPDATED — new secrets + admin workflow docs
```

## Deploy steps, in order

### 1. Unpack and push (per convention)

```bash
cd /workspaces/3FFFs
unzip -o 3fffs-v23.zip
rm 3fffs-v23.zip
git add -A
git status            # ← confirm NO zip file and no stray files
git commit -m "v23: admin users & invites page (self-service onboarding)"
git push origin main
```

Railway picks up the push and auto-deploys client + server.

### 2. Generate and set the shared secret

Pick one secret and paste it in two places.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

- **Railway** → server service → Variables → add `INVITE_CHECK_SECRET = <paste>`
- **Auth0** → Actions → Library → *Domain Allowlist and Default Role* → right panel
  → Secrets → add `INVITE_CHECK_SECRET = <same value>`

### 3. Add API_BASE_URL secret in Auth0

Same Action → Secrets → add:

- `API_BASE_URL = https://server-production-7882.up.railway.app`

(No trailing slash. Double-check by hitting `<API_BASE_URL>/health` in a browser — should return `{"ok":true,"neo4j":true}`.)

### 4. Replace the Action code and deploy

Auth0 → Actions → Library → *Domain Allowlist and Default Role* → editor →
Ctrl+A → paste in the contents of `auth0/post-login-action.js` → **Deploy**.

### 5. Run the schema migration once

After Railway finishes deploying the server, open the Railway shell for the
server service (or run locally with production Neo4j credentials) and:

```bash
cd server
node src/seed/add-admin-schema.js
```

Expected output includes `✅  Constraint created (or already existed): invite_email_unique`
and `invite_id_unique`. Safe to re-run — idempotent via `IF NOT EXISTS`.

### 6. Verify end-to-end

1. Log in as admin → you should see a new **Admin** link in the top nav.
2. Click **Admin** → Users tab shows the current user list with progress.
3. Invites tab → click **Invite user** → enter the reviewer's personal
   email (gmail / outlook / etc.) → pick roles → choose expiration →
   click **Create invite**.
4. The signup URL (your client URL) is auto-copied to your clipboard.
5. Send that URL + the invited email address to the reviewer.
6. They visit the URL, sign up with the invited email, log in.
7. Confirm they land on the app; confirm the invite row in the Invites
   tab now shows `Active · in use` and `Uses: 1`.

## Rollback

If the deploy misbehaves, revert the merge commit and redeploy. The
schema migration is benign to leave in place even after a rollback — the
unused `:Invite` constraints don't affect anything else.

If you only want to disable the invite path without reverting code, just
remove `INVITE_CHECK_SECRET` from the Auth0 Action secrets. The Action
will fail closed (back to pure domain-allowlist behavior) and the admin
UI will still load but any attempted invite login will be denied.

## Security notes worth the 30 seconds to read

- `/api/auth/check-invite` is public (no JWT) but requires the shared
  secret. Constant-time comparison defends against timing attacks.
- Invites are upserted by email, not by id. Re-inviting the same email
  updates the existing row (un-revokes, refreshes expiry, swaps roles).
- Invites stay valid for the whole `expiresAt` window — they are *not*
  consumed on first use. This is intentional: reviewers can log out and
  back in without you re-issuing. To end access, revoke the invite.
- Role changes on existing users still happen in the Auth0 dashboard
  (Users → select user → Roles tab). The `:User.roles` value in Neo4j is
  overwritten from the token on every login, so the dashboard is the
  only correct source of truth for existing-user role edits.
