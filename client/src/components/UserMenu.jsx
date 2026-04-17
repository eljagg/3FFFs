import { useAuth0 } from '@auth0/auth0-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NAMESPACE = 'https://3fffs.app'

function initials(name, email) {
  const src = (name || email || '??').trim()
  const parts = src.split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export default function UserMenu() {
  const { user, logout } = useAuth0()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const roles = user?.[`${NAMESPACE}/roles`] || []
  const primary = roles.includes('admin') ? 'admin' : roles.includes('manager') ? 'manager' : 'trainee'

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const roleColor = { admin: 'var(--accent)', manager: 'var(--warning)', trainee: 'var(--ink-faint)' }[primary]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 4px 4px 12px', border: '1px solid var(--rule)',
          borderRadius: 999, background: 'var(--paper-hi)',
          cursor: 'pointer', transition: 'border-color var(--dur)',
        }}
        aria-haspopup="menu" aria-expanded={open}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: roleColor,
        }}>{primary}</span>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--ink)', color: 'var(--paper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13,
        }}>
          {initials(user?.name, user?.email)}
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="menu"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 260, background: 'var(--paper-hi)',
              border: '1px solid var(--rule-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              overflow: 'hidden', zIndex: 200,
            }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--ink)' }}>
                {user?.name || (user?.email || '').split('@')[0]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', wordBreak: 'break-all' }}>
                {user?.email}
              </div>
              {roles.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {roles.map(r => (
                    <span key={r} style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 3,
                      border: '1px solid',
                      borderColor: r === primary ? roleColor : 'var(--rule)',
                      color: r === primary ? roleColor : 'var(--ink-faint)',
                    }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              style={{
                width: '100%', padding: '12px 18px', fontSize: 13,
                textAlign: 'left', background: 'transparent',
                color: 'var(--ink-soft)', cursor: 'pointer',
                transition: 'background var(--dur)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
