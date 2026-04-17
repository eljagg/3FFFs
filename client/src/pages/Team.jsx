import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

function fmtRelativeTime(ts) {
  if (!ts) return '—'
  const diffMs = Date.now() - Number(ts)
  const h = diffMs / 3_600_000
  if (h < 1)   return 'just now'
  if (h < 24)  return `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function statusFor(row) {
  if (!row.lastSeenAt) return { label: 'Never',       color: 'var(--danger)' }
  const days = (Date.now() - Number(row.lastSeenAt)) / 86_400_000
  if (days > 30) return { label: 'Falling behind', color: 'var(--danger)' }
  if (days > 14) return { label: 'At risk',        color: 'var(--warning)' }
  if (days > 7)  return { label: 'Inactive',       color: 'var(--ink-faint)' }
  return           { label: 'Active',          color: 'var(--success)' }
}

export default function Team() {
  const [team, setTeam]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.getTeamProgress()
      .then(r => setTeam(r.team || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const summary = {
    total:       team.length,
    active:      team.filter(r => statusFor(r).label === 'Active').length,
    atRisk:      team.filter(r => statusFor(r).label === 'At risk').length,
    fallingBehind: team.filter(r => statusFor(r).label === 'Falling behind' || statusFor(r).label === 'Never').length,
  }

  if (loading) {
    return (
      <Page eyebrow="Team" title="Loading team progress…" />
    )
  }

  if (error) {
    return (
      <Page eyebrow="Team" title="Can't load team data" lede={error} />
    )
  }

  return (
    <Page
      eyebrow="Team"
      title="How your team is doing."
      lede="See who's active, who's at risk, and who may need a nudge."
    >
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total trainees',    value: summary.total,        color: 'var(--ink)' },
          { label: 'Active this week',  value: summary.active,       color: 'var(--success)' },
          { label: 'At risk',           value: summary.atRisk,       color: 'var(--warning)' },
          { label: 'Falling behind',    value: summary.fallingBehind,color: 'var(--danger)' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              padding: '20px 22px',
              background: 'var(--paper-hi)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              borderLeft: `3px solid ${stat.color}`,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 40,
              fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em',
              color: stat.color, marginBottom: 6,
            }}>{stat.value}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {team.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: 'var(--paper-hi)',
          border: '1px dashed var(--rule-strong)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--ink-faint)',
        }}>
          No team members yet. Trainees will appear here after their first login.
        </div>
      ) : (
        <div style={{
          background: 'var(--paper-hi)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr',
            gap: 16, padding: '14px 22px',
            background: 'var(--paper-dim)',
            borderBottom: '1px solid var(--rule)',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--ink-faint)',
          }}>
            <div>User</div>
            <div>Status</div>
            <div>Scenarios</div>
            <div>Quizzes</div>
            <div>Correct</div>
            <div>Last seen</div>
          </div>
          {team.map((row, i) => {
            const status = statusFor(row)
            const correctRate = row.quizzesAnswered > 0
              ? Math.round((row.correctAnswers / row.quizzesAnswered) * 100)
              : null
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr',
                  gap: 16, padding: '16px 22px',
                  borderBottom: i < team.length - 1 ? '1px solid var(--rule)' : 'none',
                  alignItems: 'center',
                  transition: 'background var(--dur)',
                }}
                whileHover={{ backgroundColor: 'var(--paper-dim)' }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--ink)' }}>
                    {row.name || (row.email || '').split('@')[0]}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{row.email}</div>
                </div>
                <div>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 4,
                    border: '1px solid', borderColor: status.color, color: status.color,
                  }}>{status.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>
                  {row.scenariosCompleted || 0}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>
                  {row.quizzesAnswered || 0}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: correctRate !== null ? 'var(--ink)' : 'var(--ink-faint)' }}>
                  {correctRate !== null ? `${correctRate}%` : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                  {fmtRelativeTime(row.lastSeenAt)}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
