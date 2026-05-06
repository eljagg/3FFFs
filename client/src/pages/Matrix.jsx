import { useEffect, useState, useMemo } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

export default function Matrix() {
  const [tactics, setTactics]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    Promise.all([api.getTactics(), api.getTechniques()])
      .then(([tRes, techRes]) => {
        const byTactic = {}
        tRes.tactics.forEach(t => { byTactic[t.id] = { ...t, techniques: [] } })
        techRes.techniques.forEach(tech => {
          const tacticId = tech.tacticId
          if (byTactic[tacticId]) byTactic[tacticId].techniques.push(tech)
        })
        Object.values(byTactic).forEach(t => {
          t.techniques.sort((a, b) => a.name.localeCompare(b.name))
        })
        setTactics(Object.values(byTactic).sort((a, b) => a.order - b.order))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return tactics
    const q = search.toLowerCase()
    return tactics.map(t => ({
      ...t,
      techniques: t.techniques.filter(tech =>
        tech.name.toLowerCase().includes(q) ||
        tech.id.toLowerCase().includes(q) ||
        (tech.description || '').toLowerCase().includes(q)
      ),
    }))
  }, [tactics, search])

  const matchCount = useMemo(() => filtered.reduce((sum, t) => sum + t.techniques.length, 0), [filtered])

  const s = {
    toolbar: {
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      marginBottom: 24,
      flexWrap: 'wrap',
    },
    search: {
      flex: 1,
      minWidth: 240,
      maxWidth: 400,
      padding: '10px 14px',
      fontSize: 14,
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule-strong)',
      borderRadius: 'var(--radius)',
      outline: 'none',
    },
    counter: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--ink-faint)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: `repeat(${tactics.length}, minmax(150px, 1fr))`,
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 8,
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 150,
    },
    colHeader: (uniqueToF3) => ({
      padding: '10px 12px 12px',
      background: uniqueToF3 ? 'var(--accent)' : 'var(--ink)',
      color: uniqueToF3 ? '#fff' : 'var(--paper-hi)',
      borderRadius: 'var(--radius)',
      marginBottom: 4,
      textAlign: 'left',
    }),
    colHeaderName: {
      fontFamily: 'var(--font-display)',
      fontSize: 15,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    colHeaderId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.1em',
      opacity: 0.7,
      marginTop: 2,
    },
    colCount: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      opacity: 0.7,
      marginTop: 6,
    },
    uniqueBadge: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.1em',
      marginTop: 4,
      padding: '2px 6px',
      background: 'rgba(255,255,255,0.2)',
      borderRadius: 3,
      display: 'inline-block',
    },
    cell: (isSelected, isSub) => ({
      padding: isSub ? '6px 10px 6px 18px' : '8px 10px',
      fontSize: 12,
      lineHeight: 1.35,
      background: isSelected ? 'var(--accent)' : 'var(--paper-hi)',
      color: isSelected ? '#fff' : 'var(--ink)',
      border: '1px solid',
      borderColor: isSelected ? 'var(--accent)' : 'var(--rule)',
      borderRadius: 4,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all var(--dur) ease',
      position: 'relative',
    }),
    cellId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.03em',
      opacity: 0.6,
      marginBottom: 2,
    },
    cellName: {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.3,
    },

    detail: {
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 'min(440px, 92vw)',
      background: 'var(--paper-hi)',
      borderLeft: '1px solid var(--rule-strong)',
      boxShadow: '-12px 0 40px rgba(0,0,0,0.15)',
      padding: '28px 32px',
      overflowY: 'auto',
      zIndex: 100,
      animation: 'slideIn 0.3s ease',
    },
    detailClose: {
      position: 'absolute',
      top: 18, right: 18,
      width: 32, height: 32,
      borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-faint)',
      fontSize: 20, lineHeight: 1,
      border: '1px solid var(--rule)',
    },
    detailEyebrow: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      marginBottom: 8,
    },
    detailId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--ink-faint)',
      marginBottom: 6,
      letterSpacing: '0.03em',
    },
    detailName: {
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      fontWeight: 500,
      lineHeight: 1.15,
      letterSpacing: '-0.015em',
      marginBottom: 20,
    },
    detailLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
      marginBottom: 8,
      marginTop: 20,
    },
    detailText: {
      fontSize: 14,
      color: 'var(--ink-soft)',
      lineHeight: 1.65,
    },
    detailTactic: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 'var(--radius)',
      background: 'var(--ink)',
      color: 'var(--paper)',
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em',
    },
    tacticUnique: {
      background: 'var(--accent)',
    },
    empty: {
      padding: '40px 20px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
    },
  }

  if (loading) return <Page><div style={s.empty}>Loading F3 matrix…</div></Page>
  if (error)   return <Page eyebrow="Error" title="Could not load matrix" lede={error} />

  const isSubTech = (id) => id.includes('.')

  return (
    <>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <Page
        wide
        eyebrow="F3 Matrix"
        title="The full framework at a glance."
        lede="All 7 F3 tactics and 126 techniques, loaded from MITRE's authoritative export. Click any cell to explore. Search to filter."
      >
        <div style={s.toolbar}>
          <input
            type="search"
            placeholder="Search by name, ID, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.search}
            onFocus={(e) => { e.target.style.borderColor = 'var(--ink)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--rule-strong)' }}
          />
          <div style={s.counter}>
            {search.trim()
              ? `${matchCount} matches`
              : `${tactics.reduce((n, t) => n + t.techniques.length, 0)} techniques · ${tactics.length} tactics`}
          </div>
        </div>

        <div style={s.grid}>
          {filtered.map((tactic) => (
            <div key={tactic.id} style={s.column}>
              <div style={s.colHeader(tactic.uniqueToF3)}>
                <div style={s.colHeaderName}>{tactic.name}</div>
                <div style={s.colHeaderId}>{tactic.id}</div>
                <div style={s.colCount}>{tactic.techniques.length} techniques</div>
                {tactic.uniqueToF3 && <div style={s.uniqueBadge}>UNIQUE TO F3</div>}
              </div>
              {tactic.techniques.map((tech) => (
                <button
                  key={tactic.id + tech.id}
                  style={s.cell(selected?.id === tech.id && selected?.tacticId === tactic.id, isSubTech(tech.id))}
                  onClick={() => setSelected({ ...tech, tacticId: tactic.id, tacticName: tactic.name, tacticUnique: tactic.uniqueToF3 })}
                  onMouseEnter={(e) => {
                    if (selected?.id !== tech.id) e.currentTarget.style.borderColor = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    if (selected?.id !== tech.id) e.currentTarget.style.borderColor = 'var(--rule)'
                  }}
                >
                  <div style={s.cellId}>{tech.id}</div>
                  <div style={s.cellName}>{tech.name}</div>
                </button>
              ))}
              {tactic.techniques.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: 8, fontStyle: 'italic' }}>
                  No matches
                </div>
              )}
            </div>
          ))}
        </div>
      </Page>

      {selected && (
        <div style={s.detail} onClick={(e) => e.stopPropagation()}>
          <button style={s.detailClose} onClick={() => setSelected(null)} aria-label="Close">×</button>
          <div style={s.detailEyebrow}>F3 Technique</div>
          <div style={s.detailId}>{selected.id}</div>
          <div style={s.detailName}>{selected.name}</div>
          <div style={{ ...s.detailTactic, ...(selected.tacticUnique ? s.tacticUnique : {}) }}>
            {selected.tacticName} · {selected.tacticId}
          </div>
          <div style={s.detailLabel}>Description</div>
          <div style={s.detailText}>{selected.description || 'No description available.'}</div>
        </div>
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 99, animation: 'fadeIn 0.2s ease',
          }}
        />
      )}
    </>
  )
}
