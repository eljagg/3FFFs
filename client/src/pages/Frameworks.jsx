import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import LifecycleDiagram from '../components/frameworks/LifecycleDiagram.jsx'
import PhaseDetailPanel from '../components/frameworks/PhaseDetailPanel.jsx'
import FrameworkConceptsList from '../components/frameworks/FrameworkConceptsList.jsx'
import ConceptSidebar from '../components/scenario/ConceptSidebar.jsx'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   Frameworks page (v25.4 — first widget: Lifecycle Diagram)

   The dedicated reference module for AASE / CBEST / TIBER-EU / iCAST.
   Distinct from the existing /framework page (singular) which covers F3
   fraud framework — see deploy notes for naming rationale.

   v25.4 ships:
     - Page shell + top-nav entry
     - Framework selector (AASE selected by default; CBEST/TIBER/iCAST
       are skeleton-only in v25.4 and show a "data coming in v25.6" state)
     - Lifecycle Diagram (4-phase horizontal flow)
     - Phase Detail Panel (deliverables + key decisions)
     - Framework concepts sidebar (click to open ConceptSidebar)

   v25.5 will add: Threat Matrix Builder
   v25.5.x will add: Role-Relationship Map
------------------------------------------------------------------------- */

export default function Frameworks() {
  const [frameworks, setFrameworks] = useState([])
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('AASE')
  const [phasesData, setPhasesData] = useState(null)
  const [conceptsData, setConceptsData] = useState([])
  const [selectedPhaseId, setSelectedPhaseId] = useState(null)
  const [conceptSidebar, setConceptSidebar] = useState({ open: false, conceptId: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initial load: list of frameworks (for the selector at the top)
  useEffect(() => {
    api.listFrameworks()
      .then(r => setFrameworks(r.frameworks || []))
      .catch(e => console.warn('listFrameworks failed:', e.message))
  }, [])

  // Selected framework: load its phases (with deliverables + roles per v25.0
  // endpoint) and its concepts. Two parallel calls.
  useEffect(() => {
    if (!selectedFrameworkId) return
    setLoading(true)
    setError(null)
    setSelectedPhaseId(null)

    Promise.all([
      api.getFrameworkPhases(selectedFrameworkId),
      api.getFramework(selectedFrameworkId),
    ])
      .then(([phasesRes, frameworkRes]) => {
        const phases = phasesRes.phases || []
        setPhasesData({ framework: frameworkRes.framework, phases })
        setConceptsData(frameworkRes.concepts || [])
        // Auto-select first phase so the panel is never empty on first load
        if (phases.length > 0) setSelectedPhaseId(phases[0].id)
      })
      .catch(e => {
        console.error('Frameworks load failed:', e)
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [selectedFrameworkId])

  const selectedPhase = useMemo(() => {
    if (!phasesData) return null
    return phasesData.phases.find(p => p.id === selectedPhaseId) || null
  }, [phasesData, selectedPhaseId])

  // Whether the selected framework has lifecycle data seeded.
  // v25.0 only seeded AASE phases fully — CBEST/TIBER/iCAST have framework
  // headers but no phases yet (v25.6 will fill those in).
  const hasLifecycleData = !!(phasesData?.phases?.length)

  if (loading && !phasesData) {
    return <Page eyebrow="Frameworks" title="Loading…" />
  }

  return (
    <Page
      eyebrow="Frameworks"
      title="Lifecycle of an adversarial exercise."
      lede="Reference module for AASE, CBEST, TIBER-EU, and iCAST. Drill into a phase to see what it produces, who's responsible, and what decisions it carries."
    >
      {/* Framework selector — pills for the four frameworks */}
      <FrameworkSelector
        frameworks={frameworks}
        selectedId={selectedFrameworkId}
        onSelect={setSelectedFrameworkId}
      />

      {error && (
        <div style={{
          padding: '14px 18px', marginTop: 18,
          background: 'var(--danger-bg)', border: '1px solid var(--danger)',
          borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--ink)',
        }}>
          Could not load framework data: {error}
        </div>
      )}

      {!hasLifecycleData && !loading && !error && (
        // CBEST/TIBER/iCAST currently land here — framework header exists,
        // phases are empty. v25.6 will add lifecycle data for these.
        <div style={{
          padding: '32px 24px', marginTop: 18, textAlign: 'center',
          background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-soft)',
            fontWeight: 600, marginBottom: 6,
          }}>
            Framework data coming
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
            color: 'var(--ink)', marginBottom: 8,
          }}>
            {phasesData?.framework?.name || selectedFrameworkId} lifecycle is being built.
          </h3>
          <p style={{
            fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55,
            maxWidth: 560, margin: '0 auto',
          }}>
            v25.4 ships the AASE lifecycle. CBEST, TIBER-EU, and iCAST get
            full lifecycle data in v25.6 alongside the freshness pass on
            current revisions of each framework.
          </p>
        </div>
      )}

      {hasLifecycleData && (
        <>
          {/* The diagram */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: 18 }}
          >
            <LifecycleDiagram
              phases={phasesData.phases}
              selectedPhaseId={selectedPhaseId}
              onSelect={setSelectedPhaseId}
            />
          </motion.div>

          {/* Two-column layout: detail panel (left, 2/3) + concepts (right, 1/3) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
            gap: 18,
            marginTop: 8,
          }}>
            <PhaseDetailPanel phase={selectedPhase} />
            <FrameworkConceptsList
              concepts={conceptsData}
              onConceptClick={(conceptId) => setConceptSidebar({ open: true, conceptId })}
            />
          </div>
        </>
      )}

      {/* Reuses v25.1's ConceptSidebar — same component, same data path */}
      <ConceptSidebar
        open={conceptSidebar.open}
        conceptId={conceptSidebar.conceptId}
        onClose={() => setConceptSidebar({ open: false, conceptId: null })}
      />
    </Page>
  )
}

function FrameworkSelector({ frameworks, selectedId, onSelect }) {
  if (!frameworks.length) return null
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      marginBottom: 8,
    }}>
      {frameworks.map(fw => {
        const isSelected = fw.id === selectedId
        return (
          <button
            key={fw.id}
            onClick={() => onSelect(fw.id)}
            style={{
              padding: '8px 14px',
              background: isSelected ? 'var(--ink)' : 'transparent',
              color: isSelected ? 'var(--paper-hi)' : 'var(--ink-soft)',
              border: '1px solid',
              borderColor: isSelected ? 'var(--ink)' : 'var(--rule-strong)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              transition: 'all var(--dur) ease',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--ink)'
                e.currentTarget.style.color = 'var(--ink)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--rule-strong)'
                e.currentTarget.style.color = 'var(--ink-soft)'
              }
            }}
            aria-pressed={isSelected}
          >
            <span>{fw.id}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isSelected ? 'var(--paper-hi)' : 'var(--ink-faint)',
              opacity: 0.85,
            }}>· {fw.region}</span>
          </button>
        )
      })}
    </div>
  )
}
