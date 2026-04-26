import { motion, AnimatePresence } from 'framer-motion'

/* -------------------------------------------------------------------------
   PhaseDetailPanel — what shows below the LifecycleDiagram when a phase
   is selected. Three sections:

     1. Phase summary — the prose description from the AASE PDF
     2. Deliverables — the reports/artefacts produced in this phase, with
        their producing role
     3. Key decisions — the headline questions an Exercise Director must
        answer in this phase (already in the seed data as JSON-encoded array)

   Animates in/out on phase change so the user sees the panel update,
   not just silently swap content.
------------------------------------------------------------------------- */

export default function PhaseDetailPanel({ phase }) {
  if (!phase) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        background: 'var(--paper-hi)',
        border: '1px dashed var(--rule-strong)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--ink-soft)', fontSize: 14,
      }}>
        Select a phase above to see what it produces and the decisions it carries.
      </div>
    )
  }

  const deliverables = phase.deliverables || []
  const keyDecisions = Array.isArray(phase.keyDecisions) ? phase.keyDecisions : []

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        style={{
          background: 'var(--paper-hi)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 26px',
        }}
      >
        {/* Phase header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--accent)',
            fontWeight: 600, marginBottom: 6,
          }}>
            Phase {phase.order} · AASE Lifecycle
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
            lineHeight: 1.2, letterSpacing: '-0.01em', color: 'var(--ink)',
            marginBottom: 12,
          }}>
            {phase.name}
          </h2>
          <p style={{
            fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)',
            maxWidth: 760,
          }}>
            {phase.summary}
          </p>
        </div>

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <Section title={`Deliverables produced in this phase (${deliverables.length})`}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 10,
            }}>
              {deliverables.map(d => (
                <DeliverableCard key={d.id} deliverable={d} />
              ))}
            </div>
          </Section>
        )}

        {/* Key decisions */}
        {keyDecisions.length > 0 && (
          <Section title={`Key decisions in this phase (${keyDecisions.length})`}>
            <ul style={{
              margin: 0, padding: 0, listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {keyDecisions.map((decision, i) => (
                <li key={i} style={{
                  display: 'flex', gap: 12,
                  padding: '10px 12px',
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--ink-soft)', flexShrink: 0,
                    minWidth: 18,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--ink-soft)',
        fontWeight: 600, marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function DeliverableCard({ deliverable }) {
  const producedBy = deliverable.producedBy
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
        color: 'var(--ink)', lineHeight: 1.3,
      }}>
        {deliverable.name}
      </div>
      {producedBy?.name && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink-soft)',
        }}>
          Produced by · {producedBy.name}
        </div>
      )}
      {/* Show first content item as a hint of what's in the deliverable */}
      {Array.isArray(deliverable.contents) && deliverable.contents.length > 0 && (
        <div style={{
          fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45,
          marginTop: 2, fontStyle: 'italic',
        }}>
          {deliverable.contents[0]}
          {deliverable.contents.length > 1 && (
            <span style={{ color: 'var(--ink-faint)' }}>
              {' '}+ {deliverable.contents.length - 1} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
