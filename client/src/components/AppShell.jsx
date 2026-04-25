import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { AnimatePresence } from 'framer-motion'
import { useTheme } from '../lib/theme.jsx'
import { useUser, ROLES } from '../lib/user.jsx'
import UserMenu from './UserMenu.jsx'
import RoleSwitcher from './RoleSwitcher.jsx'

const NAMESPACE = 'https://3fffs.app'

const BASE_NAV = [
  { to: '/',          label: 'Home',      end: true },
  { to: '/scenarios', label: 'Scenarios' },
  { to: '/coverage',  label: 'My Coverage' },
  { to: '/matrix',    label: 'Matrix' },
  { to: '/explorer',  label: 'Explorer' },
  { to: '/framework', label: 'Framework' },
  { to: '/play',      label: 'Play' },
  { to: '/quiz',      label: 'Quiz' },
  { to: '/tutor',     label: 'Tutor' },
]

function SunIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
}
function MoonIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
}

export default function AppShell() {
  const { theme, toggle } = useTheme()
  const { user } = useAuth0()
  const { role, simulateRole, effectiveRole } = useUser()
  const roles = user?.[`${NAMESPACE}/roles`] || []
  const canSeeTeam = roles.includes('manager') || roles.includes('admin')
  const isAdmin = roles.includes('admin')

  // v25.3.1: role pill state
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)
  const activeRoleId = isAdmin ? simulateRole : role
  const activeRoleObj = ROLES.find(r => r.id === activeRoleId)
  // Short label for the pill — uses the part before any space or slash
  // ("Frontline / teller" -> "TELLER", "Risk manager / exec" -> "EXEC")
  const pillLabel = activeRoleObj
    ? activeRoleObj.id.toUpperCase()
    : (isAdmin ? 'ALL' : 'NONE')

  let NAV = BASE_NAV
  if (canSeeTeam) NAV = [...NAV, { to: '/team', label: 'Team' }]
  if (isAdmin)    NAV = [...NAV, { to: '/admin/users', label: 'Admin' }]
  // Debug temporarily visible to all authenticated users during debugging
  NAV = [...NAV, { to: '/debug', label: 'Debug' }]

  const s = {
    wrap: { display: 'flex', flexDirection: 'column', flex: 1 },
    header: { borderBottom: '1px solid var(--rule)', padding: '16px 0', background: 'var(--paper-hi)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' },
    inner: { maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
    brand: { display: 'flex', alignItems: 'baseline', gap: 14 },
    brandMark: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 },
    brandSub: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-faint)', borderLeft: '1px solid var(--rule-strong)', paddingLeft: 14 },
    navRow: { display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' },
    navLink: ({ isActive }) => ({
      fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 6,
      color: isActive ? 'var(--paper-hi)' : 'var(--ink-soft)',
      background: isActive ? 'var(--ink)' : 'transparent',
      transition: 'all var(--dur) ease', textDecoration: 'none',
    }),
    themeBtn: {
      width: 32, height: 32, margin: '0 10px 0 6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, color: 'var(--ink-soft)',
      border: '1px solid var(--rule)', background: 'transparent',
      transition: 'all var(--dur) ease',
    },
    rolePill: {
      // v25.3.1: small monospace pill in the nav showing what role the user
      // is seeing the app as. Click to open RoleSwitcher.
      position: 'relative',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 32, padding: '0 10px', marginRight: 8,
      borderRadius: 6, border: '1px solid var(--rule)',
      background: simulateRole ? 'var(--accent-bg, var(--paper-dim))' : 'transparent',
      borderColor: simulateRole ? 'var(--accent)' : 'var(--rule)',
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
      fontWeight: 600, color: simulateRole ? 'var(--accent)' : 'var(--ink-soft)',
      cursor: 'pointer',
      transition: 'all var(--dur) ease',
    },
    main: { flex: 1, width: '100%' },
    footer: { marginTop: 60, padding: '24px 28px', borderTop: '1px solid var(--rule)', fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' },
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div style={s.inner}>
          <div style={s.brand}>
            <span style={s.brandMark}>3fffs<span style={{ color: 'var(--accent)' }}>.</span></span>
            <span style={s.brandSub}>Fight Fraud Framework Training</span>
          </div>
          <nav style={s.navRow}>
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} style={s.navLink}>
                {item.label}
              </NavLink>
            ))}
            <button onClick={toggle} aria-label="Toggle theme" style={s.themeBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink-soft)' }}>
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            {/* v25.3.1: role pill — shows current effective role, click to open switcher */}
            <button
              onClick={() => setRoleSwitcherOpen(o => !o)}
              aria-label={`Current role: ${activeRoleObj?.label || 'None'}. Click to change.`}
              aria-expanded={roleSwitcherOpen}
              style={s.rolePill}
              onMouseEnter={(e) => {
                if (!simulateRole) {
                  e.currentTarget.style.borderColor = 'var(--ink)'
                  e.currentTarget.style.color = 'var(--ink)'
                }
              }}
              onMouseLeave={(e) => {
                if (!simulateRole) {
                  e.currentTarget.style.borderColor = 'var(--rule)'
                  e.currentTarget.style.color = 'var(--ink-soft)'
                }
              }}
            >
              <span>ROLE: {pillLabel}</span>
              {simulateRole && <span style={{ fontSize: 9 }}>• SIM</span>}
              <AnimatePresence>
                {roleSwitcherOpen && (
                  <RoleSwitcher
                    isAdmin={isAdmin}
                    onClose={() => setRoleSwitcherOpen(false)}
                  />
                )}
              </AnimatePresence>
            </button>
            <UserMenu />
          </nav>
        </div>
      </header>
      <main style={s.main}><Outlet /></main>
      <footer style={s.footer}>
        Data: MITRE Fight Fraud Framework™ v1 · CTID April 2026
      </footer>
    </div>
  )
}
