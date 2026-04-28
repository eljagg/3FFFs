import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -------------------------------------------------------------------------
   MitreTechniqueSidebar — slide-over panel for one MITRE ATT&CK technique.

   Mirrors ConceptSidebar's structure (validated in v25.1/v25.4.2 production).
   Same backdrop + slide animation, same fetch-on-demand pattern, same
   "Practiced in" cross-link section. Different content shape because
   techniques have parent/sub-technique hierarchy + tactic chips + a link
   back to attack.mitre.org for the authoritative full description.

   v25.5 ships the component. SC013/SC014 in v25.5.1+ wire stages to MITRE
   techniques via :USES_MITRE_TECHNIQUE edges; until then the "Practiced
   in" section just renders empty (same shape, no data yet).
------------------------------------------------------------------------- */

const SEVERITY_COLORS = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--success)',
}

export default function MitreTechniqueSidebar({ open, techniqueId, onClose }) {
  const [technique, setTechnique]       = useState(null)
  const [parent, setParent]             = useState(null)
  const [tactics, setTactics]           = useState([])
  const [subTechniques, setSubTechniques] = useState([])
  const [practicedIn, setPracticedIn]   = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !techniqueId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setTechnique(null)
    setParent(null)
    setTactics([])
    setSubTechniques([])
    setPracticedIn([])

    Promise.all([
      api.getMitreTechnique(techniqueId),
      api.getMitreTechniquePracticedIn(techniqueId).catch(() => ({ practicedIn: [] })),
    ])
      .then(([techRes, practicedRes]) => {
        if (cancelled) return
        setTechnique(techRes.technique)
        setParent(techRes.parent || null)
        setTactics(techRes.tactics || [])
        setSubTechniques(techRes.subTechniques || [])
        setPracticedIn(practicedRes.practicedIn || [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Could not load technique')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, techniqueId])

  function handleStageJump(scenarioId, stageOrder) {
    onClose()
    setTimeout(() => navigate(`/scenarios/${scenarioId}?stage=${stageOrder}`), 150)
  }

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
              width: '100%', maxWidth: 560,
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
            }}
            role="dialog"
            aria-label={technique ? `MITRE technique: ${technique.name}` : 'MITRE technique'}
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
                  <span>MITRE ATT&CK</span>
                  {technique?.id && (
                    <span style={{
                      color: 'var(--ink-soft)', letterSpacing: '0.06em',
                    }}>· {technique.id}</span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
                  lineHeight: 1.25, color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {loading ? 'Looking up…' : (technique?.name || 'Unknown technique')}
                </div>
                {parent && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)',
                    marginTop: 4,
                  }}>
                    Sub-technique of <strong style={{ color: 'var(--ink)' }}>{parent.id}</strong> · {parent.name}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close technique sidebar"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 6, color: 'var(--ink-faint)', fontSize: 22, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: 22,
            }}>
              {loading && (
                <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
                  <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    marginRight: 10, verticalAlign: 'middle',
                  }} />
                  Fetching from the ATT&CK graph…
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink)', fontSize: 13, lineHeight: 1.5,
                }}>
                  Could not load this technique: {error}
                </div>
              )}

              {!loading && technique && (
                <>
                  {/* Tactic chips */}
                  {tactics.length > 0 && (
                    <section>
                      <SectionLabel>
                        Used in {tactics.length === 1 ? 'tactic' : `${tactics.length} tactics`}
                      </SectionLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tactics.map(ta => (
                          <span key={ta.id} style={{
                            padding: '5px 10px', borderRadius: 999,
                            background: 'var(--paper-hi)',
                            border: '1px solid var(--rule-strong)',
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            letterSpacing: '0.04em', color: 'var(--ink)',
                            fontWeight: 500,
                          }}>
                            {ta.name}
                            <span style={{
                              color: 'var(--ink-faint)', marginLeft: 6, fontSize: 10,
                            }}>· {ta.id}</span>
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Summary */}
                  <section>
                    <SectionLabel>Summary</SectionLabel>
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)',
                      margin: 0,
                    }}>
                      {technique.summary}
                    </p>
                    {technique.url && (
                      <div style={{ marginTop: 10 }}>
                        <a
                          href={technique.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: 'var(--accent)', textDecoration: 'none',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          Read the full ATT&CK entry on attack.mitre.org
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </section>

                  {/* Platforms */}
                  {Array.isArray(technique.platforms) && technique.platforms.length > 0 && (
                    <section>
                      <SectionLabel>Platforms in scope</SectionLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {technique.platforms.map(p => (
                          <span key={p} style={{
                            padding: '4px 8px', borderRadius: 4,
                            background: 'var(--paper-hi)',
                            border: '1px solid var(--rule)',
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: 'var(--ink-soft)',
                          }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Sub-techniques (when this is a parent technique) */}
                  {subTechniques.length > 0 && (
                    <section>
                      <SectionLabel>
                        {subTechniques.length} sub-technique{subTechniques.length === 1 ? '' : 's'} in this seed
                      </SectionLabel>
                      <ul style={{
                        margin: 0, padding: 0, listStyle: 'none',
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        {subTechniques.map(s => (
                          <li key={s.id} style={{
                            padding: '8px 11px',
                            background: 'var(--paper-hi)',
                            border: '1px solid var(--rule)',
                            borderRadius: 'var(--radius)',
                            fontSize: 13, color: 'var(--ink)',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              color: 'var(--ink-soft)', flexShrink: 0,
                            }}>{s.id}</span>
                            <span>{s.name}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Practiced in */}
                  {practicedIn.length > 0 && (
                    <section>
                      <SectionLabel>
                        Practiced in {practicedIn.length} {practicedIn.length === 1 ? 'stage' : 'stages'}
                      </SectionLabel>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        {practicedIn.map(p => (
                          <button
                            key={`${p.scenarioId}-${p.stageId}`}
                            onClick={() => handleStageJump(p.scenarioId, p.stageOrder)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 11px', textAlign: 'left',
                              background: 'var(--paper-hi)',
                              border: '1px solid var(--rule)',
                              borderRadius: 'var(--radius)',
                              cursor: 'pointer', color: 'var(--ink)',
                              transition: 'all var(--dur) ease',
                              fontFamily: 'inherit', fontSize: 13,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)' }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                              padding: '2px 6px', borderRadius: 3,
                              border: '1px solid', borderColor: SEVERITY_COLORS[p.scenarioSeverity] || 'var(--rule-strong)',
                              color: SEVERITY_COLORS[p.scenarioSeverity] || 'var(--ink-soft)',
                              flexShrink: 0,
                            }}>
                              {p.scenarioId}
                            </span>
                            <span style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
                              <span style={{ display: 'block', color: 'var(--ink)' }}>
                                Stage {p.stageOrder} · {p.stageHeading || 'Untitled stage'}
                              </span>
                              <span style={{
                                display: 'block', color: 'var(--ink-soft)',
                                fontSize: 11.5, marginTop: 2,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {p.scenarioTitle}
                              </span>
                            </span>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="var(--ink-faint)" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Vintage footnote */}
                  {technique.vintage && (
                    <div style={{
                      paddingTop: 12, borderTop: '1px solid var(--rule)',
                      fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.5,
                    }}>
                      <strong style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                        Vintage:
                      </strong>{' '}
                      {technique.vintage}. ATT&CK content licensed under CC BY 4.0
                      from MITRE Corporation. ATT&CK is a registered trademark of MITRE.
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

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--ink-soft)',
      marginBottom: 10, fontWeight: 600,
    }}>
      {children}
    </div>
  )
}
