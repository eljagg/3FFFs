import { useEffect, useMemo, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

/* ─────────────────────────────────────────────────────────────────────────
   Executive takeaways — one per F3 tactic, keyed by the real F3 tactic ID.

   These are hand-authored interpretations of what a banker should internalise
   about each tactic, not MITRE's own description (which lives in the graph
   as tactic.description and is rendered separately above this block).

   Writing tone: 2-3 sentences, operational framing, specific enough to be
   useful but short enough to read during a coffee break.

   Kept in the client rather than stored on the Tactic node because (a) these
   are product editorial, not framework data, and (b) they're easier to edit
   and redeploy this way than via a migration.
   ───────────────────────────────────────────────────────────────────────── */
const EXECUTIVE_TAKEAWAYS = {
  TA0043: "Attackers don't pick victims at random. Every major fraud case starts with intelligence gathering — LinkedIn profiles, obituaries, public filings, data-broker records. Your earliest defensive opportunity is reducing the signal you give off: domain monitoring, DLP on executive email, social-media hygiene for high-net-worth customers.",

  TA0042: "Before the attacker touches your customers, they build their kit — lookalike domains, spoofed SMS gateways, purchased credential bundles, forged identity documents. Monitoring this infrastructure phase is often the cheapest and earliest defensive win. Lookalike-domain surveillance alone has prevented more phishing campaigns than any number of customer-awareness emails.",

  TA0001: "The first interaction with a compromised asset — a phished credential, a social-engineered SIM swap, a replayed session cookie. Most of the last decade's banking fraud architecture was designed for this phase: MFA, device binding, step-up auth. The lesson: defences that were state-of-the-art five years ago (SMS OTP) are now the weakest link.",

  TA0005: "Modern attackers don't just succeed — they succeed quietly. They clear alert emails, spoof device fingerprints, intercept SMS OTPs, bypass 3DS. Treating alerts as reliable signal fails when the attacker's goal is to make their activity look legitimate. Defence-in-depth matters more here than any single control.",

  FA0001: "The tactic MITRE added specifically to distinguish F3 from ATT&CK. Positioning is the patient, legitimate-looking activity inside a compromised environment that sets up later execution — adding a notification address, changing e-delivery preferences, cultivating a victim in a romance scam. Detection depends on monitoring changes to account metadata that precede transactions, not the transactions themselves.",

  TA0002: "The fraudulent transaction itself. Most transaction-monitoring rules are tuned for this phase, but by the time Execution fires the attacker already has momentum and the earlier phases have succeeded. Velocity limits, out-of-band verification, and step-up auth on anomalous patterns are the practical controls — mass-market rules alone will be beaten.",

  FA0002: "The second F3-unique tactic. Monetization is the cashout — converting proceeds into spendable form through mule networks, structuring, cryptocurrency, physical withdrawal, or luxury-goods resale. Recovery rates drop sharply once this stage starts; minutes of delay translate into permanent loss. This is also the phase where industry-level intelligence sharing (interbank coordination, FATF/Egmont) pays off most.",
}

export default function Framework() {
  const [tactics, setTactics]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [expanded, setExpanded]           = useState(null)
  const [query, setQuery]                 = useState('')
  const [searchResults, setSearchResults] = useState(null)

  useEffect(() => {
    api.getTactics()
      .then((d) => setTactics(d.tactics || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return }
    const t = setTimeout(() => {
      api.searchFramework(query)
        .then((d) => setSearchResults(d.results))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // Dynamic count from data, not hardcoded. The previous lede said "22
  // observable techniques" — a legacy placeholder that was off by ~100
  // once the full F3 Excel was seeded.
  const totalTechniques = useMemo(
    () => tactics.reduce((sum, t) => sum + (t.techCount || 0), 0),
    [tactics]
  )

  const styles = {
    search: {
      width: '100%', maxWidth: 520,
      padding: '12px 16px', fontSize: 14.5,
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule-strong)',
      borderRadius: 'var(--radius)',
      marginBottom: 28,
      fontFamily: 'var(--font-body)',
      outline: 'none',
    },
    resultsBox: {
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      padding: '4px 0', marginBottom: 28, maxWidth: 520,
    },
    resultItem: { padding: '12px 18px', borderTop: '1px solid var(--rule)' },
    resultKind: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--accent)', marginBottom: 2,
    },
    resultLabel: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginBottom: 2 },
    resultSnippet: { fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 },

    tacticList: {
      display: 'flex', flexDirection: 'column', gap: 1,
      background: 'var(--rule)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    },
    tacticRow: {
      background: 'var(--paper-hi)',
      padding: '22px 28px',
      cursor: 'pointer',
      transition: 'background var(--dur) ease',
      width: '100%', textAlign: 'left', border: 'none',
    },
    tacticTop: { display: 'flex', alignItems: 'center', gap: 20 },
    tacticNum: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11, color: 'var(--ink-faint)',
      letterSpacing: '0.08em',
      // Real F3 IDs are 6 chars ("TA0043", "FA0001") — wider than the
      // synthetic T01-T07 that lived here before. Bumping minWidth 48→64
      // keeps the row alignment consistent.
      minWidth: 64,
    },
    tacticTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: 22, fontWeight: 500,
      letterSpacing: '-0.015em', flex: 1,
    },
    tacticBadge: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '2px 8px',
      background: 'var(--accent)', color: 'var(--paper)',
      borderRadius: 3,
    },
    tacticArrow: {
      fontFamily: 'var(--font-mono)', fontSize: 14,
      color: 'var(--ink-faint)',
      transition: 'transform var(--dur) ease',
    },
    tacticBody: {
      paddingTop: 16, paddingLeft: 84, paddingRight: 40, paddingBottom: 8,
    },
    description: {
      fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6,
      marginBottom: 16, maxWidth: 720,
    },
    takeaway: {
      padding: '14px 20px',
      background: 'var(--paper)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 2,
      marginBottom: 20, maxWidth: 720,
    },
    takeawayLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--accent)', marginBottom: 6,
    },
    takeawayText: { fontSize: 14, lineHeight: 1.55 },
    techSectionLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--ink-faint)', marginBottom: 10,
    },

    techList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 10,
      maxWidth: 900,
    },
    tech: {
      padding: '14px 18px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
    },
    techId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, color: 'var(--ink-faint)',
      marginBottom: 4, letterSpacing: '0.06em',
    },
    techName: {
      fontFamily: 'var(--font-display)',
      fontSize: 15, fontWeight: 500, marginBottom: 6,
    },
    techDesc: {
      fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5,
      // Clamp long technique descriptions so the grid stays scannable —
      // the full text is visible on hover via the title attribute, and
      // will appear on a future per-technique detail view.
      display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    emptyTech: {
      fontSize: 13, color: 'var(--ink-faint)',
      fontStyle: 'italic', padding: '12px 0',
    },
  }

  if (loading) return <Page><div style={{ padding: 40, color: 'var(--ink-faint)' }}>Loading framework…</div></Page>
  if (error)   return <Page eyebrow="Error" title="Could not load framework" lede={error} />

  const uniqueCount = tactics.filter(t => t.uniqueToF3).length

  return (
    <Page
      eyebrow="Encyclopedia"
      title="The MITRE F3 framework."
      lede={`Seven tactics covering the full fraud lifecycle, with ${totalTechniques || 'many'} techniques and sub-techniques drawn from real-world incidents. Positioning and Monetization are unique to F3 — they don't exist in ATT&CK.`}
    >
      <input
        type="search"
        placeholder="Search tactics, techniques, scenarios..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.search}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ink)' }}
        onBlur={(e)  => { e.target.style.borderColor = 'var(--rule-strong)' }}
      />

      {searchResults !== null && (
        <div style={styles.resultsBox}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '14px 18px', color: 'var(--ink-faint)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          ) : (
            searchResults.map((r) => (
              <div key={(r.kind || 'tech') + r.id} style={styles.resultItem}>
                <div style={styles.resultKind}>{r.kind || 'Technique'} · {r.id}</div>
                <div style={styles.resultLabel}>{r.label || r.name}</div>
                <div style={styles.resultSnippet}>
                  {(r.snippet || r.description || '').slice(0, 180)}
                  {((r.snippet || r.description || '').length > 180) && '…'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={styles.tacticList}>
        {tactics.map((t) => {
          const open = expanded === t.id
          const takeaway = EXECUTIVE_TAKEAWAYS[t.id]
          return (
            <div key={t.id}>
              <button
                onClick={() => setExpanded(open ? null : t.id)}
                style={styles.tacticRow}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
              >
                <div style={styles.tacticTop}>
                  {/* Real F3 tactic ID (TA0043, FA0001 …) — previously
                      showed synthetic T01-T07 which was misleading for a
                      framework-training app. */}
                  <span style={styles.tacticNum}>{t.id}</span>
                  <span style={styles.tacticTitle}>{t.name}</span>
                  {t.uniqueToF3 && <span style={styles.tacticBadge}>Unique to F3</span>}
                  <span style={{ ...styles.tacticArrow, transform: open ? 'rotate(90deg)' : 'none' }}>→</span>
                </div>
              </button>

              {open && (
                <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', animation: 'fadeUp 0.25s ease' }}>
                  {/* MITRE's own description — pulled from the F3 Excel */}
                  {t.description && (
                    <p style={styles.description}>{t.description}</p>
                  )}

                  {/* Hand-authored banker-focused interpretation */}
                  {takeaway && (
                    <div style={styles.takeaway}>
                      <div style={styles.takeawayLabel}>Executive takeaway</div>
                      <div style={styles.takeawayText}>{takeaway}</div>
                    </div>
                  )}

                  {/* All techniques in this tactic */}
                  {Array.isArray(t.techniques) && t.techniques.length > 0 ? (
                    <>
                      <div style={styles.techSectionLabel}>
                        {t.techniques.length} {t.techniques.length === 1 ? 'technique' : 'techniques'} and sub-techniques
                      </div>
                      <div style={styles.techList}>
                        {t.techniques.map((tech) => (
                          <div
                            key={tech.id}
                            style={styles.tech}
                            title={tech.description}
                          >
                            <div style={styles.techId}>{tech.id}</div>
                            <div style={styles.techName}>{tech.name}</div>
                            {tech.description && (
                              <div style={styles.techDesc}>{tech.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={styles.emptyTech}>
                      No techniques currently indexed under this tactic.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tactics.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
          borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
        }}>
          No tactics returned by the server. If this persists, check the
          Neo4j Tactic nodes via the Debug page.
        </div>
      )}
    </Page>
  )
}
