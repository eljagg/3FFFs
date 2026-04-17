import { Link } from 'react-router-dom'
import Page from '../components/Page.jsx'
import { useUser, ROLES } from '../lib/user.jsx'

export default function Home() {
  const { role, progress } = useUser()
  const roleData = ROLES.find(r => r.id === role)
  const roleLabel = roleData?.label || 'Trainee'

  const completed  = progress?.completedScenarios?.length || 0
  const attempts   = progress?.quizAttempts || 0
  const accuracy   = progress?.quizAccuracy || 0

  const styles = {
    welcome: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(24px, 3vw, 30px)',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.015em',
      marginBottom: 8,
    },
    welcomeRole: { color: 'var(--accent)', fontStyle: 'italic' },
    greeting: {
      fontSize: 15,
      color: 'var(--ink-soft)',
      marginBottom: 36,
      maxWidth: 640,
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 1,
      background: 'var(--rule)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 48,
    },
    stat: { background: 'var(--paper-hi)', padding: '22px 24px' },
    statLabel: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--ink-faint)',
      marginBottom: 10,
    },
    statValue: {
      fontFamily: 'var(--font-display)',
      fontSize: 38,
      fontWeight: 500,
      lineHeight: 1,
      letterSpacing: '-0.02em',
    },
    statSub: {
      fontSize: 12,
      color: 'var(--ink-faint)',
      marginTop: 6,
    },
    sectionTitle: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--ink-faint)',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    titleBar: { width: 28, height: 1, background: 'var(--ink-faint)' },
    cards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 14,
    },
    card: {
      display: 'block',
      padding: '24px 26px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all var(--dur) ease',
      textDecoration: 'none',
      color: 'inherit',
      position: 'relative',
    },
    cardNum: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--accent)',
      marginBottom: 18,
      letterSpacing: '0.08em',
    },
    cardTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      fontWeight: 500,
      letterSpacing: '-0.015em',
      marginBottom: 8,
    },
    cardText: { fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 },
    cardArrow: {
      position: 'absolute',
      top: 24, right: 26,
      fontFamily: 'var(--font-mono)',
      fontSize: 16,
      color: 'var(--ink-faint)',
      transition: 'transform var(--dur) ease, color var(--dur) ease',
    },
  }

  const activities = [
    { to: '/scenarios', num: '01', title: 'Scenario simulations',
      text: 'Walk through real fraud cases stage by stage. Make decisions at each F3 tactic phase and see the consequences.' },
    { to: '/framework', num: '02', title: 'Framework encyclopedia',
      text: 'Searchable reference for all 7 F3 tactics and 22 techniques, linked to the scenarios that use them.' },
    { to: '/quiz',      num: '03', title: 'Knowledge checks',
      text: 'Short adaptive questions that surface gaps in your F3 understanding. Calibrated to your role.' },
    { to: '/tutor',     num: '04', title: 'AI tutor',
      text: 'Ask questions in plain language. Answers are grounded in the live F3 graph and tailored to your role.' },
  ]

  return (
    <Page
      eyebrow="Welcome back"
      title={<>Good to see you.<br /><span style={styles.welcomeRole}>{roleLabel}.</span></>}
    >
      <p style={styles.greeting}>
        {!role || completed === 0
          ? 'Start with a scenario — these are the fastest way to build intuition for how fraud actually unfolds.'
          : `You've completed ${completed} scenario${completed === 1 ? '' : 's'} so far. Keep going — fraud evolves, and so should we.`}
      </p>

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Scenarios completed</div>
          <div style={styles.statValue}>{completed}</div>
          <div style={styles.statSub}>of 3 available</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Quiz accuracy</div>
          <div style={styles.statValue}>{attempts ? accuracy + '%' : '—'}</div>
          <div style={styles.statSub}>{attempts} attempt{attempts === 1 ? '' : 's'}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>F3 tactics covered</div>
          <div style={styles.statValue}>7</div>
          <div style={styles.statSub}>Reconnaissance → Monetization</div>
        </div>
      </div>

      <div style={styles.sectionTitle}><span style={styles.titleBar}/> Training activities</div>

      <div style={styles.cards}>
        {activities.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--ink)'
              e.currentTarget.style.background = '#fff'
              e.currentTarget.querySelector('[data-arrow]').style.transform = 'translateX(4px)'
              e.currentTarget.querySelector('[data-arrow]').style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)'
              e.currentTarget.style.background = 'var(--paper-hi)'
              e.currentTarget.querySelector('[data-arrow]').style.transform = 'translateX(0)'
              e.currentTarget.querySelector('[data-arrow]').style.color = 'var(--ink-faint)'
            }}
          >
            <div style={styles.cardNum}>{a.num}</div>
            <div style={styles.cardTitle}>{a.title}</div>
            <div style={styles.cardText}>{a.text}</div>
            <span data-arrow style={styles.cardArrow}>→</span>
          </Link>
        ))}
      </div>
    </Page>
  )
}
