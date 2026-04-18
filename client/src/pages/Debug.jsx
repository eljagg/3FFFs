import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Admin debug page — shows the real state of the graph and the current
 * user's progress. Use this to diagnose "why is my progress not saving"
 * and similar persistence questions.
 */
export default function Debug() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setState(await api.debugGraphState())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function resetProgress() {
    if (!confirm('Delete ALL your progress (completions, attempts, quiz answers)? This only affects your user.')) return
    try {
      await api.debugResetMyProgress()
      alert('Progress reset. Reloading state.')
      load()
    } catch (e) { alert('Reset failed: ' + e.message) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <PageShell><Loading /></PageShell>
  if (error)   return <PageShell><Err err={error} /></PageShell>
  if (!state)  return null

  return (
    <PageShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
            Admin Debug · Graph State
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            What's really in the graph.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={btnSecondary}>↻ Refresh</button>
          <button onClick={resetProgress} style={btnDanger}>Reset my progress</button>
        </div>
      </div>

      <Section title="Me">
        <KV k="User ID" v={state.me.id} />
        <KV k="Email"   v={state.me.email || '(not set)'} />
        <KV k="Name"    v={state.me.name || '(not set)'} />
        <KV k="Roles"   v={(state.me.roles || []).join(', ') || '(none)'} />
      </Section>

      <Section title="Node counts">
        {state.counts.map(c => <KV key={c.label} k={c.label} v={c.count} />)}
      </Section>

      <Section title={`My saved progress ${state.myProgress ? '✓' : '— USER NODE MISSING'}`}>
        {!state.myProgress ? (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>
            Your User node doesn't exist in Neo4j. This is the root cause of "progress not saving" —
            writes target a node that doesn't exist.
          </div>
        ) : (
          <>
            <KV k="Scenarios completed" v={state.myProgress.completedScenarios?.filter(x => x.scenarioId).length || 0} />
            <KV k="Stage attempts recorded" v={state.myAttempts.length} />
            <KV k="First seen" v={fmtTime(state.myProgress.firstSeenAt)} />
            <KV k="Last seen"  v={fmtTime(state.myProgress.lastSeenAt)} />
            {state.myProgress.completedScenarios?.filter(x => x.scenarioId).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={smallLabel}>Completed scenarios</div>
                {state.myProgress.completedScenarios.filter(x => x.scenarioId).map(c => (
                  <div key={c.scenarioId} style={{ fontSize: 12, padding: '4px 0' }}>
                    • <strong>{c.title}</strong> — {fmtTime(c.completedAt)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      <Section title={`Scenarios in graph (${state.scenarios.length})`}>
        {state.scenarios.map(s => (
          <details key={s.id} style={{ marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', padding: '6px 0', fontSize: 13 }}>
              <strong>{s.id}</strong> — {s.title} · {s.stages.filter(x => x.stageId).length} stages
            </summary>
            <div style={{ paddingLeft: 18, fontSize: 12, color: 'var(--ink-soft)' }}>
              {s.stages.filter(x => x.stageId).map((st, i) => (
                <div key={i} style={{ padding: '3px 0', fontFamily: 'var(--font-mono)' }}>
                  {st.stageId || '(NO ID!)'} · order={st.order} · type={st.type || '(null)'} · {st.heading}
                </div>
              ))}
            </div>
          </details>
        ))}
      </Section>

      <Section title={`Recent stage attempts by me (${state.myAttempts.length})`}>
        {state.myAttempts.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
            No attempts recorded. This is the problem — clicking options should be writing (User)-[:ATTEMPTED_STAGE]-(Stage) edges.
          </div>
        ) : (
          state.myAttempts.map((a, i) => (
            <div key={i} style={{ fontSize: 12, padding: '3px 0', fontFamily: 'var(--font-mono)' }}>
              {fmtTime(a.answeredAt)} · {a.stageId} · opt={a.optionIndex} · {a.correct ? '✓ correct' : '✕ wrong'} · {a.heading}
            </div>
          ))
        )}
      </Section>

      <Section title={`Users in graph (${state.recentUsers.length})`}>
        {state.recentUsers.map(u => (
          <div key={u.id} style={{ fontSize: 12, padding: '4px 0', fontFamily: 'var(--font-mono)' }}>
            {u.id === state.me.id ? '★ ' : '  '}{u.email || '(no email)'} · {u.name || '(no name)'} · roles={(u.roles || []).join(',')} · seen {fmtTime(u.lastSeenAt)}
          </div>
        ))}
      </Section>
    </PageShell>
  )
}

const smallLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-faint)', marginBottom: 6,
}

const btnSecondary = {
  padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'transparent', border: '1px solid var(--rule-strong)',
  borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--ink-soft)',
}

const btnDanger = {
  padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'var(--danger)', border: 'none',
  borderRadius: 'var(--radius)', cursor: 'pointer', color: '#fff',
}

function PageShell({ children }) {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px 80px' }}>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 16,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 14,
      }}>{title}</div>
      {children}
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16,
      fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--rule)',
    }}>
      <div style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{k}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>{String(v)}</div>
    </div>
  )
}

function fmtTime(ts) {
  if (!ts) return '(never)'
  const n = Number(ts)
  if (!n) return String(ts)
  return new Date(n).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function Loading() {
  return <div style={{ padding: 40, color: 'var(--ink-faint)', textAlign: 'center' }}>Loading graph state…</div>
}

function Err({ err }) {
  return (
    <div style={{ padding: 40, color: 'var(--danger)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', marginBottom: 12 }}>Error:</div>
      <div style={{ fontSize: 13 }}>{err}</div>
    </div>
  )
}
