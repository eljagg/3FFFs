import { motion, AnimatePresence } from 'framer-motion'
import { VisualizationRenderer } from '../visualizations/index.js'

/* ─────────────────────────────────────────────────────────────────────────
   TacticVisualizationSidebar — v25.7.0.27.1

   Slide-over panel for tactic-level visualizations. Mirrors the pattern of
   TechniqueDetailSidebar (v25.7.0.8): fixed-position right-side slide-over,
   backdrop dim + click-to-close, ESC dismiss, max-width min(1400px, 95vw),
   slide-in/out via Framer Motion x-axis animation.

   Why a separate sidebar from TechniqueDetailSidebar:
     TechniqueDetailSidebar is bound to a specific technique id and fetches
     full technique metadata (description, roles, mitigation, animation
     scenes, cross-refs). Tactic-level visualizations are a different shape
     — they attach to a tactic, not a technique, and they are rendered via
     VisualizationRenderer rather than the ANIMATION_MAP / ENGINE_MAP
     pipeline. Reusing TechniqueDetailSidebar would require type-tagging
     and conditional rendering branches; a parallel small component is
     cleaner and isolates the change.

   Why slide-out at all (vs. previous inline collapsible):
     v25.7.0.27.1 unifies the detail-content interaction model across the
     Framework page. Every animation / visualization opens via the same
     right-side slide-over: technique animations through TechniqueDetailSidebar,
     tactic-level visualizations through this new sidebar. Trainees no longer
     need to learn two different interaction patterns (inline expand vs.
     slide-over) for content that is functionally adjacent.

   Props:
     - open: boolean — sidebar visibility
     - viz: the visualization object ({ id, title, subtitle, kind, config,
       roles, attachedTo, ... }) — null when closed
     - effectiveRole: string — 'teller' | 'analyst' | 'soc' | 'executive'
       — pass-through to VisualizationRenderer for role-tuned content
     - onClose: function — called on backdrop click, X button, or ESC
   ───────────────────────────────────────────────────────────────────── */

export default function TacticVisualizationSidebar({ open, viz, effectiveRole, onClose }) {
  // ESC dismiss
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && open) onClose()
  }

  return (
    <AnimatePresence>
      {open && viz && (
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
              width: '100%',
              maxWidth: 'min(1400px, 95vw)',
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
            }}
            role="dialog"
            aria-label={`Visualization: ${viz.title}`}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              background: 'var(--paper)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                  fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  <span>Tactic Visualization</span>
                  {viz?.attachedTo?.id && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {viz.attachedTo.id}
                    </span>
                  )}
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22, fontWeight: 700,
                  margin: 0, lineHeight: 1.25,
                  color: 'var(--ink)',
                }}>
                  {viz.title}
                </h2>
                {viz.subtitle && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 14,
                    color: 'var(--ink-soft)',
                    lineHeight: 1.45,
                  }}>
                    {viz.subtitle}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent', border: '1px solid var(--rule)',
                  borderRadius: 6, width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  color: 'var(--ink)', fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            {/* Body — visualization renders here */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px 24px',
            }}>
              <VisualizationRenderer viz={viz} effectiveRole={effectiveRole} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
