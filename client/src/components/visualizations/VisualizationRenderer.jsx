import { useEffect, useRef } from 'react'
import { api } from '../../lib/api.js'
import KillChainGrid from './KillChainGrid.jsx'
// v25.7.0.3 (FA0001): Positioning timeline — F3-unique tactic visualization.
// Scenario-aware: when rendered with a scenarioId, picks the matching example
// from config.examples; falls back to the first example otherwise.
import PositioningTimeline from './PositioningTimeline.jsx'

/* ─────────────────────────────────────────────────────────────────────────
   VisualizationRenderer — v25.7.0.2 (ISS-023)

   Dispatches a visualization to its component implementation based on the
   `kind` field. Wraps every viz with a uniform contract:

     - It receives `viz` (the registry entry incl. config) and `effectiveRole`
     - It auto-emits a `viz_opened` telemetry event the first time it
       renders for the user
     - It passes an `onEvent` callback into the inner component, which the
       inner component is expected to call on meaningful interactions
     - The inner component never talks to the API directly — telemetry is
       the wrapper's job, so adding a new viz kind doesn't require knowing
       the endpoint shape

   Adding a new viz kind:
     1. Create the component (props: viz, effectiveRole, onEvent)
     2. Import it here
     3. Add a case to the switch below
     4. (Optionally) add a server-side seed entry that uses the new kind

   The fire-and-forget telemetry style is deliberate. We don't block render
   on it, we don't surface errors to the user, and we don't retry. If
   telemetry calls fail, that's a server-side observability problem to
   investigate, not a UX issue.
   ───────────────────────────────────────────────────────────────────────── */

export default function VisualizationRenderer({ viz, effectiveRole, scenarioId }) {
  // Track the open-event firing once per (viz id, role) combination so a
  // role-switch on the same page emits a fresh open. The role context
  // matters for any future analytics that ask "do tellers and SOC users
  // engage differently with the same viz."
  const openedRef = useRef(null)
  const openKey = `${viz.id}::${effectiveRole || 'none'}`

  useEffect(() => {
    if (openedRef.current === openKey) return
    openedRef.current = openKey
    api.emitVizEvent(viz.id, 'viz_opened').catch(() => {
      // Telemetry is best-effort. If the call fails (offline, auth lapse,
      // server hiccup), we don't surface that to the user — the
      // visualization itself works without telemetry.
    })
  }, [openKey, viz.id])

  // Audience gate. The :Visualization node carries a roles[] array; the
  // server returns the viz to anyone who fetches, but the client suppresses
  // it for users not in the audience. Doing this client-side keeps the
  // server endpoint role-agnostic (cacheable, simpler) and lets us preview
  // any viz on the /admin/visualizations page regardless of role.
  const inAudience = !viz.roles || viz.roles.length === 0 || viz.roles.includes(effectiveRole)
  if (!inAudience) return null

  // Telemetry callback handed to the inner component.
  const onEvent = (eventType) => {
    api.emitVizEvent(viz.id, eventType).catch(() => {})
  }

  // Dispatch by kind. Unknown kinds render a small dev-mode placeholder
  // so we can tell at a glance that a new seed entry references a kind
  // the client doesn't implement yet.
  switch (viz.kind) {
    case 'kill_chain_grid':
      return <KillChainGrid viz={viz} effectiveRole={effectiveRole} onEvent={onEvent} />

    case 'positioning_timeline':
      // v25.7.0.3: F3-unique Positioning tactic. scenarioId is forwarded so
      // the timeline can pick the matching example when rendered inside a
      // scenario page; on the Framework page (no scenarioId), it defaults
      // to the first example.
      return <PositioningTimeline viz={viz} effectiveRole={effectiveRole} onEvent={onEvent} scenarioId={scenarioId} />

    default:
      return <UnknownKindPlaceholder viz={viz} />
  }
}

function UnknownKindPlaceholder({ viz }) {
  return (
    <div style={{
      padding: 16,
      background: 'var(--paper-dim)',
      border: '1px dashed var(--rule-strong)',
      borderRadius: 'var(--radius)',
      fontSize: 13,
      color: 'var(--ink-faint)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--warning)', marginBottom: 6,
      }}>
        Visualization not implemented
      </div>
      <div>
        <code>{viz.id}</code> declares kind <code>{viz.kind}</code>, but the
        client doesn't have a renderer registered for that kind. Add one in
        <code> VisualizationRenderer.jsx</code>.
      </div>
    </div>
  )
}
