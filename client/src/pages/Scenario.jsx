import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api.js'

const SEVERITY_COLORS = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }

/**
 * Branching-aware Scenario page.
 *
 * - Data: /api/scenarios/:id/path returns primary + consequence stages + branch edges
 * - Navigation: /api/scenarios/:id/choose tells us where to go next based on the option
 * - Visualization: primary stages on horizontal timeline; consequence branches drop below
 */

export default function Scenario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentStageId, setCurrentStageId] = useState(null)
  const [answers, setAnswers] = useState({})
  const [pathTaken, setPathTaken] = useState([])  // ordered list of stageIds
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getScenarioPath(id)
      .then(d => {
        setData(d)
        const first = d.path?.[0]?.stage?.id
        if (first) {
          setCurrentStageId(first)
          setPathTaken([first])
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const allStages = useMemo(() => {
    if (!data) return {}
    const map = {}
    for (const entry of [...(data.path || []), ...(data.consequenceStages || [])]) {
      if (entry.stage?.id) map[entry.stage.id] = entry
    }
    return map
  }, [data])

  if (loading) return <FullLoading />
  if (error)   return <ErrorScreen err={error} onBack={() => navigate('/scenarios')} />
  if (!data)   return null

  const { scenario, path, consequenceStages } = data
  const currentEntry = allStages[currentStageId]
  const severityColor = SEVERITY_COLORS[scenario.severity] || 'var(--ink)'

  // Progress = how many primary stages we've answered correctly
  const correctPrimaryCount = path.filter(p => answers[p.stage.id]?.correct).length
  const progressPct = path.length ? (correctPrimaryCount / path.length) * 100 : 0
  const tookConsequencePath = pathTaken.some(id => allStages[id]?.stage?.type === 'consequence')

  async function handleAnswer(optionIndex) {
    if (!currentEntry) return
    const stage = currentEntry.stage
    const option = stage.options[optionIndex]
    const correct = !!option.correct

    setAnswers(a => ({ ...a, [stage.id]: { optionIndex, correct } }))

    try { await api.submitStage(scenario.id, { stageId: stage.id, optionIndex, correct }) } catch {}

    setTimeout(async () => {
      try {
        const { nextStageId, done } = await api.chooseStageOption(scenario.id, {
          stageId: stage.id, optionIndex,
        })
        if (done || !nextStageId) {
          try { await api.completeScenario(scenario.id) } catch {}
          setCompleted(true)
          return
        }
        setCurrentStageId(nextStageId)
        setPathTaken(p => [...p, nextStageId])
      } catch {}
    }, 1000)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <button onClick={() => navigate('/scenarios')} style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--ink-faint)', padding: 0, marginBottom: 16,
        }}>← All scenarios</button>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500,
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>{scenario.title}</h1>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em',
            textTransform: 'uppercase', padding: '3px 8px', border: '1px solid',
            borderColor: severityColor, color: severityColor, borderRadius: 4,
          }}>{scenario.severity} severity</span>
          {scenario.estimatedLoss && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
              ~${(scenario.estimatedLoss / 1_000_000).toFixed(2)}M estimated loss
            </span>
          )}
        </div>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 760, marginBottom: 28 }}>
          {scenario.summary}
        </p>
        <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden', marginBottom: 32 }}>
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ height: '100%', background: 'var(--accent)' }}
          />
        </div>
      </motion.div>

      <div style={{ marginBottom: 32 }}>
        <AttackPath
          path={path}
          consequenceStages={consequenceStages}
          answers={answers}
          currentStageId={currentStageId}
          pathTaken={pathTaken}
          onStageClick={(sid) => {
            if (pathTaken.includes(sid)) setCurrentStageId(sid)
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!completed && currentEntry && (
          <StagePanel
            key={currentStageId}
            entry={currentEntry}
            answer={answers[currentStageId]}
            onAnswer={handleAnswer}
            totalPrimary={path.length}
            currentIdx={path.findIndex(p => p.stage.id === currentStageId)}
          />
        )}
        {completed && (
          <CompletionPanel
            key="done"
            scenario={scenario}
            tookConsequencePath={tookConsequencePath}
            pathTaken={pathTaken}
            allStages={allStages}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AttackPath({ path, consequenceStages, answers, currentStageId, pathTaken, onStageClick }) {
  // Build a map: primary stage id -> [consequence stages that branch from it]
  const consequencesByParent = useMemo(() => {
    const map = {}
    for (const primary of path) {
      const parentId = primary.stage.id
      const consequences = consequenceStages.filter(c =>
        primary.branches?.some(b => b.toStageId === c.stage.id)
      )
      if (consequences.length) map[parentId] = consequences
    }
    return map
  }, [path, consequenceStages])

  return (
    <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${path.length}, minmax(180px, 1fr))`,
        gap: 0, position: 'relative', minWidth: path.length * 180,
      }}>
        {/* Main horizontal connecting line */}
        <svg style={{ position: 'absolute', top: 36, left: 0, width: '100%', height: 2, pointerEvents: 'none' }}>
          <line x1="0" y1="1" x2="100%" y2="1" stroke="var(--rule-strong)" strokeWidth="1" strokeDasharray="4,4" />
        </svg>

        {path.map((entry, i) => {
          const stageId = entry.stage.id
          const ans = answers[stageId]
          const isActive = stageId === currentStageId
          const isAnswered = !!ans
          const isCorrect = ans?.correct
          const isUnique = entry.tactic?.uniqueToF3
          const consequences = consequencesByParent[stageId] || []

          return (
            <div key={stageId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.button
                onClick={() => onStageClick(stageId)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10, padding: '0 6px',
                  background: 'transparent', cursor: pathTaken.includes(stageId) ? 'pointer' : 'default',
                  border: 'none', opacity: pathTaken.includes(stageId) ? 1 : 0.4,
                }}
                disabled={!pathTaken.includes(stageId)}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isCorrect ? 'var(--success)'
                      : isAnswered ? 'var(--danger)'
                      : isActive ? (isUnique ? 'var(--accent)' : 'var(--ink)')
                      : 'var(--paper-hi)',
                    borderColor: isActive || isAnswered ? 'transparent' : 'var(--rule-strong)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 72, height: 72, borderRadius: '50%', border: '2px solid',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    boxShadow: isActive ? '0 6px 20px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22,
                    color: (isActive || isAnswered) ? '#fff' : 'var(--ink)',
                  }}>{i + 1}</span>
                  {isActive && !isAnswered && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        position: 'absolute', inset: -2, borderRadius: '50%',
                        border: `2px solid ${isUnique ? 'var(--accent)' : 'var(--ink)'}`,
                      }}
                    />
                  )}
                </motion.div>

                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: isUnique ? 'var(--accent)' : 'var(--ink-faint)',
                  textAlign: 'center', fontWeight: 600,
                }}>
                  {entry.tactic?.name || '—'}
                  {isUnique && <><br /><span style={{ opacity: 0.7 }}>(F3 only)</span></>}
                </div>

                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, lineHeight: 1.2,
                  textAlign: 'center', maxWidth: 180, minHeight: 32,
                  color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                }}>
                  {entry.technique?.name || entry.stage?.heading}
                </div>

                {entry.technique?.id && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--ink-faint)', letterSpacing: '0.04em',
                  }}>{entry.technique.id}</div>
                )}
              </motion.button>

              {/* Consequence branch, dropping below this primary stage */}
              {consequences.map(c => {
                const cAns = answers[c.stage.id]
                const cActive = c.stage.id === currentStageId
                const cOnPath = pathTaken.includes(c.stage.id)
                if (!cOnPath) return null

                return (
                  <motion.div
                    key={c.stage.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      marginTop: 20, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', position: 'relative',
                    }}
                  >
                    {/* Branch connector */}
                    <svg width="2" height="30" style={{ position: 'absolute', top: -30 }}>
                      <line x1="1" y1="0" x2="1" y2="30" stroke="var(--danger)" strokeWidth="2" strokeDasharray="3,3" />
                    </svg>
                    <motion.button
                      onClick={() => onStageClick(c.stage.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: 'transparent', cursor: 'pointer', border: 'none',
                      }}
                    >
                      <motion.div
                        animate={{
                          scale: cActive ? 1.1 : 1,
                          backgroundColor: cAns?.correct ? 'var(--success)'
                            : cAns ? 'var(--danger)'
                            : cActive ? 'var(--danger)' : 'var(--paper-hi)',
                          borderColor: cActive || cAns ? 'transparent' : 'var(--danger)',
                        }}
                        style={{
                          width: 52, height: 52, borderRadius: '50%',
                          border: '2px dashed', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', position: 'relative',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cActive || cAns ? '#fff' : 'var(--danger)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </motion.div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 600,
                      }}>Consequence</div>
                    </motion.button>
                  </motion.div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StagePanel({ entry, answer, onAnswer, totalPrimary, currentIdx }) {
  const { stage, technique, tactic } = entry
  const isConsequence = stage.type === 'consequence'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      style={{
        background: isConsequence ? 'var(--danger-bg)' : 'var(--paper-hi)',
        border: '1px solid', borderColor: isConsequence ? 'var(--danger)' : 'var(--rule)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isConsequence ? 'var(--danger)' : 'var(--accent)',
        }}>
          {isConsequence
            ? 'Consequence branch · what happens when this control fails'
            : `Stage ${currentIdx + 1} of ${totalPrimary} · ${tactic?.name}`}
        </div>
        {technique && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)',
            padding: '3px 8px', border: '1px solid var(--rule)', borderRadius: 4,
          }}>{technique.id} · {technique.name}</div>
        )}
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
        lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: 14,
      }}>{stage.heading}</h2>

      <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65, marginBottom: 22, maxWidth: 720 }}>
        {stage.narrative}
      </p>

      {stage.signals?.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10,
          }}>Signals observed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stage.signals.map((sig, i) => {
              const color = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }[sig.severity] || 'var(--ink-faint)'
              return (
                <motion.div
                  key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  style={{
                    padding: '10px 14px', background: 'var(--paper-dim)',
                    borderRadius: 'var(--radius)', borderLeft: `3px solid ${color}`,
                    fontSize: 13, display: 'flex', gap: 12, alignItems: 'center',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color, minWidth: 54,
                  }}>{sig.severity}</span>
                  <span style={{ color: 'var(--ink)' }}>{sig.text}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {stage.options?.length > 0 && (
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10,
          }}>Your decision</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500,
            lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 16,
          }}>{stage.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stage.options.map((opt, i) => {
              const picked = answer?.optionIndex === i
              const showCorrect = !!answer && opt.correct
              const showWrong = picked && !opt.correct
              const leadsToConsequence = !!opt.leadsTo

              return (
                <motion.button
                  key={i} onClick={() => !answer && onAnswer(i)} disabled={!!answer}
                  whileHover={!answer ? { x: 2, borderColor: 'var(--ink)' } : {}}
                  whileTap={!answer ? { scale: 0.99 } : {}}
                  animate={
                    showCorrect ? { backgroundColor: 'var(--success-bg)', borderColor: 'var(--success)' } :
                    showWrong ? { backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)', x: [0, -4, 4, -4, 4, 0] } : {}
                  }
                  transition={{ duration: showWrong ? 0.4 : 0.3 }}
                  style={{
                    padding: '14px 18px', background: 'var(--paper-dim)',
                    border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
                    fontSize: 14, textAlign: 'left', cursor: answer ? 'default' : 'pointer',
                    color: 'var(--ink)', lineHeight: 1.5, width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <span>{opt.text}</span>
                    {showCorrect && <span style={{ color: 'var(--success)', fontSize: 18, lineHeight: 1 }}>✓</span>}
                    {showWrong && leadsToConsequence && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: 'var(--danger)', letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}>Branches →</span>
                    )}
                    {showWrong && !leadsToConsequence && (
                      <span style={{ color: 'var(--danger)', fontSize: 18, lineHeight: 1 }}>✕</span>
                    )}
                  </div>
                  {(picked || (answer && opt.correct)) && opt.rationale && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--rule)',
                        fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55,
                      }}
                    >{opt.rationale}</motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function CompletionPanel({ scenario, tookConsequencePath, pathTaken, allStages }) {
  const consequencesVisited = pathTaken.filter(id => allStages[id]?.stage?.type === 'consequence').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '40px 32px', textAlign: 'center',
        background: tookConsequencePath
          ? 'linear-gradient(135deg, var(--warning-bg), var(--paper-hi))'
          : 'linear-gradient(135deg, var(--success-bg), var(--paper-hi))',
        border: '1px solid',
        borderColor: tookConsequencePath ? 'var(--warning)' : 'var(--success)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.6, delay: 0.1 }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: tookConsequencePath ? 'var(--warning)' : 'var(--success)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}
      >
        {tookConsequencePath ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </motion.div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500,
        lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.02em',
      }}>
        {tookConsequencePath
          ? 'Scenario complete — you took a recovery path'
          : 'Scenario complete — clean prevention path'}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--ink-soft)', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.65 }}>
        {tookConsequencePath
          ? `You navigated ${scenario.title} through ${consequencesVisited} consequence branch${consequencesVisited > 1 ? 'es' : ''}. That's valuable training — every real incident has moments where prevention fails. Notice where and why.`
          : `You navigated ${scenario.title} without hitting any consequence branches. Clean run — you made the prevention call at every stage.`}
      </p>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
        Your progress is logged — check your coverage map to see which F3 techniques you've now encountered.
      </p>
    </motion.div>
  )
}

function FullLoading() {
  return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div style={{
        display: 'inline-block', width: 20, height: 20,
        border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        marginRight: 10, verticalAlign: 'middle',
      }} />
      Loading scenario...
    </div>
  )
}

function ErrorScreen({ err, onBack }) {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{err}</p>
      <button onClick={onBack} style={{
        padding: '10px 18px', background: 'var(--ink)', color: 'var(--paper)',
        borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
      }}>Back to scenarios</button>
    </div>
  )
}
