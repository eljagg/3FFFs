import { useAuth0 } from '@auth0/auth0-react'
import { useTheme } from '../lib/theme.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const ALLOWED_DOMAINS = ['barita.com', 'jncb.com', 'jm.scotiabank.com', 'cibccaribbean.com']

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

// Subtle animated stats — updates feel alive, reinforces that the app is grounded in real data
const STATS = [
  { value: '7',   unit: 'tactics',    note: 'in the F3 framework' },
  { value: '126', unit: 'techniques', note: 'catalogued from real incidents' },
  { value: '$13.7B', unit: '',        note: 'US banking fraud losses in 2024' },
]

export default function Login() {
  const { loginWithRedirect, error } = useAuth0()
  const { theme, toggle } = useTheme()
  const [statIdx, setStatIdx] = useState(0)
  const [loading, setLoading] = useState(false)

  // Rotate through stats every 4 seconds — small animated detail
  useEffect(() => {
    const t = setInterval(() => setStatIdx(i => (i + 1) % STATS.length), 4000)
    return () => clearInterval(t)
  }, [])

  async function signIn() {
    setLoading(true)
    try {
      await loginWithRedirect({
        appState: { returnTo: '/' },
      })
    } catch {
      setLoading(false)
    }
  }

  const s = {
    wrap: {
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      background: 'var(--paper)',
      position: 'relative',
    },
    themeBtn: {
      position: 'absolute', top: 20, right: 20, zIndex: 10,
      width: 36, height: 36,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, color: 'var(--ink-soft)',
      border: '1px solid var(--rule)', background: 'var(--paper-hi)',
    },
    left: {
      padding: '60px 56px', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', maxWidth: 560, marginLeft: 'auto', width: '100%',
    },
    eyebrow: {
      fontFamily: 'var(--font-mono)', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '0.16em',
      color: 'var(--ink-faint)', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 10,
    },
    eyebrowBar: { width: 28, height: 1, background: 'var(--ink-faint)' },
    brand: {
      fontFamily: 'var(--font-display)', fontWeight: 600,
      fontSize: 42, letterSpacing: '-0.025em', lineHeight: 1,
      marginBottom: 8,
    },
    title: {
      fontFamily: 'var(--font-display)', fontWeight: 500,
      fontSize: 'clamp(34px, 4.5vw, 52px)', lineHeight: 1.05,
      letterSpacing: '-0.02em', marginBottom: 16, marginTop: 16,
    },
    titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
    sub: {
      fontSize: 16, color: 'var(--ink-soft)', marginBottom: 36,
      lineHeight: 1.6, maxWidth: 460,
    },
    btn: {
      padding: '15px 24px', background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 'var(--radius-lg)', fontSize: 15, fontWeight: 500,
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      gap: 12, transition: 'all var(--dur) ease', border: 'none',
      fontFamily: 'inherit',
    },
    btnSpinner: {
      width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    },
    hint: {
      marginTop: 22, fontSize: 13, color: 'var(--ink-faint)',
      lineHeight: 1.6,
    },
    domains: {
      marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6,
    },
    domain: {
      fontSize: 11, fontFamily: 'var(--font-mono)',
      padding: '3px 8px', background: 'var(--paper-hi)',
      border: '1px solid var(--rule)', borderRadius: 4,
      color: 'var(--ink-soft)',
    },
    error: {
      marginTop: 16, padding: '10px 14px',
      background: 'var(--danger-bg)', color: 'var(--danger)',
      borderRadius: 'var(--radius)', fontSize: 13,
      border: '1px solid var(--danger)',
    },

    right: {
      background: 'linear-gradient(135deg, var(--paper-dim) 0%, var(--paper-hi) 100%)',
      borderLeft: '1px solid var(--rule)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '60px 56px', position: 'relative', overflow: 'hidden',
    },
    // Decorative grid — suggests the F3 matrix without being literal
    gridBg: {
      position: 'absolute', inset: 0, opacity: 0.3,
      backgroundImage: `
        linear-gradient(var(--rule) 1px, transparent 1px),
        linear-gradient(90deg, var(--rule) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
    },
    statCard: {
      position: 'relative', zIndex: 2,
      maxWidth: 480,
    },
    statEyebrow: {
      fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color: 'var(--accent)', marginBottom: 24,
    },
    statNumber: {
      fontFamily: 'var(--font-display)', fontSize: 'clamp(72px, 9vw, 120px)',
      fontWeight: 500, lineHeight: 0.95,
      letterSpacing: '-0.04em', color: 'var(--ink)',
    },
    statUnit: {
      fontFamily: 'var(--font-display)', fontSize: 28,
      fontWeight: 400, fontStyle: 'italic',
      color: 'var(--accent)', marginLeft: 12,
    },
    statNote: {
      fontSize: 16, color: 'var(--ink-soft)',
      marginTop: 20, maxWidth: 320, lineHeight: 1.5,
    },
    footer: {
      position: 'absolute', bottom: 24, left: 56, right: 56,
      fontSize: 11, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.06em', color: 'var(--ink-faint)',
      zIndex: 2, display: 'flex', justifyContent: 'space-between',
    },
  }

  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          .login-wrap { grid-template-columns: 1fr !important; }
          .login-right { display: none !important; }
        }
      `}</style>

      <button
        onClick={toggle}
        style={s.themeBtn}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--ink-soft)' }}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>

      <motion.div
        style={s.left}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={s.eyebrow}>
          <span style={s.eyebrowBar} />
          <span>3fffs — Training Platform</span>
        </div>
        <div style={s.brand}>3fffs<span style={{ color: 'var(--accent)' }}>.</span></div>

        <h1 style={s.title}>
          Fight fraud<br />
          with a <span style={s.titleAccent}>shared language</span>.
        </h1>
        <p style={s.sub}>
          Interactive training for financial-institution staff, grounded in the MITRE Fight Fraud
          Framework — the first behavior-based taxonomy of cyber-enabled financial crime.
        </p>

        <motion.button
          onClick={signIn}
          disabled={loading}
          style={s.btn}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.98 }}
        >
          {loading
            ? <><span style={s.btnSpinner} />Redirecting…</>
            : <>Sign in to continue <span style={{ fontFamily: 'var(--font-mono)' }}>→</span></>}
        </motion.button>

        <div style={s.hint}>
          Access is limited to approved financial institutions:
          <div style={s.domains}>
            {ALLOWED_DOMAINS.map((d) => (
              <motion.span
                key={d}
                style={s.domain}
                whileHover={{ scale: 1.05, borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                @{d}
              </motion.span>
            ))}
          </div>
        </div>

        {error && <div style={s.error}>{error.message}</div>}
      </motion.div>

      <div style={s.right} className="login-right">
        <div style={s.gridBg} />
        <div style={s.statCard}>
          <div style={s.statEyebrow}>Why this matters</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={statIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div>
                <span style={s.statNumber}>{STATS[statIdx].value}</span>
                {STATS[statIdx].unit && <span style={s.statUnit}>{STATS[statIdx].unit}</span>}
              </div>
              <div style={s.statNote}>{STATS[statIdx].note}</div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div style={s.footer}>
          <span>MITRE F3 — CTID, April 2026</span>
          <span>
            {STATS.map((_, i) => (
              <span key={i} style={{
                display: 'inline-block', width: 18, height: 2,
                margin: '0 3px', background: i === statIdx ? 'var(--accent)' : 'var(--rule-strong)',
                borderRadius: 1, transition: 'background 0.3s ease',
              }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
