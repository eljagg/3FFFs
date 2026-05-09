/**
 * accountLinkingJointScenes.jsx — v25.7.0.29.1
 *
 * Scene data for Account Linking: Joint Signatory Add (F1007.001) —
 * first F1007 sub-technique under Positioning (FA0001). Uses
 * MultiActorSequenceAnimation engine.
 *
 * v25.7.0.29.1 hotfix: rewrites the scene file to match the
 * MultiActorSequenceAnimation engine contract. The v25.7.0.29
 * shipping version used field names that the engine doesn't read
 * (body/actorActions/duration), causing every stage to render
 * empty and the engine to jump straight to "Stage 9/9" with a
 * Replay button. Engine reads stage.label, stage.title,
 * stage.caption, stage.durationMs, stage.messages [{id, fromActor,
 * toActor, kind, label, suspicious?, audio?}], stage.revealedSignalIds,
 * and stage.finalHeadline on the last stage.
 *
 * F1007.001 is the call-centre social-engineering case: the
 * adversary, holding phished credentials, calls the bank claiming
 * to be the customer, passes knowledge-based authentication using
 * OSINT-harvested data, and adds a joint signatory under their
 * control. The joint's online banking access is independent of
 * the customer's password — when the customer eventually resets
 * credentials in response to noticing the compromise, the joint
 * profile's access continues unchanged. Two weeks later, the
 * adversary's joint profile drains the account.
 *
 * Composite case grounded in:
 * - Caribbean retail banking call-centre process documentation
 *   (publicly disclosed banking ombudsman case patterns from JM
 *   2022-2024 referencing improper joint-add authorizations)
 * - FFIEC and ABA published guidance on customer-not-present
 *   authorization adds, including the long-standing recommendation
 *   that joint-signatory adds require a 24-48 hour callback to the
 *   registered phone on file
 * - Public industry reporting on KBA-bypass via OSINT (social
 *   media + voter rolls + property records yielding KBA answers
 *   for most retail-bank verification flows)
 *
 * Scenario character: Mrs. Renee Patterson, age 41, NCB Liguanea
 * customer, IT manager, 14-year customer (consumer + JMD savings
 * + USD account). Phished three weeks before scenario opens.
 * NCB is the most-represented Caribbean institution in animations
 * (this brings NCB count to 4 — Beverly Williams F1081 v25.7.0.12,
 * Ricardo Powell, Janelle Chambers, and Renee Patterson).
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Persistence outlives credentials. The trainee's mental model
 *   for "compromised account = change my password" is insufficient.
 *   The diagnostic protocol expands to "audit signatories, audit
 *   linked profiles, audit external links." For Joint Signatory
 *   Add specifically, the institutional control point is the
 *   call-centre authorization process: out-of-band callback on
 *   the registered phone of file (not the inbound caller's
 *   claimed number) closes the social-engineering window.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'Holds Renee\'s phished credentials · OSINT harvested for KBA · running call-centre social engineering',
    initialState: 'active',
  },
  {
    id: 'renee',
    name: 'Mrs. Renee Patterson',
    role: 'NCB Liguanea customer · IT manager · age 41 · 14-year customer',
    initialState: 'unaware',
  },
  {
    id: 'callcentre',
    name: 'NCB Call Centre',
    role: 'Customer-service agent · KBA verification · joint-add authorization',
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
    meta: 'Call-centre process: any joint-signatory add request initiated via inbound phone is held for an out-of-band callback to the customer\'s registered phone on file before the joint is provisioned. The agent does not rely on the inbound call\'s caller ID — they hang up, look up the registered phone in the customer record, and call back. The customer either confirms (proceed) or denies (block + refer to fraud team). Catches the social-engineering attempt at Stage 3 before any provisioning happens. Implementation cost: marginal — adds 5-10 minutes to the joint-add workflow on customer-not-present requests; branch-presence joint-adds proceed unchanged. Defeats the entire F1007.001 attack pattern because the adversary cannot answer the callback to Renee\'s registered phone.',
    naive: false,
    revealsAtStages: [3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'call-centre joint-add attempts',
  },
  {
    id: 'ctrl-joint-add-velocity-rule',
    label: 'Cross-customer joint-add velocity rule: N+ joint adds across institution in M hours',
    meta: 'Fraud-ops monitoring: N+ joint-signatory adds across the institution in a short window (e.g. 5+ in 24 hours), particularly when the proposed joint signatories share characteristics (same surname, same phone-number prefix, same drop-address pattern), surface a fraud-ring signal. Catches F1007.001 at the institution level even when the call-centre process is bypassed on individual calls. Triggers manual review and freezes pending joint-adds for 48 hours. Implementation cost: a nightly batch job and a fraud-ops review queue. Catches scaled rings — the dominant operational pattern in documented Caribbean joint-add fraud.',
    naive: false,
    revealsAtStages: [4, 6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'concurrent joint-add patterns',
  },
  {
    id: 'ctrl-customer-notification-on-joint-add',
    label: 'Customer notification (SMS + email) on joint-signatory provisioning, with 1-tap "Not me"',
    meta: 'Issuer-side: any joint-signatory add triggers immediate notification to the customer\'s registered SMS and email — both — with the new signatory\'s name, the request channel, and a 1-tap "Not me" button that freezes the account and refers to fraud team. Surfaces the persistence to the customer at Stage 4 (the moment the joint is added) instead of Stage 8 (when the account drains weeks later). Implementation cost: marginal — extends existing transactional-alert infrastructure. Detection control, not prevention; relies on the customer reading the alert. Best paired with the callback control above for prevention + detection layering.',
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
    label: 'KBA verification passes on questions answerable from public OSINT',
    description: 'Mother\'s maiden name from social media, prior address from voter rolls, last transaction from a phished receipt screenshot. The KBA process treats the answers as proof of identity, but every answer is harvestable from public sources combined with the upstream phishing capture. The dual-channel callback control would have closed the social-engineering window regardless of whether KBA passed — the bank verifies the inbound caller IS the customer by calling the registered phone, not by re-running the same question set the adversary already prepared for.',
    revealedBy: 'ctrl-callback-on-registered-phone',
  },
  {
    id: 'sig-joint-add-no-branch-presence',
    label: 'Joint signatory provisioned without branch presence, written authorization, or callback',
    description: 'Entire workflow runs on a single inbound phone call. NCB\'s call-centre process treats joint-add as a customer-service operation rather than a security-sensitive change. The audit log records "verbal authorization" — a string that itself is the signature of a process gap. The dual-channel callback control would have surfaced the gap at Stage 3 by routing the authorization through a channel the adversary cannot reach.',
    revealedBy: 'ctrl-callback-on-registered-phone',
  },
  {
    id: 'sig-new-signatory-no-relationship-graph',
    label: 'New joint signatory has no prior relationship to customer in institution\'s graph',
    description: 'No shared address, no shared mortgage, no prior transactional history, no co-signatory history on any other product. The bank\'s relationship graph (if maintained) would have flagged the proposed joint as relationally orphaned within the customer\'s 14-year history. The cross-customer velocity rule would have caught the institutional-level pattern across multiple concurrent fraudulent joint-adds even when this single instance looked plausible at the call-centre level.',
    revealedBy: 'ctrl-joint-add-velocity-rule',
  },
  {
    id: 'sig-credential-reset-without-signatory-audit',
    label: 'Customer-initiated password reset proceeds without surfacing recently-added joint',
    description: 'Renee resets her password after seeing a confusing login email. NCB\'s reset flow rotates her credentials but does not prompt her to audit the recently-added joint signatory. The trainee mental model "I changed my password, I\'m safe" is reinforced by the UI that does not surface the relational persistence path. The customer notification control would have flagged the joint-add at the moment it happened, separate from any reset event.',
    revealedBy: 'ctrl-customer-notification-on-joint-add',
  },
  {
    id: 'sig-dormant-then-drain',
    label: 'New joint signatory dormant for 14+ days, then transacts at high velocity — pattern matches "wait-out the anomaly window then drain"',
    description: 'NCB\'s anomaly scoring on Renee\'s account, which would have flagged a high-value transfer in the immediate post-reset window, cools to baseline by Day 22. The Andre profile shows zero activity for 14 days, then initiates three sub-threshold transfers in a single session. Pattern is identifiable in retrospective audit but is not surfaced by any single transactional rule. The cross-customer joint-add velocity rule would have flagged the institutional-level fraud-ring signature concurrent with the original provisioning.',
    revealedBy: 'ctrl-joint-add-velocity-rule',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_STAGES = [
  /* Stage 1 — Credential compromise (upstream) */
  {
    id: 'al-joint-stage-1',
    label: 'Credentials in hand',
    title: 'Three weeks earlier — Renee\'s NCB credentials captured',
    caption: 'Three weeks before this scenario opens. Mrs. Renee Patterson, age 41, IT manager, NCB Liguanea customer for 14 years, falls for a phishing campaign targeting Caribbean banking customers. The adversary captures her username, password, security answers, and pivots to her email inbox (where her NCB statements live alongside genealogy hobby emails referencing her mother\'s maiden name, real-estate confirmations from her last move, and a screenshot of her last NCB transaction Renee sent her sister via WhatsApp-to-email). The adversary now holds enough OSINT to pass NCB\'s KBA on the next attempt. They do not log in to NCB directly — single-session high-value transfers from new IPs trigger NCB\'s transaction monitoring. They plan the call-centre route instead.',
    durationMs: 8000,
    messages: [
      { id: 'al-joint-m1-1', fromActor: 'adversary', toActor: 'renee', kind: 'sms',
        label: 'Phishing capture · 3 weeks ago · credentials harvested',
        audio: { text: 'Phishing capture. Three weeks ago. Credentials in hand. KBA prepped.', profile: 'narrator' } },
      { id: 'al-joint-m1-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'OSINT compiled: mother\'s maiden, prior address, last transaction · enough for KBA',
        audio: { text: 'OSINT compiled. Enough for KBA.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Plan: call centre, not direct drain */
  {
    id: 'al-joint-stage-2',
    label: 'Plan: the patient route',
    title: 'The adversary plans the call-centre joint-add',
    caption: 'The adversary considers direct authentication-and-drain: log in with the phished credentials, transfer USD account balance out, exit. They reject this. NCB\'s transaction monitoring flags single-session high-value transfers from new IPs within minutes — Renee would call the bank and the fraud would be reversed before funds layer. Instead they plan the patient route: call the NCB call centre, claim to be Renee, request a joint signatory be added for "convenience after a recent surgery." The joint\'s online banking access is independent of Renee\'s password. Once provisioned, the persistence survives any credential-rotation hygiene Renee might do. Wait two weeks for any anomaly window to close, then have the joint profile transact normally.',
    durationMs: 7500,
    messages: [
      { id: 'al-joint-m2-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Reject direct drain · NCB monitoring flags single-session high-value transfers',
        audio: { text: 'Direct drain rejected. Bank monitoring would catch it.', profile: 'fraudster' } },
      { id: 'al-joint-m2-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Plan: call centre · joint-add · drop address · 14-day dormancy · drain',
        audio: { text: 'Call centre. Add a joint. Drop address. Wait fourteen days. Drain.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — The call-centre call · KBA passes */
  {
    id: 'al-joint-stage-3',
    label: 'The call-centre call',
    title: 'Inbound call · adversary presents as Renee · KBA passes',
    caption: 'The adversary calls NCB\'s customer service line claiming to be Renee Patterson. The call-centre agent runs KBA: name, date of birth (from social media), mother\'s maiden name (from genealogy site), prior address (from voter rolls), recent transaction (from the phished email screenshot). All five answers correct. The agent moves to fulfilment without flagging that the inbound number does not match Renee\'s registered phone — caller ID matching is not part of the workflow. The dual-channel callback control would have caught the attempt here: hang up, look up the registered phone in the customer record, call back, and either confirm with Renee (proceed) or deny (block + refer to fraud team). The adversary cannot answer the callback to Renee\'s actual phone.',
    durationMs: 9000,
    messages: [
      { id: 'al-joint-m3-1', fromActor: 'adversary', toActor: 'callcentre', kind: 'callback',
        label: 'Inbound call · "I\'m Renee Patterson · need to add a joint signatory"',
        audio: { text: 'Hello, this is Renee Patterson. I need to add a joint signatory to my account.', profile: 'fraudster' } },
      { id: 'al-joint-m3-2', fromActor: 'callcentre', toActor: 'adversary', kind: 'callback',
        label: 'KBA: DOB · mother\'s maiden · prior address · last transaction · all correct' },
      { id: 'al-joint-m3-3', fromActor: 'callcentre', toActor: 'callcentre', kind: 'system',
        label: 'KBA passed · proceed to joint-add workflow · no callback to registered phone',
        audio: { text: 'KBA passed. Proceeding to joint-add. No callback verification.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'callcentre': 'verifying' },
    revealedSignalIds: ['sig-kba-passed-from-osint'],
  },

  /* Stage 4 — Joint signatory provisioned */
  {
    id: 'al-joint-stage-4',
    label: 'Joint provisioned',
    title: 'Joint "Andre Patterson" added · drop address · no branch presence',
    caption: 'The adversary requests joint signatory "Andre Patterson" be added. They explain: "He\'s my cousin; we\'re sharing expenses while I recover from surgery." The call-centre agent provisions the joint. NCB issues credentials for Andre\'s separate online banking profile, mailed to the adversary\'s drop address (collected during KBA as Renee\'s "current address"). No callback to Renee\'s registered phone on file. No branch presence required. No written authorization. The audit log records: "Joint signatory added per customer request — verbal." Renee receives no notification. The customer-notification control would have surfaced the joint-add at Renee\'s registered SMS and email immediately, with a 1-tap "Not me" affordance. The cross-customer velocity rule would have flagged the institutional pattern if this is one of N concurrent fraud-ring joint-adds.',
    durationMs: 10000,
    messages: [
      { id: 'al-joint-m4-1', fromActor: 'adversary', toActor: 'callcentre', kind: 'callback',
        label: 'Request: joint signatory "Andre Patterson" · drop address provided',
        audio: { text: 'Add Andre Patterson. He is my cousin. Send the credentials to this address.', profile: 'fraudster' } },
      { id: 'al-joint-m4-2', fromActor: 'callcentre', toActor: 'ncb', kind: 'http',
        label: 'Provision joint signatory · audit log: "verbal authorization"', suspicious: true },
      { id: 'al-joint-m4-3', fromActor: 'ncb', toActor: 'ncb', kind: 'system',
        label: 'Joint Andre Patterson added to Renee\'s account · no notification dispatched to registered SMS/email', suspicious: true,
        audio: { text: 'Joint signatory provisioned. No customer notification.', profile: 'narrator' } },
      { id: 'al-joint-m4-4', fromActor: 'ncb', toActor: 'renee', kind: 'sms',
        label: 'No notification sent · Renee unaware of joint-add' },
    ],
    actorStateChanges: { 'callcentre': 'fulfilled', 'ncb': 'recording' },
    revealedSignalIds: ['sig-joint-add-no-branch-presence', 'sig-new-signatory-no-relationship-graph'],
  },

  /* Stage 5 — Andre credentials arrive at adversary drop */
  {
    id: 'al-joint-stage-5',
    label: 'Drop activation',
    title: 'Day 6 — Andre credentials arrive at adversary drop · profile activated',
    caption: 'NCB\'s mailed credentials arrive at the drop address 6 days later. The adversary activates the Andre Patterson profile via the standard first-login flow on a fresh device. Andre is now an authenticated NCB online banking user with full transactional authority on Renee\'s accounts. The adversary does not transact yet — the patience plan continues. Two weeks of dormancy will let any post-provisioning anomaly score on Renee\'s account fade to baseline.',
    durationMs: 8500,
    messages: [
      { id: 'al-joint-m5-1', fromActor: 'ncb', toActor: 'adversary', kind: 'notification',
        label: 'Mailed credentials arrive at drop · Day 6' },
      { id: 'al-joint-m5-2', fromActor: 'adversary', toActor: 'ncb', kind: 'http',
        label: 'Andre profile first-login on fresh device · authentication successful',
        audio: { text: 'Andre profile activated. Fresh device. Full transactional authority.', profile: 'fraudster' } },
      { id: 'al-joint-m5-3', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Wait 14 days · let anomaly window cool' },
    ],
    actorStateChanges: { 'adversary': 'dormant' },
    revealedSignalIds: [],
  },

  /* Stage 6 — Renee resets password (does not audit signatories) */
  {
    id: 'al-joint-stage-6',
    label: 'Reset · no audit',
    title: 'Day 8 — Renee sees confusing login email · resets password',
    caption: 'Two days after the adversary\'s drop activation, Renee notices a "new device login" email NCB sent to her registered email — referencing Andre\'s profile, which she does not recognize. Confused, she logs into NCB on her own profile, sees nothing wrong on her dashboard (the joint signatory listing is buried two screens deep in account settings), and assumes the email was a phishing attempt. She resets her password as a precaution. The reset rotates her credentials. Andre\'s credentials are unaffected — they\'re a separate authentication path. The trainee mental model "I changed my password, I\'m safe" is exactly what the technique exploits. The customer-notification control fired at Stage 4 would have prompted Renee to audit signatories specifically; the reset flow does not.',
    durationMs: 9500,
    messages: [
      { id: 'al-joint-m6-1', fromActor: 'ncb', toActor: 'renee', kind: 'notification',
        label: 'Email: "New device login · Andre Patterson profile"' },
      { id: 'al-joint-m6-2', fromActor: 'renee', toActor: 'ncb', kind: 'http',
        label: 'Login on Renee\'s profile · dashboard normal · no joint-signatory surfaced' },
      { id: 'al-joint-m6-3', fromActor: 'renee', toActor: 'ncb', kind: 'http',
        label: 'Password reset · Renee believes incident resolved',
        audio: { text: 'Password reset. Believes incident is resolved. Joint signatory not audited.', profile: 'victimFemale' } },
      { id: 'al-joint-m6-4', fromActor: 'ncb', toActor: 'ncb', kind: 'system',
        label: 'Renee\'s password rotated · Andre profile credentials unchanged · separate path' },
    ],
    actorStateChanges: { 'renee': 'reacting' },
    revealedSignalIds: ['sig-credential-reset-without-signatory-audit'],
  },

  /* Stage 7 — Two-week dormancy */
  {
    id: 'al-joint-stage-7',
    label: 'Dormancy',
    title: 'Days 8 → 22 — Andre profile dormant · anomaly window cools',
    caption: 'For 14 days the adversary does not transact. NCB\'s anomaly scoring on Renee\'s account, which would have flagged a high-value transfer from a new device in the immediate post-reset window, cools. The Andre profile shows zero activity. From a fraud-detection perspective, Renee\'s account is "back to normal" — the password reset closed whatever incident triggered it. From the adversary\'s perspective, the configuration is in place; behavioural patience is doing the work.',
    durationMs: 7000,
    messages: [
      { id: 'al-joint-m7-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Andre profile dormant · 14 days · waiting for anomaly window to close' },
      { id: 'al-joint-m7-2', fromActor: 'ncb', toActor: 'ncb', kind: 'system',
        label: 'Renee\'s account anomaly score returns to baseline · no flag' },
      { id: 'al-joint-m7-3', fromActor: 'renee', toActor: 'renee', kind: 'system',
        label: 'Resumes normal banking · believes compromise cleaned' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 8 — Drain · final */
  {
    id: 'al-joint-stage-8',
    label: 'Drain',
    title: 'Day 22 — Andre profile drains the USD account',
    caption: 'On Day 22 post-provisioning, the adversary logs into the Andre profile and initiates three transfers from Renee\'s USD account to external accounts: USD 4,800, USD 4,950, USD 4,700 — each below the USD 5,000 threshold that triggers manual review. From NCB\'s perspective: a verified joint signatory is transacting on his joint account using his own credentials. The fraud signal — "Renee added a joint with no relationship history, who waited 14 days then drained the account" — exists in the audit data but is not surfaced by any single transactional rule. Renee discovers the loss the next day reviewing her balance, contacts NCB. NCB opens an investigation. Funds have already cleared to mule destinations.',
    durationMs: 11000,
    messages: [
      { id: 'al-joint-m8-1', fromActor: 'adversary', toActor: 'ncb', kind: 'http',
        label: 'Andre profile login · authentication successful · session active',
        audio: { text: 'Day twenty-two. Andre profile login. Session active.', profile: 'fraudster' } },
      { id: 'al-joint-m8-2', fromActor: 'adversary', toActor: 'ncb', kind: 'transfer',
        label: 'Transfer #1: USD 4,800 to external · sub-threshold', suspicious: true },
      { id: 'al-joint-m8-3', fromActor: 'adversary', toActor: 'ncb', kind: 'transfer',
        label: 'Transfer #2: USD 4,950 to external · sub-threshold', suspicious: true },
      { id: 'al-joint-m8-4', fromActor: 'adversary', toActor: 'ncb', kind: 'transfer',
        label: 'Transfer #3: USD 4,700 to external · sub-threshold', suspicious: true,
        audio: { text: 'Three sub-threshold transfers. Joint signatory transacting normally. No flag.', profile: 'narrator' } },
      { id: 'al-joint-m8-5', fromActor: 'renee', toActor: 'ncb', kind: 'callback',
        label: 'Day 23 · Renee reviews balance · USD 14,450 missing · calls fraud line',
        audio: { text: 'Day twenty-three. Renee discovers the loss. Calls the fraud line.', profile: 'victimFemale' } },
    ],
    actorStateChanges: { 'adversary': 'executing', 'ncb': 'authorizing', 'renee': 'discovering' },
    revealedSignalIds: ['sig-dormant-then-drain'],
    finalHeadline: 'Persistence outlives credentials. Renee did everything she had been trained to do — when she saw a confusing login alert, she rotated her password. The reset closed the credential path she controlled. It did not close the relational path the adversary had established 14 days earlier through the call centre. The diagnostic protocol for F1007.001 is not "change password" but "audit signatories." NCB\'s control point is the call-centre authorization process: out-of-band callback to the registered phone of file (not the inbound caller\'s claimed number) closes the social-engineering window because the adversary cannot answer the callback. Layer the customer-notification-on-joint-add control on top, with a 1-tap "Not me" affordance routed to the registered SMS and email, and the institutional-level cross-customer velocity rule across the call centre, and Joint Signatory Add ceases to be operationally viable. The next two F1007 sub-techniques (F1007.002 Linked Profile Add, F1007.003 External Account Link) cover digital-channel and cross-bank persistence — same pedagogical insight, different attack surfaces.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const ACCOUNT_LINKING_JOINT_META = {
  techId: 'F1007.001',
  techName: 'Account Linking: Joint Signatory Add',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'SC-renee-ncb-joint-add',
  scenarioContext: 'Mrs. Renee Patterson, age 41, NCB Liguanea customer, IT manager, 14-year customer (consumer + JMD savings + USD account). Phished three weeks before scenario opens — adversary captured credentials and pivoted to her email inbox where they harvested OSINT sufficient to pass NCB call-centre KBA (mother\'s maiden name from genealogy site, prior address from voter rolls, last transaction from a phished receipt screenshot). The adversary planned the patient route rather than direct drain: call the NCB call centre, claim to be Renee, pass KBA, request a joint signatory add for "convenience after a recent surgery." Joint "Andre Patterson" provisioned without callback to Renee\'s registered phone, without branch presence, without written authorization — entire workflow on a single inbound call. NCB mails Andre\'s credentials to the adversary\'s drop address. Adversary activates Andre profile on a fresh device at Day 6. Renee sees a confusing login email at Day 8, resets her password as a precaution, does not audit signatories (the reset flow does not prompt her to). Adversary\'s Andre profile credentials are unaffected by Renee\'s reset — separate authentication path. Adversary waits 14 days for NCB\'s post-reset anomaly window to fade. Day 22: three sub-threshold USD transfers totaling USD 14,450 to external accounts. Renee discovers the loss Day 23 reviewing her balance. Composite case grounded in publicly disclosed Caribbean banking ombudsman case patterns (JM 2022-2024) referencing improper joint-add authorizations, FFIEC and ABA published guidance on customer-not-present authorization adds, and public industry reporting on KBA-bypass via OSINT. NCB is the most-represented Caribbean institution in animations; this brings the count to 4 (Beverly Williams, Ricardo Powell, Janelle Chambers, Renee Patterson). First-name and surname both new to the roster.',
  totalDurationMs: 70500,
  stageCount: 8,
}


export default {
  meta: ACCOUNT_LINKING_JOINT_META,
  engine: 'multi-actor-sequence',
  stages: ACCOUNT_LINKING_JOINT_STAGES,
  controls: ACCOUNT_LINKING_JOINT_CONTROLS,
  signals: ACCOUNT_LINKING_JOINT_SIGNALS,
  actors: ACCOUNT_LINKING_JOINT_ACTORS,
}
