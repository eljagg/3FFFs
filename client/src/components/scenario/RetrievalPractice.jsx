import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -----------------------------------------------------------------------------
 * RetrievalPractice — short post-scenario recall check
 *
 * Fires immediately after a scenario completes. Shows 3 questions of the
 * form "did this signal appear in the scenario you just walked?" with a
 * mix of real signals (correct) and foils from other scenarios (wrong).
 *
 * Pedagogy: tests the testing effect — actively pulling information back
 * out of memory creates substantially more durable learning than passive
 * re-reading of correct answers. This is the "spaced repetition for
 * scenario content" lever, complementing the wrong-answer Review Queue
 * for quiz content.
 *
 * UX: skippable, dismissable. The intent is "30 second nice-to-have
 * follow-up", not "blocking gate before next scenario." A user who
 * X's out doesn't lose their completion.
 * --------------------------------------------------------------------------- */

export default function RetrievalPractice({ scenarioId, onComplete, onSkip }) {
  const [data, setData]         = useState(null)   // { questions, challenge }
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [picks, setPicks]       = useState({})     // { 0: 2, 1: 0, 2: 1 }
  const [submitted, setResult]  = useState(null)   // { correctCount, total, results }

  useEffect(() => {
    api.getRetrievalPractice(scenarioId)
      .then(d => {
        if (!d.questions || d.questions.length === 0) {
          // Not enough foils available — gracefully skip.
          onSkip?.()
          return
        }
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [scenarioId])

  function pick(qIndex, optIndex) {
    if (submitted) return
    setPicks(p => ({ ...p, [qIndex]: optIndex }))
  }

  async function submit() {
    if (!data) return
    const answers = data.questions.map(q => ({
      index: q.index,
      picked: picks[q.index] ?? -1,
    }))
    try {
      const r = await api.answerRetrievalPractice(scenarioId, data.challenge, answers)
      setResult(r)
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <Shell>
        <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
          Loading retrieval check…
        </div>
      </Shell>
    )
  }

  if (error || !data) {
    return null  // Fail silent — better to skip than block on a non-essential feature
  }

  const allAnswered = data.questions.every(q => picks[q.index] !== undefined)

  if (submitted) {
    const pct = Math.round((submitted.correctCount / submitted.total) * 100)
    return (
      <Shell>
        <ResultHeader
          correctCount={submitted.correctCount}
          total={submitted.total}
          pct={pct}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {data.questions.map((q, i) => {
            const result = submitted.results.find(r => r.index === q.index)
            const pickedIdx = picks[q.index]
            return (
              <div key={q.index} style={{
                padding: '12px 14px',
                background: result?.correct ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: '1px solid',
                borderColor: result?.correct ? 'var(--success)' : 'var(--danger)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: result?.correct ? 'var(--success)' : 'var(--danger)',
                  marginBottom: 6, fontWeight: 600,
                }}>
                  {result?.correct ? 'Correct' : 'Missed'} · Q{i + 1}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {q.options[pickedIdx]?.text || '(no answer)'}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onComplete} style={primaryBtn}>Done</button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 4, fontWeight: 600,
      }}>Quick recall check</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
        letterSpacing: '-0.01em', marginBottom: 6,
      }}>Lock it in — 3 questions, 30 seconds.</div>
      <div style={{
        fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 18,
      }}>
        Pulling these signals out of memory now strengthens recall more than
        re-reading the scenario would. Pick the one that actually appeared.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.questions.map((q, i) => (
          <div key={q.index}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--ink-faint)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>Question {i + 1} of {data.questions.length}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500,
              marginBottom: 8,
            }}>{q.prompt}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map(opt => {
                const isPicked = picks[q.index] === opt.index
                return (
                  <button
                    key={opt.index}
                    onClick={() => pick(q.index, opt.index)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: isPicked ? 'var(--paper-hi)' : 'var(--paper)',
                      border: '1px solid',
                      borderColor: isPicked ? 'var(--accent)' : 'var(--rule)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13, color: 'var(--ink)',
                      lineHeight: 1.5,
                      transition: 'border-color var(--dur)',
                    }}
                  >{opt.text}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
        <button onClick={onSkip} style={ghostBtn}>Skip</button>
        <button
          onClick={submit}
          disabled={!allAnswered}
          style={{ ...primaryBtn, opacity: allAnswered ? 1 : 0.4 }}
        >Check answers</button>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: '24px 26px',
        background: 'var(--paper-hi)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 32,
      }}
    >{children}</motion.div>
  )
}

function ResultHeader({ correctCount, total, pct }) {
  const allRight = correctCount === total
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: allRight ? 'var(--success)' : 'var(--accent)',
        marginBottom: 4, fontWeight: 600,
      }}>
        {allRight ? 'Perfect recall' : 'Recall result'}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
        letterSpacing: '-0.01em',
      }}>
        {correctCount} of {total} ({pct}%)
      </div>
    </div>
  )
}

const primaryBtn = {
  padding: '8px 16px',
  background: 'var(--accent)',
  color: 'var(--paper)',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-body)',
  fontSize: 13, fontWeight: 500,
  cursor: 'pointer',
}
const ghostBtn = {
  padding: '8px 16px',
  background: 'transparent',
  color: 'var(--ink-soft)',
  border: '1px solid var(--rule-strong)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  cursor: 'pointer',
}
