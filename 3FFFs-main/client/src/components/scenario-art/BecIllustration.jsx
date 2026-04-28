import { motion } from 'framer-motion'

/**
 * Business Email Compromise — editorial illustration.
 * Shows: attacker → spoofed domain → assistant → CFO inbox →
 *        AP wire instruction → mule account → crypto conversion.
 */
export default function BecIllustration() {
  // Palette references use CSS variables so light/dark themes both work.
  const ink     = 'var(--ink)'
  const accent  = 'var(--accent)'
  const faint   = 'var(--ink-faint)'
  const paper   = 'var(--paper-hi)'

  return (
    <svg
      viewBox="0 0 900 260"
      role="img"
      aria-label="Business Email Compromise attack flow diagram"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <marker id="bec-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ink} />
        </marker>
        <marker id="bec-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={accent} />
        </marker>
      </defs>

      {/* Attacker */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      >
        <circle cx="60" cy="130" r="28" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M 60 118 a 8 8 0 1 0 0 16 a 8 8 0 1 0 0 -16 M 40 150 a 20 16 0 0 1 40 0" fill="none" stroke={accent} strokeWidth="1.8" />
        <text x="60" y="185" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={accent} letterSpacing="0.08em">ATTACKER</text>
      </motion.g>

      {/* Spoofed Domain */}
      <motion.g
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
      >
        <rect x="145" y="108" width="90" height="44" rx="4" fill={paper} stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="190" y="126" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Lookalike</text>
        <text x="190" y="142" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={faint}>vendor.co</text>
        <text x="190" y="172" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">RESOURCE DEV</text>
      </motion.g>

      {/* Phishing arrow */}
      <motion.line
        x1="92" y1="130" x2="140" y2="130"
        stroke={ink} strokeWidth="1.5" markerEnd="url(#bec-arrow)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.25 }}
      />

      {/* Assistant node */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.35 }}
      >
        <circle cx="310" cy="80" r="22" fill={paper} stroke={ink} strokeWidth="1.5" />
        <path d="M 310 72 a 6 6 0 1 0 0 12 a 6 6 0 1 0 0 -12 M 296 98 a 14 11 0 0 1 28 0" fill="none" stroke={ink} strokeWidth="1.5" />
        <text x="310" y="120" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink}>Assistant</text>
      </motion.g>

      {/* Click / credential capture */}
      <motion.line
        x1="238" y1="120" x2="292" y2="88"
        stroke={ink} strokeWidth="1.3" strokeDasharray="3 3" markerEnd="url(#bec-arrow)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.55 }}
      />

      {/* CFO Mailbox */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.75 }}
      >
        <rect x="280" y="155" width="120" height="54" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" />
        <rect x="288" y="163" width="104" height="38" rx="2" fill="none" stroke={faint} strokeWidth="0.8" />
        <line x1="288" y1="175" x2="392" y2="175" stroke={faint} strokeWidth="0.7" />
        <line x1="288" y1="185" x2="392" y2="185" stroke={faint} strokeWidth="0.7" />
        <line x1="288" y1="195" x2="392" y2="195" stroke={faint} strokeWidth="0.7" />
        <circle cx="395" cy="163" r="3" fill={accent} />
        <text x="340" y="228" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">CFO Inbox</text>
        <text x="340" y="243" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent} letterSpacing="0.08em">COMPROMISED</text>
      </motion.g>

      {/* Credentials arrow down to CFO box */}
      <motion.line
        x1="310" y1="104" x2="310" y2="155"
        stroke={accent} strokeWidth="1.5" markerEnd="url(#bec-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.95 }}
      />

      {/* AP (Accounts Payable) */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.15 }}
      >
        <rect x="470" y="108" width="100" height="44" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" />
        <text x="520" y="126" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Accounts</text>
        <text x="520" y="142" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Payable</text>
        <text x="520" y="172" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">EXECUTION</text>
      </motion.g>

      {/* Wire instruction arrow */}
      <motion.line
        x1="400" y1="182" x2="485" y2="140"
        stroke={accent} strokeWidth="1.8" markerEnd="url(#bec-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 1.25 }}
      />
      <text x="432" y="166" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={accent} letterSpacing="0.04em">"urgent wire"</text>

      {/* Mule Account */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.5 }}
      >
        <rect x="620" y="108" width="90" height="44" rx="4" fill={paper} stroke={ink} strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="665" y="126" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Mule</text>
        <text x="665" y="142" textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fill={ink} fontWeight="500">Account</text>
        <text x="665" y="172" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">MONETIZATION</text>
      </motion.g>

      {/* $2.3M flow */}
      <motion.line
        x1="570" y1="130" x2="615" y2="130"
        stroke={accent} strokeWidth="2.2" markerEnd="url(#bec-arrow-accent)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 1.65 }}
      />
      <text x="592" y="120" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill={accent} fontWeight="600">$2.3M</text>

      {/* Crypto exchange */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.85 }}
      >
        <polygon points="810,130 840,110 870,130 840,150" fill="none" stroke={ink} strokeWidth="1.5" />
        <text x="840" y="134" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill={ink} fontWeight="500">₿</text>
        <text x="840" y="172" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill={faint} letterSpacing="0.08em">LAYERING</text>
      </motion.g>

      {/* Layering dotted flow */}
      <motion.path
        d="M 710 130 Q 760 105 810 130"
        fill="none" stroke={faint} strokeWidth="1.3" strokeDasharray="2 4" markerEnd="url(#bec-arrow)"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 2 }}
      />
    </svg>
  )
}
