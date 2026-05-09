/**
 * accountLinkingExternalScenes.jsx — v25.7.0.29
 *
 * Scene data for Account Linking: External Account Link
 * (F1007.003) — third F1007 sub-technique. Uses
 * MultiActorSequenceAnimation engine.
 *
 * F1007.003 is the cross-bank case of Account Linking. After
 * session compromise via vishing, the adversary uses the
 * customer\'s authenticated session at Bank A to link an
 * "external account" — a mule account at Bank B that the
 * adversary controls under a recruited mule\'s valid KYC
 * documents. The external link is the persistence mechanism:
 * it survives credential rotation at Bank A, it provides an
 * exfil channel, and in the Execution / Monetization phases
 * it becomes the primary route by which funds leave the
 * victim\'s account — structured transfers below reporting
 * thresholds to the linked external account where the mule
 * then withdraws or onward-transfers.
 *
 * Why external-bank linking deserves a separate animation
 * from joint-add (F1007.001) and linked-profile add (F1007.002):
 * - It crosses two institutions in one scenario, mirroring how
 *   real Caribbean cross-bank fraud actually moves (and how
 *   real defense requires inter-institutional intelligence
 *   sharing the region currently lacks at scale)
 * - It sets up future Execution and Monetization animations
 *   that can reference the same external link as the exfil
 *   channel — narrative continuity across tactics matters
 *   pedagogically
 * - The detection control set is fundamentally different:
 *   "callback to registered phone" (F1007.001) and "step-up
 *   on profile add" (F1007.002) don\'t apply; the relevant
 *   controls are link-activation cool-off, destination-
 *   institution mule-account profiling, and
 *   cross-institution intelligence sharing
 * - It\'s the highest-leverage case for institutional
 *   policy work — a single bank can fix joint-add and
 *   linked-profile by changing its own processes; external-
 *   linking defense requires industry coordination
 *
 * Composite case grounded in:
 * - Caribbean cross-bank fraud documentation (publicly
 *   accessible regulatory reports from BoJ, FSC, CBTT
 *   referencing cross-bank exfil patterns 2022-2025)
 * - Public industry reporting on mule recruitment via
 *   Telegram and WhatsApp "earn JMD/TTD/BBD per week" ads,
 *   which map to specific Caribbean countries with
 *   documented enforcement actions in 2023-2025
 * - FFIEC and ABA published guidance on external-account
 *   linking, including the long-standing recommendation
 *   that newly-linked external accounts have a cool-off
 *   period before high-value transfers are permitted
 * - Caribbean micro-deposit verification flows (publicly
 *   documented at NCB, JN, JNCB, Republic Bank, Sagicor,
 *   and others) which use 2 small deposits the customer
 *   confirms — a flow vulnerable to in-session adversary
 *   completion when the adversary controls the destination
 *
 * Scenario character: Mr. Marlon Grant, age 47, JN Bank
 * Half-Way-Tree customer, primary-school principal in
 * Kingston. JN Bank customer for 19 years (current account +
 * mortgage + savings). Vishing-led session compromise
 * upstream — the adversary, posing as JN Bank fraud
 * department, walked Marlon through "verifying" his
 * credentials by entering them into a phishing site during
 * the call. Adversary now has authenticated session.
 *
 * Mule character (off-screen): An unidentified Caribbean
 * national recruited via a Telegram "earn weekly cash"
 * advert, who opened a Sagicor account 6 weeks ago with
 * valid KYC documents and is now selling ATM card +
 * online banking access to the adversary for a flat fee
 * per fraud cycle. The mule\'s name appears on the link
 * verification but the trainee does not need to learn the
 * mule\'s identity — the pedagogical point is that the
 * adversary controls the destination, regardless of whose
 * name is on the account.
 *
 * Bank distribution after this animation:
 * - JN Bank: 5 (Marlon Grant + 4 prior characters at JN)
 * - NCB: 4 (Beverly, Ricardo, Janelle, Renee)
 * - JNCB: 4 (Devon Henry, Pat Henriques, Andre Lewis, Karelle Bryan)
 * - Republic Bank: 1 (Tariq Mohammed)
 * - Scotia: 1 (Tanya Ricketts)
 * - CIBC: 1 (Karen Ferguson)
 * - Sagicor: 2 (Anthony Spencer + the F1007.003 mule)
 *
 * JN Bank depth at 5 reflects the institution\'s major retail
 * footprint and the operational reality that JN customers
 * are a frequent target. Sagicor at 2 reflects the cross-bank
 * nature of this scenario — Sagicor appears as the mule\'s
 * institution, not the victim\'s.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell, Karen Ferguson,
 * Anthony Spencer, Renee Patterson, Tariq Mohammed). First-name
 * and surname both new to the roster.
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Same as F1007.001 and F1007.002 — persistence outlives
 *   credentials. The sub-technique-specific diagnostic protocol:
 *   audit external-account links in addition to signatories and
 *   linked profiles. The institutional control point is the
 *   external-link activation flow — newly-linked external
 *   accounts must have a cool-off period before high-value
 *   transfers are permitted, and the destination institution
 *   should be queried for mule-account profile via cross-
 *   institution intelligence sharing. The unique pedagogical
 *   lever for F1007.003: the link IS the exfil channel.
 *   Persistence and execution are the same configuration
 *   change — a fact that makes external-bank linking the
 *   single most operationally damaging F1007 sub-technique
 *   and the one that justifies the most invasive defensive
 *   process.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'Authenticated session via vishing-driven credential phish · controls Sagicor mule account · running cross-bank persistence pass',
    initialState: 'active',
  },
  {
    id: 'marlon',
    name: 'Mr. Marlon Grant',
    role: 'JN Bank Half-Way-Tree customer · primary-school principal · Kingston · age 47 · 19-year customer',
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
    name: 'Sagicor Bank (mule destination)',
    role: 'Destination institution · holds adversary-controlled mule account · receives micro-deposit verification',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_CONTROLS = [
  {
    id: 'ctrl-cooloff-on-new-external-link',
    label: 'Cool-off period: high-value transfers blocked for 7 days after a new external-account link is verified',
    meta: 'JN side: any newly-verified external-account link has a 7-day cool-off during which transfers above a low threshold (e.g. JMD 50,000 or equivalent) are blocked, requiring branch-presence step-up authentication to override. The cool-off period is the single highest-leverage control because F1007.003\'s entire operational pattern depends on adversary speed: link the external, drain immediately. A 7-day delay forces the adversary to either wait (during which Marlon is much more likely to discover the link via statement review or by responding to an alert) or to attempt branch-presence override (which is a different attack surface entirely). Implementation cost: marginal — adds friction to legitimate use cases (which can be addressed by a one-time unlock at branch). Defeats the immediate-drain pattern that makes F1007.003 commercially viable for adversary crews.',
    naive: false,
    revealsAtStages: [6, 8],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'rapid drain attempts',
  },
  {
    id: 'ctrl-cross-institution-mule-profiling',
    label: 'Cross-institution intelligence sharing: query destination institution\'s mule-account profile on link request',
    meta: 'Inter-institution: when Bank A receives a request to link an external account at Bank B, Bank A queries a shared intelligence service (or directly queries Bank B via a regional fraud-coordination agreement) for the destination account\'s mule-account profile — characteristics like recent KYC date, low balance, no payroll history, multiple inbound transfers from unrelated parties. If the destination matches a mule profile, Bank A blocks the link or escalates. Catches F1007.003 at Stage 4 before the link is even verified. Implementation cost: substantial — requires regional fraud-coordination infrastructure that the Caribbean region has discussed but not deployed at scale. The pedagogical point for executives: this is the institutional gap, not a per-customer hygiene problem. Until inter-bank intelligence sharing exists, defense lives in the cool-off control above.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'mule-account destinations',
  },
  {
    id: 'ctrl-link-add-customer-notification',
    label: 'Customer notification (SMS + email) on external-link verification, with 1-tap "Not me"',
    meta: 'JN side: any external-account link verification triggers immediate notification to the customer\'s registered SMS and email — both — with the destination institution\'s name, the destination account\'s last-4 (or equivalent), and a 1-tap "Not me" button that freezes the link, freezes the account, and refers to fraud team. Surfaces the persistence to the customer at Stage 5 (the moment the link verifies) instead of Stage 8 (when the structured transfers begin weeks later). Implementation cost: marginal — extends existing transactional-alert infrastructure. Detection control, not prevention; relies on the customer reading and acting on the alert. Best paired with the cool-off control above for prevention + detection layering.',
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
    stage: 2,
    severity: 'high',
    text: 'Authenticated session originated from credential entry on a phishing site during an inbound vishing call — session metadata pattern visible in audit',
  },
  {
    id: 'sig-microdeposit-completed-in-minutes',
    stage: 5,
    severity: 'high',
    text: 'Micro-deposit verification completed within minutes of initiation — destination is adversary-controlled, confirmation does not require waiting for Marlon to read statements',
  },
  {
    id: 'sig-mule-account-profile-match',
    stage: 4,
    severity: 'high',
    text: 'Destination Sagicor account matches mule-account profile: KYC complete 6 weeks ago, low balance, no payroll history, multiple inbound transfers from unrelated parties',
  },
  {
    id: 'sig-marlon-resets-credentials-not-link',
    stage: 7,
    severity: 'medium',
    text: 'Customer responds to suspicious activity by resetting password — does not audit external-account links (no UI prompt to do so)',
  },
  {
    id: 'sig-structured-transfers-after-cooloff',
    stage: 9,
    severity: 'high',
    text: 'Day 28 post-link: three transfers to linked Sagicor account, each below the JMD 1M reporting threshold (JMD 950k, 920k, 880k) — pattern matches structured exfil',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_STAGES = [
  {
    id: 'vishing-aftermath',
    title: 'Stage 1 — Vishing aftermath (upstream)',
    body: 'Two days ago, Marlon received a call from someone claiming to be JN Bank fraud department, warning him of "suspicious activity" on his account and walking him through "verifying" his credentials by entering them into what was actually a phishing site mirroring JN\'s online banking login. The adversary now has Marlon\'s username, password, and the answers to his security questions. They have an authenticated session.',
    actorActions: [
      { actor: 'adversary', text: 'Holds Marlon\'s credentials · authenticated session active', state: 'active' },
      { actor: 'marlon', text: 'Believes call was legitimate · unaware of compromise', state: 'unaware' },
      { actor: 'jn', text: 'Active session from new IP · low-medium risk score', state: 'silent' },
    ],
    duration: 6500,
  },
  {
    id: 'plan',
    title: 'Stage 2 — Plan: external link to Sagicor mule, not direct drain',
    body: 'The adversary considers direct authentication-and-drain. They reject this. JN Bank flags single-session high-value transfers from new IPs. Instead they plan persistence + exfil in one configuration change: link Marlon\'s JN account to a mule account they control at Sagicor, exit the session, wait through any anomaly window, then transfer structured amounts to the linked Sagicor account from a future authenticated session. The link itself is the persistence — it survives any credential rotation Marlon might do — and it doubles as the exfil channel.',
    actorActions: [
      { actor: 'adversary', text: 'Plans external-link persistence · Sagicor mule account ready', state: 'preparing' },
      { actor: 'marlon', text: 'Unaware', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'navigate',
    title: 'Stage 3 — Navigate to "Add External Account"',
    body: 'In Marlon\'s authenticated session, the adversary navigates: Transfers → Add External Account. JN Bank\'s flow is designed for legitimate cross-bank transfers. The flow asks for: destination institution, account number, account holder name, and offers two verification options — instant verification via Plaid-equivalent service (not available cross-Caribbean) or micro-deposit verification (2 small deposits the customer confirms). The adversary selects micro-deposit verification.',
    actorActions: [
      { actor: 'adversary', text: 'Navigates Transfers → Add External Account · selects micro-deposit verification', state: 'active' },
      { actor: 'jn', text: 'Renders external-link flow · no destination-institution mule-profile query', state: 'rendering' },
      { actor: 'marlon', text: 'Unaware', state: 'unaware' },
    ],
    duration: 7500,
  },
  {
    id: 'link-initiated',
    title: 'Stage 4 — Link initiated · micro-deposits sent',
    body: 'The adversary enters the destination: Sagicor Bank, account ending in 4731, account holder "[mule name]." JN Bank initiates two micro-deposits to the destination: JMD $0.13 and JMD $0.27. The destination Sagicor account matches a mule-account profile (KYC 6 weeks ago, low balance, no payroll, several inbound transfers from unrelated parties). JN does not query Sagicor for this profile — the cross-institution intelligence sharing infrastructure does not exist at scale in the region.',
    actorActions: [
      { actor: 'adversary', text: 'Enters Sagicor mule destination · JN initiates micro-deposits', state: 'requesting' },
      { actor: 'jn', text: 'Sends two micro-deposits to Sagicor 4731 · awaiting verification confirmation', state: 'verifying' },
      { actor: 'sagicor', text: 'Receives JMD 0.13 + JMD 0.27 micro-deposits · credits to mule account', state: 'recording' },
      { actor: 'marlon', text: 'Unaware', state: 'unaware' },
    ],
    duration: 9000,
  },
  {
    id: 'verify',
    title: 'Stage 5 — Adversary completes verification in minutes',
    body: 'The adversary, also having access to the Sagicor mule account, sees the two micro-deposits within minutes. They return to Marlon\'s JN session, enter the two amounts (0.13 and 0.27), and complete verification. The external link is now active. JN sends Marlon a notification SMS and email — but the email goes to a registered email Marlon checks rarely, and Marlon\'s phone is at his desk while he\'s teaching a class.',
    actorActions: [
      { actor: 'adversary', text: 'Reads micro-deposits in Sagicor account · enters amounts in JN session · verification complete', state: 'completed' },
      { actor: 'jn', text: 'External link verified · sends notification SMS + email to Marlon', state: 'recording' },
      { actor: 'sagicor', text: 'External link from JN customer "Marlon Grant" registered against mule account', state: 'silent' },
      { actor: 'marlon', text: 'Teaching class · phone at desk · notification not seen', state: 'unaware' },
    ],
    duration: 8500,
  },
  {
    id: 'exit',
    title: 'Stage 6 — Adversary exits the session',
    body: 'The adversary logs out of Marlon\'s JN session. From JN\'s telemetry: a session from a new IP completed an external-link addition without transactional activity, then ended. Risk score on the session is "medium" but does not trigger automatic action — the link is verified, the customer is presumed to have intended it.',
    actorActions: [
      { actor: 'adversary', text: 'Logs out · external link in place · waiting for cool-off window', state: 'waiting' },
      { actor: 'jn', text: 'Session closed · external link active · risk score medium but no action', state: 'silent' },
      { actor: 'marlon', text: 'Unaware', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'reset',
    title: 'Stage 7 — Marlon discovers vishing context · resets password',
    body: 'Three days later Marlon mentions the "JN fraud department call" to a colleague who recognizes it as vishing. Marlon logs into JN Bank, panics, resets his password. The reset flow does NOT prompt him to audit his external-account links. He sees the password reset confirmation, his accounts look normal, his transactions look normal. He believes he has cleaned up the compromise. The Sagicor link remains intact.',
    actorActions: [
      { actor: 'marlon', text: 'Resets password · audits transactions (normal) · believes compromise cleaned', state: 'reacting' },
      { actor: 'jn', text: 'Password rotated on Marlon\'s profile · external-link configuration unchanged', state: 'recording' },
      { actor: 'adversary', text: 'External link unaffected · cool-off window will expire on Day 28', state: 'dormant' },
    ],
    duration: 8500,
  },
  {
    id: 'dormancy',
    title: 'Stage 8 — Cool-off window not in place · dormancy by adversary choice',
    body: 'JN Bank does not have a 7-day cool-off on newly-linked external accounts — transfers above threshold to the link are permitted immediately. The adversary chooses to wait anyway, for behavioural reasons: Marlon\'s post-vishing alertness is highest in the first 7-14 days. By Day 25-28, he\'s back to checking statements monthly. The adversary waits. From JN\'s perspective: a normally-operating customer with a verified external link, no anomalies. From the adversary\'s perspective: a configured exfil channel, waiting on customer behavioural cycle to maximize dwell time.',
    actorActions: [
      { actor: 'adversary', text: 'Sagicor link configured · waiting for Marlon\'s alert window to fade', state: 'waiting' },
      { actor: 'jn', text: 'No cool-off control in place · external link active · no anomaly score change', state: 'silent' },
      { actor: 'marlon', text: 'Resumes normal banking · post-vishing alertness fading', state: 'unaware' },
    ],
    duration: 7000,
  },
  {
    id: 'exfil',
    title: 'Stage 9 — Day 28 · structured transfers to Sagicor link',
    body: 'On Day 28 the adversary opens an authenticated session (using credentials they may have phished again, or via session token replay if available, or via fresh vishing of Marlon — the link is the persistence; how they re-authenticate matters less than that the link remains). They initiate three transfers from Marlon\'s JN account to the Sagicor link: JMD 950,000, JMD 920,000, JMD 880,000 — each below the JMD 1,000,000 CTR threshold. From JN\'s perspective: a verified external link is being used by the customer for transfers. From Sagicor\'s perspective: a mule account is receiving inbound transfers from a JN customer; the mule account has no fraud flags. The adversary withdraws the funds in cash from Sagicor ATMs over the next 4 days.',
    actorActions: [
      { actor: 'adversary', text: 'Three structured transfers to Sagicor link · ATM withdrawals over 4 days', state: 'executing' },
      { actor: 'jn', text: 'Authorizes transfers · external link being used as configured · no flag', state: 'authorizing' },
      { actor: 'sagicor', text: 'Receives transfers · mule withdraws cash · no inbound flag', state: 'authorizing' },
      { actor: 'marlon', text: 'Discovers loss next monthly statement · contacts JN', state: 'discovering' },
    ],
    duration: 9500,
  },
]


/* ─── Metadata ──────────────────────────────────────────────── */
export const ACCOUNT_LINKING_EXTERNAL_META = {
  techniqueId: 'F1007.003',
  techniqueName: 'Account Linking: External Account Link',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'Marlon Grant · JN Bank Half-Way-Tree · external link to Sagicor mule account',
  totalStages: 9,
}


export default {
  actors: ACCOUNT_LINKING_EXTERNAL_ACTORS,
  controls: ACCOUNT_LINKING_EXTERNAL_CONTROLS,
  signals: ACCOUNT_LINKING_EXTERNAL_SIGNALS,
  stages: ACCOUNT_LINKING_EXTERNAL_STAGES,
  meta: ACCOUNT_LINKING_EXTERNAL_META,
}
