/**
 * passwordResetScenes.jsx — v25.7.0.16
 *
 * Scene data for Account Takeover: Password Reset (F1018.001) under
 * Initial Access (TA0001). Uses MultiActorSequenceAnimation engine.
 *
 * Composite case grounded in documented Caribbean banking patterns:
 * - NCB Special Investigations (Dane Nicholson, 2022): public
 *   confirmation that fraudsters use the bank's own password-reset
 *   flow as an attack vector once they have phished/OSINT-gathered
 *   the customer's basic identifiers and answers to security
 *   questions
 * - Jamaica Bankers Association anti-fraud reporting: account
 *   takeover via the bank's official self-service password reset is
 *   one of the top three ATO channels alongside phishing-then-OTP
 *   and SIM-swap-then-OTP
 * - Shelly-ann Watt Gammon case (Jamaica Observer, 2023): NCB
 *   customer in Savanna-la-mar, J$162K + J$508K loan-fraud incident,
 *   account compromise via reset-flow vector (the exact mechanism is
 *   not public; the case shape — silent account compromise + fraudulent
 *   loan + dispute — fits the F1018.001 pattern documented elsewhere)
 *
 * Scenario character: Mr. Andre Lewis, JNCB Personal Banking customer,
 * accountant at a Kingston firm, age 34. He is targeted because his
 * professional profile (LinkedIn) lists his employer, and the
 * employer's payroll partner is publicly known (banks at JNCB).
 * He's never contacted by the attacker; he discovers the loss when
 * his pay deposits to a balance that's J$340K lower than expected.
 *
 * Distinct character role from Allison Brown (mule recruitment SC007),
 * Marcia Edwards (Structuring vendor), Trevor Bennett (Structurer),
 * Beverly Williams (Phishing F1081), Devon Henry (Vishing F1088),
 * Tanya Ricketts (SIM Swap T1451), Marcus Walters (3DS Bypass F1076,
 * deferred).
 *
 * Pedagogical insight (locked v25.7.0.16):
 *   Account takeover via password reset is the silent attack vector.
 *   The victim is not contacted, not phished, not vishing'd, not SIM-
 *   swapped. The bank's own self-service password-reset flow — which
 *   exists for legitimate customer convenience — is the attack
 *   surface. Knowledge-based authentication (mother's maiden name,
 *   hometown, year of birth) was secure when those facts were private.
 *   In a world where employers' LinkedIn pages list payroll partners,
 *   Facebook posts list family members, and breach corpora list
 *   reused passwords, knowledge-based authentication is a public-
 *   information lookup. The bank is not "verifying the customer" —
 *   it's accepting answers from anyone who has done OSINT on the
 *   customer.
 *
 *   Operational pedagogy for tellers: when a customer disputes
 *   transactions and reports "I never logged in, I never got an OTP,
 *   I never got any call from the bank" — the kill chain is most
 *   likely F1018.001 password reset, not Phishing or Vishing. The
 *   tell is the absence of customer-side artifacts. Trace the audit
 *   log to the password reset event; check the security-question
 *   answers that were given; cross-reference against the customer's
 *   public LinkedIn / Facebook profile. The match will be obvious.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered. The
 *   bank's self-service password-reset flow is presented as the actual
 *   institutional vulnerability it is. The naive control "customers
 *   should choose stronger security questions" is surfaced and
 *   countered: knowledge-based authentication is structurally broken
 *   in 2026 regardless of question choice, because the answer
 *   universe is itself public.
 */


/* ─── Actors: 4-actor multi-actor sequence ────────────────────── */
export const PWRESET_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'OSINT operator + reset abuser',
    initialState: 'active',
  },
  {
    id: 'andre',
    name: 'Mr. Andre Lewis',
    role: 'JNCB customer · Kingston · accountant · age 34',
    initialState: 'unaware',
  },
  {
    id: 'jncb',
    name: 'JNCB Jamaica',
    role: 'Bank · password reset + auth + transfer systems',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'Mule beneficiary chain',
    role: 'Dispersion accounts · cash-out network',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const PWRESET_CONTROLS = [
  {
    id: 'ctrl-mfa-on-reset',
    label: 'Mandatory MFA on password reset (not knowledge-based)',
    meta: 'Requires the customer to authenticate via OTP to the registered mobile number, push notification to a registered device, or in-branch identity verification BEFORE any password reset can complete. Knowledge-based questions alone are insufficient because the answer universe is publicly inferable. Catches stages 3-4 by requiring an authentication channel the attacker does not control.',
    naive: false,
    revealsAtStages: [3, 4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'reset attempts',
  },
  {
    id: 'ctrl-reset-customer-notification',
    label: 'Real-time SMS + email alert on password reset',
    meta: 'Sends an SMS to the registered mobile AND email to the registered address the moment a password reset completes — including from a new IP or new device. Andre would receive the notification within seconds. He can call JNCB and freeze the account before the attacker logs in. Most banks have this capability; the question is whether it is enabled and whether the alert reaches a channel the attacker has not also compromised.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'reset events',
  },
  {
    id: 'ctrl-new-device-velocity',
    label: 'New-device-then-large-transfer velocity rule',
    meta: 'Holds outbound transfers above J$50K when the originating session is from a never-seen device, OR when the password was reset within the last 24 hours. Andre\'s J$340K transfer to a new beneficiary, from a session originating in St. Petersburg Russia, on an account whose password was reset 11 minutes earlier, would be held for callback verification. Held funds are recoverable; cleared funds are not.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'high-risk transfers',
  },
  {
    id: 'ctrl-naive-stronger-questions',
    label: 'Customers should choose stronger security questions',
    meta: 'Treats the security-question vulnerability as a customer-choice problem. Asks customers to pick "harder to guess" questions or use fictitious answers. Doesn\'t work because (a) most customers reuse the same fictitious answers across sites, putting them in breach corpora; (b) the bank\'s question pool is finite — once an attacker has 5 candidate answers per question, the brute-force space is small; (c) knowledge-based authentication is structurally broken in 2026 because answer privacy is no longer achievable. The fix is institutional: stop using knowledge-based auth for high-stakes account changes. Use MFA.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Blames the customer for an institutional design flaw. The bank chose to use knowledge-based questions on the reset flow; the bank can choose to require MFA instead. Customer behavior cannot fix a structurally broken authentication channel. The same Caribbean-banking executive framing that surfaces in the NCB phishing case ("customers are exposing themselves") appears here in a different form.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const PWRESET_SIGNALS = [
  {
    id: 'sig-osint-answer-source',
    label: 'Security answers all match Andre\'s public profile',
    description: 'Mother\'s maiden name (Wilson) — visible on Facebook posts tagging "Mommy Wilson". City of birth (Mandeville) — visible on LinkedIn. Year of first car (2015) — inferable from a 2015 Facebook post "got my first car!". Three-of-three security answers come directly from public sources. A fraud analyst comparing the reset answers to Andre\'s public profile sees the match immediately.',
    revealedBy: 'ctrl-mfa-on-reset',
  },
  {
    id: 'sig-no-mfa-second-channel',
    label: 'Reset completed without OTP or device verification',
    description: 'JNCB\'s password-reset flow accepted three security-question answers and issued a new password. No SMS to the registered phone. No push to the registered device. No in-branch verification. The reset audit log shows: question-only authentication, IP geolocating to St. Petersburg Russia, browser fingerprint never previously seen. Each of those three signals is independently a strong fraud indicator; together they are conclusive.',
    revealedBy: 'ctrl-mfa-on-reset',
  },
  {
    id: 'sig-no-reset-notification',
    label: 'Andre received no notification of the password reset',
    description: 'Andre\'s phone and email show no JNCB communication on the day of the reset. He has no opportunity to recognize the attack in progress. The 11-minute window between reset and first fraudulent transfer is the recoverable window — if the bank had notified him, he could have called within minutes. Without notification, the recoverable window is zero.',
    revealedBy: 'ctrl-reset-customer-notification',
  },
  {
    id: 'sig-reset-then-immediate-large-transfer',
    label: 'J$340K transfer initiated 11 minutes after password reset',
    description: 'Reset at 10:23 AM. Login at 10:27 AM. Add new beneficiary at 10:31 AM. Initiate J$340K transfer at 10:34 AM. The full kill chain — reset to fraud — completes in 11 minutes. Velocity rules tied to recent password changes catch this exact pattern.',
    revealedBy: 'ctrl-new-device-velocity',
  },
  {
    id: 'sig-impossible-travel-session',
    label: 'Session originates from St. Petersburg, Russia',
    description: 'Andre lives in Kingston. His prior login history is exclusively from Jamaica IPs. The reset session and post-reset transaction session both originate from a Russian residential IP — a known proxy/VPN exit node frequently used by Eastern European cybercrime crews to mask origin. Geolocation alone is not conclusive (legitimate VPN use exists), but combined with the new-device fingerprint and absence of prior travel notification, it is a strong signal.',
    revealedBy: 'ctrl-new-device-velocity',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const PWRESET_STAGES = [
  /* Stage 1 — OSINT phase (compressed; full coverage in F1067) */
  {
    id: 'pr-stage-1',
    label: 'OSINT phase',
    title: 'Andre\'s public profile is the answer key',
    caption: 'Day 0 of the operation. The fraudster crew has already purchased Andre\'s OSINT dossier from a crew-private channel — the same dossier-aggregation pipeline shown in the Gather Victim Information (F1067) animation. The dossier includes name, employer (visible LinkedIn), date of birth (Facebook public birthday post), mother\'s name (Facebook tags), city of birth (LinkedIn "From Mandeville" field), year of first car (2015 Facebook post), and a leaked password from a 2019 unrelated breach. Total cost to acquire dossier: USD $40. Total OSINT effort: 47 minutes by the original profiler.',
    durationMs: 6000,
    messages: [
      { id: 'pr-m1-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Acquire OSINT dossier · Andre Lewis · USD $40',
        audio: { text: 'OSINT dossier acquired. Forty dollars. Andre Lewis. JNCB customer.', profile: 'narrator' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Identify the bank's reset flow */
  {
    id: 'pr-stage-2',
    label: 'Reset flow recon',
    title: 'JNCB self-service password reset is the target',
    caption: 'The crew tests JNCB\'s "Forgot Password" flow with a throwaway account first. They confirm the flow: enter username → answer 3 security questions → receive new temporary password via email (NOT to phone). The email channel is an account the attacker controls because Andre\'s primary email (lewis.a.acct@gmail.com) was compromised in a 2019 breach with a password he reused on Gmail. The crew already has Gmail access. Knowledge-based questions plus a compromised email channel is the attack surface.',
    durationMs: 7000,
    messages: [
      { id: 'pr-m2-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Test "Forgot Password" flow · throwaway account' },
      { id: 'pr-m2-2', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: 'Flow confirmed: 3 questions → email reset link' },
      { id: 'pr-m2-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Verify Gmail access · lewis.a.acct@gmail.com (2019 breach)',
        audio: { text: 'Gmail access confirmed. Same password as the leak.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — Initiate the reset */
  {
    id: 'pr-stage-3',
    label: 'Reset initiated',
    title: '10:23 AM — three security questions answered correctly',
    caption: 'Tuesday morning, 10:23 AM. The fraudster opens JNCB\'s "Forgot Password" page, enters Andre\'s username, and is prompted with three security questions. Q1: "Mother\'s maiden name" — Wilson (from Facebook). Q2: "City of birth" — Mandeville (from LinkedIn). Q3: "Year you got your first car" — 2015 (from a Facebook post). Three-of-three correct on the first try. JNCB\'s reset flow proceeds.',
    durationMs: 8000,
    messages: [
      { id: 'pr-m3-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'POST /forgot-password · username: andre.lewis', suspicious: true },
      { id: 'pr-m3-2', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: '3 security questions returned' },
      { id: 'pr-m3-3', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Q1: Wilson · Q2: Mandeville · Q3: 2015', suspicious: true,
        audio: { text: 'Mother Wilson. Mandeville. Two thousand fifteen.', profile: 'fraudster' } },
    ],
    actorStateChanges: { 'jncb': 'active' },
    revealedSignalIds: ['sig-osint-answer-source', 'sig-no-mfa-second-channel'],
  },

  /* Stage 4 — Reset link sent + intercepted */
  {
    id: 'pr-stage-4',
    label: 'Reset link intercepted',
    title: 'Email reset link goes to the compromised inbox',
    caption: 'JNCB sends the temporary password reset link to Andre\'s registered email — lewis.a.acct@gmail.com. Andre\'s phone (Digicel, registered for SMS alerts on his JNCB account) gets nothing — the bank does not send a parallel SMS notification when password is reset via email. The fraudster is already logged into Gmail; the email arrives in the inbox they control. They click the link, set a new password, and have full account access. Andre, at his desk in Kingston, has no signal anything is wrong.',
    durationMs: 8000,
    messages: [
      { id: 'pr-m4-1', fromActor: 'jncb', toActor: 'andre', kind: 'sms', label: '(no SMS notification sent)', tooltip: 'JNCB does not parallel-notify on email reset', suspicious: true },
      { id: 'pr-m4-2', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: 'Email: "Reset your JNCB password" · link to fraudster Gmail',
        audio: { text: 'Reset your JNCB password. Click the link below.', profile: 'system' } },
      { id: 'pr-m4-3', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Click reset link · set new password', suspicious: true },
    ],
    revealedSignalIds: ['sig-no-reset-notification'],
  },

  /* Stage 5 — Login to JNCB online banking */
  {
    id: 'pr-stage-5',
    label: 'Account access',
    title: '10:27 AM — fraudster logs in as Andre',
    caption: '10:27 AM. The fraudster logs into JNCB\'s online banking portal as Andre, using the just-set password. The session originates from a residential IP geolocating to St. Petersburg, Russia — a known proxy exit node. Browser fingerprint is new. Andre\'s prior 18 months of login history is exclusively from Kingston-area Digicel and Flow IPs. JNCB\'s session-anomaly scoring system flags this login but only as informational — it does not trigger a hold or step-up authentication.',
    durationMs: 7000,
    messages: [
      { id: 'pr-m5-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Login · IP: St. Petersburg, RU · new device', suspicious: true },
      { id: 'pr-m5-2', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Anomaly score: HIGH · informational flag only · no hold' },
    ],
    revealedSignalIds: ['sig-impossible-travel-session'],
  },

  /* Stage 6 — Add beneficiary + initiate transfer */
  {
    id: 'pr-stage-6',
    label: 'Transfer initiated',
    title: '10:34 AM — J$340K to a new beneficiary',
    caption: '10:31 AM. The fraudster adds a new beneficiary to Andre\'s account: "JNCB Asset Trust Holdings" (a similarly-named NCB account opened 28 days ago by a recruited mule). 10:34 AM. They initiate a J$340K transfer to that beneficiary — Andre\'s entire balance minus J$8K to avoid triggering "complete drain" heuristics. The transfer enters a pending queue. JNCB\'s velocity rules SHOULD hold this — new-beneficiary + new-device + recent-password-reset is a triple-signal hold pattern. They do not, in this scenario. The transfer clears at 10:36 AM.',
    durationMs: 9000,
    messages: [
      { id: 'pr-m6-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Add beneficiary · "JNCB Asset Trust Holdings"', suspicious: true },
      { id: 'pr-m6-2', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Transfer J$340K · pending', suspicious: true },
      { id: 'pr-m6-3', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Velocity check: triple-signal · NOT held · cleared 10:36 AM', suspicious: true },
      { id: 'pr-m6-4', fromActor: 'jncb', toActor: 'mule', kind: 'http', label: 'J$340K credited to mule beneficiary · 10:36 AM' },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: ['sig-reset-then-immediate-large-transfer'],
  },

  /* Stage 7 — Discovery and dispute */
  {
    id: 'pr-stage-7',
    label: 'Discovery',
    title: 'Friday: Andre logs in and sees the loss',
    caption: 'Three days later, Friday morning, Andre logs into JNCB to check his payroll deposit. Balance: J$8,400 instead of the expected J$348,400. He calls JNCB customer care. The agent reviews the audit log: password reset Tuesday at 10:23 AM via security questions. Login at 10:27 AM. Transfer at 10:34 AM. All from a session in Russia. By Friday the J$340K has cleared the mule beneficiary, been split across 4 dispersion accounts, and withdrawn as cash from ABMs in Spanish Town and Portmore. JNCB\'s position: the reset flow correctly authenticated the request via the security questions on file. Andre\'s position: he never received any notification, never authorized any transfer, and three publicly-knowable facts should not be sufficient authentication for taking over his account.',
    durationMs: 10000,
    messages: [
      { id: 'pr-m7-1', fromActor: 'andre', toActor: 'jncb', kind: 'callback', label: '"My balance is J$340K short. I never made any transfers."', tooltip: 'Friday morning, day +3',
        audio: { text: 'My balance is three forty thousand short. I never made any transfers.', profile: 'victimMale' } },
      { id: 'pr-m7-2', fromActor: 'jncb', toActor: 'andre', kind: 'callback', label: '"Your password was reset Tuesday. Audit log shows you authorized."',
        audio: { text: 'Your password was reset Tuesday. The audit log shows you authorized.', profile: 'investigator' } },
      { id: 'pr-m7-3', fromActor: 'andre', toActor: 'jncb', kind: 'callback', label: '"I did not reset my password. I got no notification at all."',
        audio: { text: 'I did not reset my password. I got no notification at all.', profile: 'victimMale' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'Andre is not unique. The password-reset attack vector is one of the top three account takeover channels documented by Caribbean banking fraud-prevention units (alongside phishing-then-OTP and SIM-swap-then-OTP). The institutional fix is straightforward and well-known: require MFA on the reset flow. Knowledge-based authentication is structurally broken in 2026 because answer privacy is no longer achievable. Until banks retire knowledge-based auth on high-stakes account changes, F1018.001 will continue to drain customer accounts silently — without phishing emails to recognize, without vishing calls to verify, without SIM-swap notifications to investigate. The victim never participates. There is nothing for the customer to "watch out for."',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const PWRESET_META = {
  techId: 'F1018.001',
  techName: 'Account Takeover: Password Reset',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-andre-jncb-reset-ato',
  scenarioContext: 'Mr. Andre Lewis, JNCB Personal Banking customer, accountant at a Kingston firm, age 34. Targeted because his professional profile (LinkedIn) is public and his employer\'s payroll partner (JNCB) is publicly knowable from the employer\'s LinkedIn page. The attack chain is OSINT → reset-flow abuse via knowledge-based authentication → fraudulent transfer. The victim is never contacted. He discovers the loss when his payroll deposits to a balance J$340K lower than expected. Composite case grounded in documented Caribbean banking fraud patterns: NCB Special Investigations public reporting (Dane Nicholson, 2022); Jamaica Bankers Association anti-fraud committee classification of password-reset ATO as a top-three channel; Shelly-ann Watt Gammon NCB case (Jamaica Observer 2023) — silent compromise pattern fits F1018.001. Distinct character role from Allison Brown (mule SC007), Marcia Edwards (Structuring vendor F1087), Trevor Bennett (Structurer F1087), Beverly Williams (Phishing F1081), Devon Henry (Vishing F1088), Tanya Ricketts (SIM Swap T1451), and Marcus Walters (3DS Bypass F1076 deferred).',
  totalDurationMs: 55000,
  stageCount: 7,
}


export default {
  meta: PWRESET_META,
  engine: 'multi-actor-sequence',
  stages: PWRESET_STAGES,
  controls: PWRESET_CONTROLS,
  signals: PWRESET_SIGNALS,
  actors: PWRESET_ACTORS,
}
