import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   Coverage Heatmap
   -------------------------------------------------------------------------
   Shows the full F3 matrix (126 techniques × 7 tactics) as a heatmap of
   the current user's mastery. This is a graph query composed in Cypher:
   a user node → their completed scenarios → stages → techniques → tactics.

   Each cell has 3 states:
     - mastered  (green)   : user completed a scenario that uses this technique
     - available (amber)   : technique is in at least one scenario the user hasn't done
     - unseen    (gray)    : not in any current scenario

   Hover a cell to see the scenarios that use that technique.
------------------------------------------------------------------------- */

const STATUS_COLORS = {
  mastered:  { bg: 'var(--success)',    fg: '#fff',            label: 'Mastered' },
  available: { bg: 'var(--warning-bg)', fg: 'var(--warning)',  label: 'Available' },
  unseen:    { bg: 'var(--paper-dim)',  fg: 'var(--ink-faint)',label: 'Unseen' },
}

export default function Coverage() {
  const [coverage, setCoverage] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [hover, setHover]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getCoverage()
      .then(r => setCoverage(r.coverage || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const { byTactic, stats } = useMemo(() => {
    const by = {}
    let mastered = 0, available = 0, unseen = 0
    for (const c of coverage) {
      if (!by[c.tacticId]) by[c.tacticId] = { id: c.tacticId, name: c.tacticName, order: c.tacticOrder, uniqueToF3: c.uniqueToF3, techniques: [] }
      by[c.tacticId].techniques.push(c)
      if (c.status === 'mastered') mastered++
      else if (c.status === 'available') available++
      else unseen++
    }
    const sorted = Object.values(by).sort((a, b) => a.order - b.order)
    return {
      byTactic: sorted,
      stats: { mastered, available, unseen, total: coverage.length },
    }
  }, [coverage])

  if (loading) return <Page eyebrow="Coverage" title="Loading your progress map…" />
  if (error)   return <Page eyebrow="Coverage" title="Couldn't load coverage" lede={error} />

  const pct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0

  return (
    <Page
      eyebrow="My Coverage"
      title="Your F3 mastery map."
      lede="Every cell is a technique from the MITRE Fight Fraud Framework. As you complete scenarios, cells turn green."
    >
      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, marginBottom: 28,
        }}
      >
        <StatCard value={`${pct}%`}          label="Framework covered"    color="var(--accent)" />
        <StatCard value={stats.mastered}     label="Techniques mastered"  color="var(--success)" />
        <StatCard value={stats.available}    label="Available in scenarios" color="var(--warning)" />
        <StatCard value={stats.unseen}       label="Not yet in training"  color="var(--ink-faint)" />
      </motion.div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Legend:</span>
        {Object.entries(STATUS_COLORS).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 14, height: 14, background: v.bg, borderRadius: 3, border: '1px solid var(--rule)' }} />
            <span style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
          </span>
        ))}
      </div>

      {/* The matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${byTactic.length}, minmax(140px, 1fr))`,
        gap: 6, overflowX: 'auto', paddingBottom: 8,
      }}>
        {byTactic.map((tac, colIdx) => (
          <div key={tac.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140 }}>
            <div style={{
              padding: '8px 10px', textAlign: 'left',
              background: tac.uniqueToF3 ? 'var(--accent)' : 'var(--ink)',
              color: tac.uniqueToF3 ? '#fff' : 'var(--paper-hi)',
              borderRadius: 4, marginBottom: 6,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                {tac.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', opacity: 0.75, marginTop: 2 }}>
                {tac.id}{tac.uniqueToF3 ? ' · F3' : ''}
              </div>
            </div>

            {tac.techniques.map((tech, rowIdx) => {
              const color = STATUS_COLORS[tech.status]
              const isSub = tech.id.includes('.')
              return (
                <motion.button
                  key={tech.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (colIdx * 0.02) + (rowIdx * 0.005), duration: 0.3 }}
                  onMouseEnter={() => setHover(tech)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (tech.scenarioIds?.[0]) navigate(`/scenarios/${tech.scenarioIds[0]}`)
                  }}
                  whileHover={{ scale: 1.03, zIndex: 10 }}
                  style={{
                    padding: isSub ? '6px 10px 6px 16px' : '8px 10px',
                    background: color.bg,
                    color: color.fg,
                    fontSize: 11,
                    borderRadius: 3, border: '1px solid var(--rule)',
                    cursor: tech.scenarioIds?.length ? 'pointer' : 'default',
                    textAlign: 'left',
                    lineHeight: 1.2,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    letterSpacing: '0.04em', opacity: 0.75,
                  }}>{tech.id}</div>
                  <div style={{ fontWeight: 500 }}>{tech.name}</div>
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Hover detail */}
      {hover && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            maxWidth: 520, background: 'var(--ink)', color: 'var(--paper)',
            padding: '14px 18px', borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)', zIndex: 100,
            fontSize: 13, lineHeight: 1.5,
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
            {hover.id} · {hover.tacticName}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
            {hover.name}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {hover.status === 'mastered' && '✓ You\'ve mastered this via a completed scenario.'}
            {hover.status === 'available' && `Used in ${hover.scenarioCount} scenario${hover.scenarioCount > 1 ? 's' : ''}. Click to start.`}
            {hover.status === 'unseen' && 'Not yet covered by any scenario — coming soon.'}
          </div>
        </motion.div>
      )}
    </Page>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      padding: '20px 22px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500,
        lineHeight: 1, color, letterSpacing: '-0.02em', marginBottom: 6,
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
      }}>{label}</div>
    </div>
  )
}
