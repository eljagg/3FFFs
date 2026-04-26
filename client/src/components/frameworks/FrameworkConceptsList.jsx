/* -------------------------------------------------------------------------
   FrameworkConceptsList — vertical list of the AASE concepts. Sits in a
   sidebar to the right of the main lifecycle area. Clicking a concept
   opens the existing v25.1 ConceptSidebar (slide-over from the right edge
   of the screen) showing the formal definition + cross-framework
   recognition.

   v25.4 design note: concepts are NOT phase-bound in the AASE PDF —
   "Critical Function", "Concession", "Letter of Engagement" etc. apply
   across the whole lifecycle. Showing them as framework-wide rather than
   per-phase is structurally honest. This is why the list lives in a
   sidebar, parallel to the diagram, not inside the PhaseDetailPanel.
------------------------------------------------------------------------- */

export default function FrameworkConceptsList({ concepts = [], onConceptClick }) {
  if (!concepts.length) return null

  return (
    <div style={{
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--accent)',
        fontWeight: 600, marginBottom: 6,
      }}>
        Shared vocabulary
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500,
        lineHeight: 1.25, color: 'var(--ink)', marginBottom: 6,
      }}>
        AASE concepts
      </h3>
      <p style={{
        fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5,
        marginBottom: 16,
      }}>
        Concepts span the whole lifecycle. Click any to see the formal
        definition and where each concept appears in the other frameworks.
      </p>

      <ul style={{
        margin: 0, padding: 0, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {concepts.map(c => (
          <li key={c.id}>
            <button
              onClick={() => onConceptClick(c.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, width: '100%',
                padding: '8px 10px', textAlign: 'left',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--ink)', fontSize: 13.5,
                transition: 'all var(--dur) ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--paper)'
                e.currentTarget.style.borderColor = 'var(--rule)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <span style={{ flex: 1 }}>{c.name}</span>
              {c.universal && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 600,
                  padding: '2px 5px', borderRadius: 3,
                  border: '1px solid var(--rule-strong)',
                  color: 'var(--ink-soft)',
                  flexShrink: 0,
                }} title="Recognised across all four frameworks (AASE, CBEST, TIBER-EU, iCAST)">
                  Universal
                </span>
              )}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="var(--ink-faint)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7" /><path d="M7 7h10v10" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
