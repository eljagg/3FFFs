import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────
   KillChainGrid — v25.7.0.2.2 polish pass (ISS-023)

   Changes from v25.7.0.2:
     - Mitigated overlay is now opaque and actually covers the underlying
       label/badge. Shield + label are the only thing visible on a mitigated
       card. This was the single biggest "feels static" complaint — the
       mitigation was happening but the user could barely see it because
       the rgba(0,0,0,0.04) overlay was effectively transparent.
     - framer-motion transitions on shield-in (mitigation), shield-out
       (de-mitigation), defense-active badge, hint expansion, and
       node-description disclosure. Cheap motion, big perceived liveliness.
     - Visible SVG edges between connected nodes. The edge data has been
       in config.edges since v25.7.0.2 but wasn't drawn. Without edges, a
       "kill chain" reads as three disconnected columns — the user has to
       infer the relationships. Edges fix that. Highlighted on selection,
       dimmed when either endpoint is mitigated, dashed when broken.
     - Hover state on un-mitigated cards (subtle elevation).

   Behaviour preserved:
     - Click-to-trace path highlighting
     - Defense-toggle as falsifiability hook
     - onEvent contract — wrapper handles telemetry dispatch
     - All CSS variables, no Tailwind, inline SVG icons
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

  const nodesByPhase = useMemo(() => {
    const buckets = phases.map(() => [])
    nodes.forEach(n => {
      const idx = typeof n.phase === 'number' ? n.phase : 0
      if (buckets[idx]) buckets[idx].push(n)
    })
    return buckets
  }, [phases, nodes])

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

  const mitigatedNodeIds = useMemo(() => {
    const set = new Set()
    activeDefenseIds.forEach(defId => {
      const def = defenses.find(d => d.id === defId)
      if (!def) return
      ;(def.mitigates || []).forEach(nodeId => set.add(nodeId))
    })
    return set
  }, [activeDefenseIds, defenses])

  // null sentinel = no selection, everyone is bright
  const highlightedNodeIds = useMemo(() => {
    if (!activeNodeId) return null
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

  const selectedNode = activeNodeId ? nodes.find(n => n.id === activeNodeId) : null

  // ──────────────────────────────────────────────────────────────────────
  // Edge rendering plumbing
  //
  // We compute node-center coordinates from the live DOM after layout, so
  // edges follow actual rendered positions regardless of label length or
  // viewport width. ResizeObserver re-runs on container resize.
  // The SVG sits behind the nodes (zIndex 0) and is pointer-events: none
  // so it never intercepts clicks.
  // ──────────────────────────────────────────────────────────────────────
  const containerRef = useRef(null)
  const nodeRefs = useRef({})
  const [edgeGeometry, setEdgeGeometry] = useState({ width: 0, height: 0, lines: [] })

  const setNodeRef = (nodeId) => (el) => {
    if (el) nodeRefs.current[nodeId] = el
    else delete nodeRefs.current[nodeId]
  }

  useLayoutEffect(() => {
    if (!containerRef.current) return

    function recompute() {
      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const lines = []

      for (const edge of edges) {
        const fromEl = nodeRefs.current[edge.from]
        const toEl   = nodeRefs.current[edge.to]
        if (!fromEl || !toEl) continue

        const fromRect = fromEl.getBoundingClientRect()
        const toRect   = toEl.getBoundingClientRect()

        // Source: right edge, vertically centered.
        // Target: left edge, vertically centered.
        // Container-relative coordinates.
        const x1 = fromRect.right - containerRect.left
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
        const x2 = toRect.left - containerRect.left
        const y2 = toRect.top + toRect.height / 2 - containerRect.top

        lines.push({ id: `${edge.from}-${edge.to}`, from: edge.from, to: edge.to, x1, y1, x2, y2 })
      }

      setEdgeGeometry({
        width: containerRect.width,
        height: containerRect.height,
        lines,
      })
    }

    recompute()

    const ro = new ResizeObserver(recompute)
    ro.observe(containerRef.current)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [edges, nodes, mitigatedNodeIds, activeNodeId])

  // ──────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <div style={s.instructionRow}>
        <span style={s.instructionText}>
          {selectedNode
            ? <>Tracing path from <strong style={{ color: 'var(--accent)' }}>{selectedNode.label}</strong>. Click again to clear.</>
            : <>Click any node to trace the attack path. Toggle defenses below to break the chain.</>
          }
        </span>
        <AnimatePresence>
          {activeDefenseIds.size > 0 && (
            <motion.span
              key="def-badge"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              style={s.activeDefBadge}
            >
              {activeDefenseIds.size} defense{activeDefenseIds.size === 1 ? '' : 's'} active
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Phase columns + edge overlay */}
      <div ref={containerRef} style={s.columnGridContainer}>
        <svg
          style={s.edgeSvg}
          width={edgeGeometry.width}
          height={edgeGeometry.height}
        >
          {edgeGeometry.lines.map(line => {
            const fromMitigated = mitigatedNodeIds.has(line.from)
            const toMitigated   = mitigatedNodeIds.has(line.to)
            const eitherMitigated = fromMitigated || toMitigated

            // Highlighted only when both endpoints are part of the active
            // selection's parent/child set.
            const highlighted = !!(
              highlightedNodeIds &&
              highlightedNodeIds.has(line.from) &&
              highlightedNodeIds.has(line.to)
            )

            const dim = (highlightedNodeIds && !highlighted) || eitherMitigated

            // Bezier curves bend through the gap between columns rather
            // than through node bodies. Horizontal control points pulled
            // halfway across produce a smooth S-curve.
            const dx = line.x2 - line.x1
            const cp1x = line.x1 + dx * 0.5
            const cp1y = line.y1
            const cp2x = line.x1 + dx * 0.5
            const cp2y = line.y2

            return (
              <path
                key={line.id}
                d={`M ${line.x1} ${line.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke={highlighted ? 'var(--accent)' : 'var(--rule-strong)'}
                strokeWidth={highlighted ? 2 : 1}
                strokeDasharray={eitherMitigated ? '4 4' : 'none'}
                style={{
                  opacity: dim ? 0.18 : (highlighted ? 0.95 : 0.42),
                  transition: 'opacity 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease',
                }}
              />
            )
          })}
        </svg>

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
                    nodeRef={setNodeRef(node.id)}
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
      </div>

      {/* Defense panel */}
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

        <AnimatePresence>
          {activeDefenseIds.size > 0 && (
            <motion.div
              key="def-hints"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={s.defenseHints}
            >
              {defenses
                .filter(d => activeDefenseIds.has(d.id))
                .map(d => (
                  <div key={d.id} style={s.defenseHint}>
                    <span style={s.defenseHintLabel}>{d.label}:</span>{' '}
                    <span style={s.defenseHintText}>{d.hint}</span>
                  </div>
                ))
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {illustrativeNote && (
        <div style={s.illustrativeNote}>{illustrativeNote}</div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// NodeCard
// ────────────────────────────────────────────────────────────────────────
function NodeCard({ node, nodeRef, isSelected, isHighlighted, isMitigated, onToggle }) {
  const [hover, setHover] = useState(false)

  // State precedence: mitigated > selected > highlighted > dimmed
  let cardStyle = { ...s.nodeCard }
  if (isMitigated) {
    cardStyle = { ...cardStyle, ...s.nodeCardMitigated }
  } else if (isSelected) {
    cardStyle = { ...cardStyle, ...s.nodeCardSelected }
  } else if (isHighlighted) {
    cardStyle = { ...cardStyle, ...s.nodeCardHighlighted }
    if (hover) cardStyle = { ...cardStyle, ...s.nodeCardHover }
  } else {
    cardStyle = { ...cardStyle, ...s.nodeCardDimmed }
  }

  return (
    <button
      ref={nodeRef}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={isMitigated}
      style={cardStyle}
    >
      {/* Underlying node content. When mitigated, the overlay below sits
          on top of this and fully covers it. */}
      <div style={s.nodeContent}>
        <div style={s.nodeTopRow}>
          <span style={s.nodeMitre}>{node.mitre}</span>
        </div>
        <div style={s.nodeLabel}>{node.label}</div>
        <AnimatePresence>
          {isSelected && node.description && (
            <motion.div
              key="desc"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={s.nodeDescriptionWrap}
            >
              <div style={s.nodeDescription}>{node.description}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mitigated overlay — OPAQUE, fully covers underlying content.
          The fix from v25.7.0.2's bug. */}
      <AnimatePresence>
        {isMitigated && (
          <motion.div
            key="mit-overlay"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.22 }}
            style={s.mitigatedOverlay}
          >
            <ShieldIcon />
            <span style={s.mitigatedLabel}>Mitigated</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
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
// Styles
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
    minHeight: 24,
  },
  instructionText: { lineHeight: 1.5 },
  activeDefBadge: {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    padding: '3px 8px',
    background: 'var(--success-bg)', color: 'var(--success)',
    border: '1px solid var(--success)',
    borderRadius: 3,
  },

  columnGridContainer: {
    position: 'relative',
    width: '100%',
  },
  edgeSvg: {
    position: 'absolute', top: 0, left: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'visible',
  },
  columnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 18,
    position: 'relative',
    zIndex: 1,
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
    display: 'flex', flexDirection: 'column', gap: 10,
  },

  // Node card — base. Padding moves to nodeContent so the overlay can
  // sit at the card edge without being inset by the padding.
  nodeCard: {
    position: 'relative',
    width: '100%', textAlign: 'left',
    padding: 0,
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
    overflow: 'hidden',
  },
  nodeContent: {
    padding: '10px 12px',
    position: 'relative',
    zIndex: 0,
  },
  nodeCardHighlighted: {
    background: 'var(--paper)',
    border: '1px solid var(--rule)',
  },
  nodeCardHover: {
    transform: 'translateY(-1px)',
    borderColor: 'var(--rule-strong)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
    border: '1px solid var(--success)',
    cursor: 'not-allowed',
  },

  // OPAQUE — fully covers nodeContent. This is the bug fix.
  mitigatedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'var(--success-bg)',
    color: 'var(--success)',
    zIndex: 2,
  },
  mitigatedLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.12em',
    fontWeight: 700,
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
  nodeDescriptionWrap: { overflow: 'hidden' },
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
    transition: 'all 0.18s ease',
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
    transition: 'all 0.18s ease',
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
    overflow: 'hidden',
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
