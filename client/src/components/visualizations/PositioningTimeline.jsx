import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────
 * PositioningTimeline — v25.7.0.3 (FA0001)
 *
 * Visualizes the F3-unique Positioning tactic: the patient phase between
 * Initial Access and Execution where the attacker establishes durable
 * control and waits. Most fraud-ops staff coming from MITRE ATT&CK don't
 * have a strong mental model for this — ATT&CK collapses positioning into
 * Execution. F3 calls it out as its own tactic because in financial-sector
 * fraud, the positioning phase often lasts WEEKS, and is where the most
 * detection leverage exists.
 *
 * The visualization is a three-lane timeline that the user scrubs:
 *
 *   Lane 1 (top, terracotta):     Attacker activity day-by-day
 *   Lane 2 (middle, accent):       Detection signals as they appear
 *   Lane 3 (bottom, green):        Defender controls — toggleable
 *
 * Pedagogy: "you have N days to catch this. Here's what's visible on each.
 * Which controls would have caught it earliest?"
 *
 * Scenario awareness:
 *   - If a scenarioId is passed AND the scenario has Positioning content,
 *     the timeline shows THAT scenario's positioning data.
 *   - Otherwise, the viz shows a composite "representative example" sourced
 *     from the config.examples array on the seed entry.
 *
 * Telemetry events emitted via onEvent:
 *   - viz_scrubbed_to_day: when user changes the timeline scrubber
 *   - viz_control_toggled: when user activates/deactivates a defender control
 *   - viz_scenario_picked: when user selects a different scenario tab
 *
 * ───────────────────────────────────────────────────────────────────────── */

export default function PositioningTimeline({ viz, effectiveRole, onEvent, scenarioId }) {
  const config = viz.config || {}
  const examples = useMemo(() => config.examples || [], [config])

  // Pick which example to render. If a scenarioId is supplied AND we have
  // an example matching it, use that one. Otherwise default to the first
  // example (the "representative" case for Framework-page rendering).
  const initialIdx = scenarioId
    ? Math.max(0, examples.findIndex(e => e.scenarioId === scenarioId))
    : 0
  const [exampleIdx, setExampleIdx] = useState(initialIdx)
  const example = examples[exampleIdx] || examples[0]

  // Scrubber state. Day 0 is when Positioning starts (immediately after
  // Initial Access). Day N is when Execution begins.
  const [day, setDay] = useState(0)
  const totalDays = example?.totalDays ?? 30

  // Which controls is the user toggling on as "we have this in production"?
  const [activeControls, setActiveControls] = useState(new Set())

  // v25.7.0.27.6: playback state. When isPlaying is true, day auto-advances
  // at PLAYBACK_INTERVAL_MS until reaching totalDays. The trainee can hit
  // Play to watch the 30-day Positioning attack unfold without having to
  // drag the scrubber manually. Existing manual scrub still works — the
  // moment the user drags, playback pauses (handled by scrubTo).
  // Cadence: 30 days × 333ms ≈ 10 seconds for a full play-through. Fast
  // enough to feel like a story, slow enough that the trainee can absorb
  // each day's reveals as they appear in the lanes.
  const PLAYBACK_INTERVAL_MS = 333
  const [isPlaying, setIsPlaying] = useState(false)
  const isAtEnd = day >= totalDays

  useEffect(() => {
    if (!isPlaying) return
    if (isAtEnd) { setIsPlaying(false); return }
    const handle = setInterval(() => {
      setDay(prev => {
        const next = prev + 1
        if (next >= totalDays) {
          // Stop at the last day so the trainee sees the final state.
          // Replay is one click away via the same button.
          return totalDays
        }
        return next
      })
    }, PLAYBACK_INTERVAL_MS)
    return () => clearInterval(handle)
  }, [isPlaying, isAtEnd, totalDays])

  function togglePlay() {
    if (isAtEnd) {
      // Replay from start: reset day to 0 then start playing.
      setDay(0)
      setIsPlaying(true)
      onEvent?.('viz_replayed')
      return
    }
    setIsPlaying(p => !p)
    onEvent?.(isPlaying ? 'viz_paused' : 'viz_played')
  }

  // Reset scrubber + controls when the user picks a different example.
  useEffect(() => { setDay(0); setActiveControls(new Set()); setIsPlaying(false) }, [exampleIdx])

  if (!example) {
    return (
      <div style={{ padding: 20, color: 'var(--ink-faint)', fontSize: 13 }}>
        No positioning examples available.
      </div>
    )
  }

  // Compute what's "visible" at the current day cursor.
  const attackerActions = (example.attackerActions || []).filter(a => a.day <= day)
  const visibleSignals  = (example.signals || []).filter(s => s.day <= day)

  // For each control, compute "would this have caught it by day X?" — the
  // earliest signal day where the control would fire. This is the heart of
  // the teaching: the user scrubs forward and sees their selected controls
  // fire on the day they would catch it.
  const controlFiringDays = useMemo(() => {
    const map = {}
    for (const ctrl of example.controls || []) {
      const triggeringSignals = (example.signals || []).filter(s =>
        (ctrl.firesOnSignals || []).includes(s.id)
      )
      if (triggeringSignals.length === 0) continue
      map[ctrl.id] = Math.min(...triggeringSignals.map(s => s.day))
    }
    return map
  }, [example])

  // Earliest catch by any active control = the visualization's primary
  // outcome metric. If nothing's active, we show "...no controls active —
  // attacker reaches execution undetected."
  const earliestCatchDay = useMemo(() => {
    let earliest = null
    for (const ctrl of example.controls || []) {
      if (!activeControls.has(ctrl.id)) continue
      const firingDay = controlFiringDays[ctrl.id]
      if (firingDay == null) continue
      if (earliest === null || firingDay < earliest) earliest = firingDay
    }
    return earliest
  }, [activeControls, controlFiringDays, example.controls])

  function toggleControl(controlId) {
    setActiveControls(prev => {
      const next = new Set(prev)
      if (next.has(controlId)) next.delete(controlId)
      else next.add(controlId)
      onEvent?.('viz_control_toggled')
      return next
    })
  }

  function pickExample(idx) {
    if (idx === exampleIdx) return
    setExampleIdx(idx)
    onEvent?.('viz_scenario_picked')
  }

  function scrubTo(d) {
    setDay(d)
    // v25.7.0.27.6: manual scrub pauses playback. The trainee may want
    // to jump back to inspect a moment they passed too quickly — pausing
    // on scrub lets them do that without the day cursor running off.
    setIsPlaying(false)
    onEvent?.('viz_scrubbed_to_day')
  }

  // Layout: header, scenario picker (if multiple), timeline, controls panel,
  // outcome strip. All in editorial palette.
  return (
    <div style={{
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px 24px',
    }}>
      <Header viz={viz} />

      {examples.length > 1 && (
        <ExampleTabs
          examples={examples}
          activeIdx={exampleIdx}
          onPick={pickExample}
        />
      )}

      {/* v25.7.0.27.6: playback control row. Play / Pause / Replay button
          on the left, day-counter on the right. Same affordance pattern
          as the technique animation engines (MultiActorSequenceAnimation,
          ProcessAnimation) — trainee hits Play to watch the 30-day
          Positioning attack unfold, hits Pause to stop, hits Replay
          when at the end to start over from day 0. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginTop: 14, marginBottom: 6,
      }}>
        <button
          type="button"
          onClick={togglePlay}
          title={isAtEnd ? 'Replay from start' : (isPlaying ? 'Pause' : 'Play')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: isPlaying ? 'var(--accent)' : 'var(--paper)',
            color: isPlaying ? 'var(--paper)' : 'var(--ink)',
            border: '1px solid ' + (isPlaying ? 'var(--accent)' : 'var(--rule-strong)'),
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer', fontWeight: 600,
            transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
          }}
        >
          {isAtEnd ? '↻ Replay' : (isPlaying ? '❚❚ Pause' : '▶ Play')}
        </button>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--ink-faint)', letterSpacing: '0.04em',
        }}>
          Day {day} of {totalDays}
        </div>
      </div>

      <Scrubber
        day={day}
        totalDays={totalDays}
        onChange={scrubTo}
        signals={example.signals || []}
        earliestCatchDay={earliestCatchDay}
      />

      <Lanes
        day={day}
        totalDays={totalDays}
        attackerActions={attackerActions}
        visibleSignals={visibleSignals}
        controls={example.controls || []}
        activeControls={activeControls}
        controlFiringDays={controlFiringDays}
      />

      <ControlsPanel
        controls={example.controls || []}
        activeControls={activeControls}
        controlFiringDays={controlFiringDays}
        currentDay={day}
        onToggle={toggleControl}
      />

      <OutcomeStrip
        earliestCatchDay={earliestCatchDay}
        totalDays={totalDays}
        currentDay={day}
        activeControlCount={activeControls.size}
        scenarioTitle={example.scenarioTitle}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Header — eyebrow + title + subtitle. Matches the editorial frame
 * established by the kill-chain grid.
 * ───────────────────────────────────────────────────────────────────────── */
function Header({ viz }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 4, fontWeight: 600,
      }}>
        FA0001 · Positioning · F3-unique tactic
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
        letterSpacing: '-0.01em', marginBottom: 4,
      }}>
        {viz.title || 'How attackers wait — and what makes them visible'}
      </div>
      {viz.subtitle && (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          {viz.subtitle}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * ExampleTabs — picker for switching between scenarios when multiple
 * are configured. Hidden when only one example exists.
 * ───────────────────────────────────────────────────────────────────────── */
function ExampleTabs({ examples, activeIdx, onPick }) {
  return (
    <div style={{
      display: 'flex', gap: 6, marginBottom: 18,
      borderBottom: '1px solid var(--rule)', paddingBottom: 10,
    }}>
      {examples.map((ex, i) => {
        const active = i === activeIdx
        return (
          <button
            key={ex.scenarioId || i}
            onClick={() => onPick(i)}
            style={{
              padding: '6px 12px',
              background: active ? 'var(--paper)' : 'transparent',
              border: '1px solid',
              borderColor: active ? 'var(--accent)' : 'var(--rule)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: active ? 'var(--accent)' : 'var(--ink-soft)',
              fontWeight: active ? 600 : 400,
              transition: 'all var(--dur)',
            }}
          >
            {ex.tabLabel}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Scrubber — horizontal slider with day markers and signal-density
 * indicators. The two visual cues that matter:
 *   - Signal-day ticks above the slider show WHERE in time signals are
 *     concentrated (so the user can scrub to the meaningful day, not
 *     just slide blindly).
 *   - The earliestCatchDay marker shows where the user's selected
 *     controls would fire — gives immediate feedback on whether their
 *     control selection actually catches the attack early.
 * ───────────────────────────────────────────────────────────────────────── */
function Scrubber({ day, totalDays, onChange, signals, earliestCatchDay }) {
  const sigDays = [...new Set((signals || []).map(s => s.day))]
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}>
          Day <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{day}</span> of {totalDays}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--ink-faint)',
        }}>
          Drag to scrub through the positioning phase →
        </div>
      </div>

      {/* Signal-density ticks above the slider track */}
      <div style={{ position: 'relative', height: 14, marginBottom: 4 }}>
        {sigDays.map(d => (
          <div key={d} style={{
            position: 'absolute',
            left: `${(d / totalDays) * 100}%`,
            transform: 'translateX(-50%)',
            top: 0, height: 8, width: 2,
            background: 'var(--accent)', opacity: 0.5,
            borderRadius: 1,
          }} />
        ))}
        {earliestCatchDay != null && (
          <div style={{
            position: 'absolute',
            left: `${(earliestCatchDay / totalDays) * 100}%`,
            transform: 'translateX(-50%)',
            top: 8, fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--success)', fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            ↓ caught
          </div>
        )}
      </div>

      <input
        type="range" min={0} max={totalDays} step={1} value={day}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: 6,
          accentColor: 'var(--accent)',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Lanes — three horizontal lanes showing attacker actions, signals, and
 * controls firing. As the user scrubs, items animate into view at their
 * day position. Items at days greater than current cursor are hidden.
 * ───────────────────────────────────────────────────────────────────────── */
function Lanes({ day, totalDays, attackerActions, visibleSignals, controls, activeControls, controlFiringDays }) {
  return (
    <div style={{
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      marginBottom: 18,
      minHeight: 200,
    }}>
      <Lane
        label="Attacker"
        color="var(--danger)"
        items={attackerActions}
        totalDays={totalDays}
        renderItem={a => a.label}
      />
      <Lane
        label="Signals"
        color="var(--accent)"
        items={visibleSignals}
        totalDays={totalDays}
        renderItem={s => s.text}
      />
      <Lane
        label="Controls"
        color="var(--success)"
        items={
          controls
            .filter(c => activeControls.has(c.id))
            .filter(c => controlFiringDays[c.id] != null && controlFiringDays[c.id] <= day)
            .map(c => ({ ...c, day: controlFiringDays[c.id], label: `${c.shortLabel} fires` }))
        }
        totalDays={totalDays}
        renderItem={c => c.label}
        emptyHint={activeControls.size === 0 ? 'No defender controls active. Toggle one below to see when it fires.' : null}
      />
    </div>
  )
}

function Lane({ label, color, items, totalDays, renderItem, emptyHint }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '90px 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid color-mix(in srgb, var(--rule) 50%, transparent)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color, fontWeight: 600,
      }}>{label}</div>
      <div style={{ position: 'relative', minHeight: 28 }}>
        {items.length === 0 && emptyHint && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
            {emptyHint}
          </div>
        )}
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.id || `${label}-${i}-${item.day}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                left: `${Math.min(95, (item.day / totalDays) * 100)}%`,
                top: 0,
                transform: 'translateX(-4px)',
                background: 'var(--paper-hi)',
                border: `1px solid ${color}`,
                borderRadius: 'var(--radius)',
                padding: '4px 8px',
                fontSize: 11,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: 1,
              }}
              title={renderItem(item)}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                color: 'var(--ink-faint)', marginRight: 6,
              }}>D{item.day}</span>
              {renderItem(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * ControlsPanel — toggleable list of defender controls. Each control
 * shows its firing day if active; "would fire on day X" if not active.
 * The "would fire" hint lets the user reason about a control's value
 * without committing to it.
 * ───────────────────────────────────────────────────────────────────────── */
function ControlsPanel({ controls, activeControls, controlFiringDays, currentDay, onToggle }) {
  if (!controls.length) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 8,
      }}>
        Toggle controls — see when each would fire
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {controls.map(c => {
          const active = activeControls.has(c.id)
          const firingDay = controlFiringDays[c.id]
          const wouldFireBy = firingDay != null && firingDay <= currentDay
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                background: active ? 'var(--success-bg)' : 'var(--paper)',
                border: '1px solid',
                borderColor: active ? 'var(--success)' : 'var(--rule)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                color: 'var(--ink)',
                transition: 'all var(--dur)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: '1.5px solid',
                  borderColor: active ? 'var(--success)' : 'var(--rule-strong)',
                  background: active ? 'var(--success)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, marginBottom: 2 }}>
                    {c.shortLabel}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: firingDay == null
                      ? 'var(--ink-faint)'
                      : (active ? 'var(--success)' : 'var(--ink-soft)'),
                  }}>
                    {firingDay == null
                      ? 'No matching signals'
                      : (active && wouldFireBy)
                        ? `Fired on day ${firingDay}`
                        : `Would fire on day ${firingDay}`}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * OutcomeStrip — the big-letter feedback at the bottom. Three states:
 *   - No active controls: "attacker reaches execution undetected"
 *   - Active controls but earliestCatchDay > currentDay: "select controls
 *     fire later in the timeline — scrub forward to see"
 *   - Active controls fired by currentDay: "caught on day X — that's
 *     N days before execution"
 * ───────────────────────────────────────────────────────────────────────── */
function OutcomeStrip({ earliestCatchDay, totalDays, currentDay, activeControlCount, scenarioTitle }) {
  let bg = 'var(--paper)'
  let border = 'var(--rule)'
  let eyebrow = 'OUTCOME'
  let headline = ''
  let body = ''

  if (activeControlCount === 0) {
    bg = 'var(--danger-bg)'
    border = 'var(--danger)'
    eyebrow = 'NO CONTROLS ACTIVE'
    headline = 'Attacker reaches execution undetected'
    body = `Without any defender controls active, the attacker completes ${totalDays} days of positioning and proceeds to execution.`
  } else if (earliestCatchDay == null) {
    bg = 'var(--danger-bg)'
    border = 'var(--danger)'
    eyebrow = 'NOT CAUGHT'
    headline = 'Selected controls would not fire on this scenario'
    body = `${activeControlCount} control${activeControlCount === 1 ? '' : 's'} active, but none of them match the signals in this scenario. Try different controls.`
  } else if (earliestCatchDay > currentDay) {
    eyebrow = 'NOT YET'
    headline = `Selected controls fire on day ${earliestCatchDay}`
    body = `Scrub forward to day ${earliestCatchDay} to see them activate. You're at day ${currentDay}.`
  } else {
    bg = 'var(--success-bg)'
    border = 'var(--success)'
    eyebrow = 'CAUGHT EARLY'
    headline = `Caught on day ${earliestCatchDay} — ${totalDays - earliestCatchDay} day${totalDays - earliestCatchDay === 1 ? '' : 's'} before execution`
    body = `Active controls would have caught this positioning attack ${totalDays - earliestCatchDay} day${totalDays - earliestCatchDay === 1 ? '' : 's'} before the attacker proceeded to execution.`
  }

  return (
    <motion.div
      initial={false}
      animate={{ background: bg, borderColor: border }}
      transition={{ duration: 0.25 }}
      style={{
        padding: '14px 16px',
        border: '1px solid',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: border, fontWeight: 600, marginBottom: 4,
      }}>{eyebrow}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500,
        marginBottom: 4, color: 'var(--ink)',
      }}>{headline}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        {body}
      </div>
      {scenarioTitle && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginTop: 8, paddingTop: 8,
          borderTop: '1px solid color-mix(in srgb, currentColor 15%, transparent)',
        }}>From: <span style={{ color: 'var(--accent)' }}>{scenarioTitle}</span></div>
      )}
    </motion.div>
  )
}
