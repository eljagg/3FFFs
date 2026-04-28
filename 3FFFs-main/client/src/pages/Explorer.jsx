import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   Interactive F3 Graph Explorer
   -------------------------------------------------------------------------
   Renders the entire F3 knowledge graph as a force-directed visualization.
   Tactics, techniques, sub-techniques, and scenarios are all real nodes.
   Edges are real relationships. The layout is what the graph actually is.

   Data: single fetch to /api/framework/graph → D3 force simulation
------------------------------------------------------------------------- */

// Visual tokens for each node type
const NODE_STYLES = {
  tactic:    { r: 20, color: 'var(--ink)',       labelSize: 13, alwaysLabel: true },
  tacticF3:  { r: 22, color: 'var(--accent)',    labelSize: 13, alwaysLabel: true },
  technique: { r: 5,  color: 'var(--ink-faint)', labelSize: 9,  alwaysLabel: false },
  subtech:   { r: 3,  color: 'var(--ink-faint)', labelSize: 8,  alwaysLabel: false },
  scenario:  { r: 10, color: 'var(--warning)',   labelSize: 11, alwaysLabel: true },
}

export default function Explorer() {
  const svgRef   = useRef(null)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')
  const [focusMode, setFocusMode] = useState('all') // 'all' | 'scenarios' | 'f3-unique'
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })

  // Fetch the graph
  useEffect(() => {
    api.getFrameworkGraph()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Measure SVG container
  useEffect(() => {
    function measure() {
      if (!svgRef.current) return
      const parent = svgRef.current.parentElement
      setDimensions({ w: parent.clientWidth, h: Math.max(parent.clientHeight, 600) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [data])

  // Run the force simulation whenever data or focus changes
  useEffect(() => {
    if (!data || !dimensions.w || !svgRef.current) return

    const { w, h } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Enrich nodes with visual type
    const nodes = data.nodes.map(n => {
      let visualType = n.type
      if (n.type === 'tactic' && n.uniqueToF3) visualType = 'tacticF3'
      if (n.type === 'technique' && n.id.includes('.')) visualType = 'subtech'
      return { ...n, visualType, style: NODE_STYLES[visualType] }
    })

    // Build filtered sets for focus mode
    const scenarioTechIds = new Set(
      data.links.filter(l => l.type === 'USES_TECHNIQUE').map(l => l.target)
    )

    const visibleNodeIds = new Set(nodes.map(n => n.id))
    if (focusMode === 'scenarios') {
      // Keep tactics + scenarios + any technique a scenario uses
      const keep = new Set()
      nodes.forEach(n => {
        if (n.type === 'tactic' || n.type === 'scenario') keep.add(n.id)
        if (n.type === 'technique' && scenarioTechIds.has(n.id)) keep.add(n.id)
      })
      visibleNodeIds.clear()
      keep.forEach(k => visibleNodeIds.add(k))
    } else if (focusMode === 'f3-unique') {
      // Only tactics unique to F3 + their techniques
      const f3Tactics = new Set(nodes.filter(n => n.type === 'tactic' && n.uniqueToF3).map(n => n.id))
      const f3Techs = new Set(nodes.filter(n => n.type === 'technique' && f3Tactics.has(n.tacticId)).map(n => n.id))
      visibleNodeIds.clear()
      f3Tactics.forEach(t => visibleNodeIds.add(t))
      f3Techs.forEach(t => visibleNodeIds.add(t))
    }

    const filteredNodes = nodes.filter(n => visibleNodeIds.has(n.id))
    const filteredLinks = data.links.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target))

    // Clone links because D3 mutates them
    const simNodes = filteredNodes.map(n => ({ ...n }))
    const simLinks = filteredLinks.map(l => ({ ...l }))

    // Create zoom/pan group
    const container = svg.append('g').attr('class', 'viewport')
    const zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => container.attr('transform', event.transform))
    svg.call(zoom)

    // Force simulation
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id(d => d.id)
        .distance(d => {
          if (d.type === 'PART_OF') return 60
          if (d.type === 'SUBTECHNIQUE_OF') return 20
          return 80
        })
        .strength(d => d.type === 'USES_TECHNIQUE' ? 0.3 : 0.8))
      .force('charge', d3.forceManyBody().strength(d => {
        if (d.type === 'tactic') return -800
        if (d.type === 'scenario') return -400
        return -60
      }))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide().radius(d => d.style.r + 4))

    // Render links
    const linkEls = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', d => {
        if (d.type === 'USES_TECHNIQUE') return 'var(--warning)'
        if (d.type === 'SUBTECHNIQUE_OF') return 'var(--rule-strong)'
        return 'var(--rule)'
      })
      .attr('stroke-width', d => d.type === 'USES_TECHNIQUE' ? 1.5 : 0.5)
      .attr('stroke-dasharray', d => d.type === 'SUBTECHNIQUE_OF' ? '3,3' : null)
      .attr('opacity', 0.5)

    // Render nodes
    const nodeGroups = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(drag(simulation))
      .on('click', (_event, d) => {
        setSelected(d)
      })
      .on('mouseenter', function (_event, d) {
        d3.select(this).select('circle')
          .transition().duration(120)
          .attr('r', d.style.r * 1.5)
          .attr('stroke-width', 2)
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).select('circle')
          .transition().duration(120)
          .attr('r', d.style.r)
          .attr('stroke-width', d.type === 'tactic' || d.type === 'scenario' ? 1.5 : 0.5)
      })

    nodeGroups.append('circle')
      .attr('r', d => d.style.r)
      .attr('fill', d => d.style.color)
      .attr('stroke', 'var(--paper)')
      .attr('stroke-width', d => d.type === 'tactic' || d.type === 'scenario' ? 1.5 : 0.5)

    // Only show labels for tactics and scenarios by default (techniques get labeled on hover/select)
    nodeGroups.filter(d => d.style.alwaysLabel)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.style.r + 14)
      .attr('fill', 'var(--ink)')
      .attr('font-family', 'var(--font-mono)')
      .attr('font-size', d => d.style.labelSize)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.05em')
      .style('text-transform', 'uppercase')
      .style('pointer-events', 'none')
      .text(d => d.name)

    // Simulation tick
    simulation.on('tick', () => {
      linkEls
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Let the sim run for a bit then freeze for performance
    simulation.alpha(1).restart()
    setTimeout(() => simulation.alphaTarget(0), 2500)

    return () => simulation.stop()
  }, [data, dimensions, focusMode])

  // Search highlight (separate effect so it doesn't re-run the whole simulation)
  useEffect(() => {
    if (!svgRef.current) return
    const q = search.trim().toLowerCase()
    const svg = d3.select(svgRef.current)
    svg.selectAll('.node').style('opacity', (d) => {
      if (!q) return 1
      const matches = d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
      return matches ? 1 : 0.15
    })
    svg.selectAll('line').style('opacity', q ? 0.08 : 0.5)
  }, [search])

  // Highlight selected + neighbors
  useEffect(() => {
    if (!svgRef.current || !data) return
    const svg = d3.select(svgRef.current)
    if (!selected) {
      svg.selectAll('.node').style('opacity', 1)
      svg.selectAll('line').style('opacity', 0.5)
      return
    }
    const neighborIds = new Set([selected.id])
    data.links.forEach(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      if (src === selected.id) neighborIds.add(tgt)
      if (tgt === selected.id) neighborIds.add(src)
    })
    svg.selectAll('.node').style('opacity', d => neighborIds.has(d.id) ? 1 : 0.15)
    svg.selectAll('line').style('opacity', (d) => {
      const src = typeof d.source === 'object' ? d.source.id : d.source
      const tgt = typeof d.target === 'object' ? d.target.id : d.target
      return (src === selected.id || tgt === selected.id) ? 0.85 : 0.08
    })
  }, [selected, data])

  if (loading) return <FullLoader msg="Loading framework graph…" />
  if (error)   return <FullLoader msg={`Error: ${error}`} />

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 76px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{
        padding: '18px 28px',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper-hi)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 2,
          }}>F3 Graph Explorer</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
            letterSpacing: '-0.01em', lineHeight: 1,
          }}>The framework, as a graph.</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 12px', fontSize: 13,
              background: 'var(--paper)', border: '1px solid var(--rule-strong)',
              borderRadius: 'var(--radius)', outline: 'none', width: 200,
            }}
          />
          <FilterButton active={focusMode === 'all'} onClick={() => setFocusMode('all')}>All</FilterButton>
          <FilterButton active={focusMode === 'scenarios'} onClick={() => setFocusMode('scenarios')}>Attack paths</FilterButton>
          <FilterButton active={focusMode === 'f3-unique'} onClick={() => setFocusMode('f3-unique')}>F3-unique</FilterButton>
        </div>
      </div>

      {/* The graph canvas */}
      <div style={{ position: 'relative', flex: 1, background: 'var(--paper)', overflow: 'hidden' }}>
        <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }} />

        {data && (
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--ink-faint)', letterSpacing: '0.05em',
            background: 'var(--paper-hi)', padding: '8px 12px',
            borderRadius: 'var(--radius)', border: '1px solid var(--rule)',
          }}>
            {data.stats.tactics} tactics · {data.stats.techniques} techniques · {data.stats.scenarios} scenarios · {data.stats.links} connections
            <div style={{ marginTop: 6, opacity: 0.75 }}>Drag nodes · Scroll to zoom · Click for details</div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: 'var(--paper-hi)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-lg)', padding: '14px 18px',
          fontSize: 11, fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em', color: 'var(--ink-soft)',
        }}>
          <LegendDot color="var(--ink)" label="Tactic" big />
          <LegendDot color="var(--accent)" label="F3-unique tactic" big />
          <LegendDot color="var(--ink-faint)" label="Technique" />
          <LegendDot color="var(--warning)" label="Scenario" />
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: 'min(400px, 92vw)',
                background: 'var(--paper-hi)',
                borderLeft: '1px solid var(--rule-strong)',
                padding: '28px 32px',
                overflowY: 'auto',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.12)',
                zIndex: 5,
              }}
            >
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: 'absolute', top: 18, right: 18,
                  width: 32, height: 32, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-faint)', fontSize: 20, lineHeight: 1,
                  border: '1px solid var(--rule)', background: 'transparent', cursor: 'pointer',
                }}
              >×</button>

              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 10,
              }}>
                {selected.type === 'tactic' && (selected.uniqueToF3 ? 'F3-unique Tactic' : 'Tactic')}
                {selected.type === 'technique' && 'Technique'}
                {selected.type === 'scenario' && `${selected.severity} severity scenario`}
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--ink-faint)', marginBottom: 6, letterSpacing: '0.03em',
              }}>{selected.id}</div>

              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
                lineHeight: 1.15, letterSpacing: '-0.015em', marginBottom: 18,
              }}>{selected.name}</div>

              {selected.type === 'tactic' && (
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  This tactic contains {selected.techCount} techniques.
                  {selected.uniqueToF3 && <> Unique to the F3 framework — not found in MITRE ATT&CK.</>}
                </div>
              )}

              {selected.type === 'scenario' && (
                <a
                  href={`#/scenarios/${selected.id}`}
                  style={{
                    display: 'inline-block', marginTop: 14,
                    padding: '11px 18px', background: 'var(--ink)', color: 'var(--paper)',
                    borderRadius: 'var(--radius-lg)', fontSize: 13, textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >Start this scenario →</a>
              )}

              {selected.type === 'technique' && (
                <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                  Click "Attack paths" filter to see which scenarios use this technique.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// D3 drag handler
function drag(simulation) {
  return d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x; d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x; d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      // Leave node pinned where dropped — users can rearrange the graph
      // To release: d.fx = null; d.fy = null
    })
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        border: '1px solid', borderColor: active ? 'var(--ink)' : 'var(--rule)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-soft)',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        transition: 'all var(--dur) ease',
      }}
    >{children}</button>
  )
}

function LegendDot({ color, label, big }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        width: big ? 14 : 8, height: big ? 14 : 8,
        background: color, borderRadius: '50%',
        display: 'inline-block',
      }} />
      <span>{label}</span>
    </div>
  )
}

function FullLoader({ msg }) {
  return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        display: 'inline-block', width: 20, height: 20,
        border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        marginRight: 10, verticalAlign: 'middle',
      }} />
      {msg}
    </div>
  )
}
