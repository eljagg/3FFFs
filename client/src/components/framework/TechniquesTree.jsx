import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'

/* ─────────────────────────────────────────────────────────────────────────
   TechniquesTree — v25.7.0.8

   Two-tier hierarchical techniques grid for the F3 Framework page.
   Replaces the v25.7.0.4.4 flat grid with a parent-card / sub-technique
   structure that reflects the SUBTECHNIQUE_OF relationships in the graph.

   Props:
     tacticId — F3 tactic ID (e.g. 'TA0005', 'FA0001'). The component
                fetches /api/framework/tactics/:tacticId/techniques-tree
                on mount and renders the hierarchy.
     role     — current effective role ('teller' | 'analyst' | 'soc' |
                'executive' | 'all'). Drives the role-gating treatment
                — non-relevant techniques are greyed out with explicit
                "your role doesn't act on this" labeling.
     onTechniqueClick — callback fired when user clicks a technique
                card. Receives the technique ID. Parent should open the
                TechniqueDetailSidebar with that ID.

   Pedagogical insight (OBS-027):
     The current flat grid teaches techniques as a dictionary of
     definitions. This grid teaches them as a NETWORK — parent concepts
     group their specializations (F1008 = Account Manipulation umbrella,
     with .001/.002/.005 as concrete moves), and clicking opens a
     sidebar that shows the cross-references (which scenarios use this
     technique, which beats demonstrate it). The lever this enables:
     training the trainee's reflex to ASK "what's this connected to?"
     rather than just "what does this mean?"

   Behavior:
   - Parents render as cards in a 3-column grid (auto-fill, min 320px)
   - Click a parent with sub-techniques → expands inline to show its
     children as smaller cards
   - Single-child parents (collapseToSingle=true from server) render as
     a single card without expansion — child is conceptually identical
     to parent
   - Atomic parents (no children) render as parent cards with no
     expand affordance, click goes straight to sidebar
   - Role-gating: when role !== 'all', techniques whose `roles` array
     does not include the current role render at reduced opacity with
     a "your role doesn't act on this" label. Still clickable so the
     trainee can read for cross-team awareness.
   ───────────────────────────────────────────────────────────────────── */

export default function TechniquesTree({ tacticId, role, onTechniqueClick }) {
  const [tree, setTree]           = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [expandedParents, setExpandedParents] = useState(() => new Set())

  useEffect(() => {
    if (!tacticId) return
    setLoading(true)
    setError(null)
    api.getTechniquesTree(tacticId)
      .then(d => {
        setTree(d.tree || [])
        setTotalCount(d.totalCount || 0)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Failed to load techniques')
        setLoading(false)
      })
  }, [tacticId])

  const toggleParent = (parentId) => {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

  // Derived: count parent cards vs total techniques for the header
  const parentCount = tree.length
  const hasGating = role && role !== 'all'

  if (loading) {
    return <div style={styles.loading}>Loading techniques…</div>
  }
  if (error) {
    return <div style={styles.error}>Could not load techniques: {error}</div>
  }
  if (tree.length === 0) {
    return <div style={styles.empty}>No techniques currently indexed under this tactic.</div>
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerStrip}>
        <span>
          {parentCount} {parentCount === 1 ? 'technique' : 'techniques'}
          {totalCount > parentCount && (
            <span style={styles.headerSubcount}>
              {' '}· {totalCount} including sub-techniques
            </span>
          )}
        </span>
        {hasGating && (
          <span style={styles.headerRoleHint}>
            Greyed = not primary for your role
          </span>
        )}
      </div>

      <div style={styles.grid}>
        {tree.map(node => (
          <TechniqueParentCard
            key={node.parent.id}
            node={node}
            role={role}
            isExpanded={expandedParents.has(node.parent.id)}
            onToggle={() => toggleParent(node.parent.id)}
            onTechniqueClick={onTechniqueClick}
            hasGating={hasGating}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Subcomponent: parent card ───────────────────────────────────── */
function TechniqueParentCard({ node, role, isExpanded, onToggle, onTechniqueClick, hasGating }) {
  const { parent, subTechniques, isAtomic, collapseToSingle } = node
  const isRelevant = !hasGating || (parent.roles || []).includes(role)
  const expandable = !isAtomic && !collapseToSingle

  // For collapseToSingle, the child IS the meaningful technique — clicking
  // the card should open the child's sidebar, not the parent's
  const effectiveTargetId = collapseToSingle && subTechniques[0]
    ? subTechniques[0].id
    : parent.id
  const effectiveTechName = collapseToSingle && subTechniques[0]
    ? subTechniques[0].name
    : parent.name
  const effectiveDesc = collapseToSingle && subTechniques[0]
    ? subTechniques[0].description
    : parent.description

  const cardStyle = {
    ...styles.parentCard,
    ...(isRelevant ? {} : styles.cardMuted),
  }

  const handleCardClick = () => {
    if (expandable) {
      onToggle()
    } else {
      onTechniqueClick(effectiveTargetId)
    }
  }

  return (
    <div style={styles.parentWrap}>
      <button
        onClick={handleCardClick}
        style={cardStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.background = 'var(--paper)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isRelevant ? 'var(--rule)' : 'var(--rule)'
          e.currentTarget.style.background = 'var(--paper-hi)'
        }}
      >
        <div style={styles.cardHeader}>
          <span style={styles.techId}>{effectiveTargetId}</span>
          {expandable && (
            <span style={styles.subCountBadge}>
              {subTechniques.length} sub
            </span>
          )}
          {isAtomic && !collapseToSingle && (
            <span style={styles.atomicBadge}>atomic</span>
          )}
        </div>
        <div style={styles.techName}>{effectiveTechName}</div>
        {effectiveDesc && (
          <div style={styles.techDesc}>{effectiveDesc}</div>
        )}
        {!isRelevant && (
          <div style={styles.roleHint}>
            Your role doesn't primarily act on this technique
          </div>
        )}
        {expandable && (
          <div style={styles.expandHint}>
            <span style={{
              ...styles.expandChevron,
              transform: isExpanded ? 'rotate(90deg)' : 'none',
            }}>→</span>
            <span>{isExpanded ? 'Hide' : 'Show'} sub-techniques</span>
          </div>
        )}
        {!expandable && (
          <div style={styles.expandHint}>
            <span style={styles.openIcon}>↗</span>
            <span>Open detail</span>
          </div>
        )}
      </button>

      {/* Sub-technique cards — rendered below the parent when expanded */}
      {isExpanded && expandable && (
        <div style={styles.subGrid}>
          {subTechniques.map(sub => {
            const subRelevant = !hasGating || (sub.roles || []).includes(role)
            const subStyle = {
              ...styles.subCard,
              ...(subRelevant ? {} : styles.cardMuted),
            }
            return (
              <button
                key={sub.id}
                onClick={() => onTechniqueClick(sub.id)}
                style={subStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--paper)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--rule)'
                  e.currentTarget.style.background = 'var(--paper-hi)'
                }}
              >
                <div style={styles.subHeader}>
                  <span style={styles.subTechId}>{sub.id}</span>
                </div>
                <div style={styles.subTechName}>{sub.name}</div>
                {sub.description && (
                  <div style={styles.subTechDesc}>{sub.description}</div>
                )}
                {!subRelevant && (
                  <div style={styles.roleHintSmall}>
                    Not primary for your role
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────────────── */
const styles = {
  wrap: { width: '100%' },

  headerStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    marginBottom: 12,
    borderBottom: '1px solid var(--rule)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
  },
  headerSubcount: {
    color: 'var(--ink-faint)',
    opacity: 0.75,
  },
  headerRoleHint: {
    fontStyle: 'italic',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'none',
    color: 'var(--ink-faint)',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 14,
  },

  parentWrap: {
    display: 'contents',
  },

  parentCard: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '16px 18px',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
    font: 'inherit',
    transition: 'all 150ms',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 130,
  },
  cardMuted: {
    opacity: 0.45,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  techId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--ink-faint)',
    letterSpacing: '0.06em',
    fontWeight: 500,
  },
  subCountBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '2px 7px',
    borderRadius: 3,
    fontWeight: 600,
    background: 'rgba(184, 81, 61, 0.15)',
    color: 'var(--accent-hi, #d66e5a)',
  },
  atomicBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '2px 7px',
    borderRadius: 3,
    fontWeight: 600,
    background: 'var(--paper-dim)',
    color: 'var(--ink-faint)',
  },
  techName: {
    fontFamily: 'var(--font-display)',
    fontSize: 17,
    fontWeight: 500,
    lineHeight: 1.25,
    letterSpacing: '-0.005em',
    color: 'var(--ink)',
  },
  techDesc: {
    fontSize: 13.5,
    color: 'var(--ink-soft)',
    lineHeight: 1.5,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  roleHint: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  roleHintSmall: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.08em',
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  expandHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: 'var(--accent)',
    fontWeight: 600,
    marginTop: 6,
    paddingTop: 8,
    borderTop: '1px solid var(--rule)',
  },
  expandChevron: {
    fontSize: 13,
    transition: 'transform 200ms',
    display: 'inline-block',
  },
  openIcon: {
    fontSize: 13,
  },

  subGrid: {
    gridColumn: '1 / -1',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 10,
    padding: '14px 18px',
    background: 'var(--paper-dim)',
    borderRadius: 6,
    marginTop: -4,
    marginBottom: 8,
    border: '1px dashed var(--rule)',
  },
  subCard: {
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    padding: '12px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
    font: 'inherit',
    transition: 'all 150ms',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  subHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  subTechId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--accent)',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  subTechName: {
    fontFamily: 'var(--font-display)',
    fontSize: 14.5,
    fontWeight: 500,
    lineHeight: 1.3,
    color: 'var(--ink)',
  },
  subTechDesc: {
    fontSize: 12.5,
    color: 'var(--ink-soft)',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  loading: {
    padding: 32,
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    padding: 14,
    background: 'rgba(184, 81, 61, 0.08)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    color: 'var(--accent-hi, #d66e5a)',
    fontSize: 13.5,
  },
  empty: {
    padding: 24,
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    fontSize: 13.5,
  },
}
