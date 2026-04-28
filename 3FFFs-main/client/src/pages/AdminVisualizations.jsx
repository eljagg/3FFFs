import { useEffect, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser, ROLES } from '../lib/user.jsx'
import { VisualizationRenderer } from '../components/visualizations/index.js'

/* ─────────────────────────────────────────────────────────────────────────
   AdminVisualizations — v25.7.0.2 (ISS-023)

   Internal preview for the visualization registry. Lists every registered
   :Visualization with its metadata, then renders each one in isolation
   against the production graph.

   Why this page exists:
     - Iterating a viz component while embedded in Framework.jsx requires
       expanding the right tactic row each reload — slow and irritating.
     - It gives us a single place to verify role-conditional behaviour by
       overriding the effective role within the page (independent of the
       global role pill).
     - Future viz kinds that aren't ready for real attachment can be
       previewed here without polluting the production registry — just
       seed them with no attachedTo edge.

   Admin-only — wired up in App.jsx behind <AdminRoute>.
   ───────────────────────────────────────────────────────────────────────── */

export default function AdminVisualizations() {
  const { effectiveRole } = useUser()
  const [vizList, setVizList] = useState(null)
  const [error, setError] = useState(null)
  // Per-viz role override. null = use the global effective role.
  const [roleOverride, setRoleOverride] = useState({})

  useEffect(() => {
    api.listVisualizations()
      .then(d => setVizList(d.visualizations || []))
      .catch(e => setError(e.message))
  }, [])

  if (error) {
    return <Page eyebrow="Admin" title="Visualizations" lede={`Error: ${error}`} />
  }
  if (vizList === null) {
    return <Page><div style={{ padding: 40, color: 'var(--ink-faint)' }}>Loading registry…</div></Page>
  }

  return (
    <Page
      eyebrow="Admin · Internal"
      title="Visualization registry"
      lede={`${vizList.length} visualization${vizList.length === 1 ? '' : 's'} registered. Click into any to preview against the live graph. Role override per-viz lets you check audience gating without changing your global role.`}
    >
      {vizList.length === 0 && (
        <div style={s.emptyState}>
          No :Visualization nodes in the graph. Run <code>npm run migrate:visualizations</code> in the server to seed the registry.
        </div>
      )}

      <div style={s.list}>
        {vizList.map(viz => {
          const previewRole = roleOverride[viz.id] !== undefined
            ? roleOverride[viz.id]
            : effectiveRole

          return (
            <section key={viz.id} style={s.card}>
              {/* Metadata strip */}
              <div style={s.metaStrip}>
                <div style={s.metaLeft}>
                  <span style={s.vizId}>{viz.id}</span>
                  <span style={s.vizKind}>{viz.kind}</span>
                </div>
                <div style={s.metaRight}>
                  {viz.attachedTo
                    ? <span style={s.attachBadge}>{viz.attachedTo.type}: {viz.attachedTo.id}</span>
                    : <span style={s.orphanBadge}>orphan (no attachment)</span>
                  }
                </div>
              </div>

              {/* Title + subtitle */}
              <div style={s.titleBlock}>
                <h2 style={s.title}>{viz.title}</h2>
                {viz.subtitle && <div style={s.subtitle}>{viz.subtitle}</div>}
              </div>

              {/* Audience + role-override controls */}
              <div style={s.controlsRow}>
                <div style={s.audienceBlock}>
                  <span style={s.controlLabel}>Audience:</span>
                  <span style={s.audienceList}>
                    {(viz.roles || []).length === 0
                      ? <em>all roles</em>
                      : viz.roles.map(r => <span key={r} style={s.rolePill}>{r}</span>)
                    }
                  </span>
                </div>

                <div style={s.overrideBlock}>
                  <span style={s.controlLabel}>Preview as:</span>
                  <select
                    value={previewRole || ''}
                    onChange={(e) => setRoleOverride(prev => ({
                      ...prev,
                      [viz.id]: e.target.value || null,
                    }))}
                    style={s.roleSelect}
                  >
                    <option value="">(none — viz hidden)</option>
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* The viz itself */}
              <div style={s.vizFrame}>
                <VisualizationRenderer viz={viz} effectiveRole={previewRole} />
                {!previewRole && (
                  <div style={s.suppressedNote}>
                    Preview hidden — pick a role above. (In production, no role means no render.)
                  </div>
                )}
                {previewRole && viz.roles && viz.roles.length > 0 && !viz.roles.includes(previewRole) && (
                  <div style={s.suppressedNote}>
                    Audience-gated: <strong>{previewRole}</strong> is not in this viz's audience{' '}
                    [{viz.roles.join(', ')}]. The renderer suppresses output for this role.
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Page>
  )
}

const s = {
  emptyState: {
    padding: 40, textAlign: 'center',
    background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
    borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 24,
  },
  card: {
    padding: 24,
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius-lg)',
  },
  metaStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 12, marginBottom: 12,
    borderBottom: '1px solid var(--rule)',
  },
  metaLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  metaRight: {},
  vizId: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--ink-faint)', letterSpacing: '0.06em',
  },
  vizKind: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    padding: '2px 8px',
    background: 'var(--accent)', color: 'var(--paper)',
    borderRadius: 3,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  attachBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    padding: '3px 9px',
    background: 'var(--paper-dim)', color: 'var(--ink-soft)',
    border: '1px solid var(--rule)',
    borderRadius: 3,
  },
  orphanBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    padding: '3px 9px',
    background: 'var(--warning-bg)', color: 'var(--warning)',
    border: '1px solid var(--warning)',
    borderRadius: 3,
  },
  titleBlock: { marginBottom: 16 },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
    color: 'var(--ink)', margin: 0, marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 },
  controlsRow: {
    display: 'flex', flexWrap: 'wrap', gap: 24,
    paddingBottom: 16, marginBottom: 16,
    borderBottom: '1px solid var(--rule)',
    fontSize: 12.5,
  },
  audienceBlock: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  overrideBlock: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  controlLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--ink-faint)',
  },
  audienceList: {
    display: 'inline-flex', gap: 4, alignItems: 'center',
  },
  rolePill: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    padding: '2px 7px',
    background: 'var(--paper)',
    border: '1px solid var(--rule-strong)',
    borderRadius: 3,
    color: 'var(--ink-soft)',
  },
  roleSelect: {
    fontFamily: 'var(--font-body)', fontSize: 13,
    padding: '4px 8px',
    background: 'var(--paper)',
    border: '1px solid var(--rule-strong)',
    borderRadius: 4,
    color: 'var(--ink)',
  },
  vizFrame: {
    padding: '4px 0',
  },
  suppressedNote: {
    marginTop: 12, padding: '10px 14px',
    background: 'var(--paper-dim)',
    border: '1px dashed var(--rule)',
    borderRadius: 'var(--radius)',
    fontSize: 12, fontStyle: 'italic',
    color: 'var(--ink-faint)',
  },
}
