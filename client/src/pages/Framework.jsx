import { useEffect, useMemo, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'
import { VisualizationRenderer } from '../components/visualizations/index.js'

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

  // v25.7.0.2 (ISS-023): visualizations attached to the currently expanded
  // tactic. Cached per-tactic in `tacticViz` so re-expanding the same row
  // doesn't re-fetch. The audience filter (which roles see which viz) is
  // handled at the renderer wrapper layer, not here — this fetch returns
  // every viz attached to the entity, role-agnostic.
  const { effectiveRole } = useUser()
  const [tacticViz, setTacticViz] = useState({})

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

  // v25.7.0.2 (ISS-023): when a tactic is expanded, fetch any visualizations
  // attached to it (lazy — only on first expand of each tactic). Stash in
  // `tacticViz[tacticId]` so subsequent expand/collapse reads from cache.
  // Errors are swallowed silently — the page already renders cleanly
  // without visualizations, so a fetch failure is non-fatal.
  useEffect(() => {
    if (!expanded) return
    if (tacticViz[expanded] !== undefined) return  // already fetched (incl. empty)
    api.getVisualizationsFor('Tactic', expanded)
      .then(d => {
        setTacticViz(prev => ({ ...prev, [expanded]: d.visualizations || [] }))
      })
      .catch(() => {
        // Cache an empty array on failure so we don't retry every render.
        setTacticViz(prev => ({ ...prev, [expanded]: [] }))
      })
  }, [expanded, tacticViz])

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
    // v25.7.0.2 (ISS-023): when a tactic has a visible visualization, the
    // body becomes a two-column grid: textual content on the left, viz on
    // the right. When no viz, the body collapses back to single-column
    // (the right column simply isn't rendered) so layouts that pre-date
    // visualizations stay unchanged.
    tacticBodyTwoCol: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
      gap: 32,
      alignItems: 'start',
    },
    tacticBodyTextCol: {
      minWidth: 0,
    },
    tacticBodyVizCol: {
      minWidth: 0,
      // The viz panel sits in a soft container so it reads as a discrete
      // surface separate from the textual content.
      padding: '14px 16px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
    },
    // v25.7.0.4.3: wide visualizations container — FULL-BLEED edge-to-edge.
    // This element renders as a SIBLING of tacticBody (not a child) so the
    // calc(50% - 50vw) math only has to escape the Page wrapper's centered
    // max-width container, not also the tacticBody's nested padding chain.
    // The previous v25.7.0.4.2 attempt rendered this inside tacticBody with
    // overflow:hidden, which clipped the bleed instead of allowing it.
    //
    // The Page wrapper has overflow-x:hidden on its outer container so the
    // 100vw width doesn't trigger horizontal scrollbars on browsers where
    // the viewport math includes scrollbar width.
    tacticBodyWideViz: {
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 'calc(50% - 50vw)',
      marginRight: 'calc(50% - 50vw)',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    },
    // The wide-viz card itself has no outer chrome (no border / radius)
    // because edge-to-edge cards with rounded corners look broken at
    // the viewport edge. The visualization component owns its own
    // container styling.
    wideVizCard: {
      background: 'var(--paper)',
    },
    // The header for a wide viz lives INSIDE the card but is constrained
    // back to the page max-width so titles align with the rest of the
    // page content above. Without this, the title would float at the
    // viewport edge.
    wideVizHeader: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '20px 28px 14px',
      borderBottom: '1px solid var(--rule)',
      marginBottom: 16,
    },
    tacticBodyVizHeader: {
      marginBottom: 12, paddingBottom: 10,
      borderBottom: '1px solid var(--rule)',
    },
    tacticBodyVizTitle: {
      fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
      color: 'var(--ink)',
      marginBottom: 4,
    },
    tacticBodyVizSubtitle: {
      fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5,
    },
    // v25.7.0.2.2 (ISS-023 polish): "interactive content for other roles"
    // affordance card. Appears in the right column when the tactic has
    // viz attached but none target the current role. The OBS-018 four-
    // lens discipline is documented in deploy notes; this is the user-
    // facing manifestation of "no change for this lens" so the user
    // doesn't experience the asymmetry as a missed deploy.
    tacticBodyOtherRoleCard: {
      minWidth: 0,
      padding: '16px 18px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
    },
    otherRoleCardLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--accent)', marginBottom: 12,
    },
    otherRoleCardEntry: {
      paddingTop: 6,
    },
    otherRoleCardTitle: {
      fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500,
      color: 'var(--ink)', marginBottom: 8,
    },
    otherRoleCardBody: {
      fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55,
      marginBottom: 14,
    },
    otherRoleCardChips: {
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
    },
    otherRoleCardChipsLabel: {
      fontFamily: 'var(--font-mono)', fontSize: 10,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--ink-faint)', marginRight: 4,
    },
    otherRoleCardChip: {
      fontFamily: 'var(--font-mono)', fontSize: 11,
      padding: '3px 8px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule-strong)',
      borderRadius: 3,
      color: 'var(--ink-soft)',
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
      // v25.7.0.4.3: compact dense grid — more columns, less per-card
      // height. Description hidden by default (visible on hover via the
      // title attribute). Reduces vertical scrolling significantly:
      // 25 techniques in ~5 rows instead of ~13.
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: 8,
      maxWidth: 'none',
    },
    tech: {
      // v25.7.0.4.3: compact card — minimal padding, two-line content
      // (ID on first line, name on second), no description.
      padding: '8px 12px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      cursor: 'help', // hover reveals description via title attribute
      transition: 'border-color 200ms',
    },
    techId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5, color: 'var(--ink-faint)',
      marginBottom: 2, letterSpacing: '0.06em',
    },
    techName: {
      fontFamily: 'var(--font-body)',
      fontSize: 13, fontWeight: 500, marginBottom: 0,
      lineHeight: 1.3,
      // Clamp very long technique names to 2 lines max
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    // techDesc is no longer rendered in the compact view — description
    // is available on hover via the parent <div title={...}> attribute.
    techDesc: {
      display: 'none',
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

              {open && (() => {
                // v25.7.0.2 (ISS-023): determine whether this tactic has any
                // visualization that the current effective role should see.
                // If yes, switch to two-column layout. If not, fall back to
                // the original single-column body.
                const allVizForTactic = tacticViz[t.id] || []
                const visibleViz = allVizForTactic.filter(v =>
                  !v.roles || v.roles.length === 0 || v.roles.includes(effectiveRole)
                )
                const hasViz = visibleViz.length > 0

                const textBodyLede = (
                  <>
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
                  </>
                )

                const techniquesBlock = (
                  <>
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
                  </>
                )

                // Combined for fallback paths (no viz / hidden viz) that
                // still want the original single-block body structure.
                const textBody = (
                  <>
                    {textBodyLede}
                    {techniquesBlock}
                  </>
                )

                if (!hasViz) {
                  // v25.7.0.2.2: when a tactic has visualizations attached
                  // but NONE target the current role, render a small
                  // affordance card on the right. This makes the OBS-018
                  // four-lens asymmetry legible to the user (otherwise
                  // tellers viewing TA0043 see exactly what they saw
                  // pre-spike, with no signal that anything changed).
                  const hiddenViz = allVizForTactic.filter(v =>
                    v.roles && v.roles.length > 0 && !v.roles.includes(effectiveRole)
                  )

                  if (hiddenViz.length === 0) {
                    // No viz attached at all — original single-column layout
                    return (
                      <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', animation: 'fadeUp 0.25s ease' }}>
                        {textBody}
                      </div>
                    )
                  }

                  // Viz exists for OTHER roles — show affordance on right
                  return (
                    <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', animation: 'fadeUp 0.25s ease' }}>
                      <div style={styles.tacticBodyTwoCol}>
                        <div style={styles.tacticBodyTextCol}>
                          {textBody}
                        </div>
                        <div style={styles.tacticBodyOtherRoleCard}>
                          <div style={styles.otherRoleCardLabel}>
                            Interactive content for other roles
                          </div>
                          {hiddenViz.map(v => (
                            <div key={v.id} style={styles.otherRoleCardEntry}>
                              <div style={styles.otherRoleCardTitle}>{v.title}</div>
                              <div style={styles.otherRoleCardBody}>
                                This tactic has interactive content tuned for other roles.
                                A version tuned for your role is on the v25.7.1 backlog —
                                until then, the technique cards on the left cover the
                                reference content.
                              </div>
                              <div style={styles.otherRoleCardChips}>
                                <span style={styles.otherRoleCardChipsLabel}>Available for:</span>
                                {(v.roles || []).map(r => (
                                  <span key={r} style={styles.otherRoleCardChip}>
                                    {r === 'soc' ? 'SOC' : r.charAt(0).toUpperCase() + r.slice(1)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }

                // v25.7.0.4.1: split visualizations into "compact" (fit in
                // the right-column viz panel) and "wide" (need full body
                // width because they contain their own internal multi-column
                // layout). Two Views in particular has a banking-dashboard
                // / threat-panel split inside it that doesn't survive being
                // squeezed into half a page. Compact viz render in the
                // right column as before; wide ones render full-width below
                // the two-column body.
                const WIDE_VIZ_KINDS = new Set(['two_views'])
                const compactViz = visibleViz.filter(v => !WIDE_VIZ_KINDS.has(v.kind))
                const wideViz    = visibleViz.filter(v =>  WIDE_VIZ_KINDS.has(v.kind))

                // v25.7.0.4.3: ordered sections with proper full-bleed
                //   1. Two-column inside tacticBody: lede+takeaway (left) | compact viz (right)
                //   2. Wide viz — SIBLING of tacticBody, escapes the
                //      tacticBody padding so calc(50% - 50vw) only has to
                //      escape the page wrapper's max-width centering
                //   3. Techniques — back inside tacticBody for normal padding
                const hasCompact = compactViz.length > 0
                return (
                  <>
                    <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', animation: 'fadeUp 0.25s ease' }}>
                      {hasCompact ? (
                        <div style={styles.tacticBodyTwoCol}>
                          <div style={styles.tacticBodyTextCol}>
                            {textBodyLede}
                          </div>
                          <div style={styles.tacticBodyVizCol}>
                            {compactViz.map(viz => (
                              <div key={viz.id}>
                                <div style={styles.tacticBodyVizHeader}>
                                  <div style={styles.tacticBodyVizTitle}>{viz.title}</div>
                                  {viz.subtitle && (
                                    <div style={styles.tacticBodyVizSubtitle}>{viz.subtitle}</div>
                                  )}
                                </div>
                                <VisualizationRenderer viz={viz} effectiveRole={effectiveRole} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>{textBodyLede}</div>
                      )}
                    </div>

                    {/* Wide viz — sibling of tacticBody so it can break out
                        cleanly to viewport edges. Background extends to
                        viewport edges via the bleed. */}
                    {wideViz.length > 0 && (
                      <div style={styles.tacticBodyWideViz}>
                        {wideViz.map(viz => (
                          <div key={viz.id} style={styles.wideVizCard}>
                            <div style={styles.wideVizHeader}>
                              <div style={styles.tacticBodyVizTitle}>{viz.title}</div>
                              {viz.subtitle && (
                                <div style={styles.tacticBodyVizSubtitle}>{viz.subtitle}</div>
                              )}
                            </div>
                            <VisualizationRenderer viz={viz} effectiveRole={effectiveRole} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Techniques after wide viz — back inside tacticBody
                        for consistent left padding with the rest of page. */}
                    <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', paddingTop: 24 }}>
                      {techniquesBlock}
                    </div>
                  </>
                )
              })()}
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
