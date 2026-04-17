import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

export default function Scenario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId, refreshProgress } = useUser()

  const [scenario, setScenario] = useState(null)
  const [stageIdx, setStageIdx] = useState(0)
  const [answered, setAnswered] = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getScenario(id)
      .then((d) => setScenario(d.scenario))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Page><div style={{ padding: 40, color: 'var(--ink-faint)' }}>Loading…</div></Page>
  if (error)   return <Page eyebrow="Error" title="Could not load scenario" lede={error} />
  if (!scenario) return null

  const stage = scenario.stages[stageIdx]
  const total = scenario.stages.length
  const answeredChoice = answered[stageIdx]
  const isAnswered = answeredChoice !== undefined

  function pick(i) {
    if (isAnswered) return
    const opt = stage.options[i]
    setAnswered({ ...answered, [stageIdx]: i })
  }

  async function complete() {
    try { await api.scenarioComplete(userId, scenario.id) } catch {}
    await refreshProgress()
    navigate('/scenarios')
  }

  const sevColor = (sev) => ({
    low: 'var(--ink-faint)',
    medium: 'var(--warning)',
    high: 'var(--danger)',
  })[sev] || 'var(--ink-faint)'

  const styles = {
    backLink: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--ink-faint)',
      marginBottom: 14,
      display: 'inline-block',
    },
    meta: {
      display: 'flex', gap: 14, alignItems: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--ink-faint)',
      marginBottom: 36,
    },
    sev: (sev) => ({
      padding: '3px 8px', borderRadius: 3,
      background: sev === 'high' ? 'var(--danger-bg)' : 'var(--warning-bg)',
      color: sev === 'high' ? 'var(--danger)' : 'var(--warning)',
    }),

    progressWrap: {
      display: 'flex', gap: 4,
      marginBottom: 40,
    },
    progressStep: (state) => ({
      flex: 1, height: 3,
      background: state === 'done' ? 'var(--ink)'
                : state === 'active' ? 'var(--accent)'
                : 'var(--rule)',
      borderRadius: 2,
      transition: 'background var(--dur) ease',
    }),

    tacticLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--accent)',
      marginBottom: 10,
    },
    stageHeading: {
      fontFamily: 'var(--font-display)',
      fontSize: 30, fontWeight: 500,
      letterSpacing: '-0.015em',
      marginBottom: 18,
    },
    narrative: {
      fontSize: 17, lineHeight: 1.7,
      color: 'var(--ink-soft)',
      marginBottom: 36,
      maxWidth: 760,
      borderLeft: '3px solid var(--accent)',
      paddingLeft: 22,
      fontStyle: 'italic',
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
    },

    signalsBox: {
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 26px',
      marginBottom: 36,
    },
    signalsLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
      color: 'var(--ink-faint)',
      marginBottom: 14,
    },
    signal: {
      display: 'flex', gap: 12, padding: '8px 0',
      fontSize: 14,
      borderTop: '1px solid var(--rule)',
    },
    signalDot: (sev) => ({
      width: 8, height: 8, borderRadius: 2,
      background: sevColor(sev),
      flexShrink: 0,
      marginTop: 6,
    }),
    signalSev: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--ink-faint)',
      width: 54, flexShrink: 0,
      marginTop: 3,
    },

    questionBlock: { marginBottom: 36 },
    questionTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: 22, fontWeight: 500,
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      marginBottom: 18,
      maxWidth: 720,
    },
    options: { display: 'grid', gap: 10 },
    opt: (state) => ({
      textAlign: 'left',
      padding: '16px 20px',
      border: '1px solid',
      borderColor:
        state === 'correct' ? 'var(--success)' :
        state === 'wrong'   ? 'var(--danger)'  :
        state === 'dim'     ? 'var(--rule)'    :
                              'var(--rule-strong)',
      background:
        state === 'correct' ? 'var(--success-bg)' :
        state === 'wrong'   ? 'var(--danger-bg)'  :
                              'var(--paper-hi)',
      color: 'var(--ink)',
      borderRadius: 'var(--radius)',
      fontSize: 14.5, lineHeight: 1.5,
      cursor: state === 'idle' || state === 'hover' ? 'pointer' : 'default',
      transition: 'all var(--dur) ease',
      opacity: state === 'dim' ? 0.5 : 1,
    }),
    rationaleBox: (correct) => ({
      marginTop: 14,
      padding: '14px 18px',
      borderRadius: 'var(--radius)',
      borderLeft: `3px solid ${correct ? 'var(--success)' : 'var(--danger)'}`,
      background: correct ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: correct ? 'var(--success)' : 'var(--danger)',
      fontSize: 13.5, lineHeight: 1.6,
    }),
    rationaleLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 4,
    },

    nav: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 24, borderTop: '1px solid var(--rule)',
    },
    navBtn: (primary) => ({
      padding: '12px 24px',
      fontFamily: 'var(--font-body)',
      fontSize: 13, fontWeight: 500,
      letterSpacing: '0.01em',
      borderRadius: 'var(--radius)',
      border: primary ? 'none' : '1px solid var(--rule-strong)',
      background: primary ? 'var(--ink)' : 'transparent',
      color:      primary ? 'var(--paper)' : 'var(--ink-soft)',
      cursor: 'pointer',
      transition: 'all var(--dur) ease',
    }),
    stageCounter: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--ink-faint)',
    },
  }

  const optState = (i) => {
    if (!isAnswered) return 'idle'
    if (stage.options[i].correct) return 'correct'
    if (i === answeredChoice && !stage.options[i].correct) return 'wrong'
    return 'dim'
  }

  return (
    <Page>
      <a href="#" onClick={(e) => { e.preventDefault(); navigate('/scenarios') }} style={styles.backLink}>
        ← All scenarios
      </a>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 40px)',
        fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1,
        marginBottom: 14, maxWidth: 800,
      }}>
        {scenario.title}
      </h1>

      <div style={styles.meta}>
        <span style={styles.sev(scenario.severity)}>{scenario.severity} risk</span>
        <span>${(scenario.estimatedLoss / 1000).toLocaleString()}k estimated loss</span>
        <span>{total} stages</span>
      </div>

      <div style={styles.progressWrap}>
        {scenario.stages.map((_, i) => (
          <div
            key={i}
            style={styles.progressStep(i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'idle')}
          />
        ))}
      </div>

      <div style={styles.tacticLabel}>
        F3 {stage.tacticName} · {stage.techniqueName}
      </div>
      <h2 style={styles.stageHeading}>{stage.heading}</h2>
      <p style={styles.narrative}>{stage.narrative}</p>

      <div style={styles.signalsBox}>
        <div style={styles.signalsLabel}>Observable signals</div>
        {stage.signals.map((s, i) => (
          <div key={i} style={styles.signal}>
            <div style={styles.signalDot(s.severity)} />
            <div style={styles.signalSev}>{s.severity}</div>
            <div style={{ flex: 1 }}>{s.text}</div>
          </div>
        ))}
      </div>

      <div style={styles.questionBlock}>
        <div style={styles.questionTitle}>{stage.question}</div>
        <div style={styles.options}>
          {stage.options.map((o, i) => (
            <button
              key={i}
              style={styles.opt(optState(i))}
              onClick={() => pick(i)}
              disabled={isAnswered}
              onMouseEnter={(e) => { if (!isAnswered) e.currentTarget.style.borderColor = 'var(--ink)' }}
              onMouseLeave={(e) => { if (!isAnswered) e.currentTarget.style.borderColor = 'var(--rule-strong)' }}
            >
              {o.text}
            </button>
          ))}
        </div>

        {isAnswered && (
          <div style={styles.rationaleBox(stage.options[answeredChoice].correct)}>
            <div style={styles.rationaleLabel}>
              {stage.options[answeredChoice].correct ? 'Correct' : 'Not the strongest choice'}
            </div>
            {stage.options[answeredChoice].rationale}
          </div>
        )}
      </div>

      <div style={styles.nav}>
        <button
          onClick={() => setStageIdx((i) => i - 1)}
          disabled={stageIdx === 0}
          style={{ ...styles.navBtn(false), visibility: stageIdx === 0 ? 'hidden' : 'visible' }}
        >
          ← Previous stage
        </button>
        <div style={styles.stageCounter}>Stage {stageIdx + 1} of {total}</div>
        {stageIdx < total - 1 ? (
          <button
            onClick={() => setStageIdx((i) => i + 1)}
            disabled={!isAnswered}
            style={{ ...styles.navBtn(true), opacity: isAnswered ? 1 : 0.4 }}
          >
            Next stage →
          </button>
        ) : (
          <button onClick={complete} disabled={!isAnswered} style={{ ...styles.navBtn(true), opacity: isAnswered ? 1 : 0.4 }}>
            Complete scenario
          </button>
        )}
      </div>
    </Page>
  )
}
