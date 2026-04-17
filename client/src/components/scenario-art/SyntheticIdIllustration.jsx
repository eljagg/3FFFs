import { motion } from 'framer-motion'

/**
 * Synthetic Identity 18-month bust-out — editorial illustration.
 * Shows: dark web source → 12 synthetic ids → 18 months of cultivation
 *        (time axis with small payment ticks) → coordinated bust-out event.
 */
export default function SyntheticIdIllustration() {
  const ink = 'var(--ink)'
  const accent = 'var(--accent)'
  const faint = 'var(--ink-faint)'
  const success = 'var(--success)'
  const paper = 'var(--paper-hi)'
  const rule = 'var(--rule-strong)'

  // Render 12 identity lanes
  const ids = Array.from({ length: 12 })

  return (
    <svg
      viewBox="0 0 900 340"
      role="img"
      aria-label="Synthetic identity bust-out attack flow diagram"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <marker id="syn-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ink} />
        </marker>
        <marker id="syn-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={accent} />
        </marker>
      </defs>

      {/* Dark Web marketplace source */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      >
        <rect x="30" y="140" width="110" height="60" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="85" y="162" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Dark Web</text>
        <text x="85" y="178" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Marketplace</text>
        <text x="85" y="193" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>unused SSNs</text>
        <text x="85" y="220" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">RESOURCE DEV</text>
      </motion.g>

      {/* Fanning lines to identities */}
      {ids.map((_, i) => {
        const y = 38 + i * 18
        return (
          <motion.line
            key={'fan' + i}
            x1="142" y1="170" x2="236" y2={y + 6}
            stroke={faint} strokeWidth="0.8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.02 }}
          />
        )
      })}

      {/* 12 identity cards */}
      {ids.map((_, i) => {
        const y = 30 + i * 18
        return (
          <motion.g
            key={'id' + i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.35 + i * 0.03 }}
          >
            <rect x="240" y={y} width="48" height="12" rx="2" fill={paper} stroke={ink} strokeWidth="0.7" />
            <circle cx="248" cy={y + 6} r="3" fill={faint} />
            <line x1="254" y1={y + 4} x2="282" y2={y + 4} stroke={faint} strokeWidth="0.7" />
            <line x1="254" y1={y + 8} x2="276" y2={y + 8} stroke={faint} strokeWidth="0.7" />
          </motion.g>
        )
      })}

      {/* "12 identities" label */}
      <text x="264" y="20" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">12 SYNTHETIC IDS</text>

      {/* Timeline axis */}
      <motion.line
        x1="305" y1="170" x2="700" y2="170"
        stroke={rule} strokeWidth="1" strokeDasharray="2 3"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.8 }}
      />
      <text x="310" y="160" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">MONTH 0</text>
      <text x="695" y="160" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">MONTH 18</text>

      {/* Cultivation ticks (small dots across the timeline) */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 320 + i * 28
        return (
          <motion.circle
            key={'tick' + i}
            cx={x} cy="170" r="2.5"
            fill={success}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 1 + i * 0.05 }}
          />
        )
      })}

      {/* "on-time payments" label */}
      <motion.text
        x="500" y="195" textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize="10" fill={success}
        letterSpacing="0.04em"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
      >
        on-time payments · positioning
      </motion.text>

      {/* Lanes converging into bust-out */}
      {ids.map((_, i) => {
        const y = 30 + i * 18
        return (
          <motion.path
            key={'lane' + i}
            d={`M 290 ${y + 6} L 320 170`}
            fill="none" stroke={faint} strokeWidth="0.5" opacity="0.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.9 + i * 0.02 }}
          />
        )
      })}

      {/* Coordinated bust-out burst */}
      <motion.g
        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 2.0, type: 'spring' }}
        style={{ transformOrigin: '740px 170px' }}
      >
        <circle cx="740" cy="170" r="30" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M 740 146 L 744 164 L 760 166 L 748 176 L 752 192 L 740 184 L 728 192 L 732 176 L 720 166 L 736 164 Z"
              fill={accent} />
        <text x="740" y="230" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill={ink} fontWeight="500">Bust-out</text>
        <text x="740" y="246" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent} letterSpacing="0.08em">EXECUTION</text>
      </motion.g>

      {/* Flow arrow from timeline to bust-out */}
      <motion.line
        x1="700" y1="170" x2="713" y2="170"
        stroke={accent} strokeWidth="1.8" markerEnd="url(#syn-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 1.9 }}
      />

      {/* $850k loss outcome */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}
      >
        <rect x="810" y="148" width="70" height="44" rx="4" fill={paper} stroke={accent} strokeWidth="1.5" />
        <text x="845" y="168" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill={accent} fontWeight="600">$850k</text>
        <text x="845" y="183" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>stolen</text>
      </motion.g>
      <motion.line
        x1="770" y1="170" x2="808" y2="170"
        stroke={accent} strokeWidth="1.5" markerEnd="url(#syn-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 2.3 }}
      />
    </svg>
  )
}
