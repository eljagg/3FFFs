/**
 * MasterDetailControls.jsx — v25.7.0.31
 *
 * Shared master-detail layout for the Detection Controls section
 * across all three animation engines (MultiActorSequenceAnimation,
 * ProcessAnimation, TimelineThresholdAnimation).
 *
 * Background:
 *   v25.7.0.27.4 moved tactic-level visualizations into a right-
 *   side slide-out. Within that slide-out, the per-technique
 *   animations render their Detection Controls section as an
 *   auto-fill grid of dense-text cards (controlsGrid). At slide-
 *   out width with 3+ controls, that grid wraps into rows, leaves
 *   substantial empty space below the controls, and forces the
 *   trainee to read three side-by-side dense paragraphs in
 *   small font.
 *
 *   Omar identified the layout pain on F1042 (and applies generally
 *   to every animation with 2+ controls). The fix: master-detail.
 *   Compact left-list of control cards (~30%), full detail panel
 *   on the right (~70%) using the empty space for breathing room
 *   and a larger reading font.
 *
 * Behaviour:
 *   - Click a left-list card body → selects that control for the
 *     detail panel (purely local UI state, no model change)
 *   - Click the checkbox inside a left-list card → toggles
 *     `active` state (existing engine behaviour, propagates the
 *     onToggle callback)
 *   - Default selection on mount: first control in the list
 *   - When a control is toggled active and its signal is firing
 *     at the current stage, the left-list card highlights
 *     (existing controlToggleActive treatment, preserved)
 *   - The right detail panel shows the full meta text, the
 *     "Would have flagged N of N" callout when active, the
 *     "Active at stage X" stage hint when applicable, the
 *     naive callout when control is naive — all the same
 *     affordances the existing single-card layout provides,
 *     in a larger reading font
 *
 * Single-control case:
 *   - When only one control exists, master-detail still applies
 *     but the left list collapses cleanly (one item, full-width
 *     detail). Acceptable; the alternative special-case branch
 *     adds branching complexity for negligible UX gain.
 *
 * Props (matches what the engines previously passed to
 * ControlToggle, plus aggregated callbacks):
 *   - controls           Array of control objects from scene file
 *   - activeControls     Set<string> of currently-active control IDs
 *   - onToggle           (controlId) => void — toggle active
 *   - revealedSignals    Array of signal objects revealed at current stage
 *   - stageLabels        Array of stage label strings (1-indexed in hints)
 *   - derivedRevealsAtStagesByControl
 *                        Object<controlId, number[]> — engine-derived
 *                        stage-reveal map (overrides scene metadata
 *                        when present, per v25.7.0.14.1 fix)
 *
 * Out-of-scope for this release:
 *   - Master-detail for the Revealed Signals section (signals
 *     already render as a vertical stack, not a wrapping grid;
 *     pain point was specifically the controls grid)
 *   - Mobile / narrow-viewport collapse to inline-expandable list
 *     (covered by the existing narrow-viewport responsive backlog)
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function MasterDetailControls({
  controls,
  activeControls,
  onToggle,
  revealedSignals,
  stageLabels,
  derivedRevealsAtStagesByControl,
}) {
  /* Default selection: first control on mount.
     Re-default when controls list changes (technique switch). */
  const [selectedId, setSelectedId] = useState(controls[0]?.id || null)
  useEffect(() => {
    if (!controls.find(c => c.id === selectedId)) {
      setSelectedId(controls[0]?.id || null)
    }
  }, [controls, selectedId])

  if (!controls || controls.length === 0) return null

  const selected = controls.find(c => c.id === selectedId) || controls[0]

  return (
    <div style={mdStyles.section}>
      <div style={mdStyles.sectionHeader}>
        <span style={mdStyles.sectionHeaderLabel}>Detection controls</span>
        <span style={mdStyles.sectionHeaderHint}>
          Tap to read · check the box to toggle
        </span>
      </div>

      <div style={mdStyles.layout}>
        {/* Left list — compact cards */}
        <div style={mdStyles.leftList} role="tablist" aria-label="Detection controls">
          {controls.map(c => {
            const active = activeControls.has(c.id)
            const isSelected = selected && selected.id === c.id
            const naive = c.naive
            const hasActiveSignal = active && revealedSignals.some(s => s.revealedBy === c.id)
            return (
              <div
                key={c.id}
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => setSelectedId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedId(c.id)
                  }
                }}
                style={{
                  ...mdStyles.listCard,
                  ...(isSelected ? mdStyles.listCardSelected : {}),
                  ...(active ? (naive ? mdStyles.listCardActiveNaive : mdStyles.listCardActive) : {}),
                  ...(hasActiveSignal ? mdStyles.listCardFiring : {}),
                }}
              >
                <div style={mdStyles.listCardHeader}>
                  {/* Checkbox — separate hit target from card body.
                      Stops propagation so toggling doesn't change selection. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(c.id)
                    }}
                    aria-pressed={active}
                    aria-label={active ? 'Deactivate control' : 'Activate control'}
                    style={{
                      ...mdStyles.checkbox,
                      ...(active ? mdStyles.checkboxActive : {}),
                    }}
                  >
                    {active ? '✓' : ''}
                  </button>
                  <span style={mdStyles.listCardLabel}>{c.label}</span>
                  {naive && <span style={mdStyles.naiveBadge}>NAIVE</span>}
                </div>
                {hasActiveSignal && (
                  <div style={mdStyles.firingHint}>★ Firing now at this stage</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right detail panel */}
        <div style={mdStyles.rightDetail} role="tabpanel">
          {selected ? (
            <DetailPanel
              control={selected}
              active={activeControls.has(selected.id)}
              revealedSignals={revealedSignals}
              stageLabels={stageLabels}
              derivedRevealsAtStages={derivedRevealsAtStagesByControl?.[selected.id]}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}


function DetailPanel({ control, active, revealedSignals, stageLabels, derivedRevealsAtStages }) {
  const naive = control.naive
  const hasActiveSignal = active && revealedSignals.some(s => s.revealedBy === control.id)

  /* Stage-list resolution mirrors ControlToggle's logic exactly
     (see v25.7.0.14.1 — engine-derived stage list overrides
     scene metadata when present). */
  const stageList =
    Array.isArray(derivedRevealsAtStages) && derivedRevealsAtStages.length > 0
      ? derivedRevealsAtStages
      : (Array.isArray(control.revealsAtStages) ? control.revealsAtStages : [])

  const showStageHint =
    active && !naive && !hasActiveSignal &&
    stageList.length > 0

  let stageHintText = null
  if (showStageHint) {
    const stageRefs = stageList.map(idx => {
      const label = stageLabels && stageLabels[idx - 1]
      return label ? `stage ${idx} (${label})` : `stage ${idx}`
    })
    stageHintText = `Active at ${stageRefs.join(', ')}. Step through to view.`
  }

  return (
    <motion.div
      key={control.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={mdStyles.detailContent}
    >
      <div style={mdStyles.detailTitleRow}>
        <span style={mdStyles.detailTitle}>{control.label}</span>
        {naive && <span style={mdStyles.naiveBadge}>NAIVE</span>}
      </div>

      <div style={mdStyles.detailMeta}>{control.meta}</div>

      {active && !naive && control.catchTotal > 0 && (
        <div style={mdStyles.detailCallout}>
          Would have flagged {control.catchCount} of {control.catchTotal} {control.catchUnit || 'events'}
        </div>
      )}

      {active && naive && (
        <div style={mdStyles.detailCalloutNaive}>
          {control.naiveCallout || 'No match — pattern works around this control'}
        </div>
      )}

      {showStageHint && (
        <div style={mdStyles.detailStageHint}>
          {stageHintText}
        </div>
      )}

      {hasActiveSignal && (
        <div style={mdStyles.detailFiringNote}>
          ★ This control's signal is revealed at the current stage. See the Hidden Signals section above.
        </div>
      )}
    </motion.div>
  )
}


/* ─── Styles ──────────────────────────────────────────────────── */
const mdStyles = {
  section: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    padding: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeaderLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  sectionHeaderHint: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: 'var(--ink-faint)',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 30%) 1fr',
    gap: 12,
    alignItems: 'start',
  },

  /* Left list */
  leftList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listCard: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderLeft: '3px solid transparent',
    borderRadius: 5,
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'all 150ms',
    outline: 'none',
  },
  listCardSelected: {
    borderLeftColor: 'var(--accent)',
    background: 'var(--paper-hi)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  listCardActive: {
    borderColor: 'var(--warning, #c79a3a)',
    background: 'rgba(199, 154, 58, 0.08)',
  },
  listCardActiveNaive: {
    borderColor: 'var(--ink-faint)',
    background: 'var(--paper-dim)',
    opacity: 0.7,
  },
  listCardFiring: {
    boxShadow: '0 0 0 2px rgba(199, 154, 58, 0.35)',
  },
  listCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    border: '1.5px solid var(--rule-strong, #3a302a)',
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    color: 'var(--paper)',
    fontWeight: 700,
    flexShrink: 0,
    background: 'var(--paper)',
    cursor: 'pointer',
    padding: 0,
  },
  checkboxActive: {
    background: 'var(--warning, #c79a3a)',
    borderColor: 'var(--warning, #c79a3a)',
  },
  listCardLabel: {
    flex: 1,
    fontSize: 13,
    color: 'var(--ink)',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  naiveBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.14em',
    padding: '2px 5px',
    borderRadius: 2,
    background: 'var(--paper-dim)',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  firingHint: {
    marginTop: 6,
    paddingLeft: 26,
    fontSize: 12,
    fontStyle: 'italic',
    color: 'var(--warning, #c79a3a)',
    fontWeight: 600,
  },

  /* Right detail panel */
  rightDetail: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 5,
    padding: '16px 20px',
    minHeight: 200,
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  detailTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--ink)',
    lineHeight: 1.35,
  },
  detailMeta: {
    fontSize: 14.5,
    color: 'var(--ink-soft)',
    lineHeight: 1.6,
  },
  detailCallout: {
    fontSize: 14.5,
    fontWeight: 600,
    color: 'var(--warning, #c79a3a)',
    padding: '10px 12px',
    background: 'rgba(199, 154, 58, 0.08)',
    border: '1px solid rgba(199, 154, 58, 0.3)',
    borderRadius: 4,
  },
  detailCalloutNaive: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'var(--ink-faint)',
    padding: '10px 12px',
    background: 'var(--paper-dim)',
    border: '1px solid var(--rule)',
    borderRadius: 4,
  },
  detailStageHint: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: 'var(--ink-faint)',
    paddingLeft: 12,
    borderLeft: '2px dashed var(--rule)',
    paddingTop: 4,
    paddingBottom: 4,
    lineHeight: 1.5,
  },
  detailFiringNote: {
    fontSize: 13.5,
    fontWeight: 600,
    color: 'var(--warning, #c79a3a)',
    fontStyle: 'italic',
  },
}
