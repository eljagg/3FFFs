import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   /admin/users — admin-only user + invite management

   Two tabs:
     • Users   — read-only list of every :User in the graph with progress
                 rollups. Role changes happen in the Auth0 dashboard.
     • Invites — full CRUD for the :Invite nodes that bypass the domain
                 allowlist. Create + revoke + copy signup URL.
------------------------------------------------------------------------- */

const ROLES = ['trainee', 'manager', 'admin']

const EXPIRATION_OPTIONS = [
  { label: '24 hours',  hours: 24 },
  { label: '7 days',    hours: 24 * 7 },
  { label: '30 days',   hours: 24 * 30 },
  { label: 'Never',     hours: null },
]

function fmtRelative(ts) {
  if (!ts) return '—'
  const diff = Date.now() - Number(ts)
  const abs = Math.abs(diff)
  const h = abs / 3_600_000
  const future = diff < 0
  if (h < 1)  return future ? 'in <1h' : 'just now'
  if (h < 24) return future ? `in ${Math.floor(h)}h` : `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return future ? `in ${d}d` : `${d}d ago`
  const months = Math.floor(d / 30)
  return future ? `in ${months}mo` : `${months}mo ago`
}

function fmtAbsolute(ts) {
  if (!ts) return '—'
  return new Date(Number(ts)).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function inviteStatus(inv) {
  if (inv.revokedAt) return { label: 'Revoked', color: 'var(--ink-faint)', bg: 'var(--paper)' }
  if (inv.expiresAt && Number(inv.expiresAt) < Date.now()) {
    return { label: 'Expired', color: 'var(--warning)', bg: 'transparent' }
  }
  if (inv.consumedAt) return { label: 'Active · in use', color: 'var(--success)', bg: 'transparent' }
  return { label: 'Pending', color: 'var(--accent)', bg: 'transparent' }
}

export default function AdminUsers() {
  const [tab, setTab] = useState('users')

  return (
    <Page
      eyebrow="Admin"
      title="Users & invites"
      lede="Manage who has access to 3fffs. All domain-allowlisted users appear here automatically. Use the Invites tab to grant access to reviewers or partners whose email domain isn't on the allowlist."
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, borderBottom: '1px solid var(--rule)' }}>
        <TabButton active={tab === 'users'}   onClick={() => setTab('users')}>Users</TabButton>
        <TabButton active={tab === 'invites'} onClick={() => setTab('invites')}>Invites</TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'users' ? (
          <motion.div key="users"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            <UsersTab />
          </motion.div>
        ) : (
          <motion.div key="invites"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            <InvitesTab />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent',
      border: 'none',
      padding: '10px 16px',
      fontSize: 14,
      fontWeight: 500,
      fontFamily: 'inherit',
      cursor: 'pointer',
      color: active ? 'var(--ink)' : 'var(--ink-faint)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      marginBottom: -1,
      transition: 'color var(--dur) ease',
    }}>
      {children}
    </button>
  )
}

// ============================================================================
// Users tab — read-only table
// ============================================================================
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('lastSeenAt')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.adminListUsers()
      .then(d => setUsers(d.users || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase()
    let rows = users
    if (f) {
      rows = rows.filter(u =>
        (u.email || '').toLowerCase().includes(f) ||
        (u.name  || '').toLowerCase().includes(f) ||
        (u.domain|| '').toLowerCase().includes(f)
      )
    }
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'lastSeenAt')         return (Number(b.lastSeenAt) || 0) - (Number(a.lastSeenAt) || 0)
      if (sortBy === 'scenariosCompleted') return (b.scenariosCompleted || 0) - (a.scenariosCompleted || 0)
      if (sortBy === 'email')              return String(a.email || '').localeCompare(String(b.email || ''))
      return 0
    })
    return rows
  }, [users, sortBy, filter])

  if (loading) return <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Loading users…</div>
  if (error)   return <ErrorBox message={error} />

  return (
    <div>
      <InfoCallout>
        Role changes and blocking are managed in the <strong>Auth0 dashboard</strong>
        {' '}(Users → select user → Roles tab). To revoke access for an <em>invited</em> user,
        revoke their invite on the Invites tab instead — that's faster and doesn't require Auth0 access.
      </InfoCallout>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by email, name, or domain…"
          style={inputStyle}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="lastSeenAt">Sort: most recent</option>
          <option value="scenariosCompleted">Sort: most scenarios</option>
          <option value="email">Sort: email A–Z</option>
        </select>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {sorted.length} {sorted.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: 'var(--paper)' }}>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Domain</Th>
              <Th>Roles</Th>
              <Th align="right">Completed</Th>
              <Th align="right">Quiz</Th>
              <Th align="right">Stages</Th>
              <Th>Last seen</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.id} style={rowStyle}>
                <Td>{u.email || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                <Td>{u.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                <Td><code style={codeStyle}>{u.domain || '—'}</code></Td>
                <Td><RolePills roles={u.roles} /></Td>
                <Td align="right">{u.scenariosCompleted || 0}</Td>
                <Td align="right">{u.correctAnswers || 0}/{u.quizzesAnswered || 0}</Td>
                <Td align="right">{u.stagesAttempted || 0}</Td>
                <Td title={fmtAbsolute(u.lastSeenAt)}>{fmtRelative(u.lastSeenAt)}</Td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><Td colSpan={8}><div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-faint)' }}>No users match.</div></Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Invites tab — create + revoke, with copy-to-clipboard signup URL
// ============================================================================
function InvitesTab() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const d = await api.adminListInvites()
      setInvites(d.invites || [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(payload) {
    try {
      const d = await api.adminCreateInvite(payload)
      setShowModal(false)
      await load()
      // Copy signup URL immediately — the whole point of this feature
      const url = window.location.origin
      try {
        await navigator.clipboard.writeText(url)
        setToast({ kind: 'success', text: `Invited ${d.invite.email}. Signup URL copied to clipboard.` })
      } catch {
        setToast({ kind: 'success', text: `Invited ${d.invite.email}. Signup URL: ${url}` })
      }
      setTimeout(() => setToast(null), 5000)
    } catch (e) {
      setToast({ kind: 'error', text: e.message })
      setTimeout(() => setToast(null), 5000)
    }
  }

  async function handleRevoke(inv) {
    if (!confirm(`Revoke invite for ${inv.email}? They'll be blocked from logging in.`)) return
    try {
      await api.adminRevokeInvite(inv.id)
      await load()
      setToast({ kind: 'success', text: `Revoked ${inv.email}.` })
      setTimeout(() => setToast(null), 3500)
    } catch (e) {
      setToast({ kind: 'error', text: e.message })
      setTimeout(() => setToast(null), 5000)
    }
  }

  async function copySignupUrl() {
    const url = window.location.origin
    try {
      await navigator.clipboard.writeText(url)
      setToast({ kind: 'success', text: 'Signup URL copied.' })
      setTimeout(() => setToast(null), 2500)
    } catch {
      setToast({ kind: 'error', text: `Copy failed. URL: ${url}` })
      setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setShowModal(true)} style={primaryBtn}>+ Invite user</button>
        <button onClick={copySignupUrl} style={secondaryBtn}>Copy signup URL</button>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {invites.length} {invites.length === 1 ? 'invite' : 'invites'}
        </div>
      </div>

      {loading && <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Loading invites…</div>}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: 'var(--paper)' }}>
                <Th>Email</Th>
                <Th>Roles</Th>
                <Th>Status</Th>
                <Th>Invited</Th>
                <Th>Expires</Th>
                <Th align="right">Uses</Th>
                <Th>Notes</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => {
                const st = inviteStatus(inv)
                const isDone = inv.revokedAt || (inv.expiresAt && Number(inv.expiresAt) < Date.now())
                return (
                  <tr key={inv.id} style={rowStyle}>
                    <Td>{inv.email}</Td>
                    <Td><RolePills roles={inv.roles} /></Td>
                    <Td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: st.color, fontWeight: 500, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                        {st.label}
                      </span>
                    </Td>
                    <Td title={fmtAbsolute(inv.invitedAt)}>{fmtRelative(inv.invitedAt)}</Td>
                    <Td title={inv.expiresAt ? fmtAbsolute(inv.expiresAt) : 'No expiration'}>
                      {inv.expiresAt ? fmtRelative(inv.expiresAt) : <span style={{ color: 'var(--ink-faint)' }}>Never</span>}
                    </Td>
                    <Td align="right">{inv.useCount || 0}</Td>
                    <Td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={inv.notes || ''}>
                      {inv.notes || <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                    </Td>
                    <Td align="right">
                      {!isDone && (
                        <button onClick={() => handleRevoke(inv)} style={dangerLinkBtn}>Revoke</button>
                      )}
                    </Td>
                  </tr>
                )
              })}
              {invites.length === 0 && (
                <tr><Td colSpan={8}>
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>
                    No invites yet. Click <strong>Invite user</strong> to grant access to someone off-allowlist.
                  </div>
                </Td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showModal && <InviteModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              padding: '14px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              maxWidth: 560, textAlign: 'center',
              background: toast.kind === 'error' ? 'var(--danger)' : 'var(--ink)',
              color: 'var(--paper)', zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Invite modal
// ============================================================================
function InviteModal({ onClose, onSubmit }) {
  const [email, setEmail]     = useState('')
  const [roles, setRoles]     = useState(['trainee'])
  const [hours, setHours]     = useState(24 * 7) // default 7 days
  const [notes, setNotes]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]         = useState(null)

  function toggleRole(r) {
    setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r])
  }

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    if (!email.trim()) { setErr('Email is required.'); return }
    if (roles.length === 0) { setErr('Pick at least one role.'); return }
    setSubmitting(true)
    try {
      await onSubmit({
        email: email.trim(),
        roles,
        expirationHours: hours,
        notes: notes.trim() || null,
      })
    } catch (e) {
      setErr(e.message)
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        backdropFilter: 'blur(4px)',
      }}>
      <motion.form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'var(--paper-hi)', borderRadius: 12, padding: '32px 36px',
          maxWidth: 520, width: '92%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '1px solid var(--rule)',
        }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10,
        }}>Invite user</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
          lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 24,
        }}>Grant access to a non-allowlisted email</h2>

        <label style={labelStyle}>
          <div style={labelHdr}>Email</div>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="reviewer@gmail.com" autoFocus style={inputStyle} />
        </label>

        <label style={labelStyle}>
          <div style={labelHdr}>Roles</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.map(r => (
              <button key={r} type="button" onClick={() => toggleRole(r)} style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 13,
                fontFamily: 'inherit', cursor: 'pointer',
                border: '1px solid ' + (roles.includes(r) ? 'var(--ink)' : 'var(--rule)'),
                background: roles.includes(r) ? 'var(--ink)' : 'transparent',
                color: roles.includes(r) ? 'var(--paper)' : 'var(--ink-soft)',
                transition: 'all var(--dur) ease',
              }}>
                {r}
              </button>
            ))}
          </div>
        </label>

        <label style={labelStyle}>
          <div style={labelHdr}>Expires in</div>
          <select value={hours === null ? 'null' : String(hours)}
            onChange={e => setHours(e.target.value === 'null' ? null : Number(e.target.value))}
            style={selectStyle}>
            {EXPIRATION_OPTIONS.map(o => (
              <option key={o.label} value={o.hours === null ? 'null' : String(o.hours)}>{o.label}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <div style={labelHdr}>Notes <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></div>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Security reviewer — contract through June" style={inputStyle} maxLength={500} />
        </label>

        {err && <div style={{
          color: 'var(--danger)', fontSize: 13, padding: '10px 12px',
          background: 'rgba(220,38,38,0.08)', borderRadius: 6, marginBottom: 16,
        }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={secondaryBtn} disabled={submitting}>Cancel</button>
          <button type="submit" style={primaryBtn} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create invite'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}

// ============================================================================
// Shared small components
// ============================================================================
function RolePills({ roles }) {
  const list = Array.isArray(roles) ? roles : []
  if (list.length === 0) return <span style={{ color: 'var(--ink-faint)' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {list.map(r => (
        <span key={r} style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px',
          borderRadius: 4, background: 'var(--paper)', color: 'var(--ink-soft)',
          border: '1px solid var(--rule)', letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>{r}</span>
      ))}
    </span>
  )
}

function InfoCallout({ children }) {
  return (
    <div style={{
      padding: '14px 18px', background: 'var(--paper)', border: '1px solid var(--rule)',
      borderLeft: '3px solid var(--accent)', borderRadius: 6, marginBottom: 20,
      fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div style={{
      padding: 20, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)',
      borderRadius: 8, color: 'var(--danger)', fontSize: 14,
    }}>
      <strong>Error:</strong> {message}
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      textAlign: align, padding: '12px 14px', fontSize: 11, fontWeight: 500,
      fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--ink-faint)', borderBottom: '1px solid var(--rule)',
    }}>{children}</th>
  )
}

function Td({ children, align = 'left', colSpan, style, title }) {
  return (
    <td colSpan={colSpan} title={title} style={{
      textAlign: align, padding: '12px 14px', fontSize: 13.5,
      color: 'var(--ink)', borderBottom: '1px solid var(--rule)', verticalAlign: 'middle',
      ...(style || {}),
    }}>{children}</td>
  )
}

// ============================================================================
// Shared styles
// ============================================================================
const tableStyle = {
  width: '100%', borderCollapse: 'collapse', background: 'var(--paper-hi)',
}
const rowStyle = { transition: 'background var(--dur) ease' }
const codeStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px',
  background: 'var(--paper)', borderRadius: 3, color: 'var(--ink-soft)',
}
const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
  background: 'var(--paper)', color: 'var(--ink)',
  border: '1px solid var(--rule)', borderRadius: 6,
  outline: 'none', transition: 'border-color var(--dur) ease',
  boxSizing: 'border-box',
}
const selectStyle = {
  padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
  background: 'var(--paper)', color: 'var(--ink)',
  border: '1px solid var(--rule)', borderRadius: 6,
  outline: 'none', cursor: 'pointer',
}
const labelStyle = { display: 'block', marginBottom: 18 }
const labelHdr = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8, fontWeight: 500,
}
const primaryBtn = {
  padding: '10px 18px', background: 'var(--ink)', color: 'var(--paper-hi)',
  borderRadius: 6, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', transition: 'opacity var(--dur) ease',
}
const secondaryBtn = {
  padding: '10px 18px', background: 'transparent', color: 'var(--ink)',
  borderRadius: 6, fontSize: 14, fontWeight: 500,
  border: '1px solid var(--rule-strong)', cursor: 'pointer', fontFamily: 'inherit',
}
const dangerLinkBtn = {
  background: 'transparent', border: 'none', color: 'var(--danger)',
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px',
  textDecoration: 'underline',
}
