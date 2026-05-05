import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -----------------------------------------------------------------------------
 * DailySignal — habit-loop micro-learning widget on Home
 *
 * Shows the day's deterministically-picked stage question. After the user
 * answers, reveals the four rationales (correct + their pick + the rest)
 * and updates their streak. Designed to be opened in 30 seconds, closed in
 * 30 seconds, returned to tomorrow.
 *
 * Loading rules:
 *   - On mount, fetch /api/engagement/daily-signal
 *   - If `answered` already exists in the response, render the result
 *     state immediately (don't show the question again — it'd let people
 *     re-pick after seeing an answered teaser elsewhere)
 *   - If not answered, show question. After submit, render rationales.
 *
 * The streak indicator is conservative: it's the longest UTC-day chain
 * ending today (if answered) or yesterday (if not yet answered today).
 * --------------------------------------------------------------------------- */

export default function DailySignal() {
  const [data, setData]         = useState(null)   // server response
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [picked, setPicked]     = useState(null)   // 0-3 chosen index (pre-submit)
  const [revealed, setRevealed] = useState(null)   // server reveal response

  useEffect(() => {
    api.getDailySignal()
      .then(d => {
        setData(d)
        // If they already answered today, surface the persisted result
        // by hitting the answer-reveal again with their stored pick.
        // We don't have rationales for the answered case from the GET,
        // so the simplest path is to just show the "answered" summary
        // and offer to open the rationale on click.
        if (d.answered) {
          setPicked(d.answered.optionIndex)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function submit(idx) {
    if (!data?.signal || picked !== null) return
    setPicked(idx)
    try {
      const r = await api.answerDailySignal(data.signal.stageId, idx)
      setRevealed(r)
      // Refresh the streak from the server — bumps by 1 if today's pick
      // turned a non-streak into a streak.
      api.getDailySignal().then(setData).catch(() => {})
    } catch (e) {
      // On error, allow retry by clearing picked
      setError(e.message)
      setPicked(null)
    }
  }

  if (loading) {
    return (
      <PanelShell streak={0}>
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading today's Signal…</div>
      </PanelShell>
    )
  }

  if (error || !data?.signal) {
    return (
      <PanelShell streak={data?.streak ?? 0}>
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
          {error || 'No Signal available today. Check back tomorrow.'}
        </div>
      </PanelShell>
    )
  }

  // Fast path: user already answered today. We don't have rationales (those
  // come from the answer endpoint), so just show a calm "you already played"
  // state with the streak. Tomorrow they'll get a fresh one.
  if (data.answered && !revealed) {
    return (
      <PanelShell streak={data.streak}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <ResultDot correct={data.answered.correct} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginBottom: 2 }}>
              {data.answered.correct ? 'Nailed it.' : 'Got it next time.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              You answered today's Signal · come back tomorrow for a fresh one.
            </div>
          </div>
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell streak={data.streak}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginBottom: 6,
      }}>
        From: <span style={{ color: 'var(--accent)' }}>{data.signal.scenarioTitle}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500,
        lineHeight: 1.4, marginBottom: 14, color: 'var(--ink)',
      }}>
        {data.signal.question}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.signal.options.map((opt, i) => {
          const isPicked = picked === i
          const reveal = revealed?.rationales?.[i]
          const isCorrect = reveal?.correct
          const showReveal = revealed !== null

          let bg = 'var(--paper)'
          let border = 'var(--rule)'
          if (showReveal && isCorrect) {
            bg = 'var(--success-bg)'
            border = 'var(--success)'
          } else if (showReveal && isPicked && !isCorrect) {
            bg = 'var(--danger-bg)'
            border = 'var(--danger)'
          } else if (isPicked && !showReveal) {
            border = 'var(--accent)'
          }

          return (
            <motion.button
              key={i}
              onClick={() => submit(i)}
              disabled={picked !== null}
              whileHover={picked === null ? { y: -1 } : {}}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                background: bg,
                border: '1px solid',
                borderColor: border,
                borderRadius: 'var(--radius)',
                cursor: picked !== null ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13.5,
                lineHeight: 1.45,
                color: 'var(--ink)',
                transition: 'background var(--dur), border-color var(--dur)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--ink-faint)', marginTop: 2,
                  minWidth: 14,
                }}>{String.fromCharCode(65 + i)}.</span>
                <span style={{ flex: 1 }}>{opt.text}</span>
                {showReveal && isCorrect && (
                  <span style={{ fontSize: 14, color: 'var(--success)' }}>✓</span>
                )}
                {showReveal && isPicked && !isCorrect && (
                  <span style={{ fontSize: 14, color: 'var(--danger)' }}>✕</span>
                )}
              </div>
              <AnimatePresence>
                {reveal?.rationale && (isCorrect || isPicked) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid color-mix(in srgb, currentColor 15%, transparent)',
                      fontSize: 12, lineHeight: 1.5, color: 'var(--ink-soft)',
                      overflow: 'hidden',
                    }}
                  >
                    {isCorrect ? 'Why this is right: ' : 'Why this missed: '}
                    {reveal.rationale}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </PanelShell>
  )
}

function PanelShell({ streak, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--paper-hi)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        marginBottom: 32,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 14, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 4, fontWeight: 600,
          }}>Daily Signal</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
            letterSpacing: '-0.01em',
          }}>30 seconds. One question.</div>
        </div>
        <StreakIndicator streak={streak} />
      </div>
      {children}
    </motion.div>
  )
}

function StreakIndicator({ streak }) {
  if (streak <= 0) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>Build a streak →</div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 16 }}>🔥</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600,
        color: 'var(--accent)',
      }}>{streak}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>day streak</span>
    </div>
  )
}

function ResultDot({ correct }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: correct ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: correct ? 'var(--success)' : 'var(--danger)',
      fontSize: 18, fontWeight: 600,
      border: '1.5px solid',
      borderColor: correct ? 'var(--success)' : 'var(--danger)',
    }}>{correct ? '✓' : '✕'}</div>
  )
}
