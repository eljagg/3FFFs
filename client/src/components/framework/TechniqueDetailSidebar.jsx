import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'
// v25.7.0.9: process-animation engine + scene data per technique.
// ANIMATION_MAP routes a technique ID to its scene data; if absent,
// the sidebar falls back to the placeholder. New animations are added
// by importing a new scene-data file and adding a map entry — no
// changes to the engine itself.
import ProcessAnimation from './animations/ProcessAnimation.jsx'
import ivrDiscoveryScenes from './animations/ivrDiscoveryScenes.js'

const ANIMATION_MAP = {
  'F1073': ivrDiscoveryScenes,  // IVR Discovery (TA0043 Reconnaissance)
  // Future:
  //   'F1008.001': eDeliverySilentAlarmScenes,
  //   'F1097': cardBypassScenes (3DS Bypass)
  //   ...
}

/* ─────────────────────────────────────────────────────────────────────────
   TechniqueDetailSidebar — v25.7.0.8

   Slide-over panel showing full content for one F3 technique.

   Modeled on the existing MitreTechniqueSidebar (Scenario page) for
   visual + interaction consistency. Same backdrop + slide animation,
   same fetch-on-demand pattern, same cross-link section. Different
   data source: pulls from /api/framework/techniques and
   /api/framework/techniques/:id/cross-refs (v25.7.0.8 endpoints).

   Props:
     open        — boolean, sidebar visible/hidden
     techniqueId — F3 technique ID to load
     onClose     — callback when user dismisses

   Sections (top to bottom):
     - Header: technique ID + name + parent context (if sub-technique)
     - Description: full F3 description from MITRE Excel
     - Roles: which roles primarily act on / observe this technique
     - Mitigation: PLACEHOLDER for v25.7.0.8 — content authoring planned
                   for later releases (per-tactic role authoring arc)
     - Animation: PLACEHOLDER for v25.7.0.9+ — five high-value
                  techniques will get bespoke React/SVG animations
                  showing the technique's process (e.g. 3DS Bypass MITM
                  flow, Sub-threshold structuring threshold-relative
                  pattern, etc.)
     - Demonstrated in: scenarios + storyboard beats that reference
       this technique. Each is a clickable jump.
     - Sub-techniques: if this is a parent, list its children with
       click-to-load-this-sidebar-for-child behavior
     - Sibling sub-techniques: if this is a sub-technique, list
       siblings for lateral exploration

   Pedagogical insight (OBS-027):
     The flat grid lets a trainee READ a technique. This sidebar lets
     them EXPLORE it — see where it appears in scenarios, jump to a
     beat that demonstrates it, navigate to siblings for comparative
     learning. Definitions are dead; navigable networks are alive.
   ───────────────────────────────────────────────────────────────────── */

export default function TechniqueDetailSidebar({ open, techniqueId, onClose }) {
  const [technique, setTechnique] = useState(null)
  const [crossRefs, setCrossRefs] = useState({ scenarios: [], beats: [] })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !techniqueId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setTechnique(null)
    setCrossRefs({ scenarios: [], beats: [] })

    Promise.all([
      api.getTechnique(techniqueId),
      api.getTechniqueCrossRefs(techniqueId).catch(() => ({ scenarios: [], beats: [] })),
    ])
      .then(([techRes, refsRes]) => {
        if (cancelled) return
        setTechnique(techRes.technique || null)
        setCrossRefs({
          scenarios: refsRes.scenarios || [],
          beats:     refsRes.beats     || [],
        })
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load technique')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, techniqueId])

  function handleScenarioJump(scenarioId) {
    onClose()
    setTimeout(() => navigate(`/scenarios/${scenarioId}`), 150)
  }

  function handleBeatJump(scenarioId) {
    onClose()
    // Beats are inside the storyboard view of a scenario. Jump to the
    // scenario page; the storyboard collapsible there can be expanded
    // by the user. (Deep-link to specific beat is a future enhancement.)
    setTimeout(() => navigate(`/scenarios/${scenarioId}`), 150)
  }

  // Internal navigation between techniques without closing the sidebar
  // (lets user click sibling/parent/child within the sidebar to explore
  // the network laterally)
  const [internalTechId, setInternalTechId] = useState(null)
  // When a navigation happens internally, swap techniqueId. Outer prop
  // changes still take effect via the useEffect dependency.
  const effectiveTechId = internalTechId || techniqueId

  // v25.7.0.9.2: collapsibility state for Description and "How this
  // technique works" (animation) sections. Both default to expanded
  // — first-time users need to read the description, see the animation.
  // Collapse state RESETS on technique change (each new technique
  // starts fresh).
  //
  // animationPauseSignal: a counter that bumps every time the
  // animation section is collapsed. ProcessAnimation watches this
  // prop and pauses when it changes. Counter (vs. boolean) so that
  // re-collapsing re-triggers the pause if user expanded → played →
  // collapsed again.
  const [descriptionExpanded, setDescriptionExpanded] = useState(true)
  const [animationExpanded, setAnimationExpanded] = useState(true)
  const [animationPauseSignal, setAnimationPauseSignal] = useState(0)

  function toggleDescription() {
    setDescriptionExpanded(e => !e)
  }
  function toggleAnimation() {
    setAnimationExpanded(prev => {
      // If we're collapsing, bump the pause signal so the animation
      // pauses. If expanding, no signal — animation stays paused at
      // whatever stage it was on; user clicks Play to resume.
      if (prev) {
        setAnimationPauseSignal(c => c + 1)
      }
      return !prev
    })
  }

  // Re-fetch when internal nav happens
  useEffect(() => {
    if (!open || !internalTechId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setTechnique(null)
    setCrossRefs({ scenarios: [], beats: [] })
    Promise.all([
      api.getTechnique(internalTechId),
      api.getTechniqueCrossRefs(internalTechId).catch(() => ({ scenarios: [], beats: [] })),
    ])
      .then(([techRes, refsRes]) => {
        if (cancelled) return
        setTechnique(techRes.technique || null)
        setCrossRefs({
          scenarios: refsRes.scenarios || [],
          beats:     refsRes.beats     || [],
        })
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load technique')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, internalTechId])

  // Reset internal nav when the parent prop changes (user opens sidebar
  // for a new technique from the grid)
  useEffect(() => {
    setInternalTechId(null)
    // v25.7.0.9.2: reset collapse state — each new technique starts
    // fresh with description + animation expanded
    setDescriptionExpanded(true)
    setAnimationExpanded(true)
  }, [techniqueId])

  // v25.7.0.9.2: also reset collapse state when user navigates
  // laterally within the sidebar (sibling/parent/child link click).
  useEffect(() => {
    setDescriptionExpanded(true)
    setAnimationExpanded(true)
  }, [internalTechId])

  function navigateInternal(newId) {
    setInternalTechId(newId)
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
              // v25.7.0.9.1: animation-equipped techniques get a much
              // wider panel — min(1400px, 95vw) — because the 3-zone
              // canvas + detection controls need real estate to avoid
              // scrolling. The backdrop-dim treatment + close X already
              // makes this effectively a focused modal.
              //
              // Non-animation techniques stay at 600px because text
              // content reads better in narrower columns (typographic
              // best practice: 60-80 chars per line). A 1400px-wide
              // column of placeholder text would be harder to read.
              width: '100%',
              maxWidth: technique && ANIMATION_MAP[technique.id]
                ? 'min(1400px, 95vw)'
                : 600,
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
              transition: 'max-width 200ms',
            }}
            role="dialog"
            aria-label={technique ? `Technique: ${technique.name}` : 'Technique'}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                  fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  <span>F3 Technique</span>
                  {technique?.id && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {technique.id}
                    </span>
                  )}
                  {technique?.tactic && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {technique.tactic.id}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
                  lineHeight: 1.2, color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {loading ? 'Looking up…' : (technique?.name || 'Unknown technique')}
                </div>
                {technique?.parent && (
                  <button
                    onClick={() => navigateInternal(technique.parent.id)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--ink-soft)', marginTop: 6,
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    Sub-technique of{' '}
                    <strong style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      {technique.parent.id}
                    </strong>
                    {' '}· {technique.parent.name}
                  </button>
                )}
                {technique?.tactic && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11.5,
                    color: 'var(--ink-faint)', marginTop: 6,
                  }}>
                    Tactic: {technique.tactic.name}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', padding: 6, cursor: 'pointer',
                  color: 'var(--ink-faint)', fontSize: 20, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '24px 24px 40px',
            }}>
              {error && (
                <div style={{
                  padding: '14px 16px', marginBottom: 20,
                  background: 'rgba(184, 81, 61, 0.08)',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  color: 'var(--accent-hi, #d66e5a)',
                  fontSize: 13.5,
                }}>
                  {error}
                </div>
              )}

              {loading && !error && (
                <div style={{
                  padding: 40, textAlign: 'center',
                  color: 'var(--ink-faint)', fontStyle: 'italic',
                }}>
                  Loading technique detail…
                </div>
              )}

              {!loading && technique && (
                <>
                  {/* Description — v25.7.0.9.2: collapsible. Default
                      expanded; user can collapse once read. */}
                  {technique.description && (
                    <Section
                      title="Description"
                      collapsible
                      expanded={descriptionExpanded}
                      onToggleExpand={toggleDescription}
                    >
                      <p style={proseStyle}>{technique.description}</p>
                    </Section>
                  )}

                  {/* Role relevance */}
                  <Section title="Roles primarily acting on this technique">
                    <RoleChips roles={technique.roles} />
                  </Section>

                  {/* Mitigation guidance — placeholder for v25.7.0.8 */}
                  <Section title="Mitigation guidance">
                    <Placeholder>
                      Per-role mitigation guidance — what each role should
                      look for, ask, or do when this technique is suspected
                      — not yet authored for this technique. Content is
                      planned for the per-tactic role-authoring arc
                      (v25.7.0.10+).
                    </Placeholder>
                  </Section>

                  {/* v25.7.0.9: Animation — renders ProcessAnimation if
                      scene data is registered for this technique in
                      ANIMATION_MAP. Otherwise falls back to placeholder.
                      First animation shipped: F1073 IVR Discovery.
                      v25.7.0.9.2: collapsible. When collapsed, animation
                      auto-pauses (via externalPauseSignal counter) but
                      retains its current stage. User clicks Play to resume. */}
                  <Section
                    title="How this technique works"
                    collapsible
                    expanded={animationExpanded}
                    onToggleExpand={toggleAnimation}
                  >
                    {ANIMATION_MAP[technique.id] ? (
                      <ProcessAnimation
                        scenes={ANIMATION_MAP[technique.id]}
                        externalPauseSignal={animationPauseSignal}
                      />
                    ) : (
                      <Placeholder>
                        Interactive animation showing the technique's
                        step-by-step process is planned for v25.7.0.9+.
                        First animation shipped: F1073 IVR Discovery
                        (TA0043 Reconnaissance). Future candidates:
                        F1008.001 e-delivery silent-alarm, F1067 OSINT
                        data sweep, F1097 3DS Bypass MITM flow,
                        sub-threshold structuring threshold-relative
                        pattern, mule-pipeline cross-bank funds flow.
                      </Placeholder>
                    )}
                  </Section>

                  {/* Demonstrated in — scenarios */}
                  {crossRefs.scenarios.length > 0 && (
                    <Section title={`Demonstrated in ${crossRefs.scenarios.length} ${crossRefs.scenarios.length === 1 ? 'scenario' : 'scenarios'}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {crossRefs.scenarios.map(s => (
                          <CrossRefRow
                            key={s.id}
                            id={s.id}
                            title={s.title}
                            severity={s.severity}
                            onClick={() => handleScenarioJump(s.id)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Demonstrated in — storyboard beats */}
                  {crossRefs.beats.length > 0 && (
                    <Section title={`Featured in ${crossRefs.beats.length} storyboard ${crossRefs.beats.length === 1 ? 'beat' : 'beats'}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {crossRefs.beats.map(b => (
                          <BeatRow
                            key={b.beatId}
                            day={b.day}
                            scenarioId={b.scenarioId}
                            scenarioTitle={b.scenarioTitle}
                            headline={b.headline}
                            onClick={() => handleBeatJump(b.scenarioId)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {crossRefs.scenarios.length === 0 && crossRefs.beats.length === 0 && (
                    <Section title="Cross-references">
                      <Placeholder>
                        This technique isn't currently demonstrated in any
                        authored scenario or storyboard beat. Scenario
                        authoring is ongoing — SC008/SC011/SC013 beats
                        planned for v25.7.0.13+.
                      </Placeholder>
                    </Section>
                  )}

                  {/* Sub-techniques (if parent) */}
                  {technique.children && technique.children.length > 0 && (
                    <Section title={`${technique.children.length} sub-${technique.children.length === 1 ? 'technique' : 'techniques'}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {technique.children.map(c => (
                          <button
                            key={c.id}
                            onClick={() => navigateInternal(c.id)}
                            style={lateralButtonStyle}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11.5,
                              color: 'var(--accent)', marginRight: 10, fontWeight: 600,
                            }}>
                              {c.id}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Siblings (if sub-technique) */}
                  {technique.siblings && technique.siblings.length > 0 && (
                    <Section title="Sibling sub-techniques">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {technique.siblings.map(s => (
                          <button
                            key={s.id}
                            onClick={() => navigateInternal(s.id)}
                            style={lateralButtonStyle}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11.5,
                              color: 'var(--accent)', marginRight: 10, fontWeight: 600,
                            }}>
                              {s.id}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </Section>
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

/* ─── Section wrapper ─────────────────────────────────────────────── */
/* ─── Section wrapper ─────────────────────────────────────────────
   v25.7.0.9.2: now supports optional collapsibility. Non-collapsible
   call sites (Roles, Mitigation, Cross-refs, Sub-techniques, Siblings)
   pass no `collapsible` prop — behavior unchanged. Description and
   "How this technique works" pass `collapsible` + controlled state
   so the sidebar can drive collapse/expand and pause animation when
   the animation section collapses.
   ──────────────────────────────────────────────────────────────── */
function Section({ title, children, collapsible, expanded, onToggleExpand }) {
  const headerCommonStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 11.5,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'var(--ink-faint)', fontWeight: 600,
    marginBottom: 10,
    paddingBottom: 6, borderBottom: '1px solid var(--rule)',
  }
  if (!collapsible) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={headerCommonStyle}>{title}</div>
        {children}
      </div>
    )
  }
  // Collapsible variant
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={onToggleExpand}
        style={{
          ...headerCommonStyle,
          width: '100%',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          paddingBottom: 6,
          // header text inherits from common style
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-faint)' }}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span style={{
          fontSize: 13,
          transition: 'transform 200ms',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
          marginLeft: 8,
        }}>→</span>
      </button>
      {expanded && children}
    </div>
  )
}

/* ─── Roles chip strip ────────────────────────────────────────────── */
const ROLE_LABELS = {
  teller: 'Teller',
  analyst: 'Analyst',
  soc: 'SOC',
  executive: 'Executive',
}
function RoleChips({ roles }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
        const active = (roles || []).includes(roleKey)
        return (
          <span
            key={roleKey}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '5px 10px',
              borderRadius: 4,
              fontWeight: 600,
              background: active ? 'rgba(184, 81, 61, 0.15)' : 'var(--paper-dim)',
              color: active ? 'var(--accent-hi, #d66e5a)' : 'var(--ink-faint)',
              border: '1px solid',
              borderColor: active ? 'rgba(214, 110, 90, 0.3)' : 'var(--rule)',
              opacity: active ? 1 : 0.6,
            }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

/* ─── Placeholder section ─────────────────────────────────────────── */
function Placeholder({ children }) {
  return (
    <div style={{
      fontStyle: 'italic',
      color: 'var(--ink-faint)',
      fontSize: 13.5,
      padding: '12px 14px',
      borderLeft: '2px dashed var(--rule-strong, #3a302a)',
      background: 'rgba(255,255,255,0.012)',
      borderRadius: '0 6px 6px 0',
      lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}

/* ─── Cross-reference row (scenario) ──────────────────────────────── */
function CrossRefRow({ id, title, severity, onClick }) {
  const sevColor =
    severity === 'high'   ? 'var(--danger, #a14040)' :
    severity === 'medium' ? 'var(--warning, #c79a3a)' :
                            'var(--success, #6b8e5a)'
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--paper-dim)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        font: 'inherit',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'var(--paper-hi)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)'
        e.currentTarget.style.background = 'var(--paper-dim)'
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
        color: 'var(--accent)', fontWeight: 600, flexShrink: 0, paddingTop: 1,
      }}>
        {id}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>
        {title}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: sevColor, fontWeight: 600,
        flexShrink: 0, padding: '2px 6px', border: `1px solid ${sevColor}`,
        borderRadius: 3,
      }}>
        {severity}
      </span>
    </button>
  )
}

/* ─── Beat row ────────────────────────────────────────────────────── */
function BeatRow({ day, scenarioId, scenarioTitle, headline, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--paper-dim)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        font: 'inherit',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'var(--paper-hi)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)'
        e.currentTarget.style.background = 'var(--paper-dim)'
      }}
    >
      <div style={{
        flexShrink: 0, paddingTop: 1, textAlign: 'center', minWidth: 36,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
          color: 'var(--ink)', lineHeight: 1,
        }}>
          D{day ?? '?'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 4 }}>
          {headline}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--ink-faint)', letterSpacing: '0.06em',
        }}>
          {scenarioId} · {scenarioTitle}
        </div>
      </div>
    </button>
  )
}

const proseStyle = {
  fontSize: 15,
  lineHeight: 1.65,
  color: 'var(--ink-soft)',
  margin: 0,
}

const lateralButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  background: 'var(--paper-dim)',
  border: '1px solid var(--rule)',
  borderRadius: 5,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'inherit',
  font: 'inherit',
  transition: 'background 150ms',
}
