import { motion } from 'framer-motion'

/**
 * SIM Swap attack — editorial illustration.
 * Shows: victim phone + PII marketplace → telecom (SIM port event) →
 *        attacker's phone receives SMS OTP → bank drained.
 */
export default function SimSwapIllustration() {
  const ink = 'var(--ink)'
  const accent = 'var(--accent)'
  const faint = 'var(--ink-faint)'
  const warning = 'var(--warning)'
  const paper = 'var(--paper-hi)'

  return (
    <svg
      viewBox="0 0 900 280"
      role="img"
      aria-label="SIM swap attack flow diagram"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <marker id="sim-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ink} />
        </marker>
        <marker id="sim-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={accent} />
        </marker>
        <marker id="sim-arrow-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={warning} />
        </marker>
      </defs>

      {/* Victim (top left) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      >
        {/* Phone outline */}
        <rect x="50" y="40" width="58" height="100" rx="8" fill={paper} stroke={ink} strokeWidth="1.5" />
        <rect x="56" y="48" width="46" height="78" rx="2" fill="none" stroke={faint} strokeWidth="0.7" />
        <circle cx="79" cy="134" r="3" fill="none" stroke={faint} strokeWidth="0.7" />
        {/* Signal bars fading out */}
        <g opacity="0.4">
          <rect x="64" y="56" width="3" height="4" fill={faint} />
          <rect x="69" y="53" width="3" height="7" fill={faint} />
          <rect x="74" y="50" width="3" height="10" fill={faint} />
        </g>
        <text x="79" y="100" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="18" fill={faint}>×</text>
        <text x="79" y="160" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Victim</text>
        <text x="79" y="175" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>signal lost</text>
      </motion.g>

      {/* PII Marketplace (bottom left) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
      >
        <rect x="30" y="200" width="100" height="48" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="80" y="220" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">PII Market</text>
        <text x="80" y="236" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>DOB · SSN · addr</text>
        <text x="80" y="268" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">RECON</text>
      </motion.g>

      {/* Telecom (center) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.35 }}
      >
        <rect x="330" y="95" width="130" height="90" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" />
        {/* Tower icon */}
        <g transform="translate(395, 115)">
          <line x1="0" y1="0" x2="0" y2="30" stroke={ink} strokeWidth="1.5" />
          <path d="M -12 4 Q 0 -4 12 4" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.7" />
          <path d="M -18 0 Q 0 -10 18 0" fill="none" stroke={ink} strokeWidth="1.2" opacity="0.5" />
          <polygon points="-5,30 5,30 3,20 -3,20" fill={ink} />
        </g>
        <text x="395" y="168" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Telecom Carrier</text>
        <text x="395" y="205" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent} letterSpacing="0.08em">SIM PORT EVENT</text>
      </motion.g>

      {/* Arrow: victim → telecom (social engineering) */}
      <motion.line
        x1="112" y1="90" x2="326" y2="130"
        stroke={ink} strokeWidth="1.3" strokeDasharray="3 3" markerEnd="url(#sim-arrow)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
      />
      <text x="216" y="100" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>social engineering</text>

      {/* Arrow: PII market → telecom */}
      <motion.line
        x1="134" y1="220" x2="328" y2="168"
        stroke={ink} strokeWidth="1.3" strokeDasharray="3 3" markerEnd="url(#sim-arrow)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      />
      <text x="230" y="208" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint}>verify identity</text>

      {/* Attacker's phone (top right area) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.95 }}
      >
        <rect x="560" y="40" width="58" height="100" rx="8" fill={paper} stroke={accent} strokeWidth="1.8" />
        <rect x="566" y="48" width="46" height="78" rx="2" fill="none" stroke={faint} strokeWidth="0.7" />
        <circle cx="589" cy="134" r="3" fill="none" stroke={accent} strokeWidth="0.7" />
        {/* Full signal */}
        <g>
          <rect x="574" y="56" width="3" height="4" fill={accent} />
          <rect x="579" y="53" width="3" height="7" fill={accent} />
          <rect x="584" y="50" width="3" height="10" fill={accent} />
          <rect x="589" y="47" width="3" height="13" fill={accent} />
        </g>
        {/* SMS bubble */}
        <rect x="569" y="70" width="40" height="34" rx="3" fill={accent} opacity="0.15" stroke={accent} strokeWidth="0.8" />
        <text x="589" y="84" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent}>OTP:</text>
        <text x="589" y="97" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill={accent} fontWeight="600">834291</text>
        <text x="589" y="160" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={accent} fontWeight="500">Attacker</text>
        <text x="589" y="175" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent}>receives SMS</text>
      </motion.g>

      {/* Arrow: telecom → attacker (SMS routed) */}
      <motion.line
        x1="462" y1="130" x2="557" y2="90"
        stroke={accent} strokeWidth="1.8" markerEnd="url(#sim-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 1.15 }}
      />
      <text x="510" y="100" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent}>SMS rerouted</text>

      {/* Bank (right) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.35 }}
      >
        <rect x="680" y="180" width="130" height="60" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" />
        {/* Bank icon — columns */}
        <g transform="translate(712, 194)">
          <polygon points="0,0 66,0 33,-8" fill="none" stroke={ink} strokeWidth="1.2" />
          <line x1="0" y1="2" x2="66" y2="2" stroke={ink} strokeWidth="1.2" />
          <rect x="6" y="4" width="4" height="20" fill={ink} opacity="0.6" />
          <rect x="20" y="4" width="4" height="20" fill={ink} opacity="0.6" />
          <rect x="42" y="4" width="4" height="20" fill={ink} opacity="0.6" />
          <rect x="56" y="4" width="4" height="20" fill={ink} opacity="0.6" />
          <line x1="-3" y1="24" x2="69" y2="24" stroke={ink} strokeWidth="1.5" />
        </g>
        <text x="745" y="260" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">INITIAL ACCESS</text>
      </motion.g>

      {/* Arrow: attacker → bank (OTP used) */}
      <motion.path
        d="M 618 120 Q 700 140 720 185"
        fill="none" stroke={accent} strokeWidth="1.8" markerEnd="url(#sim-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      />
      <text x="680" y="152" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent}>OTP used</text>

      {/* Wire draining out */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.85 }}
      >
        <motion.line
          x1="810" y1="210" x2="870" y2="210"
          stroke={warning} strokeWidth="2.2"
          markerEnd="url(#sim-arrow-warn)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 1.9 }}
        />
        <text x="840" y="198" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={warning} fontWeight="600">$180k</text>
        <text x="840" y="230" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">MONETIZATION</text>
      </motion.g>
    </svg>
  )
}
