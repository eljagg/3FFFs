import { NavLink, Outlet } from 'react-router-dom'
import { useUser, ROLES } from '../lib/user.jsx'

const NAV = [
  { to: '/',             label: 'Home',        end: true },
  { to: '/scenarios',    label: 'Scenarios' },
  { to: '/framework',    label: 'Framework' },
  { to: '/quiz',         label: 'Quiz' },
  { to: '/tutor',        label: 'Tutor' },
]

export default function AppShell() {
  const { role, clearRole, progress } = useUser()
  const roleLabel = ROLES.find(r => r.id === role)?.label || 'Trainee'

  const styles = {
    wrap: { display: 'flex', flexDirection: 'column', flex: 1 },
    header: {
      borderBottom: '1px solid var(--rule)',
      padding: '18px 0',
      background: 'var(--paper-hi)',
    },
    inner: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    },
    brand: { display: 'flex', alignItems: 'baseline', gap: 14 },
    brandMark: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1,
    },
    brandSub: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)',
      borderLeft: '1px solid var(--rule-strong)',
      paddingLeft: 14,
    },
    navRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
    },
    navLink: ({ isActive }) => ({
      fontSize: 13,
      fontWeight: 500,
      padding: '8px 14px',
      borderRadius: 6,
      color: isActive ? 'var(--paper-hi)' : 'var(--ink-soft)',
      background: isActive ? 'var(--ink)' : 'transparent',
      transition: 'all var(--dur) ease',
      textDecoration: 'none',
    }),
    roleChip: {
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--ink-faint)',
      padding: '6px 10px 6px 14px',
      border: '1px solid var(--rule)',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    clearBtn: {
      fontSize: 14,
      color: 'var(--ink-faint)',
      padding: 0,
      lineHeight: 1,
    },
    main: { flex: 1, width: '100%' },
    footer: {
      marginTop: 60,
      padding: '24px 28px',
      borderTop: '1px solid var(--rule)',
      fontSize: 12,
      color: 'var(--ink-faint)',
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em',
    },
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div style={styles.inner}>
          <div style={styles.brand}>
            <span style={styles.brandMark}>3fffs<span style={{ color: 'var(--accent)' }}>.</span></span>
            <span style={styles.brandSub}>Fight Fraud Framework Training</span>
          </div>

          <nav style={styles.navRow}>
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} style={styles.navLink}>
                {item.label}
              </NavLink>
            ))}
            {role && (
              <div style={styles.roleChip}>
                <span>{roleLabel}</span>
                <button onClick={clearRole} style={styles.clearBtn} aria-label="Change role">×</button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>

      <footer style={styles.footer}>
        Built on MITRE Fight Fraud Framework™ — CTID · April 2026 · data loaded from Neo4j graph
      </footer>
    </div>
  )
}
