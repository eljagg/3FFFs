import { useUser, ROLES } from '../lib/user.jsx'
import { useAuth0 } from '@auth0/auth0-react'
import { motion } from 'framer-motion'

export default function RolePicker() {
  const { chooseRole } = useUser()
  const { user } = useAuth0()
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0]

  const s = {
    wrap: {
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 28px', background: 'var(--paper)',
    },
    inner: { maxWidth: 640, width: '100%' },
    eyebrow: {
      fontFamily: 'var(--font-mono)', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '0.16em',
      color: 'var(--ink-faint)', marginBottom: 18,
      display: 'flex', alignItems: 'center', gap: 10,
    },
    eyebrowBar: { width: 28, height: 1, background: 'var(--ink-faint)' },
    title: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(30px, 4.5vw, 44px)',
      fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em',
      marginBottom: 12,
    },
    sub: {
      fontSize: 15, color: 'var(--ink-soft)',
      maxWidth: 520, marginBottom: 36, lineHeight: 1.6,
    },
    question: {
      fontFamily: 'var(--font-mono)', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--ink-faint)', marginBottom: 14,
    },
    grid: { display: 'grid', gap: 10 },
    card: {
      textAlign: 'left', padding: '18px 22px',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all var(--dur) ease',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, width: '100%',
      cursor: 'pointer',
    },
    cardLabel: {
      fontFamily: 'var(--font-display)', fontSize: 19,
      fontWeight: 500, letterSpacing: '-0.01em',
    },
    cardBlurb: { fontSize: 13, color: 'var(--ink-faint)', marginTop: 2 },
    arrow: {
      fontFamily: 'var(--font-mono)', fontSize: 18,
      color: 'var(--ink-faint)',
    },
  }

  return (
    <div style={s.wrap}>
      <motion.div
        style={s.inner}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={s.eyebrow}>
          <span style={s.eyebrowBar} />
          <span>3fffs — Step 1 of 2</span>
        </div>
        <h1 style={s.title}>
          {firstName ? <>Let's set up your training, <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{firstName}</span>.</> : <>Let's set up your training.</>}
        </h1>
        <p style={s.sub}>
          What role best describes your day-to-day work? We'll tailor scenarios and quizzes
          to what's most relevant to you.
        </p>

        <div style={s.question}>Choose your function</div>

        <div style={s.grid}>
          {ROLES.map((r, i) => (
            <motion.button
              key={r.id}
              onClick={() => chooseRole(r.id)}
              style={s.card}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              whileHover={{
                borderColor: 'var(--ink)',
                backgroundColor: 'var(--paper-dim)',
                y: -1,
              }}
              whileTap={{ scale: 0.99 }}
            >
              <div>
                <div style={s.cardLabel}>{r.label}</div>
                <div style={s.cardBlurb}>{r.blurb}</div>
              </div>
              <motion.span
                style={s.arrow}
                initial={{ x: 0 }}
                whileHover={{ x: 4, color: 'var(--accent)' }}
              >→</motion.span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
