import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth0 } from '@auth0/auth0-react'
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

// v25.7.0.22: quick-pick options for the Extend/Restore popover.
// Anchored from NOW (not from current expiresAt), so "+7 days" means
// "expires 7 days from this click", which matches the new-invite mental
// model and is robust for both expired and active rows.
const EXTEND_OPTIONS = [
  { label: '+1 day',         hours: 24 },
  { label: '+7 days',        hours: 24 * 7 },
  { label: '+30 days',       hours: 24 * 30 },
  { label: 'Never expires',  hours: null },
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
      wide
      eyebrow="Admin"
      title="Users & invites"
      lede="Manage who has access to 3fffs. All domain-allowlisted users appear here automatically. Use the Invites tab to grant access to reviewers or partners whose email domain isn't on the allowlist."
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, borderBottom: '1px solid var(--rule)' }}>
        <TabButton active={tab === 'users'}   onClick={() => setTab('users')}>Users</TabButton>
        <TabButton active={tab === 'invites'} onClick={() => setTab('invites')}>Invites</TabButton>
        <TabButton active={tab === 'managers'} onClick={() => setTab('managers')}>Manager assignments</TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'users' && (
          <motion.div key="users"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            <UsersTab />
          </motion.div>
        )}
        {tab === 'invites' && (
          <motion.div key="invites"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            <InvitesTab />
          </motion.div>
        )}
        {tab === 'managers' && (
          <motion.div key="managers"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>
            <ManagersTab />
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
  // v25.7.0.23 — drill-down modal state. We open by id and let the modal
  // fetch its own detail payload — cleaner than passing the row in and
  // getting stale data if the list refreshes underneath.
  const [selectedUserId, setSelectedUserId] = useState(null)

  // v25.7.0.24 — extracted so the modal can trigger a refresh after edit
  function loadUsers() {
    return api.adminListUsers()
      .then(d => setUsers(d.users || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase()
    let rows = users
    if (f) {
      rows = rows.filter(u =>
        (u.email       || '').toLowerCase().includes(f) ||
        (u.name        || '').toLowerCase().includes(f) ||
        (u.displayName || '').toLowerCase().includes(f) ||
        (u.domain      || '').toLowerCase().includes(f)
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
              <tr key={u.id} onClick={() => setSelectedUserId(u.id)}
                  style={{ ...rowStyle, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Td>{u.email || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                <Td>{(u.displayName || u.name) || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
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

      {/* v25.7.0.23 — per-user drill-down modal */}
      <AnimatePresence>
        {selectedUserId && (
          <UserDetailModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onUpdate={loadUsers}
          />
        )}
      </AnimatePresence>
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
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [toast, setToast] = useState(null)
  // v25.7.0.22: extend/restore popover state. `extending` is the invite
  // whose popover is open; `extendAnchor` is the {x,y} of the trigger
  // button so the floating popover knows where to position itself.
  const [extending, setExtending] = useState(null)
  const [extendAnchor, setExtendAnchor] = useState(null)

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

  // v25.7.0.22 — open the Extend/Restore popover anchored to the trigger
  function openExtendPopover(inv, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setExtending(inv)
    // Right-align the popover to the trigger's right edge so it doesn't
    // overflow off the right side of the viewport on the rightmost
    // Action column. Top edge sits just below the trigger.
    setExtendAnchor({ right: window.innerWidth - rect.right, top: rect.bottom + 6 })
  }

  function closeExtendPopover() {
    setExtending(null)
    setExtendAnchor(null)
  }

  async function handleExtend(inv, hours) {
    const wasRevoked = !!inv.revokedAt
    closeExtendPopover()
    try {
      const d = await api.adminExtendInvite(inv.id, { expirationHours: hours })
      await load()
      const verb = wasRevoked ? 'Restored' : 'Extended'
      const when = d.invite.expiresAt
        ? `expires ${fmtAbsolute(d.invite.expiresAt)}`
        : 'no expiration'
      setToast({ kind: 'success', text: `${verb} ${d.invite.email} — ${when}.` })
      setTimeout(() => setToast(null), 4000)
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
        <button onClick={() => setShowBulkModal(true)} style={secondaryBtn}>+ Bulk import…</button>
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
                      {/* v25.7.0.22: surface extend/restore audit trail inline so admins
                          can see at a glance which invites have been kept alive past their
                          original expiry without opening a separate audit log. */}
                      {inv.lastExtendedAt && (
                        <div style={{
                          fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 3,
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                        }} title={`${fmtAbsolute(inv.lastExtendedAt)}${inv.extendedByEmail ? ` by ${inv.extendedByEmail}` : ''}`}>
                          ↻ extended {fmtRelative(inv.lastExtendedAt)}
                        </div>
                      )}
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
                      {/* v25.7.0.22: action column is now context-aware per row state.
                          Revoked → [Restore ▾] (re-uses extend endpoint, label flips).
                          Expired → [Extend ▾] only (no point in revoking what's already lapsed).
                          Active/Pending → [Extend ▾] [Revoke]. */}
                      {inv.revokedAt ? (
                        <button onClick={(e) => openExtendPopover(inv, e)} style={extendBtn}>
                          Restore ▾
                        </button>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button onClick={(e) => openExtendPopover(inv, e)} style={extendBtn}>
                            Extend ▾
                          </button>
                          {!isDone && (
                            <button onClick={() => handleRevoke(inv)} style={dangerLinkBtn}>Revoke</button>
                          )}
                        </span>
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

      {/* v25.7.0.22 — Extend/Restore popover. Position: fixed, anchored to
          the trigger button via openExtendPopover's getBoundingClientRect.
          Outer overlay catches click-outside dismissal. */}
      <AnimatePresence>
        {extending && extendAnchor && (
          <ExtendPopover
            invite={extending}
            anchor={extendAnchor}
            onPick={(hours) => handleExtend(extending, hours)}
            onClose={closeExtendPopover}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <InviteModal onClose={() => setShowModal(false)} onSubmit={handleCreate} />}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkModal && (
          <BulkInviteModal
            onClose={() => setShowBulkModal(false)}
            onComplete={() => { setShowBulkModal(false); load() }}
          />
        )}
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
// Bulk invite modal — v25.7.0.26
//
// Four-phase flow: upload → preview → submitting → results. Each phase is a
// distinct render with phase-appropriate UI and no surprise transitions; the
// admin always knows where they are and what comes next.
//
// File parsing happens entirely client-side via SheetJS (xlsx). The lib is
// dynamic-imported on first parse so the ~600KB bundle doesn't load for
// admins who never use this feature. Both .xlsx and .csv go through the
// same XLSX.read() entry point — SheetJS infers the format from the file
// header bytes.
//
// Server contract: POST /api/admin/invites/bulk with { invites: [...] }
// returns { results: [...], summary: {...} }. Per-row failures don't block
// the rest. See server admin.js for the full spec.
//
// Required CSV columns: email, roles
// Optional columns: notes, expirationHours
// Roles can be a single value ("trainee") or comma-separated ("manager,admin").
// Header matching is case-insensitive.
// ============================================================================
function BulkInviteModal({ onClose, onComplete }) {
  // phase: 'upload' | 'preview' | 'submitting' | 'results'
  const [phase, setPhase]         = useState('upload')
  const [fileName, setFileName]   = useState(null)
  const [parsedRows, setParsed]   = useState([])
  const [parseError, setParseErr] = useState(null)
  const [parsing, setParsing]     = useState(false)
  const [submitErr, setSubmitErr] = useState(null)
  const [results, setResults]     = useState(null)
  const [dragOver, setDragOver]   = useState(false)

  // ESC closes the modal (but only when not actively submitting, to avoid
  // mid-flight cancellation)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && phase !== 'submitting') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, phase])

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setParseErr(null)
    setParsing(true)
    try {
      // Lazy-load SheetJS only when actually needed — keeps the Admin
      // page bundle small for admins who never use bulk import
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!firstSheet) {
        throw new Error('No worksheets found in the file.')
      }
      // sheet_to_json with header:1 gives us [["col1","col2"], ["v1","v2"], ...]
      // which lets us normalize headers to lowercase before mapping rows
      const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
      if (aoa.length === 0) {
        throw new Error('File is empty.')
      }
      const headers = aoa[0].map(h => String(h || '').trim().toLowerCase())
      // Header validation — required columns
      if (!headers.includes('email')) {
        throw new Error('Missing required column "email".')
      }
      if (!headers.includes('roles')) {
        throw new Error('Missing required column "roles".')
      }
      const emailIdx       = headers.indexOf('email')
      const rolesIdx       = headers.indexOf('roles')
      const notesIdx       = headers.indexOf('notes')
      const expirationIdx  = headers.indexOf('expirationhours')

      const validRoles = ['trainee', 'manager', 'admin']
      const rows = []
      for (let i = 1; i < aoa.length; i++) {
        const r = aoa[i]
        // Skip wholly-empty rows (Excel often pads with blanks)
        if (!r || r.every(c => c === '' || c == null)) continue

        const rawEmail      = String(r[emailIdx] || '').trim()
        const rawRoles      = String(r[rolesIdx] || '').trim()
        const rawNotes      = notesIdx      >= 0 ? String(r[notesIdx]      || '').trim() : ''
        const rawExpiration = expirationIdx >= 0 ? String(r[expirationIdx] || '').trim() : ''

        // Normalize email (lowercase) — same as server validation
        const email = rawEmail.toLowerCase()

        // Parse roles — split on comma, trim, lowercase, dedupe
        const roles = [...new Set(
          rawRoles.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        )]

        // Per-row validation (mirrors server validation exactly)
        const errors = []
        if (!email) {
          errors.push('Email is required.')
        } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          errors.push('Email format invalid.')
        }
        if (roles.length === 0) {
          errors.push('At least one role required.')
        } else {
          const badRoles = roles.filter(r => !validRoles.includes(r))
          if (badRoles.length > 0) {
            errors.push(`Unknown role(s): ${badRoles.join(', ')}. Must be one of: ${validRoles.join(', ')}.`)
          }
        }
        let expirationHours = null
        if (rawExpiration !== '') {
          const n = Number(rawExpiration)
          if (!Number.isFinite(n) || n <= 0) {
            errors.push('expirationHours must be a positive number (or blank for default).')
          } else {
            expirationHours = n
          }
        }

        rows.push({
          rowNum: i + 1,           // 1-indexed line number, includes header
          email,
          roles: roles.filter(r => validRoles.includes(r)),
          notes: rawNotes ? rawNotes.slice(0, 500) : null,
          expirationHours,
          errors,
          rawEmail, rawRoles, rawNotes, rawExpiration,  // for the preview display
        })
      }

      // Check for in-file duplicates — first occurrence wins, others get an error
      const seenEmails = new Set()
      for (const row of rows) {
        if (row.email && seenEmails.has(row.email)) {
          row.errors.push(`Duplicate of an earlier row in this file.`)
        } else if (row.email) {
          seenEmails.add(row.email)
        }
      }

      if (rows.length === 0) {
        throw new Error('No data rows found in the file (only the header row was present).')
      }
      if (rows.length > 500) {
        throw new Error(`Too many rows (${rows.length}). Max is 500 per upload — split the file and upload in batches.`)
      }

      setParsed(rows)
      setPhase('preview')
    } catch (e) {
      setParseErr(e.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleSubmit() {
    setPhase('submitting')
    setSubmitErr(null)
    // Only send rows without errors — error rows are discarded server-side
    // anyway, but pre-filtering makes the per-row results cleaner
    const payload = parsedRows
      .filter(r => r.errors.length === 0)
      .map(r => ({
        email: r.email,
        roles: r.roles,
        notes: r.notes,
        expirationHours: r.expirationHours,
      }))
    try {
      const resp = await api.adminBulkInvite(payload)
      setResults(resp)
      setPhase('results')
    } catch (e) {
      setSubmitErr(e.message)
      setPhase('preview')   // bounce back so they can see the upload again
    }
  }

  function downloadTemplate() {
    const csv = [
      'email,roles,notes,expirationHours',
      'reviewer1@partner.com,trainee,Q3 reviewer cohort,168',
      'auditor@external.com,"manager,admin",Audit access through Q4,720',
      'partner@gmail.com,trainee,,',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    triggerDownload(blob, '3fffs-invite-template.csv')
  }

  function downloadErrors() {
    if (!results) return
    const errorRows = results.results.filter(r => r.status === 'error')
    if (errorRows.length === 0) return
    const csv = [
      'email,error',
      ...errorRows.map(r => `${csvCell(r.email)},${csvCell(r.error)}`),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    triggerDownload(blob, '3fffs-invite-errors.csv')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => phase !== 'submitting' && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(4px)',
        overflowY: 'auto', padding: '60px 20px',
      }}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.97, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'var(--paper-hi)', borderRadius: 12,
          maxWidth: 820, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '1px solid var(--rule)',
          overflow: 'hidden',
        }}>
        {/* Header — common to all phases */}
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8,
              }}>Bulk import — {phase}</div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
                lineHeight: 1.2, letterSpacing: '-0.01em',
              }}>
                {phase === 'upload'     && 'Upload an Excel or CSV file of invites'}
                {phase === 'preview'    && `Preview — ${parsedRows.length} rows parsed`}
                {phase === 'submitting' && 'Creating invites…'}
                {phase === 'results'    && 'Done'}
              </h2>
            </div>
            {phase !== 'submitting' && (
              <button onClick={onClose} style={{
                background: 'transparent', border: 'none', color: 'var(--ink-faint)',
                fontSize: 22, cursor: 'pointer', padding: '4px 10px', lineHeight: 1,
                fontFamily: 'inherit',
              }} title="Close (Esc)">×</button>
            )}
          </div>
        </div>

        {/* PHASE 1 — Upload */}
        {phase === 'upload' && (
          <div style={{ padding: '24px 32px 28px' }}>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 16 }}>
              Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file with one row per invite.
              Required columns: <code style={codeStyle}>email</code>, <code style={codeStyle}>roles</code>.
              Optional: <code style={codeStyle}>notes</code>, <code style={codeStyle}>expirationHours</code>.
              Roles can be a single value (<code style={codeStyle}>trainee</code>) or comma-separated
              (<code style={codeStyle}>manager,admin</code>). Max 500 rows per upload.
            </p>

            <button onClick={downloadTemplate} style={{
              ...secondaryBtn, fontSize: 12, padding: '6px 12px', marginBottom: 16,
            }}>↓ Download CSV template</button>

            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
              }}
              style={{
                display: 'block', padding: '40px 20px', textAlign: 'center',
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--rule-strong)'}`,
                borderRadius: 8, background: dragOver ? 'var(--paper)' : 'transparent',
                cursor: 'pointer', transition: 'all var(--dur) ease',
              }}>
              <input type="file" accept=".xlsx,.xls,.csv"
                     onChange={(e) => handleFile(e.target.files[0])}
                     style={{ display: 'none' }} />
              <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>
                {parsing ? 'Parsing…' : 'Drop a file here, or click to browse'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                .xlsx, .xls, or .csv — up to 500 rows
              </div>
              {fileName && !parseError && !parsing && (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
                  Last attempted: {fileName}
                </div>
              )}
            </label>

            {parseError && (
              <div style={{
                marginTop: 16, padding: 14, fontSize: 13,
                color: 'var(--danger)', background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6,
              }}>
                <strong>Couldn't parse the file:</strong> {parseError}
              </div>
            )}
          </div>
        )}

        {/* PHASE 2 — Preview */}
        {phase === 'preview' && (
          <BulkPreviewBody
            rows={parsedRows}
            submitErr={submitErr}
            onBack={() => { setPhase('upload'); setParsed([]); setSubmitErr(null) }}
            onSubmit={handleSubmit}
          />
        )}

        {/* PHASE 3 — Submitting */}
        {phase === 'submitting' && (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Creating {parsedRows.filter(r => r.errors.length === 0).length} invites…
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              Don't close this window
            </div>
          </div>
        )}

        {/* PHASE 4 — Results */}
        {phase === 'results' && results && (
          <BulkResultsBody
            results={results}
            onDownloadErrors={downloadErrors}
            onDone={onComplete}
            onUploadAnother={() => {
              setPhase('upload')
              setParsed([])
              setResults(null)
              setFileName(null)
            }}
          />
        )}
      </motion.div>
    </motion.div>
  )
}

function BulkPreviewBody({ rows, submitErr, onBack, onSubmit }) {
  const validCount   = rows.filter(r => r.errors.length === 0).length
  const errorCount   = rows.length - validCount
  const canSubmit    = validCount > 0
  const allErrors    = validCount === 0

  return (
    <>
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--success)' }}>✓ {validCount} valid</span>
          {errorCount > 0 && (
            <span style={{ color: 'var(--danger)' }}>✗ {errorCount} with errors</span>
          )}
          {allErrors && (
            <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              — fix the errors and re-upload, or go back and try a different file
            </span>
          )}
        </div>
        {submitErr && (
          <div style={{
            marginTop: 12, padding: '8px 12px', fontSize: 12,
            color: 'var(--danger)', background: 'rgba(220,38,38,0.08)',
            borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)',
          }}>
            Submit failed: {submitErr}
          </div>
        )}
      </div>

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 1 }}>
              <Th>Row</Th>
              <Th>Email</Th>
              <Th>Roles</Th>
              <Th>Notes</Th>
              <Th>Expires (h)</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = r.errors.length === 0
              return (
                <tr key={r.rowNum} style={{
                  ...rowStyle,
                  background: ok ? 'transparent' : 'rgba(220,38,38,0.04)',
                }}>
                  <Td><span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.rowNum}</span></Td>
                  <Td>{r.rawEmail || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                  <Td>{r.rawRoles || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                  <Td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.rawNotes}>
                    {r.rawNotes || <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </Td>
                  <Td>{r.rawExpiration || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                  <Td>
                    {ok ? (
                      <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ ready</span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontSize: 11 }}>
                        ✗ {r.errors.join(' · ')}
                      </span>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: '16px 32px', borderTop: '1px solid var(--rule)',
        display: 'flex', gap: 10, justifyContent: 'flex-end',
      }}>
        <button onClick={onBack} style={secondaryBtn}>← Back</button>
        <button onClick={onSubmit} disabled={!canSubmit} style={{
          ...primaryBtn,
          opacity: canSubmit ? 1 : 0.4,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}>
          {validCount === rows.length
            ? `Create ${validCount} invites`
            : `Create ${validCount} valid invites (skip ${errorCount} errors)`}
        </button>
      </div>
    </>
  )
}

function BulkResultsBody({ results, onDownloadErrors, onDone, onUploadAnother }) {
  const { summary } = results
  const hasErrors = summary.errors > 0
  return (
    <>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatBox label="Total"   value={summary.total} />
          <StatBox label="Created" value={summary.created} />
          <StatBox label="Updated" value={summary.updated} />
          <StatBox label="Errors"  value={summary.errors} />
        </div>
        {summary.updated > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-faint)' }}>
            "Updated" rows are emails that already had an invite — their roles, notes, and
            expiry were refreshed; the existing invite id and useCount were preserved.
          </div>
        )}
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 1 }}>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {results.results.map((r, i) => (
              <tr key={i} style={rowStyle}>
                <Td>{r.email || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</Td>
                <Td>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: r.status === 'error' ? 'var(--danger)'
                         : r.status === 'created' ? 'var(--success)'
                         : 'var(--ink-soft)',
                  }}>
                    {r.status === 'error' ? '✗' : '✓'} {r.status}
                  </span>
                </Td>
                <Td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {r.error || (r.invite ? `Roles: ${(r.invite.roles || []).join(', ')}` : '—')}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        padding: '16px 32px', borderTop: '1px solid var(--rule)',
        display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
      }}>
        {hasErrors && (
          <button onClick={onDownloadErrors} style={{ ...secondaryBtn, marginRight: 'auto' }}>
            ↓ Download error rows as CSV
          </button>
        )}
        <button onClick={onUploadAnother} style={secondaryBtn}>Upload another file</button>
        <button onClick={onDone} style={primaryBtn}>Done</button>
      </div>
    </>
  )
}

// CSV-cell escaping for the error-download path. Wraps in quotes if the value
// contains a comma, quote, or newline; doubles internal quotes per RFC 4180.
function csvCell(v) {
  const s = String(v == null ? '' : v)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ============================================================================
// Extend / Restore popover — v25.7.0.22
//
// Floating menu anchored to the trigger button. Quick-pick options for the
// most common extension durations, plus a custom-hours input for the long
// tail. Same component services both "Extend" (active/expired rows) and
// "Restore" (revoked rows) — server endpoint is the same; we only flip the
// header copy based on `invite.revokedAt`.
// ============================================================================
function ExtendPopover({ invite, anchor, onPick, onClose }) {
  const [customHours, setCustomHours] = useState('')
  const [customErr, setCustomErr] = useState(null)
  const isRestore = !!invite.revokedAt

  function applyCustom() {
    const n = Number(customHours)
    if (!Number.isFinite(n) || n <= 0) {
      setCustomErr('Enter a positive number of hours.')
      return
    }
    onPick(n)
  }

  return (
    <>
      {/* Click-outside dismiss layer */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 150, background: 'transparent',
      }} />
      <motion.div
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'fixed',
          right: anchor.right, top: anchor.top,
          zIndex: 160,
          minWidth: 220,
          background: 'var(--paper-hi)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          padding: 6,
          fontFamily: 'inherit',
        }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-faint)',
          padding: '8px 10px 6px',
        }}>
          {isRestore ? 'Restore with new expiry' : 'Extend expiry'}
        </div>
        {EXTEND_OPTIONS.map(opt => (
          <button key={opt.label} onClick={() => onPick(opt.hours)} style={popoverItemStyle}>
            {opt.label}
          </button>
        ))}
        <div style={{ borderTop: '1px solid var(--rule)', margin: '6px 0', padding: '8px 10px 4px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 6,
          }}>
            Custom hours
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              min="1"
              value={customHours}
              onChange={e => { setCustomHours(e.target.value); setCustomErr(null) }}
              onKeyDown={e => { if (e.key === 'Enter') applyCustom() }}
              placeholder="e.g. 72"
              style={{
                flex: 1, minWidth: 0, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit',
                background: 'var(--paper)', color: 'var(--ink)',
                border: '1px solid var(--rule)', borderRadius: 4, outline: 'none',
              }}
            />
            <button onClick={applyCustom} style={{
              padding: '6px 12px', background: 'var(--ink)', color: 'var(--paper-hi)',
              border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Apply</button>
          </div>
          {customErr && (
            <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{customErr}</div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ============================================================================
// User detail drill-down modal — v25.7.0.23
//
// Opened by clicking a row on the Users tab. Fetches the comprehensive
// per-user payload from GET /api/admin/users/:id (one round-trip), then
// renders progress totals, manager assignments (both directions), invite
// history if applicable, completed scenarios, and recent activity.
//
// Sections render conditionally based on what the user actually has —
// e.g. an auto-allowlisted user with no :Invite hides the invite section
// entirely rather than showing an empty placeholder. A user without the
// manager role hides the "Manages" section. Keeps the modal compact for
// low-data users and expansive for power users.
// ============================================================================
function UserDetailModal({ userId, onClose, onUpdate }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.adminGetUser(userId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  // ESC closes the modal — small affordance, expected behavior on a wide modal
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // v25.7.0.24 — local refresh after a successful PATCH. The endpoint
  // returns the updated { user, bank } payload so we splice it into the
  // existing detail bundle rather than re-fetching everything (engagement
  // data hasn't changed). The list view also refreshes via onUpdate so
  // the row's name reflects the new displayName immediately.
  function applyUpdate(patchResponse) {
    setData(prev => prev && {
      ...prev,
      user: { ...prev.user, ...patchResponse.user },
      bank: patchResponse.bank,
    })
    if (onUpdate) onUpdate()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(4px)',
        overflowY: 'auto', padding: '60px 20px',
      }}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.97, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'var(--paper-hi)', borderRadius: 12,
          maxWidth: 780, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          border: '1px solid var(--rule)', overflow: 'hidden',
        }}>
        {loading && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-faint)' }}>
            Loading user detail…
          </div>
        )}
        {error && (
          <div style={{ padding: 30 }}><ErrorBox message={error} /></div>
        )}
        {data && (
          <UserDetailBody data={data} onClose={onClose} onApplyUpdate={applyUpdate} />
        )}
      </motion.div>
    </motion.div>
  )
}

function UserDetailBody({ data, onClose, onApplyUpdate }) {
  const { user, bank, managers, manages, invite, progress } = data
  const isManager = (user.roles || []).includes('manager')
  const totals = progress.totals

  // v25.7.0.25 — current Auth0 user id, used to detect self-edits and
  // hide the admin-revoke affordance for the current user (the server-side
  // guard rejects it anyway, but hiding the × upfront is cleaner UX).
  const { user: currentAuth0User } = useAuth0()
  const isViewingSelf = currentAuth0User?.sub === user.id

  // v25.7.0.24 — edit mode for displayName + bank. Only these two fields
  // are admin-editable in 3FFFs without Auth0 round-trip; roles need the
  // Management API and have their own confirm-then-write flow below.
  const [editing, setEditing] = useState(false)
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formBankId, setFormBankId] = useState('')
  const [banks, setBanks] = useState(null)        // null = not yet loaded
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [toast, setToast] = useState(null)

  // v25.7.0.25 — role grant/revoke state. Adjacent to editing but operates
  // independently (always-available with confirms), since role changes
  // round-trip to Auth0 and have higher stakes than display-only edits.
  const [showAddRole, setShowAddRole] = useState(false)
  const [roleBusy, setRoleBusy] = useState(false)
  const ALL_ROLES = ['trainee', 'manager', 'admin']
  const userRoles = user.roles || []
  const missingRoles = ALL_ROLES.filter(r => !userRoles.includes(r))

  function startEdit() {
    setFormDisplayName(user.displayName || '')
    setFormBankId(bank?.id || '')
    setSaveErr(null)
    setEditing(true)
    if (!banks) {
      api.adminListBanks()
        .then(d => setBanks(d.banks || []))
        .catch(e => setSaveErr(`Couldn't load banks: ${e.message}`))
    }
  }

  function cancelEdit() {
    setEditing(false)
    setSaveErr(null)
  }

  async function saveEdit() {
    setSaving(true)
    setSaveErr(null)
    const patch = {}
    const trimmedName = formDisplayName.trim()
    const currentDisplayName = user.displayName || ''
    if (trimmedName !== currentDisplayName) {
      patch.displayName = trimmedName
    }
    const newBankId = formBankId || null
    const currentBankId = bank?.id || null
    if (newBankId !== currentBankId) {
      patch.bankId = newBankId
    }
    if (Object.keys(patch).length === 0) {
      setEditing(false)
      setSaving(false)
      return
    }
    try {
      const resp = await api.adminUpdateUser(user.id, patch)
      onApplyUpdate(resp)
      setEditing(false)
      setToast('Saved.')
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // v25.7.0.25 — role grant. Confirm-first because it's a privileged
  // change to the Auth0 user, not just a 3FFFs display tweak. After
  // success we re-fetch the user to refresh roles + audit fields, and
  // call onApplyUpdate so the parent list view reflects the change.
  async function handleGrantRole(role) {
    if (!confirm(`Grant ${role} role to ${user.email}? This will be reflected in Auth0 immediately.`)) return
    setRoleBusy(true)
    setShowAddRole(false)
    try {
      await api.adminGrantRole(user.id, role)
      const fresh = await api.adminGetUser(user.id)
      onApplyUpdate({ user: fresh.user, bank: fresh.bank })
      setToast(`Granted ${role}.`)
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      setSaveErr(`Grant failed: ${e.message}`)
    } finally {
      setRoleBusy(false)
    }
  }

  async function handleRevokeRole(role) {
    if (!confirm(`Revoke ${role} role from ${user.email}? They'll lose ${role}-tier access on their next session.`)) return
    setRoleBusy(true)
    try {
      await api.adminRevokeRole(user.id, role)
      const fresh = await api.adminGetUser(user.id)
      onApplyUpdate({ user: fresh.user, bank: fresh.bank })
      setToast(`Revoked ${role}.`)
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      setSaveErr(`Revoke failed: ${e.message}`)
    } finally {
      setRoleBusy(false)
    }
  }

  const resolvedName = user.displayName || user.name
  const hasOverride = !!user.displayName

  return (
    <>
      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8,
            }}>User detail</div>
            {editing ? (
              <div>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={e => setFormDisplayName(e.target.value)}
                  placeholder={user.name || 'Display name (e.g. Omar McLeod)'}
                  autoFocus
                  maxLength={120}
                  style={{
                    ...inputStyle,
                    fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 500,
                    padding: '8px 10px', marginBottom: 6,
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  Display name overrides Auth0's name in the UI. Leave blank to clear the override
                  {user.name ? <> and fall back to <strong>{user.name}</strong>.</> : '.'}
                </div>
              </div>
            ) : (
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
                lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 6,
                wordBreak: 'break-word',
              }}>
                {resolvedName || <span style={{ color: 'var(--ink-faint)' }}>(no name)</span>}
                {hasOverride && user.name && user.name !== user.displayName && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 400,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--ink-faint)', marginLeft: 10, verticalAlign: 'middle',
                  }} title={`Auth0 name: ${user.name}`}>
                    override
                  </span>
                )}
              </h2>
            )}
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', wordBreak: 'break-word' }}>
              {user.email || <span style={{ color: 'var(--ink-faint)' }}>(no email)</span>}
              {user.domain && (
                <>{' · '}<code style={codeStyle}>{user.domain}</code></>
              )}
            </div>
          </div>

          {/* Top-right action cluster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: 'var(--ink-faint)',
              fontSize: 22, cursor: 'pointer', padding: '4px 10px', lineHeight: 1,
              fontFamily: 'inherit',
            }} title="Close (Esc)">×</button>
            {editing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={cancelEdit} disabled={saving}
                        style={{ ...secondaryBtn, padding: '6px 12px', fontSize: 12 }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                        style={{ ...primaryBtn, padding: '6px 14px', fontSize: 12 }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={startEdit} style={extendBtn}>Edit ✎</button>
            )}
          </div>
        </div>

        {/* Metadata bar — roles are always editable (with confirm), bank is editable only in edit mode */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* v25.7.0.25 — editable role pills with × revoke and + grant affordances */}
          <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
            {userRoles.length === 0 ? (
              <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>No roles</span>
            ) : (
              userRoles.map(r => {
                const isProtectedSelfAdmin = isViewingSelf && r === 'admin'
                return (
                  <span key={r} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 4px 2px 8px',
                    borderRadius: 4, background: 'var(--paper)', color: 'var(--ink-soft)',
                    border: '1px solid var(--rule)', letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {r}
                    {!isProtectedSelfAdmin && (
                      <button onClick={() => handleRevokeRole(r)} disabled={roleBusy}
                              title={`Revoke ${r}`}
                              style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--ink-faint)', cursor: 'pointer',
                                fontSize: 12, padding: '0 4px', lineHeight: 1,
                                fontFamily: 'inherit',
                              }}>×</button>
                    )}
                    {isProtectedSelfAdmin && (
                      <span title="Cannot revoke your own admin role" style={{
                        color: 'var(--ink-faint)', fontSize: 9, padding: '0 4px',
                        fontFamily: 'var(--font-mono)',
                      }}>🔒</span>
                    )}
                  </span>
                )
              })
            )}
            {missingRoles.length > 0 && (
              <button onClick={() => setShowAddRole(v => !v)} disabled={roleBusy}
                      style={{
                        ...extendBtn, padding: '2px 8px', fontSize: 10,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>+ Role</button>
            )}
            {showAddRole && (
              <>
                <div onClick={() => setShowAddRole(false)} style={{
                  position: 'fixed', inset: 0, zIndex: 250, background: 'transparent',
                }} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  zIndex: 260, minWidth: 140,
                  background: 'var(--paper-hi)', border: '1px solid var(--rule-strong)',
                  borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  padding: 4,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                    textTransform: 'uppercase', color: 'var(--ink-faint)',
                    padding: '6px 8px 4px',
                  }}>Grant role</div>
                  {missingRoles.map(r => (
                    <button key={r} onClick={() => handleGrantRole(r)} disabled={roleBusy}
                            style={popoverItemStyle}>
                      + {r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {editing ? (
            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Bank:</span>
              <select value={formBankId} onChange={e => setFormBankId(e.target.value)}
                      disabled={banks === null}
                      style={{ ...selectStyle, padding: '4px 10px', fontSize: 12 }}>
                <option value="">{banks === null ? 'Loading…' : 'Unassigned'}</option>
                {(banks || []).map(b => (
                  <option key={b.id} value={b.id}>{b.displayName || b.name || b.id}</option>
                ))}
              </select>
            </div>
          ) : (
            bank && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Bank: <strong>{bank.displayName || bank.id}</strong>
              </div>
            )
          )}
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }} title={fmtAbsolute(user.firstSeenAt)}>
            First seen {fmtRelative(user.firstSeenAt)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }} title={fmtAbsolute(user.lastSeenAt)}>
            Last seen {fmtRelative(user.lastSeenAt)}
          </div>
        </div>

        {/* v25.7.0.25 — role-change audit trail. Subtle, only renders when present. */}
        {user.lastRoleChangeAt && (
          <div style={{
            marginTop: 8, fontSize: 10.5, color: 'var(--ink-faint)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
          }} title={`${fmtAbsolute(user.lastRoleChangeAt)}${user.roleChangedByEmail ? ` by ${user.roleChangedByEmail}` : ''}`}>
            ↻ role last changed {fmtRelative(user.lastRoleChangeAt)}
            {user.roleChangedByEmail && <span> by {user.roleChangedByEmail}</span>}
          </div>
        )}

        {/* Save error / toast */}
        {saveErr && (
          <div style={{
            marginTop: 12, padding: '8px 12px', fontSize: 12,
            color: 'var(--danger)', background: 'rgba(220,38,38,0.08)',
            borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)',
          }}>{saveErr}</div>
        )}
        {toast && (
          <div style={{
            marginTop: 12, padding: '6px 12px', fontSize: 12,
            color: 'var(--success)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
          }}>✓ {toast}</div>
        )}

        {/* Editorial nudge — explains scope of edit mode (v25.7.0.25 update: roles are now editable, just outside edit mode) */}
        {editing && (
          <div style={{
            marginTop: 14, padding: '10px 12px', fontSize: 12,
            color: 'var(--ink-soft)', background: 'var(--paper)',
            borderRadius: 6, border: '1px solid var(--rule)', lineHeight: 1.5,
          }}>
            <strong>Email is not editable here.</strong> Auth0 owns email and overwrites
            it on every login. Roles are editable via the × / + Role affordances next to
            the role pills above — those changes round-trip to Auth0 and take effect
            on the user's next session.
          </div>
        )}
      </div>

      {/* Progress totals */}
      <DetailSection title="Progress">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatBox label="Scenarios completed" value={totals.scenariosCompleted || 0} />
          <StatBox label="Stages attempted"    value={totals.stagesAttempted    || 0} />
          <StatBox label="Quizzes answered"    value={totals.quizzesAnswered    || 0} />
          <StatBox
            label="Quiz accuracy"
            value={totals.quizzesAnswered
              ? `${Math.round(100 * (totals.correctAnswers || 0) / totals.quizzesAnswered)}%`
              : '—'}
            sub={totals.quizzesAnswered
              ? `${totals.correctAnswers || 0} of ${totals.quizzesAnswered} correct`
              : 'no answers yet'}
          />
        </div>
      </DetailSection>

      {/* Manager assignments — both directions */}
      <DetailSection title="Manager assignments">
        <div style={{ marginBottom: managers.length || isManager ? 14 : 0 }}>
          <div style={subLabelStyle}>Managed by</div>
          {managers.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No manager assigned.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {managers.map(m => (
                <span key={m.id} style={personPill}
                      title={m.assignedAt ? `Assigned ${fmtAbsolute(m.assignedAt)}` : ''}>
                  {m.name || m.email}
                </span>
              ))}
            </div>
          )}
        </div>
        {isManager && (
          <div>
            <div style={subLabelStyle}>Manages</div>
            {manages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                Has manager role but no direct reports assigned yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {manages.map(r => (
                  <span key={r.id} style={personPill}
                        title={r.assignedAt ? `Assigned ${fmtAbsolute(r.assignedAt)}` : ''}>
                    {r.name || r.email}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailSection>

      {/* Invite history — only if user came in via invite */}
      {invite && (
        <DetailSection title="Invite history">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
            <span style={fieldLabelStyle}>Invited</span>
            <span title={fmtAbsolute(invite.invitedAt)}>
              {fmtRelative(invite.invitedAt)}
              {invite.invitedByEmail && <span style={{ color: 'var(--ink-faint)' }}> by {invite.invitedByEmail}</span>}
            </span>
            <span style={fieldLabelStyle}>Roles granted</span>
            <span><RolePills roles={invite.roles} /></span>
            <span style={fieldLabelStyle}>Expires</span>
            <span title={invite.expiresAt ? fmtAbsolute(invite.expiresAt) : 'No expiration'}>
              {invite.expiresAt ? fmtRelative(invite.expiresAt) : <span style={{ color: 'var(--ink-faint)' }}>Never</span>}
            </span>
            <span style={fieldLabelStyle}>Logins</span>
            <span>
              {invite.useCount || 0}
              {invite.lastUsedAt && (
                <span style={{ color: 'var(--ink-faint)' }}> · last {fmtRelative(invite.lastUsedAt)}</span>
              )}
            </span>
            {invite.consumedAt && (
              <>
                <span style={fieldLabelStyle}>First login</span>
                <span title={fmtAbsolute(invite.consumedAt)}>{fmtRelative(invite.consumedAt)}</span>
              </>
            )}
            {invite.lastExtendedAt && (
              <>
                <span style={fieldLabelStyle}>Extended</span>
                <span title={fmtAbsolute(invite.lastExtendedAt)}>
                  {fmtRelative(invite.lastExtendedAt)}
                  {invite.extendedByEmail && <span style={{ color: 'var(--ink-faint)' }}> by {invite.extendedByEmail}</span>}
                </span>
              </>
            )}
            {invite.revokedAt && (
              <>
                <span style={fieldLabelStyle}>Revoked</span>
                <span style={{ color: 'var(--danger)' }} title={fmtAbsolute(invite.revokedAt)}>
                  {fmtRelative(invite.revokedAt)}
                </span>
              </>
            )}
            {invite.notes && (
              <>
                <span style={fieldLabelStyle}>Notes</span>
                <span style={{ color: 'var(--ink-soft)', fontStyle: 'italic' }}>{invite.notes}</span>
              </>
            )}
          </div>
        </DetailSection>
      )}

      {/* Completed scenarios */}
      {progress.completed.length > 0 && (
        <DetailSection title={`Completed scenarios (${progress.completed.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {progress.completed.map(s => (
              <div key={s.scenarioId} style={listRowStyle}>
                <div style={{ fontWeight: 500 }}>{s.title || s.scenarioId}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }} title={fmtAbsolute(s.completedAt)}>
                  {fmtRelative(s.completedAt)}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Recent stage attempts */}
      {progress.attempts.length > 0 && (
        <DetailSection title={`Recent stage attempts (${progress.attempts.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
            {progress.attempts.map((a, i) => (
              <div key={`${a.stageId}-${a.answeredAt}-${i}`} style={listRowStyle}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: a.correct ? 'var(--success)' : 'var(--danger)',
                    flexShrink: 0,
                  }}>{a.correct ? '✓' : '✗'}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.heading || a.stageId}
                    </div>
                    {a.scenarioTitle && (
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{a.scenarioTitle}</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}
                     title={fmtAbsolute(a.answeredAt)}>
                  {fmtRelative(a.answeredAt)}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Recent quiz answers */}
      {progress.quizAnswers.length > 0 && (
        <DetailSection title={`Recent quiz answers (${progress.quizAnswers.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
            {progress.quizAnswers.map((q, i) => (
              <div key={`${q.quizId}-${q.answeredAt}-${i}`} style={listRowStyle}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: q.correct ? 'var(--success)' : 'var(--danger)',
                    flexShrink: 0,
                  }}>{q.correct ? '✓' : '✗'}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.question || q.quizId}
                    </div>
                    {q.tacticId && (
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                        {q.tacticId}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}
                     title={fmtAbsolute(q.answeredAt)}>
                  {fmtRelative(q.answeredAt)}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Empty-state footer for users with literally no engagement yet */}
      {progress.completed.length === 0
       && progress.attempts.length === 0
       && progress.quizAnswers.length === 0 && (
        <div style={{
          padding: '20px 32px 28px', fontSize: 13,
          color: 'var(--ink-faint)', fontStyle: 'italic',
        }}>
          No engagement yet — this user has logged in but not attempted any
          scenarios, quiz questions, or stages.
        </div>
      )}
    </>
  )
}

function DetailSection({ title, children }) {
  return (
    <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--rule)' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12,
        fontWeight: 500,
      }}>{title}</div>
      {children}
    </div>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{
      padding: '12px 14px', background: 'var(--paper)',
      border: '1px solid var(--rule)', borderRadius: 6,
    }}>
      <div style={{
        fontSize: 22, fontWeight: 500, color: 'var(--ink)',
        fontFamily: 'var(--font-display)', lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 4,
        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

const subLabelStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: 'var(--ink-faint)',
  marginBottom: 6, fontWeight: 500,
}

const fieldLabelStyle = {
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ink-faint)',
  paddingTop: 2, fontWeight: 500,
}

const personPill = {
  display: 'inline-block', padding: '4px 10px', fontSize: 12,
  background: 'var(--paper)', color: 'var(--ink-soft)',
  border: '1px solid var(--rule)', borderRadius: 12,
}

const listRowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, padding: '8px 10px', background: 'var(--paper)',
  border: '1px solid var(--rule)', borderRadius: 6,
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
// v25.7.0.22 — extend/restore action trigger. Subtle by design: it's a
// recoverable, low-stakes action that pairs with Revoke in the same cell.
const extendBtn = {
  background: 'transparent', border: '1px solid var(--rule-strong)',
  color: 'var(--ink)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  padding: '4px 10px', borderRadius: 4, transition: 'background var(--dur) ease',
}
const popoverItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--ink)', borderRadius: 4,
}

// ============================================================================
// v25.7.0.1 (ISS-022): Manager assignments tab
//
// Admin-only UI for assigning a user with the manager role to manage one or
// more reports. Drives the :MANAGES edge populated by POST /api/banks/me/manages.
// Shows current bank members grouped by their manager(s); empty groups are
// "unassigned"; admin clicks "Assign" on an unassigned user to pick a manager.
// ============================================================================
function ManagersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [assignFor, setAssignFor] = useState(null)  // user id we're assigning
  const [toast, setToast]     = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api.getMyBankMembers()
      setMembers(d.members || [])
    } catch (e) {
      setError(e.message || 'Could not load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAssign(managerId, reportId) {
    try {
      await api.assignManager(managerId, reportId)
      setAssignFor(null)
      setToast({ kind: 'success', text: 'Manager assigned.' })
      load()
    } catch (e) {
      setToast({ kind: 'error', text: e.message || 'Assignment failed.' })
    }
    setTimeout(() => setToast(null), 4000)
  }

  async function handleRevoke(managerId, reportId) {
    if (!confirm('Revoke this manager assignment?')) return
    try {
      await api.revokeManager(managerId, reportId)
      setToast({ kind: 'success', text: 'Assignment revoked.' })
      load()
    } catch (e) {
      setToast({ kind: 'error', text: e.message || 'Revoke failed.' })
    }
    setTimeout(() => setToast(null), 4000)
  }

  // Bucket members: those with the manager role, those without
  const managers = useMemo(
    () => members.filter(m => (m.roles || []).includes('manager')).sort((a, b) => (a.email || '').localeCompare(b.email || '')),
    [members]
  )
  const reports = useMemo(
    () => members.filter(m => !(m.roles || []).includes('manager') && !(m.roles || []).includes('admin')),
    [members]
  )

  // Bucket reports by their assigned managers (or "unassigned")
  const grouped = useMemo(() => {
    const buckets = { unassigned: [] }
    for (const r of reports) {
      if (!r.managers || r.managers.length === 0) {
        buckets.unassigned.push(r)
      } else {
        for (const m of r.managers) {
          if (!buckets[m.id]) buckets[m.id] = { manager: m, reports: [] }
          buckets[m.id].reports.push(r)
        }
      }
    }
    return buckets
  }, [reports])

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}>Loading members…</div>
  if (error)   return <div style={{ padding: 30, color: 'var(--danger)' }}>Error: {error}</div>

  return (
    <div>
      <InfoCallout>
        Assignments here populate the <code style={codeStyle}>:MANAGES</code> graph
        edge that powers manager-side views and progress access. A user must
        have the <strong>manager</strong> role (set in Auth0) before they
        can be selected as an assignee here.
      </InfoCallout>

      {toast && (
        <div style={{
          padding: '10px 14px', marginBottom: 12,
          background: toast.kind === 'success' ? 'var(--success-bg, #e6f4ea)' : 'var(--danger-bg)',
          color: toast.kind === 'success' ? 'var(--success)' : 'var(--danger)',
          borderRadius: 6, fontSize: 13,
        }}>{toast.text}</div>
      )}

      {/* Unassigned users — most actionable, surface first */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>
          Unassigned users <span style={{ color: 'var(--ink-faint)', fontWeight: 400, fontSize: 13 }}>
            ({grouped.unassigned.length})
          </span>
        </h3>
        {grouped.unassigned.length === 0 ? (
          <div style={{ padding: 14, color: 'var(--ink-soft)', fontSize: 13, fontStyle: 'italic' }}>
            All users have at least one manager assignment.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 8 }}>
            {grouped.unassigned.map((u, i) => (
              <UnassignedRow
                key={u.id}
                user={u}
                managers={managers}
                expanded={assignFor === u.id}
                onToggle={() => setAssignFor(assignFor === u.id ? null : u.id)}
                onAssign={(managerId) => handleAssign(managerId, u.id)}
                isLast={i === grouped.unassigned.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manager → reports listing */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>
          Manager assignments <span style={{ color: 'var(--ink-faint)', fontWeight: 400, fontSize: 13 }}>
            ({managers.length} manager{managers.length === 1 ? '' : 's'})
          </span>
        </h3>
        {managers.length === 0 ? (
          <div style={{ padding: 14, color: 'var(--ink-soft)', fontSize: 13, fontStyle: 'italic' }}>
            No users with the manager role found in this bank. Assign the manager
            role in Auth0 first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {managers.map(m => {
              const bucket = grouped[m.id]
              return (
                <ManagerCard
                  key={m.id}
                  manager={m}
                  reports={bucket ? bucket.reports : []}
                  onRevoke={(reportId) => handleRevoke(m.id, reportId)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function UnassignedRow({ user, managers, expanded, onToggle, onAssign, isLast }) {
  const [pickedMgr, setPickedMgr] = useState('')
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--rule)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 16px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{user.email}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
            {(user.roles || []).join(', ') || 'no roles'} · {user.bankName}
          </div>
        </div>
        <button onClick={onToggle} style={secondaryBtn}>
          {expanded ? 'Cancel' : 'Assign manager'}
        </button>
      </div>
      {expanded && (
        <div style={{
          padding: '12px 16px 16px', background: 'var(--paper-dim)',
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <select
            value={pickedMgr}
            onChange={e => setPickedMgr(e.target.value)}
            style={{ ...selectStyle, flex: 1 }}
          >
            <option value="">— Select a manager —</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.email}</option>
            ))}
          </select>
          <button
            disabled={!pickedMgr}
            onClick={() => { onAssign(pickedMgr); setPickedMgr('') }}
            style={{
              ...primaryBtn,
              opacity: pickedMgr ? 1 : 0.5,
              cursor: pickedMgr ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

function ManagerCard({ manager, reports, onRevoke }) {
  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 8,
      background: 'var(--paper-hi)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: reports.length > 0 ? '1px solid var(--rule)' : 'none',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{manager.email}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {reports.length} direct report{reports.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      {reports.length > 0 && (
        <div>
          {reports.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              borderBottom: i < reports.length - 1 ? '1px solid var(--rule)' : 'none',
            }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                {r.email}
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-soft)' }}>
                  ({(r.roles || []).join(', ')})
                </span>
              </div>
              <button
                onClick={() => onRevoke(r.id)}
                style={dangerLinkBtn}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
