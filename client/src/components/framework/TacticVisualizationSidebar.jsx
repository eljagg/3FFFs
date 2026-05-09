import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VisualizationRenderer } from '../visualizations/index.js'

/* ─────────────────────────────────────────────────────────────────────────
   TacticVisualizationSidebar — v25.7.0.27.1 → .27.2

   Slide-over panel for tactic-level visualizations. Mirrors the pattern of
   TechniqueDetailSidebar (v25.7.0.8): fixed-position right-side slide-over,
   backdrop dim + click-to-close, ESC dismiss, max-width min(1400px, 95vw),
   slide-in/out via Framer Motion x-axis animation.

   v25.7.0.27.1 (initial):
     Created the slide-over container so tactic-level visualizations
     ("How attackers wait", "The disguise", Reconnaissance kill chain,
     Defense Evasion two-views) open in a right-side slide-out instead of
     expanding inline on the tactic page. Body just rendered the
     VisualizationRenderer raw — no Section structure.

   v25.7.0.27.2 (this revision):
     Restructured the slide-out body to match the interior layout of
     TechniqueDetailSidebar. Three Sections: Description (collapsible,
     default expanded; uses viz.subtitle as the prose), Roles primarily
     seeing this visualization (non-collapsible RoleChips), and How this
     visualization works (collapsible, default expanded; contains the
     VisualizationRenderer). Same component pattern as F1067/F1073's
     slide-out so the user encounters the same shape of detail panel
     across both technique animations and tactic-level visualizations.

   Why a separate sidebar from TechniqueDetailSidebar:
     TechniqueDetailSidebar is bound to a specific technique id and fetches
     full technique metadata (description, roles, mitigation, animation
     scenes, cross-refs) from the server. Tactic-level visualizations
     attach to a tactic, not a technique, render via VisualizationRenderer
     rather than the ANIMATION_MAP / ENGINE_MAP pipeline, and have no
     server-side cross-refs to fetch. Reusing the existing sidebar would
     require type-tagging and conditional rendering branches throughout.
     A parallel small component is cleaner and isolates the change.

   Why duplicate Section / RoleChips / Placeholder rather than extract
   to a shared module:
     A shared module is the eventual right answer (DRY cleanup release
     in the backlog). For this hotfix, modifying TechniqueDetailSidebar
     to import from a new module adds risk surface (the canonical
     technique-detail experience that every Phase 1 + .27 animation
     depends on). Local duplication keeps the change confined to this
     new file. Future general code-quality release can extract these
     to client/src/components/framework/SidebarSections.jsx.

   Props:
     - open: boolean — sidebar visibility
     - viz: the visualization object ({ id, title, subtitle, kind, config,
       roles, attachedTo, ... }) — null when closed
     - effectiveRole: string — 'teller' | 'analyst' | 'soc' | 'executive'
       — pass-through to VisualizationRenderer for role-tuned content
     - onClose: function — called on backdrop click, X button, or ESC
   ───────────────────────────────────────────────────────────────────── */

export default function TacticVisualizationSidebar({ open, viz, effectiveRole, onClose }) {
  // Collapse state — Set-based, matching TechniqueDetailSidebar pattern.
  // Default empty = all sections expanded.
  const [collapsedSections, setCollapsedSections] = useState(() => new Set())
  const isExpanded = (sectionId) => !collapsedSections.has(sectionId)
  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

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
            {/* Header — matches TechniqueDetailSidebar header layout:
                eyebrow with type-tag + tactic id, then h2 title.
                v25.7.0.27.2: subtitle moved into the Description Section
                in the body (was in header in .27.1) so the eyebrow+title
                pair renders identically to the technique sidebar. */}
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

            {/* Body — three Sections matching TechniqueDetailSidebar's
                interior layout for F1067 / F1073:
                  1. Description     (collapsible, default expanded)
                  2. Roles           (non-collapsible chip strip)
                  3. How this viz works (collapsible, default expanded)
                Same Section / RoleChips component pattern; user gets the
                same shape of detail panel across both techniques and
                tactic-level visualizations. */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '24px 24px 40px',
            }}>
              {/* Description — uses viz.subtitle as the descriptive prose.
                  If subtitle is missing (shouldn't happen with current seed
                  data, but defensive), render the Placeholder rather than
                  an empty Section. */}
              <Section
                title="Description"
                collapsible
                expanded={isExpanded('description')}
                onToggleExpand={() => toggleSection('description')}
              >
                {viz.subtitle ? (
                  <p style={proseStyle}>{viz.subtitle}</p>
                ) : (
                  <Placeholder>
                    No description text registered for this visualization.
                    Visualization subtitle is the canonical descriptive
                    prose; if missing, see the visualization config in
                    server/src/seed/data/visualizations.js.
                  </Placeholder>
                )}
              </Section>

              {/* Roles primarily seeing this visualization. v25.7.0.27.2:
                  matches TechniqueDetailSidebar's "Roles primarily acting
                  on this technique" Section. Non-collapsible — chip strip
                  is concise enough that collapsibility adds no value. */}
              <Section title="Roles primarily seeing this visualization">
                <RoleChips roles={viz.roles} />
              </Section>

              {/* v25.7.0.27.5: VisualizationRenderer rendered DIRECTLY in
                  the body, NOT wrapped in a Section. Reason: visualizations
                  with internal drag/scrubber interactions (PositioningTimeline,
                  PositioningTwoViews) need an unconstrained layout context to
                  function correctly. Wrapping them in a Section's marginBottom
                  + collapsible button + content div was breaking pointer-event
                  scoping and causing the visualizations to render statically
                  (visible but non-interactive). The kill-chain grid worked
                  because it uses simple click-to-toggle, but the timeline
                  scrubber and two-views split-screen interactions require the
                  full-width direct rendering pattern they had when inline.
                  Section pattern preserved for Description and Roles above —
                  those are static content where Section wrapping is correct. */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11.5,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'var(--ink-faint)', fontWeight: 600,
                marginBottom: 10,
                paddingBottom: 6, borderBottom: '1px solid var(--rule)',
              }}>
                How this visualization works
              </div>
              <div style={{ position: 'relative' }}>
                <VisualizationRenderer viz={viz} effectiveRole={effectiveRole} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   Local Section / RoleChips / Placeholder

   Duplicated from TechniqueDetailSidebar.jsx (lines 730-839) verbatim
   to keep this hotfix's change surface confined to one new file.
   Future cleanup release will extract these to a shared module
   (client/src/components/framework/SidebarSections.jsx) and refactor
   both sidebars to import from it.
   ───────────────────────────────────────────────────────────────── */

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

const proseStyle = {
  fontSize: 14.5,
  lineHeight: 1.65,
  color: 'var(--ink)',
  margin: 0,
}
