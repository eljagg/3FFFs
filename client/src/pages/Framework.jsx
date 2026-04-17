import { useEffect, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

export default function Framework() {
  const [tactics, setTactics]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const [query, setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState(null)

  useEffect(() => {
    api.getTactics()
      .then((d) => setTactics(d.tactics))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return }
    const t = setTimeout(() => {
      api.search(query).then((d) => setSearchResults(d.results)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const styles = {
    search: {
      width: '100%', maxWidth: 520,
      padding: '12px 16px',
      fontSize: 14.5,
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
      padding: '4px 0',
      marginBottom: 28,
      maxWidth: 520,
    },
    resultItem: {
      padding: '12px 18px',
      borderTop: '1px solid var(--rule)',
    },
    resultKind: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--accent)',
      marginBottom: 2,
    },
    resultLabel: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginBottom: 2 },
    resultSnippet: { fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 },

    tacticList: { display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
    tacticRow: {
      background: 'var(--paper-hi)',
      padding: '22px 28px',
      cursor: 'pointer',
      transition: 'background var(--dur) ease',
      width: '100%',
      textAlign: 'left',
      border: 'none',
    },
    tacticTop: { display: 'flex', alignItems: 'center', gap: 20 },
    tacticNum: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11, color: 'var(--ink-faint)',
      letterSpacing: '0.1em',
      minWidth: 48,
    },
    tacticTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: 22, fontWeight: 500,
      letterSpacing: '-0.015em',
      flex: 1,
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
      paddingTop: 16, paddingLeft: 68, paddingRight: 40, paddingBottom: 8,
    },
    summary: { fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 16, maxWidth: 720 },
    takeaway: {
      padding: '14px 20px',
      background: 'var(--paper)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 2,
      marginBottom: 20,
      maxWidth: 720,
    },
    takeawayLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--accent)',
      marginBottom: 6,
    },
    takeawayText: { fontSize: 14, lineHeight: 1.55 },

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
    techId: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginBottom: 4, letterSpacing: '0.06em' },
    techName: { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, marginBottom: 6 },
    techDesc: { fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 },
  }

  if (loading) return <Page><div style={{ padding: 40, color: 'var(--ink-faint)' }}>Loading framework…</div></Page>
  if (error)   return <Page eyebrow="Error" title="Could not load framework" lede={error} />

  return (
    <Page
      eyebrow="Encyclopedia"
      title="The MITRE F3 framework."
      lede="Seven tactics covering the full fraud lifecycle, with 22 observable techniques drawn from real-world incidents. Positioning and Monetization are unique to F3 — they don't exist in ATT&CK."
    >
      <input
        type="search"
        placeholder="Search tactics, techniques, scenarios..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.search}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ink)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--rule-strong)' }}
      />

      {searchResults !== null && (
        <div style={styles.resultsBox}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '14px 18px', color: 'var(--ink-faint)', fontSize: 13 }}>
              No results for "{query}"
            </div>
          ) : (
            searchResults.map((r) => (
              <div key={r.kind + r.id} style={styles.resultItem}>
                <div style={styles.resultKind}>{r.kind} · {r.id}</div>
                <div style={styles.resultLabel}>{r.label}</div>
                <div style={styles.resultSnippet}>{r.snippet}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={styles.tacticList}>
        {tactics.map((t) => {
          const open = expanded === t.id
          return (
            <div key={t.id}>
              <button
                onClick={() => setExpanded(open ? null : t.id)}
                style={styles.tacticRow}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
              >
                <div style={styles.tacticTop}>
                  <span style={styles.tacticNum}>T{String(t.order).padStart(2, '0')}</span>
                  <span style={styles.tacticTitle}>{t.name}</span>
                  {t.uniqueToF3 && <span style={styles.tacticBadge}>Unique to F3</span>}
                  <span style={{ ...styles.tacticArrow, transform: open ? 'rotate(90deg)' : 'none' }}>→</span>
                </div>
              </button>
              {open && (
                <div style={{ ...styles.tacticBody, background: 'var(--paper-hi)', animation: 'fadeUp 0.25s ease' }}>
                  <p style={styles.summary}>{t.summary}</p>
                  <div style={styles.takeaway}>
                    <div style={styles.takeawayLabel}>Executive takeaway</div>
                    <div style={styles.takeawayText}>{t.executiveTakeaway}</div>
                  </div>
                  {t.techniques && t.techniques.length > 0 && (
                    <div style={styles.techList}>
                      {t.techniques.map((tech) => (
                        <div key={tech.id} style={styles.tech}>
                          <div style={styles.techId}>{tech.id}</div>
                          <div style={styles.techName}>{tech.name}</div>
                          <div style={styles.techDesc}>{tech.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Page>
  )
}
