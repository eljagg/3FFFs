import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -------------------------------------------------------------------------
   ConceptSidebar — slide-over panel that renders an AASE/CBEST/TIBER/iCAST
   Concept node from the graph.

   v25.1: introduced as the visual proof that the new framework graph is
   doing real work — when the analyst is on a stage that tests the
   "Critical Function" concept, they can tap "Look up: Critical Function"
   and see the formal definition, examples, and which other frameworks
   recognise it.

   v25.4.2 (ISS-008): each framework pill is now an expandable card with
   its own per-framework summary content. AASE-side summaries are populated
   from the existing v25.1 concept content; CBEST/TIBER-EU/iCAST cards
   render a "v25.6 — content pending" placeholder until the freshness
   pass fills them in.

   v25.4.2 also adds a "Practiced in" section that lists the scenarios +
   stages where this concept is tested via :TESTS_CONCEPT edges. Click any
   stage to jump straight from reference content to applied scenario play.

   Why fetch-on-demand (still): keeps stage payloads small, lets the same
   sidebar serve the Frameworks page (it does, since v25.4), and makes
   "look it up in another framework" a 1-line addition later.
------------------------------------------------------------------------- */

const SEVERITY_COLORS = {
  high:   'var(--danger)',
  medium: 'var(--warning)',
  low:    'var(--success)',
}

export default function ConceptSidebar({ open, conceptId, onClose }) {
  const [concept, setConcept]       = useState(null)
  const [frameworks, setFrameworks] = useState([])
  const [practicedIn, setPracticedIn] = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !conceptId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setConcept(null)
    setFrameworks([])
    setPracticedIn([])

    // Two parallel fetches — concept details + where it's practiced.
    // Practiced-in is best-effort; if it fails we still render the rest.
    Promise.all([
      api.getConcept(conceptId),
      api.getConceptPracticedIn(conceptId).catch(() => ({ practicedIn: [] })),
    ])
      .then(([conceptRes, practicedRes]) => {
        if (cancelled) return
        setConcept(conceptRes.concept)
        setFrameworks(conceptRes.frameworks || [])
        setPracticedIn(practicedRes.practicedIn || [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Could not load concept')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, conceptId])

  function handleStageJump(scenarioId, stageOrder) {
    // Close the sidebar first, then navigate. Matches the slide-out animation
    // before the URL change so it doesn't feel like a hard cut.
    onClose()
    setTimeout(() => navigate(`/scenarios/${scenarioId}?stage=${stageOrder}`), 150)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
          />
          {/* Panel */}
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
            aria-label={concept ? `Framework concept: ${concept.name}` : 'Framework concept'}
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
                }}>
                  Framework concept
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
                  lineHeight: 1.25, color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {loading ? 'Looking up…' : (concept?.name || 'Unknown concept')}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close concept sidebar"
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
                  Fetching from the framework graph…
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
                  Could not load this concept: {error}
                </div>
              )}

              {!loading && concept && (
                <>
                  {/* Examples — only shown if any.
                      v25.4.2 reorders: examples come BEFORE per-framework
                      cards, because examples are concept-level and apply
                      across all frameworks; per-framework cards are
                      framework-specific and follow. */}
                  {Array.isArray(concept.examples) && concept.examples.length > 0 && (
                    <section>
                      <SectionLabel>Examples</SectionLabel>
                      <ul style={{
                        margin: 0, padding: 0, listStyle: 'none',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        {concept.examples.map((ex, i) => (
                          <li key={i} style={{
                            padding: '10px 12px',
                            background: 'var(--paper-hi)',
                            border: '1px solid var(--rule)',
                            borderRadius: 'var(--radius)',
                            fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)',
                          }}>
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* v25.4.2: per-framework cards replace the previous pill row.
                      Each card is expandable (click to toggle). AASE expanded
                      by default; others collapsed but visible. */}
                  {frameworks.length > 0 && (
                    <section>
                      <SectionLabel>
                        {concept.universal
                          ? 'Recognised across all four frameworks'
                          : `Recognised by ${frameworks.length} framework${frameworks.length === 1 ? '' : 's'}`}
                      </SectionLabel>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        {/* Sort: AASE first (the populated one), then alphabetical */}
                        {[...frameworks]
                          .sort((a, b) => {
                            if (a.id === 'AASE') return -1
                            if (b.id === 'AASE') return 1
                            return a.id.localeCompare(b.id)
                          })
                          .map(fw => (
                            <FrameworkCard
                              key={fw.id}
                              framework={fw}
                              defaultOpen={fw.id === 'AASE'}
                              isUniversal={concept.universal}
                            />
                          ))}
                      </div>
                      <div style={{
                        marginTop: 12, fontSize: 12, color: 'var(--ink-soft)',
                        fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {concept.universal
                          ? 'Universal concepts use the same definition across frameworks. The wording you learn here transfers directly to other frameworks\u2019 conversations.'
                          : 'Concept terminology may differ between frameworks. Other frameworks may use a different term for the same idea.'}
                      </div>
                    </section>
                  )}

                  {/* v25.4.2 bonus: where this concept is practiced */}
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
                                Stage {p.stageOrder} · {p.stageTitle}
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
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * v25.4.2 — FrameworkCard
 *
 * Expandable card for one framework's per-concept summary.
 *   - Header: framework name + region pill, expand chevron
 *   - Body (when expanded): the per-framework summary, vintage tag if any,
 *     or the "v25.6 pending" placeholder for non-AASE entries.
 */
function FrameworkCard({ framework, defaultOpen, isUniversal }) {
  const [open, setOpen] = useState(defaultOpen)
  const isPending = framework.pending
  const hasContent = !isPending && framework.summary

  return (
    <div style={{
      border: '1px solid var(--rule-strong)',
      borderRadius: 'var(--radius)',
      background: 'var(--paper-hi)',
      overflow: 'hidden',
    }}>
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '10px 12px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--ink)', textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600,
          letterSpacing: '0.04em', color: 'var(--ink)',
        }}>
          {framework.id}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
          color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 500,
        }}>
          · {framework.region}
        </span>
        {isPending && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
            padding: '2px 6px', borderRadius: 3,
            border: '1px solid var(--warning)', color: 'var(--warning)',
            marginLeft: 4,
          }}>
            Pending
          </span>
        )}
        {framework.vintage && hasContent && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
            color: 'var(--ink-faint)', marginLeft: 4,
          }}>
            v{framework.vintage}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform var(--dur) ease' }}
            aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Body — animated expand */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 14px',
              fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink)',
              borderTop: '1px solid var(--rule)',
              paddingTop: 12,
            }}>
              {hasContent ? (
                <>
                  <p style={{ margin: 0 }}>{framework.summary}</p>
                  {framework.vintage && (
                    <div style={{
                      marginTop: 10,
                      fontSize: 11, color: 'var(--ink-faint)',
                      fontStyle: 'italic',
                    }}>
                      Sourced from {framework.id} {framework.vintage} reference.
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--paper)',
                  border: '1px dashed var(--rule-strong)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink-soft)',
                  fontSize: 12.5, lineHeight: 1.5,
                }}>
                  <strong style={{ color: 'var(--ink)' }}>Content pending.</strong>{' '}
                  {framework.id}-specific summary for this concept arrives in v25.6
                  alongside the framework freshness pass against current
                  documentation.
                  {isUniversal && (
                    <>{' '}This concept is recognised in {framework.id}, but the
                    framework-specific definition has not yet been authored.</>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
