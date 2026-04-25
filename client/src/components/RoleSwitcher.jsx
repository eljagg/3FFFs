import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ROLES, useUser } from '../lib/user.jsx'

/* -------------------------------------------------------------------------
   RoleSwitcher — small dropdown that opens from the nav role pill.

   Behavior depends on whether the user is admin:
   - Non-admin: shows "Change role" — switching their actual role (persists
     to localStorage AND server User.role + roleHistory).
   - Admin: shows two sections:
       - "Simulate as" — sets simulateRole (sessionStorage only, doesn't
         touch their actual role)
       - "Stop simulating" — clears simulateRole back to admin-default view

   Closes on outside click, Escape key, or selection.
------------------------------------------------------------------------- */

export default function RoleSwitcher({ isAdmin, onClose }) {
  const { role, simulateRole, chooseRole, setSimulateRole, clearSimulateRole } = useUser()
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function pickRole(roleId) {
    if (isAdmin) {
      setSimulateRole(roleId)
    } else {
      chooseRole(roleId)
    }
    onClose()
  }

  function stopSim() {
    clearSimulateRole()
    onClose()
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        zIndex: 100,
        minWidth: 280,
        background: 'var(--paper)',
        border: '1px solid var(--rule-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        padding: 8,
      }}
      role="menu"
    >
      <div style={{
        padding: '8px 10px',
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', fontWeight: 600,
      }}>
        {isAdmin ? 'Simulate as job role' : 'Change your role'}
      </div>
      {ROLES.map(r => {
        const selected = isAdmin ? simulateRole === r.id : role === r.id
        return (
          <button
            key={r.id}
            onClick={() => pickRole(r.id)}
            role="menuitem"
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 12px',
              background: selected ? 'var(--paper-hi)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius)',
              cursor: 'pointer', color: 'var(--ink)',
              transition: 'background var(--dur) ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = selected ? 'var(--paper-hi)' : 'transparent' }}
          >
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span>{r.label}</span>
              {selected && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                  color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600,
                }}>{isAdmin ? 'Active sim' : 'Current'}</span>
              )}
            </div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.4,
            }}>{r.blurb}</div>
          </button>
        )
      })}
      {isAdmin && simulateRole && (
        <>
          <div style={{ height: 1, background: 'var(--rule)', margin: '6px 8px' }} />
          <button
            onClick={stopSim}
            role="menuitem"
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 12px',
              background: 'transparent', border: 'none', borderRadius: 'var(--radius)',
              cursor: 'pointer', color: 'var(--ink-soft)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            ↺ Stop simulating — back to admin view (all scenarios)
          </button>
        </>
      )}
    </motion.div>
  )
}
