import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser, ROLES } from '../lib/user.jsx'

const NAMESPACE = 'https://3fffs.app'

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

   v25.3.1: role-context banner above the list. Tells the user (and the
   admin) which role's scenarios they're seeing. Replaces the previous
   silent filter that left admins confused about why they saw all 12 and
   non-admins confused about why their list was shorter than someone else's.

   Severity ordering is now fixed server-side: high → medium → low.
   ------------------------------------------------------------------------- */

const SEVERITY_COLORS = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--success)',
}

export default function Scenarios() {
  const { role, simulateRole } = useUser()
  const { user } = useAuth0()
  const auth0Roles = user?.[`${NAMESPACE}/roles`] || []
  const isAdmin = auth0Roles.includes('admin')

  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [filterMeta, setFilterMeta] = useState({})  // v25.3.1: server-returned filter context

  useEffect(() => {
    setLoading(true)
    api.listScenarios(role, simulateRole)
      .then(r => {
        setScenarios(r.scenarios || [])
        setFilterMeta({
          filteredByRole: r.filteredByRole,
          isAdmin: r.isAdmin,
          simulating: r.simulating,
          simulatedRole: r.simulatedRole,
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [role, simulateRole])

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
      {/* v25.3.1: role-context banner — surfaces what the user is seeing AS */}
      <RoleContextBanner
        role={role}
        simulateRole={simulateRole}
        isAdmin={isAdmin}
        filteredByRole={filterMeta.filteredByRole}
        scenarioCount={totalCount}
      />

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

/**
 * v25.3.1 — RoleContextBanner
 *
 * Three states:
 *   1. Admin, not simulating → "Admin view — showing all N scenarios. [Simulate as ▾]"
 *   2. Admin, simulating → "Simulating as <Role> — N scenarios visible. [Stop simulating]"
 *   3. Non-admin → "Showing scenarios for <Role>. [Change role]"
 */
function RoleContextBanner({ role, simulateRole, isAdmin, filteredByRole, scenarioCount }) {
  const { setSimulateRole, clearSimulateRole, chooseRole, clearRole } = useUser()
  const [open, setOpen] = useState(false)

  // Pick the resolved role for label rendering
  const labelFor = (id) => ROLES.find(r => r.id === id)?.label || id

  let mode, headline, action
  if (isAdmin && simulateRole) {
    mode = 'simulating'
    headline = (
      <>
        Simulating as <strong>{labelFor(simulateRole)}</strong> — {scenarioCount}{' '}
        {scenarioCount === 1 ? 'scenario' : 'scenarios'} visible
      </>
    )
    action = (
      <button onClick={clearSimulateRole} style={bannerBtn}>↺ Stop simulating</button>
    )
  } else if (isAdmin && !simulateRole) {
    mode = 'admin'
    headline = (
      <>Admin view — showing all <strong>{scenarioCount}</strong> scenarios</>
    )
    action = (
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={bannerBtn}>
          Filter by role ▾
        </button>
        {open && (
          <RolePicker
            current={null}
            onPick={(id) => { setSimulateRole(id); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  } else if (role) {
    mode = 'user'
    headline = (
      <>
        Showing scenarios for <strong>{labelFor(role)}</strong>
      </>
    )
    action = (
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)} style={bannerBtn}>
          Change role ▾
        </button>
        {open && (
          <RolePicker
            current={role}
            onPick={(id) => { chooseRole(id); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  } else {
    // Non-admin without role — shouldn't normally happen (RolePicker wraps protected pages)
    mode = 'no-role'
    headline = <>No role selected — showing all available scenarios</>
    action = null
  }

  const accent = mode === 'simulating' ? 'var(--accent)' : 'var(--rule-strong)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 14px',
        marginBottom: 18,
        background: 'var(--paper-hi)',
        border: `1px solid ${accent}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 'var(--radius)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
        {headline}
      </div>
      {action}
    </motion.div>
  )
}

const bannerBtn = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
  padding: '6px 10px',
  background: 'transparent', color: 'var(--ink)',
  border: '1px solid var(--rule-strong)', borderRadius: 4,
  cursor: 'pointer',
  transition: 'border-color var(--dur) ease',
}

function RolePicker({ current, onPick, onClose }) {
  return (
    <>
      {/* Click-out catcher */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 80 }}
      />
      <div style={{
        position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 81,
        minWidth: 240, padding: 6,
        background: 'var(--paper)', border: '1px solid var(--rule-strong)',
        borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 10px', border: 'none', cursor: 'pointer',
              background: r.id === current ? 'var(--paper-hi)' : 'transparent',
              borderRadius: 'var(--radius)',
              fontSize: 13, color: 'var(--ink)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = r.id === current ? 'var(--paper-hi)' : 'transparent' }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </>
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
