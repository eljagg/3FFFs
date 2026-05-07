import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { engineStyles } from './ProcessAnimation.jsx'

/* ─────────────────────────────────────────────────────────────────────────
   MultiActorSequenceAnimation — v25.7.0.12

   Animation engine for multi-actor temporal flows where the lesson is in
   how messages/transactions/events pass between distinct actors over time.

   Third engine alongside ProcessAnimation (3-zone) and TimelineThresholdAnimation
   (timeline+threshold case-review).

   Shape:
     - N vertical actor lanes (typically 3-5 actors) labeled at the top
     - Time flows downward
     - Messages render as labeled arrows between actor lanes
     - Each stage advances messages and/or actor states
     - A "current time" indicator scrolls down as stages progress
     - Actor state badges (e.g., "compromised", "alerted", "unaware") under each lane

   Why a separate engine:
     The phishing flow has 4 actors (Fraudster / Victim / Bank / Mule) over
     ~7 stages with messages passing between them. ProcessAnimation's three-zone
     attacker/middle/defender pattern doesn't capture multi-actor dynamics.
     TimelineThresholdAnimation's two-character case-review doesn't model
     temporal message-passing.

   Scene config shape:
     {
       meta: { techId, techName, ... },
       engine: 'multi-actor-sequence',
       actors: [
         { id, name, role, lane, initialState: 'unaware' | 'compromised' | ... },
         ...
       ],
       stages: [{
         id, label, title, caption, durationMs,
         messages: [
           { id, fromActor, toActor, label, kind: 'sms' | 'http' | 'transfer' | 'callback' | 'notification',
             tooltip?, suspicious?: boolean }
         ],
         actorStateChanges?: { actorId: newState, ... },
         revealedSignalIds: [...],
         finalHeadline?,
       }],
       controls: [...],
       signals: [...],
     }

   Each rendered stage shows ALL accumulated messages from stages 1..current,
   so the trainee sees the full attack history grow over time. Actor states
   show the latest state at the current stage.
   ───────────────────────────────────────────────────────────────────── */

export default function MultiActorSequenceAnimation({ scenes, externalPauseSignal }) {
  const { meta, stages, controls, signals, actors } = scenes

  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeControls, setActiveControls] = useState(() => new Set())

  // External pause hook
  useEffect(() => {
    if (externalPauseSignal != null) setIsPlaying(false)
  }, [externalPauseSignal])

  const currentStage = stages[currentStageIdx]
  const isAtEnd = currentStageIdx >= stages.length - 1
  const isAtStart = currentStageIdx === 0

  const signalById = useMemo(() => {
    const m = {}
    for (const s of signals) m[s.id] = s
    return m
  }, [signals])

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

  function togglePlay() {
    if (isAtEnd) {
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

  /* ─── Derived: actor states (latest at current stage) ──────────── */
  const actorStates = useMemo(() => {
    const states = {}
    for (const a of actors) states[a.id] = a.initialState || 'unaware'
    for (let i = 0; i <= currentStageIdx; i++) {
      const changes = stages[i].actorStateChanges || {}
      for (const [actorId, newState] of Object.entries(changes)) {
        states[actorId] = newState
      }
    }
    return states
  }, [actors, stages, currentStageIdx])

  /* ─── Derived: accumulated messages through current stage ──────── */
  const accumulatedMessages = useMemo(() => {
    const msgs = []
    for (let i = 0; i <= currentStageIdx; i++) {
      const stageMsgs = stages[i].messages || []
      for (const m of stageMsgs) {
        msgs.push({ ...m, stageIdx: i, isCurrent: i === currentStageIdx })
      }
    }
    return msgs
  }, [stages, currentStageIdx])

  /* ─── Derived: revealed signals at current stage with active controls ─ */
  const revealedSignals = useMemo(() => {
    const stageSigs = currentStage.revealedSignalIds || []
    return stageSigs
      .map(id => signalById[id])
      .filter(s => s && activeControls.has(s.revealedBy))
  }, [currentStage, activeControls, signalById])

  return (
    <div style={engineStyles.wrap}>
      {/* Header strip */}
      <div style={engineStyles.headerStrip}>
        <div style={engineStyles.headerLeft}>
          <span style={engineStyles.headerEyebrow}>How this technique works</span>
          <span style={engineStyles.headerTitle}>{meta.techName}</span>
        </div>
        <div style={engineStyles.headerRight}>
          <span style={engineStyles.stageIndicator}>
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
          style={engineStyles.captionStrip}
        >
          <span style={engineStyles.captionLabel}>{currentStage.label}</span>
          <div style={engineStyles.captionTitle}>{currentStage.title}</div>
          <div style={engineStyles.captionText}>{currentStage.caption}</div>
        </motion.div>
      </AnimatePresence>

      {/* Sequence diagram canvas */}
      <SequenceDiagramCanvas
        actors={actors}
        accumulatedMessages={accumulatedMessages}
        actorStates={actorStates}
        currentStageIdx={currentStageIdx}
        totalStages={stages.length}
      />

      {/* Playback controls */}
      <div style={engineStyles.playbackBar}>
        <div style={engineStyles.playbackLeft}>
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
        <div style={engineStyles.playbackRight}>
          <span style={engineStyles.speedLabel}>SPEED</span>
          {[0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              style={{
                ...engineStyles.speedButton,
                ...(playbackSpeed === s ? engineStyles.speedButtonActive : {}),
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Revealed signals strip */}
      <RevealedSignalsStrip
        revealedSignals={revealedSignals}
        activeControlsSize={activeControls.size}
        finalHeadline={currentStage.finalHeadline}
      />

      {/* Detection controls */}
      <div style={engineStyles.controlsSection}>
        <div style={engineStyles.controlsHeader}>
          <span style={engineStyles.controlsHeaderLabel}>Detection controls</span>
          <span style={engineStyles.controlsHeaderHint}>
            Toggle to reveal hidden signals at this stage
          </span>
        </div>
        <div style={engineStyles.controlsGrid}>
          {controls.map(c => {
            const hasActiveSignal = revealedSignals.some(s => s.revealedBy === c.id)
            return (
              <ControlToggle
                key={c.id}
                control={c}
                active={activeControls.has(c.id)}
                onToggle={() => toggleControl(c.id)}
                hasActiveSignalAtCurrentStage={hasActiveSignal}
                stageLabels={stages.map(s => s.label)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}


/* ─── SequenceDiagramCanvas — the actual diagram ──────────────────── */
function SequenceDiagramCanvas({ actors, accumulatedMessages, actorStates, currentStageIdx, totalStages }) {
  // Layout
  const CANVAS_WIDTH = 1100
  const ACTOR_HEADER_HEIGHT = 70
  const MARGIN_TOP = 90
  const MARGIN_BOTTOM = 30
  const MESSAGE_ROW_HEIGHT = 56
  const ACTOR_LANE_GAP = (CANVAS_WIDTH - 80) / Math.max(actors.length - 1, 1)
  const ACTOR_LANE_X = (idx) => 40 + idx * ACTOR_LANE_GAP

  // Vertical position for each message — based on its position in the sequence
  const MESSAGE_Y = (idx) => MARGIN_TOP + idx * MESSAGE_ROW_HEIGHT
  const totalCanvasHeight = MARGIN_TOP + Math.max(accumulatedMessages.length, 1) * MESSAGE_ROW_HEIGHT + MARGIN_BOTTOM

  // Actor state colors
  const STATE_COLORS = {
    'unaware':      { bg: 'rgba(107, 142, 90, 0.12)', text: '#4d6e42', border: '#6b8e5a' },
    'aware':        { bg: 'rgba(74, 122, 153, 0.12)', text: '#3d5e75', border: '#5a8a9a' },
    'targeted':     { bg: 'rgba(199, 154, 58, 0.12)', text: '#8a6a20', border: '#c79a3a' },
    'compromised':  { bg: 'rgba(161, 64, 64, 0.14)', text: '#a14040', border: '#a14040' },
    'alerted':      { bg: 'rgba(74, 122, 153, 0.20)', text: '#3d5e75', border: '#5a8a9a' },
    'investigating':{ bg: 'rgba(184, 81, 61, 0.14)', text: 'var(--accent)', border: 'var(--accent)' },
    'silent':       { bg: 'rgba(143, 143, 143, 0.10)', text: '#666', border: '#999' },
    'active':       { bg: 'rgba(199, 154, 58, 0.18)', text: '#8a6a20', border: '#c79a3a' },
  }

  // Message kind colors
  const MESSAGE_KIND_COLORS = {
    'sms':           '#7a6dad',
    'http':          '#5a8a9a',
    'transfer':      '#a14040',
    'callback':      '#5a8a9a',
    'notification':  '#6b8e5a',
    'system':        '#666',
    'physical':      '#8a6a20',
  }

  return (
    <div style={maStyles.canvasWrap}>
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${totalCanvasHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMin meet"
      >
        {/* Actor lanes (vertical lines) */}
        {actors.map((actor, idx) => {
          const x = ACTOR_LANE_X(idx)
          return (
            <line
              key={actor.id}
              x1={x}
              y1={ACTOR_HEADER_HEIGHT}
              x2={x}
              y2={totalCanvasHeight - 10}
              stroke="var(--rule)"
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity="0.5"
            />
          )
        })}

        {/* Actor headers */}
        {actors.map((actor, idx) => {
          const x = ACTOR_LANE_X(idx)
          const state = actorStates[actor.id]
          const stateColors = STATE_COLORS[state] || STATE_COLORS['unaware']
          return (
            <g key={`hdr-${actor.id}`}>
              {/* Actor name + role */}
              <text x={x} y={20} textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 600,
                  fill: 'var(--ink)',
                }}>
                {actor.name}
              </text>
              <text x={x} y={36} textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  fill: 'var(--ink-soft)',
                  fontStyle: 'italic',
                }}>
                {actor.role}
              </text>
              {/* State badge */}
              <rect
                x={x - 50}
                y={45}
                width={100}
                height={18}
                rx={3}
                fill={stateColors.bg}
                stroke={stateColors.border}
                strokeWidth="1"
              />
              <text x={x} y={58} textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  fill: stateColors.text,
                }}>
                {state}
              </text>
            </g>
          )
        })}

        {/* Messages */}
        {accumulatedMessages.map((msg, idx) => {
          const fromIdx = actors.findIndex(a => a.id === msg.fromActor)
          const toIdx = actors.findIndex(a => a.id === msg.toActor)
          if (fromIdx < 0 || toIdx < 0) return null

          const x1 = ACTOR_LANE_X(fromIdx)
          const x2 = ACTOR_LANE_X(toIdx)
          const y = MESSAGE_Y(idx)
          const isSelf = fromIdx === toIdx
          const direction = x2 >= x1 ? 1 : -1
          const arrowSize = 6
          const color = MESSAGE_KIND_COLORS[msg.kind] || '#666'
          const isCurrent = msg.isCurrent
          const opacity = isCurrent ? 1 : 0.55

          return (
            <motion.g
              key={msg.id}
              initial={{ opacity: 0, x: direction * -20 }}
              animate={{ opacity, x: 0 }}
              transition={{ duration: 0.4, delay: isCurrent ? idx * 0.02 : 0 }}
            >
              {isSelf ? (
                // Self-message — small loop on the actor's own lane
                <>
                  <path
                    d={`M ${x1} ${y - 8} q 30 -4 30 14 q 0 14 -30 8`}
                    fill="none"
                    stroke={color}
                    strokeWidth={isCurrent ? 2 : 1.5}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${x1},${y + 14} ${x1 - arrowSize},${y + 14 - arrowSize / 2} ${x1 - arrowSize},${y + 14 + arrowSize / 2}`}
                    fill={color}
                  />
                  <text x={x1 + 38} y={y + 4}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fill: msg.suspicious ? '#a14040' : 'var(--ink-soft)',
                      fontStyle: msg.suspicious ? 'italic' : 'normal',
                    }}>
                    {msg.label}
                  </text>
                </>
              ) : (
                // Cross-lane message — arrow with label centered above
                <>
                  <line
                    x1={x1}
                    y1={y}
                    x2={x2 - direction * (arrowSize + 1)}
                    y2={y}
                    stroke={color}
                    strokeWidth={isCurrent ? 2.2 : 1.5}
                    strokeDasharray={msg.kind === 'system' ? '4 3' : 'none'}
                  />
                  <polygon
                    points={`${x2},${y} ${x2 - direction * arrowSize},${y - arrowSize / 2} ${x2 - direction * arrowSize},${y + arrowSize / 2}`}
                    fill={color}
                  />
                  {/* Label centered between actors, above arrow */}
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 8}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fill: msg.suspicious ? '#a14040' : 'var(--ink)',
                      fontStyle: msg.suspicious ? 'italic' : 'normal',
                      fontWeight: msg.suspicious ? 600 : 500,
                    }}
                  >
                    {msg.label}
                  </text>
                  {msg.tooltip && (
                    <text
                      x={(x1 + x2) / 2}
                      y={y + 16}
                      textAnchor="middle"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fill: 'var(--ink-faint)',
                      }}
                    >
                      {msg.tooltip}
                    </text>
                  )}
                </>
              )}
            </motion.g>
          )
        })}

        {/* "Current time" indicator on the right edge */}
        {accumulatedMessages.length > 0 && (
          <g>
            <line
              x1={20}
              y1={MESSAGE_Y(accumulatedMessages.length - 1) + 24}
              x2={CANVAS_WIDTH - 20}
              y2={MESSAGE_Y(accumulatedMessages.length - 1) + 24}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="2 6"
              opacity="0.4"
            />
            <text
              x={CANVAS_WIDTH - 20}
              y={MESSAGE_Y(accumulatedMessages.length - 1) + 36}
              textAnchor="end"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fill: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              ↑ Stage {currentStageIdx + 1} of {totalStages} ↑
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}


/* ─── RevealedSignalsStrip ──────────────────────────────────────── */
function RevealedSignalsStrip({ revealedSignals, activeControlsSize, finalHeadline }) {
  if (revealedSignals.length === 0 && !finalHeadline) {
    if (activeControlsSize === 0) return null
    return (
      <div style={maStyles.signalsStrip}>
        <div style={maStyles.signalsHeader}>
          <span style={engineStyles.zoneSectionLabel}>Hidden signals</span>
        </div>
        <div style={engineStyles.signalsEmpty}>
          No signals matching active controls at this stage.
        </div>
      </div>
    )
  }
  return (
    <div style={maStyles.signalsStrip}>
      {revealedSignals.length > 0 && (
        <>
          <div style={maStyles.signalsHeader}>
            <span style={engineStyles.zoneSectionLabel}>
              Hidden signals
              <span style={engineStyles.signalCount}>
                {' '}· {revealedSignals.length} surfaced
              </span>
            </span>
          </div>
          <AnimatePresence>
            {revealedSignals.map(s => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3 }}
                style={engineStyles.signalRow}
              >
                <div style={engineStyles.signalLabel}>{s.label}</div>
                <div style={engineStyles.signalDesc}>{s.description}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}
      {finalHeadline && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={engineStyles.finalHeadline}
        >
          {finalHeadline}
        </motion.div>
      )}
    </div>
  )
}


/* ─── PlaybackButton + ControlToggle ─────────────────────────────── */
function PlaybackButton({ onClick, disabled, primary, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...engineStyles.playbackButton,
        ...(primary ? engineStyles.playbackButtonPrimary : {}),
        ...(disabled ? engineStyles.playbackButtonDisabled : {}),
      }}
    >
      {children}
    </button>
  )
}

function ControlToggle({ control, active, onToggle, hasActiveSignalAtCurrentStage, stageLabels }) {
  const naive = control.naive
  const showStageHint =
    active && !naive && !hasActiveSignalAtCurrentStage &&
    Array.isArray(control.revealsAtStages) && control.revealsAtStages.length > 0

  let stageHintText = null
  if (showStageHint) {
    const stageRefs = control.revealsAtStages.map(idx => {
      const label = stageLabels && stageLabels[idx - 1]
      return label ? `stage ${idx} (${label})` : `stage ${idx}`
    })
    stageHintText = `Active at ${stageRefs.join(', ')}. Step through to view.`
  }

  return (
    <button
      onClick={onToggle}
      style={{
        ...engineStyles.controlToggle,
        ...(active ? (naive ? engineStyles.controlToggleActiveNaive : engineStyles.controlToggleActive) : {}),
      }}
    >
      <div style={engineStyles.controlToggleHeader}>
        <span style={{
          ...engineStyles.controlCheckbox,
          ...(active ? engineStyles.controlCheckboxActive : {}),
        }}>
          {active ? '✓' : ''}
        </span>
        <span style={engineStyles.controlLabel}>{control.label}</span>
        {naive && <span style={engineStyles.naiveBadge}>NAIVE</span>}
      </div>
      <div style={engineStyles.controlMeta}>{control.meta}</div>
      {active && !naive && control.catchTotal > 0 && (
        <div style={engineStyles.controlCallout}>
          Would have flagged {control.catchCount} of {control.catchTotal} {control.catchUnit || 'events'}
        </div>
      )}
      {showStageHint && (
        <div style={engineStyles.controlStageHint}>
          {stageHintText}
        </div>
      )}
      {active && naive && (
        <div style={engineStyles.controlCalloutNaive}>
          {control.naiveCallout || 'No match — pattern works around this control'}
        </div>
      )}
    </button>
  )
}


/* ─── Engine-local styles ──────────────────────────────────────── */
const maStyles = {
  canvasWrap: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '14px 16px',
    overflowX: 'auto',
  },
  signalsStrip: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    padding: '14px',
  },
  signalsHeader: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1px solid var(--rule)',
  },
}
