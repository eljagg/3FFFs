import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { engineStyles } from './ProcessAnimation.jsx'

/* ─────────────────────────────────────────────────────────────────────────
   TimelineThresholdAnimation — v25.7.0.11

   Animation engine for timeline+threshold-shape technique animations.
   Third engine alongside ProcessAnimation (3-zone) and the shelved
   SequenceDiagramAnimation (4-actor). Currently consumed by the
   sub-threshold structuring animation.

   Shape:
     - Two horizontally-stacked timeline panels (one per character)
     - X axis: time (weeks)
     - Y axis: deposit amount (JMD scale)
     - Horizontal threshold reference line at the regulatory limit
     - Transaction markers: dots sized by amount, colored by channel
     - View-switcher: time / channel / source / decision / replay
     - Trainee can drag a time-cursor for random-access navigation

   Why a separate engine:
     The case-review pedagogy is fundamentally different from the
     attacker-watch pedagogy. The trainee isn't watching a process
     unfold — they're examining historical data the bank already has,
     comparing patterns, making a decision. The visual primitives
     (time × amount grid, threshold line, comparison panels) don't
     map onto zones or actor lanes.

   Scene config shape:
     {
       meta: { techId, techName, ... },
       engine: 'timeline-threshold',
       characters: [
         {
           id, name, descriptor, account, baselineSummary,
           transactions: [{ id, week, day, amountJMD, channel, source }, ...],
           accountAgeWeeks, declaredOccupation, ...
         },
         { ... },  // typically two for comparison
       ],
       thresholdAmount: 1000000,        // J$1M POCA Section 101A
       thresholdLabel: 'POCA Section 101A',
       currency: 'JMD',
       weekRange: { start: 1, end: 12 },
       stages: [{
         id, label, title, caption, durationMs,
         viewMode: 'time' | 'channel' | 'source' | 'decision' | 'aggregate',
         emphasizedCharacterId?,  // optional spotlight
         decision?: { ... },       // for decision stage
         finalHeadline?,
         revealedSignalIds: [...]
       }],
       controls: [...],
       signals: [...]
     }
   ───────────────────────────────────────────────────────────────────── */

export default function TimelineThresholdAnimation({ scenes, externalPauseSignal }) {
  const { meta, stages, controls, signals, characters, thresholdAmount, thresholdLabel, weekRange, currency } = scenes

  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [activeControls, setActiveControls] = useState(() => new Set())
  const [scrubWeek, setScrubWeek] = useState(null)  // null = not scrubbing

  // External pause hook
  useEffect(() => {
    if (externalPauseSignal != null) {
      setIsPlaying(false)
    }
  }, [externalPauseSignal])

  const currentStage = stages[currentStageIdx]
  const isAtEnd = currentStageIdx >= stages.length - 1
  const isAtStart = currentStageIdx === 0

  const signalById = useMemo(() => {
    const m = {}
    for (const s of signals) m[s.id] = s
    return m
  }, [signals])

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

  /* ─── Derived: revealed signals ──────────────────────────────────── */
  const revealedSignals = useMemo(() => {
    const stageSigs = currentStage.revealedSignalIds || []
    return stageSigs
      .map(id => signalById[id])
      .filter(s => s && activeControls.has(s.revealedBy))
  }, [currentStage, activeControls, signalById])

  /* ─── Render ──────────────────────────────────────────────────── */
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
          <div style={tlStyles.captionLabelRow}>
            <span style={engineStyles.captionLabel}>{currentStage.label}</span>
            <span style={tlStyles.viewModeChip}>VIEW: {(currentStage.viewMode || 'time').toUpperCase()}</span>
          </div>
          <div style={engineStyles.captionTitle}>{currentStage.title}</div>
          <div style={engineStyles.captionText}>{currentStage.caption}</div>
        </motion.div>
      </AnimatePresence>

      {/* Compliance queue strip — shown on stage 1 */}
      {currentStage.viewMode === 'queue' && (
        <ComplianceQueue characters={characters} thresholdAmount={thresholdAmount} currency={currency} />
      )}

      {/* Main canvas — two stacked timelines */}
      {currentStage.viewMode !== 'queue' && currentStage.viewMode !== 'decision' && (
        <div style={tlStyles.canvasStack}>
          {characters.map(character => (
            <TimelinePanel
              key={character.id}
              character={character}
              thresholdAmount={thresholdAmount}
              thresholdLabel={thresholdLabel}
              currency={currency}
              weekRange={weekRange}
              viewMode={currentStage.viewMode}
              emphasized={currentStage.emphasizedCharacterId === character.id}
              dimmed={currentStage.emphasizedCharacterId && currentStage.emphasizedCharacterId !== character.id}
              scrubWeek={scrubWeek}
              setScrubWeek={setScrubWeek}
            />
          ))}
        </div>
      )}

      {/* Decision panel — shown on final stage */}
      {currentStage.viewMode === 'decision' && currentStage.decision && (
        <DecisionPanel decision={currentStage.decision} characters={characters} />
      )}

      {/* Channel/source legend (when relevant) */}
      {(currentStage.viewMode === 'channel' || currentStage.viewMode === 'time') && (
        <ChannelLegend />
      )}

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

      {/* Revealed signals */}
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


/* ─── ComplianceQueue: shown on stage 1 ─────────────────────────────── */
function ComplianceQueue({ characters, thresholdAmount, currency }) {
  return (
    <div style={tlStyles.queueWrap}>
      <div style={tlStyles.queueHeader}>
        <span style={tlStyles.queueHeaderLabel}>Compliance review queue · today</span>
        <span style={tlStyles.queueHeaderCount}>{characters.length} accounts flagged</span>
      </div>
      {characters.map((char, i) => (
        <motion.div
          key={char.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 }}
          style={tlStyles.queueRow}
        >
          <div style={tlStyles.queueRowMain}>
            <div style={tlStyles.queueRowName}>{char.name}</div>
            <div style={tlStyles.queueRowDescriptor}>{char.descriptor}</div>
          </div>
          <div style={tlStyles.queueRowMeta}>
            <div style={tlStyles.queueRowMetaItem}>
              <span style={tlStyles.queueRowMetaLabel}>Account</span>
              <span style={tlStyles.queueRowMetaValue}>{char.account}</span>
            </div>
            <div style={tlStyles.queueRowMetaItem}>
              <span style={tlStyles.queueRowMetaLabel}>Flag reason</span>
              <span style={tlStyles.queueRowMetaValue}>{char.flagReason}</span>
            </div>
            <div style={tlStyles.queueRowMetaItem}>
              <span style={tlStyles.queueRowMetaLabel}>Account age</span>
              <span style={tlStyles.queueRowMetaValue}>{char.accountAgeWeeks} weeks</span>
            </div>
          </div>
        </motion.div>
      ))}
      <div style={tlStyles.queueFooter}>
        Both accounts have multiple sub-threshold cash deposits this week. Your job:
        determine which (if either) requires a Suspicious Transaction Report under POCA.
      </div>
    </div>
  )
}


/* ─── TimelinePanel: one character's timeline ────────────────────── */
function TimelinePanel({ character, thresholdAmount, thresholdLabel, currency, weekRange, viewMode, emphasized, dimmed, scrubWeek, setScrubWeek }) {
  // Layout
  const PANEL_WIDTH = 920
  const PANEL_HEIGHT = 220
  const MARGIN_LEFT = 90
  const MARGIN_RIGHT = 30
  const MARGIN_TOP = 30
  const MARGIN_BOTTOM = 50

  const plotWidth = PANEL_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
  const plotHeight = PANEL_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM

  // Scales
  const weeksSpan = weekRange.end - weekRange.start
  const xForWeek = (week) => MARGIN_LEFT + ((week - weekRange.start) / weeksSpan) * plotWidth
  const yMax = thresholdAmount * 1.15  // give headroom above threshold
  const yForAmount = (amt) => MARGIN_TOP + plotHeight - (amt / yMax) * plotHeight

  const thresholdY = yForAmount(thresholdAmount)

  // Channel colors
  const CHANNEL_COLORS = {
    'branch':  '#6b8e5a',  // green
    'atm':     '#c79a3a',  // amber
    'mobile':  '#7a6dad',  // purple
    'online':  '#5a8a9a',  // teal
  }

  // Source colors (for source view)
  const SOURCE_COLORS = {
    'documented':   '#6b8e5a',  // green — has documentation
    'partial':      '#c79a3a',  // amber — partial documentation
    'undocumented': '#a14040',  // red — no documentation
  }

  // Filter transactions for view
  const txs = character.transactions

  return (
    <motion.div
      animate={{
        opacity: dimmed ? 0.45 : 1,
        scale: emphasized ? 1.005 : 1,
      }}
      transition={{ duration: 0.3 }}
      style={{
        ...tlStyles.panel,
        ...(emphasized ? tlStyles.panelEmphasized : {}),
      }}
    >
      <div style={tlStyles.panelHeader}>
        <div style={tlStyles.panelHeaderLeft}>
          <div style={tlStyles.panelName}>{character.name}</div>
          <div style={tlStyles.panelDescriptor}>{character.descriptor}</div>
        </div>
        <div style={tlStyles.panelHeaderRight}>
          <div style={tlStyles.panelMetaSmall}>{character.account}</div>
          <div style={tlStyles.panelMetaSmall}>Account age: {character.accountAgeWeeks} weeks</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMin meet"
      >
        {/* Y-axis grid lines + labels */}
        {[0, 0.25, 0.5, 0.75, 1.0].map(frac => {
          const amt = yMax * frac
          const y = yForAmount(amt)
          return (
            <g key={frac}>
              <line x1={MARGIN_LEFT} y1={y} x2={PANEL_WIDTH - MARGIN_RIGHT} y2={y}
                stroke="var(--rule)" strokeWidth="0.5" opacity="0.5" />
              <text x={MARGIN_LEFT - 8} y={y + 3} textAnchor="end"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--ink-faint)' }}>
                J${formatJMDShort(amt)}
              </text>
            </g>
          )
        })}

        {/* Threshold reference line — the centerpiece */}
        <line
          x1={MARGIN_LEFT}
          y1={thresholdY}
          x2={PANEL_WIDTH - MARGIN_RIGHT}
          y2={thresholdY}
          stroke="#a14040"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.85"
        />
        <text
          x={PANEL_WIDTH - MARGIN_RIGHT}
          y={thresholdY - 6}
          textAnchor="end"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fill: '#a14040',
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          THRESHOLD · {thresholdLabel} · J${formatJMDShort(thresholdAmount)}
        </text>

        {/* X-axis weeks */}
        {Array.from({ length: weeksSpan + 1 }, (_, i) => weekRange.start + i).map(week => {
          if (week % 2 !== weekRange.start % 2) return null  // every-other week labels for density
          const x = xForWeek(week)
          return (
            <g key={week}>
              <line x1={x} y1={MARGIN_TOP + plotHeight} x2={x} y2={MARGIN_TOP + plotHeight + 4}
                stroke="var(--rule)" strokeWidth="0.5" />
              <text x={x} y={MARGIN_TOP + plotHeight + 16} textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
                W{week}
              </text>
            </g>
          )
        })}

        {/* Axis labels */}
        <text
          x={MARGIN_LEFT - 70}
          y={MARGIN_TOP + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${MARGIN_LEFT - 70}, ${MARGIN_TOP + plotHeight / 2})`}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--ink-faint)', letterSpacing: '0.12em', fontWeight: 600 }}
        >
          DEPOSIT AMOUNT (JMD)
        </text>

        {/* Aggregate / cumulative-sum overlay (when in aggregate view) */}
        {viewMode === 'aggregate' && (
          <CumulativeSumOverlay
            transactions={txs}
            xForWeek={xForWeek}
            yMax={yMax}
            yForAmount={yForAmount}
            plotHeight={plotHeight}
            marginTop={MARGIN_TOP}
            weekRange={weekRange}
          />
        )}

        {/* Transaction markers */}
        {txs.map((tx, i) => {
          const x = xForWeek(tx.week + (tx.day || 0) / 7)
          const y = yForAmount(tx.amountJMD)
          let color
          if (viewMode === 'channel') color = CHANNEL_COLORS[tx.channel] || 'var(--ink-soft)'
          else if (viewMode === 'source') color = SOURCE_COLORS[tx.source] || 'var(--ink-soft)'
          else color = '#5a6470'
          // size by amount (5-12 px radius)
          const r = 4 + (tx.amountJMD / yMax) * 8
          return (
            <motion.circle
              key={tx.id}
              cx={x}
              cy={y}
              r={r}
              fill={color}
              fillOpacity={0.65}
              stroke={color}
              strokeWidth={1}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.012 }}
            />
          )
        })}

        {/* Optional scrub-week vertical cursor (for random-access exploration) */}
        {scrubWeek != null && (
          <line
            x1={xForWeek(scrubWeek)}
            y1={MARGIN_TOP}
            x2={xForWeek(scrubWeek)}
            y2={MARGIN_TOP + plotHeight}
            stroke="var(--accent)"
            strokeWidth="1.5"
            opacity="0.6"
          />
        )}
      </svg>

      {/* Stats strip below chart */}
      <div style={tlStyles.statsStrip}>
        <StatItem label="Deposits this period" value={txs.length} />
        <StatItem label="Cumulative" value={`J$${formatJMDShort(txs.reduce((s, t) => s + t.amountJMD, 0))}`} />
        <StatItem label="Avg deposit" value={`J$${formatJMDShort(txs.reduce((s, t) => s + t.amountJMD, 0) / txs.length)}`} />
        <StatItem label="Above threshold" value={txs.filter(t => t.amountJMD >= thresholdAmount).length} />
        <StatItem label="Declared occupation" value={character.declaredOccupation} />
      </div>
    </motion.div>
  )
}


/* ─── Cumulative sum overlay ──────────────────────────────────────── */
function CumulativeSumOverlay({ transactions, xForWeek, yForAmount, weekRange, marginTop, plotHeight }) {
  const sortedTxs = [...transactions].sort((a, b) => (a.week + (a.day || 0)/7) - (b.week + (b.day || 0)/7))

  // For overlay: show running sum scaled to fit, normalized to plot height.
  let runningSum = 0
  const totalAmount = sortedTxs.reduce((s, t) => s + t.amountJMD, 0)

  const points = sortedTxs.map(tx => {
    runningSum += tx.amountJMD
    const x = xForWeek(tx.week + (tx.day || 0) / 7)
    const y = marginTop + plotHeight - (runningSum / totalAmount) * plotHeight
    return { x, y, runningSum }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <g>
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeOpacity="0.6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      <text
        x={points[points.length - 1].x - 6}
        y={points[points.length - 1].y - 8}
        textAnchor="end"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fill: 'var(--accent)',
          fontWeight: 600,
        }}
      >
        Cumulative: J${formatJMDShort(totalAmount)}
      </text>
    </g>
  )
}


/* ─── Stat item ───────────────────────────────────────────────────── */
function StatItem({ label, value }) {
  return (
    <div style={tlStyles.statItem}>
      <div style={tlStyles.statLabel}>{label}</div>
      <div style={tlStyles.statValue}>{value}</div>
    </div>
  )
}


/* ─── Channel legend ─────────────────────────────────────────────── */
function ChannelLegend() {
  const items = [
    { color: '#6b8e5a', label: 'Branch teller' },
    { color: '#c79a3a', label: 'ATM' },
    { color: '#7a6dad', label: 'Mobile app' },
    { color: '#5a8a9a', label: 'Online' },
  ]
  return (
    <div style={tlStyles.legendStrip}>
      <span style={tlStyles.legendStripLabel}>CHANNEL</span>
      {items.map(it => (
        <span key={it.label} style={tlStyles.legendStripItem}>
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: it.color,
            marginRight: 6,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}


/* ─── DecisionPanel — shown on final stage ───────────────────────── */
function DecisionPanel({ decision, characters }) {
  return (
    <div style={tlStyles.decisionWrap}>
      <div style={tlStyles.decisionHeader}>The analyst's call</div>

      {decision.perCharacter.map(charDecision => {
        const character = characters.find(c => c.id === charDecision.characterId)
        return (
          <motion.div
            key={charDecision.characterId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={tlStyles.decisionRow}
          >
            <div style={tlStyles.decisionName}>{character.name}</div>
            <div style={{
              ...tlStyles.decisionVerdict,
              background: charDecision.verdict === 'sar' ? 'rgba(161, 64, 64, 0.12)' :
                charDecision.verdict === 'monitor' ? 'rgba(199, 154, 58, 0.12)' :
                'rgba(107, 142, 90, 0.12)',
              color: charDecision.verdict === 'sar' ? '#a14040' :
                charDecision.verdict === 'monitor' ? '#8a6a20' :
                '#4d6e42',
              borderColor: charDecision.verdict === 'sar' ? '#a14040' :
                charDecision.verdict === 'monitor' ? '#c79a3a' :
                '#6b8e5a',
            }}>
              {charDecision.verdictLabel}
            </div>
            <div style={tlStyles.decisionRationale}>{charDecision.rationale}</div>
          </motion.div>
        )
      })}

      <div style={tlStyles.decisionFramework}>
        <div style={tlStyles.decisionFrameworkTitle}>Regulatory framework</div>
        {decision.regulatoryNotes.map((note, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            style={tlStyles.decisionNote}
          >
            <span style={tlStyles.decisionNoteLabel}>{note.label}</span>
            <span style={tlStyles.decisionNoteText}>{note.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}


/* ─── Helpers ───────────────────────────────────────────────────── */
function formatJMDShort(amt) {
  if (amt >= 1_000_000) return (amt / 1_000_000).toFixed(amt % 1_000_000 === 0 ? 0 : 2) + 'M'
  if (amt >= 1_000) return (amt / 1_000).toFixed(amt % 1_000 === 0 ? 0 : 0) + 'K'
  return amt.toString()
}


/* ─── RevealedSignalsStrip ──────────────────────────────────────── */
function RevealedSignalsStrip({ revealedSignals, activeControlsSize, finalHeadline }) {
  if (revealedSignals.length === 0 && !finalHeadline) {
    if (activeControlsSize === 0) return null
    return (
      <div style={tlStyles.signalsStrip}>
        <div style={tlStyles.signalsHeader}>
          <span style={engineStyles.zoneSectionLabel}>Hidden signals</span>
        </div>
        <div style={engineStyles.signalsEmpty}>
          No signals matching active controls at this stage.
        </div>
      </div>
    )
  }
  return (
    <div style={tlStyles.signalsStrip}>
      {revealedSignals.length > 0 && (
        <>
          <div style={tlStyles.signalsHeader}>
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


/* ─── PlaybackButton + ControlToggle (local copies) ──────────────── */
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

function ControlToggle({ control, active, onToggle }) {
  const naive = control.naive
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
          Would have flagged {control.catchCount} of {control.catchTotal} {control.catchUnit || 'patterns'}
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


/* ─── Timeline-engine styles ───────────────────────────────────── */
const tlStyles = {
  captionLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  viewModeChip: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.16em',
    padding: '2px 8px',
    background: 'rgba(184, 81, 61, 0.1)',
    color: 'var(--accent)',
    borderRadius: 3,
    fontWeight: 600,
  },
  canvasStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  panel: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '14px 16px',
    transition: 'all 0.3s',
  },
  panelEmphasized: {
    border: '2px solid var(--accent)',
    boxShadow: '0 0 12px rgba(184, 81, 61, 0.18)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid var(--rule)',
  },
  panelHeaderLeft: { flex: 1 },
  panelHeaderRight: { textAlign: 'right' },
  panelName: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--ink)',
  },
  panelDescriptor: {
    fontSize: 12,
    color: 'var(--ink-soft)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  panelMetaSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--ink-faint)',
    letterSpacing: '0.04em',
  },
  statsStrip: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid var(--rule)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11.5,
    color: 'var(--ink)',
    fontWeight: 500,
  },
  legendStrip: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
  },
  legendStripLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  legendStripItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 11.5,
    color: 'var(--ink-soft)',
  },
  queueWrap: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '16px 18px',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottom: '1px solid var(--rule)',
    marginBottom: 12,
  },
  queueHeaderLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
  },
  queueHeaderCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: 'var(--accent)',
    fontWeight: 600,
  },
  queueRow: {
    display: 'flex',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid var(--rule)',
  },
  queueRowMain: {
    flex: 1,
  },
  queueRowName: {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: 2,
  },
  queueRowDescriptor: {
    fontSize: 11.5,
    color: 'var(--ink-soft)',
    fontStyle: 'italic',
  },
  queueRowMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 220,
  },
  queueRowMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  queueRowMetaLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
  },
  queueRowMetaValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: 'var(--ink)',
    textAlign: 'right',
  },
  queueFooter: {
    fontSize: 12,
    color: 'var(--ink-soft)',
    fontStyle: 'italic',
    paddingTop: 12,
    borderTop: '1px dashed var(--rule)',
    marginTop: 8,
  },
  decisionWrap: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '18px 20px',
  },
  decisionHeader: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
    paddingBottom: 12,
    borderBottom: '1px solid var(--rule)',
    marginBottom: 14,
  },
  decisionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 2fr',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid var(--rule)',
    alignItems: 'center',
  },
  decisionName: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
  },
  decisionVerdict: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 3,
    border: '1px solid',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  decisionRationale: {
    fontSize: 11.5,
    color: 'var(--ink-soft)',
    lineHeight: 1.45,
  },
  decisionFramework: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '2px solid var(--rule)',
  },
  decisionFrameworkTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 600,
    marginBottom: 10,
  },
  decisionNote: {
    display: 'flex',
    gap: 10,
    padding: '6px 0',
    fontSize: 11,
  },
  decisionNoteLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
    fontWeight: 600,
    minWidth: 130,
  },
  decisionNoteText: {
    color: 'var(--ink-soft)',
    flex: 1,
    lineHeight: 1.5,
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
