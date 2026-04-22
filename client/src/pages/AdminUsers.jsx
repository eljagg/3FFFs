import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   Admin Users & Invites — v23
   -------------------------------------------------------------------------
   Two-tab page gated by AdminRoute in App.jsx:

     • Users    — read-only list of every :User node with roll-up stats.
                  Role changes for existing users happen in the Auth0
                  dashboard (Actions + Management API wiring lands in v24).

     • Invites  — list of :Invite nodes + a form to create new ones.
                  Admin picks email, role, expiration (24h / 7d / 30d /
                  never, default 7d), and optional notes. Revoke button
                  flips revokedAt so the invite stops passing the Auth0
                  Action's domain-deny fallback.
------------------------------------------------------------------------- */

const EXPIRATION_OPTIONS = [
  { label: '24 hours',  ms: 24 * 60 * 60 * 1000 },
  { label: '7 days',    ms: 7  * 24 * 60 * 60 * 1000 },   // default
  { label: '30 days',   ms: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Never',     ms: null },
]
const DEFAULT_EXP_INDEX = 1 // 7 days

export default function AdminUsers() {
  const [tab, setTab] = useState('invites')  // Invites is where most action is
  return (
    <Page
      eyebrow="Admin"
      title="Users & invites."
      lede="Review every trainee on the platform and issue invitations to staff outside the standard domain allowlist."
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        {[
          { id: 'invites', label: 'Invites' },
          { id: 'users',   label: 'Users' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setTab(v.id)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 500,
              border: 'none', background: 'transparent',
              color: tab === v.id ? 'var(--ink)' : 'var(--ink-faint)',
              borderBottom: tab === v.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color var(--dur)',
            }}
          >{v.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'invites' && (
          <motion.div key="invites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InvitesTab />
          </motion.div>
        )}
        {tab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UsersTab />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}

/* ======================================================================= */
/* ===  INVITES TAB  ====================================================  */
/* ======================================================================= */

function InvitesTab() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busy, setBusy]       = useState(false)

  // Form state
  const [fEmail, setFEmail]     = useState('')
  const [fRole,  setFRole]      = useState('trainee')
  const [fExp,   setFExp]       = useState(DEFAULT_EXP_INDEX)
  const [fNotes, setFNotes]     = useState('')
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  function reload() {
    setLoading(true)
    api.listInvites()
      .then(r => { setInvites(r.invites || []); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const email = fEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setFormError('Enter a valid email address.')
      return
    }

    setBusy(true)
    try {
      const exp = EXPIRATION_OPTIONS[fExp]
      await api.createInvite({
        email,
        roles:       [fRole],
        expiresInMs: exp.ms,
        notes:       fNotes.trim() || null,
      })
      setFEmail(''); setFNotes(''); setFRole('trainee'); setFExp(DEFAULT_EXP_INDEX)
      setFormSuccess(`Invited ${email} for ${exp.label.toLowerCase()}.`)
      reload()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(invite) {
    if (!confirm(`Revoke invite for ${invite.email}? They will no longer be able to sign in via this invite.`)) return
    try {
      await api.revokeInvite(invite.id)
      reload()
    } catch (e) {
      alert('Revoke failed: ' + e.message)
    }
  }

  const summary = useMemo(() => {
    const s = { total: invites.length, active: 0, consumed: 0, revoked: 0, expired: 0 }
    for (const i of invites) {
      if (i.status === 'active')  s.active++
      if (i.status === 'revoked') s.revoked++
      if (i.status === 'expired') s.expired++
      if (i.consumedAt)           s.consumed++
    }
    return s
  }, [invites])

  return (
    <>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total invites', value: summary.total,    color: 'var(--ink)' },
          { label: 'Active',        value: summary.active,   color: 'var(--success)' },
          { label: 'Consumed',      value: summary.consumed, color: 'var(--accent)' },
          { label: 'Revoked',       value: summary.revoked,  color: 'var(--danger)' },
          { label: 'Expired',       value: summary.expired,  color: 'var(--ink-faint)' },
        ].map(stat => (
          <div key={stat.label} style={statCard(stat.color)}>
            <div style={statValueStyle(stat.color)}>{stat.value}</div>
            <div style={statLabelStyle}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Create-invite form */}
      <div style={{
        background: 'var(--paper-hi)', border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 28,
      }}>
        <div style={sectionEyebrow}>New invite</div>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 0.9fr', gap: 12 }}>
            <Field label="Email">
              <input
                type="email"
                value={fEmail}
                onChange={e => setFEmail(e.target.value)}
                placeholder="reviewer@example.com"
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Role">
              <select value={fRole} onChange={e => setFRole(e.target.value)} style={inputStyle}>
                <option value="trainee">Trainee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Expires">
              <select value={fExp} onChange={e => setFExp(Number(e.target.value))} style={inputStyle}>
                {EXPIRATION_OPTIONS.map((o, i) => (
                  <option key={o.label} value={i}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes (optional)">
            <input
              type="text"
              value={fNotes}
              onChange={e => setFNotes(e.target.value)}
              placeholder="e.g. Security reviewer — Q2 audit"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="submit" disabled={busy} style={btnPrimary}>
              {busy ? 'Creating…' : 'Create invite'}
            </button>
            {formError   && <span style={{ color: 'var(--danger)',  fontSize: 13 }}>{formError}</span>}
            {formSuccess && <span style={{ color: 'var(--success)', fontSize: 13 }}>{formSuccess}</span>}
          </div>
        </form>
      </div>

      {/* Invites table */}
      {loading && <Muted>Loading invites…</Muted>}
      {error   && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      {!loading && !error && (
        invites.length === 0
          ? <EmptyState message="No invites yet. Create one above." />
          : <InvitesTable invites={invites} onRevoke={handleRevoke} />
      )}
    </>
  )
}

function InvitesTable({ invites, onRevoke }) {
  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <HeaderRow columns="2fr 1fr 1fr 1fr 1fr 0.8fr">
        <div>Email</div><div>Role</div><div>Status</div>
        <div>Invited</div><div>Expires</div><div></div>
      </HeaderRow>
      {invites.map((inv, i) => (
        <motion.div
          key={inv.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.04 + i * 0.02 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr',
            gap: 16, padding: '14px 22px', alignItems: 'center',
            borderBottom: i < invites.length - 1 ? '1px solid var(--rule)' : 'none',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{inv.email}</div>
            {inv.notes && (
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{inv.notes}</div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
            {(Array.isArray(inv.roles) ? inv.roles : []).join(', ') || '—'}
          </div>
          <StatusPill status={inv.status} consumed={!!inv.consumedAt} />
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{fmtRelative(inv.invitedAt)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {inv.expiresAt ? fmtDateShort(inv.expiresAt) : 'Never'}
          </div>
          <div style={{ textAlign: 'right' }}>
            {inv.status === 'active'
              ? <button onClick={() => onRevoke(inv)} style={btnDangerSm}>Revoke</button>
              : <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>—</span>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function StatusPill({ status, consumed }) {
  const map = {
    active:  { label: consumed ? 'Active · used' : 'Active', color: 'var(--success)' },
    expired: { label: 'Expired',                              color: 'var(--ink-faint)' },
    revoked: { label: 'Revoked',                              color: 'var(--danger)' },
  }
  const m = map[status] || { label: status || '—', color: 'var(--ink-faint)' }
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 4,
      border: '1px solid', borderColor: m.color, color: m.color,
    }}>{m.label}</span>
  )
}

/* ======================================================================= */
/* ===  USERS TAB  ======================================================  */
/* ======================================================================= */

function UsersTab() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('')

  useEffect(() => {
    api.listUsers()
      .then(r => { setUsers(r.users || []); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.email  || '').toLowerCase().includes(q) ||
      (u.name   || '').toLowerCase().includes(q) ||
      (u.domain || '').toLowerCase().includes(q) ||
      (Array.isArray(u.roles) ? u.roles.join(',').toLowerCase() : '').includes(q)
    )
  }, [users, filter])

  if (loading) return <Muted>Loading users…</Muted>
  if (error)   return <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>

  return (
    <>
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap',
      }}>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by email, name, domain, role…"
          style={{ ...inputStyle, maxWidth: 360 }}
        />
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} of {users.length}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: 'var(--ink-faint)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
        }}>
          Role changes happen in Auth0 dashboard · inline edits land in v24
        </span>
      </div>

      {filtered.length === 0
        ? <EmptyState message="No users match that filter." />
        : <UsersTable users={filtered} />}
    </>
  )
}

function UsersTable({ users }) {
  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <HeaderRow columns="2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr">
        <div>User</div><div>Domain</div><div>Roles</div>
        <div>Scenarios</div><div>Quizzes</div><div>Correct</div><div>Last seen</div>
      </HeaderRow>
      {users.map((u, i) => {
        const roles = Array.isArray(u.roles) ? u.roles : []
        const correctRate = u.quizzesAnswered > 0
          ? Math.round((u.correctAnswers / u.quizzesAnswered) * 100)
          : null
        return (
          <motion.div
            key={u.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.03 + i * 0.015 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr',
              gap: 16, padding: '14px 22px', alignItems: 'center',
              borderBottom: i < users.length - 1 ? '1px solid var(--rule)' : 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                {u.name || (u.email || '').split('@')[0] || '(no name)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{u.email || '—'}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
              {u.domain || '—'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {roles.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>—</span>
                : roles.map(r => (
                    <span key={r} style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '3px 7px', borderRadius: 3,
                      background: r === 'admin' ? 'var(--accent)'
                                : r === 'manager' ? 'var(--ink)'
                                : 'var(--paper-dim)',
                      color: r === 'admin' ? '#fff'
                           : r === 'manager' ? 'var(--paper-hi)'
                           : 'var(--ink-soft)',
                      border: r === 'trainee' ? '1px solid var(--rule-strong)' : 'none',
                    }}>{r}</span>
                  ))
              }
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
              {u.scenariosCompleted || 0}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
              {u.quizzesAnswered || 0}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                          color: correctRate !== null ? 'var(--ink)' : 'var(--ink-faint)' }}>
              {correctRate !== null ? `${correctRate}%` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {fmtRelative(u.lastSeenAt)}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ======================================================================= */
/* ===  Shared bits  ===================================================== */
/* ======================================================================= */

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginBottom: 6,
      }}>{label}</div>
      {children}
    </label>
  )
}

function HeaderRow({ columns, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: columns,
      gap: 16, padding: '12px 22px',
      background: 'var(--paper-dim)',
      borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--ink-faint)',
    }}>
      {children}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
      borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
    }}>{message}</div>
  )
}

function Muted({ children }) {
  return <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{children}</div>
}

function fmtRelative(ts) {
  if (!ts) return '—'
  const diff = Date.now() - Number(ts)
  if (!Number.isFinite(diff)) return '—'
  const h = diff / 3_600_000
  if (h < 1)  return 'just now'
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function fmtDateShort(ts) {
  const n = Number(ts)
  if (!Number.isFinite(n)) return '—'
  try { return new Date(n).toISOString().slice(0, 10) }
  catch { return '—' }
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontFamily: 'inherit', fontSize: 14,
  color: 'var(--ink)', background: 'var(--paper)',
  border: '1px solid var(--rule-strong)',
  borderRadius: 'var(--radius)',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary = {
  padding: '10px 18px',
  fontFamily: 'var(--font-mono)', fontSize: 12,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'var(--ink)', color: 'var(--paper-hi)',
  border: 'none', borderRadius: 'var(--radius)',
  cursor: 'pointer',
}

const btnDangerSm = {
  padding: '6px 12px',
  fontFamily: 'var(--font-mono)', fontSize: 11,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  background: 'transparent', color: 'var(--danger)',
  border: '1px solid var(--danger)', borderRadius: 'var(--radius)',
  cursor: 'pointer',
}

const sectionEyebrow = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  color: 'var(--accent)',
}

const statLabelStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 10,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-faint)',
}

function statCard(accent) {
  return {
    padding: '14px 16px',
    background: 'var(--paper-hi)',
    border: '1px solid var(--rule)',
    borderLeft: `3px solid ${accent}`,
    borderRadius: 'var(--radius-lg)',
  }
}

function statValueStyle(color) {
  return {
    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500,
    lineHeight: 1, letterSpacing: '-0.02em', color, marginBottom: 4,
  }
}
