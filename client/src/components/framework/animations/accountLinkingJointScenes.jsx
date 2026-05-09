/**
 * accountLinkingJointScenes.jsx — v25.7.0.29
 *
 * Scene data for Account Linking: Joint Signatory Add (F1007.001) —
 * first F1007 sub-technique. Uses MultiActorSequenceAnimation engine.
 *
 * F1007.001 is the call-centre social-engineering case of Account
 * Linking. After credential compromise via an upstream technique
 * (phishing, vishing, etc.), the adversary calls the bank claiming
 * to be the customer, passes knowledge-based authentication using
 * OSINT-harvested data, and adds a joint signatory. The joint
 * signatory's online banking access is independent of the
 * customer's password — when the customer eventually resets their
 * credentials in response to noticing the compromise, the joint
 * signatory's access continues unchanged. Two weeks later, when
 * the bank's anomaly scoring has cooled, the adversary's
 * controlled joint profile drains the account.
 *
 * Why joint-account add is the canonical F1007 case in Caribbean
 * retail banking:
 * - It exploits a process gap, not a technical gap. Bank call
 *   centres handle joint-add as a customer-service operation, not
 *   a security-sensitive change. KBA passes; joint goes on.
 * - It survives every credential-rotation hygiene control. A
 *   trainee who has been told "if you're compromised, change
 *   your password" has no mental model for "you also need to
 *   audit your authorized signatories."
 * - It's institutionally invisible. The bank's fraud detection
 *   is built around credential anomalies and transaction
 *   patterns; "newly added joint signatory transacting normally"
 *   reads as "joint customer using their own access" because in
 *   a relational sense, that's exactly what it is.
 *
 * Composite case grounded in:
 * - Caribbean retail banking call-centre process documentation
 *   (publicly disclosed banking ombudsman case patterns from JM
 *   2022-2024 referencing improper joint-add authorizations)
 * - FFIEC and ABA published guidance on customer-not-present
 *   authorization adds, including the long-standing
 *   recommendation that joint-signatory adds require a 24-48
 *   hour callback to the registered phone on file (not the
 *   inbound caller's claimed number)
 * - Public industry reporting on KBA-bypass via OSINT, including
 *   the documented pattern of social-media + voter-roll +
 *   property-record harvesting yielding sufficient KBA answers
 *   for most retail-bank verification flows
 *
 * Scenario character: Mrs. Renee Patterson, age 41, NCB Liguanea
 * customer, IT manager. NCB customer for 14 years (consumer
 * accounts + JMD savings + USD account). Phishing-led credential
 * compromise three weeks before the scenario picks up; the
 * adversary has her password but knows that NCB's transaction
 * monitoring will flag a single unauthenticated session
 * draining the USD account, so the adversary takes the patient
 * route — call the call centre, add a joint signatory, wait
 * two weeks for Renee's password reset to settle, and then
 * have the joint profile transact normally.
 *
 * NCB is the most-represented Caribbean institution in animations
 * (this brings the total to NCB ×4 — Beverly Williams F1081
 * Phishing v25.7.0.12, Ricardo Powell, Janelle Chambers, and now
 * Renee Patterson F1007.001 v25.7.0.29). NCB depth is appropriate
 * for the institution's market position; future releases will
 * fill out roster gaps at Republic Bank, RBC, VMBS, JN, and
 * Proven Bank.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell, Karen Ferguson,
 * Anthony Spencer). First-name and surname both new to roster.
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Persistence outlives credentials. The trainee's mental model
 *   for "compromised account" is "someone has my password" — a
 *   credential-shaped problem. Account Linking re-shapes the
 *   problem as relational: someone now has a STANDING
 *   relationship with the bank that grants them transactional
 *   authority, and resetting the password does nothing about
 *   the relationship. The diagnostic protocol is not "change
 *   password" but "audit signatories, audit linked profiles,
 *   audit external links." For Joint Signatory Add specifically,
 *   the institutional control point is the call-centre
 *   authorization process: out-of-band callback verification
 *   on the registered phone of file (not the inbound call's
 *   caller ID) closes the social-engineering window.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'Holds Renee\'s phished credentials · OSINT harvested for KBA · running call-centre social engineering pass',
    initialState: 'active',
  },
  {
    id: 'renee',
    name: 'Mrs. Renee Patterson',
    role: 'NCB Liguanea customer · IT manager · age 41 · 14-year customer · USD + JMD accounts',
    initialState: 'unaware',
  },
  {
    id: 'callcentre',
    name: 'NCB Call Centre',
    role: 'Customer-service agent · KBA verification · joint-add authorization workflow',
    initialState: 'silent',
  },
  {
    id: 'ncb',
    name: 'NCB Systems',
    role: 'Issuer · transaction monitoring · joint-signatory provisioning · audit log',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_CONTROLS = [
  {
    id: 'ctrl-callback-on-registered-phone',
    label: 'Out-of-band callback to registered phone on file (not inbound caller ID)',
    meta: 'Call-centre process: any joint-signatory add request initiated via inbound phone is held for an out-of-band callback to the customer\'s registered phone on file before the joint is provisioned. The agent does not rely on the inbound call\'s caller ID — they hang up, look up the registered phone in the customer record, and call back. The customer either confirms the request (proceed) or denies it (block + refer to fraud team). Catches the social-engineering attempt at Stage 3 before any provisioning happens. Implementation cost: marginal — adds 5-10 minutes to the joint-add workflow but only on customer-not-present requests; branch-presence joint-adds proceed unchanged. Defeats the entire F1007.001 attack pattern because the adversary cannot answer the callback to Renee\'s registered phone.',
    naive: false,
    revealsAtStages: [3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'call-centre joint-add attempts',
  },
  {
    id: 'ctrl-joint-add-velocity-rule',
    label: 'Cross-customer joint-add velocity rule: N+ joint adds across institution in M hours',
    meta: 'Fraud-ops monitoring: N+ joint-signatory adds across the institution in a short window (e.g. 5+ in 24 hours), particularly when the proposed joint signatories share characteristics (same surname, same phone-number prefix, same address pattern), surface a fraud-ring signal. Catches F1007.001 at the institution level even when the call-centre process is bypassed on individual calls. Triggers a manual review and freezes pending joint-adds for 48 hours. Implementation cost: a nightly batch job and a fraud-ops review queue. Does not catch a single isolated F1007.001 attempt but catches scaled rings — and rings are the dominant operational pattern in documented Caribbean joint-add fraud.',
    naive: false,
    revealsAtStages: [4, 6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'concurrent joint-add patterns',
  },
  {
    id: 'ctrl-customer-notification-on-joint-add',
    label: 'Customer notification (SMS + email) on joint-signatory provisioning',
    meta: 'Issuer-side: any joint-signatory add triggers immediate notification to the customer\'s registered SMS and email — both — with the new signatory\'s name, the channel through which the request was made, and a 1-tap "Not me" button that freezes the account and refers to fraud team. Surfaces the persistence to the customer at Stage 4 (the moment the joint is added) instead of Stage 8 (when the account drains weeks later). Implementation cost: marginal — extends existing transactional-alert infrastructure. Note: this is a detection control, not a prevention control — it relies on the customer reading the alert. In Renee\'s case, she\'s an IT manager who would read the alert; in the average customer\'s case, alert fatigue from routine transaction notifications may cause it to be dismissed. Best paired with the callback control above for prevention + detection layering.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'customer awareness moments',
  },
]


/* ─── Detection signals ──────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_SIGNALS = [
  {
    id: 'sig-kba-passed-from-osint',
    stage: 2,
    severity: 'medium',
    text: 'KBA verification passes on questions answerable from public OSINT (mother\'s maiden name from social media, prior address from voter rolls, last transaction from a phished receipt screenshot)',
  },
  {
    id: 'sig-joint-add-no-branch-presence',
    stage: 4,
    severity: 'high',
    text: 'Joint signatory provisioned without branch presence, written authorization, or callback verification — entire workflow runs on a single inbound call',
  },
  {
    id: 'sig-new-signatory-no-relationship-graph',
    stage: 4,
    severity: 'high',
    text: 'New joint signatory has no prior relationship to customer in the institution\'s relationship graph (no shared address, no shared mortgage, no prior transactional history)',
  },
  {
    id: 'sig-credential-reset-without-signatory-audit',
    stage: 6,
    severity: 'medium',
    text: 'Customer-initiated password reset proceeds without surfacing the recently-added joint signatory for re-confirmation',
  },
  {
    id: 'sig-dormant-then-drain',
    stage: 8,
    severity: 'high',
    text: 'New joint signatory dormant for 14+ days post-provisioning, then transacts at high velocity — pattern matches "wait-out the anomaly window then drain"',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_STAGES = [
  {
    id: 'compromise',
    title: 'Stage 1 — Credential compromise (upstream)',
    body: 'Three weeks ago, Renee\'s NCB credentials were captured via a phishing campaign targeting Caribbean banking customers. The adversary has her username, password, security answers, and the contents of her email inbox (which they pivoted to from the phished email password). They know her relationship history, her address, her recent transactions, her mother\'s maiden name. They do not yet have access to NCB session tokens because Renee\'s last login was 3 weeks ago; the session has expired.',
    actorActions: [
      { actor: 'adversary', text: 'Holds Renee\'s credentials + KBA-relevant OSINT', state: 'planning' },
      { actor: 'renee', text: 'Unaware of compromise — using NCB normally', state: 'unaware' },
    ],
    duration: 6000,
  },
  {
    id: 'plan',
    title: 'Stage 2 — Plan: call-centre joint-add, not direct drain',
    body: 'The adversary considers direct authentication-and-drain: log in with the phished credentials, transfer USD account balance out, exit. They reject this. NCB\'s transaction monitoring flags single-session high-value transfers from new IP addresses. Instead they plan the patient route: call the NCB call centre, claim to be Renee, request a joint signatory be added for "convenience after a recent surgery." Then wait two weeks for any anomaly window to close and have the joint profile transact normally.',
    actorActions: [
      { actor: 'adversary', text: 'Plans call-centre social engineering · KBA prep with OSINT', state: 'preparing' },
      { actor: 'renee', text: 'Unaware', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'callcentre-call',
    title: 'Stage 3 — Inbound call to NCB call centre',
    body: 'The adversary calls NCB\'s customer service line claiming to be Renee Patterson. The call-centre agent runs KBA: name, date of birth (from social media), mother\'s maiden name (from genealogy site), prior address (from voter rolls), recent transaction (from a phished email confirmation). All five answers correct. The agent moves to fulfilment.',
    actorActions: [
      { actor: 'adversary', text: 'Inbound call · presents as Renee · passes KBA on OSINT-harvested answers', state: 'active' },
      { actor: 'callcentre', text: 'Runs KBA · all answers correct · proceeds to joint-add workflow', state: 'verifying' },
      { actor: 'renee', text: 'At work · unaware', state: 'unaware' },
    ],
    duration: 8000,
  },
  {
    id: 'joint-add-provisioned',
    title: 'Stage 4 — Joint signatory provisioned',
    body: 'The adversary requests joint signatory "Andre Patterson" be added. They explain: "He\'s my cousin; we\'re sharing expenses while I recover from surgery." The call-centre agent provisions the joint. NCB issues credentials for Andre\'s separate online banking profile, mailed to the adversary\'s drop address (collected during KBA as Renee\'s "current address"). No callback to Renee\'s registered phone on file. No branch presence. No written authorization. The audit log records: "Joint signatory added per customer request — verbal."',
    actorActions: [
      { actor: 'adversary', text: 'Requests joint "Andre Patterson" · drop address provided', state: 'requesting' },
      { actor: 'callcentre', text: 'Provisions joint signatory · mails credentials · closes ticket', state: 'fulfilled' },
      { actor: 'ncb', text: 'Joint Andre Patterson added to Renee\'s account · audit log: verbal authorization', state: 'recording' },
      { actor: 'renee', text: 'No notification received', state: 'unaware' },
    ],
    duration: 9000,
  },
  {
    id: 'andre-receives-credentials',
    title: 'Stage 5 — Andre profile credentials arrive at adversary drop',
    body: 'NCB\'s mailed credentials arrive at the drop address 6 days later. The adversary activates the Andre Patterson profile via the standard first-login flow on a fresh device. Andre is now an authenticated NCB online banking user with full transactional authority on Renee\'s accounts. The adversary does not transact yet — they wait.',
    actorActions: [
      { actor: 'adversary', text: 'Receives mailed credentials at drop · activates Andre profile on fresh device', state: 'active' },
      { actor: 'ncb', text: 'Andre profile authenticated · device fingerprint registered', state: 'recording' },
      { actor: 'renee', text: 'Unaware', state: 'unaware' },
    ],
    duration: 7000,
  },
  {
    id: 'renee-resets-password',
    title: 'Stage 6 — Renee notices unusual login email · resets password',
    body: 'Two days after the adversary\'s drop activation, Renee notices a "new device login" email NCB sent to her registered email — but referencing Andre\'s profile, which she does not recognize. Confused, she logs into NCB on her own profile, sees nothing wrong on her dashboard (the joint signatory listing is buried two screens deep in account settings), and assumes the email was a phishing attempt. She resets her password as a precaution. The reset rotates her credentials. Andre\'s credentials are unaffected — they\'re a separate authentication path.',
    actorActions: [
      { actor: 'renee', text: 'Sees confusing login email · resets password as precaution · does not check signatories', state: 'reacting' },
      { actor: 'ncb', text: 'Password reset on Renee\'s profile · Andre\'s profile credentials unchanged', state: 'recording' },
      { actor: 'adversary', text: 'Andre profile unaffected by Renee\'s password reset · waits', state: 'dormant' },
    ],
    duration: 8500,
  },
  {
    id: 'dormancy',
    title: 'Stage 7 — Two-week dormancy',
    body: 'For 14 days the adversary does not transact. NCB\'s anomaly scoring on Renee\'s account, which would have flagged a high-value transfer from a new device in the immediate post-reset window, cools. The Andre profile shows zero activity. From a fraud-detection perspective, Renee\'s account is "back to normal" — the password reset closed whatever incident triggered it.',
    actorActions: [
      { actor: 'adversary', text: 'Andre profile dormant · waiting for anomaly window to close', state: 'waiting' },
      { actor: 'ncb', text: 'Renee\'s account anomaly score returns to baseline', state: 'silent' },
      { actor: 'renee', text: 'Account looks normal · believes incident is resolved', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'drain',
    title: 'Stage 8 — Andre profile drains the USD account',
    body: 'On Day 22 post-provisioning, the adversary logs into the Andre profile and initiates three transfers from Renee\'s USD account to external accounts: USD 4,800, USD 4,950, USD 4,700 — each below the USD 5,000 threshold that triggers manual review. From NCB\'s perspective: a verified joint signatory is transacting on his joint account using his own credentials. The fraud signal — "Renee added a joint with no relationship history, who waited 14 days then drained the account" — exists in the audit data but is not surfaced by any single transactional rule.',
    actorActions: [
      { actor: 'adversary', text: 'Logs in as Andre · three sub-threshold transfers to external accounts', state: 'executing' },
      { actor: 'ncb', text: 'Authorizes transfers · joint signatory transacting normally · no flag', state: 'authorizing' },
      { actor: 'renee', text: 'Discovers loss next day reviewing balance · contacts NCB', state: 'discovering' },
    ],
    duration: 9000,
  },
]


/* ─── Metadata ──────────────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_META = {
  techniqueId: 'F1007.001',
  techniqueName: 'Account Linking: Joint Signatory Add',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'Renee Patterson · NCB Liguanea · joint-add via call-centre social engineering',
  totalStages: 8,
}


export default {
  actors: ACCOUNT_LINKING_JOINT_ACTORS,
  controls: ACCOUNT_LINKING_JOINT_CONTROLS,
  signals: ACCOUNT_LINKING_JOINT_SIGNALS,
  stages: ACCOUNT_LINKING_JOINT_STAGES,
  meta: ACCOUNT_LINKING_JOINT_META,
}
