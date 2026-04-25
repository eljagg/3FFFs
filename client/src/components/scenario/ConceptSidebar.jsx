import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -------------------------------------------------------------------------
   ConceptSidebar — slide-over panel that renders an AASE/CBEST/TIBER/iCAST
   Concept node from the graph.

   v25.1 introduces this as the visual proof that the new framework graph
   is doing real work — when the analyst is on a stage that tests the
   "Critical Function" concept, they can tap "Look up: Critical Function"
   and see the formal definition, examples, and which other frameworks
   recognise it. The data is fetched live from /api/frameworks/concepts/:id,
   not bundled into the stage payload.

   Why fetch-on-demand: keeps stage payloads small, lets the same Concept
   sidebar serve the v25.4 Frameworks page when we get there, and makes
   "look it up in another framework" a 1-line addition later.
------------------------------------------------------------------------- */

export default function ConceptSidebar({ open, conceptId, onClose }) {
  const [concept, setConcept] = useState(null)
  const [frameworks, setFrameworks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !conceptId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setConcept(null)
    setFrameworks([])

    api.getConcept(conceptId)
      .then(({ concept, frameworks }) => {
        if (cancelled) return
        setConcept(concept)
        setFrameworks(frameworks || [])
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Could not load concept')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, conceptId])

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
              width: '100%', maxWidth: 520,
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
              display: 'flex', flexDirection: 'column', gap: 20,
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
                  {/* Definition */}
                  <section>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--ink-soft)',
                      marginBottom: 8, fontWeight: 600,
                    }}>Definition</div>
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)',
                    }}>
                      {concept.summary}
                    </p>
                  </section>

                  {/* Examples — only shown if any */}
                  {Array.isArray(concept.examples) && concept.examples.length > 0 && (
                    <section>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)',
                        marginBottom: 8, fontWeight: 600,
                      }}>Examples</div>
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

                  {/* Cross-framework recognition */}
                  {frameworks.length > 0 && (
                    <section>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--ink-soft)',
                        marginBottom: 8, fontWeight: 600,
                      }}>
                        {concept.universal
                          ? 'Recognised across all four frameworks'
                          : `Recognised by ${frameworks.length} framework${frameworks.length === 1 ? '' : 's'}`}
                      </div>
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 8,
                      }}>
                        {frameworks.map(fw => (
                          <span key={fw.id} style={{
                            padding: '6px 12px', borderRadius: 999,
                            background: 'var(--paper-hi)',
                            border: '1px solid var(--rule-strong)',
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            letterSpacing: '0.04em', color: 'var(--ink)',
                            fontWeight: 500,
                          }}>
                            {fw.name}
                            <span style={{
                              color: 'var(--ink-soft)', marginLeft: 6, fontSize: 10,
                            }}>· {fw.region}</span>
                          </span>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 10, fontSize: 12, color: 'var(--ink-soft)',
                        fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {concept.universal
                          ? 'Universal concepts use the same definition across frameworks. The wording you learn here transfers directly to TIBER-EU, CBEST, and iCAST conversations.'
                          : 'Concept terminology may differ between frameworks. Other frameworks may use a different term for the same idea.'}
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
