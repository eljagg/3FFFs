/**
 * visualizations.js — v25.7.0.2 seed data (ISS-023)
 *
 * Registry of visualization instances. Each entry is a binding between a
 * visualization KIND (which maps to a React component on the client) and an
 * ENTITY in the graph (Tactic, Technique, Concept, Stage, FrameworkPhase…).
 *
 * The visualization code itself ships with the client. This file declares
 * which visualizations exist, what they render against, what config they
 * use, and which roles they target.
 *
 * Why this shape (and what it deliberately is NOT):
 *
 *   - It is NOT a CMS for visualizations. We do not store SVG, HTML, or
 *     rendering logic in Neo4j. Doing so would mean every visual edit is
 *     a database migration, and every new chart kind is unparseable until
 *     the client gets corresponding code anyway. That trade is worse than
 *     the perceived flexibility.
 *
 *   - It IS a thin registry. Three things per entry: kind (which component
 *     to render), config (presentation choices for that component), and
 *     attachment (which graph entity this viz visualizes). The role array
 *     is the OBS-018 four-lens declaration — the renderer hides the viz
 *     for roles not listed.
 *
 *   - The config blob has a soft size cap of ~2 KB. If config grows past
 *     that, the right move is almost always to push structural data back
 *     into the graph (as nodes and edges) rather than encode it in JSON.
 *     Config is for presentation choices, not for graph data.
 *
 * Extending this file: add a new entry, run `npm run migrate:visualizations`,
 * point a UI surface at the relevant attached-entity endpoint. No client
 * change needed unless you're introducing a new KIND, in which case you
 * also build the corresponding component and register it in the renderer.
 *
 * v25.7.0.2 spike scope: ONE visualization, attached to TA0043
 * (Reconnaissance), kind = kill_chain_grid, audience = analyst/soc/executive.
 * Tellers explicitly NOT in the audience for this first viz — the teller
 * interaction will land in v25.7.1 once we have data on whether the pattern
 * works for the other three roles. OBS-018 documents this as the discipline.
 */

/**
 * RECONNAISSANCE KILL-CHAIN — content model decision (Option A from planning)
 *
 * F3's Reconnaissance tactic (TA0043) currently has only two indexed
 * techniques (F1067 Gather Victim Information, F1073 IVR Discovery). That's
 * not enough nodes to render a meaningful kill-chain visualization from
 * pure F3 graph data.
 *
 * Rather than pollute the F3 graph with techniques that aren't part of
 * F3's curated subset, this visualization is authored as a TEACHING
 * ABSTRACTION — explicitly framed as illustrative of how reconnaissance
 * generally works in financial-sector intrusions. The technique IDs cited
 * in node labels (T1593, T1589, T1110, etc.) are real MITRE ATT&CK IDs so
 * a curious user can drill out to attack.mitre.org.
 *
 * The framing is reinforced in the viz subtitle and in a small marker
 * at the bottom of the panel: "Illustrative — the F3 techniques formally
 * indexed for this tactic appear below."
 *
 * If, in v25.7.x, we decide to seed the missing reconnaissance techniques
 * into F3 and render this kill-chain from real graph data, the data shape
 * here is already aligned with that path — the config matches what a
 * graph-fed version would produce.
 */
const RECON_KILL_CHAIN_CONFIG = {
  // Three columns left-to-right; each node belongs to one phase by index
  phases: [
    { id: 'passive',  label: 'Passive Harvest' },
    { id: 'active',   label: 'Active Validation' },
    { id: 'pivot',    label: 'Pivot & Target' },
  ],

  nodes: [
    // Phase 0 — Passive Harvest
    { id: 'social',     phase: 0, label: 'Social Media Scrape',     mitre: 'T1593',
      description: 'Harvesting public profiles, employment history, and customer relationships from LinkedIn, obituaries, and corporate announcements.' },
    { id: 'records',    phase: 0, label: 'Public Records (TRN)',    mitre: 'T1589',
      description: 'Gathering identity documents, business registrations, and other publicly filed material that can be replayed in identity-verification calls.' },
    { id: 'brokers',    phase: 0, label: 'Data Broker Lists',        mitre: 'T1592',
      description: 'Purchasing leaked or aggregated credential and account-detail bundles from criminal marketplaces.' },

    // Phase 1 — Active Validation
    { id: 'phishing',   phase: 1, label: 'Spearphishing for Info',   mitre: 'T1598',
      description: 'Targeted emails using harvested context to elicit credentials, security answers, or confirmation of account details.' },
    { id: 'scanning',   phase: 1, label: 'Infrastructure Scanning',  mitre: 'T1595',
      description: 'Probing customer-facing portals, VPN endpoints, and authentication APIs for known-vulnerable software or weak controls.' },
    { id: 'enumeration',phase: 1, label: 'Account Enumeration',      mitre: 'T1589',
      description: 'Testing harvested email addresses against login portals to confirm which are valid before staging credential attacks.' },

    // Phase 2 — Pivot & Target
    { id: 'stuffing',   phase: 2, label: 'Credential Stuffing',      mitre: 'T1110',
      description: 'Automated login attempts against confirmed accounts using credential bundles — productive against any account where the customer reused a leaked password.' },
    { id: 'identity',   phase: 2, label: 'Account Takeover',         mitre: 'T1078',
      description: 'Full takeover of a customer account using validated credentials, often combined with SIM swap or social-engineered MFA bypass.' },
    { id: 'wire',       phase: 2, label: 'Wire / Transfer Fraud',    mitre: 'T1565',
      description: 'Exfiltration of funds through wire transfers, mule networks, or rapid-cashout instruments while the legitimate customer is unaware.' },
  ],

  // Source -> targets. Drives both the highlight-on-select behaviour and
  // (in a future v25.7.x release) the visible edge rendering.
  edges: [
    { from: 'social',      to: 'phishing' },
    { from: 'social',      to: 'enumeration' },
    { from: 'records',     to: 'phishing' },
    { from: 'records',     to: 'identity' },
    { from: 'brokers',     to: 'enumeration' },
    { from: 'brokers',     to: 'stuffing' },
    { from: 'phishing',    to: 'identity' },
    { from: 'phishing',    to: 'wire' },
    { from: 'scanning',    to: 'stuffing' },
    { from: 'scanning',    to: 'wire' },
    { from: 'enumeration', to: 'stuffing' },
    { from: 'enumeration', to: 'identity' },
  ],

  // Defenses are the falsifiability hook — each one explicitly claims to
  // mitigate one or more nodes. Toggle on, those nodes go grey + shielded.
  // The user can SEE the kill-chain breaking under their input. That is the
  // pedagogical commitment we made: every viz must have an analogous hook.
  defenses: [
    { id: 'mfa',          label: 'Multi-Factor Auth (MFA)',
      mitigates: ['stuffing', 'identity'],
      hint: 'Hardware keys and app-based authenticators break credential-replay paths even when the password is known.' },
    { id: 'hygiene',      label: 'Social-Media Hygiene Programme',
      mitigates: ['social', 'phishing'],
      hint: 'Reducing the public footprint of high-net-worth customers and executive staff removes the raw material spearphishing depends on.' },
    { id: 'segmentation', label: 'Network / Process Segmentation',
      mitigates: ['scanning', 'wire'],
      hint: 'Internal segmentation prevents successful scanning from translating into transfer authority — even a compromised endpoint cannot reach the wire system.' },
    { id: 'monitoring',   label: 'Lookalike-Domain Monitoring',
      mitigates: ['phishing', 'enumeration'],
      hint: 'Surveilling registrar feeds for typo-squatted bank domains catches the infrastructure phase before phishing email reaches anyone.' },
  ],

  // Marker that renders at the bottom of the viz panel
  illustrativeNote: 'Illustrative — adversary lifecycle for reconnaissance. The F3 techniques formally indexed for this tactic appear below.',
}

/* ─────────────────────────────────────────────────────────────────────────
 * v25.7.0.3 — POSITIONING TIMELINE config (FA0001, F3-unique)
 *
 * Two examples drawn from existing scenarios:
 *   - SC007: Account Rental — money mule onboarding pattern
 *   - SC008: ATM Skimming — physical-access positioning
 *
 * Each example has four parallel arrays:
 *   - attackerActions: what the attacker is doing on each day
 *   - signals:         detection signals that appear, with stable IDs
 *   - controls:        defender controls the user can toggle, each
 *                      declaring which signal IDs would trigger it
 *   - totalDays:       length of the positioning phase before execution
 *
 * The signals arrays mirror the actual signals in the scenario seed for
 * SC007-S2 and SC008-S2, plus a few inferred-from-narrative ones to make
 * the timeline more legible. Stage IDs used as signal-ID prefixes so an
 * auditor can trace from viz back to scenario stage.
 *
 * controls.firesOnSignals tells the visualization which controls would
 * activate on which signal days. The user toggles a control on; the viz
 * looks up the earliest day any of that control's signals appears, and
 * shows the control firing on that day.
 * ─────────────────────────────────────────────────────────────────────── */
const POSITIONING_TIMELINE_CONFIG = {
  examples: [
    {
      scenarioId: 'SC007',
      tabLabel: 'Account Rental',
      scenarioTitle: 'Account Rental — the money mule pipeline',
      totalDays: 30,
      attackerActions: [
        { day: 0,  label: 'Allison opens account' },
        { day: 1,  label: 'Crew adds device to mobile banking' },
        { day: 1,  label: 'Crew obtains creds + PIN from Allison' },
        { day: 8,  label: 'E-delivery email changed to Gmail throwaway' },
        { day: 11, label: 'First incoming transfer from unrelated party' },
        { day: 14, label: '2nd, 3rd incoming transfers, no salary' },
        { day: 28, label: 'Crew prepares onward outbound transfers' },
        { day: 30, label: 'EXECUTION — outbound mule transfers begin' },
      ],
      signals: [
        // Real signals from SC007-S2 with stable IDs the controls can target
        { id: 'sig-edelivery-gmail',     day: 8,  severity: 'high',
          text: 'E-delivery notification address changed to free-email domain within 10 days of account opening' },
        { id: 'sig-device-fingerprint',  day: 1,  severity: 'high',
          text: 'Mobile banking device fingerprint changes within 48 hours of account opening' },
        { id: 'sig-no-salary-incoming',  day: 14, severity: 'medium',
          text: 'First three transactions are all incoming transfers from unrelated parties — not salary, not family' },
      ],
      controls: [
        {
          id: 'ctrl-auto-freeze-edelivery-change',
          shortLabel: 'Auto-freeze on early e-delivery change',
          firesOnSignals: ['sig-edelivery-gmail'],
        },
        {
          id: 'ctrl-device-velocity-alert',
          shortLabel: 'Device velocity alert (new device <48h after open)',
          firesOnSignals: ['sig-device-fingerprint'],
        },
        {
          id: 'ctrl-incoming-pattern-anomaly',
          shortLabel: 'Incoming-only pattern anomaly (no salary in 30d)',
          firesOnSignals: ['sig-no-salary-incoming'],
        },
        {
          id: 'ctrl-naive-sms',
          shortLabel: 'SMS alert customer on every config change',
          // Mule controls the device — the SMS reaches them, they ignore it.
          // Empty firesOnSignals = the control "exists" but never catches anything.
          firesOnSignals: [],
        },
      ],
    },
    {
      scenarioId: 'SC008',
      tabLabel: 'ATM Skimming',
      scenarioTitle: 'ATM Skimming — Sam Sharpe Square tourist zone',
      totalDays: 5,
      attackerActions: [
        { day: 0, label: 'Crew installs skimmer + pinhole camera' },
        { day: 1, label: 'First card-PIN pairs captured' },
        { day: 1, label: 'Nightly Bluetooth retrieval' },
        { day: 2, label: '~140 cards/PINs captured' },
        { day: 3, label: '~280 cards/PINs captured' },
        { day: 3, label: '412 total card-PIN pairs captured' },
        { day: 4, label: 'Skimmer moved to a different ATM 6 blocks away' },
        { day: 5, label: 'EXECUTION — first cloned-card fraud complaints' },
      ],
      signals: [
        // Real signals from SC008-S2
        { id: 'sig-shared-atm-cluster',   day: 5,  severity: 'high',
          text: 'Customer fraud complaints cluster around a single common ATM in past 72h' },
        { id: 'sig-graph-shared-atm',     day: 5,  severity: 'high',
          text: 'Graph analysis: fraud victims share a common ATM in 7 days prior' },
        { id: 'sig-tourist-fraud-spike',  day: 4,  severity: 'medium',
          text: 'Tourist-card dispute volume spikes >3x seasonal baseline' },
      ],
      controls: [
        {
          id: 'ctrl-graph-shared-atm-analytics',
          shortLabel: 'Graph analytics — link victims by shared ATM use',
          firesOnSignals: ['sig-graph-shared-atm', 'sig-shared-atm-cluster'],
        },
        {
          id: 'ctrl-tourist-baseline-alert',
          shortLabel: 'Tourist-zone fraud-volume baseline alert',
          firesOnSignals: ['sig-tourist-fraud-spike'],
        },
        {
          id: 'ctrl-naive-cctv',
          shortLabel: 'Manually review CCTV at every ATM in MoBay',
          // Cost-prohibitive and CCTV coverage is inconsistent — the
          // signals exist in the timeline but this control never reaches
          // them in time, modeled as no-op.
          firesOnSignals: [],
        },
        {
          id: 'ctrl-naive-customer-complaints',
          shortLabel: 'Wait for formal customer complaints',
          firesOnSignals: [],
        },
      ],
    },
  ],
}


/* ─────────────────────────────────────────────────────────────────────────
 * v25.7.0.4 — POSITIONING TWO VIEWS config (FA0001, second viz on this tactic)
 *
 * Disguise-reveal visualization — companion to the PositioningTimeline
 * shipped in v25.7.0.3. Same tactic (FA0001), different teaching frame:
 *
 *   - Timeline emphasizes WHEN signals appear (temporal axis)
 *   - Two Views emphasizes WHAT'S HIDDEN vs WHAT'S VISIBLE (disguise axis)
 *
 * Both render together when the user expands FA0001 on the Framework page.
 * Empirical question for v25.7.x: which one users engage with more.
 * Telemetry on viz events (already shipped) gives us the answer.
 *
 * The kind is `two_views` (not `positioning_two_views`) because the same
 * component generalizes to Reconnaissance ("what we see in the OSINT trail
 * vs what the attacker has compiled"), Defense Evasion ("the cover story
 * vs the action"), and Monetization ("the wire transfers vs the cashout
 * structure"). Future v25.7.0.x releases reuse this kind with new content.
 *
 * v25.7.0.4 ships ONE example: SC007 Account Rental. SC008 ATM Skimming
 * is a candidate for the next release once we've verified the SC007 frame
 * works in production.
 * ─────────────────────────────────────────────────────────────────────── */
const POSITIONING_TWO_VIEWS_CONFIG = {
  examples: [
    {
      scenarioId: 'SC007',
      tabLabel: 'Account Rental',
      scenarioTitle: 'Account Rental — the money mule pipeline',

      customer: {
        initial: 'A',
        name:    'Allison Brown',
        id:      'AB204481',
        tenure:  'Customer for 30 days',
      },

      quickStats: [
        { label: 'KYC',           value: 'Verified · in person', success: true },
        { label: 'Channels',      value: 'Branch + Mobile' },
        { label: 'Last activity', value: '2 hours ago' },
        { label: 'Open cases',    value: 'None' },
      ],

      activity: [
        { id: 'open',         day: 0,  desc: 'Account opened in branch', counterparty: '—',          amount: '—',           status: 'verified', revealedBy: null },
        { id: 'firstdeposit', day: 0,  desc: 'First deposit · cash',     counterparty: 'In branch',  amount: '$50.00',      status: 'cleared', revealedBy: null },
        { id: 'incoming1',    day: 11, desc: 'Incoming transfer',        counterparty: 'External · J.M.', amount: '$1,840.00', status: 'cleared',
          truth: "Funds from crew's established mule. Not salary. Not family. First test transfer.",
          revealedBy: 'ctrl-incoming-anomaly' },
        { id: 'incoming2',    day: 12, desc: 'Incoming transfer',        counterparty: 'External · K.W.', amount: '$2,200.00', status: 'cleared',
          truth: 'Second crew test. Confirms account is operational under their control.',
          revealedBy: 'ctrl-incoming-anomaly' },
        { id: 'incoming3',    day: 14, desc: 'Incoming transfer',        counterparty: 'External · D.H.', amount: '$4,500.00', status: 'cleared',
          truth: 'Larger crew transfer. Pattern: 3 incoming, no salary, no family. Mule live.',
          revealedBy: 'ctrl-incoming-anomaly' },
      ],

      settings: [
        { id: 'addr',   key: 'Mailing address',        value: '14 Hope Rd, Kingston 6', when: 'D0', whenPill: false, revealedBy: null },
        { id: 'phone',  key: 'Mobile number',          value: '+1 876 555 0142',         when: 'D0', whenPill: false, revealedBy: null },
        { id: 'email',  key: 'E-delivery email',       value: 'a.brown.kgn@gmail.com',   when: 'D8', whenPill: true,
          truth: 'Throwaway Gmail registered by crew. Real email is allison.brown@scotia.com.jm.',
          revealedBy: 'ctrl-edelivery' },
        { id: 'device', key: 'Mobile banking device',  value: 'iPhone 14 · iOS 17.4',    when: 'D1', whenPill: true,
          truth: "Crew's device. Allison was already enrolled on her own phone before this was added.",
          revealedBy: 'ctrl-device-velocity' },
      ],

      actor: {
        label: 'ACTOR · MULE OPERATOR',
        name:  'Money mule crew',
        meta:  "3+ devices · operating Allison's account · pre-execution stage",
      },

      hiddenSignals: [
        { id: 'sig-device', day: 'D1',  tag: 'CREW · CFG', tagClass: 'cfg',
          text: "Crew's device. Allison was already enrolled on her own phone before this was added.",
          revealedBy: 'ctrl-device-velocity' },
        { id: 'sig-email',  day: 'D8',  tag: 'CREW · CFG', tagClass: 'cfg',
          text: 'Throwaway Gmail registered by crew. Real email is allison.brown@scotia.com.jm.',
          revealedBy: 'ctrl-edelivery' },
        { id: 'sig-tx1',    day: 'D11', tag: 'CREW · TXN', tagClass: 'act',
          text: "Funds from crew's established mule. Not salary. Not family. First test transfer.",
          revealedBy: 'ctrl-incoming-anomaly' },
        { id: 'sig-tx2',    day: 'D12', tag: 'CREW · TXN', tagClass: 'act',
          text: 'Second crew test. Confirms account is operational under their control.',
          revealedBy: 'ctrl-incoming-anomaly' },
        { id: 'sig-tx3',    day: 'D14', tag: 'CREW · TXN', tagClass: 'act',
          text: 'Larger crew transfer. Pattern: 3 incoming, no salary, no family. Mule live.',
          revealedBy: 'ctrl-incoming-anomaly' },
      ],

      controls: [
        { id: 'ctrl-edelivery',
          label: 'Auto-freeze on early e-delivery change',
          meta:  'Reveals: throwaway email',
          naive: false },
        { id: 'ctrl-device-velocity',
          label: 'Device velocity alert (<48h after open)',
          meta:  'Reveals: crew device',
          naive: false },
        { id: 'ctrl-incoming-anomaly',
          label: 'Incoming-only pattern anomaly (no salary in 30d)',
          meta:  'Reveals: 3 crew transfers',
          naive: false },
        { id: 'ctrl-naive-sms',
          label: 'SMS customer on every config change',
          meta:  'No match · mule controls the device',
          naive: true },
      ],
    },
  ],
}


/* ────────────────────────────────────────────────────────────────────
 * v25.7.0.7 (TA0005): Defense Evasion two_views config.
 *
 * REUSES the PositioningTwoViews React component — same disguise-reveal
 * pattern, applied at a different phase of the kill chain. Positioning
 * showed disguise BEFORE the attack (account configured to look normal);
 * Defense Evasion shows disguise DURING the attack (transactions
 * structured to dodge fraud-monitoring controls).
 *
 * Same SC007 Allison Brown account — but at the EXECUTION phase
 * (Days 15–25), picking up where Positioning left off (Day 14, account
 * "ready to cash out" with $8,540 incoming).
 *
 * Pedagogical insight: each "casual-looking" outgoing transaction in
 * the bank-CRM view is actually an exact-arithmetic move tuned against
 * a specific control. Toggle controls to see which evasion each
 * transaction was designed to dodge.
 *
 * Five evasion techniques across 6 transactions; five toggleable
 * detection controls. With ALL controls active, every evasion is
 * caught at least once. With NONE active, $18K out the door.
 *
 * Component reuse note: column labels ("What your bank sees" / "What's
 * actually happening") are hardcoded in PositioningTwoViews.jsx and
 * apply naturally to any fraud-defender disguise-reveal viz. No
 * component change needed — this release is pure content authoring.
 * ──────────────────────────────────────────────────────────────────── */
const DEFENSE_EVASION_TWO_VIEWS_CONFIG = {
  examples: [
    {
      scenarioId: 'SC007',
      tabLabel: 'Account Rental · Execution',
      scenarioTitle: 'Account Rental — execution-phase evasion',

      customer: {
        initial: 'A',
        name:    'Allison Brown',
        id:      'AB204481',
        tenure:  'Customer for 55 days',
      },

      quickStats: [
        { label: 'KYC',           value: 'Verified · in person', success: true },
        { label: 'Channels',      value: 'Branch + Mobile' },
        { label: 'Last activity', value: '12 minutes ago' },
        { label: 'Open cases',    value: 'None' },
      ],

      // Outgoing-side activity. Each transaction LOOKS individually fine.
      // Every entry with a `truth` is hidden to the bank by default and
      // revealed only when the matching control is toggled on.
      activity: [
        { id: 'in1', day: 11, desc: 'Incoming transfer',  counterparty: 'External · J.M.', amount: '$1,840.00', status: 'cleared', revealedBy: null },
        { id: 'in2', day: 12, desc: 'Incoming transfer',  counterparty: 'External · K.W.', amount: '$2,200.00', status: 'cleared', revealedBy: null },
        { id: 'in3', day: 14, desc: 'Incoming transfer',  counterparty: 'External · D.H.', amount: '$4,500.00', status: 'cleared', revealedBy: null },

        { id: 'out1', day: 17, desc: 'Outgoing transfer', counterparty: 'External · R.B.', amount: '$1,950.00', status: 'cleared',
          truth: 'Sub-threshold structuring. SAR threshold is $2,000 — this is exactly $50 under. Then $2,400 the next day, splitting what would have been a single $4,350 outbound.',
          revealedBy: 'ctrl-sub-threshold' },

        { id: 'out2', day: 18, desc: 'Outgoing transfer', counterparty: 'External · R.B.', amount: '$2,400.00', status: 'cleared',
          truth: 'Same counterparty as yesterday. Combined outbound to R.B. in 48h: $4,350 — would have triggered velocity-burst if monitored.',
          revealedBy: 'ctrl-velocity-burst' },

        { id: 'atm1', day: 20, desc: 'ATM withdrawal × 4',  counterparty: 'Half-Way Tree ATM', amount: '$1,760.00', status: 'cleared',
          truth: 'Four pulls of $440 each, 11 minutes apart. ATM daily cap is $500 — each individual pull just under cap. Total in one location, one hour: $1,760.',
          revealedBy: 'ctrl-atm-substructuring' },

        { id: 'out3', day: 22, desc: 'Outgoing transfer', counterparty: 'New beneficiary · M.W.', amount: '$4,800.00', status: 'cleared',
          truth: 'Beneficiary "Mary Wilson" added Day 21, used Day 22. New-beneficiary cool-down would have held this transaction 48h; that delay would have given the next control time to surface the pattern.',
          revealedBy: 'ctrl-beneficiary-velocity' },

        { id: 'atm2', day: 25, desc: 'ATM withdrawal × 5', counterparty: 'New Kingston ATM',    amount: '$2,400.00', status: 'cleared',
          truth: 'Five pulls of $480 each at New Kingston — 18km from the Day 20 Half-Way Tree pulls. Same card, non-adjacent locations, 5 days. Geo-rotation pattern designed to avoid same-ATM frequency flags.',
          revealedBy: 'ctrl-atm-georotation' },
      ],

      // Account settings stay unchanged from the Positioning phase. The
      // crew set things up in Positioning; in Execution they don't need
      // to change anything — they just operate the configured account.
      settings: [
        { id: 'addr',   key: 'Mailing address',        value: '14 Hope Rd, Kingston 6',  when: 'D0',  whenPill: false, revealedBy: null },
        { id: 'phone',  key: 'Mobile number',          value: '+1 876 555 0142',          when: 'D0',  whenPill: false, revealedBy: null },
        { id: 'email',  key: 'E-delivery email',       value: 'a.brown.kgn@gmail.com',    when: 'D8',  whenPill: true,  revealedBy: null },
        { id: 'device', key: 'Mobile banking device',  value: 'iPhone 14 · iOS 17.4',     when: 'D1',  whenPill: true,  revealedBy: null },
      ],

      actor: {
        label: 'ACTOR · MULE OPERATOR',
        name:  'Money mule crew',
        meta:  '$18,650 cashed out across 6 transactions · Days 17–25',
      },

      hiddenSignals: [
        { id: 'sig-sub',     day: 'D17', tag: 'CREW · TXN', tagClass: 'act',
          text: 'Sub-threshold structuring. SAR threshold is $2,000 — this is exactly $50 under. Splits a $4,350 outbound into two days.',
          revealedBy: 'ctrl-sub-threshold' },
        { id: 'sig-velocity', day: 'D18', tag: 'CREW · TXN', tagClass: 'act',
          text: 'Velocity burst masked by the daily split. Same counterparty 48h running, total $4,350. No single transaction trips on its own.',
          revealedBy: 'ctrl-velocity-burst' },
        { id: 'sig-atm-sub', day: 'D20', tag: 'CREW · TXN', tagClass: 'act',
          text: 'ATM substructuring. Four $440 pulls within 11 minutes at Half-Way Tree — each individually under the $500 cap.',
          revealedBy: 'ctrl-atm-substructuring' },
        { id: 'sig-bene',    day: 'D22', tag: 'CREW · CFG', tagClass: 'cfg',
          text: 'New beneficiary used <48h after add. Cool-down period would have held this transaction long enough for other patterns to surface.',
          revealedBy: 'ctrl-beneficiary-velocity' },
        { id: 'sig-georot',  day: 'D25', tag: 'CREW · TXN', tagClass: 'act',
          text: 'Geo-rotation: same card used at non-adjacent ATMs 5 days apart. Designed to evade same-ATM frequency monitoring.',
          revealedBy: 'ctrl-atm-georotation' },
      ],

      controls: [
        { id: 'ctrl-sub-threshold',
          label: 'Sub-threshold pattern detection',
          meta:  'Reveals: $1,950 transfer (SAR-$50)',
          naive: false },
        { id: 'ctrl-velocity-burst',
          label: 'Velocity-burst detection (>2 outgoing in 48h)',
          meta:  'Reveals: same-counterparty splitting',
          naive: false },
        { id: 'ctrl-atm-substructuring',
          label: 'ATM substructuring (multi-pull, single-location)',
          meta:  'Reveals: 4× $440 pulls in 11 min',
          naive: false },
        { id: 'ctrl-beneficiary-velocity',
          label: 'New-beneficiary cool-down (48h hold)',
          meta:  'Reveals: M.W. used <24h after add',
          naive: false },
        { id: 'ctrl-atm-georotation',
          label: 'ATM geo-rotation (non-adjacent locations, 5d window)',
          meta:  'Reveals: Half-Way Tree → New Kingston',
          naive: false },
        { id: 'ctrl-naive-daily-tx',
          label: 'SMS customer when daily transactions exceed 5',
          meta:  'No match · mule controls the device',
          naive: true },
      ],
    },
  ],
}


export const VISUALIZATIONS = [
  {
    id:        'VIZ-RECON-KILLCHAIN',
    kind:      'kill_chain_grid',
    title:     'Reconnaissance kill chain',
    subtitle:  'Click any node to trace the attack path. Toggle defenses to break it.',
    // Roles that should see this viz. v25.7.0.2: tellers excluded — a
    // teller-tuned interaction lands in v25.7.1.
    roles:     ['analyst', 'soc', 'executive'],
    order:     1,
    config:    RECON_KILL_CHAIN_CONFIG,

    // Which graph entity this viz attaches to. The seed migration will
    // create a (:Visualization)-[:VISUALIZES]->(<entityType>{id}) edge.
    attachedTo: { type: 'Tactic', id: 'TA0043' },
  },

  // v25.7.0.3 (FA0001): Positioning — F3-unique tactic. Two example scenarios
  // (Account Rental, ATM Skimming). Audience includes tellers because
  // positioning patterns (e-delivery changes, device fingerprint anomalies,
  // incoming-only transaction patterns) are observable at the teller window
  // — they're the lowest-friction signals in the timeline.
  {
    id:        'VIZ-POSITIONING-TIMELINE',
    kind:      'positioning_timeline',
    title:     'How attackers wait — and what makes them visible',
    subtitle:  'Drag the timeline. Toggle controls. See how early each control would catch the attack.',
    roles:     ['teller', 'analyst', 'soc', 'executive'],
    order:     1,
    config:    POSITIONING_TIMELINE_CONFIG,
    attachedTo: { type: 'Tactic', id: 'FA0001' },
  },

  // v25.7.0.4 (FA0001): Positioning — Two Views disguise-reveal. Companion
  // viz to the timeline above; both render together when FA0001 is expanded.
  // Same audience (all four roles). Lower order (2) so the timeline renders
  // first on the page, the two-views second — but both visible. Telemetry
  // will tell us which one users engage with more, informing whether v25.7.x
  // expands or consolidates.
  {
    id:        'VIZ-POSITIONING-TWO-VIEWS',
    kind:      'two_views',
    title:     'The disguise — what your bank sees vs. what is actually happening',
    subtitle:  'Toggle detection controls. Each one surfaces a hidden signal in the bank-side view.',
    roles:     ['teller', 'analyst', 'soc', 'executive'],
    order:     2,
    config:    POSITIONING_TWO_VIEWS_CONFIG,
    attachedTo: { type: 'Tactic', id: 'FA0001' },
  },

  // v25.7.0.7 (TA0005): Defense Evasion — REUSES the two_views component
  // with new content. Same SC007 Allison Brown account, but execution
  // phase (Days 17-25) instead of positioning phase (Days 0-14). Each
  // outgoing transaction is structured against a specific control.
  // First reuse of the two_views pattern across tactics — validates that
  // the disguise-reveal frame works as a general defender skill, not a
  // Positioning-specific gimmick.
  {
    id:        'VIZ-DEFENSE-EVASION-TWO-VIEWS',
    kind:      'two_views',
    title:     'How attackers dodge the controls — and what catches them anyway',
    subtitle:  "Allison's account, execution phase. Each outgoing transaction is calibrated against a specific control. Toggle controls to see which evasion each was tuned against.",
    roles:     ['teller', 'analyst', 'soc', 'executive'],
    order:     1,
    config:    DEFENSE_EVASION_TWO_VIEWS_CONFIG,
    attachedTo: { type: 'Tactic', id: 'TA0005' },
  },
]
