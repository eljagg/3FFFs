/**
 * banks.js — Bank entities (v25.7.0, ISS-019a / ISS-021)
 *
 * Each Bank is a tenant in the v25.7+ multi-tenant model (Pattern A: shared
 * deployment, logical isolation by Bank). Auto-mapped from User.domain
 * (User's email domain) on every authenticated request via syncUser.
 *
 * Theme properties are exposed to the client so future per-bank branding
 * (Pattern A→C transition) reads from the same source. v25.7.0 ships
 * neutral defaults; banks can override their primaryColor / displayName
 * in admin pages later.
 *
 * To add a new bank:
 *   1. Add their email domain(s) to the Auth0 allowlist (existing process)
 *   2. Add an entry here
 *   3. Re-run migrate:banks (idempotent)
 *
 * If a user logs in with a domain not seeded here, their User.bankId is
 * left null (defensive). They get default theme + access only to non-bank-
 * scoped content. Admin can manually assign them later via /admin/users.
 */

export const BANKS = [
  {
    id:           'BANK-BARITA',
    name:         'Barita Investments',
    displayName:  'Barita',
    domains:      ['barita.com'],
    region:       'JM',
    primaryColor: '#0a4f3a',  // green from logo
    accentColor:  '#c9a961',  // gold accent
    logoUrl:      null,       // future: /api/bank/:id/logo
    seededAt:     '2026-04',
  },
  {
    id:           'BANK-JNCB',
    name:         'Jamaica National Commercial Bank',
    displayName:  'JNCB',
    domains:      ['jncb.com'],
    region:       'JM',
    primaryColor: '#003d7a',  // navy
    accentColor:  '#e8a317',
    logoUrl:      null,
    seededAt:     '2026-04',
  },
  {
    id:           'BANK-SCOTIABANK-JM',
    name:         'Scotiabank Jamaica',
    displayName:  'Scotiabank',
    domains:      ['jm.scotiabank.com'],
    region:       'JM',
    primaryColor: '#ec111a',  // Scotia red
    accentColor:  '#231f20',
    logoUrl:      null,
    seededAt:     '2026-04',
  },
  {
    id:           'BANK-CIBC-CARIBBEAN',
    name:         'CIBC Caribbean',
    displayName:  'CIBC Caribbean',
    domains:      ['cibccaribbean.com'],
    region:       'CARIBBEAN',
    primaryColor: '#9b1b30',  // CIBC red
    accentColor:  '#c2c4c6',
    logoUrl:      null,
    seededAt:     '2026-04',
  },
]

/**
 * Lookup a Bank id by an email domain. Returns null if no match.
 * Used by syncUser to auto-map users to their Bank on every request.
 */
export function bankIdForDomain(domain) {
  if (!domain) return null
  const d = String(domain).toLowerCase()
  for (const bank of BANKS) {
    if (bank.domains.includes(d)) return bank.id
  }
  return null
}
