import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'
import { useUser } from '../../lib/user.jsx'

/* -------------------------------------------------------------------------
   FrameworkPhaseSidebar — slide-over panel for one CBEST FrameworkPhase
   sub-stage (or top-level phase) (v25.6.1, ISS-013).

   Mirrors MitreTechniqueSidebar's structure (validated in v25.5.1
   production). Same backdrop + slide animation, same fetch-on-demand
   pattern, same "Practiced in" cross-link section.

   The DISTINCTIVE feature is OBS-018 four-level role-conditional content.
   Each phase node carries a roleContent object with four lenses:
   teller / analyst / soc / executive. The sidebar:

     1. Defaults the active lens to the user's effectiveRole (if set
        and matches one of the four canonical values; otherwise
        defaults to 'analyst' as the broadest neutral lens).
     2. Renders tabs at the top so the user can switch lens. Useful
        for a fraud analyst who wants to see how the same phase
        looks from the SOC perspective, or an executive curious
        about teller-level framing.
     3. Each lens shows a one/two-sentence summary + 3-4 keyPoints
        bullets, all role-relevant.

   This is the v25.6.1 user-facing payoff. The schema is the means;
   the four-level content is the end.
------------------------------------------------------------------------- */

const ROLE_TABS = [
  { id: 'teller',    short: 'Frontline',  long: 'Frontline / Teller' },
  { id: 'analyst',   short: 'Analyst',    long: 'Fraud Analyst' },
  { id: 'soc',       short: 'SOC',        long: 'SOC / Cyber Team' },
  { id: 'executive', short: 'Exec',       long: 'Risk Manager / Exec' },
]

export default function FrameworkPhaseSidebar({ open, phaseId, onClose }) {
  const [phase, setPhase]               = useState(null)
  const [parent, setParent]             = useState(null)
  const [children, setChildren]         = useState([])
  const [practicedIn, setPracticedIn]   = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [activeLens, setActiveLens]     = useState('analyst')
  const navigate = useNavigate()
  const { effectiveRole } = useUser() || {}

  // Set the initial active lens to the user's role (or analyst as default)
  useEffect(() => {
    if (effectiveRole && ROLE_TABS.find(t => t.id === effectiveRole)) {
      setActiveLens(effectiveRole)
    } else {
      setActiveLens('analyst')
    }
  }, [effectiveRole, open])

  useEffect(() => {
    if (!open || !phaseId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setPhase(null)
    setParent(null)
    setChildren([])
    setPracticedIn([])

    Promise.all([
      api.getFrameworkPhase(phaseId),
      api.getFrameworkPhasePracticedIn(phaseId).catch(() => ({ practicedIn: [] })),
    ])
      .then(([phaseRes, practicedRes]) => {
        if (cancelled) return
        setPhase(phaseRes.phase)
        setParent(phaseRes.parent || null)
        setChildren(phaseRes.children || [])
        setPracticedIn(practicedRes.practicedIn || [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Could not load framework phase')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, phaseId])

  function handleStageJump(scenarioId, stageOrder) {
    onClose()
    setTimeout(() => navigate(`/scenarios/${scenarioId}?stage=${stageOrder}`), 150)
  }

  function handleSiblingJump(siblingId) {
    // Navigate within the sidebar by remounting with the new phaseId.
    // Use parent-of-children fall-through: when on a sub-stage, clicking
    // the parent's "View phase overview" jumps up; clicking a sibling
    // remounts to the sibling.
    onClose()
    setTimeout(() => {
      // Re-emit open with the new phaseId via the same prop chain by
      // closing first; in practice the page uses a single sidebar
      // instance so we just rely on the onPhaseLookup handler to be
      // re-callable. Simplest: call api directly via a custom event.
      // For v25.6.1 we just close and let the user re-click. Future
      // enhancement: nested in-sidebar navigation.
    }, 150)
  }

  const lensContent = useMemo(() => {
    if (!phase || !phase.roleContent) return null
    return phase.roleContent[activeLens] || phase.roleContent.analyst || null
  }, [phase, activeLens])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 600,
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
            }}
            role="dialog"
            aria-label={phase ? `CBEST phase: ${phase.name}` : 'CBEST phase'}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                  fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>CBEST FRAMEWORK</span>
                  {phase?.code && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {phase.code}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
                  lineHeight: 1.25, color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {loading ? 'Looking up…' : (phase?.name || 'Unknown phase')}
                </div>
                {parent && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
                    marginTop: 4,
                  }}>
                    Sub-stage of <strong style={{ color: 'var(--ink)' }}>{parent.code}</strong> · {parent.name}
                  </div>
                )}
                {phase?.durationLabel && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)',
                    marginTop: 4,
                  }}>
                    {phase.durationLabel}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 4, fontSize: 22, color: 'var(--ink-soft)',
                  lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Body — scrollable */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 32px',
            }}>
              {error && (
                <div style={{
                  padding: 14, background: 'var(--danger-bg)', borderRadius: 6,
                  color: 'var(--danger)', fontSize: 14,
                }}>
                  {error}
                </div>
              )}

              {phase && !error && (
                <>
                  {/* Phase summary (always shown, regardless of lens) */}
                  <div style={{
                    fontSize: 14, lineHeight: 1.6, color: 'var(--ink)',
                    marginBottom: 22,
                  }}>
                    {phase.summary}
                  </div>

                  {phase.boeReference && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--ink-faint)', marginBottom: 22,
                    }}>
                      Source: BoE CBEST Implementation Guide (2024) {phase.boeReference}
                    </div>
                  )}

                  {/* OBS-018 four-level role-lens tabs */}
                  {phase.roleContent && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10,
                        fontWeight: 600,
                      }}>
                        What this phase means for…
                      </div>
                      <div style={{
                        display: 'flex', gap: 4, marginBottom: 16,
                        borderBottom: '1px solid var(--rule)',
                      }}>
                        {ROLE_TABS.map(tab => {
                          const isActive = activeLens === tab.id
                          const isUserRole = effectiveRole === tab.id
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveLens(tab.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive
                                  ? '2px solid var(--accent)'
                                  : '2px solid transparent',
                                padding: '8px 12px', cursor: 'pointer',
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
                                fontWeight: isActive ? 600 : 500,
                                letterSpacing: '0.06em',
                                marginBottom: -1,
                                transition: 'all var(--dur) ease',
                                position: 'relative',
                              }}
                              title={tab.long}
                            >
                              {tab.short}
                              {isUserRole && (
                                <span style={{
                                  display: 'inline-block', marginLeft: 6,
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: 'var(--accent)', verticalAlign: 'middle',
                                }} aria-label="your current role" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {lensContent && (
                        <motion.div
                          key={activeLens}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div style={{
                            fontSize: 14, lineHeight: 1.6, color: 'var(--ink)',
                            marginBottom: 14,
                          }}>
                            {lensContent.summary}
                          </div>
                          {lensContent.keyPoints && lensContent.keyPoints.length > 0 && (
                            <ul style={{
                              listStyle: 'none', padding: 0, margin: 0,
                              display: 'flex', flexDirection: 'column', gap: 8,
                            }}>
                              {lensContent.keyPoints.map((kp, i) => (
                                <li key={i} style={{
                                  fontSize: 13, lineHeight: 1.55, color: 'var(--ink)',
                                  paddingLeft: 18, position: 'relative',
                                }}>
                                  <span style={{
                                    position: 'absolute', left: 0, top: 8,
                                    width: 8, height: 1, background: 'var(--accent)',
                                  }} aria-hidden="true" />
                                  {kp}
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Deliverables */}
                  {phase.deliverables && phase.deliverables.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8,
                        fontWeight: 600,
                      }}>
                        Phase deliverables
                      </div>
                      <ul style={{
                        listStyle: 'none', padding: 0, margin: 0,
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        {phase.deliverables.map((d, i) => (
                          <li key={i} style={{
                            fontSize: 13, lineHeight: 1.55, color: 'var(--ink)',
                            paddingLeft: 14, position: 'relative',
                          }}>
                            <span style={{
                              position: 'absolute', left: 0, top: 8,
                              width: 6, height: 6, borderRadius: '50%',
                              background: 'var(--ink-soft)',
                            }} aria-hidden="true" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sub-stages (only on top-level phases) */}
                  {children && children.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8,
                        fontWeight: 600,
                      }}>
                        Sub-stages of this phase
                      </div>
                      <ul style={{
                        listStyle: 'none', padding: 0, margin: 0,
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                        {children.map(c => (
                          <li key={c.id} style={{
                            fontSize: 13, padding: '6px 10px',
                            background: 'var(--paper-dim)',
                            borderRadius: 4, color: 'var(--ink-soft)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            <strong style={{ color: 'var(--ink)' }}>{c.code}</strong>
                            {' · '}{c.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Practiced in (cross-link to scenarios) */}
                  {practicedIn && practicedIn.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8,
                        fontWeight: 600,
                      }}>
                        Practiced in {practicedIn.length} {practicedIn.length === 1 ? 'stage' : 'stages'}
                      </div>
                      <ul style={{
                        listStyle: 'none', padding: 0, margin: 0,
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                        {practicedIn.map(p => (
                          <li key={p.stageId}>
                            <button
                              onClick={() => handleStageJump(p.scenarioId, p.stageOrder)}
                              style={{
                                width: '100%', textAlign: 'left',
                                background: 'var(--paper-dim)', border: '1px solid var(--rule)',
                                borderRadius: 6, padding: '10px 12px', cursor: 'pointer',
                                fontFamily: 'var(--font-sans)', fontSize: 13,
                                color: 'var(--ink)',
                                transition: 'all var(--dur) ease',
                                display: 'flex', flexDirection: 'column', gap: 4,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--paper-hi)'
                                e.currentTarget.style.borderColor = 'var(--accent)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--paper-dim)'
                                e.currentTarget.style.borderColor = 'var(--rule)'
                              }}
                            >
                              <div style={{
                                fontFamily: 'var(--font-mono)', fontSize: 10,
                                letterSpacing: '0.06em', color: 'var(--ink-soft)',
                              }}>
                                {p.scenarioId} · stage {p.stageOrder}
                                {p.phaseCode && ` · ${p.phaseCode}`}
                              </div>
                              <div style={{ lineHeight: 1.4 }}>{p.stageHeading}</div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
