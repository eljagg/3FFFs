import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'
import { getScenarioArt } from '../components/scenario-art/index.jsx'
import ConfidenceSlider, { ConfidenceFeedback } from '../components/scenario/ConfidenceSlider.jsx'
import WhatIfPreview from '../components/scenario/WhatIfPreview.jsx'
import InlineTutor from '../components/scenario/InlineTutor.jsx'

const SEVERITY_COLORS = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }

/**
 * Branching-aware Scenario page (v24).
 *
 * v24 additions:
 *  - Confidence slider — captured BEFORE the user picks an answer; surfaces
 *    metacognitive blind spots when confidence and correctness diverge.
 *  - WhatIf preview — after a correct answer, the user can opt-in to walk
 *    through the consequence stages they would have hit on a wrong pick.
 *    Multiplies the value of consequence content already in the seed data.
 *  - Inline tutor button — a slide-over Claude that knows the current stage
 *    context. Removes the "leave the scenario, type a question, lose your
 *    place" friction of the standalone /tutor page.
 *  - Live stage map hover previews — circles in the timeline now expose the
 *    technique + a one-line teaser on hover, making the F3 framework feel
 *    alive instead of decorative.
 *
 * - Data: /api/scenarios/:id/path returns primary + consequence stages + branch edges
 * - Navigation: /api/scenarios/:id/choose tells us where to go next based on the option
 * - Visualization: primary stages on horizontal timeline; consequence branches drop below
 */

export default function Scenario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentStageId, setCurrentStageId] = useState(null)
  const [answers, setAnswers] = useState({})
  // v24: confidence is captured per-stage (1-5), keyed by stageId
  const [confidence, setConfidence] = useState({})
  const [pathTaken, setPathTaken] = useState([])  // ordered list of stageIds
  const [completed, setCompleted] = useState(false)
  const [navigationError, setNavigationError] = useState(null)
  const [allScenarios, setAllScenarios] = useState([])
  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | 'error' | null
  // v24: tutor slide-over open state
  const [tutorOpen, setTutorOpen] = useState(false)

  // Load all scenarios so we can offer prev/next navigation
  useEffect(() => {
    api.listScenarios().then(r => setAllScenarios(r.scenarios || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getScenarioPath(id)
      .then(d => {
        // Defensive: filter out any malformed path entries to prevent silent crashes
        const cleanData = {
          ...d,
          path: (d.path || []).filter(p => p && p.stage && p.stage.id),
          consequenceStages: (d.consequenceStages || []).filter(p => p && p.stage && p.stage.id),
        }
        if (cleanData.path.length === 0) {
          setError('Scenario has no stages. Try re-running the seed.')
          return
        }
        setData(cleanData)
        const first = cleanData.path[0].stage.id
        setCurrentStageId(first)
        setPathTaken([first])
      })
      .catch(e => {
        console.error('Failed to load scenario:', e)
        setError(e.message || 'Unknown error loading scenario')
      })
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
  const correctPrimaryCount = path.filter(p => p?.stage?.id && answers[p.stage.id]?.correct).length
  const progressPct = path.length ? (correctPrimaryCount / path.length) * 100 : 0
  const tookConsequencePath = pathTaken.some(id => allStages[id]?.stage?.type === 'consequence')

  async function handleAnswer(optionIndex) {
    if (!currentEntry) return
    const stage = currentEntry.stage
    const option = stage.options[optionIndex]
    const correct = !!option.correct
    const stageConfidence = confidence[stage.id] || 0

    setAnswers(a => ({ ...a, [stage.id]: { optionIndex, correct, confidence: stageConfidence } }))
    setNavigationError(null)
    setSaveStatus('saving')

    // Fire submit but don't block navigation on it. Confidence is included
    // as an optional field — the server endpoint accepts arbitrary body keys
    // and the client uses it for local UX even if the server ignores it.
    api.submitStage(scenario.id, { stageId: stage.id, optionIndex, correct, confidence: stageConfidence })
      .then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 2000)
      })
      .catch(err => {
        console.warn('submitStage failed:', err.message)
        setSaveStatus('error')
      })

    // Wait briefly so user can see feedback, then navigate
    setTimeout(async () => {
      try {
        const { nextStageId, done } = await api.chooseStageOption(scenario.id, {
          stageId: stage.id, optionIndex,
        })
        if (done || !nextStageId) {
          try {
            await api.completeScenario(scenario.id)
            setSaveStatus('saved')
          } catch (err) {
            console.warn('completeScenario failed:', err.message)
            setSaveStatus('error')
          }
          setCompleted(true)
          return
        }
        setCurrentStageId(nextStageId)
        setPathTaken(p => [...p, nextStageId])
      } catch (err) {
        // Don't swallow silently — surface to user AND fall back to client-side navigation
        console.error('chooseStageOption failed:', err)
        setNavigationError(err.message || 'Navigation failed')
        // Fallback: find next primary stage in path by order
        const currentOrder = stage.order ?? path.findIndex(p => p.stage.id === stage.id) + 1
        const nextEntry = path.find(p => (p.stage.order ?? 0) > currentOrder)
        if (nextEntry?.stage?.id) {
          setCurrentStageId(nextEntry.stage.id)
          setPathTaken(p => [...p, nextEntry.stage.id])
        } else {
          setCompleted(true)
        }
      }
    }, 1000)
  }

  function handleManualAdvance() {
    if (!currentEntry) return
    const currentOrder = currentEntry.stage.order ?? 0
    const nextEntry = path.find(p => (p.stage.order ?? 0) > currentOrder)
    if (nextEntry?.stage?.id) {
      setCurrentStageId(nextEntry.stage.id)
      setPathTaken(p => [...p, nextEntry.stage.id])
      setNavigationError(null)
    } else {
      setCompleted(true)
    }
  }

  function setStageConfidence(stageId, value) {
    setConfidence(c => ({ ...c, [stageId]: value }))
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <ScenarioNav
          scenario={scenario}
          allScenarios={allScenarios}
          onRestart={() => {
            const first = data.path?.[0]?.stage?.id
            if (first) {
              setCurrentStageId(first)
              setPathTaken([first])
              setAnswers({})
              setConfidence({})
              setCompleted(false)
              setNavigationError(null)
              setSaveStatus(null)
            }
          }}
          onExit={() => navigate('/scenarios')}
          saveStatus={saveStatus}
        />

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

      {/* Scenario illustration — sets the scene before the timeline */}
      <ScenarioArt scenarioId={scenario.id} />

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
          <>
            <StagePanel
              key={currentStageId}
              entry={currentEntry}
              answer={answers[currentStageId]}
              confidence={confidence[currentStageId] || 0}
              onConfidenceChange={(v) => setStageConfidence(currentStageId, v)}
              onAnswer={handleAnswer}
              onAskTutor={() => setTutorOpen(true)}
              allStages={allStages}
              totalPrimary={path.length}
              currentIdx={path.findIndex(p => p.stage.id === currentStageId)}
            />
            {answers[currentStageId] && (
              <div style={{
                marginTop: 18, padding: '16px 20px',
                background: navigationError ? 'var(--danger-bg)' : 'var(--paper-hi)',
                border: `1px solid ${navigationError ? 'var(--danger)' : 'var(--rule)'}`,
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  {navigationError ? (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: 4 }}>
                        Could not advance automatically
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{navigationError}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      Advancing to next stage…
                    </div>
                  )}
                </div>
                <button
                  onClick={handleManualAdvance}
                  style={{
                    padding: '10px 18px', fontSize: 13, fontWeight: 500,
                    background: 'var(--ink)', color: 'var(--paper)',
                    border: 'none', borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                  }}
                >Continue →</button>
              </div>
            )}
          </>
        )}
        {completed && (() => {
          const idx = allScenarios.findIndex(s => s.id === scenario.id)
          const nextScenario = idx >= 0 && idx < allScenarios.length - 1 ? allScenarios[idx + 1] : null
          return (
            <CompletionPanel
              key="done"
              scenario={scenario}
              tookConsequencePath={tookConsequencePath}
              pathTaken={pathTaken}
              allStages={allStages}
              answers={answers}
              confidence={confidence}
              nextScenario={nextScenario}
              onNext={() => nextScenario && navigate('/scenarios/' + nextScenario.id)}
              onExit={() => navigate('/scenarios')}
              onCoverage={() => navigate('/coverage')}
            />
          )
        })()}
      </AnimatePresence>

      {/* v24: inline tutor slide-over */}
      <InlineTutor
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        stageContext={currentEntry ? { ...currentEntry, scenario } : null}
        role={role}
      />
    </div>
  )
}

function AttackPath({ path = [], consequenceStages = [], answers = {}, currentStageId, pathTaken = [], onStageClick }) {
  // Build a map: primary stage id -> [consequence stages that branch from it]
  const consequencesByParent = useMemo(() => {
    const map = {}
    const safeConsequences = Array.isArray(consequenceStages) ? consequenceStages : []
    for (const primary of path) {
      if (!primary?.stage?.id) continue
      const parentId = primary.stage.id
      const consequences = safeConsequences.filter(c =>
        c?.stage?.id && primary.branches?.some(b => b.toStageId === c.stage.id)
      )
      if (consequences.length) map[parentId] = consequences
    }
    return map
  }, [path, consequenceStages])

  // v24: hovered stage id, for the live preview tooltip on the timeline
  const [hoverId, setHoverId] = useState(null)
  const hoveredEntry = hoverId ? path.find(p => p.stage.id === hoverId) : null

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
          const isVisited = pathTaken.includes(stageId)
          const consequences = consequencesByParent[stageId] || []

          return (
            <div key={stageId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <motion.button
                onClick={() => onStageClick(stageId)}
                onMouseEnter={() => setHoverId(stageId)}
                onMouseLeave={() => setHoverId(h => (h === stageId ? null : h))}
                onFocus={() => setHoverId(stageId)}
                onBlur={() => setHoverId(h => (h === stageId ? null : h))}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                style={{
                  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10, padding: '0 6px',
                  background: 'transparent', cursor: isVisited ? 'pointer' : 'default',
                  border: 'none', opacity: isVisited ? 1 : 0.4,
                }}
                disabled={!isVisited}
                title={!isVisited ? `${entry.tactic?.name || 'Stage ' + (i + 1)} — locked until you reach it` : undefined}
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

              {/* v24: hover preview tooltip on the timeline circle */}
              <AnimatePresence>
                {hoverId === stageId && hoveredEntry && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 12px)',
                      left: '50%', transform: 'translateX(-50%)',
                      zIndex: 10, pointerEvents: 'none',
                      width: 220,
                      padding: '10px 12px',
                      background: 'var(--ink)', color: 'var(--paper)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      fontSize: 12, lineHeight: 1.45,
                    }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                      textTransform: 'uppercase', opacity: 0.6, marginBottom: 4,
                    }}>
                      Stage {i + 1} · {hoveredEntry.tactic?.name}
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {hoveredEntry.stage?.heading}
                    </div>
                    {!isVisited && (
                      <div style={{ opacity: 0.7, fontSize: 11, fontStyle: 'italic' }}>
                        Locked — reach this stage by working through the scenario
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

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

function StagePanel({ entry, answer, confidence, onConfidenceChange, onAnswer, onAskTutor, allStages, totalPrimary, currentIdx }) {
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
        position: 'relative',
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

          {/* v24: confidence rating before the decision */}
          <ConfidenceSlider
            value={confidence}
            onChange={onConfidenceChange}
            locked={!!answer}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stage.options.map((opt, i) => {
              const picked = answer?.optionIndex === i
              const isAnswered = !!answer
              const showCorrect = isAnswered && opt.correct
              const showWrong = picked && !opt.correct
              const showOtherWrong = isAnswered && !picked && !opt.correct
              const leadsToConsequence = !!opt.leadsTo
              const canAnswer = !answer && confidence > 0

              // Rationale styling differs by role:
              //   • correct option — green, emphasised ("This was the right call.")
              //   • your wrong pick — red, explains what went wrong
              //   • other wrong options — muted, for completeness without noise
              let rationaleStyle = null
              let rationaleLabel = null
              if (showCorrect) {
                rationaleStyle = {
                  borderColor: 'var(--success)',
                  background: 'var(--success-bg)',
                  color: 'var(--ink)',
                }
                rationaleLabel = picked ? 'Why this was right' : 'Why this is the right call'
              } else if (showWrong) {
                rationaleStyle = {
                  borderColor: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  color: 'var(--ink)',
                }
                rationaleLabel = 'Why this was off'
              } else if (showOtherWrong) {
                rationaleStyle = {
                  borderColor: 'var(--rule)',
                  background: 'var(--paper-dim)',
                  color: 'var(--ink-soft)',
                }
                rationaleLabel = 'Why this would have fallen short'
              }

              return (
                <motion.button
                  key={i} onClick={() => canAnswer && onAnswer(i)} disabled={!canAnswer}
                  whileHover={canAnswer ? { x: 2, borderColor: 'var(--ink)' } : {}}
                  whileTap={canAnswer ? { scale: 0.99 } : {}}
                  animate={
                    showCorrect ? { backgroundColor: 'var(--success-bg)', borderColor: 'var(--success)' } :
                    showWrong ? { backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)', x: [0, -4, 4, -4, 4, 0] } :
                    showOtherWrong ? { opacity: 0.75 } : {}
                  }
                  transition={{ duration: showWrong ? 0.4 : 0.3 }}
                  style={{
                    padding: '14px 18px', background: 'var(--paper-dim)',
                    border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
                    fontSize: 14, textAlign: 'left',
                    cursor: canAnswer ? 'pointer' : 'default',
                    color: 'var(--ink)', lineHeight: 1.5, width: '100%',
                    opacity: !answer && confidence === 0 ? 0.6 : 1,
                  }}
                  title={!answer && confidence === 0 ? 'Pick a confidence level above first' : undefined}
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
                  {isAnswered && opt.rationale && rationaleStyle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3, delay: showCorrect ? 0 : 0.1 }}
                      style={{
                        marginTop: 10, padding: '10px 12px',
                        border: '1px solid', borderRadius: 'var(--radius)',
                        fontSize: 13, lineHeight: 1.55,
                        ...rationaleStyle,
                      }}
                    >
                      {rationaleLabel && (
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: showCorrect ? 'var(--success)' : showWrong ? 'var(--danger)' : 'var(--ink-faint)',
                          marginBottom: 4, fontWeight: 600,
                        }}>{rationaleLabel}</div>
                      )}
                      {opt.rationale}
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* v24: confidence calibration feedback after answering */}
          {answer && (
            <ConfidenceFeedback
              confidence={answer.confidence ?? confidence}
              correct={answer.correct}
            />
          )}

          {/* v24: what-if preview after correct answer, when alternative options branch to consequences */}
          {answer?.correct && (
            <WhatIfPreview stage={stage} allStages={allStages} />
          )}
        </div>
      )}

      {/* v24: floating "Ask the Tutor" button — pinned in the bottom-right of the panel */}
      <button
        onClick={onAskTutor}
        aria-label="Ask the Tutor about this stage"
        style={{
          position: 'absolute', bottom: 16, right: 16,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--ink)', color: 'var(--paper)',
          border: 'none', borderRadius: 999,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          transition: 'transform var(--dur) ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Ask the Tutor
      </button>
    </motion.div>
  )
}

function CompletionPanel({ scenario, tookConsequencePath, pathTaken = [], allStages = {}, answers = {}, confidence = {}, nextScenario, onNext, onExit, onCoverage }) {
  const consequencesVisited = pathTaken.filter(id => allStages[id]?.stage?.type === 'consequence').length

  // v24: compute calibration score across this scenario.
  // Calibration score = average of how well confidence matched correctness:
  //   - confident (4-5) + correct = 1.0
  //   - confident (4-5) + wrong   = 0.0  (the most-instructive miss)
  //   - uncertain (1-2) + correct = 0.6  (lucky)
  //   - uncertain (1-2) + wrong   = 0.5  (honest)
  //   - mid (3) anything           = 0.7
  const stageAnswers = Object.entries(answers)
    .map(([sid, ans]) => ({ sid, ...ans, confidence: ans.confidence ?? confidence[sid] ?? 0 }))
    .filter(a => a.confidence > 0)

  let calibrationScore = null
  let calibrationLabel = null
  if (stageAnswers.length > 0) {
    const scores = stageAnswers.map(a => {
      if (a.confidence >= 4)  return a.correct ? 1.0 : 0.0
      if (a.confidence <= 2)  return a.correct ? 0.6 : 0.5
      return 0.7
    })
    const avg = scores.reduce((s, x) => s + x, 0) / scores.length
    calibrationScore = Math.round(avg * 100)
    calibrationLabel =
      calibrationScore >= 85 ? 'Well-calibrated judgment'
      : calibrationScore >= 65 ? 'Reasonable calibration'
      : 'Calibration needs work'
  }

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

      {/* v24: calibration recap */}
      {calibrationScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            margin: '0 auto 18px', padding: '14px 18px', maxWidth: 460,
            background: 'var(--paper-hi)', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-lg)',
          }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4,
          }}>Calibration this scenario</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
            lineHeight: 1.1, marginBottom: 4,
            color: calibrationScore >= 85 ? 'var(--success)'
                 : calibrationScore >= 65 ? 'var(--warning)' : 'var(--danger)',
          }}>{calibrationScore}<span style={{ fontSize: 16, color: 'var(--ink-faint)' }}> / 100</span></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{calibrationLabel}</div>
        </motion.div>
      )}

      <p style={{ fontSize: 13, color: 'var(--ink-faint)', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Your progress is logged — check your coverage map to see which F3 techniques you've now encountered.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {nextScenario && (
          <button
            onClick={onNext}
            style={{
              padding: '12px 22px', fontSize: 14, fontWeight: 500,
              background: 'var(--ink)', color: 'var(--paper)',
              border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
            }}
          >Next scenario: {nextScenario.title.split(' — ')[0]} →</button>
        )}
        <button
          onClick={onExit}
          style={{
            padding: '12px 22px', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer',
          }}
        >Back to all scenarios</button>
        <button
          onClick={onCoverage}
          style={{
            padding: '12px 22px', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: 'var(--ink-soft)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer',
          }}
        >See my coverage</button>
      </div>
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

function ScenarioArt({ scenarioId }) {
  const Art = getScenarioArt(scenarioId)
  if (!Art) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{
        marginBottom: 36,
        padding: '20px 24px',
        background: 'var(--paper-hi)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Art />
    </motion.div>
  )
}

function ScenarioNav({ scenario, allScenarios, onRestart, onExit, saveStatus }) {
  const navigate = useNavigate()
  if (!scenario) return null

  const idx = allScenarios.findIndex(s => s.id === scenario.id)
  const prev = idx > 0 ? allScenarios[idx - 1] : null
  const next = idx >= 0 && idx < allScenarios.length - 1 ? allScenarios[idx + 1] : null

  const saveColor = saveStatus === 'saved' ? 'var(--success)'
                  : saveStatus === 'saving' ? 'var(--ink-faint)'
                  : saveStatus === 'error' ? 'var(--danger)' : null
  const saveLabel = saveStatus === 'saved' ? 'Progress saved'
                  : saveStatus === 'saving' ? 'Saving…'
                  : saveStatus === 'error' ? 'Save failed — your progress may not be recorded' : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20, gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onExit}
          style={{
            padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            color: 'var(--ink-soft)',
          }}
        >← All scenarios</button>
        <button
          onClick={onRestart}
          style={{
            padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            color: 'var(--ink-faint)',
          }}
        >↻ Restart</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {saveStatus && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: saveColor,
            letterSpacing: '0.08em', marginRight: 10,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: saveColor,
              animation: saveStatus === 'saving' ? 'pulse 1s ease-in-out infinite' : 'none',
            }} />
            {saveLabel}
          </span>
        )}
        {allScenarios.length > 1 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
            letterSpacing: '0.08em', marginRight: 6,
          }}>{idx + 1} of {allScenarios.length}</span>
        )}
        {prev && (
          <button
            onClick={() => navigate('/scenarios/' + prev.id)}
            title={prev.title}
            style={{
              padding: '7px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent', border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)', cursor: 'pointer',
              color: 'var(--ink-soft)',
            }}
          >← Prev</button>
        )}
        {next && (
          <button
            onClick={() => navigate('/scenarios/' + next.id)}
            title={next.title}
            style={{
              padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius)', cursor: 'pointer',
            }}
          >Next →</button>
        )}
      </div>
    </div>
  )
}
