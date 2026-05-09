/**
 * accountLinkingExternalScenes.jsx — v25.7.0.29.1
 *
 * Scene data for Account Linking: External Account Link
 * (F1007.003) — third F1007 sub-technique under Positioning
 * (FA0001). Uses MultiActorSequenceAnimation engine.
 *
 * v25.7.0.29.1 hotfix: rewrites the scene file to match the
 * MultiActorSequenceAnimation engine contract.
 *
 * F1007.003 is the cross-bank case of Account Linking. After
 * session compromise via vishing, the adversary uses the
 * customer's authenticated session at Bank A to link an
 * "external account" — a mule account at Bank B that the
 * adversary controls under a recruited mule's valid KYC
 * documents. The external link IS the persistence mechanism:
 * it survives credential rotation at Bank A, it provides an
 * exfil channel, and in Execution / Monetization phases it
 * becomes the primary route by which funds leave the victim's
 * account.
 *
 * Composite case grounded in:
 * - Caribbean cross-bank fraud documentation (publicly accessible
 *   regulatory reports from BoJ, FSC, CBTT 2022-2025 referencing
 *   cross-bank exfil patterns)
 * - Public industry reporting on mule recruitment via Telegram /
 *   WhatsApp "earn weekly cash" ads in Caribbean countries
 * - FFIEC and ABA published guidance on external-account linking
 *   cool-off periods
 * - Caribbean micro-deposit verification flows (publicly documented
 *   at NCB, JN, JNCB, Republic Bank, Sagicor 2022-2025) using two
 *   small deposits the customer confirms — vulnerable to in-session
 *   adversary completion when adversary controls the destination
 *
 * Scenario character: Mr. Marlon Grant, age 47, JN Bank Half-Way-
 * Tree customer, primary-school principal in Kingston, 19-year
 * customer (current account + mortgage + savings). Vishing-led
 * session compromise upstream — adversary, posing as JN Bank
 * fraud department, walked Marlon through "verifying" his
 * credentials by entering them into a phishing site during
 * the call.
 *
 * Mule character (off-screen): unidentified Caribbean national
 * recruited via Telegram "earn weekly cash" advert, opened
 * Sagicor account 6 weeks ago with valid KYC documents, sells
 * ATM card + online banking access to adversary for flat fee
 * per fraud cycle.
 *
 * JN Bank depth at 5 (highest in roster), Sagicor depth at 2
 * (Anthony Spencer victim + F1007.003 mule destination).
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Persistence outlives credentials. For F1007.003 specifically,
 *   the link IS the exfil channel. Persistence and execution are
 *   the same configuration change — making external-bank linking
 *   the single most operationally damaging F1007 sub-technique.
 *   The institutional control point is a 7-day cool-off on
 *   newly-linked external accounts before high-value transfers
 *   are permitted, plus inter-institutional intelligence sharing
 *   that the region has discussed but not deployed at scale.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'Vishing-driven credential phish · authenticated as Marlon · controls Sagicor mule account',
    initialState: 'active',
  },
  {
    id: 'marlon',
    name: 'Mr. Marlon Grant',
    role: 'JN Bank Half-Way-Tree customer · primary-school principal · Kingston · age 47',
    initialState: 'unaware',
  },
  {
    id: 'jn',
    name: 'JN Bank',
    role: 'Victim institution · external-link verification · transaction monitoring',
    initialState: 'silent',
  },
  {
    id: 'sagicor',
    name: 'Sagicor (mule destination)',
    role: 'Destination institution · adversary-controlled mule account · receives micro-deposit verification',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_CONTROLS = [
  {
    id: 'ctrl-cooloff-on-new-external-link',
    label: '7-day cool-off: high-value transfers blocked after a new external-account link is verified',
    meta: 'JN side: any newly-verified external-account link has a 7-day cool-off during which transfers above a low threshold (e.g. JMD 50,000 or equivalent) are blocked, requiring branch-presence step-up authentication to override. The cool-off period is the single highest-leverage control because F1007.003\'s entire operational pattern depends on adversary speed: link the external, drain immediately. A 7-day delay forces the adversary to either wait (during which Marlon is much more likely to discover the link via statement review or by responding to an alert) or to attempt branch-presence override (a different attack surface entirely). Implementation cost: marginal — adds friction to legitimate use cases, addressable by a one-time unlock at branch. Defeats the immediate-drain pattern that makes F1007.003 commercially viable for adversary crews.',
    naive: false,
    revealsAtStages: [6, 8],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'rapid drain attempts',
  },
  {
    id: 'ctrl-cross-institution-mule-profiling',
    label: 'Cross-institution intelligence sharing: query destination institution\'s mule-account profile on link request',
    meta: 'Inter-institution: when Bank A receives a request to link an external account at Bank B, Bank A queries a shared intelligence service (or directly queries Bank B via a regional fraud-coordination agreement) for the destination account\'s mule-account profile — characteristics like recent KYC date, low balance, no payroll history, multiple inbound transfers from unrelated parties. If the destination matches a mule profile, Bank A blocks the link or escalates. Catches F1007.003 at Stage 4 before the link is even verified. Implementation cost: substantial — requires regional fraud-coordination infrastructure that the Caribbean region has discussed but not deployed at scale. Pedagogical point for executives: this is the institutional gap, not a per-customer hygiene problem. Until inter-bank intelligence sharing exists, defense lives in the cool-off control above.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'mule-account destinations',
  },
  {
    id: 'ctrl-link-add-customer-notification',
    label: 'Customer notification (SMS + email) on external-link verification, with 1-tap "Not me"',
    meta: 'JN side: any external-account link verification triggers immediate notification to the customer\'s registered SMS and email — both — with the destination institution\'s name, the destination account\'s last-4, and a 1-tap "Not me" button that freezes the link, freezes the account, and refers to fraud team. Surfaces the persistence to the customer at Stage 5 (the moment the link verifies) instead of Stage 9 (when the structured transfers begin weeks later). Implementation cost: marginal. Detection control, not prevention; relies on the customer reading and acting on the alert. Best paired with the cool-off control above for prevention + detection layering.',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'customer awareness moments',
  },
]


/* ─── Detection signals ──────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_SIGNALS = [
  {
    id: 'sig-session-from-vishing-context',
    label: 'Authenticated session originated from credential entry on phishing site during inbound vishing call',
    description: 'JN Bank\'s session telemetry shows authentication from an IP geolocating outside Marlon\'s normal usage pattern, with credentials entered seconds after a known vishing-pattern phone call. The metadata pattern is the F1007.003 origin signature. The cross-institution mule-profiling control would have caught the persistence step at Stage 4 regardless of the session\'s vishing origin.',
    revealedBy: 'ctrl-cross-institution-mule-profiling',
  },
  {
    id: 'sig-microdeposit-completed-in-minutes',
    label: 'Micro-deposit verification completed within minutes of initiation',
    description: 'Legitimate external-link verification typically takes 1-3 business days because the customer waits for micro-deposits to clear, reads the amounts, returns to enter them. F1007.003 verification completes in 4-7 minutes because the destination is adversary-controlled — they read the deposits in real-time on the Sagicor side and enter them on the JN side. Time-to-verification is a high-confidence behavioural signal. The cool-off control nullifies the speed advantage by blocking high-value transfers for 7 days regardless of how fast verification completes.',
    revealedBy: 'ctrl-cooloff-on-new-external-link',
  },
  {
    id: 'sig-mule-account-profile-match',
    label: 'Destination Sagicor account matches mule-account profile: KYC 6 weeks ago, low balance, no payroll history',
    description: 'The destination account opened 6 weeks ago with valid KYC documents (Caribbean national, recruited via Telegram "earn weekly cash" advert), has a consistent low-balance pattern, has received multiple small inbound transfers from unrelated parties (other mule cycles), and has no payroll deposit history. The cross-institution mule-profiling control would have queried Sagicor for this profile during the link request and either blocked the link or escalated to manual review. The institutional-level pattern across multiple concurrent F1007.003 cases is more identifiable than any single instance.',
    revealedBy: 'ctrl-cross-institution-mule-profiling',
  },
  {
    id: 'sig-marlon-resets-credentials-not-link',
    label: 'Customer resets password — does not audit external-account links',
    description: 'After discovering the vishing context, Marlon resets his JN password as a precaution. JN\'s reset flow rotates his credentials but does not prompt him to audit recently-added external-account links. The Sagicor link remains active. The customer-notification control would have flagged the link at Stage 5, separate from any reset event, giving Marlon the affordance to freeze the link with a 1-tap "Not me" before any transfers happened.',
    revealedBy: 'ctrl-link-add-customer-notification',
  },
  {
    id: 'sig-structured-transfers-after-cooloff',
    label: 'Day 28 post-link: three sub-threshold transfers to Sagicor link, mule withdraws cash over 4 days',
    description: 'Three transfers each below the JMD 1,000,000 CTR threshold (JMD 950k, 920k, 880k) → linked Sagicor account → mule withdraws cash via ATM over the next 4 days. Pattern matches structured exfil; from JN\'s transactional perspective, a verified link is being used by the customer for transfers; from Sagicor\'s perspective, a mule account receiving inbound transfers from a JN customer with no fraud flags. The cool-off control would have blocked the high-value transfers at Stage 9, even after Marlon\'s 28-day post-link delay, by gating high-value cross-bank transfers on a 7-day cool-off after every link change.',
    revealedBy: 'ctrl-cooloff-on-new-external-link',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_STAGES = [
  /* Stage 1 — Vishing aftermath */
  {
    id: 'al-external-stage-1',
    label: 'Vishing aftermath',
    title: 'Two days earlier — adversary captures Marlon\'s credentials via vishing',
    caption: 'Two days ago, Marlon received a call from someone claiming to be JN Bank fraud department, warning him of "suspicious activity" on his account and walking him through "verifying" his credentials by entering them into what was actually a phishing site mirroring JN\'s online banking login. The adversary now has Marlon\'s username, password, and the answers to his security questions. They have an authenticated session.',
    durationMs: 7500,
    messages: [
      { id: 'al-external-m1-1', fromActor: 'adversary', toActor: 'marlon', kind: 'callback',
        label: 'Vishing call · "JN Bank fraud department · suspicious activity · verify credentials"',
        audio: { text: 'Vishing call. Adversary impersonates JN fraud department.', profile: 'fraudster' } },
      { id: 'al-external-m1-2', fromActor: 'marlon', toActor: 'adversary', kind: 'http',
        label: 'Marlon enters credentials into phishing site mirroring JN\'s login' },
      { id: 'al-external-m1-3', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'Authenticated session active · Marlon\'s primary profile · new IP',
        audio: { text: 'Credentials captured. Authenticated session.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'jn': 'silent' },
    revealedSignalIds: ['sig-session-from-vishing-context'],
  },

  /* Stage 2 — Plan: external link, not direct drain */
  {
    id: 'al-external-stage-2',
    label: 'Plan: link as exfil',
    title: 'The adversary plans external-link persistence + exfil in one configuration change',
    caption: 'The adversary considers direct authentication-and-drain. They reject this. JN Bank flags single-session high-value transfers from new IPs. Instead they plan persistence + exfil in one configuration change: link Marlon\'s JN account to a mule account they control at Sagicor, exit the session, wait through any anomaly window, then transfer structured amounts to the linked Sagicor account from a future authenticated session. The link itself is the persistence — survives any credential rotation Marlon might do — and doubles as the exfil channel.',
    durationMs: 7000,
    messages: [
      { id: 'al-external-m2-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Reject direct drain · JN monitoring flags single-session high-value transfers',
        audio: { text: 'Direct drain rejected.', profile: 'fraudster' } },
      { id: 'al-external-m2-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Plan: link Sagicor mule · persistence and exfil in one configuration · wait 28 days',
        audio: { text: 'Link the Sagicor mule. Persistence and exfil in one configuration.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — Navigate Add External Account */
  {
    id: 'al-external-stage-3',
    label: 'Navigate add-link',
    title: 'Adversary navigates to "Add External Account" in Marlon\'s session',
    caption: 'In Marlon\'s authenticated session, the adversary navigates: Transfers → Add External Account. JN Bank\'s flow is designed for legitimate cross-bank transfers. The flow asks for destination institution, account number, account holder name, and offers two verification options — instant verification via Plaid-equivalent service (not available cross-Caribbean) or micro-deposit verification (2 small deposits the customer confirms). The adversary selects micro-deposit verification.',
    durationMs: 8000,
    messages: [
      { id: 'al-external-m3-1', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'GET /transfers/add-external-account · Marlon\'s session' },
      { id: 'al-external-m3-2', fromActor: 'jn', toActor: 'adversary', kind: 'http',
        label: 'Renders external-link flow · no destination-institution mule-profile query', suspicious: true },
      { id: 'al-external-m3-3', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'Selects micro-deposit verification · enters Sagicor account ending 4731 · holder: [mule name]',
        audio: { text: 'Sagicor account four-seven-three-one. Mule under valid KYC.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 4 — Link initiated · micro-deposits sent */
  {
    id: 'al-external-stage-4',
    label: 'Link initiated',
    title: 'JN sends two micro-deposits to Sagicor mule account',
    caption: 'The adversary enters the destination: Sagicor Bank, account ending in 4731, account holder "[mule name]." JN Bank initiates two micro-deposits to the destination: JMD 0.13 and JMD 0.27. The destination Sagicor account matches a mule-account profile (KYC 6 weeks ago, low balance, no payroll, several inbound transfers from unrelated parties). JN does not query Sagicor for this profile — the cross-institution intelligence sharing infrastructure does not exist at scale in the region. The cross-institution mule-profiling control would have caught the persistence step here by querying Sagicor and recognizing the destination as a mule-pattern account.',
    durationMs: 9500,
    messages: [
      { id: 'al-external-m4-1', fromActor: 'jn', toActor: 'sagicor', kind: 'transfer',
        label: 'Micro-deposit #1: JMD 0.13 → Sagicor 4731' },
      { id: 'al-external-m4-2', fromActor: 'jn', toActor: 'sagicor', kind: 'transfer',
        label: 'Micro-deposit #2: JMD 0.27 → Sagicor 4731' },
      { id: 'al-external-m4-3', fromActor: 'sagicor', toActor: 'sagicor', kind: 'system',
        label: 'Receives JMD 0.13 + JMD 0.27 · credits to mule account · no flag', suspicious: true,
        audio: { text: 'Sagicor receives micro-deposits. No fraud flag.', profile: 'narrator' } },
      { id: 'al-external-m4-4', fromActor: 'jn', toActor: 'jn', kind: 'system',
        label: 'No cross-institution query to Sagicor for mule profile · awaiting verification', suspicious: true },
    ],
    actorStateChanges: { 'jn': 'verifying', 'sagicor': 'recording' },
    revealedSignalIds: ['sig-mule-account-profile-match'],
  },

  /* Stage 5 — Adversary verifies in minutes */
  {
    id: 'al-external-stage-5',
    label: 'Verified',
    title: 'Adversary completes verification in minutes · external link active',
    caption: 'The adversary, also having access to the Sagicor mule account, sees the two micro-deposits within minutes. They return to Marlon\'s JN session, enter the two amounts (0.13 and 0.27), and complete verification. The external link is now active. JN sends Marlon a notification SMS and email — but the email goes to a registered email Marlon checks rarely, and Marlon\'s phone is at his desk while he\'s teaching a class. The customer-notification control would have routed both with a 1-tap "Not me" affordance — Marlon would still need to read the alert, but the affordance closes the time-to-act window from "Marlon eventually reviews monthly statement" to "Marlon checks phone tonight."',
    durationMs: 9500,
    messages: [
      { id: 'al-external-m5-1', fromActor: 'adversary', toActor: 'sagicor', kind: 'http',
        label: 'Reads micro-deposits in Sagicor account · 4 minutes after dispatch',
        audio: { text: 'Reads micro-deposits in Sagicor. Four minutes.', profile: 'fraudster' } },
      { id: 'al-external-m5-2', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'Returns to Marlon\'s JN session · enters 0.13 and 0.27 · verification complete', suspicious: true },
      { id: 'al-external-m5-3', fromActor: 'jn', toActor: 'jn', kind: 'system',
        label: 'External link verified · Sagicor 4731 active in Marlon\'s linked accounts' },
      { id: 'al-external-m5-4', fromActor: 'jn', toActor: 'marlon', kind: 'notification',
        label: 'SMS + email notification dispatched · Marlon teaching class · phone at desk' },
    ],
    actorStateChanges: { 'jn': 'recording' },
    revealedSignalIds: ['sig-microdeposit-completed-in-minutes'],
  },

  /* Stage 6 — Adversary exits */
  {
    id: 'al-external-stage-6',
    label: 'Exit',
    title: 'Adversary logs out · link in place · waiting',
    caption: 'The adversary logs out of Marlon\'s JN session. From JN\'s telemetry: a session from a new IP completed an external-link addition without transactional activity, then ended. Risk score on the session is "medium" but does not trigger automatic action — the link is verified, the customer is presumed to have intended it. The cool-off control would have engaged here regardless: any transfer above threshold to the new link is blocked for 7 days, forcing the adversary to wait or attempt branch-presence override.',
    durationMs: 6500,
    messages: [
      { id: 'al-external-m6-1', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'Logout · external link in place · cool-off window will expire on Day 28' },
      { id: 'al-external-m6-2', fromActor: 'jn', toActor: 'jn', kind: 'system',
        label: 'Session closed · external link active · no cool-off control engaged', suspicious: true },
    ],
    actorStateChanges: { 'adversary': 'dormant' },
    revealedSignalIds: [],
  },

  /* Stage 7 — Marlon discovers vishing context · resets password */
  {
    id: 'al-external-stage-7',
    label: 'Reset · partial cleanup',
    title: 'Day 5 — Marlon discovers vishing context · resets password',
    caption: 'Three days later Marlon mentions the "JN fraud department call" to a colleague who recognizes it as vishing. Marlon logs into JN Bank, panics, resets his password. The reset flow does NOT prompt him to audit his external-account links. He sees the password reset confirmation, his accounts look normal, his transactions look normal. He believes he has cleaned up the compromise. The Sagicor link remains intact. The customer-notification control fired at Stage 5 would have given Marlon the affordance to freeze the link with a 1-tap "Not me"; the reset flow at Stage 7 does not.',
    durationMs: 9000,
    messages: [
      { id: 'al-external-m7-1', fromActor: 'marlon', toActor: 'marlon', kind: 'system',
        label: 'Recognizes vishing · alarmed',
        audio: { text: 'Marlon recognizes the vishing pattern. Resets password.', profile: 'victimMale' } },
      { id: 'al-external-m7-2', fromActor: 'marlon', toActor: 'jn', kind: 'http',
        label: 'Password reset on JN · credentials rotated' },
      { id: 'al-external-m7-3', fromActor: 'marlon', toActor: 'jn', kind: 'http',
        label: 'Reviews recent transactions · all normal · external links not surfaced in flow' },
      { id: 'al-external-m7-4', fromActor: 'marlon', toActor: 'marlon', kind: 'system',
        label: 'Believes compromise cleaned · external link unaudited',
        audio: { text: 'Believes compromise cleaned. Sagicor link untouched.', profile: 'narrator' } },
      { id: 'al-external-m7-5', fromActor: 'jn', toActor: 'jn', kind: 'system',
        label: 'Password rotated · external-link configuration unchanged · Sagicor link active' },
    ],
    actorStateChanges: { 'marlon': 'reacting' },
    revealedSignalIds: ['sig-marlon-resets-credentials-not-link'],
  },

  /* Stage 8 — Dormancy by adversary choice */
  {
    id: 'al-external-stage-8',
    label: 'Dormancy',
    title: 'Days 5 → 28 — adversary waits · Marlon\'s alertness fades',
    caption: 'JN Bank does not have a 7-day cool-off on newly-linked external accounts — transfers above threshold to the link are permitted immediately. The adversary chooses to wait anyway, for behavioural reasons: Marlon\'s post-vishing alertness is highest in the first 7-14 days. By Day 25-28, he\'s back to checking statements monthly. The adversary waits. From JN\'s perspective: a normally-operating customer with a verified external link, no anomalies. From the adversary\'s perspective: a configured exfil channel, waiting on customer behavioural cycle to maximize dwell time. The cool-off control would have removed the adversary\'s tactical choice — the wait would be enforced by JN, and the cool-off period coincides exactly with Marlon\'s peak post-vishing alertness window.',
    durationMs: 7500,
    messages: [
      { id: 'al-external-m8-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Sagicor link configured · waiting for Marlon\'s alert window to fade',
        audio: { text: 'Wait for the alertness window to fade.', profile: 'fraudster' } },
      { id: 'al-external-m8-2', fromActor: 'jn', toActor: 'jn', kind: 'system',
        label: 'No cool-off control in place · external link active · no anomaly score change' },
      { id: 'al-external-m8-3', fromActor: 'marlon', toActor: 'marlon', kind: 'system',
        label: 'Resumes normal banking · post-vishing alertness fading' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 9 — Day 28 · structured transfers · final */
  {
    id: 'al-external-stage-9',
    label: 'Exfil',
    title: 'Day 28 — three sub-threshold transfers to Sagicor link · mule withdraws cash',
    caption: 'On Day 28 the adversary opens an authenticated session (using credentials they may have phished again, or via session token replay if available, or via fresh vishing — the link is the persistence; how they re-authenticate matters less than that the link remains). They initiate three transfers from Marlon\'s JN account to the Sagicor link: JMD 950,000, JMD 920,000, JMD 880,000 — each below the JMD 1,000,000 CTR threshold. From JN\'s perspective: a verified external link is being used by the customer for transfers. From Sagicor\'s perspective: a mule account is receiving inbound transfers from a JN customer; the mule account has no fraud flags. The adversary withdraws the funds in cash from Sagicor ATMs over the next 4 days.',
    durationMs: 12000,
    messages: [
      { id: 'al-external-m9-1', fromActor: 'adversary', toActor: 'jn', kind: 'http',
        label: 'Day 28 · authenticated session · transfers to Sagicor link initiated',
        audio: { text: 'Day twenty-eight. Authenticated session. Sagicor link active.', profile: 'fraudster' } },
      { id: 'al-external-m9-2', fromActor: 'adversary', toActor: 'jn', kind: 'transfer',
        label: 'Transfer #1: JMD 950,000 → Sagicor link · sub-threshold', suspicious: true },
      { id: 'al-external-m9-3', fromActor: 'adversary', toActor: 'jn', kind: 'transfer',
        label: 'Transfer #2: JMD 920,000 → Sagicor link · sub-threshold', suspicious: true },
      { id: 'al-external-m9-4', fromActor: 'adversary', toActor: 'jn', kind: 'transfer',
        label: 'Transfer #3: JMD 880,000 → Sagicor link · sub-threshold', suspicious: true },
      { id: 'al-external-m9-5', fromActor: 'jn', toActor: 'sagicor', kind: 'transfer',
        label: 'JMD 2,750,000 total settles to Sagicor 4731 · mule withdraws cash over 4 days', suspicious: true,
        audio: { text: 'Two point seven five million settles to mule. Cash withdrawal over four days.', profile: 'narrator' } },
      { id: 'al-external-m9-6', fromActor: 'marlon', toActor: 'jn', kind: 'callback',
        label: 'Day 33 · Marlon reviews monthly statement · loss discovered · contacts JN',
        audio: { text: 'Day thirty-three. Marlon discovers the loss in his monthly statement.', profile: 'victimMale' } },
    ],
    actorStateChanges: { 'adversary': 'executing', 'jn': 'authorizing', 'sagicor': 'authorizing', 'marlon': 'discovering' },
    revealedSignalIds: ['sig-structured-transfers-after-cooloff'],
    finalHeadline: 'Persistence outlives credentials. Marlon did everything his post-vishing recognition prepared him to do — when he realized the call had been social engineering, he reset his JN password, reviewed his recent transactions, and believed the compromise was cleaned. The reset closed the credential path. The transaction review confirmed nothing had been stolen yet. Neither addressed the Sagicor link, which lives in the "External Accounts" or "Linked Accounts" UI Marlon never had reason to inspect — he has never moved money to an external account in 19 years of JN Bank. The diagnostic protocol for F1007.003 is not "audit signatories" or "audit linked profiles" but "audit external-account links" — a third surface, a third audit. JN Bank\'s control points are a 7-day cool-off on newly-verified external links (closes the immediate-drain window, the highest-leverage single fix), customer-notification with 1-tap "Not me" on link verification (surfaces the persistence at Stage 5 instead of Stage 9), and cross-institution mule-profiling intelligence sharing (catches the destination at Stage 4, requires regional fraud-coordination infrastructure that the Caribbean has discussed but not deployed at scale — this is the executive-conversation point about institutional gaps, not customer hygiene). F1007 closes here. The composite insight across F1007.001 / F1007.002 / F1007.003 is that the customer\'s diagnostic protocol must expand from credentials to relationships, profiles, and external links — three new audit surfaces — and the institutional defense must include process changes at the call centre, the digital channel, and the inter-bank coordination layer.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_META = {
  techId: 'F1007.003',
  techName: 'Account Linking: External Account Link',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'SC-marlon-jn-external-link',
  scenarioContext: 'Mr. Marlon Grant, age 47, JN Bank Half-Way-Tree customer, primary-school principal in Kingston, 19-year customer (current account + mortgage + savings). Two days before scenario opens, Marlon received a call from someone claiming to be JN Bank fraud department warning of "suspicious activity" and walking him through "verifying" credentials by entering them into a phishing site mirroring JN\'s online banking login. Adversary now holds Marlon\'s username, password, and security-question answers — authenticated session active. Rather than direct drain (would trigger transaction monitoring on a session from a new IP), adversary plans persistence + exfil in one configuration change: link Marlon\'s JN account to a Sagicor mule account. Mule recruited via Telegram "earn weekly cash" advert, opened Sagicor account 6 weeks ago with valid KYC documents, sells ATM card + online banking access to adversary for flat fee per cycle. Adversary navigates Transfers → Add External Account, enters Sagicor 4731, selects micro-deposit verification. JN dispatches JMD 0.13 + JMD 0.27 to the destination. Adversary reads the deposits in real-time on the Sagicor side (4-minute delay) and enters them on the JN side. External link verified. JN dispatches SMS + email notification to Marlon — Marlon teaching class, phone at desk, does not see notification immediately. Adversary logs out. Day 5: Marlon mentions the "JN fraud department call" to a colleague who recognizes it as vishing. Marlon resets his JN password as a precaution. Reset flow does NOT prompt him to audit external-account links. Sagicor link remains active. Adversary waits 28 days for Marlon\'s post-vishing alertness to fade. Day 28: three structured sub-threshold transfers (JMD 950k, 920k, 880k) → Sagicor link. JMD 2,750,000 total. Mule withdraws cash via Sagicor ATMs over next 4 days. Marlon discovers loss Day 33 reviewing monthly statement. Composite case grounded in regional regulatory reports (BoJ, FSC, CBTT 2022-2025), Telegram mule-recruitment ad patterns, FFIEC guidance on external-account linking cool-off periods, and Caribbean micro-deposit verification flow documentation. JN Bank depth at 5 (highest in roster, reflecting major retail footprint); Sagicor depth at 2 (Anthony Spencer victim + F1007.003 mule destination). Cross-bank scenario establishes the inter-institutional intelligence-sharing gap that exists in the region but has not been deployed at scale — an executive-conversation point about institutional infrastructure rather than per-customer hygiene.',
  totalDurationMs: 76500,
  stageCount: 9,
}


export default {
  meta: ACCOUNT_LINKING_EXTERNAL_META,
  engine: 'multi-actor-sequence',
  stages: ACCOUNT_LINKING_EXTERNAL_STAGES,
  controls: ACCOUNT_LINKING_EXTERNAL_CONTROLS,
  signals: ACCOUNT_LINKING_EXTERNAL_SIGNALS,
  actors: ACCOUNT_LINKING_EXTERNAL_ACTORS,
}
