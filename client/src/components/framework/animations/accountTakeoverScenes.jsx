/**
 * accountTakeoverScenes.jsx — v25.7.0.20
 *
 * Scene data for Account Takeover (F1018) — the parent canonical
 * technique that umbrellas F1018.001 (Password Reset), F1018.002
 * (Credential Stuffing), F1018.003 (Session Cookie Theft), and
 * other ATO variants. Under Initial Access (TA0001). Uses
 * MultiActorSequenceAnimation engine.
 *
 * Pedagogical job (different from prior Phase 1 animations):
 *   The previous Phase 1 animations (F1018.001, F1081, F1088,
 *   T1451, T1621, F1072) each told a single specific kill chain
 *   from the ATTACKER'S perspective, start to finish. F1018 has
 *   the opportunity to teach the DEFENDER'S perspective — what
 *   does a fraud analyst actually do when a customer dispute
 *   lands on their desk and they don't yet know what happened.
 *
 *   The pedagogical core: how to recognize that an ATO of any
 *   variant has happened, then how to identify WHICH variant,
 *   because each variant has different remediation, different
 *   recovery prospects, and different institutional fix
 *   priorities.
 *
 * Scenario structure: an analyst's morning at the JNCB Fraud
 * Operations Center. Three customers have walked in or called
 * overnight disputing transactions on their accounts. The analyst
 * (Ms. Karelle Bryan, JNCB Fraud Operations, 4 years tenure) does
 * not know what happened to any of them. She runs the same
 * diagnostic protocol on each case and arrives at three different
 * F1018 variant diagnoses:
 *
 *   Case A — Andre Lewis (the F1018.001 victim from v25.7.0.16
 *            Password Reset animation; reused here intentionally
 *            to model the cross-animation continuity Caribbean
 *            banking trainees see in real ops)
 *   Case B — Marcus Bryan (no relation to Karelle; common surname)
 *            credential-stuffing victim — F1018.002 framing
 *   Case C — Tashana Hall, session-cookie-theft victim from a
 *            compromised public WiFi at an airport — F1018.003
 *            framing
 *
 * Each case produces a different combination of customer-side
 * artifacts and audit log signatures, and the animation shows
 * how the analyst uses the absence-vs-presence pattern to
 * diagnose the variant.
 *
 * Composite case grounding:
 * - Andre Lewis case is the same composite from v25.7.0.16 and
 *   carries forward the same grounding (NCB Special Investigations
 *   public reporting, Dane Nicholson 2022; Shelly-ann Watt Gammon
 *   silent compromise pattern).
 * - Marcus Bryan case is grounded in documented credential-stuffing
 *   attack pattern (Verizon Data Breach Investigations Report
 *   classification of credential stuffing as the most common
 *   account compromise vector globally; in Caribbean banks the
 *   prerequisite — leaked credential pairs from breaches of non-
 *   bank sites that customers reuse passwords on — is universally
 *   present).
 * - Tashana Hall case is grounded in documented session-cookie-
 *   theft pattern via packet capture / man-in-the-middle on
 *   untrusted networks (NIST SP 800-63B guidance on session
 *   token protection; OWASP session management cheat sheet).
 *   Public WiFi in Caribbean airports specifically is documented
 *   as having weak network segregation.
 *
 * Pedagogical insight (locked v25.7.0.20):
 *   ATO variant diagnosis matters because remediation differs.
 *   F1018.001 (Password Reset) means the bank's reset flow is
 *   the institutional vulnerability — fix is engineering on the
 *   reset endpoint. F1018.002 (Credential Stuffing) means the
 *   customer's leaked-from-elsewhere credential is the entry
 *   point — fix is mandatory MFA on login + breach corpus
 *   monitoring. F1018.003 (Session Cookie Theft) means session
 *   token transit is the vulnerability — fix is HTTPS strict +
 *   session token binding to client fingerprint. Treating all
 *   three as "ATO" without distinguishing the variant produces
 *   the wrong remediation in two of three cases and an
 *   institutional false sense that one fix solves all three.
 *
 *   Operational pedagogy for fraud analysts: the diagnostic
 *   protocol asks three questions in order — (1) what customer-
 *   side artifacts exist (phishing email, vishing call, push
 *   notifications, SIM-swap "no service" event)? (2) what audit-
 *   log entries exist (password reset event, login from new
 *   device/IP, MFA approval pattern)? (3) what is the time
 *   correlation between the two? The combinatorial answer
 *   identifies the variant.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage. The naive control "treat all ATO
 *   disputes the same way" is surfaced and countered: variant-
 *   blind triage produces wrong remediation, wrong customer
 *   communication, and wrong institutional learnings about which
 *   defenses are working.
 */


/* ─── Actors: 5-actor sequence (analyst + 3 customers + bank systems) ────── */
export const ATO_ACTORS = [
  {
    id: 'karelle',
    name: 'Ms. Karelle Bryan',
    role: 'JNCB Fraud Operations · 4 yrs tenure · Senior Analyst',
    initialState: 'active',
  },
  {
    id: 'andre',
    name: 'Mr. Andre Lewis',
    role: 'Case A · Kingston · F1018.001 · password reset victim',
    initialState: 'unaware',
  },
  {
    id: 'marcus',
    name: 'Mr. Marcus Bryan',
    role: 'Case B · Spanish Town · F1018.002 · credential stuffing victim',
    initialState: 'unaware',
  },
  {
    id: 'tashana',
    name: 'Ms. Tashana Hall',
    role: 'Case C · Montego Bay · F1018.003 · session cookie theft victim',
    initialState: 'unaware',
  },
  {
    id: 'jncb',
    name: 'JNCB Jamaica',
    role: 'Audit logs · authentication events · session telemetry',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const ATO_CONTROLS = [
  {
    id: 'ctrl-diagnostic-protocol',
    label: 'Standardized ATO variant diagnostic protocol',
    meta: 'Three-question protocol the analyst runs on every ATO dispute: (1) Customer-side artifacts? (any phishing email, vishing call, push notifications, SIM-swap "no service" event the customer recalls). (2) Audit-log entries? (password reset event, login from new device/IP, MFA approval pattern, session anomaly score). (3) Time correlation between the two? The combinatorial answer identifies the variant. Without the protocol, analysts default to whichever variant they last handled or whichever is most common at their institution; classification accuracy drops to the marginal of the most common variant (about 60-65% in Caribbean banks where Password Reset and Credential Stuffing are both prevalent).',
    naive: false,
    revealsAtStages: [3, 4, 5],
    catchCount: 3,
    catchTotal: 3,
    catchUnit: 'cases triaged correctly',
  },
  {
    id: 'ctrl-cross-variant-monitoring',
    label: 'Per-variant fraud rate dashboards (monthly)',
    meta: 'The bank tracks F1018.001, .002, .003, .004 as separate fraud categories with their own monthly volume and value metrics. Spikes in one variant trigger targeted institutional fixes (a .001 spike triggers password-reset endpoint review; a .002 spike triggers MFA enforcement review; a .003 spike triggers session-token transit review). Without per-variant tracking, "ATO is going up" is the only signal, and remediation budget gets allocated to the most-recently-discussed variant rather than the actually-spiking one. Caribbean banks that report ATO at the parent-category level only typically miss this signal until a major case forces a post-mortem.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'category-level signals',
  },
  {
    id: 'ctrl-customer-callback-on-dispute',
    label: 'Mandatory pre-investigation customer interview',
    meta: 'Before the analyst opens the audit log, the protocol requires a structured customer interview covering: phishing emails received in past 30 days, vishing calls received in past 30 days, push notifications received in past 7 days, any phone service interruption events, recent travel and WiFi use. Ten minutes per case. Captures customer-side artifacts BEFORE the analyst is biased by what they see in the audit log. Common defect: analysts who go to the audit log first start "looking for" the variant they already suspect from the log entries; the customer interview becomes confirmatory rather than diagnostic.',
    naive: false,
    revealsAtStages: [3, 4, 5],
    catchCount: 3,
    catchTotal: 3,
    catchUnit: 'unbiased diagnoses',
  },
  {
    id: 'ctrl-naive-uniform-triage',
    label: 'Treat all ATO disputes with the same standard process',
    meta: 'Treats ATO as a single fraud category with a single triage path: customer reports unauthorized transactions, analyst confirms loss amount, refers to recovery team, closes ticket as "ATO confirmed." Doesn\'t differentiate variants. Produces three institutional failure modes: (a) wrong remediation gets prioritized because the bank cannot see which variant is actually spiking; (b) wrong customer communication ("change your password" advice is correct for .002 credential stuffing but irrelevant for .001 password reset where the customer\'s old password was never used); (c) recovery prospects misjudged because session-cookie-theft cases (.003) often have shorter recovery windows than reset-flow cases (.001) and need faster mule-account freeze action. Variant-blind triage is the most common operational defect in Caribbean banking fraud ops as of 2026.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Treats classification accuracy as a luxury. It is not — variant misdiagnosis means wrong remediation gets institutional budget, wrong customer-facing advice gets distributed, and the actually-spiking attack vector continues to drain accounts while the bank invests in fixing a different one. The same Caribbean banking executive framing that surfaces the customer-blame pattern in earlier animations appears here as "all fraud is the same fraud" — a pattern that makes the institutional learning loop slower than the attacker learning loop.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const ATO_SIGNALS = [
  {
    id: 'sig-andre-no-customer-artifacts',
    label: 'Andre: no phishing, no vishing, no push notifications, no SIM event',
    description: 'Karelle\'s structured customer interview with Andre produces zero customer-side artifacts: no recent phishing emails recalled, no vishing calls, no MFA push notifications received, no phone service interruption. The audit log shows a password reset event answered with three security questions, then login from a new IP, then transfer to new beneficiary. Customer-side absence + audit-log presence of reset event = F1018.001 Password Reset variant. The diagnosis is conclusive in 8 minutes.',
    revealedBy: 'ctrl-diagnostic-protocol',
  },
  {
    id: 'sig-marcus-leaked-password-reuse',
    label: 'Marcus: password matches 2024 LinkedIn breach corpus',
    description: 'Karelle\'s interview with Marcus reveals he has been reusing the same password across "most sites" for years. Audit log shows successful login on first attempt from a new IP, no password reset event, no MFA push pattern (Marcus has MFA disabled in his account preferences — JNCB allows opt-out). Cross-reference Marcus\'s email against the 2024 LinkedIn breach corpus: positive match. Customer-side absence of reset/push artifacts + audit-log presence of clean login + breach corpus match = F1018.002 Credential Stuffing variant. Different remediation: enforce MFA on Marcus\'s account immediately; recommend bank-wide MFA mandatory.',
    revealedBy: 'ctrl-diagnostic-protocol',
  },
  {
    id: 'sig-tashana-airport-wifi-session',
    label: 'Tashana: legitimate session at MBJ airport, then attacker takeover same session',
    description: 'Karelle\'s interview with Tashana reveals she logged into JNCB online banking at Sangster International Airport (Montego Bay, MBJ) two weeks ago to check her balance before flying. She used the airport public WiFi. Audit log shows: legitimate session opened from MBJ IP, used briefly, closed. Eleven days later, the SAME session ID (which JNCB allowed to remain valid for 30 days under "remember this device") used from a Russian IP to initiate a transfer. No password event, no reset event, no MFA event. Customer-side presence of public-WiFi session + audit-log presence of session reuse from foreign IP = F1018.003 Session Cookie Theft variant. Different remediation: shorten session validity; bind sessions to client fingerprint; monitor session-IP-change events.',
    revealedBy: 'ctrl-diagnostic-protocol',
  },
  {
    id: 'sig-pre-investigation-interview-value',
    label: 'Customer interview captured artifacts the audit log missed',
    description: 'For all three cases, the pre-investigation customer interview surfaced facts the audit log did not have. Marcus\'s password-reuse pattern is not in any JNCB record; Tashana\'s airport WiFi use is not in any JNCB record. Without the interview, Marcus\'s case would likely have been misdiagnosed as F1018.001 (no customer-side artifacts visible to the analyst, audit log shows clean login = looks like silent reset attack). Tashana\'s case might have been misdiagnosed as F1018.002 (login from new IP, no reset = looks like credential stuffing). The customer interview is the diagnostic instrument; the audit log is the corroboration.',
    revealedBy: 'ctrl-customer-callback-on-dispute',
  },
  {
    id: 'sig-variant-rate-trend',
    label: 'JNCB monthly trend: .002 credential stuffing up 340% vs same period last year',
    description: 'Pulling JNCB\'s per-variant monthly fraud dashboards: F1018.001 Password Reset is roughly flat (the December 2023 mandatory-MFA-on-reset rollout reduced this category). F1018.002 Credential Stuffing is up 340% year-over-year. F1018.003 Session Cookie Theft is up modestly (45%) but from a small base. The 340% .002 spike is the institutional signal — it means the bank\'s biggest current ATO exposure is customers with MFA disabled OR MFA bypass via fatigue (T1621). Remediation budget should prioritize mandatory-MFA-no-opt-out and MFA-fatigue defenses, not reset-flow improvements (which are already paying off). Without per-variant tracking, the bank cannot see this signal and budget allocation gets driven by anecdote.',
    revealedBy: 'ctrl-cross-variant-monitoring',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ATO_STAGES = [
  /* Stage 1 — The morning queue */
  {
    id: 'ato-stage-1',
    label: 'Morning queue',
    title: '8:14 AM — three ATO disputes overnight',
    caption: 'Karelle Bryan arrives at the JNCB Fraud Operations Center at 8:00 AM. Her queue has three ATO disputes from overnight intake. Case A: Andre Lewis, Kingston, J$340K loss, walked into the New Kingston branch first thing this morning. Case B: Marcus Bryan, Spanish Town, J$180K loss, called the after-hours line at 11:42 PM Sunday. Case C: Tashana Hall, Montego Bay, J$520K loss, called from her hotel in Atlanta where she is on holiday. Three disputes; three potentially different variants of F1018; Karelle does not yet know which is which. Her job for the next two hours is to diagnose all three correctly so the right remediation team handles each.',
    durationMs: 8000,
    messages: [
      { id: 'ato-m1-1', fromActor: 'jncb', toActor: 'karelle', kind: 'system', label: 'Queue: 3 ATO disputes · A/B/C · J$1.04M total exposure',
        audio: { text: 'Three account takeover disputes overnight.', profile: 'narrator' } },
      { id: 'ato-m1-2', fromActor: 'karelle', toActor: 'karelle', kind: 'system', label: 'Run diagnostic protocol · interview first · audit log second',
        audio: { text: 'Interview first. Audit log second. Then triage.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Protocol setup */
  {
    id: 'ato-stage-2',
    label: 'Protocol setup',
    title: 'The three diagnostic questions',
    caption: 'Karelle\'s diagnostic protocol asks three questions on every ATO case, in this order: (1) What customer-side artifacts exist? Did the customer receive any phishing email, vishing call, MFA push notification, SIM-swap "no service" event, or other anomaly in the past 30 days? (2) What audit-log entries exist? Was there a password reset event, a login from a new device/IP, an MFA approval pattern, a session anomaly? (3) What is the time correlation between (1) and (2)? The combinatorial answer identifies the variant. The order matters: customer interview FIRST, audit log SECOND, prevents the analyst from anchoring on the audit log entries before they hear what the customer experienced.',
    durationMs: 7000,
    messages: [
      { id: 'ato-m2-1', fromActor: 'karelle', toActor: 'karelle', kind: 'system', label: 'Q1: Customer-side artifacts? Q2: Audit-log entries? Q3: Time correlation?',
        audio: { text: 'Three questions. Customer first. Then logs.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — Case A: Andre Lewis */
  {
    id: 'ato-stage-3',
    label: 'Case A',
    title: 'Andre Lewis — F1018.001 Password Reset',
    caption: 'Karelle starts with Case A. Andre walks through the interview: no phishing emails recalled, no vishing calls, no MFA push notifications received (Andre has MFA enabled and uses it routinely; he would notice unsolicited pushes), no phone service interruption events, no recent travel. Customer-side artifacts: zero. Karelle pulls the audit log. She finds: a password reset event Tuesday 10:23 AM via the security-questions flow, then a login from a Russian IP at 10:27 AM, then a transfer to a new beneficiary at 10:34 AM. Customer-side ABSENCE plus audit-log PRESENCE of a reset event equals F1018.001 Password Reset. Karelle codes the case as F1018.001 and routes it to the reset-endpoint remediation team. Andre\'s case takes 8 minutes from intake to correct diagnosis.',
    durationMs: 9000,
    messages: [
      { id: 'ato-m3-1', fromActor: 'karelle', toActor: 'andre', kind: 'callback', label: 'Interview · phishing? vishing? push? travel?' },
      { id: 'ato-m3-2', fromActor: 'andre', toActor: 'karelle', kind: 'callback', label: '"None of those. I never got anything."',
        audio: { text: 'None of those. I never got anything.', profile: 'victimMale' } },
      { id: 'ato-m3-3', fromActor: 'jncb', toActor: 'karelle', kind: 'http', label: 'Audit: reset 10:23 AM · login Russia 10:27 · transfer 10:34', suspicious: true },
      { id: 'ato-m3-4', fromActor: 'karelle', toActor: 'jncb', kind: 'system', label: 'Diagnosis: F1018.001 · route to reset-endpoint team',
        audio: { text: 'F ten eighteen point zero zero one. Password reset.', profile: 'investigator' } },
    ],
    actorStateChanges: { 'andre': 'targeted', 'jncb': 'active' },
    revealedSignalIds: ['sig-andre-no-customer-artifacts'],
  },

  /* Stage 4 — Case B: Marcus Bryan */
  {
    id: 'ato-stage-4',
    label: 'Case B',
    title: 'Marcus Bryan — F1018.002 Credential Stuffing',
    caption: 'Case B. Marcus on the phone from Spanish Town. Karelle\'s interview: any phishing? "No, I would have noticed." Any vishing? "Nothing." Push notifications? Marcus pauses — "I don\'t use those, I have MFA turned off because it\'s annoying." Karelle notes this. Password practices? "I use the same password on most sites. I know I shouldn\'t but I have like 40 accounts." Karelle pulls Marcus\'s email against the 2024 LinkedIn breach corpus: positive match, his password was leaked 18 months ago. Audit log: clean login Sunday 11:17 PM from a new IP, no reset event, no MFA event (because Marcus has MFA off), transfer at 11:23 PM. Pattern: customer-side ABSENCE of reset/push artifacts plus audit-log PRESENCE of clean login plus breach corpus MATCH equals F1018.002 Credential Stuffing. Karelle codes the case and routes to the MFA-enforcement team. Total time: 12 minutes.',
    durationMs: 9000,
    messages: [
      { id: 'ato-m4-1', fromActor: 'karelle', toActor: 'marcus', kind: 'callback', label: 'Interview · MFA status? password reuse? breach corpus?' },
      { id: 'ato-m4-2', fromActor: 'marcus', toActor: 'karelle', kind: 'callback', label: '"MFA off. I reuse passwords across most sites."',
        audio: { text: 'M F A off. Same password on most sites.', profile: 'victimMale' } },
      { id: 'ato-m4-3', fromActor: 'jncb', toActor: 'karelle', kind: 'http', label: 'LinkedIn 2024 breach: positive match · clean login from new IP', suspicious: true },
      { id: 'ato-m4-4', fromActor: 'karelle', toActor: 'jncb', kind: 'system', label: 'Diagnosis: F1018.002 · route to MFA-enforcement team',
        audio: { text: 'F ten eighteen point zero zero two. Credential stuffing.', profile: 'investigator' } },
    ],
    actorStateChanges: { 'marcus': 'targeted' },
    revealedSignalIds: ['sig-marcus-leaked-password-reuse', 'sig-pre-investigation-interview-value'],
  },

  /* Stage 5 — Case C: Tashana Hall */
  {
    id: 'ato-stage-5',
    label: 'Case C',
    title: 'Tashana Hall — F1018.003 Session Cookie Theft',
    caption: 'Case C. Tashana from her hotel in Atlanta on holiday. Karelle\'s interview: any phishing? "No." Any vishing? "No." Push notifications? "Nothing recent." Phone service interruption? "No." Recent travel? "Yes, I flew out of MBJ two weeks ago. I checked my balance at the airport before the flight." Karelle notes the public-WiFi event. Audit log: a legitimate session opened from a Sangster Airport IP two weeks ago, used briefly, closed. ELEVEN DAYS LATER the same session ID used from a Russian IP to initiate a J$520K transfer. JNCB allowed the session to remain valid for 30 days under the "remember this device" feature. No password event, no reset event, no MFA event. Customer-side PRESENCE of public-WiFi session plus audit-log PRESENCE of session reuse from foreign IP equals F1018.003 Session Cookie Theft. Karelle codes and routes to the session-binding remediation team. Total time: 15 minutes.',
    durationMs: 9500,
    messages: [
      { id: 'ato-m5-1', fromActor: 'karelle', toActor: 'tashana', kind: 'callback', label: 'Interview · public WiFi? remember-this-device? session age?' },
      { id: 'ato-m5-2', fromActor: 'tashana', toActor: 'karelle', kind: 'callback', label: '"Yes, MBJ airport WiFi two weeks ago."',
        audio: { text: 'Yes. Airport WiFi two weeks ago.', profile: 'victim' } },
      { id: 'ato-m5-3', fromActor: 'jncb', toActor: 'karelle', kind: 'http', label: 'Same session ID · MBJ origin · used 11 days later from Russia', suspicious: true },
      { id: 'ato-m5-4', fromActor: 'karelle', toActor: 'jncb', kind: 'system', label: 'Diagnosis: F1018.003 · route to session-binding team',
        audio: { text: 'F ten eighteen point zero zero three. Session cookie theft.', profile: 'investigator' } },
    ],
    actorStateChanges: { 'tashana': 'targeted' },
    revealedSignalIds: ['sig-tashana-airport-wifi-session'],
  },

  /* Stage 6 — Pattern at the institutional level */
  {
    id: 'ato-stage-6',
    label: 'Institutional pattern',
    title: 'Three variants, three remediation paths, one hidden trend',
    caption: 'Karelle finishes all three cases by 10:30 AM. She updates JNCB\'s per-variant fraud dashboard: F1018.001 +1, F1018.002 +1, F1018.003 +1. The dashboard surfaces a trend her individual-case work could not: F1018.002 Credential Stuffing is up 340% year-over-year, while F1018.001 Password Reset is roughly flat (the December 2023 mandatory-MFA-on-reset rollout is paying off) and F1018.003 Session Cookie Theft is modestly up from a small base. The 340% .002 spike means JNCB\'s biggest current ATO exposure is customers with MFA disabled. Without per-variant tracking, "ATO is up" would be the only signal, and remediation budget would default to whichever variant generated the loudest recent case. With per-variant tracking, the bank can see that mandatory-no-opt-out MFA is the single highest-leverage institutional fix available right now.',
    durationMs: 9500,
    messages: [
      { id: 'ato-m6-1', fromActor: 'karelle', toActor: 'jncb', kind: 'system', label: 'Update per-variant dashboard · .001 +1 · .002 +1 · .003 +1',
        audio: { text: 'Three cases. Three variants logged.', profile: 'investigator' } },
      { id: 'ato-m6-2', fromActor: 'jncb', toActor: 'karelle', kind: 'system', label: 'Trend: .002 up 340% YoY · .001 flat · .003 up 45%',
        audio: { text: 'Credential stuffing up three forty percent year over year.', profile: 'narrator' } },
    ],
    revealedSignalIds: ['sig-variant-rate-trend'],
  },

  /* Stage 7 — Why this matters */
  {
    id: 'ato-stage-7',
    label: 'Why this matters',
    title: 'Variant blindness costs more than misclassification',
    caption: 'Three months from now, JNCB\'s Risk Committee reviews ATO loss trends. With Karelle\'s per-variant data, the committee approves the engineering budget for mandatory-MFA-no-opt-out (the .002 fix) ahead of further reset-flow hardening (the .001 fix that is already paying off). Six months later, .002 incidents are down 78%. Without per-variant data, the committee would have approved budget for whatever was discussed at the most recent post-mortem, which would not have been .002 because individual .002 cases are smaller per-incident than .003 session-theft cases. The institutional learning loop runs at variant resolution; running it at parent-category resolution causes budget to chase the most recent loud case rather than the actually-spiking attack vector. F1018 is one technique with five-plus sub-techniques that look identical at the parent level and require completely different fixes at the sub-technique level.',
    durationMs: 8000,
    messages: [
      { id: 'ato-m7-1', fromActor: 'karelle', toActor: 'karelle', kind: 'system', label: 'Triage complete · 3/3 correct variant diagnoses · 35 min total',
        audio: { text: 'Three of three. Correct variant diagnoses.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'Account Takeover at the parent-category level is a fraud-shape, not an actionable technique. F1018.001 Password Reset, F1018.002 Credential Stuffing, F1018.003 Session Cookie Theft, and F1018.004 OAuth Token Hijack each have completely different kill chains, completely different remediation paths, and completely different recovery prospects. Caribbean banks that report ATO at the parent-category level only inherit the institutional false sense that "we fixed ATO last year." Per-variant tracking with standardized triage protocols is what converts an ATO dispute queue from a recovery-and-reimbursement workflow into an institutional learning loop. The pedagogical core: the variant matters more than the parent. The parent technique exists to organize the variants; the variants exist to drive the engineering work. Treating them as the same is treating fraud as a brand rather than a problem.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const ATO_META = {
  techId: 'F1018',
  techName: 'Account Takeover',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-karelle-jncb-ato-triage',
  scenarioContext: 'Ms. Karelle Bryan, JNCB Fraud Operations Center senior analyst (4 years tenure), works through three overnight ATO disputes — Andre Lewis (Case A, F1018.001 Password Reset, Kingston, J$340K), Marcus Bryan (Case B, F1018.002 Credential Stuffing, Spanish Town, J$180K), Tashana Hall (Case C, F1018.003 Session Cookie Theft, Montego Bay/Atlanta, J$520K). Pedagogical job: teach the DEFENDER perspective on ATO — diagnostic triage protocol that distinguishes variants, why variant resolution matters more than parent-category resolution, and how per-variant fraud dashboards drive correct remediation budget allocation. Composite case grounding: Andre case carries forward from v25.7.0.16; Marcus case grounded in documented credential-stuffing pattern (Verizon DBIR classification); Tashana case grounded in documented session-cookie-theft pattern via public WiFi (NIST SP 800-63B; OWASP session management). Distinct character role from all prior animation characters; Marcus Bryan and Karelle Bryan share a surname (no relation, common Caribbean surname) — modeled as realistic local naming.',
  totalDurationMs: 60000,
  stageCount: 7,
}


export default {
  meta: ATO_META,
  engine: 'multi-actor-sequence',
  stages: ATO_STAGES,
  controls: ATO_CONTROLS,
  signals: ATO_SIGNALS,
  actors: ATO_ACTORS,
}
