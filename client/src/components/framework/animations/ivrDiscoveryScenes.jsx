/**
 * ivrDiscoveryScenes.jsx — v25.7.0.9 (data) → v25.7.0.10 (now declares zones + render fns)
 *
 * Scene data + zone renderers for the F1073 IVR Discovery technique
 * animation. Consumed by the generic ProcessAnimation engine.
 *
 * v25.7.0.10 refactor: this file now also OWNS the IVR-specific zone
 * rendering. Previously the engine had ZoneAttacker / ZoneIVR /
 * ZoneDefender hardcoded. Now those renderers live here, and the
 * engine just orchestrates layout + focal signaling. This keeps the
 * engine source-agnostic and lets different animations (e.g.
 * osintProfilingScenes.jsx) render fundamentally different shapes.
 *
 * Design notes:
 * - Each stage describes the FULL state at end-of-stage. The engine
 *   animates between consecutive stages.
 * - Caribbean grounding: same Allison Brown character thread that runs
 *   through SC007 (Positioning, Defense Evasion). This animation shows
 *   the RECONNAISSANCE phase that came BEFORE SC007's positioning —
 *   i.e., "this is how the crew got Allison's banking info before they
 *   ever recruited her." Same scenario, different tactic.
 * - JMD amounts. Half-Way Tree / New Kingston references. JNCB / Scotia
 *   JM IVR conventions ("Press 1 for English, 2 para Español...").
 *
 * Pedagogical insight (locked):
 *   IVR discovery is invisible because it doesn't generate the events
 *   fraud monitoring is built to detect. The animation teaches by
 *   showing the LOUD attacker activity alongside the SILENT bank
 *   monitoring view. The defender zone stays largely empty — that
 *   silence IS the lesson.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { engineStyles, AudioWaveform, CascadeAnimation, SurgeAnimation } from './ProcessAnimation.jsx'

const styles = engineStyles  // Convenience alias for the renderer below

/* ─── Detection controls ──────────────────────────────────────────────
   Four real controls + one naive (project convention from
   PositioningTwoViews / DefenseEvasionTwoViews).

   Each control's `revealsAtStages` lists which stages would have been
   flagged if this control were active. The engine uses this to render
   the "would have caught X of Y calls" callout when the user toggles
   a control on.
   ──────────────────────────────────────────────────────────────────── */
export const IVR_DISCOVERY_CONTROLS = [
  {
    id: 'ctrl-ani-velocity',
    label: 'ANI velocity from same /17 block',
    meta: '>5 calls in 30min from spoofed numbers in same network range',
    naive: false,
    revealsAtStages: [6],
    catchCount: 38, // would have flagged 38 of 50 stage-6 calls
    catchTotal: 50,
  },
  {
    id: 'ctrl-nav-speed',
    label: 'Super-human navigation speed',
    meta: 'Skipping voice prompts <0.5s consistently',
    naive: false,
    revealsAtStages: [2, 3, 4, 5, 6],
    catchCount: 5,
    catchTotal: 5, // one flag per probe call
  },
  {
    id: 'ctrl-balance-only',
    label: 'Short-duration balance-only pattern',
    meta: 'Auth → balance check → hangup, all in <30s',
    naive: false,
    revealsAtStages: [5, 6],
    catchCount: 50,
    catchTotal: 51, // every validation call follows this shape
  },
  {
    id: 'ctrl-auth-retry',
    label: 'Failed-then-successful auth across ANIs',
    meta: 'Rapid auth retries followed by success on different caller ID',
    naive: false,
    revealsAtStages: [3, 4],
    catchCount: 2,
    catchTotal: 2,
  },
  {
    id: 'ctrl-naive-block',
    label: 'Block call after 3 failed authentications',
    meta: 'No match · attacker spaces failed attempts across spoofed ANIs',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
  },
]

/* ─── IVR menu structure (rendered in middle zone) ────────────────────
   The real Scotia JM / JNCB IVR has a similar shape. The animation
   highlights different paths through this tree at different stages.
   ──────────────────────────────────────────────────────────────────── */
export const IVR_MENU = [
  { key: '1', label: 'Account balance',     authRequired: true },
  { key: '2', label: 'Recent transactions', authRequired: true },
  { key: '3', label: 'Transfer funds',      authRequired: true },
  { key: '4', label: 'Speak to an agent',   authRequired: false },
  { key: '9', label: 'Exit',                authRequired: false },
]

/* ─── The 7 stages ─────────────────────────────────────────────────── */
export const IVR_DISCOVERY_STAGES = [

  /* ─── Stage 1 ────────────────────────────────────────────────────── */
  {
    id: 'stage-1',
    label: 'Prologue',
    title: 'Crew acquires partial customer data',
    caption: "Off-stage, the crew buys Allison Brown's stolen identity fragment from a dark-web dump: name, DOB, last 4 of account. Account number, PIN, and balance are unknown. They need the IVR to fill the gaps.",
    durationMs: 3500,
    focalZone: 'attacker',
    attackerZone: {
      notepad: [
        { label: 'Name',          value: 'Allison Brown',   confirmed: true },
        { label: 'DOB',           value: '12-Mar-2003',     confirmed: true },
        { label: 'Last 4',        value: '4481',            confirmed: true },
        { label: 'Full account #', value: '?',              confirmed: false },
        { label: 'PIN',           value: '?',               confirmed: false },
        { label: 'Balance',       value: '?',               confirmed: false },
      ],
      callsPlaced: 0,
      activity: 'planning',
    },
    ivrZone: {
      callerIdShown: false,
      callerId: null,
      activeMenuKey: null,
      pathTraversed: [],
      callDurationMs: null,
      keyPressLog: [],
      promptText: null,
      isCallActive: false,
    },
    defenderZone: {
      callsToday: 0,
      uniqueAniToday: 0,
      avgCallDuration: null,
      alertsToday: 0,
    },
    revealedSignalIds: [],
  },

  /* ─── Stage 2 ────────────────────────────────────────────────────── */
  {
    id: 'stage-2',
    label: 'Probe #1',
    title: 'Map the menu — no auth attempted',
    caption: 'First call: spoofed caller ID makes it look like the call comes from a Kingston mobile number. The attacker listens through every menu option, captures the structure, hangs up. No authentication tried — pure reconnaissance.',
    durationMs: 6000,
    focalZone: 'ivr',
    attackerZone: {
      notepad: [
        { label: 'Name',          value: 'Allison Brown',  confirmed: true },
        { label: 'DOB',           value: '12-Mar-2003',    confirmed: true },
        { label: 'Last 4',        value: '4481',           confirmed: true },
        { label: 'Menu structure', value: 'Mapped',        confirmed: true, justAdded: true },
        { label: 'Full account #', value: '?',             confirmed: false },
        { label: 'PIN',           value: '?',              confirmed: false },
        { label: 'Balance',       value: '?',              confirmed: false },
      ],
      callsPlaced: 1,
      activity: 'probing',
    },
    ivrZone: {
      callerIdShown: true,
      callerId: '+1 876 555 0142',
      activeMenuKey: '4',
      pathTraversed: ['1', '2', '3', '4', '9'],
      callDurationMs: 38000,
      keyPressLog: ['1', '*', '2', '*', '3', '*', '4', '*', '9'],
      promptText: 'Welcome to JNCB Telebanking. Press 1 for account balance...',
      isCallActive: true,
    },
    defenderZone: {
      callsToday: 1,
      uniqueAniToday: 1,
      avgCallDuration: 38000,
      alertsToday: 0,
    },
    revealedSignalIds: ['sig-nav-speed'],
  },

  /* ─── Stage 3 ────────────────────────────────────────────────────── */
  {
    id: 'stage-3',
    label: 'Probe #2',
    title: 'Test the auth boundary — first guess fails',
    caption: 'Second call: attacker selects "Account balance," gets prompted for the account number. Enters a guess based on the last-4 they have. Distinct error tone — wrong account. Hangs up immediately. Now they know the format.',
    durationMs: 5500,
    focalZone: 'ivr',
    attackerZone: {
      notepad: [
        { label: 'Name',           value: 'Allison Brown', confirmed: true },
        { label: 'DOB',            value: '12-Mar-2003',   confirmed: true },
        { label: 'Last 4',         value: '4481',          confirmed: true },
        { label: 'Menu structure',  value: 'Mapped',       confirmed: true },
        { label: 'Account # format', value: '8 digits, last 4 known', confirmed: true, justAdded: true },
        { label: 'Full account #',  value: '????4481',     confirmed: false },
        { label: 'PIN',            value: '?',             confirmed: false },
      ],
      callsPlaced: 2,
      activity: 'probing',
    },
    ivrZone: {
      callerIdShown: true,
      callerId: '+1 876 555 8830',
      activeMenuKey: '1',
      pathTraversed: ['1'],
      callDurationMs: 14000,
      keyPressLog: ['1', '#', '2', '0', '0', '4', '4', '4', '8', '1', '#'],
      promptText: 'Account number not found. Goodbye.',
      isCallActive: false,
      lastResult: 'auth-failed',
    },
    defenderZone: {
      callsToday: 2,
      uniqueAniToday: 2,
      avgCallDuration: 26000,
      alertsToday: 0,
    },
    revealedSignalIds: ['sig-nav-speed', 'sig-auth-retry-attempt'],
  },

  /* ─── Stage 4 ────────────────────────────────────────────────────── */
  {
    id: 'stage-4',
    label: 'Probe #3',
    title: 'Auth boundary — second guess hits',
    caption: 'Third call (different spoofed ANI, 12 minutes later). Attacker tries another account number guess. Correct! IVR proceeds to PIN prompt. Attacker hangs up — they don\'t need to enter the PIN, they just confirmed the account exists.',
    durationMs: 5500,
    focalZone: 'attacker',
    attackerZone: {
      notepad: [
        { label: 'Name',           value: 'Allison Brown',  confirmed: true },
        { label: 'DOB',            value: '12-Mar-2003',    confirmed: true },
        { label: 'Last 4',         value: '4481',           confirmed: true },
        { label: 'Menu structure',  value: 'Mapped',        confirmed: true },
        { label: 'Account # format', value: '8 digits, last 4 known', confirmed: true },
        { label: 'Full account #',  value: '20044481',      confirmed: true, justAdded: true },
        { label: 'PIN',            value: '?',              confirmed: false },
      ],
      callsPlaced: 3,
      activity: 'mining',
    },
    ivrZone: {
      callerIdShown: true,
      callerId: '+1 876 555 6612',
      activeMenuKey: '1',
      pathTraversed: ['1'],
      callDurationMs: 18000,
      keyPressLog: ['1', '#', '2', '0', '0', '4', '4', '4', '8', '1', '#'],
      promptText: 'Please enter your PIN.',
      isCallActive: false,
      lastResult: 'auth-prompt-pin',
    },
    defenderZone: {
      callsToday: 3,
      uniqueAniToday: 3,
      avgCallDuration: 23000,
      alertsToday: 0,
    },
    revealedSignalIds: ['sig-nav-speed', 'sig-auth-retry-success'],
  },

  /* ─── Stage 5 ────────────────────────────────────────────────────── */
  {
    id: 'stage-5',
    label: 'Validation',
    title: "Allison's account confirmed — balance harvested",
    caption: 'Crew has now obtained the PIN through a separate phishing channel (off-stage). They call back, breeze through authentication, listen to balance ("JMD $14,200"), hang up. 18 seconds total. The IVR sees a balance check. So does fraud monitoring — and finds it indistinguishable from a real customer.',
    durationMs: 6000,
    focalZone: 'ivr',
    attackerZone: {
      notepad: [
        { label: 'Name',          value: 'Allison Brown',  confirmed: true },
        { label: 'DOB',           value: '12-Mar-2003',    confirmed: true },
        { label: 'Full account #', value: '20044481',      confirmed: true },
        { label: 'PIN',           value: '4827',           confirmed: true, justAdded: true },
        { label: 'Balance',       value: 'JMD $14,200',    confirmed: true, justAdded: true },
        { label: 'Account active', value: 'Yes',            confirmed: true, justAdded: true },
      ],
      callsPlaced: 4,
      activity: 'mining',
    },
    ivrZone: {
      callerIdShown: true,
      callerId: '+1 876 555 9201',
      activeMenuKey: '1',
      pathTraversed: ['1'],
      callDurationMs: 18000,
      keyPressLog: ['1', '#', '2', '0', '0', '4', '4', '4', '8', '1', '#', '4', '8', '2', '7', '#'],
      promptText: 'Your available balance is JMD $14,200.',
      isCallActive: false,
      lastResult: 'balance-success',
    },
    defenderZone: {
      callsToday: 4,
      uniqueAniToday: 4,
      avgCallDuration: 22000,
      alertsToday: 0,
    },
    revealedSignalIds: ['sig-nav-speed', 'sig-balance-only'],
  },

  /* ─── Stage 6 ────────────────────────────────────────────────────── */
  {
    id: 'stage-6',
    label: 'Industrial scale',
    title: '50 accounts validated in one hour',
    caption: 'Now the crew runs the same playbook against 50 stolen identity fragments. 50 spoofed caller IDs in 60 minutes. Each call lasts 16-22 seconds. Total IVR call volume looks elevated but plausible. Fraud monitoring shows ZERO alerts because no transactions occurred.',
    durationMs: 7000,
    focalZone: 'attacker',
    attackerZone: {
      notepad: [
        { label: '50 accounts validated',  value: 'JMD $760K total mapped', confirmed: true, highlight: true },
        { label: 'Avg call duration',      value: '19 seconds',             confirmed: true },
        { label: 'Spoofed ANIs used',      value: '47 distinct',            confirmed: true },
        { label: 'Failed attempts',        value: '12 (silently retried)',  confirmed: true },
        { label: 'Time elapsed',           value: '64 minutes',             confirmed: true },
      ],
      callsPlaced: 51,
      activity: 'industrial',
      cascadeAnimation: true, // engine renders falling/cascading rows
    },
    ivrZone: {
      callerIdShown: true,
      callerId: '+1 876 555 ████',  // shown as redacted to convey churn
      activeMenuKey: '1',
      pathTraversed: ['1'],
      callDurationMs: 19000,
      keyPressLog: [],
      promptText: '... Your available balance is ...',
      isCallActive: true,
      surgeAnimation: true, // engine renders rapid-cycle of caller IDs
    },
    defenderZone: {
      callsToday: 51,
      uniqueAniToday: 47,
      avgCallDuration: 19000,
      alertsToday: 0,
    },
    revealedSignalIds: [
      'sig-nav-speed', 'sig-balance-only', 'sig-ani-velocity', 'sig-volume-spike',
    ],
  },

  /* ─── Stage 7 ────────────────────────────────────────────────────── */
  {
    id: 'stage-7',
    label: 'Handoff',
    title: 'Validated dataset ready for next-phase attack',
    caption: '4 hours of attacker activity. 51 calls. 50 accounts mapped with current balances, PINs, account numbers. Bank monitoring fired 0 alerts. The dataset is now sold or used directly: account takeovers, social-engineered agents, vishing campaigns against the 50 customers. The reconnaissance is complete.',
    durationMs: 5000,
    focalZone: 'defender',
    attackerZone: {
      notepad: [
        { label: '50 accounts',           value: 'Validated', confirmed: true, highlight: true },
        { label: 'Total balances mapped',  value: 'JMD $760K', confirmed: true },
        { label: 'Reconnaissance phase',   value: 'COMPLETE',  confirmed: true, highlight: true },
        { label: 'Next phase',            value: 'Account takeover / vishing', confirmed: false, hint: true },
      ],
      callsPlaced: 51,
      activity: 'complete',
    },
    ivrZone: {
      callerIdShown: false,
      callerId: null,
      activeMenuKey: null,
      pathTraversed: [],
      callDurationMs: null,
      keyPressLog: [],
      promptText: null,
      isCallActive: false,
    },
    defenderZone: {
      callsToday: 51,
      uniqueAniToday: 47,
      avgCallDuration: 19000,
      alertsToday: 0,
      finalHeadline: '0 alerts during 4 hours of attacker reconnaissance. JMD $760K of accounts mapped. The IVR did exactly what it was designed to do.',
    },
    revealedSignalIds: [
      'sig-nav-speed', 'sig-balance-only', 'sig-ani-velocity', 'sig-volume-spike',
    ],
  },
]

/* ─── Hidden signals catalog ──────────────────────────────────────────
   Signals that exist in the call data but stay below the alert threshold
   unless the corresponding detection control is toggled on.
   ──────────────────────────────────────────────────────────────────── */
export const IVR_DISCOVERY_SIGNALS = [
  {
    id: 'sig-nav-speed',
    label: 'Navigation speed',
    description: 'Caller skipped voice prompts <0.5s after they began. Real customers PAUSE to listen — attackers know the menu cold.',
    revealedBy: 'ctrl-nav-speed',
  },
  {
    id: 'sig-auth-retry-attempt',
    label: 'Auth fail (single)',
    description: 'Failed account-number entry. By itself: noise. In aggregate with stage-4 success: a guessing pattern.',
    revealedBy: 'ctrl-auth-retry',
  },
  {
    id: 'sig-auth-retry-success',
    label: 'Auth retry success on different ANI',
    description: 'Auth failure followed minutes later by success from a different caller ID, on the same account number range. Indicates probing.',
    revealedBy: 'ctrl-auth-retry',
  },
  {
    id: 'sig-balance-only',
    label: 'Balance-only short call',
    description: 'Authenticated, checked balance, hung up — under 30 seconds, no other actions. Real customers usually do more or take longer.',
    revealedBy: 'ctrl-balance-only',
  },
  {
    id: 'sig-ani-velocity',
    label: 'ANI block velocity',
    description: '47 of the 51 calls spoofed from 3 adjacent /17 IP blocks consistent with one VoIP gateway. Real customers are geographically distributed.',
    revealedBy: 'ctrl-ani-velocity',
  },
  {
    id: 'sig-volume-spike',
    label: 'IVR volume spike (unauthenticated)',
    description: '51 IVR calls in 64 minutes against accounts that show no other channel activity. Plausible at population scale, suspicious at this concentration.',
    revealedBy: 'ctrl-ani-velocity',
  },
]

/* ─── Animation metadata ──────────────────────────────────────────── */
export const IVR_DISCOVERY_META = {
  techId: 'F1073',
  techName: 'IVR Discovery',
  tacticId: 'TA0043',
  tacticName: 'Reconnaissance',
  scenario: 'SC007-prequel',
  scenarioContext: "This animation shows the reconnaissance phase that happened BEFORE Allison was ever recruited as a money mule in SC007. The crew that recruited her had been mining the JNCB IVR for weeks to identify accounts worth targeting. Allison's account was one of 50 they validated this way.",
  totalDurationMs: 38500, // sum of stage durations at 1x
  stageCount: 7,
}

/* ─── Activity-chip label map for the attacker zone ───────────────── */
const ATTACKER_ACTIVITY_LABEL = {
  planning:    'PLANNING',
  probing:     'PROBING THE IVR',
  mining:      'MINING DATA',
  industrial:  'INDUSTRIAL SCALE',
  complete:    'RECON COMPLETE',
}

/* ─── Zone renderer: Attacker (left zone) ────────────────────────────
   Receives { state } (the stage's attackerZone object). Returns the
   INNER content of the zone — engine wraps in <ZoneFrame> for focal
   signaling.
   ──────────────────────────────────────────────────────────────────── */
function renderAttackerZone({ state }) {
  if (!state) return null
  return (
    <>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Notepad</div>
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
        <div style={styles.zoneSectionLabel}>Calls placed</div>
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
          {ATTACKER_ACTIVITY_LABEL[state.activity] || state.activity}
        </div>
      </div>

      {state.cascadeAnimation && <CascadeAnimation />}
    </>
  )
}

/* ─── Zone renderer: IVR (middle zone) ────────────────────────────────
   Receives { state, scenes }. Pulls the IVR menu from scenes.ivrMenu.
   ──────────────────────────────────────────────────────────────────── */
function renderIvrZone({ state, scenes }) {
  if (!state) return null
  const ivrMenu = scenes.ivrMenu || []
  return (
    <>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabelCream}>Caller ID</div>
        {state.callerIdShown ? (
          <motion.div
            key={state.callerId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.callerIdDisplay}
          >
            ☎ {state.callerId}
          </motion.div>
        ) : (
          <div style={styles.callerIdEmpty}>— No active call —</div>
        )}
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabelCream}>Menu</div>
        <div style={styles.menuTree}>
          {ivrMenu.map(item => {
            const isActive = state.activeMenuKey === item.key
            const wasTraversed = (state.pathTraversed || []).includes(item.key)
            return (
              <motion.div
                key={item.key}
                animate={{
                  background: isActive
                    ? 'rgba(107, 142, 90, 0.25)'
                    : wasTraversed
                      ? 'rgba(107, 142, 90, 0.10)'
                      : 'transparent',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  ...styles.menuItem,
                  ...(isActive ? styles.menuItemActive : {}),
                }}
              >
                <span style={styles.menuKey}>{item.key}</span>
                <span style={styles.menuLabel}>{item.label}</span>
                {item.authRequired && (
                  <span style={styles.menuAuthChip}>auth</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {state.isCallActive && <AudioWaveform />}

      {state.promptText && (
        <motion.div
          key={state.promptText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={styles.promptBubble}
        >
          <span style={styles.promptBubbleQuote}>"</span>
          {state.promptText}
          <span style={styles.promptBubbleQuote}>"</span>
        </motion.div>
      )}

      {state.callDurationMs != null && (
        <div style={styles.callDuration}>
          Call duration: {(state.callDurationMs / 1000).toFixed(0)}s
        </div>
      )}

      {state.surgeAnimation && <SurgeAnimation />}
    </>
  )
}

/* ─── Zone renderer: Defender (right zone) ────────────────────────────
   Receives { state, revealedSignals, activeControls, controlById }.
   ──────────────────────────────────────────────────────────────────── */
function renderDefenderZone({ state, revealedSignals, activeControls }) {
  if (!state) return null
  return (
    <>
      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Today</div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>Calls received</span>
          <motion.span
            key={state.callsToday}
            initial={{ color: 'var(--accent-hi, #d66e5a)' }}
            animate={{ color: 'var(--ink)' }}
            transition={{ duration: 0.5 }}
            style={styles.statValue}
          >
            {state.callsToday}
          </motion.span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>Unique ANIs</span>
          <span style={styles.statValue}>{state.uniqueAniToday}</span>
        </div>
        {state.avgCallDuration != null && (
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Avg call duration</span>
            <span style={styles.statValue}>
              {(state.avgCallDuration / 1000).toFixed(0)}s
            </span>
          </div>
        )}
      </div>

      <div style={styles.zoneSection}>
        <div style={styles.zoneSectionLabel}>Alerts</div>
        <motion.div
          animate={{
            color: state.alertsToday === 0
              ? 'var(--ink-faint)'
              : 'var(--accent-hi, #d66e5a)',
          }}
          style={{
            ...styles.bigCounter,
            color: state.alertsToday === 0 ? 'var(--ink-faint)' : 'var(--accent-hi, #d66e5a)',
          }}
        >
          {state.alertsToday}
        </motion.div>
        {state.alertsToday === 0 && (
          <div style={styles.silentBadge}>SILENT</div>
        )}
      </div>

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

/* ─── Zones config: tells engine which renderer goes where + how to
       wrap each in ZoneFrame ───────────────────────────────────────── */
const IVR_DISCOVERY_ZONES = {
  left: {
    title: 'Attacker',
    accentColor: 'var(--accent)',
    cream: false,
    stateKey: 'attackerZone',
    focalKey: 'attacker',
    render: renderAttackerZone,
  },
  middle: {
    title: 'IVR System',
    accentColor: '#6b8e5a',
    cream: true,
    stateKey: 'ivrZone',
    focalKey: 'ivr',
    render: renderIvrZone,
  },
  right: {
    title: 'Bank fraud monitoring',
    accentColor: 'var(--warning, #c79a3a)',
    cream: false,
    stateKey: 'defenderZone',
    focalKey: 'defender',
    render: renderDefenderZone,
  },
}

export default {
  meta: IVR_DISCOVERY_META,
  stages: IVR_DISCOVERY_STAGES,
  controls: IVR_DISCOVERY_CONTROLS,
  signals: IVR_DISCOVERY_SIGNALS,
  ivrMenu: IVR_MENU,
  zones: IVR_DISCOVERY_ZONES,
}
