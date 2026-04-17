import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

const SEVERITY_COLORS = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }

export default function Scenarios() {
  const { role } = useUser()
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    api.listScenarios(role)
      .then(r => setScenarios(r.scenarios || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [role])

  if (loading) return <Page eyebrow="Scenarios" title="Loading…" />
  if (error)   return <Page eyebrow="Scenarios" title="Couldn't load scenarios" lede={error} />

  return (
    <Page
      eyebrow="Scenarios"
      title="Walk through the attacks."
      lede="Each scenario is a real attack pattern drawn from the F3 framework. You'll navigate the attacker's path stage by stage, spot the signals, and pick the right controls."
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {scenarios.map((sc, i) => {
          const severityColor = SEVERITY_COLORS[sc.severity] || 'var(--ink)'
          return (
            <motion.button
              key={sc.id}
              onClick={() => navigate(`/scenarios/${sc.id}`)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2, borderColor: 'var(--ink)' }}
              style={{
                textAlign: 'left', width: '100%',
                padding: '24px 26px',
                background: 'var(--paper-hi)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'border-color var(--dur)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '3px 8px', border: '1px solid', borderColor: severityColor,
                  color: severityColor, borderRadius: 4,
                }}>{sc.severity}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)',
                }}>{sc.stageCount} stages</span>
                {sc.estimatedLoss && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                    ~${(sc.estimatedLoss / 1_000_000).toFixed(2)}M loss
                  </span>
                )}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
                lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 8,
              }}>{sc.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 720 }}>
                {sc.summary}
              </p>
              <div style={{
                marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
              }}>
                Start scenario <span>→</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {scenarios.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
          borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
        }}>
          No scenarios match your role yet. Check back soon.
        </div>
      )}
    </Page>
  )
}
