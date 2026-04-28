import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * A one-time welcome moment shown after first login. It announces the user
 * by name, establishes the stakes of the training, and invites them in.
 * Animates in, auto-dismisses after 4 seconds, or on click.
 */
export default function WelcomeSplash({ user, onDone }) {
  const [visible, setVisible] = useState(true)
  const firstName = (user?.name || user?.email || 'there').split(/[\s@]/)[0]

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => setVisible(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            padding: 40,
          }}
        >
          <div style={{ maxWidth: 720, textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 28,
              }}
            >
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: 40 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                style={{
                  display: 'inline-block', height: 1, background: 'var(--accent)',
                  marginRight: 14, verticalAlign: 'middle',
                }}
              />
              Welcome to 3fffs
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 500,
                fontSize: 'clamp(42px, 6vw, 72px)', lineHeight: 1.05,
                letterSpacing: '-0.025em', marginBottom: 24,
              }}
            >
              Hello, <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{firstName}</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              style={{
                fontSize: 18, color: 'var(--ink-soft)',
                lineHeight: 1.55, maxWidth: 540, margin: '0 auto',
              }}
            >
              Let's build your instinct for spotting fraud, together.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.6 }}
              style={{
                marginTop: 48,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              Click anywhere to continue
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
