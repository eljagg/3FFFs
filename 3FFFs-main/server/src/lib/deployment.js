/**
 * deployment.js — multi-tenancy mode shim (v25.7.0, ISS-021)
 *
 * Pattern A (current default): single shared deployment, logical isolation
 *   by Bank. Every authenticated request carries a bankId derived from the
 *   user's MEMBER_OF edge (or null). Bank-scoped endpoints filter by it.
 *
 * Pattern C (future, when a customer demands dedicated deployment): the
 *   ENTIRE deployment is one bank. Set DEPLOYMENT_MODE=dedicated and
 *   DEDICATED_BANK_ID=BANK-XYZ in env. Bank-scoped endpoints will treat
 *   every request as if it came from that bank's user, and the auto-map-
 *   by-domain logic in syncUser becomes a sanity check rather than the
 *   primary binding.
 *
 * Pattern A and Pattern C share 99% of the codebase. The shim is the 1%
 * difference so we don't have to retrofit later. Today it's a stub
 * returning 'shared'; the env-var path is documented but not exercised.
 *
 * Reference: V25.7.0-DEPLOY-NOTES.md "Multi-tenancy strategy" section.
 */

const MODE = (process.env.DEPLOYMENT_MODE || 'shared').toLowerCase()
const DEDICATED_BANK_ID = process.env.DEDICATED_BANK_ID || null

if (MODE === 'dedicated' && !DEDICATED_BANK_ID) {
  console.warn(
    '[deployment] DEPLOYMENT_MODE=dedicated but DEDICATED_BANK_ID not set; ' +
    'falling back to shared mode. Set DEDICATED_BANK_ID=BANK-XXX to enable ' +
    'Pattern C single-tenant deployment.'
  )
}

/**
 * Returns 'shared' (Pattern A) or 'dedicated' (Pattern C). Most code
 * doesn't need to know — bank-scoped queries will read bankId from the
 * user's session edge in either mode. The shim is here for the few
 * places that need to behave differently (admin pages, search scope,
 * cross-bank visibility).
 */
export function getDeploymentMode() {
  if (MODE === 'dedicated' && DEDICATED_BANK_ID) return 'dedicated'
  return 'shared'
}

/**
 * In Pattern C, returns the dedicated bank id (the single tenant). In
 * Pattern A, returns null — bank id comes from the user's session.
 */
export function getDedicatedBankId() {
  return getDeploymentMode() === 'dedicated' ? DEDICATED_BANK_ID : null
}

/**
 * Helper: given the user's session-derived bankId, returns the effective
 * bankId for queries. In dedicated mode, ALWAYS returns the dedicated
 * bank id (defensive: even if a user somehow has a different MEMBER_OF
 * edge, we override). In shared mode, returns the user's actual bank.
 */
export function effectiveBankId(userBankId) {
  if (getDeploymentMode() === 'dedicated') return getDedicatedBankId()
  return userBankId || null
}
