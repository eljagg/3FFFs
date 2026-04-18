import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

/**
 * Bulletproof diagnostic page.
 *
 * Design principle: trust nothing. Catch everything. Always display something
 * useful — even if the server is down, the route is 404, the auth token is
 * expired, or the response shape is unexpected.
 *
 * Two request modes:
 *  1. Primary:  /api/progress/debug-state   (routed where the client expects)
 *  2. Fallback: /api/debug/graph-state      (original location from v8)
 *
 * If BOTH fail, we show you the raw HTTP response text so you can diagnose
 * what is happening without my help.
 */
export default function Debug() {
  const { getAccessTokenSilently } = useAuth0()
  const [state, setState] = useState(null)
  const [rawError, setRawError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attemptLog, setAttemptLog] = useState([])

  async function tryEndpoint(path, token) {
    const base = import.meta.env.VITE_API_URL || ''
    const url = base + path
    const log = { path, url, status: null, contentType: null, body: null, error: null }
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      })
      log.status = res.status
      log.contentType = res.headers.get('content-type') || '(none)'
      const text = await res.text()
      // Try JSON first, fall back to raw text
      try {
        log.body = JSON.parse(text)
        log.isJson = true
      } catch {
        log.body = text.slice(0, 2000) // cap at 2KB
        log.isJson = false
      }
      log.ok = res.ok
    } catch (e) {
      log.error = e.message || String(e)
    }
    return log
  }

  async function load() {
    setLoading(true)
    setRawError(null)
    setState(null)
    const logs = []
    try {
      const token = await getAccessTokenSilently()
      logs.push({ path: '(auth)', status: 'ok', body: 'token acquired: ' + token.slice(0, 20) + '…' })

      // Attempt 1: the new inlined-in-index.js route (v14)
      const primary = await tryEndpoint('/api/debug-state', token)
      logs.push(primary)
      if (primary.ok && primary.isJson) {
        setState(primary.body)
        setAttemptLog(logs)
        return
      }

      // Attempt 2: fallback to the v12 progress sub-route
      const fallback = await tryEndpoint('/api/progress/debug-state', token)
      logs.push(fallback)
      if (fallback.ok && fallback.isJson) {
        setState(fallback.body)
        setAttemptLog(logs)
        return
      }

      // Attempt 3: fallback to the v8 original debug route
      const fallback2 = await tryEndpoint('/api/debug/graph-state', token)
      logs.push(fallback2)
      if (fallback2.ok && fallback2.isJson) {
        setState(fallback2.body)
        setAttemptLog(logs)
        return
      }

      // Attempt 4: plain /api/me as a sanity check that ANY authed request works
      const me = await tryEndpoint('/api/me', token)
      logs.push(me)

      setAttemptLog(logs)
      setRawError('No debug endpoint succeeded. See attempt log below.')
    } catch (e) {
      logs.push({ path: '(token)', error: e.message || String(e) })
      setAttemptLog(logs)
      setRawError('Could not acquire auth token: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  async function resetProgress() {
    if (!confirm('Delete ALL your progress relationships? The scenarios themselves are not affected.')) return
    try {
      const token = await getAccessTokenSilently()
      const base = import.meta.env.VITE_API_URL || ''
      const paths = ['/api/debug-reset', '/api/progress/reset-my-progress', '/api/debug/reset-my-progress']
      let ok = false
      for (const p of paths) {
        try {
          const res = await fetch(base + p, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
          })
          if (res.ok) { ok = true; break }
        } catch {}
      }
      alert(ok ? 'Progress reset. Reloading.' : 'Reset failed on all paths.')
      if (ok) load()
    } catch (e) {
      alert('Reset error: ' + (e.message || e))
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Shell>
      <Header onReload={load} onReset={resetProgress} />

      {loading && <Muted>Loading diagnostic data…</Muted>}

      {rawError && (
        <Section title="Error">
          <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{rawError}</div>
          <AttemptLog logs={attemptLog} />
        </Section>
      )}

      {state && <StateView state={state} />}

      {attemptLog.length > 0 && !rawError && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
            Show request log ({attemptLog.length} attempts)
          </summary>
          <div style={{ marginTop: 12 }}>
            <AttemptLog logs={attemptLog} />
          </div>
        </details>
      )}
    </Shell>
  )
}

// ============================================================================
// Rendering components
// ============================================================================

function Shell({ children }) {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 28px 80px' }}>
      {children}
    </div>
  )
}

function Header({ onReload, onReset }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 24, flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <div style={eyebrow}>Admin · Diagnostic</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500,
          lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>What is really in the graph.</h1>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onReload} style={btn}>Reload</button>
        <button onClick={onReset}  style={btnDanger}>Reset my progress</button>
      </div>
    </div>
  )
}

function StateView({ state }) {
  // Everything is guarded — missing fields render as "(none)" rather than crash
  const me             = state?.me            || {}
  const counts         = Array.isArray(state?.counts) ? state.counts : []
  const scenarios      = Array.isArray(state?.scenarios) ? state.scenarios : []
  const myProgress     = state?.myProgress || null
  const myAttempts     = Array.isArray(state?.myAttempts) ? state.myAttempts : []
  const recentUsers    = Array.isArray(state?.recentUsers) ? state.recentUsers : []

  const completedCount = (myProgress?.completedScenarios || []).filter(c => c?.scenarioId).length
  const userExists     = !!(myProgress && (myProgress.userId || myProgress.email || myProgress.firstSeenAt))

  return (
    <>
      <Section title="Me (from auth token)">
        <KV k="User ID" v={me.id || '(none)'} />
        <KV k="Email"   v={me.email || '(none)'} />
        <KV k="Name"    v={me.name || '(none)'} />
        <KV k="Roles"   v={Array.isArray(me.roles) && me.roles.length ? me.roles.join(', ') : '(none)'} />
      </Section>

      <Section title={'My saved progress · ' + (userExists ? 'USER EXISTS IN NEO4J' : 'USER NODE MISSING')}>
        {!userExists ? (
          <div style={{ color: 'var(--danger)', fontSize: 13, lineHeight: 1.5 }}>
            Your User node does not exist in Neo4j. That is the root cause — every write
            targets a non-existent node and silently succeeds without creating the relationship.
            The fix is to change <code>MATCH (u:User …)</code> to <code>MERGE (u:User …)</code>
            in submit/complete endpoints.
          </div>
        ) : (
          <>
            <KV k="Scenarios completed" v={completedCount} />
            <KV k="Stage attempts recorded" v={myAttempts.length} />
            <KV k="First seen" v={fmtTime(myProgress.firstSeenAt)} />
            <KV k="Last seen"  v={fmtTime(myProgress.lastSeenAt)} />
            {completedCount > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={subLabel}>Completed scenarios</div>
                {(myProgress.completedScenarios || []).filter(c => c?.scenarioId).map(c => (
                  <div key={c.scenarioId} style={lineItem}>
                    <strong>{c.title || c.scenarioId}</strong> — {fmtTime(c.completedAt)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      <Section title={'Node counts (' + counts.length + ' labels)'}>
        {counts.length === 0 ? <Muted>No counts returned.</Muted> :
          counts.map((c, i) => <KV key={i} k={c.label || '(null)'} v={c.count ?? '?'} />)
        }
      </Section>

      <Section title={'Scenarios in graph (' + scenarios.length + ')'}>
        {scenarios.length === 0 ? <Muted>No scenarios found.</Muted> :
          scenarios.map(s => {
            const validStages = (s.stages || []).filter(st => st?.stageId)
            return (
              <details key={s.id || s.title} style={{ marginBottom: 10 }}>
                <summary style={summary}>
                  <strong>{s.id}</strong> — {s.title} · {validStages.length} stages
                </summary>
                <div style={{ paddingLeft: 18, fontSize: 12, color: 'var(--ink-soft)' }}>
                  {validStages.map((st, i) => (
                    <div key={i} style={monoLine}>
                      {st.stageId || '(NO ID)'} · order={st.order ?? '?'} · type={st.type || '(null)'} · {st.heading || ''}
                    </div>
                  ))}
                </div>
              </details>
            )
          })
        }
      </Section>

      <Section title={'Recent stage attempts by me (' + myAttempts.length + ')'}>
        {myAttempts.length === 0 ? (
          <Muted>
            No attempts recorded. If you have clicked option buttons in scenarios, the submit writes
            are failing silently. Check server logs for errors on POST /api/scenarios/:id/submit.
          </Muted>
        ) : (
          myAttempts.map((a, i) => (
            <div key={i} style={monoLine}>
              {fmtTime(a.answeredAt)} · {a.stageId} · opt={a.optionIndex} ·
              {' '}{a.correct ? 'correct' : 'wrong'} · {a.heading || ''}
            </div>
          ))
        )}
      </Section>

      <Section title={'All users in graph (' + recentUsers.length + ')'}>
        {recentUsers.length === 0 ? <Muted>No users found.</Muted> :
          recentUsers.map(u => (
            <div key={u.id} style={monoLine}>
              {u.id === me.id ? '→ ' : '  '}{u.email || '(no email)'} · {u.name || '(no name)'} ·
              {' '}roles=[{Array.isArray(u.roles) ? u.roles.join(',') : ''}] · seen {fmtTime(u.lastSeenAt)}
            </div>
          ))
        }
      </Section>
    </>
  )
}

function AttemptLog({ logs }) {
  return (
    <div style={{ background: 'var(--paper-dim)', borderRadius: 8, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      {logs.map((l, i) => (
        <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
          <div><strong>{l.path}</strong>  {l.url ? <span style={{ color: 'var(--ink-faint)' }}>→ {l.url}</span> : null}</div>
          {l.status !== undefined && l.status !== null && <div>Status: <strong>{l.status}</strong>  ·  Content-Type: {l.contentType || '—'}</div>}
          {l.error && <div style={{ color: 'var(--danger)' }}>Error: {l.error}</div>}
          {l.body && (
            <pre style={{
              margin: '6px 0 0', padding: 8, background: 'var(--paper)',
              borderRadius: 4, overflow: 'auto', maxHeight: 180, fontSize: 10,
            }}>{typeof l.body === 'object' ? JSON.stringify(l.body, null, 2) : String(l.body)}</pre>
          )}
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: 14,
    }}>
      <div style={eyebrow}>{title}</div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14,
      padding: '4px 0', fontSize: 13,
    }}>
      <div style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{k}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all' }}>{String(v)}</div>
    </div>
  )
}

function Muted({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', padding: '8px 0' }}>{children}</div>
}

function fmtTime(ts) {
  if (!ts && ts !== 0) return '(never)'
  const n = Number(ts)
  if (!Number.isFinite(n) || n <= 0) return String(ts)
  try { return new Date(n).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' }
  catch { return String(ts) }
}

// ============================================================================
// Styles
// ============================================================================

const eyebrow = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--accent)', marginBottom: 6,
}

const subLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-faint)', marginBottom: 6,
}

const monoLine = {
  fontSize: 12, padding: '3px 0', fontFamily: 'var(--font-mono)',
  color: 'var(--ink-soft)',
}

const lineItem = { fontSize: 13, padding: '3px 0', color: 'var(--ink)' }

const summary = { cursor: 'pointer', padding: '4px 0', fontSize: 13 }

const btn = {
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
