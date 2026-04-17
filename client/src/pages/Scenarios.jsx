import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

export default function Scenarios() {
  const { role, progress } = useUser()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getScenarios(role)
      .then((d) => setScenarios(d.scenarios))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [role])

  const completedIds = new Set(progress?.completedScenarios || [])

  const styles = {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 14,
    },
    card: {
      display: 'flex',
      flexDirection: 'column',
      padding: '26px 28px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all var(--dur) ease',
      textDecoration: 'none',
      color: 'inherit',
      position: 'relative',
    },
    sevRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    sev: (severity) => ({
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: '3px 8px',
      borderRadius: 3,
      background: severity === 'high' ? 'var(--danger-bg)' : 'var(--warning-bg)',
      color:      severity === 'high' ? 'var(--danger)'    : 'var(--warning)',
    }),
    loss: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--ink-faint)',
    },
    title: {
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      fontWeight: 500,
      letterSpacing: '-0.015em',
      lineHeight: 1.25,
      marginBottom: 10,
    },
    summary: {
      fontSize: 13.5,
      color: 'var(--ink-soft)',
      lineHeight: 1.55,
      marginBottom: 16,
      flex: 1,
    },
    tactics: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      paddingTop: 16,
      borderTop: '1px solid var(--rule)',
    },
    tactic: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 3,
      background: 'var(--paper-dim)',
      color: 'var(--ink-faint)',
    },
    done: {
      position: 'absolute',
      top: 14, right: 16,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--success)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    empty: {
      padding: '60px 20px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
      fontSize: 14,
    },
  }

  if (error) {
    return (
      <Page eyebrow="Error" title="Could not load scenarios" lede={error}>
        <div style={styles.empty}>Check that the backend is running and the database is seeded.</div>
      </Page>
    )
  }

  return (
    <Page
      eyebrow="Simulations"
      title="Walk through real fraud cases."
      lede="Each scenario unfolds across its F3 tactics. You'll make a decision at every stage and see why it matters. Cases are filtered to your role when relevant."
    >
      {loading && <div style={styles.empty}>Loading scenarios from graph…</div>}

      {!loading && scenarios.length === 0 && (
        <div style={styles.empty}>No scenarios match your role. Try a different role from the header.</div>
      )}

      <div style={styles.grid}>
        {scenarios.map((s) => (
          <Link
            key={s.id}
            to={`/scenarios/${s.id}`}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--ink)'
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--rule)'
              e.currentTarget.style.background = 'var(--paper-hi)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {completedIds.has(s.id) && <div style={styles.done}>✓ Completed</div>}
            <div style={styles.sevRow}>
              <span style={styles.sev(s.severity)}>{s.severity} risk</span>
              <span style={styles.loss}>${(s.estimatedLoss / 1000).toFixed(0)}k loss</span>
            </div>
            <h2 style={styles.title}>{s.title}</h2>
            <p style={styles.summary}>{s.summary}</p>
            <div style={styles.tactics}>
              {(s.tactics || []).map((t) => <span key={t} style={styles.tactic}>{t}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </Page>
  )
}
