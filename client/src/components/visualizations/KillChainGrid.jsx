import { useMemo, useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  // v25.7.0.2.2: refs map node id → DOM element. Used to compute edge
  // endpoints in pixel coords on layout, and re-compute on resize. The
  // SVG layer is absolute-positioned over the column grid; we read the
  // real bounding rects so edges land exactly on card centers regardless
  // of theme, font, or zoom.
  const containerRef = useRef(null)
  const nodeRefs = useRef({})
  const setNodeRef = (id) => (el) => { if (el) nodeRefs.current[id] = el }
  const [edgeGeometry, setEdgeGeometry] = useState([])

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

  // v25.7.0.2.2: compute pixel coordinates for every edge based on the
  // current DOM layout. Runs on mount, on edge data change, and on
  // window resize. Each entry is { from, to, x1, y1, x2, y2 } in
  // coordinates relative to the column-grid container.
  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const next = []
      for (const edge of edges) {
        const fromEl = nodeRefs.current[edge.from]
        const toEl = nodeRefs.current[edge.to]
        if (!fromEl || !toEl) continue
        const a = fromEl.getBoundingClientRect()
        const b = toEl.getBoundingClientRect()
        // Edge anchors at the right edge of the source card and the
        // left edge of the target card — gives a clean left-to-right
        // arrow shape across the column gap.
        next.push({
          from: edge.from,
          to:   edge.to,
          x1: a.right - containerRect.left,
          y1: a.top + a.height / 2 - containerRect.top,
          x2: b.left - containerRect.left,
          y2: b.top + b.height / 2 - containerRect.top,
        })
      }
      setEdgeGeometry(next)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [edges, nodes, phases])

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

      {/* Phase columns + edge overlay. The columnGrid container is the
          coordinate space for the SVG; node refs feed into edge geometry. */}
      <div ref={containerRef} style={{ ...s.columnGrid, position: 'relative' }}>
        {/* SVG edges — drawn behind the cards (zIndex 0). Each edge is a
            simple bezier from source-right to target-left. v25.7.0.2.2:
            highlighted-on-selection, dimmed-on-mitigation, animated via
            stroke-dashoffset on path-trace. */}
        <svg
          style={s.edgeSvg}
          aria-hidden="true"
        >
          {edgeGeometry.map(eg => {
            const fromMitigated = mitigatedNodeIds.has(eg.from)
            const toMitigated   = mitigatedNodeIds.has(eg.to)
            const eitherMit     = fromMitigated || toMitigated

            // An edge is "on the active path" if it touches the selected
            // node. When no node is selected, all edges are at base level.
            const onActivePath = activeNodeId
              ? (eg.from === activeNodeId || eg.to === activeNodeId)
              : false
            const dimmed = activeNodeId && !onActivePath

            // Bezier control point — pushed horizontally to give edges
            // a gentle S-curve rather than straight lines.
            const dx = eg.x2 - eg.x1
            const cx1 = eg.x1 + dx * 0.5
            const cx2 = eg.x2 - dx * 0.5
            const path = `M ${eg.x1},${eg.y1} C ${cx1},${eg.y1} ${cx2},${eg.y2} ${eg.x2},${eg.y2}`

            const stroke = eitherMit
              ? 'var(--success)'
              : (onActivePath ? 'var(--accent)' : 'var(--rule-strong)')
            const strokeWidth = onActivePath ? 2 : 1.25
            const strokeOpacity = dimmed ? 0.25 : (eitherMit ? 0.35 : 0.85)
            const dashArray = eitherMit ? '4 4' : 'none'

            return (
              <motion.path
                key={`${eg.from}->${eg.to}`}
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeDasharray={dashArray}
                strokeLinecap="round"
                initial={false}
                animate={{ strokeOpacity, strokeWidth }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            )
          })}
        </svg>

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
                  setRef={setNodeRef(node.id)}
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
// NodeCard — one node in the kill-chain grid (v25.7.0.2.2: motion + ref)
// ────────────────────────────────────────────────────────────────────────
function NodeCard({ node, setRef, isSelected, isHighlighted, isMitigated, onToggle }) {
  // State precedence for visual treatment:
  //   mitigated > selected > highlighted > dimmed
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

  // Motion target — opacity/scale settle differently per state.
  const animateTo = isMitigated
    ? { opacity: 1,    scale: 1.0  }
    : isSelected
      ? { opacity: 1,  scale: 1.02 }
      : isHighlighted
        ? { opacity: 1, scale: 1.0 }
        : { opacity: 0.4, scale: 1.0 }

  return (
    <motion.button
      ref={setRef}
      onClick={onToggle}
      disabled={isMitigated}
      style={cardStyle}
      initial={false}
      animate={animateTo}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileHover={isMitigated ? undefined : { scale: isSelected ? 1.025 : 1.012 }}
    >
      <AnimatePresence>
        {isMitigated && (
          <motion.div
            key="mit-overlay"
            style={s.mitigatedOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ShieldIcon />
            <span style={s.mitigatedLabel}>Mitigated</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={s.nodeTopRow}>
        <span style={s.nodeMitre}>{node.mitre}</span>
      </div>
      <div style={s.nodeLabel}>{node.label}</div>
      <AnimatePresence>
        {isSelected && node.description && (
          <motion.div
            key="desc"
            style={s.nodeDescription}
            initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8, paddingTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {node.description}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
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
    // v25.7.0.2.2: bumped from 10 -> 24 to give the SVG edge layer
    // room to render visible bezier curves between columns. Without
    // this gap the edges crowd into the card borders.
    gap: 24,
  },
  edgeSvg: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'visible',
  },
  column: {
    display: 'flex', flexDirection: 'column', gap: 8,
    minWidth: 0,
    // Lift the column above the SVG so cards remain clickable.
    position: 'relative', zIndex: 1,
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
    border: '1px dashed var(--success)',
    cursor: 'not-allowed',
  },

  mitigatedOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
    gap: 4,
    // v25.7.0.2.2: was rgba(0,0,0,0.04) — far too transparent, the
    // underlying node label and badge bled through and made the card
    // look broken rather than disabled. Use the success-bg token so it
    // adapts to light/dark themes, and at high enough alpha to actually
    // hide what's underneath. Backdrop-filter blur is a fallback for
    // browsers that ignore the alpha (rare, but cheap to add).
    background: 'var(--success-bg)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
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
