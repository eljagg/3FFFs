import { motion } from 'framer-motion'

/* -------------------------------------------------------------------------
   LifecycleDiagram — horizontal node-and-arrow flow showing the four AASE
   phases. Each node is clickable; selected phase highlights with accent,
   others dim.

   v25.4 design choices (deliberate, see deploy notes):
     - Horizontal flow, not Sankey (this isn't quantitative flow, it's a
       sequence)
     - Equal-width nodes (Option C from planning)
     - Small chip on each showing deliverable count — communicates the
       weight asymmetry without distorting node sizes
     - Connecting arrows between phases reinforce the order
     - Boring and clear beats clever and confusing — this is a reference
       page, not an exploration toy
------------------------------------------------------------------------- */

export default function LifecycleDiagram({ phases = [], selectedPhaseId, onSelect }) {
  if (!phases.length) return null

  return (
    <div style={{
      width: '100%',
      padding: '24px 0',
      // Horizontal scroll on narrow viewports rather than wrap — wrapping
      // would break the visual sequence
      overflowX: 'auto',
      overflowY: 'visible',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        minWidth: 720,  // forces horizontal scroll on very narrow screens
        position: 'relative',
      }}>
        {phases.map((phase, idx) => {
          const isSelected = phase.id === selectedPhaseId
          const deliverableCount = (phase.deliverables || []).length
          const isLast = idx === phases.length - 1

          return (
            <div key={phase.id} style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              minWidth: 160,
            }}>
              <PhaseNode
                phase={phase}
                isSelected={isSelected}
                deliverableCount={deliverableCount}
                onClick={() => onSelect(phase.id)}
                index={idx}
              />
              {!isLast && <PhaseArrow />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PhaseNode({ phase, isSelected, deliverableCount, onClick, index }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -2 }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '20px 12px',
        background: isSelected ? 'var(--paper-hi)' : 'transparent',
        border: '1px solid',
        borderColor: isSelected ? 'var(--accent)' : 'var(--rule-strong)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'all var(--dur) ease',
        minWidth: 0,  // allow flex children to shrink
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--ink)'
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--rule-strong)'
      }}
      aria-pressed={isSelected}
    >
      {/* Phase number — large, display font, the visual anchor */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isSelected ? 'var(--accent)' : 'var(--paper-hi)',
        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--rule-strong)'}`,
        color: isSelected ? '#fff' : 'var(--ink)',
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
        transition: 'all var(--dur) ease',
      }}>
        {phase.order}
      </div>

      {/* Phase name */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
        color: 'var(--ink)', textAlign: 'center', lineHeight: 1.25,
        // truncate long names rather than wrap mid-button
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}>
        {phase.name}
      </div>

      {/* v25.4: Option C — deliverable-count chip communicates content weight
          without distorting node size. Uses mono font for data-y feel,
          accent color when selected so the chip reinforces the selection. */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', fontWeight: 600,
        color: isSelected ? 'var(--accent)' : 'var(--ink-soft)',
        padding: '2px 6px', borderRadius: 3,
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--rule)'}`,
        transition: 'all var(--dur) ease',
      }}>
        {deliverableCount} {deliverableCount === 1 ? 'deliverable' : 'deliverables'}
      </div>
    </motion.button>
  )
}

function PhaseArrow() {
  // Small visual connector between nodes — reinforces sequence
  return (
    <div style={{
      flex: '0 0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ink-faint)',
    }}>
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
        <path d="M1 7 L19 7 M14 2 L19 7 L14 12"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
