import { useMemo, useState } from 'react'

/* ─────────────────────────────────────────────────────────────────────────
   KillChainGrid — v25.7.0.2 (ISS-023)

   Reconnaissance-style kill-chain visualization. Three columns of nodes
   left-to-right, defenses panel below. Two interaction primitives:

     1. Click a node — highlights the selected node + its immediate parents
        and children along the configured edges. Other nodes dim.
     2. Toggle a defense — every node that defense claims to mitigate goes
        grayscale and gains a shield overlay. The kill-chain visibly breaks.

   The defense-toggle mechanic is the pedagogical commitment: the user can
   render an attack non-viable through their input. If a future viz kind
   loses this property, it is decoration with click handlers.

   Props:
     viz             — registry entry { id, title, subtitle, config, ... }
     effectiveRole   — current user's effective role (passed through but
                       not used at render time — the viz adapts itself
                       at the renderer wrapper layer if needed)
     onEvent(type)   — telemetry callback. Wrapper handles dispatch to API.

   This component uses ONLY CSS variables for color so theme changes,
   bank-color propagation, and dark mode all work without component edits.
   The Gemini source we adapted from used Tailwind slate-* tokens; those
   are not present in our build, and would not honor our --paper-hi /
   --accent / --rule conventions.
   ───────────────────────────────────────────────────────────────────────── */

export default function KillChainGrid({ viz, onEvent }) {
  const config = viz.config || {}
  const phases   = config.phases   || []
  const nodes    = config.nodes    || []
  const edges    = config.edges    || []
  const defenses = config.defenses || []
  const illustrativeNote = config.illustrativeNote || null

  const [activeNodeId, setActiveNodeId] = useState(null)
  const [activeDefenseIds, setActiveDefenseIds] = useState(() => new Set())

  // Group nodes by phase index for column rendering. Memoised so we don't
  // rebuild the bucketing on every state change.
  const nodesByPhase = useMemo(() => {
    const buckets = phases.map(() => [])
    nodes.forEach(n => {
      const idx = typeof n.phase === 'number' ? n.phase : 0
      if (buckets[idx]) buckets[idx].push(n)
    })
    return buckets
  }, [phases, nodes])

  // Forward + reverse edge maps for path-tracing on selection.
  const { childMap, parentMap } = useMemo(() => {
    const childMap = new Map()
    const parentMap = new Map()
    edges.forEach(e => {
      if (!childMap.has(e.from)) childMap.set(e.from, [])
      childMap.get(e.from).push(e.to)
      if (!parentMap.has(e.to)) parentMap.set(e.to, [])
      parentMap.get(e.to).push(e.from)
    })
    return { childMap, parentMap }
  }, [edges])

  // Aggregate which nodes are mitigated under the current defense selection.
  const mitigatedNodeIds = useMemo(() => {
    const set = new Set()
    activeDefenseIds.forEach(defId => {
      const def = defenses.find(d => d.id === defId)
      if (!def) return
      ;(def.mitigates || []).forEach(nodeId => set.add(nodeId))
    })
    return set
  }, [activeDefenseIds, defenses])

  // Highlight set: when no node is selected, every node is highlighted
  // (i.e. nothing dims). When a node is selected, highlight the selection
  // plus its immediate neighbours along the directed edges.
  const highlightedNodeIds = useMemo(() => {
    if (!activeNodeId) return null  // null sentinel = "everyone is bright"
    const set = new Set([activeNodeId])
    ;(childMap.get(activeNodeId) || []).forEach(c => set.add(c))
    ;(parentMap.get(activeNodeId) || []).forEach(p => set.add(p))
    return set
  }, [activeNodeId, childMap, parentMap])

  function toggleNode(nodeId) {
    const next = activeNodeId === nodeId ? null : nodeId
    setActiveNodeId(next)
    if (next) onEvent?.('node_selected')
  }

  function toggleDefense(defId) {
    setActiveDefenseIds(prev => {
      const next = new Set(prev)
      if (next.has(defId)) next.delete(defId)
      else next.add(defId)
      return next
    })
    onEvent?.('defense_toggled')
  }

  // Selected node detail — pulled out so the right-side context line at
  // the top of the panel can read it.
  const selectedNode = activeNodeId ? nodes.find(n => n.id === activeNodeId) : null

  return (
    <div style={s.root}>
      {/* Header: title + subtitle live in the calling panel; this component
          handles only the body. We do render a small instruction line at
          the top so the viz is self-documenting in isolation (the admin
          preview page renders it without any wrapping prose). */}
      <div style={s.instructionRow}>
        <span style={s.instructionText}>
          {selectedNode
            ? <>Tracing path from <strong style={{ color: 'var(--accent)' }}>{selectedNode.label}</strong>. Click again to clear.</>
            : <>Click any node to trace the attack path. Toggle defenses below to break the chain.</>
          }
        </span>
        {activeDefenseIds.size > 0 && (
          <span style={s.activeDefBadge}>
            {activeDefenseIds.size} defense{activeDefenseIds.size === 1 ? '' : 's'} active
          </span>
        )}
      </div>

      {/* Phase columns */}
      <div style={s.columnGrid}>
        {phases.map((phase, idx) => (
          <div key={phase.id} style={s.column}>
            <div style={s.columnHeader}>
              <span style={s.phaseNumber}>{idx + 1}</span>
              <span style={s.phaseLabel}>{phase.label}</span>
            </div>
            <div style={s.columnBody}>
              {(nodesByPhase[idx] || []).map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={activeNodeId === node.id}
                  isHighlighted={highlightedNodeIds === null || highlightedNodeIds.has(node.id)}
                  isMitigated={mitigatedNodeIds.has(node.id)}
                  onToggle={() => toggleNode(node.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Defense panel — the falsifiability hook. Each toggle visibly
          breaks one or more nodes in the grid above. */}
      <div style={s.defensePanel}>
        <div style={s.defensePanelHeader}>
          <span style={s.defensePanelTitle}>Active defenses</span>
          <span style={s.defensePanelHint}>Toggle to mitigate the chain</span>
        </div>
        <div style={s.defenseList}>
          {defenses.map(def => {
            const active = activeDefenseIds.has(def.id)
            return (
              <button
                key={def.id}
                onClick={() => toggleDefense(def.id)}
                style={{
                  ...s.defenseChip,
                  ...(active ? s.defenseChipActive : null),
                }}
                title={def.hint || ''}
              >
                <span style={{
                  ...s.defenseCheckbox,
                  ...(active ? s.defenseCheckboxActive : null),
                }}>
                  {active && <CheckMark />}
                </span>
                <span style={s.defenseLabel}>{def.label}</span>
              </button>
            )
          })}
        </div>
        {/* When a defense is active, surface its hint inline so the user
            understands WHY the toggle broke what it broke. Without this the
            mitigation feels magical — "I clicked something and a node got
            shielded" — and the lesson is lost. */}
        {activeDefenseIds.size > 0 && (
          <div style={s.defenseHints}>
            {defenses
              .filter(d => activeDefenseIds.has(d.id))
              .map(d => (
                <div key={d.id} style={s.defenseHint}>
                  <span style={s.defenseHintLabel}>{d.label}:</span>{' '}
                  <span style={s.defenseHintText}>{d.hint}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Illustrative-content marker — flags that this viz is a teaching
          abstraction, not a literal F3 graph render. Per the v25.7.0.2
          content-model decision (Option A from planning). */}
      {illustrativeNote && (
        <div style={s.illustrativeNote}>{illustrativeNote}</div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// NodeCard — one node in the kill-chain grid
// ────────────────────────────────────────────────────────────────────────
function NodeCard({ node, isSelected, isHighlighted, isMitigated, onToggle }) {
  // State precedence for visual treatment:
  //   mitigated > selected > highlighted > dimmed
  // Mitigated wins because the entire teaching moment is "this node is
  // out of the picture once the defense fires" — selection inside a
  // mitigated node would muddle that.
  let cardStyle = { ...s.nodeCard }
  if (isMitigated) {
    cardStyle = { ...cardStyle, ...s.nodeCardMitigated }
  } else if (isSelected) {
    cardStyle = { ...cardStyle, ...s.nodeCardSelected }
  } else if (isHighlighted) {
    cardStyle = { ...cardStyle, ...s.nodeCardHighlighted }
  } else {
    cardStyle = { ...cardStyle, ...s.nodeCardDimmed }
  }

  return (
    <button
      onClick={onToggle}
      disabled={isMitigated}
      style={cardStyle}
    >
      {isMitigated && (
        <div style={s.mitigatedOverlay}>
          <ShieldIcon />
          <span style={s.mitigatedLabel}>Mitigated</span>
        </div>
      )}
      <div style={s.nodeTopRow}>
        <span style={s.nodeMitre}>{node.mitre}</span>
      </div>
      <div style={s.nodeLabel}>{node.label}</div>
      {isSelected && node.description && (
        <div style={s.nodeDescription}>{node.description}</div>
      )}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Inline icons — staying consistent with the rest of the codebase, which
// uses inline SVG rather than lucide-react (see AppShell.jsx).
// ────────────────────────────────────────────────────────────────────────
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function CheckMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Styles — all CSS variables, no Tailwind. Matches Framework.jsx idioms.
// ────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', gap: 16,
    width: '100%',
  },

  instructionRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap',
    fontSize: 12.5, color: 'var(--ink-soft)',
    padding: '0 2px',
  },
  instructionText: { lineHeight: 1.5 },
  activeDefBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '3px 8px',
    background: 'var(--success-bg)', color: 'var(--success)',
    border: '1px solid var(--success)',
    borderRadius: 3,
  },

  columnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  column: {
    display: 'flex', flexDirection: 'column', gap: 8,
    minWidth: 0,
  },
  columnHeader: {
    display: 'flex', alignItems: 'baseline', gap: 8,
    paddingBottom: 8, borderBottom: '1px solid var(--rule)',
    marginBottom: 4,
  },
  phaseNumber: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--ink-faint)', letterSpacing: '0.08em',
  },
  phaseLabel: {
    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500,
    color: 'var(--ink-soft)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  columnBody: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },

  // Node card base — overridden by state-specific styles below
  nodeCard: {
    position: 'relative', overflow: 'hidden',
    width: '100%', textAlign: 'left',
    padding: '10px 12px',
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'all var(--dur) ease',
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
  },
  nodeCardHighlighted: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
  },
  nodeCardSelected: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--accent)',
    boxShadow: '0 0 0 3px rgba(200, 66, 31, 0.12)',
  },
  nodeCardDimmed: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    opacity: 0.4,
  },
  nodeCardMitigated: {
    background: 'var(--paper-dim)',
    border: '1px dashed var(--rule)',
    opacity: 0.55,
    cursor: 'not-allowed',
    filter: 'grayscale(0.3)',
  },

  mitigatedOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    background: 'rgba(0, 0, 0, 0.04)',
    color: 'var(--success)',
    zIndex: 1,
  },
  mitigatedLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    fontWeight: 600,
  },

  nodeTopRow: {
    display: 'flex', justifyContent: 'flex-end',
    marginBottom: 4,
  },
  nodeMitre: {
    fontFamily: 'var(--font-mono)', fontSize: 9.5,
    padding: '1px 6px',
    color: 'var(--ink-faint)',
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 3,
    letterSpacing: '0.04em',
  },
  nodeLabel: {
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
    lineHeight: 1.25,
    color: 'var(--ink)',
  },
  nodeDescription: {
    marginTop: 8, paddingTop: 8,
    borderTop: '1px solid var(--rule)',
    fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5,
  },

  defensePanel: {
    marginTop: 4,
    padding: '14px 16px',
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)',
  },
  defensePanelHeader: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 10,
  },
  defensePanelTitle: {
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
    color: 'var(--ink)',
  },
  defensePanelHint: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    color: 'var(--ink-faint)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  defenseList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 6,
  },
  defenseChip: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px',
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 12.5,
    color: 'var(--ink-soft)',
    textAlign: 'left',
    transition: 'all var(--dur) ease',
  },
  defenseChipActive: {
    background: 'var(--success-bg)',
    borderColor: 'var(--success)',
    color: 'var(--success)',
  },
  defenseCheckbox: {
    width: 14, height: 14,
    flexShrink: 0,
    border: '1.5px solid var(--ink-faint)',
    borderRadius: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  defenseCheckboxActive: {
    background: 'var(--success)',
    borderColor: 'var(--success)',
    color: 'var(--paper-hi)',
  },
  defenseLabel: { lineHeight: 1.3 },

  defenseHints: {
    marginTop: 12, paddingTop: 12,
    borderTop: '1px solid var(--rule)',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  defenseHint: {
    fontSize: 12, lineHeight: 1.5,
  },
  defenseHintLabel: {
    fontWeight: 600, color: 'var(--success)',
  },
  defenseHintText: {
    color: 'var(--ink-soft)',
  },

  illustrativeNote: {
    fontSize: 11.5, fontStyle: 'italic',
    color: 'var(--ink-faint)',
    padding: '0 2px',
  },
}
