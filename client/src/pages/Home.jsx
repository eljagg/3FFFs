import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth0 } from '@auth0/auth0-react'
import Page from '../components/Page.jsx'
import { useUser, ROLES } from '../lib/user.jsx'
import { api } from '../lib/api.js'

export default function Home() {
  const { role } = useUser()
  const { user } = useAuth0()
  const roleData = ROLES.find(r => r.id === role)
  const roleLabel = roleData?.label || 'Trainee'
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0]

  const [progress, setProgress] = useState(null)
  useEffect(() => {
    api.getProgress().then(r => setProgress(r.progress)).catch(() => {})
  }, [])

  const scenarios = progress?.scenariosCompleted ?? 0
  const quizzes   = progress?.quizzesAnswered ?? 0
  const correct   = progress?.correctAnswers ?? 0
  const accuracy  = quizzes > 0 ? Math.round((correct / quizzes) * 100) : 0
  const covered   = progress?.techniquesEncountered ?? 0
  const total     = progress?.totalTechniques ?? 126

  return (
    <Page
      eyebrow={`Signed in as ${roleLabel}`}
      title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
      lede="Pick up where you left off — or start fresh with the scenarios most relevant to your role."
    >
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
          blurb="See which of the 126 F3 techniques you've mastered, and which are still ahead." />
        <ActionCard to="/explorer"
          eyebrow="Explore"
          title="The graph"
          blurb="See the whole F3 framework as a living graph. Tactics, techniques, scenarios — all connected, all interactive." />
      </div>

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
