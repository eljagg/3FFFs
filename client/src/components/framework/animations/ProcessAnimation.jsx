import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────
   ProcessAnimation — v25.7.0.9

   Generic animation engine for technique process visualizations.
   Currently consumed by IVR Discovery (F1073). Designed to support
   future technique animations as new scene-data files plus an entry
   in the sidebar's ANIMATION_MAP.

   Props:
     scenes — object with { meta, stages, controls, signals, ivrMenu }
              (the default export from a scenes file like ivrDiscoveryScenes.js)

   Layout (three zones, left-to-right):
     ┌─────────────┬───────────────────────┬────────────────┐
     │ ATTACKER    │ IVR SYSTEM            │ BANK DEFENDER  │
     │ (notepad +  │ (caller ID, menu      │ (call counter, │
     │  call ctr)  │  tree, key-press log) │  alerts panel) │
     └─────────────┴───────────────────────┴────────────────┘
     [◀ Prev] [▶ Play] [Next ▶]   [0.5×] [1×] [2×]   Stage 1/7

     Detection controls (toggleable):
     ☐ ANI velocity from same /17 block
     ☐ Super-human navigation speed
     ☐ ...

   Pedagogical principles applied (from cognitive theory of multimedia
   learning research):
   - Learner control: play/pause/step/speed/replay all present
   - Captioning: each stage has explanatory text strip
   - Signaling: focal zone gets accent border + slight scale
   - Pacing: stage durations tuned to allow comprehension at 1x
   - Replay: always available, no auto-play-once trap
   - No autoplay on mount: user explicitly clicks play

   Interaction model:
   - Stage 1 renders on mount, paused, with a prominent "▶ Play" button
   - User can step through with prev/next buttons
   - Or click play to auto-advance through all 7 stages
   - Detection controls can be toggled at any time, change the visual
     state of the defender zone + show "would have flagged X of Y" callouts
   ───────────────────────────────────────────────────────────────────── */

export default function ProcessAnimation({ scenes, externalPauseSignal }) {
  const { meta, stages, controls, signals, ivrMenu } = scenes

  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeControls, setActiveControls] = useState(() => new Set())

  // v25.7.0.9.2: external pause hook. When the parent (sidebar) collapses
  // the animation section, it bumps externalPauseSignal — animation pauses
  // but retains its current stage. User clicks Play to resume.
  useEffect(() => {
    if (externalPauseSignal != null) {
      setIsPlaying(false)
    }
  }, [externalPauseSignal])

  const currentStage = stages[currentStageIdx]
  const isAtEnd = currentStageIdx >= stages.length - 1
  const isAtStart = currentStageIdx === 0

  // Map of signal-id → signal-object for O(1) lookup
  const signalById = useMemo(() => {
    const m = {}
    for (const s of signals) m[s.id] = s
    return m
  }, [signals])

  // Map of control-id → control-object
  const controlById = useMemo(() => {
    const m = {}
    for (const c of controls) m[c.id] = c
    return m
  }, [controls])

  /* ─── Playback timer ─────────────────────────────────────────────── */
  const timerRef = useRef(null)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    if (isAtEnd) {
      setIsPlaying(false)
      return
    }
    const duration = currentStage.durationMs / playbackSpeed
    timerRef.current = setTimeout(() => {
      setCurrentStageIdx(idx => Math.min(idx + 1, stages.length - 1))
    }, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStageIdx, playbackSpeed, currentStage, isAtEnd, stages.length])

  /* ─── Controls ─────────────────────────────────────────────────── */
  function togglePlay() {
    if (isAtEnd) {
      // Replay from start
      setCurrentStageIdx(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(p => !p)
    }
  }

  function stepNext() {
    if (isAtEnd) return
    setIsPlaying(false)
    setCurrentStageIdx(idx => Math.min(idx + 1, stages.length - 1))
  }

  function stepPrev() {
    if (isAtStart) return
    setIsPlaying(false)
    setCurrentStageIdx(idx => Math.max(idx - 1, 0))
  }

  function jumpToStart() {
    setIsPlaying(false)
    setCurrentStageIdx(0)
  }

  function toggleControl(controlId) {
    setActiveControls(prev => {
      const next = new Set(prev)
      if (next.has(controlId)) next.delete(controlId)
      else next.add(controlId)
      return next
    })
  }

  /* ─── Derived: which signals are currently revealed ──────────────── */
  // A signal is "revealed" when:
  //   1. The current stage's revealedSignalIds includes it, AND
  //   2. The control that reveals it is toggled on
  const revealedSignals = useMemo(() => {
    const stageSigs = currentStage.revealedSignalIds || []
    return stageSigs
      .map(id => signalById[id])
      .filter(s => s && activeControls.has(s.revealedBy))
  }, [currentStage, activeControls, signalById])

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div style={styles.wrap}>

      {/* Header strip */}
      <div style={styles.headerStrip}>
        <div style={styles.headerLeft}>
          <span style={styles.headerEyebrow}>How this technique works</span>
          <span style={styles.headerTitle}>{meta.techName}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.stageIndicator}>
            Stage {currentStageIdx + 1} / {stages.length}
          </span>
        </div>
      </div>

      {/* Stage caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStage.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          style={styles.captionStrip}
        >
          <div style={styles.captionLabel}>{currentStage.label}</div>
          <div style={styles.captionTitle}>{currentStage.title}</div>
          <div style={styles.captionText}>{currentStage.caption}</div>
        </motion.div>
      </AnimatePresence>

      {/* Three-zone canvas */}
      <div style={styles.canvas}>
        <ZoneAttacker
          state={currentStage.attackerZone}
          isFocal={currentStage.focalZone === 'attacker'}
        />
        <ZoneIVR
          state={currentStage.ivrZone}
          ivrMenu={ivrMenu}
          isFocal={currentStage.focalZone === 'ivr'}
        />
        <ZoneDefender
          state={currentStage.defenderZone}
          isFocal={currentStage.focalZone === 'defender'}
          revealedSignals={revealedSignals}
          activeControls={activeControls}
          controlById={controlById}
        />
      </div>

      {/* Playback controls */}
      <div style={styles.playbackBar}>
        <div style={styles.playbackLeft}>
          <PlaybackButton onClick={stepPrev} disabled={isAtStart} title="Previous stage">
            <span style={{ fontSize: 16 }}>◀</span>
          </PlaybackButton>
          <PlaybackButton
            onClick={togglePlay}
            primary
            title={isAtEnd ? 'Replay from start' : (isPlaying ? 'Pause' : 'Play')}
          >
            <span style={{ fontSize: 14 }}>
              {isAtEnd ? '↻ Replay' : (isPlaying ? '❚❚ Pause' : '▶ Play')}
            </span>
          </PlaybackButton>
          <PlaybackButton onClick={stepNext} disabled={isAtEnd} title="Next stage">
            <span style={{ fontSize: 16 }}>▶</span>
          </PlaybackButton>
          {!isAtStart && (
            <PlaybackButton onClick={jumpToStart} title="Restart">
              <span style={{ fontSize: 12 }}>⤺</span>
            </PlaybackButton>
          )}
        </div>
        <div style={styles.playbackRight}>
          <span style={styles.speedLabel}>SPEED</span>
          {[0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                ...styles.speedButton,
                ...(playbackSpeed === s ? styles.speedButtonActive : {}),
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Detection controls */}
      <div style={styles.controlsSection}>
        <div style={styles.controlsHeader}>
          <span style={styles.controlsHeaderLabel}>Detection controls</span>
          <span style={styles.controlsHeaderHint}>
            Toggle to reveal hidden signals in the defender view
          </span>
        </div>
        <div style={styles.controlsGrid}>
          {controls.map(c => (
            <ControlToggle
              key={c.id}
              control={c}
              active={activeControls.has(c.id)}
              onToggle={() => toggleControl(c.id)}
            />
          ))}
        </div>
      </div>

    </div>
  )
}


/* ─── Subcomponent: Attacker Zone ────────────────────────────────────── */
function ZoneAttacker({ state, isFocal }) {
  return (
    <ZoneFrame title="Attacker" isFocal={isFocal} accentColor="var(--accent)">
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Notepad</div>
        <div style={styles.notepad}>
          <AnimatePresence mode="popLayout">
            {state.notepad.map((row, i) => (
              <motion.div
                key={row.label}
                layout
                initial={row.justAdded ? { opacity: 0, x: -8 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: row.justAdded ? 0.15 : 0 }}
                style={{
                  ...styles.notepadRow,
                  ...(row.confirmed ? styles.notepadRowConfirmed : {}),
                  ...(row.highlight ? styles.notepadRowHighlight : {}),
                  ...(row.hint ? styles.notepadRowHint : {}),
                }}
              >
                <span style={styles.notepadLabel}>{row.label}</span>
                <span style={styles.notepadValue}>{row.value}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Calls placed</div>
        <motion.div
          key={state.callsPlaced}
          initial={{ scale: 1.15, color: 'var(--accent-hi, #d66e5a)' }}
          animate={{ scale: 1, color: 'var(--ink)' }}
          transition={{ duration: 0.4 }}
          style={styles.bigCounter}
        >
          {state.callsPlaced}
        </motion.div>
        <div style={styles.activityChip}>
          {ATTACKER_ACTIVITY_LABEL[state.activity] || state.activity}
        </div>
      </div>

      {state.cascadeAnimation && <CascadeAnimation />}
    </ZoneFrame>
  )
}

const ATTACKER_ACTIVITY_LABEL = {
  planning:    'PLANNING',
  probing:     'PROBING THE IVR',
  mining:      'MINING DATA',
  industrial:  'INDUSTRIAL SCALE',
  complete:    'RECON COMPLETE',
}

/* ─── Subcomponent: IVR Zone ─────────────────────────────────────────── */
function ZoneIVR({ state, ivrMenu, isFocal }) {
  return (
    <ZoneFrame title="IVR System" isFocal={isFocal} accentColor="#6b8e5a" cream>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabelCream}>Caller ID</div>
        {state.callerIdShown ? (
          <motion.div
            key={state.callerId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.callerIdDisplay}
          >
            ☎ {state.callerId}
          </motion.div>
        ) : (
          <div style={styles.callerIdEmpty}>— No active call —</div>
        )}
      </div>

      {/* Menu tree */}
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabelCream}>Menu</div>
        <div style={styles.menuTree}>
          {ivrMenu.map(item => {
            const isActive = state.activeMenuKey === item.key
            const wasTraversed = (state.pathTraversed || []).includes(item.key)
            return (
              <motion.div
                key={item.key}
                animate={{
                  background: isActive
                    ? 'rgba(107, 142, 90, 0.25)'
                    : wasTraversed
                      ? 'rgba(107, 142, 90, 0.10)'
                      : 'transparent',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {}),
                }}
              >
                <span style={styles.menuKey}>{item.key}</span>
                <span style={styles.menuLabel}>{item.label}</span>
                {item.authRequired && (
                  <span style={styles.menuAuthChip}>auth</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Audio waveform — pulses when call is active */}
      {state.isCallActive && <AudioWaveform />}

      {/* Prompt text */}
      {state.promptText && (
        <motion.div
          key={state.promptText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={styles.promptBubble}
        >
          <span style={styles.promptBubbleQuote}>"</span>
          {state.promptText}
          <span style={styles.promptBubbleQuote}>"</span>
        </motion.div>
      )}

      {/* Call duration */}
      {state.callDurationMs != null && (
        <div style={styles.callDuration}>
          Call duration: {(state.callDurationMs / 1000).toFixed(0)}s
        </div>
      )}

      {state.surgeAnimation && <SurgeAnimation />}
    </ZoneFrame>
  )
}

/* ─── Subcomponent: Defender Zone ────────────────────────────────────── */
function ZoneDefender({ state, isFocal, revealedSignals, activeControls, controlById }) {
  return (
    <ZoneFrame title="Bank fraud monitoring" isFocal={isFocal} accentColor="var(--warning, #c79a3a)">
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Today</div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>Calls received</span>
          <motion.span
            key={state.callsToday}
            initial={{ color: 'var(--accent-hi, #d66e5a)' }}
            animate={{ color: 'var(--ink)' }}
            transition={{ duration: 0.5 }}
            style={styles.statValue}
          >
            {state.callsToday}
          </motion.span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>Unique ANIs</span>
          <span style={styles.statValue}>{state.uniqueAniToday}</span>
        </div>
        {state.avgCallDuration != null && (
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Avg call duration</span>
            <span style={styles.statValue}>
              {(state.avgCallDuration / 1000).toFixed(0)}s
            </span>
          </div>
        )}
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Alerts</div>
        <motion.div
          animate={{
            color: state.alertsToday === 0
              ? 'var(--ink-faint)'
              : 'var(--accent-hi, #d66e5a)',
          }}
          style={{
            ...styles.bigCounter,
            color: state.alertsToday === 0 ? 'var(--ink-faint)' : 'var(--accent-hi, #d66e5a)',
          }}
        >
          {state.alertsToday}
        </motion.div>
        {state.alertsToday === 0 && (
          <div style={styles.silentBadge}>SILENT</div>
        )}
      </div>

      {/* Hidden signals — only render those currently revealed */}
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>
          Hidden signals
          {revealedSignals.length > 0 && (
            <span style={styles.signalCount}>
              {' '}· {revealedSignals.length} surfaced
            </span>
          )}
        </div>
        <AnimatePresence>
          {revealedSignals.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.signalsEmpty}
            >
              {activeControls.size === 0
                ? 'Toggle a control below to surface hidden signals.'
                : 'No signals matching active controls at this stage.'}
            </motion.div>
          ) : (
            revealedSignals.map(s => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3 }}
                style={styles.signalRow}
              >
                <div style={styles.signalLabel}>{s.label}</div>
                <div style={styles.signalDesc}>{s.description}</div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Final-stage headline */}
      {state.finalHeadline && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.finalHeadline}
        >
          {state.finalHeadline}
        </motion.div>
      )}
    </ZoneFrame>
  )
}

/* ─── Zone frame wrapper ───────────────────────────────────────────── */
function ZoneFrame({ title, children, isFocal, accentColor, cream }) {
  return (
    <motion.div
      animate={{
        // v25.7.0.9.1: brighter focal-zone signaling per testing feedback.
        // v25.7.0.9.2: slightly brighter still per follow-up — scale 1.020,
        // outer glow opacity 60 (was 40). Border stays 3px, pulse stays
        // at 1.6s, ACTIVE label stays. Subtle bump, not a redesign.
        scale: isFocal ? 1.020 : 1,
        boxShadow: isFocal
          ? `0 0 0 3px ${accentColor},
             0 0 28px ${accentColor}60,
             inset 0 0 0 1px ${accentColor}40,
             0 4px 16px rgba(0, 0, 0, 0.2)`
          : '0 0 0 1px var(--rule)',
      }}
      transition={{ duration: 0.3 }}
      style={{
        ...styles.zoneFrame,
        ...(cream ? styles.zoneFrameCream : {}),
        // Position relative so the ACTIVE badge can absolute-position
        // inside the zone frame
        position: 'relative',
      }}
    >
      <div style={{
        ...(cream ? styles.zoneTitleCream : styles.zoneTitle),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>{title}</span>
        {/* v25.7.0.9.1: ACTIVE indicator — small pulsing dot + label
            that gives an explicit verbal cue alongside the visual
            border. Lands better for users whose eyes don't catch
            subtle border changes. Low-intensity heartbeat per Q-2. */}
        {isFocal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              fontWeight: 700,
              color: accentColor,
            }}
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: accentColor,
                display: 'inline-block',
              }}
            />
            <span>ACTIVE</span>
          </motion.div>
        )}
      </div>
      <div style={styles.zoneBody}>{children}</div>
    </motion.div>
  )
}

/* ─── Audio waveform (decorative — pulses when call active) ────────── */
function AudioWaveform() {
  return (
    <div style={styles.waveformContainer} aria-hidden="true">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.3, 1, 0.5, 0.8, 0.3] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
          style={styles.waveformBar}
        />
      ))}
    </div>
  )
}

/* ─── Cascade animation (stage 6: 50 calls in rapid succession) ────── */
function CascadeAnimation() {
  return (
    <div style={styles.cascadeContainer} aria-hidden="true">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: [0, 1, 0], y: [0, 60] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'linear',
          }}
          style={styles.cascadeRow}
        />
      ))}
    </div>
  )
}

/* ─── Surge animation (stage 6: cycling spoofed caller IDs) ────────── */
function SurgeAnimation() {
  const FAKE_NUMBERS = [
    '+1 876 555 1142', '+1 876 555 8830', '+1 876 555 6612',
    '+1 876 555 9201', '+1 876 555 4477', '+1 876 555 2240',
    '+1 876 555 7716', '+1 876 555 0823',
  ]
  return (
    <div style={styles.surgeContainer}>
      <div style={styles.surgeLabel}>SPOOFED ANI ROTATION</div>
      <div style={styles.surgeTrack}>
        {FAKE_NUMBERS.map((n, i) => (
          <motion.div
            key={n}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
            }}
            style={styles.surgeNumber}
          >
            {n}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Playback button ──────────────────────────────────────────────── */
function PlaybackButton({ onClick, disabled, primary, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles.playbackButton,
        ...(primary ? styles.playbackButtonPrimary : {}),
        ...(disabled ? styles.playbackButtonDisabled : {}),
      }}
    >
      {children}
    </button>
  )
}

/* ─── Control toggle ───────────────────────────────────────────────── */
function ControlToggle({ control, active, onToggle }) {
  const naive = control.naive
  return (
    <button
      onClick={onToggle}
      style={{
        ...styles.controlToggle,
        ...(active ? (naive ? styles.controlToggleActiveNaive : styles.controlToggleActive) : {}),
      }}
    >
      <div style={styles.controlToggleHeader}>
        <span style={{
          ...styles.controlCheckbox,
          ...(active ? styles.controlCheckboxActive : {}),
        }}>
          {active ? '✓' : ''}
        </span>
        <span style={styles.controlLabel}>{control.label}</span>
        {naive && <span style={styles.naiveBadge}>NAIVE</span>}
      </div>
      <div style={styles.controlMeta}>{control.meta}</div>
      {active && !naive && control.catchTotal > 0 && (
        <div style={styles.controlCallout}>
          Would have flagged {control.catchCount} of {control.catchTotal} calls
        </div>
      )}
      {active && naive && (
        <div style={styles.controlCalloutNaive}>
          No match — pattern works around this control
        </div>
      )}
    </button>
  )
}


/* ─── Styles ──────────────────────────────────────────────────────────── */
const styles = {
  wrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  /* Header */
  headerStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 12,
    borderBottom: '1px solid var(--rule)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  headerEyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 500,
    color: 'var(--ink)',
  },
  headerRight: {},
  stageIndicator: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },

  /* Caption */
  captionStrip: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderLeft: '3px solid var(--accent)',
    borderRadius: 6,
    padding: '14px 18px',
  },
  captionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
    marginBottom: 4,
  },
  captionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 17,
    fontWeight: 500,
    lineHeight: 1.25,
    color: 'var(--ink)',
    marginBottom: 6,
  },
  captionText: {
    fontSize: 13.5,
    lineHeight: 1.6,
    color: 'var(--ink-soft)',
  },

  /* Three-zone canvas */
  canvas: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1fr) minmax(280px, 1.3fr) minmax(220px, 1fr)',
    gap: 10,
    minHeight: 420,
  },

  zoneFrame: {
    background: 'var(--paper-hi)',
    borderRadius: 8,
    padding: '14px 14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
  },
  zoneFrameCream: {
    background: '#f5ede0', // cream banking-CRM palette
    color: '#1a1512',
  },
  zoneTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
    paddingBottom: 8,
    borderBottom: '1px solid var(--rule)',
  },
  zoneTitleCream: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#6b5d4a',
    fontWeight: 600,
    paddingBottom: 8,
    borderBottom: '1px solid #d8cfbd',
  },
  zoneBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  zoneSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  zoneSectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  zoneSectionLabelCream: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#6b5d4a',
    fontWeight: 600,
  },

  /* Notepad (attacker zone) */
  notepad: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  notepadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '5px 8px',
    borderRadius: 4,
    background: 'var(--paper-dim)',
    border: '1px solid var(--rule)',
    gap: 8,
  },
  notepadRowConfirmed: {
    borderColor: 'rgba(107, 142, 90, 0.3)',
    background: 'rgba(107, 142, 90, 0.06)',
  },
  notepadRowHighlight: {
    borderColor: 'rgba(184, 81, 61, 0.4)',
    background: 'rgba(184, 81, 61, 0.10)',
  },
  notepadRowHint: {
    borderStyle: 'dashed',
    background: 'transparent',
    fontStyle: 'italic',
  },
  notepadLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.06em',
    color: 'var(--ink-faint)',
    flexShrink: 0,
  },
  notepadValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--ink)',
    fontWeight: 500,
    textAlign: 'right',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  /* Counters */
  bigCounter: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 500,
    color: 'var(--ink)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  activityChip: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 3,
    fontWeight: 600,
    background: 'rgba(184, 81, 61, 0.15)',
    color: 'var(--accent-hi, #d66e5a)',
    alignSelf: 'flex-start',
  },

  /* IVR zone — caller ID */
  callerIdDisplay: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: '#1a1512',
    fontWeight: 500,
    padding: '8px 10px',
    background: '#fffdf8',
    borderRadius: 4,
    border: '1px solid #d8cfbd',
  },
  callerIdEmpty: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#9a8e78',
    fontStyle: 'italic',
    padding: '8px 0',
  },

  /* Menu tree */
  menuTree: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid transparent',
    transition: 'border-color 200ms',
  },
  menuItemActive: {
    borderColor: 'rgba(107, 142, 90, 0.5)',
  },
  menuKey: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    color: '#6b8e5a',
    minWidth: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 12,
    color: '#1a1512',
  },
  menuAuthChip: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '1px 5px',
    borderRadius: 2,
    background: 'rgba(199, 154, 58, 0.2)',
    color: '#8c6e2a',
    fontWeight: 600,
  },

  /* Audio waveform */
  waveformContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    height: 28,
    padding: '4px 0',
  },
  waveformBar: {
    width: 3,
    height: 18,
    background: '#6b8e5a',
    borderRadius: 1,
    transformOrigin: 'center',
  },

  /* Prompt bubble */
  promptBubble: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#5a4a35',
    lineHeight: 1.4,
    position: 'relative',
  },
  promptBubbleQuote: {
    color: '#9a8e78',
    fontWeight: 700,
    margin: '0 2px',
  },
  callDuration: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: '#6b5d4a',
    letterSpacing: '0.06em',
    textAlign: 'right',
  },

  /* Defender zone — stats */
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '4px 0',
  },
  statLabel: {
    fontSize: 11.5,
    color: 'var(--ink-faint)',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--ink)',
  },
  silentBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.16em',
    color: 'var(--ink-faint)',
    fontWeight: 600,
    padding: '3px 8px',
    border: '1px solid var(--rule)',
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },

  /* Hidden signals */
  signalCount: {
    color: 'var(--accent-hi, #d66e5a)',
    fontWeight: 600,
  },
  signalsEmpty: {
    fontSize: 11.5,
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    padding: '6px 0',
    lineHeight: 1.5,
  },
  signalRow: {
    padding: '8px 10px',
    background: 'rgba(199, 154, 58, 0.08)',
    border: '1px solid rgba(199, 154, 58, 0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  signalLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--warning, #c79a3a)',
    fontWeight: 600,
    marginBottom: 3,
  },
  signalDesc: {
    fontSize: 11.5,
    color: 'var(--ink-soft)',
    lineHeight: 1.5,
  },

  finalHeadline: {
    background: 'rgba(184, 81, 61, 0.08)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    padding: '12px 14px',
    fontSize: 12.5,
    fontStyle: 'italic',
    color: 'var(--accent-hi, #d66e5a)',
    lineHeight: 1.5,
    marginTop: 6,
  },

  /* Cascade & surge animations */
  cascadeContainer: {
    position: 'relative',
    height: 60,
    overflow: 'hidden',
    borderRadius: 4,
    background: 'rgba(184, 81, 61, 0.04)',
    marginTop: 8,
  },
  cascadeRow: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: 4,
    background: 'rgba(184, 81, 61, 0.4)',
    borderRadius: 2,
  },

  surgeContainer: {
    marginTop: 4,
    background: 'rgba(255, 252, 242, 0.6)',
    border: '1px solid #d8cfbd',
    borderRadius: 4,
    padding: '6px 10px',
  },
  surgeLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8.5,
    letterSpacing: '0.16em',
    color: '#6b5d4a',
    fontWeight: 600,
    marginBottom: 4,
  },
  surgeTrack: {
    position: 'relative',
    height: 18,
    overflow: 'hidden',
  },
  surgeNumber: {
    position: 'absolute',
    top: 0,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#1a1512',
    fontWeight: 500,
  },

  /* Playback bar */
  playbackBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    flexWrap: 'wrap',
    gap: 12,
  },
  playbackLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  playbackRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  playbackButton: {
    minWidth: 38,
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--rule-strong, #3a302a)',
    borderRadius: 4,
    color: 'var(--ink)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    transition: 'all 150ms',
  },
  playbackButtonPrimary: {
    background: 'var(--accent)',
    color: 'var(--paper)',
    fontWeight: 600,
    minWidth: 96,
    borderColor: 'var(--accent)',
  },
  playbackButtonDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  speedLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.14em',
    color: 'var(--ink-faint)',
    fontWeight: 600,
    marginRight: 4,
  },
  speedButton: {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid var(--rule)',
    borderRadius: 3,
    color: 'var(--ink-soft)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    transition: 'all 150ms',
  },
  speedButtonActive: {
    background: 'var(--accent)',
    color: 'var(--paper)',
    borderColor: 'var(--accent)',
  },

  /* Controls section */
  controlsSection: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    padding: '14px',
  },
  controlsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  controlsHeaderLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  controlsHeaderHint: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: 'var(--ink-faint)',
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 8,
  },
  controlToggle: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 5,
    padding: '10px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
    font: 'inherit',
    transition: 'all 150ms',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  controlToggleActive: {
    borderColor: 'var(--warning, #c79a3a)',
    background: 'rgba(199, 154, 58, 0.08)',
  },
  controlToggleActiveNaive: {
    borderColor: 'var(--ink-faint)',
    background: 'var(--paper-dim)',
    opacity: 0.7,
  },
  controlToggleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  controlCheckbox: {
    width: 16,
    height: 16,
    border: '1.5px solid var(--rule-strong, #3a302a)',
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: 'var(--paper)',
    fontWeight: 700,
    flexShrink: 0,
  },
  controlCheckboxActive: {
    background: 'var(--warning, #c79a3a)',
    borderColor: 'var(--warning, #c79a3a)',
  },
  controlLabel: {
    flex: 1,
    fontSize: 13,
    color: 'var(--ink)',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  naiveBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8.5,
    letterSpacing: '0.14em',
    padding: '2px 5px',
    borderRadius: 2,
    background: 'var(--paper-dim)',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  controlMeta: {
    fontSize: 11,
    color: 'var(--ink-faint)',
    lineHeight: 1.4,
    paddingLeft: 24,
  },
  controlCallout: {
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--warning, #c79a3a)',
    paddingLeft: 24,
    marginTop: 2,
  },
  controlCalloutNaive: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: 'var(--ink-faint)',
    paddingLeft: 24,
    marginTop: 2,
  },
}
