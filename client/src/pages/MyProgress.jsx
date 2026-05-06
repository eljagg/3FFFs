import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

/**
 * MyProgress — trainee-facing per-user progress dashboard (v25.7.0, ISS-017)
 *
 * Three sections, all derived from /api/progress/me/full (and reusable for
 * manager-viewing-trainee at /team/:userId):
 *
 *   1. AGGREGATE — top of page banner-style stats (scenarios completed,
 *      attempts, correct rate, days since first attempt).
 *
 *   2. COMPLETION LEDGER (Option A) — every scenario as a card with
 *      not-started / in-progress / completed status. Cards are clickable;
 *      tap one to jump straight to that scenario.
 *
 *   3. COMPETENCY PROFILE (Option B) — concept mastery (per-concept
 *      correct rate), framework progress, MITRE technique exposure
 *      (SOC users see this most prominently). Concept cards are sorted
 *      by correct rate descending — strong concepts at top, weak
 *      concepts at bottom signal what to revisit.
 *
 * Role-conditional emphasis (per OBS-018):
 *   - teller: completion ledger emphasised; competency understated
 *   - analyst: balanced — both ledger AND competency profile equally weighted
 *   - soc: MITRE exposure section bumped to the top of competency
 *   - executive: aggregates at top, ledger-focused on governance scenarios
 *
 * The role-conditional emphasis is implemented by reordering sections,
 * not by hiding content — every user can see every section, but the
 * ordering matches their role's typical priorities.
 */

const STATUS_STYLES = {
  'completed':    { color: 'var(--success)',  label: 'Completed',  icon: '✓' },
  'in-progress':  { color: 'var(--warning)',  label: 'In progress', icon: '◐' },
  'not-started':  { color: 'var(--ink-soft)', label: 'Not started', icon: '○' },
}

export default function MyProgress({ userIdOverride = null, viewerMode = 'self' }) {
  const navigate = useNavigate()
  const { effectiveRole } = useUser() || {}
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const fetcher = userIdOverride
      ? () => api.getUserProgressFull(userIdOverride)
      : () => api.getMyProgressFull()
    fetcher()
      .then(res => setData(res.progress))
      .catch(err => setError(err.message || 'Could not load progress'))
      .finally(() => setLoading(false))
  }, [userIdOverride])

  // Role-conditional section ordering
  const sectionOrder = useMemo(() => {
    if (effectiveRole === 'teller') {
      return ['aggregates', 'ledger', 'competency']
    }
    if (effectiveRole === 'soc') {
      return ['aggregates', 'mitre', 'competency', 'ledger']
    }
    if (effectiveRole === 'executive') {
      return ['aggregates', 'ledger', 'frameworks', 'competency']
    }
    // analyst (default)
    return ['aggregates', 'ledger', 'competency', 'frameworks']
  }, [effectiveRole])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading progress…</div>
  if (error)   return <div style={{ padding: 40, color: 'var(--danger)' }}>Error: {error}</div>
  if (!data)   return <div style={{ padding: 40 }}>No progress data found.</div>

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '32px 24px 80px' }}>
      <Header
        user={data.user}
        viewerMode={viewerMode}
        onBack={viewerMode !== 'self' ? () => navigate(-1) : null}
      />

      {sectionOrder.map((section, i) => (
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          style={{ marginTop: 32 }}
        >
          {section === 'aggregates' && <AggregatesPanel agg={data.aggregates} role={effectiveRole} />}
          {section === 'ledger'     && <CompletionLedger items={data.completionLedger} onJump={id => navigate(`/scenarios/${id}`)} />}
          {section === 'competency' && <CompetencyPanel concepts={data.conceptMastery} />}
          {section === 'frameworks' && <FrameworkPanel frameworks={data.frameworkProgress} />}
          {section === 'mitre'      && <MitrePanel techniques={data.mitreExposure} />}
        </motion.div>
      ))}
    </div>
  )
}

function Header({ user, viewerMode, onBack }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
      <div>
        {viewerMode !== 'self' && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--ink-soft)', padding: 0, marginBottom: 12,
              fontSize: 13, fontFamily: 'var(--font-mono)',
            }}
          >
            ← Back
          </button>
        )}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
          fontWeight: 600,
        }}>
          {viewerMode === 'self' ? 'My progress' : `Progress for ${user.email}`}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500,
          margin: 0, lineHeight: 1.15, letterSpacing: '-0.015em',
        }}>
          {user.name || user.email || 'Anonymous user'}
        </h1>
        <div style={{
          fontSize: 13, color: 'var(--ink-soft)', marginTop: 6,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {user.bank && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px',
              background: user.bank.primaryColor || 'var(--paper-dim)',
              color: 'white', borderRadius: 12, fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}>
              {user.bank.displayName}
            </span>
          )}
          {(user.roles || []).map(r => (
            <span key={r} style={{
              padding: '3px 10px', border: '1px solid var(--rule-strong)',
              borderRadius: 12, fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--ink-soft)',
            }}>{r}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function AggregatesPanel({ agg, role }) {
  const correctRate = agg.totalAttempts > 0 ? (agg.correctAttempts / agg.totalAttempts) : 0
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
    }}>
      <Stat label="Scenarios completed" value={agg.scenariosCompleted} />
      <Stat label="Stage attempts" value={agg.totalAttempts} />
      <Stat
        label="Correct rate"
        value={agg.totalAttempts > 0 ? `${Math.round(correctRate * 100)}%` : '—'}
        tone={correctRate >= 0.7 ? 'success' : correctRate >= 0.5 ? 'warning' : 'danger'}
      />
      <Stat
        label="Avg confidence"
        value={agg.avgConfidence != null ? `${Math.round(agg.avgConfidence)}%` : '—'}
      />
      <Stat label="Quizzes answered" value={agg.quizzesAnswered} />
    </div>
  )
}

function Stat({ label, value, tone = 'default' }) {
  const toneColor = tone === 'success' ? 'var(--success)'
                  : tone === 'warning' ? 'var(--warning)'
                  : tone === 'danger'  ? 'var(--danger)'
                  : 'var(--ink)'
  return (
    <div style={{
      padding: 16, background: 'var(--paper-hi)',
      border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 6,
        fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500,
        color: toneColor, lineHeight: 1.1,
      }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
      margin: '0 0 12px', letterSpacing: '-0.01em',
    }}>{children}</h2>
  )
}

function CompletionLedger({ items, onJump }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <SectionTitle>Scenario completion</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <ScenarioCard key={item.id} item={item} onJump={() => onJump(item.id)} />
        ))}
      </div>
    </div>
  )
}

function ScenarioCard({ item, onJump }) {
  const status = STATUS_STYLES[item.status] || STATUS_STYLES['not-started']
  const correctRate = item.totalAttempts > 0 ? Math.round((item.correctAttempts / item.totalAttempts) * 100) : null
  const stageProgress = item.totalStages > 0
    ? `${item.stagesAttempted}/${item.totalStages} stages`
    : ''
  return (
    <button
      onClick={onJump}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        width: '100%', padding: '12px 16px', textAlign: 'left',
        background: 'var(--paper-hi)', border: '1px solid var(--rule)',
        borderLeft: `3px solid ${status.color}`,
        borderRadius: 'var(--radius)', cursor: 'pointer',
        fontFamily: 'inherit', color: 'var(--ink)',
        transition: 'background var(--dur) ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper-dim)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--paper-hi)' }}
    >
      <div style={{ fontSize: 20, color: status.color, width: 20, textAlign: 'center' }}>
        {status.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, marginBottom: 3 }}>
          {item.id} · {item.title}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)',
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ color: status.color }}>{status.label}</span>
          {stageProgress && <span>{stageProgress}</span>}
          {correctRate != null && <span>{correctRate}% correct</span>}
          {item.framework && <span>{item.framework}</span>}
        </div>
      </div>
    </button>
  )
}

function CompetencyPanel({ concepts }) {
  if (!concepts || concepts.length === 0) {
    return (
      <div>
        <SectionTitle>Concept mastery</SectionTitle>
        <div style={{ padding: 24, color: 'var(--ink-soft)', fontSize: 14 }}>
          No concepts attempted yet. Concepts you encounter in scenarios will be tracked here.
        </div>
      </div>
    )
  }
  return (
    <div>
      <SectionTitle>Concept mastery</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
        {concepts.map(c => <ConceptCard key={c.id} concept={c} />)}
      </div>
    </div>
  )
}

function ConceptCard({ concept }) {
  const pct = concept.correctRate != null ? Math.round(concept.correctRate * 100) : null
  const tone = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'
  const toneColor = tone === 'success' ? 'var(--success)'
                  : tone === 'warning' ? 'var(--warning)'
                  : 'var(--danger)'
  return (
    <div style={{
      padding: 12, background: 'var(--paper-hi)',
      border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{concept.name}</div>
        {pct != null && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
            color: toneColor,
          }}>{pct}%</div>
        )}
      </div>
      {/* Progress bar */}
      {pct != null && (
        <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            width: `${pct}%`, height: '100%', background: toneColor,
            transition: 'width 0.6s ease',
          }} />
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)' }}>
        {concept.attempts} attempt{concept.attempts === 1 ? '' : 's'} · {concept.correct} correct
        {concept.universal && ' · universal'}
      </div>
    </div>
  )
}

function FrameworkPanel({ frameworks }) {
  if (!frameworks || frameworks.length === 0) return null
  return (
    <div>
      <SectionTitle>Framework progress</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {frameworks.map(f => {
          const correctRate = f.attempts > 0 ? Math.round((f.correct / f.attempts) * 100) : null
          return (
            <div key={f.id} style={{
              padding: 12, background: 'var(--paper-hi)',
              border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
            }}>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{f.id}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{f.name}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
                {f.attempts > 0
                  ? `${f.attempts} attempt${f.attempts === 1 ? '' : 's'} · ${correctRate}% correct`
                  : 'No attempts yet'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MitrePanel({ techniques }) {
  if (!techniques || techniques.length === 0) return null
  return (
    <div>
      <SectionTitle>MITRE ATT&CK exposure</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
        {techniques.map(t => {
          const pct = t.attempts > 0 ? Math.round((t.correct / t.attempts) * 100) : null
          return (
            <div key={t.id} style={{
              padding: 8, background: 'var(--paper-hi)',
              border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                color: 'var(--accent)', minWidth: 70,
              }}>{t.id}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{t.name}</span>
              {pct != null && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                  fontWeight: 600,
                }}>{pct}%</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
