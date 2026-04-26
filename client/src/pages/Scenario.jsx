import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'
import { getScenarioArt } from '../components/scenario-art/index.jsx'
import ConfidenceSlider, { ConfidenceFeedback } from '../components/scenario/ConfidenceSlider.jsx'
import WhatIfPreview from '../components/scenario/WhatIfPreview.jsx'
import InlineTutor from '../components/scenario/InlineTutor.jsx'
import ConceptSidebar from '../components/scenario/ConceptSidebar.jsx'
import MitreTechniqueSidebar from '../components/scenario/MitreTechniqueSidebar.jsx'

const SEVERITY_COLORS = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }

/**
 * Branching-aware Scenario page (v24.1).
 *
 * v24.1 readability fixes (vs v24):
 *  - Body narrative + signals use --ink (not --ink-soft) for full contrast.
 *  - Answer options never dim before confidence is picked. Instead, the
 *    confidence slider gets a soft pulse and a small affordance line above
 *    the options says "pick confidence first" until they do.
 *  - Answered-state styling is louder: thicker borders, more saturated
 *    backgrounds, a "Your pick" pill on the chosen option, a "Right answer"
 *    pill on the correct one. The not-picked-not-correct options stay quiet.
 *
 * v24 features (preserved):
 *  - Confidence slider — captured BEFORE the user picks an answer.
 *  - WhatIf preview — opt-in walk through consequence stages on correct answer.
 *  - Inline tutor button — slide-over Claude that knows the current stage.
 *  - Live stage map hover previews on the timeline.
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
  const [confidence, setConfidence] = useState({})
  const [pathTaken, setPathTaken] = useState([])
  const [completed, setCompleted] = useState(false)
  const [navigationError, setNavigationError] = useState(null)
  const [allScenarios, setAllScenarios] = useState([])
  const [saveStatus, setSaveStatus] = useState(null)
  const [tutorOpen, setTutorOpen] = useState(false)
  // v25.1: AASE concept sidebar — opens when the analyst clicks the "Look up"
  // affordance on a stage that has a TESTS_CONCEPT edge to a Concept node.
  const [conceptSidebar, setConceptSidebar] = useState({ open: false, conceptId: null })
  // v25.5.1: MITRE technique sidebar — opens when the analyst clicks the
  // MITRE chip on a stage that has a USES_MITRE_TECHNIQUE edge to a
  // MitreTechnique node. First user-facing consumer of the v25.5 foundation.
  const [mitreSidebar, setMitreSidebar] = useState({ open: false, techniqueId: null })
  // v25.2: collapse the scenario header (title, summary, progress bar) once
  // the learner is committed to engaging — frees vertical space so the
  // AttackPath stays visible alongside the active stage. Click the collapsed
  // bar to re-expand.
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  // v25.2: tracks which stages have a wrong-answer try-again offer pending.
  // When a learner gets a stage wrong, auto-advance is suppressed and a
  // "Try again" button appears alongside NEXT. Picking try-again resets the
  // local answer state for that stage so they can re-attempt; the original
  // attempt stays in the graph (server records each attempt as a separate
  // edge with attempt:N).
  const [tryAgainOffered, setTryAgainOffered] = useState({})

  useEffect(() => {
    api.listScenarios().then(r => setAllScenarios(r.scenarios || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.getScenarioPath(id)
      .then(d => {
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

  // v25.2: collapse the header when the learner moves past Stage 1, in
  // addition to the on-answer trigger in handleAnswer. Covers the case where
  // they navigate via prev/next or click an AttackPath circle without having
  // submitted on the current stage. Idempotent — only flips false→true.
  useEffect(() => {
    if (!data || !currentStageId || headerCollapsed) return
    const idx = data.path.findIndex(p => p.stage.id === currentStageId)
    if (idx > 0) setHeaderCollapsed(true)
  }, [currentStageId, data, headerCollapsed])

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

    // v25.2: collapse the header on first answer so the AttackPath becomes
    // the dominant scroll anchor for subsequent stages. Idempotent.
    if (!headerCollapsed) setHeaderCollapsed(true)

    api.submitStage(scenario.id, { stageId: stage.id, optionIndex, correct, confidence: stageConfidence })
      .then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 2000)
      })
      .catch(err => {
        console.warn('submitStage failed:', err.message)
        setSaveStatus('error')
      })

    // v25.2: on a WRONG answer, suppress auto-advance and offer Try-again.
    // The learner stays on the stage with the rationale visible, can choose
    // to retry the question (resets the local answer state, keeps confidence
    // locked at the original value) or click NEXT to advance manually.
    //
    // On a CORRECT answer, behavior is unchanged from v25.1: auto-advance
    // after 1s. There's nothing to consolidate by retrying a right answer.
    if (!correct) {
      setTryAgainOffered(t => ({ ...t, [stage.id]: true }))
      return
    }

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
        console.error('chooseStageOption failed:', err)
        setNavigationError(err.message || 'Navigation failed')
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

  // v25.2: reset local state for a stage so the learner can re-attempt.
  // The original answer stays on the graph (each attempt is a separate
  // ATTEMPTED_STAGE edge server-side); this only clears the in-memory state
  // that controls the panel's visual lock and the rationale display.
  //
  // Confidence is preserved by design — the calibration record is set on
  // first attempt only. If the learner could re-rate confidence on retry,
  // the metric becomes meaningless ("I was always confident in my final
  // answer" — sure, but that's not what calibration is measuring).
  function handleTryAgain(stageId) {
    setAnswers(a => {
      const next = { ...a }
      delete next[stageId]
      return next
    })
    setTryAgainOffered(t => {
      const next = { ...t }
      delete next[stageId]
      return next
    })
    setNavigationError(null)
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

        {/* v25.2: collapsible header. Default expanded on first load (so the
            learner reads the framing); auto-collapses once they answer the
            first stage or navigate to Stage 2+. Click anywhere on the
            collapsed bar to re-expand. */}
        {headerCollapsed ? (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={() => setHeaderCollapsed(false)}
            aria-label="Expand scenario summary"
            aria-expanded="false"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              padding: '12px 16px',
              marginBottom: 24,
              background: 'var(--paper-hi)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color var(--dur) ease, background var(--dur) ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--rule-strong)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)' }}
          >
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
              color: 'var(--ink)', flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {scenario.title}
            </div>
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '2px 6px', border: '1px solid',
              borderColor: severityColor, color: severityColor, borderRadius: 3,
              flexShrink: 0,
            }}>{scenario.severity}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
              flexShrink: 0,
            }}>
              {Math.round(progressPct)}% complete
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }} aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
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
                // v24.1: was --ink-faint, now --ink-soft for stronger contrast
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
                  ~${(scenario.estimatedLoss / 1_000_000).toFixed(2)}M estimated loss
                </span>
              )}
              {/* v25.2: explicit collapse affordance, mirrors the chevron on
                  the collapsed bar so users know expansion is reversible */}
              <button
                onClick={() => setHeaderCollapsed(true)}
                aria-label="Collapse scenario summary"
                aria-expanded="true"
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: '1px solid var(--rule)',
                  borderRadius: 4, padding: '4px 10px',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
                  color: 'var(--ink-soft)', textTransform: 'uppercase', cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'border-color var(--dur) ease, color var(--dur) ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rule-strong)'
                  e.currentTarget.style.color = 'var(--ink)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rule)'
                  e.currentTarget.style.color = 'var(--ink-soft)'
                }}
              >
                <span>Collapse</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>
            {/* v24.1: scenario summary uses --ink (was --ink-soft) — this is body copy, not annotation */}
            <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, maxWidth: 760, marginBottom: 28, opacity: 0.92 }}>
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
        )}
      </motion.div>

      <ScenarioArt scenarioId={scenario.id} />

      <div style={{ marginBottom: 32 }}>
        <AttackPath
          path={path}
          consequenceStages={consequenceStages}
          answers={answers}
          currentStageId={currentStageId}
          pathTaken={pathTaken}
          onStageClick={(sid) => {
            // v25.2: when scenario is completed, ALL stages become clickable —
            // the AttackPath becomes a stage selector for replay. Clicking
            // resets local answer/confidence for that stage AND re-opens the
            // play surface (sets completed=false). The original answers
            // remain in the graph as historical record.
            //
            // When NOT completed, only visited stages are clickable (existing
            // v25.1 behaviour).
            if (completed) {
              setAnswers(a => {
                const next = { ...a }
                delete next[sid]
                return next
              })
              setConfidence(c => {
                const next = { ...c }
                delete next[sid]
                return next
              })
              setTryAgainOffered(t => {
                const next = { ...t }
                delete next[sid]
                return next
              })
              setCurrentStageId(sid)
              setCompleted(false)
              setNavigationError(null)
              return
            }
            if (pathTaken.includes(sid)) setCurrentStageId(sid)
          }}
          // v25.2: tells AttackPath whether to make all circles clickable
          allClickable={completed}
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
              onConceptLookup={(conceptId) => setConceptSidebar({ open: true, conceptId })}
              onMitreLookup={(techniqueId) => setMitreSidebar({ open: true, techniqueId })}
              allStages={allStages}
              totalPrimary={path.length}
              currentIdx={path.findIndex(p => p.stage.id === currentStageId)}
            />
            {answers[currentStageId] && (() => {
              // v25.2: three banner variants
              //   1. navigationError → red banner, error message + Continue
              //   2. wrong answer + tryAgain offered → neutral banner with
              //      "Take a moment with the rationale" + Try again + Continue
              //   3. right answer → existing "Advancing…" + Continue (auto-advance fires)
              const ans = answers[currentStageId]
              const showTryAgain = ans && !ans.correct && tryAgainOffered[currentStageId]
              return (
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
                      {/* v24.1: was --ink-soft, now --ink */}
                      <div style={{ fontSize: 13, color: 'var(--ink)' }}>{navigationError}</div>
                    </>
                  ) : showTryAgain ? (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4, fontWeight: 600 }}>
                        Take a moment with the rationale
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                        Try again to consolidate the lesson, or continue to the next stage. Your original answer is on the record either way.
                      </div>
                    </>
                  ) : (
                    /* v24.1: was --ink-soft, now --ink */
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                      Advancing to next stage…
                    </div>
                  )}
                </div>
                {/* v25.2: secondary "Try again" button on wrong answers — opt-in
                    consolidation. Original confidence remains locked; the
                    server records this as attempt:2+ with the new option. */}
                {showTryAgain && (
                  <button
                    onClick={() => handleTryAgain(currentStageId)}
                    style={{
                      padding: '9px 16px', fontSize: 13, fontWeight: 500,
                      background: 'transparent', color: 'var(--ink)',
                      border: '1px solid var(--rule-strong)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transition: 'border-color var(--dur) ease, background var(--dur) ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background = 'var(--paper-dim)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--rule-strong)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Try again
                  </button>
                )}
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
              )
            })()}
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

      <InlineTutor
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        stageContext={currentEntry ? { ...currentEntry, scenario } : null}
        role={role}
      />

      {/* v25.1: AASE concept sidebar — opens via the "Look up" affordance on
          any stage that has a TESTS_CONCEPT edge. The conceptId comes from
          the stage payload; the data is fetched live from /api/frameworks. */}
      <ConceptSidebar
        open={conceptSidebar.open}
        conceptId={conceptSidebar.conceptId}
        onClose={() => setConceptSidebar({ open: false, conceptId: null })}
      />
      {/* v25.5.1: MITRE technique sidebar — opens via the MITRE chip on any
          stage with a USES_MITRE_TECHNIQUE edge. First user-facing consumer
          of the v25.5 MITRE foundation. */}
      <MitreTechniqueSidebar
        open={mitreSidebar.open}
        techniqueId={mitreSidebar.techniqueId}
        onClose={() => setMitreSidebar({ open: false, techniqueId: null })}
      />
    </div>
  )
}

function AttackPath({ path = [], consequenceStages = [], answers = {}, currentStageId, pathTaken = [], onStageClick, allClickable = false }) {
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

  const [hoverId, setHoverId] = useState(null)
  const hoveredEntry = hoverId ? path.find(p => p.stage.id === hoverId) : null

  return (
    <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${path.length}, minmax(180px, 1fr))`,
        gap: 0, position: 'relative', minWidth: path.length * 180,
      }}>
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
          // v25.2: when allClickable (scenario completed), every stage is
          // clickable for replay. Visual treatment matches a visited stage.
          const isClickable = isVisited || allClickable
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
                  background: 'transparent', cursor: isClickable ? 'pointer' : 'default',
                  border: 'none',
                  // v24.1: lifted from 0.4 to 0.6 so locked stages remain readable
                  opacity: isClickable ? 1 : 0.6,
                }}
                disabled={!isClickable}
                title={
                  !isClickable
                    ? `${entry.tactic?.name || entry.phase?.name || 'Stage ' + (i + 1)} — locked until you reach it`
                    : allClickable
                      ? `Replay this stage from a clean slate`
                      : undefined
                }
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
                  textTransform: 'uppercase', color: isUnique ? 'var(--accent)' : 'var(--ink-soft)',
                  textAlign: 'center', fontWeight: 600,
                }}>
                  {/* v25.1: AASE-tier scenarios use phase name in place of tactic */}
                  {entry.tactic?.name || entry.phase?.name || '—'}
                  {isUnique && <><br /><span style={{ opacity: 0.7 }}>(F3 only)</span></>}
                </div>

                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, lineHeight: 1.2,
                  textAlign: 'center', maxWidth: 180, minHeight: 32,
                  // v24.1: was --ink-soft when not active; now --ink for both states
                  color: 'var(--ink)',
                }}>
                  {entry.technique?.name || entry.stage?.heading}
                </div>

                {entry.technique?.id && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--ink-soft)', letterSpacing: '0.04em',
                  }}>{entry.technique.id}</div>
                )}
              </motion.button>

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
                      textTransform: 'uppercase', opacity: 0.7, marginBottom: 4,
                    }}>
                      Stage {i + 1} · {hoveredEntry.tactic?.name || hoveredEntry.phase?.name || 'Working'}
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {hoveredEntry.stage?.heading}
                    </div>
                    {!isVisited && (
                      <div style={{ opacity: 0.75, fontSize: 11, fontStyle: 'italic' }}>
                        Locked — reach this stage by working through the scenario
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

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

function StagePanel({ entry, answer, confidence, onConfidenceChange, onAnswer, onAskTutor, onConceptLookup, onMitreLookup, allStages, totalPrimary, currentIdx }) {
  // v25.1: AASE-tier scenarios (SC010+) carry concept and phase instead of
  // (or alongside) technique and tactic. The destructure tolerates both
  // shapes; downstream we check for presence per render decision.
  // v25.5.1: also destructure mitreTechnique — present on stages with a
  // USES_MITRE_TECHNIQUE edge (SC013+).
  const { stage, technique, tactic, concept, phase, mitreTechnique } = entry
  const isConsequence = stage.type === 'consequence'

  // v24.3: detect dark mode by reading the data-theme attribute set in theme.jsx.
  // The shadow tokens differ between modes: dark needs a deeper shadow because
  // there is less luminance contrast between page and card.
  const isDark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      style={{
        background: isConsequence ? 'var(--danger-bg)' : 'var(--paper-hi)',
        border: '1px solid', borderColor: isConsequence ? 'var(--danger)' : 'var(--rule)',
        // v24.3: larger radius + shadow so the card reads as a properly elevated
        // working sheet sitting on the (now darker) page bg. The shadow token
        // is theme-aware: deeper in dark mode where luminance contrast is tight.
        borderRadius: 14,
        padding: '32px 36px',
        boxShadow: isConsequence
          ? 'none'
          : (isDark ? 'var(--shadow-card-dark)' : 'var(--shadow-card)'),
        position: 'relative',
        // v24.1: leave bottom room so the floating "Ask the Tutor" button never overlaps content
        paddingBottom: 76,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase',
          // v24.1: bolder weight for the stage label so it reads as a section header
          fontWeight: 600,
          color: isConsequence ? 'var(--danger)' : 'var(--accent)',
        }}>
          {isConsequence
            ? 'Consequence branch · what happens when this control fails'
            : phase
              // v25.1: AASE phase label for analyst-tier scenarios.
              // Stage numbers stay relative to the scenario; the phase tag
              // gives the analyst the framework anchor.
              ? `Stage ${currentIdx + 1} of ${totalPrimary} · ${phase.name}`
              : tactic?.name
                ? `Stage ${currentIdx + 1} of ${totalPrimary} · ${tactic.name}`
                : `Stage ${currentIdx + 1} of ${totalPrimary}`}
        </div>
        {/* v25.5.1: chip row holds the concept chip (or technique chip)
            AND the MITRE technique chip when present. Stages with both a
            concept and a MITRE technique render two chips side by side. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {concept ? (
          // v25.1: AASE concept chip — interactive, opens the ConceptSidebar.
          // This is the visible "the graph is doing work" cue: tap a concept,
          // see its formal definition, examples, and which other frameworks
          // recognise it. Replaces the static technique chip on AASE stages.
          <button
            onClick={() => onConceptLookup && onConceptLookup(concept.id)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink)', fontWeight: 500,
              padding: '4px 10px',
              background: 'var(--paper-dim)',
              border: '1px solid var(--accent)',
              borderRadius: 4, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background var(--dur) ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
            aria-label={`Look up the formal definition of ${concept.name}`}
            title={`Look up: ${concept.name}`}
          >
            <span>Look up: {concept.name}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
            </svg>
          </button>
        ) : technique && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            // v24.1: was --ink-faint, now --ink-soft so the technique chip is legible
            color: 'var(--ink-soft)',
            padding: '3px 8px', border: '1px solid var(--rule-strong)', borderRadius: 4,
          }}>{technique.id} · {technique.name}</div>
        )}
        {/* v25.5.1: MITRE technique chip — interactive, opens the
            MitreTechniqueSidebar. Renders when the stage has a
            USES_MITRE_TECHNIQUE edge (SC013+). Visually distinct from
            the concept chip (mono ID prefix, slightly different border)
            so the trainee can tell at a glance there are two different
            reference systems in play. */}
        {mitreTechnique && (
          <button
            onClick={() => onMitreLookup && onMitreLookup(mitreTechnique.id)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink)', fontWeight: 500,
              padding: '4px 10px',
              background: 'transparent',
              border: '1px dashed var(--ink-soft)',
              borderRadius: 4, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all var(--dur) ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--paper-dim)'
              e.currentTarget.style.borderStyle = 'solid'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderStyle = 'dashed'
            }}
            aria-label={`Look up MITRE technique ${mitreTechnique.id}`}
            title={`MITRE: ${mitreTechnique.id} · ${mitreTechnique.name}`}
          >
            <span style={{ color: 'var(--ink-soft)' }}>MITRE</span>
            <span>{mitreTechnique.id}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
            </svg>
          </button>
        )}
        </div>
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
        lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: 14,
        color: 'var(--ink)',
      }}>{stage.heading}</h2>

      {/* v24.1: narrative now uses --ink (was --ink-soft) */}
      <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.65, marginBottom: 22, maxWidth: 720 }}>
        {stage.narrative}
      </p>

      {stage.signals?.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            // v24.1: was --ink-faint, now --ink-soft + bolder
            textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, fontWeight: 600,
          }}>Signals observed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stage.signals.map((sig, i) => {
              const color = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }[sig.severity] || 'var(--ink-soft)'
              return (
                <motion.div
                  key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  style={{
                    padding: '10px 14px', background: 'var(--paper-dim)',
                    borderRadius: 'var(--radius)', borderLeft: `3px solid ${color}`,
                    fontSize: 13.5, display: 'flex', gap: 12, alignItems: 'center',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color, minWidth: 54, fontWeight: 700,
                  }}>{sig.severity}</span>
                  {/* v24.1: signal text was --ink, kept --ink and added line-height for readability */}
                  <span style={{ color: 'var(--ink)', lineHeight: 1.5 }}>{sig.text}</span>
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
            textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, fontWeight: 600,
          }}>Your decision</div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500,
            lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 16,
            color: 'var(--ink)',
          }}>{stage.question}</h3>

          {/* v24: confidence rating before the decision */}
          <ConfidenceSlider
            value={confidence}
            onChange={onConfidenceChange}
            locked={!!answer}
            highlightWaitingForChoice={!answer && confidence === 0}
          />

          {/* v24.1: small affordance line above options when confidence not yet picked.
              Replaces the old "dim the buttons" pattern which made text unreadable. */}
          {!answer && confidence === 0 && (
            <div style={{
              marginBottom: 12, fontSize: 12, color: 'var(--accent)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />
              Pick a confidence level above before choosing an option.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stage.options.map((opt, i) => {
              const picked = answer?.optionIndex === i
              const isAnswered = !!answer
              const showCorrect = isAnswered && opt.correct
              const showWrong = picked && !opt.correct
              const showOtherWrong = isAnswered && !picked && !opt.correct
              const leadsToConsequence = !!opt.leadsTo
              const canAnswer = !answer && confidence > 0

              // v24.1: louder answered-state styling.
              // Pre-answer: all options at full opacity, full-contrast text.
              // Post-answer:
              //   - the picked option (right or wrong): thick border, saturated bg, "YOUR PICK" pill
              //   - the correct option (if not the picked one): green border, "RIGHT ANSWER" pill
              //   - other wrong options: muted (opacity 0.5), so they don't compete for attention
              let buttonStyle = {
                padding: '14px 18px',
                background: 'var(--paper-dim)',
                border: '1px solid var(--rule-strong)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 14,
                textAlign: 'left',
                cursor: canAnswer ? 'pointer' : 'default',
                color: 'var(--ink)',
                lineHeight: 1.5,
                width: '100%',
                fontWeight: 400,
              }
              if (showCorrect && picked) {
                buttonStyle = {
                  ...buttonStyle,
                  background: 'var(--success-bg)',
                  borderColor: 'var(--success)',
                  borderWidth: 2,
                  fontWeight: 500,
                }
              } else if (showCorrect && !picked) {
                buttonStyle = {
                  ...buttonStyle,
                  background: 'var(--success-bg)',
                  borderColor: 'var(--success)',
                  borderWidth: 2,
                }
              } else if (showWrong) {
                buttonStyle = {
                  ...buttonStyle,
                  background: 'var(--danger-bg)',
                  borderColor: 'var(--danger)',
                  borderWidth: 2,
                  fontWeight: 500,
                }
              } else if (showOtherWrong) {
                buttonStyle = {
                  ...buttonStyle,
                  opacity: 0.55,
                }
              }

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
                  borderColor: 'var(--rule-strong)',
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
                    showWrong ? { x: [0, -4, 4, -4, 4, 0] } : {}
                  }
                  transition={{ duration: showWrong ? 0.4 : 0.3 }}
                  style={buttonStyle}
                >
                  {/* v24.1: status pills at top right of the option */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      {picked && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                          textTransform: 'uppercase', fontWeight: 700,
                          padding: '2px 7px', borderRadius: 3,
                          background: showWrong ? 'var(--danger)' : 'var(--success)',
                          color: '#fff',
                        }}>Your pick</span>
                      )}
                      {showCorrect && !picked && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                          textTransform: 'uppercase', fontWeight: 700,
                          padding: '2px 7px', borderRadius: 3,
                          background: 'var(--success)', color: '#fff',
                        }}>Right answer</span>
                      )}
                      {showWrong && leadsToConsequence && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: 'var(--danger)', letterSpacing: '0.08em',
                          textTransform: 'uppercase', fontWeight: 700,
                        }}>Branches →</span>
                      )}
                    </div>
                  </div>
                  {isAnswered && opt.rationale && rationaleStyle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3, delay: showCorrect ? 0 : 0.1 }}
                      style={{
                        marginTop: 10, padding: '10px 12px',
                        border: '1px solid', borderRadius: 'var(--radius)',
                        fontSize: 13.5, lineHeight: 1.55,
                        ...rationaleStyle,
                      }}
                    >
                      {rationaleLabel && (
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: showCorrect ? 'var(--success)' : showWrong ? 'var(--danger)' : 'var(--ink-soft)',
                          marginBottom: 4, fontWeight: 700,
                        }}>{rationaleLabel}</div>
                      )}
                      {opt.rationale}
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {answer && (
            <ConfidenceFeedback
              confidence={answer.confidence ?? confidence}
              correct={answer.correct}
            />
          )}

          {answer?.correct && (
            <WhatIfPreview stage={stage} allStages={allStages} />
          )}
        </div>
      )}

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

  // v24.3: theme-aware shadow for the completion panel
  const isDark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '48px 36px', textAlign: 'center',
        background: tookConsequencePath
          ? 'linear-gradient(135deg, var(--warning-bg), var(--paper-hi))'
          : 'linear-gradient(135deg, var(--success-bg), var(--paper-hi))',
        border: '1px solid',
        borderColor: tookConsequencePath ? 'var(--warning)' : 'var(--success)',
        // v24.3: matched elevation with the stage panel
        borderRadius: 14,
        boxShadow: isDark ? 'var(--shadow-card-dark)' : 'var(--shadow-card)',
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
        color: 'var(--ink)',
      }}>
        {tookConsequencePath
          ? 'Scenario complete — you took a recovery path'
          : 'Scenario complete — clean prevention path'}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--ink)', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.65 }}>
        {tookConsequencePath
          ? `You navigated ${scenario.title} through ${consequencesVisited} consequence branch${consequencesVisited > 1 ? 'es' : ''}. That's valuable training — every real incident has moments where prevention fails. Notice where and why.`
          : `You navigated ${scenario.title} without hitting any consequence branches. Clean run — you made the prevention call at every stage.`}
      </p>

      {calibrationScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            margin: '0 auto 18px', padding: '14px 18px', maxWidth: 460,
            background: 'var(--paper-hi)', border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius-lg)',
          }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4, fontWeight: 600,
          }}>Calibration this scenario</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
            lineHeight: 1.1, marginBottom: 4,
            color: calibrationScore >= 85 ? 'var(--success)'
                 : calibrationScore >= 65 ? 'var(--warning)' : 'var(--danger)',
          }}>{calibrationScore}<span style={{ fontSize: 16, color: 'var(--ink-soft)' }}> / 100</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink)' }}>{calibrationLabel}</div>
        </motion.div>
      )}

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 500, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Your progress is logged — check your coverage map to see which F3 techniques you've now encountered.
      </p>
      {/* v25.2: hint pointing at the AttackPath above. Once a scenario is
          completed, every stage circle becomes clickable for replay — the
          analyst can revisit just the one stage they want to consolidate
          without restarting the whole scenario from the top. */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', marginBottom: 24,
        background: 'var(--paper-hi)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius)',
        fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        <span>
          Click any stage circle <em>above</em> to replay it from a clean slate. Your original answers stay on the record.
        </span>
      </div>
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
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
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
                  : saveStatus === 'saving' ? 'var(--ink-soft)'
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
            color: 'var(--ink)',
          }}
        >← All scenarios</button>
        <button
          onClick={onRestart}
          style={{
            padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            color: 'var(--ink-soft)',
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
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)',
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
              color: 'var(--ink)',
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
