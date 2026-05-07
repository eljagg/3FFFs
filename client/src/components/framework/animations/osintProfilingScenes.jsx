/**
 * osintProfilingScenes.jsx — v25.7.0.10
 *
 * Scene data + zone renderers for the F1067 OSINT Profiling technique
 * animation. Second consumer of the generic ProcessAnimation engine
 * (after ivrDiscoveryScenes.jsx).
 *
 * Same 3-zone shape as IVR Discovery: attacker / source-platform /
 * target-awareness. Validates that the engine's zone-config pattern
 * supports a SECOND animation in the same shape with no engine
 * changes — which is the architectural hypothesis this release tests.
 *
 * Caribbean grounding:
 * - Same Allison Brown character as SC007 + IVR Discovery
 * - This animation shows the OSINT phase that happened BEFORE the
 *   IVR Discovery animation's prologue. IVR Discovery starts with
 *   "the crew buys Allison's stolen identity fragment from a dark-web
 *   dump." This animation shows HOW that dump came into existence —
 *   the crew's OSINT work that aggregated public data into a
 *   complete attack target dossier.
 * - JMD context, Kingston employer, +1-876 numbers
 *
 * Pedagogical insight (locked):
 *   OSINT profiling is invisible because it leaves no log entry on
 *   any system the target controls. Each individual data source is
 *   harmless ("Allison's LinkedIn says she works at Sangster"). The
 *   danger is the AGGREGATION — when 8 harmless data points combine,
 *   they form a complete attack target dossier. The animation teaches
 *   information hygiene as recognition that aggregation creates risk
 *   no single source represents.
 *
 * Platform mockups deliberately avoid real branding:
 *   - "professional networking site" (LinkedIn-shape)
 *   - "social media platform" (Facebook-shape)
 *   - "public records aggregator" (broker DB shape)
 *   - "breach corpus database" (haveibeenpwned-shape)
 *   - "payroll inference panel" (custom)
 * The lesson generalizes beyond specific platforms.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { engineStyles } from './ProcessAnimation.jsx'

const styles = engineStyles


/* ─── Detection controls ──────────────────────────────────────────────
   Four real + one naive (project convention). OSINT controls differ
   in CHARACTER from IVR Discovery's controls: the IVR controls were
   detection rules deployable INSIDE the bank's systems. OSINT
   controls are mostly about reducing the bank's own OSINT footprint
   and helping customers — because the OSINT activity itself happens
   on third-party systems the bank can't monitor.

   The naive control is also different in character: it's a
   responsibility-assignment error ("blame the customer's privacy
   settings") rather than a technical-defeat workaround. Worth
   teaching; surfaces the political aspect of fraud-prevention policy.
   ──────────────────────────────────────────────────────────────────── */
export const OSINT_PROFILING_CONTROLS = [
  {
    id: 'ctrl-employee-footprint',
    label: 'Reduce employee LinkedIn footprint',
    meta: 'Train staff to limit role-specific details (branch, department) on public profiles',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,  // catches the payroll inference at stage 6
    catchUnit: 'inferences',
  },
  {
    id: 'ctrl-customer-hygiene',
    label: 'Customer info-hygiene training',
    meta: 'Trained customers recognize profiled-scammer language ("they knew my mother\'s name") and report',
    naive: false,
    revealsAtStages: [3, 7],
    catchCount: 2,
    catchTotal: 8,  // partial coverage — most aggregation is invisible to customer
    catchUnit: 'data points',
  },
  {
    id: 'ctrl-breach-monitoring',
    label: 'Breach corpus monitoring',
    meta: 'When breach surfaces customer email, proactive password-reset campaign',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,  // catches the breach corpus crosscheck at stage 5
    catchUnit: 'compromised credentials',
  },
  {
    id: 'ctrl-public-property-min',
    label: 'Public bank-property minimization',
    meta: 'No executive bios with personal details, no public branch staff directories',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'inferences',
  },
  {
    id: 'ctrl-naive-private-linkedin',
    label: 'Make customer LinkedIn private',
    meta: 'Bank cannot make customer accounts private — outside its authority. Customer-blame framing.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'inferences',
  },
]

/* ─── Hidden signals catalog ─────────────────────────────────────────
   The "signals" that exist in the OSINT activity but stay below
   detection threshold unless the corresponding control is active.
   Different in character from IVR signals: these are POSTURE signals
   ("our exposure is X") rather than ACTIVITY signals.
   ──────────────────────────────────────────────────────────────────── */
export const OSINT_PROFILING_SIGNALS = [
  {
    id: 'sig-customer-data-points',
    label: 'Customer data point exposure',
    description: 'Allison\'s name + DOB + employer are recoverable from her own public posts. Hygiene training would flag the recombination risk to her.',
    revealedBy: 'ctrl-customer-hygiene',
  },
  {
    id: 'sig-customer-final-mapping',
    label: 'Complete profile aggregation',
    description: 'Allison\'s final profile combines 8 public sources into a unique identifier. She has no signal that this happened.',
    revealedBy: 'ctrl-customer-hygiene',
  },
  {
    id: 'sig-credential-reuse',
    label: 'Password reuse via breach corpus',
    description: 'Allison\'s email surfaced in 3 prior breaches. One leaked hash cracked offline. Proactive campaign would have forced a reset.',
    revealedBy: 'ctrl-breach-monitoring',
  },
  {
    id: 'sig-employer-bank-link',
    label: 'Employer → bank inference',
    description: 'Sangster Travel\'s public LinkedIn says "JNCB corporate accounts." Payroll inference: Allison probably banks JNCB. Footprint reduction would remove this link.',
    revealedBy: 'ctrl-employee-footprint',
  },
  {
    id: 'sig-bank-public-bio',
    label: 'Bank-property OSINT contribution',
    description: 'Bank\'s own public properties (branch directory, executive interview transcripts, regulatory filings) contributed 30% of the dossier.',
    revealedBy: 'ctrl-public-property-min',
  },
]

/* ─── The 7 stages ─────────────────────────────────────────────────── */
export const OSINT_PROFILING_STAGES = [

  /* ─── Stage 1 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-1',
    label: 'Target identified',
    title: 'A name in a crew\'s shopping list',
    caption: "The crew has a list of 50 'Kingston-area Jamaicans, age 20-40, high-balance candidate.' Allison Brown is one entry. Just a name — they need to figure out everything else. The OSINT phase begins with public sources, $0 budget, no devices touched.",
    durationMs: 3500,
    focalZone: 'attacker',
    attackerZone: {
      notepad: [
        { label: 'Name',           value: 'Allison Brown', confirmed: true, justAdded: true },
        { label: 'Employer',       value: '?',             confirmed: false },
        { label: 'DOB',            value: '?',             confirmed: false },
        { label: 'Address',        value: '?',             confirmed: false },
        { label: 'Phone',          value: '?',             confirmed: false },
        { label: 'Email',          value: '?',             confirmed: false },
        { label: 'Bank',           value: '?',             confirmed: false },
      ],
      callsPlaced: 0,  // OSINT context: this is "queries made"; rendered with custom label in osint zone renderer
      activity: 'searching',
    },
    sourceZone: {
      activeSource: null,
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      finalHeadline: null,
    },
    revealedSignalIds: [],
  },

  /* ─── Stage 2 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-2',
    label: 'Source 1',
    title: 'Professional networking site — employment + photo',
    caption: 'Free public profile. Allison Brown · Marketing Coordinator · Sangster Travel Agency · Kingston · Studied at UTech. Headshot used to verify against later photos. The platform itself shows "viewed by recruiter" — invisible to Allison, since recruiter searches don\'t notify.',
    durationMs: 5000,
    focalZone: 'middle',
    attackerZone: {
      notepad: [
        { label: 'Name',           value: 'Allison Brown',           confirmed: true },
        { label: 'Employer',       value: 'Sangster Travel · Mktg',  confirmed: true, justAdded: true },
        { label: 'Headshot',       value: 'Captured',                confirmed: true, justAdded: true },
        { label: 'Education',      value: 'UTech',                   confirmed: true, justAdded: true },
        { label: 'DOB',            value: '?',                       confirmed: false },
        { label: 'Email',          value: '?',                       confirmed: false },
        { label: 'Bank',           value: '?',                       confirmed: false },
      ],
      callsPlaced: 1,
      activity: 'correlating',
    },
    sourceZone: {
      activeSource: 'professional-network',
      profileFields: [
        { label: 'Name',     value: 'Allison Brown',                  highlight: true },
        { label: 'Title',    value: 'Marketing Coordinator',          highlight: true },
        { label: 'Company',  value: 'Sangster Travel Agency',         highlight: true },
        { label: 'Location', value: 'Kingston, Jamaica' },
        { label: 'School',   value: 'University of Technology' },
      ],
      avatarPresent: true,
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      noteText: 'Profile views by "recruiters" don\'t notify the user.',
      finalHeadline: null,
    },
    revealedSignalIds: [],
  },

  /* ─── Stage 3 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-3',
    label: 'Source 2',
    title: 'Social media — family, birthday, hometown',
    caption: 'Allison\'s public Facebook posts: a 2024 birthday photo with caption "happy 21st 🎂 12 March". Her mother is tagged in 4 posts ("Mommy ❤"). Hometown checked-in: Mandeville. Vacation timeline: family at Negril last August. All public, all aggregated.',
    durationMs: 5500,
    focalZone: 'middle',
    attackerZone: {
      notepad: [
        { label: 'Name',           value: 'Allison Brown',           confirmed: true },
        { label: 'Employer',       value: 'Sangster Travel · Mktg',  confirmed: true },
        { label: 'DOB',            value: '12-Mar-2003',             confirmed: true, justAdded: true },
        { label: 'Mother',         value: '"Mommy" — tagged',         confirmed: true, justAdded: true },
        { label: 'Hometown',       value: 'Mandeville',              confirmed: true, justAdded: true },
        { label: 'Recent travel',  value: 'Negril, Aug \'24',         confirmed: true, justAdded: true },
        { label: 'Email',          value: '?',                       confirmed: false },
        { label: 'Bank',           value: '?',                       confirmed: false },
      ],
      callsPlaced: 2,
      activity: 'correlating',
    },
    sourceZone: {
      activeSource: 'social-media',
      socialPosts: [
        { time: 'Mar 2024',  excerpt: 'happy 21st 🎂 12 March, can\'t believe it', highlight: true },
        { time: 'Aug 2024',  excerpt: 'Negril family weekend ☀', highlight: true },
        { time: 'May 2024',  excerpt: 'love you Mommy ❤ Mother\'s Day', highlight: true },
        { time: 'Jul 2023',  excerpt: 'graduating UTech 🎓', highlight: false },
      ],
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      noteText: 'Public posts: zero notification on view.',
      finalHeadline: null,
    },
    revealedSignalIds: ['sig-customer-data-points'],
  },

  /* ─── Stage 4 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-4',
    label: 'Source 3',
    title: 'Public records aggregator — address + phone',
    caption: 'Crew pays $4 USD to a public-records broker. Receives current address (12B Hope Pastures Apt, Kingston 6), phone (+1-876-555-0144), and 2 previous addresses. Broker keeps no record of buyer identity. Indistinguishable from legitimate background-check use.',
    durationMs: 5000,
    focalZone: 'middle',
    attackerZone: {
      notepad: [
        { label: 'DOB',            value: '12-Mar-2003',                 confirmed: true },
        { label: 'Mother',         value: '"Mommy" — tagged',             confirmed: true },
        { label: 'Address',        value: '12B Hope Pastures · Kgn 6',   confirmed: true, justAdded: true },
        { label: 'Phone',          value: '+1-876-555-0144',             confirmed: true, justAdded: true },
        { label: 'Prev addresses', value: '2 found',                     confirmed: true, justAdded: true },
        { label: 'Email',          value: '?',                           confirmed: false },
        { label: 'Bank',           value: '?',                           confirmed: false },
      ],
      callsPlaced: 3,
      activity: 'aggregating',
    },
    sourceZone: {
      activeSource: 'broker',
      brokerQuery: 'Allison Brown · Kingston · DOB 2003-03-12',
      brokerCost: '$4.00 USD',
      brokerResults: [
        { label: 'Current address',  value: '12B Hope Pastures Apt, Kingston 6', highlight: true },
        { label: 'Phone',            value: '+1 (876) 555-0144',                 highlight: true },
        { label: 'Previous addr 1',  value: '7 Lyndhurst Rd, Kingston 5' },
        { label: 'Previous addr 2',  value: '14 Manor Park Plaza, Kingston 8' },
      ],
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      noteText: 'Brokers don\'t notify subjects of queries.',
      finalHeadline: null,
    },
    revealedSignalIds: [],
  },

  /* ─── Stage 5 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-5',
    label: 'Source 4',
    title: 'Breach corpus — email + reused password',
    caption: 'Crew searches for "abrown" + "Sangster" patterns in compiled breach datasets (HIBP-style aggregator). Allison\'s email surfaces in 3 leaked breaches. One leaked password hash is weak (md5) and cracks offline in seconds. She\'s reused that password elsewhere. Free.',
    durationMs: 5500,
    focalZone: 'middle',
    attackerZone: {
      notepad: [
        { label: 'Address',        value: '12B Hope Pastures · Kgn 6',  confirmed: true },
        { label: 'Phone',          value: '+1-876-555-0144',            confirmed: true },
        { label: 'Email',          value: 'abrown.s@gmail',             confirmed: true, justAdded: true },
        { label: 'Breach hits',    value: '3 prior leaks',              confirmed: true, justAdded: true },
        { label: 'Password reuse', value: 'Sangster2019 (md5 cracked)',  confirmed: true, justAdded: true },
        { label: 'Bank',           value: '?',                          confirmed: false },
      ],
      callsPlaced: 4,
      activity: 'aggregating',
    },
    sourceZone: {
      activeSource: 'breach-corpus',
      breachQuery: 'abrown.s@gmail',
      breachHits: [
        { source: 'travel-app · 2021', leaked: 'email + sha1 hash + DOB', cracked: false },
        { source: 'forum-app · 2022',  leaked: 'email + md5 hash + name', cracked: true, plaintext: 'Sangster2019' },
        { source: 'shop-app · 2023',   leaked: 'email + bcrypt hash',     cracked: false },
      ],
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      noteText: 'Breach corpus aggregators are publicly searchable.',
      finalHeadline: null,
    },
    revealedSignalIds: ['sig-credential-reuse'],
  },

  /* ─── Stage 6 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-6',
    label: 'Inference',
    title: 'Employer → bank inference',
    caption: 'Sangster Travel\'s LinkedIn page lists "JNCB Corporate Banking" as a payroll partner — public information for B2B credibility. Inference: Sangster employees receive payroll deposits via JNCB. Allison probably banks JNCB. Not direct evidence — but enough to target the right IVR.',
    durationMs: 5500,
    focalZone: 'middle',
    attackerZone: {
      notepad: [
        { label: 'Email',          value: 'abrown.s@gmail',              confirmed: true },
        { label: 'Password reuse', value: 'Sangster2019 (md5 cracked)',  confirmed: true },
        { label: 'Likely bank',    value: 'JNCB (inferred)',             confirmed: true, justAdded: true, highlight: true },
        { label: 'Inference path', value: 'Employer → Payroll → Bank',   confirmed: true, justAdded: true },
      ],
      callsPlaced: 5,
      activity: 'aggregating',
    },
    sourceZone: {
      activeSource: 'inference',
      inferenceChain: [
        { node: 'Allison Brown',          role: 'subject',  highlight: true },
        { node: 'Sangster Travel Agency', role: 'employer' },
        { node: 'JNCB Corporate Banking', role: 'payroll-partner' },
        { node: 'JNCB Retail',            role: 'inferred-customer-relationship', highlight: true },
      ],
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      noteText: 'Bank\'s own public properties contributed this inference.',
      finalHeadline: null,
    },
    revealedSignalIds: ['sig-employer-bank-link', 'sig-bank-public-bio'],
  },

  /* ─── Stage 7 ────────────────────────────────────────────────────── */
  {
    id: 'osint-stage-7',
    label: 'Handoff',
    title: 'Profile complete — listed for sale',
    caption: '47 minutes. $4 spent. Complete attack-target dossier on Allison Brown. Listed in a crew-private dark-web channel for sale at $40 USD per profile. The IVR Discovery animation\'s prologue starts HERE — that\'s the buyer who paid $40 and used this dossier to probe the JNCB IVR. The reconnaissance phase is complete.',
    durationMs: 4500,
    focalZone: 'attacker',
    attackerZone: {
      notepad: [
        { label: 'Profile',          value: 'COMPLETE',         confirmed: true, highlight: true },
        { label: 'Time invested',    value: '47 minutes',       confirmed: true },
        { label: 'Cash spent',       value: '$4 USD',           confirmed: true },
        { label: 'Sources combined', value: '5 public + 1 inference', confirmed: true },
        { label: 'Listing price',    value: '$40 USD per profile', confirmed: true, highlight: true },
        { label: 'Next phase',       value: 'IVR probing (different crew)', confirmed: false, hint: true },
      ],
      callsPlaced: 5,
      activity: 'complete',
    },
    sourceZone: {
      activeSource: null,
    },
    targetZone: {
      awareness: 'NONE',
      eventsLogged: 0,
      finalHeadline: 'Allison\'s complete attack profile assembled in 47 minutes from public sources, $0 paid to her, $4 paid to a broker. The bank\'s own public properties contributed ~30% of the dossier. She has no notification, no log entry, no way to know this happened.',
    },
    revealedSignalIds: ['sig-customer-data-points', 'sig-customer-final-mapping'],
  },
]


/* ─── Activity-chip label map for attacker zone ────────────────────── */
const OSINT_ACTIVITY_LABEL = {
  searching:   'SEARCHING',
  correlating: 'CORRELATING',
  aggregating: 'AGGREGATING',
  complete:    'DOSSIER COMPLETE',
}


/* ─── Zone renderer: Attacker (left) ───────────────────────────────── */
function renderAttackerZone({ state }) {
  if (!state) return null
  return (
    <>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Dossier</div>
        <div style={styles.notepad}>
          <AnimatePresence mode="popLayout">
            {state.notepad.map((row) => (
              <motion.div
                key={row.label}
                layout
                initial={row.justAdded ? { opacity: 0, x: -8 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: row.justAdded ? 0.15 : 0 }}
                style={{
                  ...styles.notepadRow,
                  ...(row.confirmed ? styles.notepadRowConfirmed : {}),
                  ...(row.highlight ? styles.notepadRowHighlight : {}),
                  ...(row.hint ? styles.notepadRowHint : {}),
                }}
              >
                <span style={styles.notepadLabel}>{row.label}</span>
                <span style={styles.notepadValue}>{row.value}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Sources queried</div>
        <motion.div
          key={state.callsPlaced}
          initial={{ scale: 1.15, color: 'var(--accent-hi, #d66e5a)' }}
          animate={{ scale: 1, color: 'var(--ink)' }}
          transition={{ duration: 0.4 }}
          style={styles.bigCounter}
        >
          {state.callsPlaced}
        </motion.div>
        <div style={styles.activityChip}>
          {OSINT_ACTIVITY_LABEL[state.activity] || state.activity}
        </div>
      </div>
    </>
  )
}


/* ─── Zone renderer: Source platform (middle) ──────────────────────────
   Different shape per stage. Uses inline custom styles for each
   platform mockup. Shape transitions are AnimatePresence fades.
   ──────────────────────────────────────────────────────────────────── */
function renderSourceZone({ state }) {
  if (!state) return null
  return (
    <AnimatePresence mode="wait">
      {state.activeSource === 'professional-network' && (
        <motion.div
          key="professional-network"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          <SourceLabel>Professional networking site</SourceLabel>
          <div style={proCardStyles.card}>
            <div style={proCardStyles.cardHeader} />
            <div style={proCardStyles.cardBody}>
              {state.avatarPresent && (
                <div style={proCardStyles.avatar}>AB</div>
              )}
              <div style={proCardStyles.fields}>
                {state.profileFields.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      ...proCardStyles.field,
                      ...(f.highlight ? proCardStyles.fieldHighlight : {}),
                    }}
                  >
                    <span style={proCardStyles.fieldLabel}>{f.label}</span>
                    <span style={proCardStyles.fieldValue}>{f.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {state.activeSource === 'social-media' && (
        <motion.div
          key="social-media"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          <SourceLabel>Social media platform</SourceLabel>
          <div style={socialStyles.feed}>
            {state.socialPosts.map((p, i) => (
              <motion.div
                key={p.time}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                style={{
                  ...socialStyles.post,
                  ...(p.highlight ? socialStyles.postHighlight : {}),
                }}
              >
                <div style={socialStyles.postTime}>{p.time}</div>
                <div style={socialStyles.postExcerpt}>"{p.excerpt}"</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {state.activeSource === 'broker' && (
        <motion.div
          key="broker"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          <SourceLabel>Public records aggregator</SourceLabel>
          <div style={brokerStyles.queryBar}>
            <span style={brokerStyles.queryLabel}>QUERY</span>
            <span style={brokerStyles.queryValue}>{state.brokerQuery}</span>
          </div>
          <div style={brokerStyles.cost}>
            Cost: {state.brokerCost} · paid · no buyer-identity record retained
          </div>
          <div style={brokerStyles.resultsTable}>
            {state.brokerResults.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                style={{
                  ...brokerStyles.row,
                  ...(r.highlight ? brokerStyles.rowHighlight : {}),
                }}
              >
                <span style={brokerStyles.rowLabel}>{r.label}</span>
                <span style={brokerStyles.rowValue}>{r.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {state.activeSource === 'breach-corpus' && (
        <motion.div
          key="breach-corpus"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          <SourceLabel>Breach corpus database</SourceLabel>
          <div style={breachStyles.queryBar}>
            <span style={breachStyles.queryLabel}>SEARCH</span>
            <span style={breachStyles.queryValue}>{state.breachQuery}</span>
          </div>
          <div style={breachStyles.results}>
            {state.breachHits.map((b, i) => (
              <motion.div
                key={b.source}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.2 }}
                style={{
                  ...breachStyles.hitRow,
                  ...(b.cracked ? breachStyles.hitRowCracked : {}),
                }}
              >
                <div style={breachStyles.hitSource}>{b.source}</div>
                <div style={breachStyles.hitLeaked}>{b.leaked}</div>
                {b.cracked && (
                  <div style={breachStyles.hitCracked}>
                    ⚠ Cracked: <span style={breachStyles.hitPlaintext}>{b.plaintext}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {state.activeSource === 'inference' && (
        <motion.div
          key="inference"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          <SourceLabel>Inference chain</SourceLabel>
          <div style={inferenceStyles.chain}>
            {state.inferenceChain.map((n, i) => (
              <div key={n.node} style={inferenceStyles.nodeWrap}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.2 }}
                  style={{
                    ...inferenceStyles.node,
                    ...(n.highlight ? inferenceStyles.nodeHighlight : {}),
                  }}
                >
                  <div style={inferenceStyles.nodeLabel}>{n.node}</div>
                  <div style={inferenceStyles.nodeRole}>{n.role}</div>
                </motion.div>
                {i < state.inferenceChain.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.2 + 0.1 }}
                    style={inferenceStyles.connector}
                  >
                    ↓
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {!state.activeSource && (
        <motion.div
          key="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={emptySourceStyles.wrap}
        >
          <div style={emptySourceStyles.label}>
            — No active source —
          </div>
          <div style={emptySourceStyles.subtext}>
            Each stage queries a different public source.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


/* ─── Zone renderer: Target awareness (right) ─────────────────────── */
function renderTargetZone({ state, revealedSignals, activeControls }) {
  if (!state) return null
  return (
    <>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Target awareness</div>
        <motion.div
          animate={{
            color: state.awareness === 'NONE'
              ? 'var(--ink-faint)'
              : 'var(--accent-hi, #d66e5a)',
          }}
          style={{
            ...styles.bigCounter,
            color: state.awareness === 'NONE' ? 'var(--ink-faint)' : 'var(--accent-hi, #d66e5a)',
            fontSize: 24,
          }}
        >
          {state.awareness}
        </motion.div>
        {state.awareness === 'NONE' && (
          <div style={styles.silentBadge}>SILENT</div>
        )}
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Events logged on target systems</div>
        <div style={statBigStyles.value}>{state.eventsLogged}</div>
      </div>

      {state.noteText && (
        <div style={statBigStyles.note}>
          {state.noteText}
        </div>
      )}

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>
          Hidden signals
          {revealedSignals.length > 0 && (
            <span style={styles.signalCount}>
              {' '}· {revealedSignals.length} surfaced
            </span>
          )}
        </div>
        <AnimatePresence>
          {revealedSignals.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.signalsEmpty}
            >
              {activeControls.size === 0
                ? 'Toggle a control below to surface hidden signals.'
                : 'No signals matching active controls at this stage.'}
            </motion.div>
          ) : (
            revealedSignals.map(s => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3 }}
                style={styles.signalRow}
              >
                <div style={styles.signalLabel}>{s.label}</div>
                <div style={styles.signalDesc}>{s.description}</div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {state.finalHeadline && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.finalHeadline}
        >
          {state.finalHeadline}
        </motion.div>
      )}
    </>
  )
}

/* ─── Source label helper ─────────────────────────────────────────── */
function SourceLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6b5d4a',
      fontWeight: 600,
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}


/* ─── Bespoke styles for OSINT source panels (cream palette
       inherits from middle zone's cream frame from engine) ──────────── */
const proCardStyles = {
  card: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardHeader: {
    height: 32,
    background: 'linear-gradient(135deg, #6b8e5a 0%, #4d6e42 100%)',
  },
  cardBody: {
    padding: '12px 14px',
    display: 'flex',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#9a8e78',
    color: '#fffdf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 18,
    flexShrink: 0,
    marginTop: -28,
    border: '3px solid #fffdf8',
  },
  fields: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    paddingBottom: 4,
    borderBottom: '1px solid #ede4cf',
  },
  fieldHighlight: {
    background: 'rgba(184, 81, 61, 0.06)',
    padding: '4px 6px',
    margin: '0 -6px',
    borderRadius: 3,
    border: 'none',
  },
  fieldLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 8.5,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#6b5d4a',
  },
  fieldValue: {
    fontSize: 12,
    color: '#1a1512',
    fontWeight: 500,
  },
}

const socialStyles = {
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  post: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 5,
    padding: '8px 10px',
  },
  postHighlight: {
    background: 'rgba(184, 81, 61, 0.06)',
    borderColor: 'rgba(184, 81, 61, 0.3)',
  },
  postTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.1em',
    color: '#6b5d4a',
    fontWeight: 600,
    marginBottom: 3,
  },
  postExcerpt: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#1a1512',
    lineHeight: 1.4,
  },
}

const brokerStyles = {
  queryBar: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 4,
    padding: '6px 10px',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  queryLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.14em',
    color: '#6b5d4a',
    fontWeight: 600,
  },
  queryValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: '#1a1512',
    fontWeight: 500,
  },
  cost: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    color: '#6b5d4a',
    fontStyle: 'italic',
    marginBottom: 8,
    paddingLeft: 4,
  },
  resultsTable: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderBottom: '1px solid #ede4cf',
    gap: 8,
  },
  rowHighlight: {
    background: 'rgba(184, 81, 61, 0.06)',
  },
  rowLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.08em',
    color: '#6b5d4a',
    fontWeight: 600,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 11,
    color: '#1a1512',
    textAlign: 'right',
  },
}

const breachStyles = {
  queryBar: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 4,
    padding: '6px 10px',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  queryLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.14em',
    color: '#6b5d4a',
    fontWeight: 600,
  },
  queryValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: '#1a1512',
    fontWeight: 500,
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  hitRow: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 4,
    padding: '6px 10px',
  },
  hitRowCracked: {
    borderColor: 'rgba(184, 81, 61, 0.5)',
    background: 'rgba(184, 81, 61, 0.06)',
  },
  hitSource: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.06em',
    color: '#6b5d4a',
    fontWeight: 600,
    marginBottom: 2,
  },
  hitLeaked: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: '#1a1512',
  },
  hitCracked: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: '#a14040',
    fontWeight: 600,
    marginTop: 3,
  },
  hitPlaintext: {
    background: '#a14040',
    color: '#fffdf8',
    padding: '1px 5px',
    borderRadius: 2,
    marginLeft: 4,
  },
}

const inferenceStyles = {
  chain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  nodeWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  node: {
    background: '#fffdf8',
    border: '1px solid #d8cfbd',
    borderRadius: 5,
    padding: '8px 12px',
    minWidth: '70%',
    textAlign: 'center',
  },
  nodeHighlight: {
    background: 'rgba(184, 81, 61, 0.08)',
    borderColor: 'rgba(184, 81, 61, 0.4)',
  },
  nodeLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 500,
    color: '#1a1512',
  },
  nodeRole: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.12em',
    color: '#6b5d4a',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  connector: {
    fontSize: 16,
    color: '#9a8e78',
    margin: '2px 0',
  },
}

const emptySourceStyles = {
  wrap: {
    padding: '24px 12px',
    textAlign: 'center',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#9a8e78',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 11,
    color: '#6b5d4a',
    fontStyle: 'italic',
  },
}

const statBigStyles = {
  value: {
    fontFamily: 'var(--font-mono)',
    fontSize: 24,
    fontWeight: 500,
    color: 'var(--ink-faint)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  note: {
    fontSize: 11,
    color: 'var(--ink-faint)',
    fontStyle: 'italic',
    lineHeight: 1.5,
    padding: '8px 0',
    borderLeft: '2px dashed var(--rule)',
    paddingLeft: 10,
    marginTop: -4,
  },
}


/* ─── Animation metadata ──────────────────────────────────────────── */
export const OSINT_PROFILING_META = {
  techId: 'F1067',
  techName: 'Gather Victim Information (OSINT Profiling)',  // v25.7.0.11.1: framework's actual name first per OBS-029, with the descriptive scope of the animation in parens. Framework UI displays this technique as 'Gather Victim Information'; the animation specifically shows the OSINT-profiling sub-pattern of that broader technique.
  tacticId: 'TA0043',
  tacticName: 'Reconnaissance',
  scenario: 'SC007-prequel',
  scenarioContext: "This animation shows the OSINT phase that came BEFORE the IVR Discovery (F1073) animation's prologue. IVR Discovery's stage 1 says 'the crew buys Allison's stolen identity fragment from a dark-web dump' — this animation shows HOW that dump came into existence. The OSINT crew assembled the dossier from public sources, then sold it to the IVR-probing crew. Same Allison Brown, two adjacent reconnaissance steps.",
  totalDurationMs: 34500, // sum of stage durations at 1x
  stageCount: 7,
}


/* ─── Zones config ─────────────────────────────────────────────────── */
const OSINT_PROFILING_ZONES = {
  left: {
    title: 'Attacker',
    accentColor: 'var(--accent)',
    cream: false,
    stateKey: 'attackerZone',
    focalKey: 'attacker',
    render: renderAttackerZone,
  },
  middle: {
    title: 'Public source platforms',
    accentColor: '#6b8e5a',
    cream: true,
    stateKey: 'sourceZone',
    focalKey: 'middle',  // OSINT calls this 'middle' — different from IVR's 'ivr'
    render: renderSourceZone,
  },
  right: {
    title: 'Target awareness',
    accentColor: 'var(--warning, #c79a3a)',
    cream: false,
    stateKey: 'targetZone',
    focalKey: 'defender',
    render: renderTargetZone,
  },
}


export default {
  meta: OSINT_PROFILING_META,
  stages: OSINT_PROFILING_STAGES,
  controls: OSINT_PROFILING_CONTROLS,
  signals: OSINT_PROFILING_SIGNALS,
  zones: OSINT_PROFILING_ZONES,
}
