import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth0 } from '@auth0/auth0-react'
import Page from '../components/Page.jsx'
import { useUser, ROLES } from '../lib/user.jsx'
import { api } from '../lib/api.js'
// v25.7.1: engagement-layer widgets
import DailySignal from '../components/home/DailySignal.jsx'
import ReviewQueue from '../components/home/ReviewQueue.jsx'

export default function Home() {
  const { role } = useUser()
  const { user } = useAuth0()
  const roleData = ROLES.find(r => r.id === role)
  const roleLabel = roleData?.label || 'Trainee'
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0]

  const [progress, setProgress] = useState(null)
  const [badgeData, setBadgeData] = useState(null)
  useEffect(() => {
    api.getProgress().then(r => setProgress(r.progress)).catch(() => {})
    api.getBadges().then(setBadgeData).catch(() => {})
  }, [])

  const scenarios = progress?.scenariosCompleted ?? 0
  const quizzes   = progress?.quizzesAnswered ?? 0
  const correct   = progress?.correctAnswers ?? 0
  const accuracy  = quizzes > 0 ? Math.round((correct / quizzes) * 100) : 0
  const covered   = progress?.techniquesEncountered ?? 0
  const total     = progress?.totalTechniques ?? 0

  return (
    <Page
      eyebrow={`Signed in as ${roleLabel}`}
      title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
      lede="Pick up where you left off — or start fresh with the scenarios most relevant to your role."
    >
      {/* v25.7.1: Daily Signal — daily 30-second habit-loop widget */}
      <DailySignal />

      {/* Progress at a glance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 1, background: 'var(--rule)',
          border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', marginBottom: 40,
        }}
      >
        <Stat big={scenarios}             label="Scenarios completed" />
        <Stat big={`${covered}/${total}`} label="Techniques encountered" />
        <Stat big={quizzes}               label="Quiz questions answered" />
        <Stat big={quizzes ? `${accuracy}%` : '—'} label="Accuracy" />
      </motion.div>

      {/* Main actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 48 }}>
        <ActionCard to="/scenarios"
          eyebrow="Train"
          title="Walk an attack"
          blurb="Step through real fraud scenarios, stage by stage. Spot signals, pick controls." />
        <ActionCard to="/coverage"
          eyebrow="Measure"
          title="Your coverage map"
          blurb={total > 0
            ? `See which of the ${total} F3 techniques you've mastered, and which are still ahead.`
            : "See which F3 techniques you've mastered, and which are still ahead."} />
        <ActionCard to="/explorer"
          eyebrow="Explore"
          title="The graph"
          blurb="See the whole F3 framework as a living graph. Tactics, techniques, scenarios — all connected, all interactive." />
      </div>

      {/* v25.7.1: Review queue — surfaces wrong answers older than the cooldown */}
      <ReviewQueue />

      {/* Badges */}
      {badgeData && (
        <BadgesPanel
          badges={badgeData.badges || []}
          earnedCount={badgeData.earnedCount || 0}
          totalBadges={badgeData.totalBadges || 0}
        />
      )}

      {/* Secondary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <ActionCard to="/quiz"   eyebrow="Test"    title="Quick quiz"    blurb="8 role-tailored questions. See where you stand." small />
        <ActionCard to="/tutor"  eyebrow="Ask"     title="AI tutor"      blurb="Claude, with full F3 context. Ask anything." small />
        <ActionCard to="/framework" eyebrow="Reference" title="Framework" blurb="The authoritative MITRE F3 definitions, searchable." small />
      </div>
    </Page>
  )
}

function Stat({ big, label }) {
  return (
    <div style={{ background: 'var(--paper-hi)', padding: '22px 24px' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500,
        lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 8,
      }}>{big}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
      }}>{label}</div>
    </div>
  )
}

function ActionCard({ to, eyebrow, title, blurb, small }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Link to={to} style={{
        display: 'block', padding: small ? '18px 22px' : '22px 26px',
        background: 'var(--paper-hi)', border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)', textDecoration: 'none',
        transition: 'border-color var(--dur)',
      }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink)'}
         onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--rule)'}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 8,
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: small ? 17 : 20,
          fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)',
          marginBottom: 6,
        }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{blurb}</div>
      </Link>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------
   Badges panel — compact earned/locked grid. Locked badges show a progress
   hint so users can see what they need to do, which self-determination
   theory research on learning platforms finds strongly motivating.
   ------------------------------------------------------------------------- */

const TIER_COLORS = {
  bronze: { fg: '#9B6B3F', bg: 'rgba(155, 107, 63, 0.08)', ring: 'rgba(155, 107, 63, 0.4)' },
  silver: { fg: '#707485', bg: 'rgba(112, 116, 133, 0.08)', ring: 'rgba(112, 116, 133, 0.4)' },
  gold:   { fg: '#B08514', bg: 'rgba(176, 133, 20, 0.10)',  ring: 'rgba(176, 133, 20, 0.45)' },
}

function BadgesPanel({ badges, earnedCount, totalBadges }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{ marginBottom: 48 }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 14, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 4,
          }}>Achievements</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
            letterSpacing: '-0.01em',
          }}>{earnedCount} of {totalBadges} earned</div>
        </div>
        {totalBadges > 0 && (
          <div style={{ width: 180, height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / totalBadges) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: 'var(--accent)' }}
            />
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
      }}>
        {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
      </div>
    </motion.div>
  )
}

function BadgeCard({ badge }) {
  const { earned, tier, name, description, icon, f3Unique, progress } = badge
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze

  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        padding: '16px 18px',
        background: earned ? colors.bg : 'var(--paper-hi)',
        border: '1px solid',
        borderColor: earned ? colors.ring : 'var(--rule)',
        borderRadius: 'var(--radius-lg)',
        opacity: earned ? 1 : 0.7,
        transition: 'opacity 0.3s',
        position: 'relative',
      }}
      title={description}
    >
      {f3Unique && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontFamily: 'var(--font-mono)', fontSize: 8,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--accent)', fontWeight: 600,
        }}>F3</div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BadgeIcon name={icon} color={earned ? colors.fg : 'var(--ink-faint)'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500,
            lineHeight: 1.25, marginBottom: 3,
            color: earned ? 'var(--ink)' : 'var(--ink-faint)',
            letterSpacing: '-0.005em',
          }}>{name}</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: earned ? colors.fg : 'var(--ink-faint)',
            marginBottom: 6,
          }}>
            {earned ? `${tier} · earned` : tier}
          </div>
          {!earned && progress && (
            <div style={{
              fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.4,
            }}>
              {progress.current}/{progress.target} {progress.label}
            </div>
          )}
          {earned && (
            <div style={{
              fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.4,
            }}>{description}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* SVG icons — simple monochrome geometric forms to match the editorial design.
   Kept as a switch rather than separate components for easy iteration. */
function BadgeIcon({ name, color }) {
  const sw = 1.8
  const common = {
    width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { flexShrink: 0, marginTop: 2 },
  }
  switch (name) {
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color}/></svg>
    case 'cap':
      return <svg {...common}><path d="M2 9l10-4 10 4-10 4-10-4z"/><path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/></svg>
    case 'diamond':
      return <svg {...common}><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3l-3 6h8l-3-6"/><path d="M2 9h20"/></svg>
    case 'layers':
      return <svg {...common}><path d="M12 3l10 5-10 5L2 8l10-5z"/><path d="M2 13l10 5 10-5"/><path d="M2 18l10 5 10-5"/></svg>
    case 'crosshair':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1" fill={color}/></svg>
    case 'compass':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><polygon points="16,8 14,14 8,16 10,10" fill={color} stroke="none"/></svg>
    case 'coin':
      return <svg {...common}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>
    case 'eye':
      return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>
  }
}
