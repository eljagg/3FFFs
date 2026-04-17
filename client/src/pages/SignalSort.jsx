import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api.js'

const ROUND_SECONDS = 60
const SPAWN_INTERVAL = 2500
const MAX_IN_PLAY = 6
const POINTS_PER_HIT = 100

const TACTIC_ORDER = [
  { id: 'TA0043', name: 'Reconnaissance',       short: 'Recon' },
  { id: 'TA0042', name: 'Resource Development', short: 'Resource Dev' },
  { id: 'TA0001', name: 'Initial Access',       short: 'Init Access' },
  { id: 'TA0005', name: 'Defense Evasion',      short: 'Defense Evasion' },
  { id: 'FA0001', name: 'Positioning',          short: 'Positioning', f3: true },
  { id: 'TA0002', name: 'Execution',            short: 'Execution' },
  { id: 'FA0002', name: 'Monetization',         short: 'Monetization', f3: true },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function streakMultiplier(streak) {
  if (streak >= 5) return 3
  if (streak >= 3) return 2
  return 1
}

export default function SignalSort() {
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [phase, setPhase] = useState('ready')
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)

  const [activeSignals, setActiveSignals] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [shakeBucket, setShakeBucket] = useState(null)

  const [best, setBest] = useState(0)
  const [plays, setPlays] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])

  const poolIndex = useRef(0)
  const tickRef = useRef(null)
  const spawnRef = useRef(null)
  const feedbackKey = useRef(0)

  useEffect(() => {
    Promise.all([
      api.getSignalPool(),
      api.getSignalLeaderboard().catch(() => ({ leaderboard: [] })),
    ])
      .then(([p, l]) => {
        setPool(shuffle(p.signals || []))
        setLeaderboard(l.leaderboard || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    tickRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(tickRef.current)
          clearInterval(spawnRef.current)
          setPhase('over')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    spawnRef.current = setInterval(() => {
      setActiveSignals(sigs => {
        if (sigs.length >= MAX_IN_PLAY) return sigs
        if (poolIndex.current >= pool.length) poolIndex.current = 0
        const next = pool[poolIndex.current++]
        if (!next) return sigs
        return [...sigs, { ...next, instanceId: next.id + '_' + Date.now() }]
      })
    }, SPAWN_INTERVAL)
    return () => clearInterval(spawnRef.current)
  }, [phase, pool])

  useEffect(() => {
    if (phase === 'playing' && activeSignals.length === 0 && pool.length > 0) {
      const next = pool[poolIndex.current++]
      if (next) setActiveSignals([{ ...next, instanceId: next.id + '_' + Date.now() }])
    }
  }, [phase, pool])

  useEffect(() => {
    if (phase !== 'over' || score === 0) return
    api.submitSignalScore(score)
      .then(r => { setBest(r.best); setPlays(r.plays) })
      .catch(() => {})
    api.getSignalLeaderboard().then(l => setLeaderboard(l.leaderboard || [])).catch(() => {})
  }, [phase])

  function startGame() {
    setScore(0); setStreak(0); setBestStreak(0); setHits(0); setMisses(0)
    setTimeLeft(ROUND_SECONDS); setActiveSignals([])
    poolIndex.current = 0
    setPool(p => shuffle(p))
    setPhase('playing')
  }

  function handleDrop(instanceId, tacticId) {
    setActiveSignals(sigs => {
      const signal = sigs.find(s => s.instanceId === instanceId)
      if (!signal) return sigs

      const correct = signal.correctTacticId === tacticId
      feedbackKey.current++

      if (correct) {
        const newStreak = streak + 1
        const mult = streakMultiplier(newStreak)
        setFeedback({
          kind: 'correct', tacticId, signal, multiplier: mult, key: feedbackKey.current,
        })
        setScore(s => s + POINTS_PER_HIT * mult)
        setStreak(newStreak)
        setBestStreak(b => Math.max(b, newStreak))
        setHits(h => h + 1)
      } else {
        setFeedback({
          kind: 'wrong', tacticId, signal, multiplier: 0, key: feedbackKey.current,
        })
        setStreak(0)
        setMisses(m => m + 1)
        setShakeBucket(tacticId)
        setTimeout(() => setShakeBucket(null), 400)
      }
      setTimeout(() => setFeedback(null), 1200)

      return sigs.filter(s => s.instanceId !== instanceId)
    })
  }

  if (loading) return <Loader msg="Loading signals from the graph..." />
  if (error) return <Loader msg={'Error: ' + error} />

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>
      <Header phase={phase} score={score} streak={streak} timeLeft={timeLeft} />

      {phase === 'ready' && <ReadyScreen best={best} onStart={startGame} leaderboard={leaderboard} />}
      {phase === 'over' && (
        <OverScreen
          score={score} hits={hits} misses={misses} bestStreak={bestStreak}
          best={best} plays={plays} leaderboard={leaderboard} onPlayAgain={startGame}
        />
      )}
      {phase === 'playing' && (
        <GameBoard
          activeSignals={activeSignals}
          onDrop={handleDrop}
          feedback={feedback}
          shakeBucket={shakeBucket}
        />
      )}
    </div>
  )
}

function Header({ phase, score, streak, timeLeft }) {
  const mult = streakMultiplier(streak)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
          Game · Graph-validated
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          Signal Sort
        </h1>
      </div>
      {phase === 'playing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Stat big={score} label="Score" />
          <Stat big={streak} label={'Streak' + (mult > 1 ? ' (' + mult + 'x)' : '')} accent={mult > 1 ? 'var(--accent)' : undefined} />
          <Timer seconds={timeLeft} total={ROUND_SECONDS} />
        </div>
      )}
    </div>
  )
}

function Stat({ big, label, accent }) {
  return (
    <div style={{
      padding: '10px 16px', background: 'var(--paper-hi)',
      border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
      minWidth: 90, textAlign: 'center',
    }}>
      <motion.div
        key={big}
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, lineHeight: 1, color: accent || 'var(--ink)' }}
      >{big}</motion.div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

function Timer({ seconds, total }) {
  const pct = (seconds / total) * 100
  const urgent = seconds <= 10
  return (
    <div style={{
      padding: '10px 16px', background: 'var(--paper-hi)',
      border: '1px solid ' + (urgent ? 'var(--danger)' : 'var(--rule)'),
      borderRadius: 'var(--radius-lg)', minWidth: 100, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, width: pct + '%',
        background: urgent ? 'var(--danger-bg)' : 'var(--paper-dim)',
        transition: 'width 1s linear',
      }} />
      <div style={{ position: 'relative' }}>
        <motion.div
          key={seconds}
          animate={urgent ? { scale: [1, 1.1, 1] } : {}}
          style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, lineHeight: 1, color: urgent ? 'var(--danger)' : 'var(--ink)' }}
        >{seconds}s</motion.div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>
          Time left
        </div>
      </div>
    </div>
  )
}

function ReadyScreen({ best, onStart, leaderboard }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--paper-hi)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', padding: '32px 36px' }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 14 }}>
          Sort fraud signals into the right F3 tactic.
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65, marginBottom: 24, maxWidth: 560 }}>
          You will see real signals from real scenarios - 60 seconds on the clock.
          Drag each one onto the tactic where it belongs. Right = points + streak.
          Wrong = streak resets.
        </p>
        <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
          <Rule n="100" label="Points per correct" />
          <Rule n="2x" label="Streak of 3" />
          <Rule n="3x" label="Streak of 5+" />
        </div>
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          style={{ padding: '15px 28px', fontSize: 15, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
        >Start round →</motion.button>
        {best > 0 && (
          <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
            Your personal best: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{best} points</span>
          </div>
        )}
      </motion.div>
      <LeaderboardCard leaderboard={leaderboard} />
    </div>
  )
}

function Rule({ n, label }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, lineHeight: 1, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{n}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function LeaderboardCard({ leaderboard }) {
  return (
    <div style={{ background: 'var(--paper-hi)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', padding: '24px 26px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 16 }}>
        Leaderboard — top 10
      </div>
      {leaderboard.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
          Be the first to post a score.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaderboard.map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--rule)' : 'none',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: i === 0 ? 'var(--accent)' : 'var(--ink-faint)', minWidth: 20, fontWeight: 600 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
                {row.name || (row.email || '').split('@')[0]}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: i === 0 ? 'var(--accent)' : 'var(--ink)' }}>
                {row.best}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GameBoard({ activeSignals, onDrop, feedback, shakeBucket }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.2fr)', gap: 18, minHeight: 500 }}>
      <div style={{
        background: 'var(--paper-hi)', border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        maxHeight: 580, overflowY: 'auto',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>
          Incoming signals
        </div>
        <AnimatePresence>
          {activeSignals.map(sig => (
            <SignalCard key={sig.instanceId} signal={sig} />
          ))}
        </AnimatePresence>
        {activeSignals.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', padding: 8 }}>
            Waiting for the next signal...
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignContent: 'start' }}>
        {TACTIC_ORDER.map(tac => (
          <Bucket
            key={tac.id}
            tactic={tac}
            onDrop={onDrop}
            shake={shakeBucket === tac.id}
            recentCorrect={feedback?.kind === 'correct' && feedback.tacticId === tac.id}
          />
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.key}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
              padding: '14px 22px',
              background: feedback.kind === 'correct' ? 'var(--success)' : 'var(--danger)',
              color: '#fff', borderRadius: 999, fontSize: 14, fontWeight: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              zIndex: 100, maxWidth: 520, textAlign: 'center',
            }}
          >
            {feedback.kind === 'correct' ? (
              <>
                <span style={{ fontWeight: 600 }}>✓ {feedback.multiplier > 1 ? feedback.multiplier + 'x streak! ' : ''}</span>
                +{POINTS_PER_HIT * feedback.multiplier} — {feedback.signal.correctTacticName}
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600 }}>✕ Not {tacticName(feedback.tacticId)} — </span>
                belongs to {feedback.signal.correctTacticName}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function tacticName(id) {
  return TACTIC_ORDER.find(t => t.id === id)?.name || id
}

function SignalCard({ signal }) {
  const severityColor = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }[signal.severity] || 'var(--ink-faint)'

  function handleDragStart(e) {
    e.dataTransfer.setData('text/signal', signal.instanceId)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <motion.div
      layout
      draggable
      onDragStart={handleDragStart}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      style={{
        padding: '10px 12px',
        background: 'var(--paper-dim)',
        border: '1px solid var(--rule)',
        borderLeft: '3px solid ' + severityColor,
        borderRadius: 'var(--radius)',
        cursor: 'grab', fontSize: 13, lineHeight: 1.4, userSelect: 'none',
      }}
      whileHover={{ borderColor: 'var(--ink)', y: -1 }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: severityColor, marginBottom: 4,
      }}>{signal.severity}</div>
      {signal.text}
    </motion.div>
  )
}

function Bucket({ tactic, onDrop, shake, recentCorrect }) {
  const [over, setOver] = useState(false)

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOver(true)
  }
  function handleDragLeave() { setOver(false) }
  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    const instanceId = e.dataTransfer.getData('text/signal')
    if (!instanceId) return
    onDrop(instanceId, tactic.id)
  }

  return (
    <motion.div
      animate={{
        x: shake ? [0, -6, 6, -4, 4, 0] : 0,
        scale: recentCorrect ? [1, 1.05, 1] : 1,
        borderColor: over ? 'var(--ink)' : (recentCorrect ? 'var(--success)' : 'var(--rule)'),
      }}
      transition={{ duration: shake || recentCorrect ? 0.4 : 0.2 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: over ? 'var(--paper-dim)' : 'var(--paper-hi)',
        border: '2px solid', borderRadius: 'var(--radius-lg)',
        padding: '16px 14px', minHeight: 90,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', textAlign: 'center',
        transition: 'background var(--dur)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500,
        lineHeight: 1.2, color: tactic.f3 ? 'var(--accent)' : 'var(--ink)',
        marginBottom: 4,
      }}>{tactic.short}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.08em', color: 'var(--ink-faint)',
      }}>{tactic.id}{tactic.f3 ? ' · F3' : ''}</div>
    </motion.div>
  )
}

function OverScreen({ score, hits, misses, bestStreak, best, plays, leaderboard, onPlayAgain }) {
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0
  const isNewBest = score > 0 && score === best && plays > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24 }}
    >
      <div style={{
        background: 'linear-gradient(135deg, var(--success-bg), var(--paper-hi))',
        border: '1px solid var(--success)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 36px 28px', textAlign: 'center',
      }}>
        {isNewBest && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            style={{
              display: 'inline-block', padding: '4px 14px',
              background: 'var(--accent)', color: '#fff', borderRadius: 999,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >Personal best!</motion.div>
        )}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 6,
        }}>Round complete</div>
        <motion.div
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          style={{
            fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 500,
            lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--ink)',
            marginBottom: 24,
          }}
        >{score}</motion.div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          <Outcome label="Correct" value={hits} color="var(--success)" />
          <Outcome label="Missed" value={misses} color="var(--danger)" />
          <Outcome label="Accuracy" value={accuracy + '%'} />
          <Outcome label="Best streak" value={bestStreak} accent />
        </div>
        <button
          onClick={onPlayAgain}
          style={{
            padding: '13px 24px', fontSize: 14, fontWeight: 500,
            background: 'var(--ink)', color: 'var(--paper)',
            border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
          }}
        >Play again →</button>
      </div>
      <LeaderboardCard leaderboard={leaderboard} />
    </motion.div>
  )
}

function Outcome({ label, value, color, accent }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500,
        lineHeight: 1, letterSpacing: '-0.02em',
        color: color || (accent ? 'var(--accent)' : 'var(--ink)'),
      }}>{value}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginTop: 4,
      }}>{label}</div>
    </div>
  )
}

function Loader({ msg }) {
  return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div style={{
        display: 'inline-block', width: 20, height: 20,
        border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        marginRight: 10, verticalAlign: 'middle',
      }} />
      {msg}
    </div>
  )
}
