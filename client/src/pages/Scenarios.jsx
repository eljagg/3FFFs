import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

/* -------------------------------------------------------------------------
   Scenarios page

   Layout principles after the v19 redesign:
    - Responsive grid (1 / 2 / 3 columns) instead of a single stacked
      column — 9+ scenarios in one column forced too much scrolling.
    - Compact cards: one-line severity/meta header, tight title, summary
      clamped to 3 lines. Same information, ~40% less vertical space.
    - Completion state visible on the card (green tint + "✓ Completed"
      mono label). Users can see at a glance what's done and what's left.
    - A small progress summary sits under the lede so the page always
      answers "how far along am I?" without a trip to Home.

   Severity ordering is now fixed server-side: high → medium → low.
   ------------------------------------------------------------------------- */

const SEVERITY_COLORS = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--success)',
}

export default function Scenarios() {
  const { role } = useUser()
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    api.listScenarios(role)
      .then(r => setScenarios(r.scenarios || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [role])

  const { completedCount, totalCount, completedPct } = useMemo(() => {
    const completed = scenarios.filter(s => s.completed).length
    const total = scenarios.length
    return {
      completedCount: completed,
      totalCount: total,
      completedPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [scenarios])

  if (loading) return <Page eyebrow="Scenarios" title="Loading…" />
  if (error)   return <Page eyebrow="Scenarios" title="Couldn't load scenarios" lede={error} />

  return (
    <Page
      eyebrow="Scenarios"
      title="Walk through the attacks."
      lede="Each scenario is a real attack pattern drawn from the F3 framework. You'll navigate the attacker's path stage by stage, spot the signals, and pick the right controls."
    >
      {/* Progress summary — always visible, no trip to Home needed */}
      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginBottom: 28, flexWrap: 'wrap',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink-faint)',
          }}>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{completedCount}</span>
            {' of '}{totalCount} completed
          </div>
          <div style={{
            flex: '1 1 140px', maxWidth: 280,
            height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completedPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              style={{
                height: '100%',
                background: completedPct === 100 ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
          {completedPct > 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: completedPct === 100 ? 'var(--success)' : 'var(--ink-faint)',
            }}>{completedPct}%</div>
          )}
        </motion.div>
      )}

      {/* Scenario grid — responsive: 1 col mobile, 2 col desktop, 3 col wide */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 14,
      }}>
        {scenarios.map((sc, i) => (
          <ScenarioCard
            key={sc.id}
            scenario={sc}
            onClick={() => navigate(`/scenarios/${sc.id}`)}
            index={i}
          />
        ))}
      </div>

      {scenarios.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
          borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
        }}>
          No scenarios match your role yet. Check back soon.
        </div>
      )}
    </Page>
  )
}

function ScenarioCard({ scenario, onClick, index }) {
  const severityColor = SEVERITY_COLORS[scenario.severity] || 'var(--ink)'
  const completed = !!scenario.completed

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
      whileHover={{ y: -2 }}
      style={{
        textAlign: 'left',
        padding: '18px 20px',
        // Completed cards get a subtle success tint so they're distinguishable
        // at a glance but don't dominate the grid visually
        background: completed
          ? 'color-mix(in srgb, var(--success-bg) 45%, var(--paper-hi))'
          : 'var(--paper-hi)',
        border: '1px solid',
        borderColor: completed
          ? 'color-mix(in srgb, var(--success) 30%, var(--rule))'
          : 'var(--rule)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'border-color var(--dur), background var(--dur)',
        display: 'flex', flexDirection: 'column', minHeight: 200,
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)' }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = completed
          ? 'color-mix(in srgb, var(--success) 30%, var(--rule))'
          : 'var(--rule)'
      }}
    >
      {/* Top row: severity pill + stages + loss + completion mark */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 10, flexWrap: 'wrap', fontFamily: 'var(--font-mono)',
      }}>
        <span style={{
          fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 7px', border: '1px solid', borderColor: severityColor,
          color: severityColor, borderRadius: 3,
        }}>{scenario.severity}</span>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
          {scenario.stageCount} {scenario.stageCount === 1 ? 'stage' : 'stages'}
        </span>
        {scenario.estimatedLoss && (
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            {formatLoss(scenario.estimatedLoss)}
          </span>
        )}
        {/* Push completed marker to the right edge */}
        {completed && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--success)', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 11, lineHeight: 1 }}>✓</span> Completed
          </span>
        )}
      </div>

      {/* Title — clamped to 2 lines so tall titles don't blow out the grid */}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em',
        lineHeight: 1.25, marginBottom: 8,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', color: 'var(--ink)',
      }}>{scenario.title}</h3>

      {/* Summary — clamped to 3 lines with ellipsis */}
      <p style={{
        fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55,
        marginBottom: 0, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{scenario.summary}</p>

      {/* Footer */}
      <div style={{
        marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: completed ? 'var(--ink-faint)' : 'var(--accent)',
      }}>
        {completed ? 'Replay scenario →' : 'Start scenario →'}
      </div>
    </motion.button>
  )
}

/**
 * Loss formatter — handles both USD and JMD amounts. JMD values are
 * typically much larger (millions) so we format them with "JMD" prefix
 * for clarity, while USD is shown with the conventional "$" sign.
 *
 * Heuristic: amounts under 100,000 are treated as USD (most USD scenarios
 * are a few hundred thousand); amounts in the tens of millions+ are JMD.
 * The data model doesn't currently carry a currency field — adding one
 * is a future polish.
 */
function formatLoss(amount) {
  if (!amount) return ''
  if (amount >= 10_000_000) {
    // Assume JMD for anything north of JMD$10M (USD scenarios typically
    // cap well below this in our catalogue)
    return `~JMD$${(amount / 1_000_000).toFixed(1)}M loss`
  }
  return `~$${(amount / 1_000_000).toFixed(2)}M loss`
}
