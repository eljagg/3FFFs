/**
 * mfaFatigueScenes.jsx — v25.7.0.18
 *
 * Scene data for MFA Request Generation (T1621) — the "MFA fatigue"
 * or "MFA bombing" attack pattern — under Initial Access (TA0001).
 * Uses MultiActorSequenceAnimation engine.
 *
 * Composite case grounded in:
 * - Documented MFA fatigue technique pattern (Microsoft Threat
 *   Intelligence Center reporting, 2022-2024; Uber breach September
 *   2022; Cisco breach August 2022) — the global technique playbook
 *   that attackers now apply to any push-MFA target including
 *   Caribbean banks
 * - NCB and JNCB rollout of push-based MFA via mobile apps in
 *   2022-2024 — the prerequisite infrastructure for T1621 against
 *   Caribbean banking customers is in place
 * - NCB Special Investigations public reporting (Dane Nicholson,
 *   2022) on infostealer-malware-derived credentials feeding into
 *   downstream account takeover — same credential-source pipeline
 *   that T1621 attackers use
 *
 * Scenario character: Mrs. Patricia "Pat" Henriques, JNCB Personal
 * Banking customer, primary-school teacher in Mandeville, age 47.
 * Reuses passwords across sites; her JNCB password leaked in an
 * unrelated 2023 breach. The attacker has her password but needs
 * to bypass JNCB's push-MFA. They bombard her phone with login-
 * approval push notifications at 9:47 PM on a Sunday — when she
 * is half-asleep, watching TV with grandchildren. After 28 ignored
 * pushes she taps "approve" to make the notifications stop.
 *
 * Distinct character role from Allison Brown (mule SC007), Marcia
 * Edwards (Structuring vendor F1087), Trevor Bennett (Structurer
 * F1087), Beverly Williams (Phishing F1081), Devon Henry (Vishing
 * F1088), Tanya Ricketts (SIM Swap T1451), Andre Lewis (Password
 * Reset F1018.001), Marcus Walters (3DS Bypass F1076 deferred).
 *
 * Pedagogical insight (locked v25.7.0.18):
 *   The bank's own authentication infrastructure is the attack
 *   vector. The push-MFA system that JNCB built to PROTECT
 *   customer logins is the channel the attacker uses to ATTACK
 *   the customer. The trainee's intuition that "we deployed MFA,
 *   so push-based authentication is secure" is the wrong frame —
 *   push-based MFA is secure ONLY IF the bank's MFA-generation
 *   system has rate limits, account-lockout-on-N-rejections,
 *   number-matching, and login-context display. Without these,
 *   push-MFA is a UI for the attacker to bombard the customer
 *   into compliance.
 *
 *   For Caribbean banking trainers, the operational signal is:
 *   when a customer disputes transactions and reports "I got a
 *   bunch of bank notifications I didn't ask for, and I tapped
 *   one of them to make it stop" — the kill chain is T1621. Audit
 *   log will show N push-MFA requests in a short window, mostly
 *   denied, then one approval, then the fraudulent transaction.
 *   Cross-reference the credential against breach corpora; find
 *   the leaked password.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered. The
 *   naive control "customers should know to never approve a push
 *   they did not initiate" is surfaced and countered: behavioral
 *   guidance cannot solve infrastructure-level vulnerabilities.
 *   Customers are tired, distracted, and trust their bank's app —
 *   the design assumption that they will reliably reject 28 push
 *   notifications is wrong. The fix is institutional: rate-limit
 *   MFA generation, auto-lock on rejection count, require number-
 *   matching.
 */


/* ─── Actors: 4-actor multi-actor sequence ────────────────────── */
export const MFA_FATIGUE_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Credential-stuffer + MFA bomber',
    initialState: 'active',
  },
  {
    id: 'pat',
    name: 'Mrs. Patricia Henriques',
    role: 'JNCB customer · Mandeville · teacher · age 47',
    initialState: 'unaware',
  },
  {
    id: 'jncb',
    name: 'JNCB Jamaica',
    role: 'Bank · auth + push-MFA + transfer systems',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'Mule beneficiary chain',
    role: 'Dispersion accounts',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const MFA_FATIGUE_CONTROLS = [
  {
    id: 'ctrl-mfa-rate-limit',
    label: 'MFA request rate-limit (N pushes per hour, then lock)',
    meta: 'Bank-side rule: more than 5 push-MFA requests for the same account in a 30-minute window auto-locks the account and requires manual reactivation via callback or branch visit. Pat\'s account would have locked at the 6th push; the attacker\'s 28-push bombing campaign would have failed at request 6, ~3 minutes in. The customer never has the chance to be fatigued because the system stops sending pushes.',
    naive: false,
    revealsAtStages: [3, 4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'bombing campaigns',
  },
  {
    id: 'ctrl-mfa-number-matching',
    label: 'Number-matching MFA (display 2-digit code on login)',
    meta: 'When a login attempt triggers a push, the login screen displays a random 2-digit code (e.g. "47") and the customer\'s phone prompts them to enter or tap that exact number, not just "approve" or "deny". Microsoft enforced this on Authenticator in 2023 specifically to defeat fatigue attacks. The attacker doing credential-stuffing from St. Petersburg cannot see Pat\'s login-screen code, so they cannot tell her which number to tap. The customer cannot accidentally approve while half-asleep because tapping the wrong number is a denial.',
    naive: false,
    revealsAtStages: [4, 5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'fatigue approvals',
  },
  {
    id: 'ctrl-mfa-context-display',
    label: 'Push notification shows login context (location, device)',
    meta: 'The push notification text is not "Approve login?" but "Approve login from a Windows PC in St. Petersburg, Russia at 9:47 PM?". A customer who reads the push sees that the location is wrong (Pat lives in Mandeville and uses an iPhone), and denies. Contextual prompts shift the burden from "can you remember if you tried to log in" to "is this where you are right now" — much easier to reason about correctly. Best practice; not universally deployed by Caribbean banks as of 2026.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'context-aware approvals',
  },
  {
    id: 'ctrl-naive-customer-vigilance',
    label: 'Customers should know to never approve a push they did not initiate',
    meta: 'Treats MFA fatigue as a customer-vigilance problem: the customer should reject any push they did not personally initiate. Doesn\'t work for three reasons: (a) Customers do legitimately receive pushes they did not initiate (e.g. when a teller-assisted transaction triggers a push for the customer to approve), so "never approve unsolicited" creates legitimate-transaction friction. (b) Customers are tired, distracted, and trust their bank\'s app — the assumption they will reliably reject 28 sequential pushes at 9:47 PM on a Sunday is wrong. (c) The attack design exploits human exhaustion; behavioral training does not raise the exhaustion ceiling. Real defense is bank-side: rate-limit, auto-lock, number-match.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Blames the customer for an infrastructure-level design flaw. The bank chose to deploy push-MFA without rate limits, lock-outs, or number matching. The customer cannot fix that with vigilance; only the bank can fix it with engineering. The same Caribbean banking executive framing that surfaces in NCB\'s phishing case ("customers are exposing themselves") appears here as customer-vigilance language.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const MFA_FATIGUE_SIGNALS = [
  {
    id: 'sig-credential-from-breach',
    label: 'Pat\'s JNCB password matches 2023 breach corpus',
    description: 'Pat\'s password is "Mandeville2017!" — same password she used on her LinkedIn (breached December 2023, 218M records on a known credential aggregator). The attacker did not phish or guess her password; they bought a leaked password list and tried it against JNCB. Credential-stuffing at scale: ~10,000 leaked-Caribbean-customer credentials tested against JNCB\'s login API in a single overnight run; Pat\'s was one of ~340 valid hits.',
    revealedBy: 'ctrl-mfa-rate-limit',
  },
  {
    id: 'sig-burst-of-mfa-requests',
    label: '28 MFA requests for Pat\'s account in 9 minutes',
    description: 'Audit log shows 28 push-MFA requests for Pat\'s JNCB account between 9:47:13 PM and 9:56:08 PM. 27 denied or auto-expired; 1 approved at 9:55:41 PM. No legitimate customer use case generates 28 push requests in 9 minutes. Rate-limiting + auto-lockout would have caught this by request 6.',
    revealedBy: 'ctrl-mfa-rate-limit',
  },
  {
    id: 'sig-no-number-matching',
    label: 'JNCB\'s push prompt is "Approve / Deny" — no number to match',
    description: 'JNCB\'s push-MFA implementation displays the message "Login attempt — Approve / Deny." It does not display a 2-digit number that the customer must match against the login screen. A customer half-asleep can tap "Approve" without any verification step. Number-matching adds a 2-second cognitive task that defeats most fatigue approvals — the customer would have to visually find and tap the right number, which is hard to do accidentally.',
    revealedBy: 'ctrl-mfa-number-matching',
  },
  {
    id: 'sig-no-login-context',
    label: 'Push prompt does not show login location or device',
    description: 'JNCB\'s push prompt does not include the line "Login from a Windows PC in St. Petersburg, Russia at 9:47 PM." A customer reading the push has no way to recognize the login as foreign. Pat\'s legitimate logins are exclusively from her iPhone in Mandeville; the contextual mismatch is obvious if displayed.',
    revealedBy: 'ctrl-mfa-context-display',
  },
  {
    id: 'sig-foreign-login-session',
    label: 'Login + transfer session originates in St. Petersburg, Russia',
    description: 'Both the login session and the post-approval transfer session originate from a residential IP geolocating to St. Petersburg, Russia — a known proxy/VPN exit node frequently used by Eastern European credential-stuffing operations. Pat\'s prior 2 years of login history is exclusively from Jamaica IPs. Geolocation alone is not conclusive (legitimate VPN exists), but combined with breach-corpus match and bombing pattern, it is conclusive.',
    revealedBy: 'ctrl-mfa-context-display',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const MFA_FATIGUE_STAGES = [
  /* Stage 1 — Credential acquisition */
  {
    id: 'mfa-stage-1',
    label: 'Credential acquisition',
    title: 'Pat\'s password is in a 2023 breach corpus',
    caption: 'Day 0 of the operation. The fraudster crew acquires a credential-stuffing list — roughly 10,000 leaked email/password pairs from Caribbean-customer-facing sites breached in 2022-2024. Pat\'s entry is in the list: pat.henriques@gmail.com / Mandeville2017! — leaked from a December 2023 LinkedIn-adjacent breach. She reused this password on her JNCB account because "Mandeville2017" is meaningful to her (year she moved to her current home). The crew runs the full list against JNCB\'s login API overnight; ~340 of the 10,000 credentials succeed at username/password. Pat\'s is one of them.',
    durationMs: 6000,
    messages: [
      { id: 'mf-m1-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Acquire 10,000 credential pairs · 2023-2024 breaches',
        audio: { text: 'Ten thousand credentials. Caribbean targets. Overnight run.', profile: 'narrator' } },
      { id: 'mf-m1-2', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Credential stuff · 10,000 login attempts overnight', suspicious: true },
      { id: 'mf-m1-3', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: '~340 valid username/password (incl. pat.henriques@gmail.com)', suspicious: true },
    ],
    revealedSignalIds: ['sig-credential-from-breach'],
  },

  /* Stage 2 — The MFA wall */
  {
    id: 'mfa-stage-2',
    label: 'MFA blocks the login',
    title: 'JNCB requires push-MFA approval to complete login',
    caption: 'The attacker has Pat\'s password but cannot complete login without push-MFA approval from her phone. JNCB rolled out push-MFA in 2023 specifically to defeat credential-stuffing attacks like this one. The attacker has two options: phish the MFA approval (stop here, fall back to a vishing campaign) OR fatigue the customer into approving. They choose fatigue because it scales — they have 340 valid credential pairs to monetize and no time for individual social engineering.',
    durationMs: 6000,
    messages: [
      { id: 'mf-m2-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'POST /login · pat.henriques@gmail.com · password OK', suspicious: true },
      { id: 'mf-m2-2', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: 'MFA required: push to registered device' },
      { id: 'mf-m2-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Fall-back: launch fatigue bombing',
        audio: { text: 'Password works. MFA required. Switch to bombing.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — Bombing begins */
  {
    id: 'mfa-stage-3',
    label: 'The bombing begins',
    title: '9:47 PM Sunday — Pat\'s phone starts buzzing',
    caption: '9:47 PM on a Sunday. Pat is on her couch in Mandeville, watching TV with her two grandchildren. Her phone buzzes with a JNCB push notification: "Login attempt — Approve / Deny." She did not initiate any login. She taps Deny. Eight seconds later it buzzes again. Same message. She taps Deny. Twelve seconds later, again. The attacker is scripting login attempts; each failed attempt or denial triggers another push. Pat is now annoyed and starting to wonder if the JNCB app is glitching.',
    durationMs: 8000,
    messages: [
      { id: 'mf-m3-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Trigger MFA push #1', suspicious: true },
      { id: 'mf-m3-2', fromActor: 'jncb', toActor: 'pat', kind: 'sms', label: 'Push: "Login attempt — Approve / Deny"',
        audio: { text: 'JNCB. Login attempt. Approve or deny.', profile: 'system' } },
      { id: 'mf-m3-3', fromActor: 'pat', toActor: 'jncb', kind: 'http', label: 'Deny',
        audio: { text: 'Deny.', profile: 'victim' } },
      { id: 'mf-m3-4', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Trigger MFA push #2 (8 seconds later)', suspicious: true },
    ],
    actorStateChanges: { 'pat': 'targeted', 'jncb': 'active' },
    revealedSignalIds: ['sig-burst-of-mfa-requests'],
  },

  /* Stage 4 — The fatigue */
  {
    id: 'mfa-stage-4',
    label: 'Fatigue sets in',
    title: '9:51 PM — Pat is on push #14, exhausted and confused',
    caption: '9:51 PM. Pat has now denied 13 pushes in 4 minutes. Her grandchildren are asking what is wrong with her phone. She tries to put the phone face-down; it still vibrates audibly. She considers calling JNCB but it is 9:51 PM on a Sunday — the contact center is closed. The push prompt itself is the same five words every time: "Login attempt — Approve / Deny." There is no information about WHERE the login is coming from (St. Petersburg) or WHAT DEVICE (a Windows PC, when Pat exclusively uses an iPhone). Number-matching MFA — display a random 2-digit code that the customer must tap from a list — is not implemented. Pat has no way to verify; she just has a binary "approve / deny" with no context to reason against.',
    durationMs: 9000,
    messages: [
      { id: 'mf-m4-1', fromActor: 'jncb', toActor: 'pat', kind: 'sms', label: 'Push #14 · "Login attempt — Approve / Deny"',
        audio: { text: 'Push fourteen. Same prompt. No context.', profile: 'narrator' } },
      { id: 'mf-m4-2', fromActor: 'pat', toActor: 'jncb', kind: 'http', label: 'Deny',
        audio: { text: 'Deny.', profile: 'victim' } },
      { id: 'mf-m4-3', fromActor: 'pat', toActor: 'pat', kind: 'system', label: 'Phone face-down · still vibrating · grandchildren asking what\'s wrong' },
    ],
    revealedSignalIds: ['sig-no-number-matching', 'sig-no-login-context'],
  },

  /* Stage 5 — The compliance approval */
  {
    id: 'mfa-stage-5',
    label: 'The accidental approval',
    title: '9:55 PM — Pat taps Approve to make it stop',
    caption: '9:55:41 PM. Push #28. Pat picks up the phone, sees the prompt, and taps Approve — partly to make the buzzing stop, partly because she is now wondering if it is a legitimate alert from JNCB about her account that she should respond to. She is half-asleep, distracted, exhausted by 8 minutes of vibrating phone. The approval is a ~1.5-second cognitive event with no verification step — she just taps the green button. The attacker\'s login session in St. Petersburg completes; they are now in Pat\'s JNCB account. Pat does not know the difference between approving an attacker login and approving a legitimate login because the prompt does not tell her.',
    durationMs: 8000,
    messages: [
      { id: 'mf-m5-1', fromActor: 'jncb', toActor: 'pat', kind: 'sms', label: 'Push #28 · "Login attempt — Approve / Deny"',
        audio: { text: 'Push twenty-eight.', profile: 'system' } },
      { id: 'mf-m5-2', fromActor: 'pat', toActor: 'jncb', kind: 'http', label: 'Approve · 9:55:41 PM', suspicious: true,
        audio: { text: 'Approve. Just stop.', profile: 'victim' } },
      { id: 'mf-m5-3', fromActor: 'jncb', toActor: 'fraudster', kind: 'http', label: 'Login session granted · IP: St. Petersburg, RU', suspicious: true },
    ],
    revealedSignalIds: ['sig-foreign-login-session'],
  },

  /* Stage 6 — The transfer */
  {
    id: 'mfa-stage-6',
    label: 'Account drained',
    title: '9:56 PM — J$280K transferred in 90 seconds',
    caption: '9:55:48 PM the attacker is logged in. 9:56:12 PM they add a new beneficiary: "JNCB Trust Services" (a similarly-named NCB account opened 19 days ago by a recruited mule). 9:57:03 PM they initiate a J$280K transfer — Pat\'s entire balance minus J$4K. The transfer enters a pending queue. Velocity rules tied to recent MFA-fatigue patterns SHOULD hold this — 28 MFA requests in 9 minutes followed by a large transfer to a new beneficiary is a textbook fatigue-then-drain signature. The rules are not in place at JNCB as of the scenario date. The transfer clears at 9:58:30 PM. Funds disperse through the mule chain and are withdrawn from ABMs in Spanish Town overnight.',
    durationMs: 9000,
    messages: [
      { id: 'mf-m6-1', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Add beneficiary · "JNCB Trust Services" (19-day-old)', suspicious: true },
      { id: 'mf-m6-2', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'Transfer J$280K · pending', suspicious: true },
      { id: 'mf-m6-3', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Velocity check: 28-MFA-then-drain pattern · NOT modeled · cleared 9:58:30 PM', suspicious: true },
      { id: 'mf-m6-4', fromActor: 'jncb', toActor: 'mule', kind: 'http', label: 'J$280K credited to mule beneficiary' },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: [],
  },

  /* Stage 7 — Discovery and dispute */
  {
    id: 'mfa-stage-7',
    label: 'Monday morning',
    title: 'Pat tries to pay her cable bill',
    caption: 'Monday morning, 7:23 AM. Pat opens the JNCB app to pay her FLOW cable bill on the way to school. Balance: J$4,118 instead of the expected J$284K. She calls JNCB customer care at 8:00 AM when the line opens. The agent reviews the audit log: 28 push-MFA requests Sunday night between 9:47 PM and 9:56 PM, 27 denied, 1 approved at 9:55:41 PM, login from St. Petersburg, transfer of J$280K at 9:57 PM. Pat says she does not remember approving anything; she remembers tapping Deny 27 times and then "tapping the green button to make it stop." JNCB\'s position: the MFA approval is the customer\'s authorization. Pat\'s position: the bank designed an MFA system that allowed 28 push attempts in 9 minutes with no rate limit, no auto-lockout, no context display, and no number matching — and now blames her for not having infinite stamina. Both positions go to the bank\'s dispute committee.',
    durationMs: 14000,
    messages: [
      { id: 'mf-m7-1', fromActor: 'pat', toActor: 'jncb', kind: 'callback', label: '"My account is empty. I never authorized any transfer."',
        audio: { text: 'My account is empty. I never authorized any transfer.', profile: 'victim' } },
      { id: 'mf-m7-2', fromActor: 'jncb', toActor: 'pat', kind: 'callback', label: '"Audit log shows you approved the login at 9:55 PM."',
        audio: { text: 'The audit log shows you approved the login at nine fifty-five.', profile: 'investigator' } },
      { id: 'mf-m7-3', fromActor: 'pat', toActor: 'jncb', kind: 'callback', label: '"I tapped a button to stop my phone vibrating for 9 minutes."',
        audio: { text: 'I tapped a button to stop my phone vibrating for nine minutes.', profile: 'victim' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'Pat is not unique. MFA fatigue is a documented technique pattern (Microsoft Threat Intelligence reporting; Uber September 2022 breach; Cisco August 2022 breach) that targets any push-MFA system without rate-limiting, auto-lockout, context display, and number matching. The institutional fix is straightforward, well-documented, and has been deployed by major identity providers (Microsoft Authenticator added number-matching in 2023). Caribbean banks that deployed push-MFA without these defenses inherited the vulnerability along with the convenience. Until rate-limit + auto-lockout + number-matching + context display are standard, T1621 will continue to drain customer accounts whenever credential-stuffing produces valid username/password pairs — which it does, in 2026, at industrial scale. The customer cannot fix this. Only the bank\'s engineering can.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const MFA_FATIGUE_META = {
  techId: 'T1621',
  techName: 'MFA Request Generation',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-pat-jncb-mfa-fatigue',
  scenarioContext: 'Mrs. Patricia "Pat" Henriques, JNCB Personal Banking customer, primary-school teacher in Mandeville, age 47. Reuses passwords across sites; her JNCB password leaked in a December 2023 breach. The attacker has her password but needs to bypass JNCB\'s push-MFA. They bombard her phone with login-approval push notifications at 9:47 PM on a Sunday — when she is half-asleep, watching TV with grandchildren. After 28 ignored pushes she taps "approve" to make the notifications stop. Composite case grounded in documented Microsoft Threat Intelligence reporting on T1621, Uber September 2022 breach, Cisco August 2022 breach. Distinct character role from Allison Brown (mule SC007), Marcia Edwards (Structuring vendor F1087), Trevor Bennett (Structurer F1087), Beverly Williams (Phishing F1081), Devon Henry (Vishing F1088), Tanya Ricketts (SIM Swap T1451), Andre Lewis (Password Reset F1018.001), and Marcus Walters (3DS Bypass F1076 deferred).',
  totalDurationMs: 60000,
  stageCount: 7,
}


export default {
  meta: MFA_FATIGUE_META,
  engine: 'multi-actor-sequence',
  stages: MFA_FATIGUE_STAGES,
  controls: MFA_FATIGUE_CONTROLS,
  signals: MFA_FATIGUE_SIGNALS,
  actors: MFA_FATIGUE_ACTORS,
}
