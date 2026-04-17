import { useUser, ROLES } from '../lib/user.jsx'

export default function RolePicker() {
  const { chooseRole } = useUser()

  const styles = {
    wrap: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 28px',
      background: 'var(--paper)',
    },
    inner: { maxWidth: 640, width: '100%' },
    eyebrow: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      color: 'var(--ink-faint)',
      marginBottom: 18,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    eyebrowBar: {
      width: 28, height: 1, background: 'var(--ink-faint)',
    },
    title: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(34px, 5vw, 52px)',
      fontWeight: 500,
      lineHeight: 1.05,
      letterSpacing: '-0.02em',
      marginBottom: 18,
    },
    titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
    sub: {
      fontSize: 16,
      color: 'var(--ink-soft)',
      maxWidth: 500,
      marginBottom: 40,
      lineHeight: 1.6,
    },
    question: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--ink-faint)',
      marginBottom: 14,
    },
    grid: { display: 'grid', gap: 10 },
    card: {
      textAlign: 'left',
      padding: '18px 22px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all var(--dur) ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      width: '100%',
    },
    cardLabel: {
      fontFamily: 'var(--font-display)',
      fontSize: 19,
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },
    cardBlurb: {
      fontSize: 13,
      color: 'var(--ink-faint)',
      marginTop: 2,
    },
    arrow: {
      fontFamily: 'var(--font-mono)',
      fontSize: 18,
      color: 'var(--ink-faint)',
      transition: 'transform var(--dur) ease, color var(--dur) ease',
    },
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        <div style={styles.eyebrow}>
          <span style={styles.eyebrowBar} />
          <span>3fffs — Training Platform</span>
        </div>
        <h1 style={styles.title} className="fade-up">
          Fight fraud<br />
          with a <span style={styles.titleAccent}>shared language</span>.
        </h1>
        <p style={styles.sub} className="fade-up-1">
          Interactive training for financial institutions, grounded in the MITRE Fight Fraud Framework —
          the first behavior-based taxonomy of cyber-enabled financial crime, released by MITRE CTID in April 2026.
        </p>

        <div style={styles.question} className="fade-up-2">Choose your role to begin</div>

        <div style={styles.grid} className="fade-up-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => chooseRole(r.id)}
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
              <div>
                <div style={styles.cardLabel}>{r.label}</div>
                <div style={styles.cardBlurb}>{r.blurb}</div>
              </div>
              <span data-arrow style={styles.arrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
