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
  attached to the Post-Login flow. Rejects non-allowlisted domains, auto-assigns
  the `trainee` role on first login, and writes role claims into the access+id tokens.
