import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'

/* ─────────────────────────────────────────────────────────────────────────
   ScenarioStoryboard — v25.7.0.5

   Renders the F3 Framework scenario storyboard view (Design C). Picker
   tabs at the top → scenario summary card → two-column workbench (vertical
   timeline left, sticky detail panel right).

   Props:
     defaultScenarioId — initial scenario ID to load (default 'SC007')
     compact            — if true, renders without internal padding (the
                          host page provides the surrounding chrome)

   Pedagogical insight (OBS-027):
     The storyboard exists to bind technique IDs to scenario beats so that
     recognizing the technique in production triggers the scenario memory.
     "F1008.001 silences alerts" is a definition. "Day 8 — crew swaps
     Allison's email to a throwaway Gmail; from this moment, every alert
     the bank sends goes to the crew, not her" is a memory hook.

   Data flow:
     1. Mount → fetch /api/storyboard/scenarios (picker data)
     2. User selects a scenario tab → fetch /api/storyboard/scenarios/:id
     3. Render summary + entries (entries = beats interleaved with phase
        markers, both ordered by relationship `order` on the server side)

   Stub scenarios appear in the picker as disabled tabs with their
   plannedRelease badge ("v25.7.0.x"). Clicking does nothing — they're
   informational, signaling that more scenarios are coming.
   ───────────────────────────────────────────────────────────────────── */

export default function ScenarioStoryboard({ defaultScenarioId = 'SC007' }) {
  const [scenarioList, setScenarioList] = useState([])
  const [scenarioListError, setScenarioListError] = useState(null)
  const [selectedId, setSelectedId] = useState(defaultScenarioId)
  const [scenario, setScenario] = useState(null)
  const [entries, setEntries] = useState([])
  const [scenarioError, setScenarioError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntryIdx, setSelectedEntryIdx] = useState(null)

  // Load picker data once
  useEffect(() => {
    api.getStoryboardScenarios()
      .then(d => {
        setScenarioList(d.scenarios || [])
        // If the requested defaultScenarioId isn't in the authored list,
        // fall back to the first authored scenario. Prevents the page
        // from spinning on a non-existent ID.
        const authored = (d.scenarios || []).filter(s => s.hasBeats)
        if (authored.length > 0 && !authored.find(s => s.id === defaultScenarioId)) {
          setSelectedId(authored[0].id)
        }
      })
      .catch(err => {
        setScenarioListError(err.message || 'Failed to load scenario list')
      })
  }, [defaultScenarioId])

  // Load scenario detail when selectedId changes
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setScenarioError(null)
    setSelectedEntryIdx(null)
    api.getStoryboardScenario(selectedId)
      .then(d => {
        setScenario(d.scenario || null)
        setEntries(d.entries || [])
        setLoading(false)
      })
      .catch(err => {
        setScenarioError(err.message || `Failed to load scenario ${selectedId}`)
        setLoading(false)
      })
  }, [selectedId])

  // Active beat — currently selected entry, only if it's a beat (not a phase)
  const activeBeat = useMemo(() => {
    if (selectedEntryIdx == null) return null
    const e = entries[selectedEntryIdx]
    if (!e || e.phase) return null
    return e
  }, [selectedEntryIdx, entries])

  const styles = {
    /* Outer wrapper — fills its container width */
    wrap: { width: '100%' },

    /* Picker tabs */
    tabs: {
      display: 'flex',
      gap: 4,
      marginBottom: 24,
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: 4,
      width: 'fit-content',
      flexWrap: 'wrap',
    },
    tab: {
      padding: '10px 18px',
      background: 'transparent',
      border: 'none',
      color: 'var(--ink-soft)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      borderRadius: 4,
      transition: 'all 150ms',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    tabActive: {
      background: 'var(--accent)',
      color: 'var(--paper)',
      fontWeight: 600,
    },
    tabDisabled: {
      color: 'var(--ink-faint)',
      cursor: 'not-allowed',
    },
    tabId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.08em',
      opacity: 0.7,
    },
    tabIdActive: {
      color: 'rgba(26, 21, 18, 0.7)',
    },
    comingTag: {
      fontFamily: 'var(--font-mono)',
      fontSize: 8.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '2px 6px',
      borderRadius: 2,
      background: 'var(--paper-dim)',
      color: 'var(--ink-faint)',
    },

    /* Scenario summary card */
    card: {
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 10,
      padding: '22px 28px',
      marginBottom: 28,
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 32,
      alignItems: 'start',
    },
    cardHeadline: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      marginBottom: 8,
    },
    cardMeta: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
      marginBottom: 14,
    },
    cardSep: { margin: '0 8px', opacity: 0.5 },
    cardSummary: {
      fontSize: 14,
      color: 'var(--ink-soft)',
      lineHeight: 1.6,
    },
    statCol: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderLeft: '1px solid var(--rule)',
      paddingLeft: 28,
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingBottom: 10,
      borderBottom: '1px solid var(--rule)',
    },
    statLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
    },
    statValue: {
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--ink)',
    },

    /* Workbench: timeline + detail */
    workbench: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 1fr)',
      gap: 28,
      alignItems: 'start',
    },

    /* Timeline */
    timeline: { position: 'relative' },

    phaseMarker: {
      gridColumn: '2 / -1',
      margin: '28px 0 18px',
      paddingBottom: 10,
      borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      fontWeight: 600,
    },

    beat: {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '96px 1fr',
      gap: 18,
      marginBottom: 4,
      alignItems: 'start',
    },
    beatDay: {
      textAlign: 'right',
      paddingTop: 14,
      paddingRight: 4,
    },
    beatDayNum: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      fontWeight: 500,
      color: 'var(--ink)',
      letterSpacing: '-0.01em',
    },
    beatDayLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      color: 'var(--ink-faint)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginTop: 1,
    },
    beatCard: {
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: '14px 18px',
      marginBottom: 12,
      cursor: 'pointer',
      transition: 'all 150ms',
      textAlign: 'left',
      width: '100%',
      color: 'inherit',
      font: 'inherit',
      position: 'relative',
    },
    beatCardClimax: {
      background: 'linear-gradient(135deg, rgba(161, 64, 64, 0.18), rgba(161, 64, 64, 0.04))',
      border: '1.5px solid var(--danger, #a14040)',
      borderLeft: '3px solid var(--danger, #a14040)',
      boxShadow: '0 0 24px rgba(161, 64, 64, 0.15)',
    },
    beatCardSelected: {
      borderColor: 'var(--accent)',
      background: 'rgba(184, 81, 61, 0.08)',
      boxShadow: '0 0 0 1px var(--accent)',
    },
    beatMetaRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    actorPill: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      padding: '2px 8px',
      borderRadius: 3,
      fontWeight: 600,
    },
    actorPillAttacker:  { background: 'rgba(184, 81, 61, 0.15)',  color: 'var(--accent-hi, #d66e5a)' },
    actorPillVictim:    { background: 'rgba(107, 142, 90, 0.15)', color: 'var(--success, #6b8e5a)'  },
    actorPillDetection: { background: 'rgba(199, 154, 58, 0.18)', color: 'var(--warning, #c79a3a)'  },
    beatTechId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--ink-faint)',
      letterSpacing: '0.06em',
      fontWeight: 500,
    },
    beatHeadline: {
      fontFamily: 'var(--font-display)',
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: '-0.005em',
      marginBottom: 6,
    },
    beatNarrative: {
      fontSize: 13,
      color: 'var(--ink-soft)',
      lineHeight: 1.55,
    },

    /* Detail panel */
    detail: {
      position: 'sticky',
      top: 28,
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 56px)',
      display: 'flex',
      flexDirection: 'column',
    },
    detailStrip: {
      padding: '12px 22px',
      background: 'var(--paper-dim)',
      borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayMarker: { color: 'var(--accent)', fontWeight: 600 },
    detailBody: {
      padding: '24px 24px 28px',
      overflowY: 'auto',
    },
    detailEmpty: {
      padding: '60px 24px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontStyle: 'italic',
      fontSize: 13.5,
      lineHeight: 1.6,
    },
    detailEyebrow: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      fontWeight: 600,
      marginBottom: 6,
    },
    detailTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.015em',
      marginBottom: 8,
    },
    detailId: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--ink-faint)',
      letterSpacing: '0.08em',
      marginBottom: 16,
    },
    detailPillrow: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      marginBottom: 18,
      paddingBottom: 16,
      borderBottom: '1px solid var(--rule)',
    },
    detailPill: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '3px 9px',
      borderRadius: 3,
      fontWeight: 600,
      background: 'var(--paper-dim)',
      color: 'var(--ink-soft)',
      border: '1px solid var(--rule)',
    },
    detailPillSeverityHigh:   { background: 'rgba(142, 42, 42, 0.18)',  color: '#d66e5a',          borderColor: 'rgba(214, 110, 90, 0.3)' },
    detailPillSeverityMedium: { background: 'rgba(199, 154, 58, 0.15)', color: 'var(--warning, #c79a3a)', borderColor: 'rgba(199, 154, 58, 0.3)' },
    detailSection: { marginBottom: 18 },
    detailSectionTitle: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
      fontWeight: 600,
      marginBottom: 8,
    },
    detailProse: {
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--ink-soft)',
    },
    contextBox: {
      background: 'var(--paper-dim)',
      borderLeft: '2px solid var(--accent)',
      padding: '12px 14px',
      borderRadius: 6,
      fontSize: 13,
      lineHeight: 1.55,
      color: 'var(--ink-soft)',
    },
    contextBoxLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      fontWeight: 600,
      marginBottom: 6,
    },
    placeholder: {
      fontStyle: 'italic',
      color: 'var(--ink-faint)',
      fontSize: 12,
      padding: '10px 12px',
      borderLeft: '2px dashed var(--rule-strong, #3a302a)',
      background: 'rgba(255,255,255,0.012)',
      borderRadius: '0 6px 6px 0',
    },
  }

  /* ─── Subcomponent: scenario picker tabs ──────────────────────────── */
  function ScenarioTabs() {
    return (
      <div style={styles.tabs}>
        {scenarioList.map(s => {
          const isActive = s.id === selectedId
          const isStub = !s.hasBeats
          const tabStyle = {
            ...styles.tab,
            ...(isActive ? styles.tabActive : {}),
            ...(isStub ? styles.tabDisabled : {}),
          }
          const idStyle = {
            ...styles.tabId,
            ...(isActive ? styles.tabIdActive : {}),
          }
          return (
            <button
              key={s.id}
              style={tabStyle}
              disabled={isStub}
              onClick={() => !isStub && setSelectedId(s.id)}
              title={isStub ? `Coming in ${s.plannedRelease}` : ''}
            >
              <span style={idStyle}>{s.id}</span>
              <span>{shortName(s.name)}</span>
              {isStub && <span style={styles.comingTag}>{s.plannedRelease}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  /* ─── Subcomponent: summary card ──────────────────────────────────── */
  function SummaryCard() {
    if (!scenario) return null
    return (
      <div style={styles.card}>
        <div>
          <div style={styles.cardHeadline}>{scenario.headline}</div>
          <div style={styles.cardMeta}>
            <span>{scenario.id}</span>
            {scenario.meta?.jurisdiction && (
              <>
                <span style={styles.cardSep}>·</span>
                <span>{scenario.meta.jurisdiction}</span>
              </>
            )}
            {scenario.meta?.frequency && (
              <>
                <span style={styles.cardSep}>·</span>
                <span>{scenario.meta.frequency} frequency</span>
              </>
            )}
            {scenario.meta?.losses && (
              <>
                <span style={styles.cardSep}>·</span>
                <span>{scenario.meta.losses}</span>
              </>
            )}
          </div>
          {scenario.subtitle && (
            <div style={styles.cardSummary}>{scenario.subtitle}</div>
          )}
        </div>
        {Array.isArray(scenario.stats) && scenario.stats.length > 0 && (
          <div style={styles.statCol}>
            {scenario.stats.map((s, i) => (
              <div
                key={i}
                style={{
                  ...styles.statRow,
                  ...(i === scenario.stats.length - 1 ? { borderBottom: 'none', paddingBottom: 0 } : {}),
                }}
              >
                <span style={styles.statLabel}>{s.label}</span>
                <span
                  style={{
                    ...styles.statValue,
                    ...(s.emphasis === 'good' ? { color: 'var(--success, #6b8e5a)' } : {}),
                    ...(s.emphasis === 'danger' ? { color: 'var(--accent-hi, #d66e5a)' } : {}),
                  }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ─── Subcomponent: timeline ──────────────────────────────────────── */
  function Timeline() {
    return (
      <div style={styles.timeline}>
        {entries.map((e, idx) => {
          if (e.phase) {
            return (
              <div key={e.id} style={styles.phaseMarker}>
                {e.phase}
              </div>
            )
          }

          const isSelected = selectedEntryIdx === idx
          const isClimax = e.kind === 'climax'

          // Beat-card style with conditional overrides
          const cardStyle = { ...styles.beatCard }

          // Side-color band (left border) based on actor kind
          if (e.kind === 'attacker-action' || isClimax) {
            cardStyle.borderLeft = '3px solid var(--accent)'
          } else if (e.kind === 'victim-event') {
            cardStyle.borderLeft = '3px solid var(--success, #6b8e5a)'
          } else if (e.kind === 'detection') {
            cardStyle.borderLeft = '3px solid var(--warning, #c79a3a)'
          }

          if (isClimax) Object.assign(cardStyle, styles.beatCardClimax)
          if (isSelected) Object.assign(cardStyle, styles.beatCardSelected)

          // Actor pill
          let pillLabel, pillStyle
          if (e.actor === 'attacker') { pillLabel = 'CREW';     pillStyle = { ...styles.actorPill, ...styles.actorPillAttacker  } }
          else if (e.actor === 'victim') { pillLabel = 'CUSTOMER'; pillStyle = { ...styles.actorPill, ...styles.actorPillVictim    } }
          else { pillLabel = 'DETECTION'; pillStyle = { ...styles.actorPill, ...styles.actorPillDetection } }

          return (
            <div key={e.id} style={styles.beat}>
              <div style={styles.beatDay}>
                <div style={styles.beatDayNum}>D{e.day ?? '?'}</div>
                <div style={styles.beatDayLabel}>Day {e.day ?? '?'}</div>
              </div>
              <button
                style={cardStyle}
                onClick={() => setSelectedEntryIdx(idx)}
                onMouseEnter={(ev) => {
                  if (!isSelected && !isClimax) {
                    ev.currentTarget.style.borderColor = 'var(--accent)'
                    ev.currentTarget.style.background = 'var(--paper)'
                  }
                }}
                onMouseLeave={(ev) => {
                  if (!isSelected && !isClimax) {
                    ev.currentTarget.style.borderColor = 'var(--rule)'
                    ev.currentTarget.style.background = 'var(--paper-hi)'
                  }
                }}
              >
                <div style={styles.beatMetaRow}>
                  <span style={pillStyle}>{pillLabel}</span>
                  {e.techId && <span style={styles.beatTechId}>{e.techId}</span>}
                </div>
                <div style={styles.beatHeadline}>{e.headline}</div>
                <div style={styles.beatNarrative}>{e.narrative}</div>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  /* ─── Subcomponent: detail panel ──────────────────────────────────── */
  function DetailPanel() {
    if (!activeBeat) {
      return (
        <div style={styles.detail}>
          <div style={styles.detailStrip}>
            <span>Beat detail</span>
            <span style={styles.dayMarker}>—</span>
          </div>
          <div style={styles.detailEmpty}>
            Click any beat in the timeline to see the technique reference,
            why it matters here, and per-role guidance.
          </div>
        </div>
      )
    }

    const b = activeBeat
    const eyebrow = b.techId
      ? 'TECHNIQUE BEAT'
      : (b.kind === 'detection' ? 'DETECTION COUNTERFACTUAL' : 'CONTEXT BEAT')

    const sevPillStyle =
      b.techSeverity === 'high'   ? { ...styles.detailPill, ...styles.detailPillSeverityHigh }
    : b.techSeverity === 'medium' ? { ...styles.detailPill, ...styles.detailPillSeverityMedium }
    : null

    return (
      <div style={styles.detail}>
        <div style={styles.detailStrip}>
          <span>Beat {(selectedEntryIdx ?? 0) + 1}</span>
          <span style={styles.dayMarker}>
            DAY {b.day}{b.techId ? ` · ${b.techId}` : ''}
          </span>
        </div>
        <div style={styles.detailBody}>
          <div style={styles.detailEyebrow}>{eyebrow}</div>
          <div style={styles.detailTitle}>{b.headline}</div>
          <div style={styles.detailId}>
            {b.techId || 'No technique — narrative beat'}
          </div>

          {(sevPillStyle || b.day != null || b.actor) && (
            <div style={styles.detailPillrow}>
              {sevPillStyle && <span style={sevPillStyle}>{b.techSeverity}</span>}
              {b.day != null && <span style={styles.detailPill}>Day {b.day}</span>}
              {b.actor && <span style={styles.detailPill}>{b.actor}</span>}
            </div>
          )}

          <div style={styles.detailSection}>
            <div style={styles.detailSectionTitle}>What happened</div>
            <div style={styles.detailProse}><p style={{ margin: 0 }}>{b.narrative}</p></div>
          </div>

          {b.techId && (
            <div style={styles.detailSection}>
              <div style={styles.detailSectionTitle}>Technique reference</div>
              <div style={styles.detailProse}>
                <p style={{ margin: '0 0 10px' }}>
                  <strong style={{ color: 'var(--ink)' }}>
                    {b.techId} — {b.techName}
                  </strong>
                </p>
                {b.techDescription && (
                  <p style={{ margin: 0 }}>{b.techDescription}</p>
                )}
              </div>
            </div>
          )}

          {b.whatNow && (
            <div style={styles.detailSection}>
              <div style={styles.detailSectionTitle}>Why this beat matters</div>
              <div style={styles.contextBox}>
                <div style={styles.contextBoxLabel}>In this scenario</div>
                {b.whatNow}
              </div>
            </div>
          )}

          <div style={styles.detailSection}>
            <div style={styles.detailSectionTitle}>Per-role guidance</div>
            <div style={styles.placeholder}>
              Per-role guidance — what the teller / analyst / SOC / exec
              should look for at this beat — not yet authored. This is the
              OBS-018 four-lens content applied at per-beat level. Likely
              the highest-value content for trainees because it ties
              technique theory to scenario-specific action.
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Render ──────────────────────────────────────────────────────── */
  if (scenarioListError) {
    return (
      <div style={{ padding: 24, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
        Could not load storyboard scenarios: {scenarioListError}
      </div>
    )
  }

  if (scenarioList.length === 0 && !scenarioListError) {
    return (
      <div style={{ padding: 24, color: 'var(--ink-faint)' }}>
        Loading scenarios…
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <ScenarioTabs />

      {scenarioError && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(184, 81, 61, 0.08)',
          border: '1px solid var(--accent)',
          borderRadius: 6,
          color: 'var(--accent-hi, #d66e5a)',
          marginBottom: 20,
          fontSize: 13.5,
        }}>
          Could not load scenario {selectedId}: {scenarioError}
        </div>
      )}

      {loading && !scenario ? (
        <div style={{ padding: 40, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
          Loading scenario…
        </div>
      ) : (
        <>
          <SummaryCard />
          <div style={styles.workbench}>
            <Timeline />
            <DetailPanel />
          </div>
        </>
      )}
    </div>
  )
}

/* Helper — strip "—" and the postfix from headlines for the tab label.
   "Account Rental — the money mule pipeline" → "Account Rental" */
function shortName(name) {
  if (!name) return ''
  const idx = name.indexOf(' — ')
  return idx > 0 ? name.slice(0, idx) : name
}
