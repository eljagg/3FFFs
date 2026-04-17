import { useEffect, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

export default function Quiz() {
  const { userId, role, refreshProgress } = useUser()
  const [questions, setQuestions] = useState([])
  const [idx, setIdx]             = useState(0)
  const [answers, setAnswers]     = useState({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    setLoading(true); setIdx(0); setAnswers({}); setDone(false)
    api.getQuizzes({ role })
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [role])

  if (loading) return <Page><div style={{ padding: 40, color: 'var(--ink-faint)' }}>Loading quiz…</div></Page>
  if (error)   return <Page eyebrow="Error" title="Could not load quiz" lede={error} />
  if (!questions.length) {
    return <Page eyebrow="Quiz" title="No questions" lede="No quiz questions available for your role yet." />
  }

  const q = questions[idx]
  const picked = answers[idx]
  const isAnswered = picked !== undefined
  const total = questions.length

  async function pick(i) {
    if (isAnswered) return
    const correct = q.options[i].correct
    setAnswers({ ...answers, [idx]: { i, correct } })
    try { await api.quizAnswer(userId, q.id, i, correct) } catch {}
  }

  function next() {
    if (idx < total - 1) setIdx(idx + 1)
    else {
      setDone(true)
      refreshProgress()
    }
  }

  const correctCount = Object.values(answers).filter((a) => a.correct).length
  const pct = total ? Math.round((correctCount / total) * 100) : 0

  const styles = {
    progressBar: {
      display: 'flex', gap: 4, marginBottom: 32,
    },
    progressSeg: (state) => ({
      flex: 1, height: 3,
      background: state === 'correct' ? 'var(--success)'
                : state === 'wrong'   ? 'var(--danger)'
                : state === 'active'  ? 'var(--accent)'
                : 'var(--rule)',
      borderRadius: 2,
    }),
    meta: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--ink-faint)',
      marginBottom: 18,
      display: 'flex', justifyContent: 'space-between',
    },
    tacticBadge: { color: 'var(--accent)' },
    qText: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(22px, 3vw, 30px)',
      fontWeight: 500,
      letterSpacing: '-0.015em',
      lineHeight: 1.3,
      marginBottom: 28,
      maxWidth: 760,
    },
    options: { display: 'grid', gap: 10, marginBottom: 28 },
    opt: (state) => ({
      textAlign: 'left', padding: '16px 20px',
      fontSize: 14.5, lineHeight: 1.55,
      borderRadius: 'var(--radius)',
      border: '1px solid',
      borderColor: state === 'correct' ? 'var(--success)'
                 : state === 'wrong'   ? 'var(--danger)'
                 : state === 'dim'     ? 'var(--rule)'
                                       : 'var(--rule-strong)',
      background: state === 'correct' ? 'var(--success-bg)'
                : state === 'wrong'   ? 'var(--danger-bg)'
                                      : 'var(--paper-hi)',
      cursor: state === 'idle' ? 'pointer' : 'default',
      opacity: state === 'dim' ? 0.5 : 1,
      transition: 'all var(--dur) ease',
    }),
    rationale: (correct) => ({
      padding: '14px 18px',
      borderLeft: `3px solid ${correct ? 'var(--success)' : 'var(--danger)'}`,
      background: correct ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: correct ? 'var(--success)' : 'var(--danger)',
      fontSize: 13.5, lineHeight: 1.6,
      borderRadius: 'var(--radius)',
      marginBottom: 28,
    }),
    nextBtn: {
      padding: '12px 24px',
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 'var(--radius)',
      fontSize: 13, fontWeight: 500,
      cursor: 'pointer',
      opacity: isAnswered ? 1 : 0.4,
    },

    resultsWrap: { textAlign: 'center', padding: '40px 20px' },
    resultsScore: {
      fontFamily: 'var(--font-display)',
      fontSize: 96, fontWeight: 500,
      lineHeight: 1,
      letterSpacing: '-0.04em',
      color: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)',
      marginBottom: 8,
    },
    resultsText: { fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 10 },
    resultsSub: { color: 'var(--ink-soft)', fontSize: 15, marginBottom: 28 },
    resultsBtn: {
      padding: '12px 24px',
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 'var(--radius)',
      fontSize: 13, fontWeight: 500,
      cursor: 'pointer',
    },
  }

  if (done) {
    return (
      <Page>
        <div style={styles.resultsWrap} className="fade-up">
          <div style={styles.resultsScore}>{pct}%</div>
          <div style={styles.resultsText}>{correctCount} of {total} correct</div>
          <div style={styles.resultsSub}>
            {pct >= 80 ? 'Strong grasp of F3 fundamentals.' :
             pct >= 60 ? 'Solid — a few areas to brush up on.' :
                         'Worth another pass through the scenarios and framework.'}
          </div>
          <button
            onClick={() => {
              setIdx(0); setAnswers({}); setDone(false)
            }}
            style={styles.resultsBtn}
          >
            Retake quiz →
          </button>
        </div>
      </Page>
    )
  }

  return (
    <Page
      eyebrow="Knowledge check"
      title="Quick quiz."
      lede="Short questions on F3 tactics, calibrated to your role. Each answer is logged so you can see where to focus next."
    >
      <div style={styles.progressBar}>
        {questions.map((_, i) => {
          const a = answers[i]
          const state = i === idx ? 'active' : a ? (a.correct ? 'correct' : 'wrong') : 'idle'
          return <div key={i} style={styles.progressSeg(state)} />
        })}
      </div>

      <div style={styles.meta}>
        <span>Question {idx + 1} of {total}</span>
        <span style={styles.tacticBadge}>F3 · {q.tacticName}</span>
      </div>

      <h2 style={styles.qText}>{q.question}</h2>

      <div style={styles.options}>
        {q.options.map((o, i) => {
          let state = 'idle'
          if (isAnswered) {
            if (o.correct) state = 'correct'
            else if (i === picked.i) state = 'wrong'
            else state = 'dim'
          }
          return (
            <button
              key={i}
              style={styles.opt(state)}
              onClick={() => pick(i)}
              disabled={isAnswered}
              onMouseEnter={(e) => { if (!isAnswered) e.currentTarget.style.borderColor = 'var(--ink)' }}
              onMouseLeave={(e) => { if (!isAnswered) e.currentTarget.style.borderColor = 'var(--rule-strong)' }}
            >
              {o.text}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div style={styles.rationale(picked.correct)}>
          {q.options[picked.i].rationale}
        </div>
      )}

      <button onClick={next} disabled={!isAnswered} style={styles.nextBtn}>
        {idx < total - 1 ? 'Next question →' : 'See results →'}
      </button>
    </Page>
  )
}
