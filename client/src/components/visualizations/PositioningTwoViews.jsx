import { useState, useMemo, useCallback } from 'react'

/* ─────────────────────────────────────────────────────────────────────────
 * PositioningTwoViews — v25.7.0.4 (FA0001, second visualization)
 *
 * "Two Views" disguise-reveal visualization for the F3-unique Positioning
 * tactic. Companion to PositioningTimeline (v25.7.0.3) — both are attached
 * to FA0001 and render together when the user expands the tactic.
 *
 * Visual concept: split the screen into "what your bank sees" (left, cream
 * banking-CRM dashboard) and "what's actually happening" (right, charcoal
 * threat intelligence panel). Toggling defender controls SURFACES hidden
 * truths from the right into the left — the bank's view starts showing
 * what was always there.
 *
 * Pedagogy: positioning is fundamentally about disguise. The truth was
 * always there. Detection rules don't generate evidence — they surface it.
 * Without controls, you're looking at the cleaned-up version.
 *
 * Scenario awareness: same mechanism as PositioningTimeline. config.examples
 * holds N scenarios; a scenarioId prop picks the matching one, otherwise
 * the first example renders as the representative case.
 *
 * Telemetry events emitted via onEvent:
 *   - viz_control_toggled       — a control was toggled on or off
 *   - viz_outcome_reached       — POSITIONING DETECTED state hit (3+ truths)
 *   - viz_scenario_picked       — user switched between scenario examples
 * ───────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
 * Bank-view palette — locked in v25.7.0.3.3 design iteration. These values
 * are duplicated here rather than imported from a global CSS file because
 * the visualization is meant to render INSIDE the dark editorial app
 * shell, and we need the cream surface to be self-contained.
 *
 * If/when other visualizations adopt the same bank-view aesthetic
 * (Reconnaissance social-graph reveal, Monetization fund-flow reveal),
 * these constants can be promoted to a shared palette module.
 * ───────────────────────────────────────────────────────────────────────── */
const BANK = {
  paper:       '#f4ede0',
  paperHi:     '#faf5ea',
  paperDim:    '#ebe2d0',
  ink:         '#1a1512',
  inkSoft:     '#5a5048',
  inkFaint:    '#948876',
  rule:        '#d4c5b0',
  ruleStrong:  '#b8a884',
  success:     '#4a6e3d',
  danger:      '#8e2a2a',
  warning:     '#c79a3a',
  warningBg:   'rgba(199, 154, 58, 0.18)',
}

export default function PositioningTwoViews({ viz, effectiveRole, onEvent, scenarioId }) {
  const config = viz.config || {}
  const examples = useMemo(() => config.examples || [], [config])

  const initialIdx = scenarioId
    ? Math.max(0, examples.findIndex(e => e.scenarioId === scenarioId))
    : 0
  const [exampleIdx, setExampleIdx] = useState(initialIdx)
  const example = examples[exampleIdx] || examples[0]

  const [activeControls, setActiveControls] = useState(() => new Set())

  // v25.7.0.27.6: playback state. PositioningTwoViews has no time axis
  // (it's a "what bank sees vs. what's actually happening" reveal), so
  // playback means progressively activating the detection controls in
  // sequence — each activation surfaces the hidden signal that control
  // catches, letting the trainee watch the disguise unravel one
  // detection at a time. Cadence: 1500ms per control (~3 controls × 1.5s
  // = ~4.5s per full play-through, plus an initial reveal pause).
  // Existing manual control toggling preserved — Play just automates it.
  const PLAYBACK_INTERVAL_MS = 1500
  const [isPlaying, setIsPlaying] = useState(false)
  const totalControls = (example?.controls || []).length
  const isAtEnd = activeControls.size >= totalControls && totalControls > 0

  useEffect(() => {
    if (!isPlaying) return
    if (isAtEnd) { setIsPlaying(false); return }
    if (totalControls === 0) { setIsPlaying(false); return }
    const handle = setInterval(() => {
      setActiveControls(prev => {
        // Activate the next control in declaration order. Stop when all
        // are active.
        const remaining = (example.controls || []).filter(c => !prev.has(c.id))
        if (remaining.length === 0) return prev
        const next = new Set(prev)
        next.add(remaining[0].id)
        return next
      })
    }, PLAYBACK_INTERVAL_MS)
    return () => clearInterval(handle)
  }, [isPlaying, isAtEnd, totalControls, example])

  function togglePlay() {
    if (isAtEnd) {
      setActiveControls(new Set())
      setIsPlaying(true)
      onEvent?.('viz_replayed')
      return
    }
    setIsPlaying(p => !p)
    onEvent?.(isPlaying ? 'viz_paused' : 'viz_played')
  }

  const toggleControl = useCallback((id) => {
    // v25.7.0.27.6: manual control toggle pauses playback so the trainee
    // can take direct control without the auto-activation continuing
    // underneath them.
    setIsPlaying(false)
    setActiveControls(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onEvent?.('viz_control_toggled')
      return next
    })
  }, [onEvent])

  const pickExample = useCallback((idx) => {
    if (idx === exampleIdx) return
    setExampleIdx(idx)
    setActiveControls(new Set())
    setIsPlaying(false)
    onEvent?.('viz_scenario_picked')
  }, [exampleIdx, onEvent])

  if (!example) {
    return (
      <div style={{ padding: 20, color: 'var(--ink-faint)', fontSize: 13 }}>
        No scenario examples available for this visualization.
      </div>
    )
  }

  // Derived state
  const isRevealed = (item) => item?.revealedBy && activeControls.has(item.revealedBy)
  const surfacedSignals = (example.hiddenSignals || []).filter(isRevealed)
  const surfacedCount = surfacedSignals.length
  const totalHidden = (example.hiddenSignals || []).length

  const goodActive = [...activeControls].filter(id =>
    (example.controls || []).find(c => c.id === id && !c.naive)
  ).length
  const naiveActive = [...activeControls].filter(id =>
    (example.controls || []).find(c => c.id === id && c.naive)
  ).length

  // Risk score: 12 baseline (low), +18 per surfaced signal, capped at 100
  const riskScore = Math.min(100, 12 + surfacedCount * 18)
  const riskTier = riskScore >= 75 ? 'high' : riskScore >= 40 ? 'medium' : 'low'

  // Fire telemetry once when freeze threshold crossed
  if (surfacedCount === 3 && !window.__viz_outcome_fired__?.[viz.id]) {
    onEvent?.('viz_outcome_reached')
    if (!window.__viz_outcome_fired__) window.__viz_outcome_fired__ = {}
    window.__viz_outcome_fired__[viz.id] = true
  }

  return (
    <div style={S.stage}>
      {examples.length > 1 && (
        <ExampleTabs
          examples={examples}
          activeIdx={exampleIdx}
          onPick={pickExample}
        />
      )}

      {/* v25.7.0.27.6: playback control row. Play / Pause / Replay button
          on the left, controls-activated counter on the right. Same
          affordance pattern as PositioningTimeline and the technique
          animation engines. Trainee hits Play to watch the disguise
          unravel — each control auto-activates in sequence (1.5s apart),
          surfacing its hidden signal in the bank-side view. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 14,
      }}>
        <button
          type="button"
          onClick={togglePlay}
          title={isAtEnd ? 'Replay from start' : (isPlaying ? 'Pause' : 'Play')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: isPlaying ? BANK.warning : BANK.paperHi,
            color: isPlaying ? BANK.paper : BANK.ink,
            border: '1px solid ' + (isPlaying ? BANK.warning : BANK.ruleStrong),
            borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 12,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: totalControls === 0 ? 'not-allowed' : 'pointer',
            opacity: totalControls === 0 ? 0.5 : 1,
            fontWeight: 600,
            transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
          }}
          disabled={totalControls === 0}
        >
          {isAtEnd ? '↻ Replay' : (isPlaying ? '❚❚ Pause' : '▶ Play')}
        </button>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: BANK.inkFaint, letterSpacing: '0.04em',
        }}>
          {activeControls.size} of {totalControls} controls active
        </div>
      </div>

      <div style={S.grid}>
        <LeftCol
          example={example}
          isRevealed={isRevealed}
          riskScore={riskScore}
          riskTier={riskTier}
        />
        <RightCol
          example={example}
          activeControls={activeControls}
          onToggleControl={toggleControl}
          isRevealed={isRevealed}
          surfacedCount={surfacedCount}
          totalHidden={totalHidden}
          goodActive={goodActive}
          naiveActive={naiveActive}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * ExampleTabs — when multiple scenarios are configured, a small tab row
 * to switch between them. Identical pattern to PositioningTimeline.
 * ───────────────────────────────────────────────────────────────────────── */
function ExampleTabs({ examples, activeIdx, onPick }) {
  return (
    <div style={S.exampleTabs}>
      {examples.map((ex, i) => {
        const active = i === activeIdx
        return (
          <button
            key={ex.scenarioId || i}
            onClick={() => onPick(i)}
            style={{
              ...S.exampleTab,
              ...(active ? S.exampleTabActive : null),
            }}
          >
            {ex.tabLabel || ex.scenarioId}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Left column — Allison's banking-CRM record. Cream palette.
 * Composed of: customer header (avatar + name + risk badge),
 * quick stats row, recent activity table, account settings table.
 * ───────────────────────────────────────────────────────────────────────── */
function LeftCol({ example, isRevealed, riskScore, riskTier }) {
  const customer = example.customer || {}
  const activity = example.activity || []
  const settings = example.settings || []

  const tierColor = riskTier === 'high'   ? BANK.danger
                  : riskTier === 'medium' ? BANK.warning
                  :                         BANK.success
  const tierBg = riskTier === 'high'   ? 'rgba(142, 42, 42, 0.10)'
              : riskTier === 'medium' ? 'rgba(199, 154, 58, 0.10)'
              :                         'rgba(74, 110, 61, 0.08)'

  const statusLabel = riskTier === 'high' ? 'FREEZE' : 'Active'
  const statusColor = riskTier === 'high' ? BANK.danger : BANK.success

  return (
    <div style={S.leftCol}>
      {/* Strip header */}
      <div style={S.colStrip}>
        <span style={{ color: BANK.ink, fontWeight: 600 }}>What your bank sees</span>
        <span>Standard CRM</span>
      </div>

      {/* Customer header — identity + risk badge */}
      <div style={S.customerHeader}>
        <div style={S.customerId}>
          <div style={S.avatar}>{customer.initial || 'A'}</div>
          <div>
            <div style={S.name}>{customer.name || 'Unknown customer'}</div>
            <div style={S.metaRow}>
              <span>{customer.id ? `#${customer.id}` : ''}</span>
              {customer.id && customer.tenure ? <Sep /> : null}
              <span>{customer.tenure || ''}</span>
              {(customer.tenure || customer.id) ? <Sep /> : null}
              <span style={{ color: statusColor, fontWeight: 600 }}>● {statusLabel}</span>
            </div>
          </div>
        </div>
        <div style={{
          ...S.riskBadge,
          borderColor: tierColor,
          background: tierBg,
        }}>
          <div style={S.riskLabel}>Risk score</div>
          <div style={{ ...S.riskValue, color: tierColor }}>
            {riskScore}<span style={{ fontSize: 14, color: BANK.inkFaint }}>/100</span>
          </div>
          <div style={{ ...S.riskTier, color: tierColor }}>{riskTier.toUpperCase()}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={S.quickStats}>
        {(example.quickStats || []).map((stat, i, arr) => (
          <div
            key={stat.label}
            style={{
              ...S.stat,
              borderRight: i === arr.length - 1 ? 'none' : `1px solid ${BANK.rule}`,
            }}
          >
            <div style={S.statLabel}>{stat.label}</div>
            <div style={{
              ...S.statValue,
              color: stat.success ? BANK.success : BANK.ink,
            }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent activity table */}
      <div style={S.section}>
        <div style={S.sectionHead}>
          <div style={S.sectionTitle}>Recent activity</div>
          <div style={S.sectionMeta}>
            Last 30 days · {activity.length} {activity.length === 1 ? 'transaction' : 'transactions'}
          </div>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Day</th>
              <th style={S.th}>Description</th>
              <th style={S.th}>Counterparty</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.map(a => {
              const revealed = isRevealed(a)
              return (
                <tr key={a.id}>
                  <td style={{ ...S.td, ...S.tdDay, ...(revealed ? S.tdRevealed : null) }}>D{a.day}</td>
                  <td style={{ ...S.td, ...(revealed ? S.tdRevealed : null) }}>
                    {a.desc}
                    {revealed && (
                      <span style={S.revealTag}>
                        <span style={{ color: BANK.warning }}>◆ </span>
                        {a.truth}
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, color: BANK.inkSoft, ...(revealed ? S.tdRevealed : null) }}>
                    {a.counterparty || '—'}
                  </td>
                  <td style={{ ...S.td, ...S.tdAmount, ...(revealed ? S.tdRevealed : null) }}>{a.amount || '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', paddingRight: 0, ...(revealed ? S.tdRevealed : null) }}>
                    <Pill kind={a.status}>{a.status === 'verified' ? 'Verified' : 'Cleared'}</Pill>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Account settings table */}
      <div style={{ ...S.section, paddingBottom: 24 }}>
        <div style={S.sectionHead}>
          <div style={S.sectionTitle}>Account settings</div>
          <div style={S.sectionMeta}>Current configuration</div>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Field</th>
              <th style={S.th}>Value</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Last changed</th>
            </tr>
          </thead>
          <tbody>
            {settings.map(s => {
              const revealed = isRevealed(s)
              return (
                <tr key={s.id}>
                  <td style={{ ...S.td, ...S.tdField, ...(revealed ? S.tdRevealed : null) }}>{s.key}</td>
                  <td style={{ ...S.td, ...(revealed ? S.tdRevealed : null) }}>
                    {s.value}
                    {revealed && (
                      <span style={S.revealTag}>
                        <span style={{ color: BANK.warning }}>◆ </span>
                        {s.truth}
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, ...S.tdWhen, ...(revealed ? S.tdRevealed : null) }}>
                    {s.whenPill ? <Pill kind="recent">{s.when}</Pill> : s.when}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Right column — threat intelligence + detection controls.
 * Charcoal palette (uses the app's standard CSS variables for the dark side).
 * Composed of: actor band, hidden signals list, detection controls (2x2
 * grid), outcome card.
 * ───────────────────────────────────────────────────────────────────────── */
function RightCol({ example, activeControls, onToggleControl, isRevealed, surfacedCount, totalHidden, goodActive, naiveActive }) {
  const actor = example.actor || {}
  const signals = example.hiddenSignals || []
  const controls = example.controls || []

  return (
    <div style={S.rightCol}>
      <div style={{ ...S.colStrip, ...S.colStripDark }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>What's actually happening</span>
        <span>Ground truth</span>
      </div>

      {/* Actor band */}
      <div style={S.actorBand}>
        <div style={S.actorBandInner}>
          <div style={S.actorLabel}>{actor.label || 'ACTOR'}</div>
          <div style={S.actorName}>{actor.name || 'Unknown actor'}</div>
          <div style={S.actorMeta}>{actor.meta || ''}</div>
        </div>
      </div>

      {/* Hidden signals */}
      <div style={S.threatSection}>
        <div style={S.threatSectionHead}>
          <div style={S.threatSectionTitle}>Hidden signals</div>
          <div style={S.threatSectionMeta}>
            {surfacedCount} of {totalHidden} surfaced
          </div>
        </div>
        {signals.map(s => {
          const surfaced = isRevealed(s)
          return (
            <div
              key={s.id}
              style={{
                ...S.threatRow,
                opacity: surfaced ? 0.4 : 1,
              }}
            >
              <div style={S.threatRowDay}>{s.day}</div>
              <div style={{
                ...S.threatRowTag,
                background: surfaced
                  ? 'rgba(107, 142, 90, 0.14)'
                  : (s.tagClass === 'cfg'
                      ? 'rgba(199, 154, 58, 0.15)'
                      : 'rgba(184, 81, 61, 0.18)'),
                color: surfaced
                  ? 'var(--success)'
                  : (s.tagClass === 'cfg' ? '#c79a3a' : 'var(--accent-hi, #d66e5a)'),
              }}>
                {s.tag}
              </div>
              <div style={S.threatRowText}>{s.text}</div>
            </div>
          )
        })}
      </div>

      {/* Detection controls — 2x2 grid */}
      <div style={S.controlsSection}>
        <div style={S.controlsSectionHead}>
          <div style={S.controlsSectionTitle}>Detection controls</div>
          <div style={S.controlsSectionHelp}>
            Toggle controls — surface hidden signals
          </div>
        </div>
        <div style={S.controlsGrid}>
          {controls.map(c => {
            const active = activeControls.has(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onToggleControl(c.id)}
                style={{
                  ...S.ctrl,
                  ...(active ? (c.naive ? S.ctrlActiveNaive : S.ctrlActive) : null),
                }}
              >
                <div style={{
                  ...S.ctrlCb,
                  ...(active
                    ? (c.naive ? S.ctrlCbNaive : S.ctrlCbActive)
                    : null),
                }}>
                  {active && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    ...S.ctrlLabel,
                    color: active
                      ? (c.naive ? 'var(--danger, #a14040)' : 'var(--success)')
                      : 'var(--ink)',
                  }}>{c.label}</div>
                  <div style={{
                    ...S.ctrlMeta,
                    color: active
                      ? (c.naive ? 'var(--danger, #a14040)' : 'var(--success)')
                      : 'var(--ink-faint)',
                    opacity: active ? 0.85 : 1,
                  }}>{c.meta}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Outcome card — full-width below the grid */}
        <OutcomeCard
          activeCount={activeControls.size}
          surfacedCount={surfacedCount}
          goodActive={goodActive}
          naiveActive={naiveActive}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * OutcomeCard — adapts to four states:
 *   no controls   → standby ("Account looks normal")
 *   only naive    → danger  ("Your controls don't match this attack")
 *   1-2 surfaced  → standby ("Partial visibility, keep going")
 *   3+ surfaced   → success ("POSITIONING DETECTED")
 * ───────────────────────────────────────────────────────────────────────── */
function OutcomeCard({ activeCount, surfacedCount, goodActive, naiveActive }) {
  let kind, eyebrow, headline, body, icon
  if (activeCount === 0) {
    kind = 'standby'
    eyebrow = 'NO CONTROLS ACTIVE'
    headline = 'The account looks normal to your bank'
    body = 'Without enhanced detection, the crew operation stays hidden. Toggle a control above to surface a signal.'
  } else if (goodActive === 0 && naiveActive > 0) {
    kind = 'danger'
    eyebrow = 'NAIVE CONTROL ONLY'
    headline = "Your active controls don't match this attack"
    body = 'SMS alerts go to the device the crew controls — they ignore them. Try a control that examines the account itself.'
    icon = (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M2 2L9 9M9 2L2 9" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  } else if (surfacedCount >= 3) {
    kind = 'success'
    eyebrow = 'POSITIONING DETECTED'
    headline = 'Bank view now shows enough truth to freeze the account'
    body = `${surfacedCount} hidden signals surfaced. Risk score crossed the freeze threshold. The mule pipeline is interrupted before execution day.`
    icon = (
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  } else {
    kind = 'standby'
    eyebrow = 'PARTIAL VISIBILITY'
    headline = `${surfacedCount} truth${surfacedCount === 1 ? '' : 's'} surfaced — keep going`
    body = 'Each control reveals more. Three or more reveals will tip the risk score over the freeze threshold.'
  }

  const styleMap = {
    success: S.outcomeSuccess,
    danger:  S.outcomeDanger,
    standby: S.outcomeStandby,
  }
  const cbStyleMap = {
    success: S.outcomeCbSuccess,
    danger:  S.outcomeCbDanger,
    standby: S.outcomeCbStandby,
  }

  return (
    <div style={{ ...S.outcomeCard, ...styleMap[kind] }}>
      <div style={{ ...S.outcomeCb, ...cbStyleMap[kind] }}>{icon}</div>
      <div>
        <div style={{
          ...S.outcomeEyebrow,
          color: kind === 'success' ? 'var(--success)'
               : kind === 'danger'  ? 'var(--danger, #a14040)'
               :                      'var(--ink-faint)',
        }}>{eyebrow}</div>
        <div style={S.outcomeHeadline}>{headline}</div>
        <div style={S.outcomeBody}>{body}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Small helpers
 * ───────────────────────────────────────────────────────────────────────── */

function Sep() {
  return <span style={{ margin: '0 6px', opacity: 0.6 }}>·</span>
}

function Pill({ kind, children }) {
  const styles = {
    cleared:  { background: 'rgba(74, 110, 61, 0.12)', color: BANK.success },
    verified: { background: 'rgba(74, 110, 61, 0.18)', color: BANK.success },
    recent:   { background: 'rgba(199, 154, 58, 0.18)', color: '#8c6f1c' },
  }
  return (
    <span style={{ ...S.pill, ...(styles[kind] || styles.cleared) }}>
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Styles object — centralized so the JSX above stays readable.
 * ───────────────────────────────────────────────────────────────────────── */
const S = {
  // v25.7.0.4.5: stage has its outer border + radius restored, since
  // the visualization now renders at page-content-width inside the
  // Framework page (not full viewport bleed). Rounded corners look
  // correct at this width.
  stage: {
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius-lg, 10px)',
    overflow: 'hidden',
    background: BANK.paper,
  },

  exampleTabs: {
    display: 'flex', gap: 4,
    padding: '10px 14px',
    background: 'var(--paper-hi)',
    borderBottom: '1px solid var(--rule)',
  },
  exampleTab: {
    padding: '6px 12px',
    background: 'transparent', border: 'none',
    borderRadius: 'var(--radius, 6px)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)', fontSize: 11,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    transition: 'all 200ms',
  },
  exampleTabActive: {
    background: 'var(--paper-dim)',
    color: 'var(--accent)',
    fontWeight: 600,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
  },

  // ─── Left column ────────────────────────────────────────────────
  leftCol: {
    background: BANK.paper,
    color: BANK.ink,
    borderRight: '2px solid var(--ink)',
  },
  colStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 22px',
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    background: BANK.paperHi,
    borderBottom: `1px solid ${BANK.rule}`,
    color: BANK.inkSoft,
  },
  colStripDark: {
    background: 'var(--paper)',
    borderBottom: '1px solid var(--rule)',
    color: 'var(--ink-faint)',
  },

  customerHeader: {
    padding: '22px 24px 18px',
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 18,
    alignItems: 'center',
    borderBottom: `1px solid ${BANK.rule}`,
    background: BANK.paperHi,
  },
  customerId: {
    display: 'grid', gridTemplateColumns: '56px 1fr', gap: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a87a, #8c6e4a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: 24, color: 'white',
    fontWeight: 500,
  },
  name: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
    lineHeight: 1.2, marginBottom: 3, letterSpacing: '-0.01em',
    color: BANK.ink,
  },
  metaRow: {
    fontSize: 11.5, color: BANK.inkSoft,
    fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
  },
  riskBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    padding: '10px 16px',
    border: '1.5px solid',
    borderRadius: 'var(--radius, 6px)',
    minWidth: 130,
    transition: 'all 280ms',
  },
  riskLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: BANK.inkFaint, fontWeight: 600, marginBottom: 3,
  },
  riskValue: {
    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
    lineHeight: 1, letterSpacing: '-0.01em',
  },
  riskTier: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    fontWeight: 600, marginTop: 4,
  },

  quickStats: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    background: BANK.paper,
    borderBottom: `1px solid ${BANK.rule}`,
  },
  stat: { padding: '14px 22px' },
  statLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: BANK.inkFaint, fontWeight: 600, marginBottom: 4,
  },
  statValue: {
    fontSize: 14, fontWeight: 500,
  },

  section: { padding: '18px 24px 4px' },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
    color: BANK.ink,
  },
  sectionMeta: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: BANK.inkFaint, letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    color: BANK.inkFaint, fontWeight: 600,
    textAlign: 'left',
    padding: '6px 10px 8px',
    borderBottom: `1px solid ${BANK.rule}`,
  },
  td: {
    padding: 10,
    fontSize: 13,
    color: BANK.ink,
    borderBottom: `1px solid ${BANK.rule}66`,
    verticalAlign: 'top',
    transition: 'background 200ms',
  },
  tdRevealed: { background: BANK.warningBg },
  tdDay: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: BANK.inkSoft, letterSpacing: '0.04em',
    fontWeight: 600, width: 48,
    paddingLeft: 0,
  },
  tdAmount: {
    fontFamily: 'var(--font-mono)', fontSize: 13,
    color: BANK.ink, fontWeight: 500, width: 110,
    textAlign: 'right',
  },
  tdField: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: BANK.inkSoft, letterSpacing: '0.04em',
    textTransform: 'uppercase', width: 165,
    paddingLeft: 0,
  },
  tdWhen: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: BANK.inkFaint, letterSpacing: '0.04em',
    width: 90, textAlign: 'right',
    paddingRight: 0,
  },
  pill: {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '3px 9px', borderRadius: 3, fontWeight: 600,
  },
  revealTag: {
    display: 'block',
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: BANK.danger,
    marginTop: 5,
    lineHeight: 1.45,
    fontWeight: 500,
  },

  // ─── Right column ───────────────────────────────────────────────
  rightCol: {
    background: 'var(--paper-dim)',
    color: 'var(--ink)',
    display: 'flex', flexDirection: 'column',
  },
  actorBand: {
    padding: '22px 22px 18px',
    borderBottom: '1px solid var(--rule)',
    background: 'var(--paper-hi)',
  },
  actorBandInner: {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: 14,
  },
  actorLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 5,
  },
  actorName: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
    color: 'var(--accent-hi, #d66e5a)', marginBottom: 4, lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  actorMeta: {
    fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45,
  },

  threatSection: {
    padding: '18px 22px',
    borderBottom: '1px solid var(--rule)',
  },
  threatSectionHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 12,
  },
  threatSectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
    color: 'var(--ink)',
  },
  threatSectionMeta: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--ink-faint)', letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  threatRow: {
    display: 'grid', gridTemplateColumns: '36px auto 1fr',
    gap: 10, alignItems: 'baseline',
    padding: '9px 0',
    borderTop: '1px solid color-mix(in srgb, var(--rule) 70%, transparent)',
    fontSize: 12,
    transition: 'opacity 200ms',
  },
  threatRowDay: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--ink-faint)', letterSpacing: '0.04em', fontWeight: 600,
  },
  threatRowTag: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '2px 7px', borderRadius: 3, fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  threatRowText: {
    color: 'var(--ink-soft)', lineHeight: 1.45,
  },

  // ─── Controls section ──────────────────────────────────────────
  controlsSection: { padding: '18px 22px 22px' },
  controlsSectionHead: { marginBottom: 12 },
  controlsSectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
    color: 'var(--ink)',
  },
  controlsSectionHelp: {
    fontFamily: 'var(--font-mono)', fontSize: 9.5,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--ink-faint)', marginTop: 4,
  },

  controlsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
  },
  ctrl: {
    background: 'var(--paper-dim)',
    border: '1.5px solid var(--rule)',
    borderRadius: 'var(--radius, 6px)',
    padding: '12px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--ink-soft)',
    display: 'grid', gridTemplateColumns: '18px 1fr', gap: 12,
    alignItems: 'flex-start',
    transition: 'all 200ms',
    fontFamily: 'var(--font-body)',
  },
  ctrlActive: {
    background: 'rgba(107, 142, 90, 0.10)',
    borderColor: 'var(--success)',
  },
  ctrlActiveNaive: {
    background: 'rgba(161, 64, 64, 0.08)',
    borderColor: 'var(--danger, #a14040)',
  },
  ctrlCb: {
    width: 18, height: 18, borderRadius: 4,
    border: '1.5px solid var(--rule-strong)',
    flexShrink: 0, marginTop: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent',
    transition: 'all 200ms',
  },
  ctrlCbActive: {
    background: 'var(--success)', borderColor: 'var(--success)',
  },
  ctrlCbNaive: {
    background: 'var(--danger, #a14040)', borderColor: 'var(--danger, #a14040)',
  },
  ctrlLabel: {
    fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 3,
  },
  ctrlMeta: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.06em',
  },

  // ─── Outcome card ──────────────────────────────────────────────
  outcomeCard: {
    marginTop: 10,
    border: '1.5px solid',
    borderRadius: 'var(--radius, 6px)',
    padding: '14px 16px',
    display: 'grid', gridTemplateColumns: '18px 1fr', gap: 12,
    alignItems: 'flex-start',
    transition: 'all 280ms',
  },
  outcomeSuccess: {
    background: 'linear-gradient(135deg, rgba(107, 142, 90, 0.16), rgba(107, 142, 90, 0.05))',
    borderColor: 'var(--success)',
    boxShadow: '0 0 18px rgba(107, 142, 90, 0.18)',
  },
  outcomeDanger: {
    background: 'linear-gradient(135deg, rgba(161, 64, 64, 0.16), rgba(161, 64, 64, 0.05))',
    borderColor: 'var(--danger, #a14040)',
    boxShadow: '0 0 18px rgba(161, 64, 64, 0.18)',
  },
  outcomeStandby: {
    background: 'var(--paper-dim)',
    borderColor: 'var(--rule)',
  },
  outcomeCb: {
    width: 18, height: 18, borderRadius: 4,
    flexShrink: 0, marginTop: 1,
    border: '1.5px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  outcomeCbSuccess: {
    background: 'var(--success)', borderColor: 'var(--success)',
  },
  outcomeCbDanger: {
    background: 'var(--danger, #a14040)', borderColor: 'var(--danger, #a14040)',
  },
  outcomeCbStandby: {
    background: 'transparent', borderColor: 'var(--rule-strong)',
  },
  outcomeEyebrow: {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    fontWeight: 600, marginBottom: 5,
  },
  outcomeHeadline: {
    fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500,
    lineHeight: 1.3, marginBottom: 5, color: 'var(--ink)',
  },
  outcomeBody: {
    fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5,
  },
}
