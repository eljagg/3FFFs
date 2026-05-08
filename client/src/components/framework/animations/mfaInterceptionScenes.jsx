/**
 * mfaInterceptionScenes.jsx — v25.7.0.21
 *
 * Scene data for MFA Interception (T1111) — the final Phase 1
 * animation. Under Initial Access (TA0001). Uses
 * MultiActorSequenceAnimation engine.
 *
 * T1111 closes the Phase 1 MFA family:
 * - F1018.001 (Password Reset): bypasses MFA via reset flow
 * - T1621 (MFA Request Generation): bombs MFA approvals into fatigue
 * - T1111 (MFA Interception): captures the second-factor token in
 *   transit via mobile banking malware
 *
 * Composite case grounded in:
 * - Zimperium 2024 mobile banking trojan distribution report —
 *   documented Caribbean targeting by Cerberus, Anubis, Hydra,
 *   SharkBot families
 * - Group-IB 2025 mobile banking malware atlas — SMS-OTP
 *   forwarding is the dominant T1111 mechanism in regions where
 *   SMS remains the primary MFA delivery channel
 * - Bank of Jamaica 2024-2025 internet-banking fraud reporting —
 *   documented incident pattern matching this scenario shape
 *   though specific case files are non-public
 * - Caribbean side-loaded APK distribution culture — apps shared
 *   via WhatsApp links, unofficial app stores, and direct APK
 *   downloads create the exact malware-installation pathway
 *   T1111 needs. Documented in BOJ public communications on
 *   mobile fraud awareness 2024-2025.
 *
 * Scenario character: Mr. Ricardo Powell, age 41, sales rep at a
 * Kingston pharmaceutical distributor, NCB business banking
 * customer. Six weeks ago, a colleague forwarded him a WhatsApp
 * message: "great free PDF reader, try it." Ricardo installed
 * the side-loaded APK from the link. The app reads PDFs. It also
 * has SMS-read permission, runs a background service, and
 * forwards every incoming SMS to a C2 server in Bulgaria. Six
 * weeks of forwarded SMS data; the attacker has been waiting for
 * the right combination of (Ricardo's NCB password from a 2024
 * breach corpus) + (NCB's SMS OTP arrival).
 *
 * Distinct character role from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Marcus Walters [F1076 deferred]).
 *
 * Pedagogical insight (locked v25.7.0.21):
 *   MFA is only as secure as the channel that delivers the
 *   second factor. SMS as a delivery channel is structurally
 *   compromised in a world of mobile malware and side-loaded
 *   apps. The bank deployed MFA correctly. The attacker still
 *   got in.
 *
 *   The institutional fix is not "make customers more careful
 *   about app installs" — that is a customer-vigilance framing
 *   that has been demonstrated empirically not to scale. The
 *   institutional fix is to retire SMS as the second-factor
 *   delivery channel for high-stakes account access. Move to:
 *   (a) push-based MFA via the bank's own app, where the push
 *   token cannot be SMS-forwarded; (b) app-based authenticator
 *   codes (TOTP) that don't transit any SMS path; (c) FIDO2
 *   hardware tokens for high-value business accounts, where the
 *   second factor is a physical device that cannot be malware-
 *   intercepted.
 *
 *   For Caribbean banking trainers, the operational signal that
 *   points to T1111 specifically: customer reports unauthorized
 *   transactions; audit log shows a CORRECT OTP entered at
 *   login; customer confirms they received the OTP SMS but did
 *   NOT initiate the login. The OTP was correct because it was
 *   the bank's real OTP — the attacker received it via the
 *   customer's compromised phone. This is structurally different
 *   from phishing (where the customer entered the OTP somewhere
 *   they shouldn't have) and SIM swap (where the SIM itself was
 *   compromised at the telco level).
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered.
 *   The naive control "customers should only install apps from
 *   official app stores" is surfaced and explicitly countered:
 *   (a) Caribbean app-sharing culture is WhatsApp-driven, side-
 *   loading is normalized; (b) even Google Play has shipped
 *   banking trojans (documented 2023, 2024); (c) the customer
 *   cannot meaningfully audit what permissions an installed app
 *   uses in the background. Real defense is bank-side: retire
 *   SMS as MFA channel.
 */


/* ─── Actors: 5-actor multi-actor sequence ────────────────────── */
export const MFA_INTERCEPT_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Credential-stuffer + malware operator (Bulgaria C2)',
    initialState: 'active',
  },
  {
    id: 'ricardo',
    name: 'Mr. Ricardo Powell',
    role: 'NCB business customer · Kingston · pharma sales · age 41',
    initialState: 'unaware',
  },
  {
    id: 'phone',
    name: 'Ricardo\'s phone',
    role: 'Compromised by side-loaded APK · SMS forwarding active',
    initialState: 'compromised',
  },
  {
    id: 'ncb',
    name: 'NCB Jamaica',
    role: 'Bank · login + SMS OTP delivery + transfer systems',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'External cash-out',
    role: 'Mule beneficiaries · two business accounts · Spanish Town',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const MFA_INTERCEPT_CONTROLS = [
  {
    id: 'ctrl-retire-sms-otp',
    label: 'Retire SMS OTP for high-stakes auth — push-MFA or TOTP only',
    meta: 'Bank-side institutional fix: SMS as a second-factor delivery channel is structurally compromised in mobile-malware-prevalent environments. Replace SMS OTP with push notifications via the bank\'s own app (token cannot be SMS-forwarded by malware) OR with app-based authenticator codes (TOTP, generated locally on device, never transmitted). For high-value business accounts, layer FIDO2 hardware tokens. Defeats T1111 entirely because the second factor never transits a channel the malware can intercept. Caribbean rollout consideration: business customers are ready for push-MFA; some retail customers without smartphones still need a fallback channel — voice OTP via callback to registered phone is a reasonable fallback that defeats SMS-forwarding malware (the malware reads SMS, not call audio).',
    naive: false,
    revealsAtStages: [4, 5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'login attempts',
  },
  {
    id: 'ctrl-impossible-travel-block',
    label: 'Block (not just flag) impossible-travel logins',
    meta: 'Login from a foreign IP geolocating outside Ricardo\'s normal radius (Kingston metro), within hours of his last known Jamaica session, must be HARD-BLOCKED, not flagged. Many Caribbean banks raise an anomaly score on impossible-travel logins but allow them to proceed if the OTP is correct. T1111 attackers always provide the correct OTP (they have it via the malware), so OTP-passes-therefore-allow defeats this control. Hard block requires step-up authentication via a different channel (e.g. callback to the registered branch banker) before the login completes. Defeats T1111 by requiring an out-of-band human verification the malware cannot intercept.',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'foreign-IP logins',
  },
  {
    id: 'ctrl-mobile-malware-detection',
    label: 'In-app mobile malware screening on bank\'s own app',
    meta: 'The NCB mobile app, on launch, scans the device for known banking-malware signatures (SafetyNet/Play Integrity APIs on Android, equivalent on iOS), checks for installed apps with SMS-read permission that are NOT major messaging clients, and refuses to authenticate if the device is compromised. Does NOT defeat T1111 against customers who use online banking via web browser (the bank\'s app isn\'t involved), but reduces exposure for the mobile-app-only customer segment. Implementation requires API-level integrity attestation; available on modern Android/iOS, not always wired into Caribbean banking apps as of 2026.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'compromised devices',
  },
  {
    id: 'ctrl-naive-app-store-only',
    label: 'Customers should only install apps from official app stores',
    meta: 'Treats T1111 as a customer-vigilance problem about app installation hygiene. Customer-education campaigns advise: "only install apps from Google Play / Apple App Store; don\'t click APK links from WhatsApp." Doesn\'t work for three structural reasons: (a) Caribbean app-sharing culture is WhatsApp-driven; side-loading is normalized for legitimate apps too (cracked games, region-locked apps, free PDF readers like Ricardo\'s). The cultural norm is the attack surface. (b) Even Google Play has shipped banking trojans — documented 2023 (Joker family) and 2024 (Anatsa family). "Official store" is not a binary safe/unsafe; it is a probabilistically-better source. (c) The customer cannot meaningfully audit what permissions an installed app uses in the background. Ricardo gave SMS-read permission to the PDF reader at install time because the prompt said "this app needs to read SMS to verify you" and most app permission prompts are dismissed without reading. Real defense is bank-side: retire SMS as MFA channel.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Treats T1111 as a customer-hygiene problem. Even when customers do exactly the right thing (install only from Play Store), they remain exposed because malware ships through Play. The bank chose SMS as the OTP delivery channel knowing the channel\'s limitations. The customer cannot fix the channel; only the bank can replace it.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const MFA_INTERCEPT_SIGNALS = [
  {
    id: 'sig-malware-installation',
    label: 'PDF reader app has SMS-read + background service permissions',
    description: 'The "free PDF reader" Ricardo installed 6 weeks ago — package name `com.pdfviewer.lite` — has SMS-read permission, RECEIVE_SMS broadcast receiver, BIND_NOTIFICATION_LISTENER permission, and a foreground service that runs continuously. None of these are required for displaying PDFs. The app forwards every incoming SMS to a C2 server at a Bulgarian residential IP. Mobile-malware-detection control catches this on next NCB app launch — unless Ricardo never opens the NCB app and uses online banking only via web browser, in which case the bank\'s mobile app screening never runs.',
    revealedBy: 'ctrl-mobile-malware-detection',
  },
  {
    id: 'sig-correct-otp-entered',
    label: 'Login OTP was the bank\'s real OTP — not phished, not guessed',
    description: 'NCB\'s audit log shows: Ricardo\'s correct password entered (sourced from a 2024 LinkedIn-adjacent breach corpus), then the system-generated SMS OTP "847291" sent to Ricardo\'s registered phone, then "847291" entered at the login form 11 seconds later, then login granted. The OTP was the bank\'s real OTP. This is structurally different from phishing (customer entered OTP into a fake page) and SIM swap (SIM compromised at telco). The diagnostic signature: customer received the SMS, the OTP was correct, the customer did NOT initiate the login. The phone forwarded the OTP to the attacker before — or simultaneously with — Ricardo seeing it.',
    revealedBy: 'ctrl-retire-sms-otp',
  },
  {
    id: 'sig-no-customer-initiated-session',
    label: 'Ricardo did not initiate any login at 7:14 AM',
    description: 'Ricardo\'s interview confirms: at 7:14 AM Tuesday morning he was driving from Mandeville to a client visit in Old Harbour, not anywhere near a computer. He recalls his phone buzzing with what he thought was an NCB notification but did not check it because he was driving. The login session that consumed the OTP originated from a residential IP geolocating to St. Petersburg, Russia. Customer location: Jamaica, on a highway. Login session location: Russia. The two cannot both be Ricardo.',
    revealedBy: 'ctrl-retire-sms-otp',
  },
  {
    id: 'sig-foreign-ip-blocked-by-policy',
    label: 'NCB has impossible-travel detection — flag-only, not block',
    description: 'NCB\'s anomaly scoring system raised the impossible-travel score to "high" on the 7:14 AM login attempt. The policy ACTION on a high score is "log for fraud team review" — not block. The login proceeded because the OTP was correct, regardless of the anomaly score. T1111 attackers always have the correct OTP (that is the technique\'s defining feature), so OTP-passes-therefore-allow defeats every anomaly-based control that runs in flag-only mode. Hard-block-on-impossible-travel would have caught this; the bank chose flag-only to avoid customer friction.',
    revealedBy: 'ctrl-impossible-travel-block',
  },
  {
    id: 'sig-rapid-transfer-to-mule',
    label: 'J$1.4M transferred 3 minutes after login — to two mule accounts',
    description: 'Login at 7:14 AM. Add new beneficiary "Hibiscus Imports Ltd" at 7:15 AM. Transfer J$800K to that beneficiary at 7:16 AM. Add second new beneficiary "Sunrise Trading Services" at 7:17 AM. Transfer J$600K at 7:18 AM. Total drain: J$1.4M in 4 minutes. Both recipient accounts opened within the past 21 days; both registered to mule operators in Spanish Town with no prior business history. Velocity rules tied to "new beneficiary + large transfer + recent foreign-IP login" would have held this; NCB has the rule on consumer accounts but not on business accounts as of the scenario date — business accounts are presumed-legitimate by default.',
    revealedBy: 'ctrl-impossible-travel-block',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const MFA_INTERCEPT_STAGES = [
  /* Stage 1 — The malware install (6 weeks earlier) */
  {
    id: 'mi-stage-1',
    label: 'The install',
    title: '6 weeks ago — "free PDF reader, try it"',
    caption: 'Six weeks before the attack. Ricardo gets a WhatsApp from a colleague: "found this great free PDF reader — try it, much better than the default one." A direct APK download link. Ricardo taps it, accepts the unknown-sources warning Android shows, installs the app. The install prompt asks for several permissions including SMS read, notification access, and background service. Ricardo dismisses the permission prompts without reading them — a habit that 70%+ of mobile users share. The app works fine for PDFs. It also runs a foreground service that forwards every incoming SMS to a C2 server at a Bulgarian residential IP. Six weeks of forwarded SMS data accumulates at the C2.',
    durationMs: 8000,
    messages: [
      { id: 'mi-m1-1', fromActor: 'fraudster', toActor: 'ricardo', kind: 'sms', label: 'WhatsApp from colleague: "great PDF reader — try it"',
        audio: { text: 'WhatsApp message. Free PDF reader. Try it.', profile: 'narrator' } },
      { id: 'mi-m1-2', fromActor: 'ricardo', toActor: 'phone', kind: 'http', label: 'Install side-loaded APK · accept SMS permission' },
      { id: 'mi-m1-3', fromActor: 'phone', toActor: 'fraudster', kind: 'http', label: 'C2 connection established · SMS forwarding live (Bulgaria)', suspicious: true,
        audio: { text: 'C2 connection live. SMS forwarding active.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Credential acquisition */
  {
    id: 'mi-stage-2',
    label: 'Credential acquisition',
    title: 'Ricardo\'s NCB password is in the 2024 breach corpus',
    caption: 'Day 0 of the attack. The fraudster crew acquires a credential-stuffing list — 8,000 leaked email/password pairs targeting Caribbean business customers. Ricardo\'s entry: ricardo.powell.pharma@gmail.com / Ricardo2018!. Same password he used on a non-bank site that breached in late 2024. The crew correlates the credential list against their compromised-phone roster (the SMS-forwarding malware installation registry); Ricardo\'s phone is on both lists. Credentials + compromised phone = the right combination for T1111. Schedule the attack for early morning Tuesday — when business customers are commuting and not at desks.',
    durationMs: 7000,
    messages: [
      { id: 'mi-m2-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Correlate credentials with compromised-phone roster · Ricardo matches',
        audio: { text: 'Credentials match. Phone is compromised.', profile: 'fraudster' } },
      { id: 'mi-m2-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Schedule attack · Tuesday 7:14 AM · commute window',
        audio: { text: 'Tuesday morning. Commute window. Schedule it.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — The login attempt */
  {
    id: 'mi-stage-3',
    label: 'Login attempt',
    title: '7:14 AM Tuesday — login from St. Petersburg',
    caption: '7:14 AM Tuesday. Ricardo is driving from Mandeville to a client visit in Old Harbour — radio on, focused on the road. The fraudster crew, operating from a residential IP in St. Petersburg, opens NCB\'s online banking login page and submits Ricardo\'s credentials. NCB validates the password (correct) and issues an SMS OTP to Ricardo\'s registered phone number. The OTP "847291" is sent. NCB\'s anomaly scoring system raises the impossible-travel score to high — but the policy action is "log for review," not "block."',
    durationMs: 7500,
    messages: [
      { id: 'mi-m3-1', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'POST /login · ricardo.powell.pharma · password OK · IP: St. Petersburg, RU', suspicious: true },
      { id: 'mi-m3-2', fromActor: 'ncb', toActor: 'ncb', kind: 'system', label: 'Anomaly score: HIGH · action: log only · NOT blocked', suspicious: true },
      { id: 'mi-m3-3', fromActor: 'ncb', toActor: 'phone', kind: 'sms', label: 'SMS OTP: "Your NCB code is 847291"',
        audio: { text: 'NCB. Your code is eight four seven two nine one.', profile: 'system' } },
    ],
    actorStateChanges: { 'ncb': 'active' },
    revealedSignalIds: [],
  },

  /* Stage 4 — The OTP intercept */
  {
    id: 'mi-stage-4',
    label: 'OTP forwarded',
    title: 'Phone forwards OTP to attacker before Ricardo sees it',
    caption: 'The SMS arrives on Ricardo\'s phone. The PDF reader\'s foreground service receives the SMS broadcast (it has READ_SMS permission), forwards a copy to the C2 server in Bulgaria, and lets the SMS proceed to Ricardo\'s default messaging app. The whole forward takes 700 milliseconds. The attacker in St. Petersburg receives the OTP "847291" before Ricardo unlocks his phone. Ricardo, still driving, hears his phone buzz once but does not check it — he\'ll look at it at the client site. The malware does not hide the SMS; it just gets there first. By the time Ricardo opens his phone an hour later, the attacker is long done.',
    durationMs: 8000,
    messages: [
      { id: 'mi-m4-1', fromActor: 'phone', toActor: 'fraudster', kind: 'http', label: 'OTP "847291" forwarded to C2 (700ms)', suspicious: true,
        audio: { text: 'OTP forwarded to Bulgaria. Seven hundred milliseconds.', profile: 'narrator' } },
      { id: 'mi-m4-2', fromActor: 'phone', toActor: 'ricardo', kind: 'sms', label: 'SMS visible in messaging app · Ricardo driving · doesn\'t check',
        audio: { text: 'Phone buzzes. Ricardo is driving. Will check later.', profile: 'narrator' } },
    ],
    revealedSignalIds: ['sig-malware-installation', 'sig-correct-otp-entered'],
  },

  /* Stage 5 — Login completes + transfer */
  {
    id: 'mi-stage-5',
    label: 'Login + drain',
    title: '7:15-7:18 AM — J$1.4M out in 4 minutes',
    caption: 'The attacker enters "847291" into NCB\'s OTP field at 7:15 AM. The OTP is the real OTP — NCB\'s system validates it correctly. Login granted. The session is now fully authenticated despite originating from St. Petersburg, despite the impossible-travel anomaly score, because OTP-passes-therefore-allow is the default policy. 7:15 AM: add new beneficiary "Hibiscus Imports Ltd" (mule account opened 18 days ago in Spanish Town). 7:16 AM: transfer J$800K. 7:17 AM: add second beneficiary "Sunrise Trading Services" (mule, 21 days old). 7:18 AM: transfer J$600K. Total drain: J$1.4M in 4 minutes. Velocity rules for new-beneficiary-plus-large-transfer-plus-foreign-IP exist on NCB consumer accounts; business accounts are presumed-legitimate by default and have weaker velocity rules. The transfers clear within 2 minutes.',
    durationMs: 9000,
    messages: [
      { id: 'mi-m5-1', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'OTP 847291 entered · login granted', suspicious: true,
        audio: { text: 'OTP entered. Login granted.', profile: 'fraudster' } },
      { id: 'mi-m5-2', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'Add beneficiary "Hibiscus Imports" · Transfer J$800K', suspicious: true },
      { id: 'mi-m5-3', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'Add beneficiary "Sunrise Trading" · Transfer J$600K', suspicious: true },
      { id: 'mi-m5-4', fromActor: 'ncb', toActor: 'mule', kind: 'http', label: 'J$1.4M cleared · 7:18 AM',
        audio: { text: 'One point four million cleared. Four minutes.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: ['sig-no-customer-initiated-session', 'sig-foreign-ip-blocked-by-policy', 'sig-rapid-transfer-to-mule'],
  },

  /* Stage 6 — Discovery */
  {
    id: 'mi-stage-6',
    label: 'Discovery',
    title: '11:40 AM — Ricardo finally checks his phone',
    caption: 'Ricardo arrives at the client visit in Old Harbour at 8:30 AM, conducts his sales meeting, leaves at 11:15 AM. At 11:40 AM, sitting in his car before driving to the next client, he checks his phone messages. The SMS from NCB is there: "Your NCB code is 847291." Below it: a transaction notification from NCB at 7:18 AM: "Transfer of J$800,000 to Hibiscus Imports Ltd completed." Then another: "Transfer of J$600,000 to Sunrise Trading Services completed." Ricardo did not authorize either. He calls NCB customer care immediately. The agent confirms: login at 7:14 AM from a Russian IP, OTP entered correctly, transfers initiated to two new beneficiaries. Ricardo says he was driving at 7:14 AM, never opened the NCB app, never entered any OTP, and has never heard of either recipient.',
    durationMs: 11000,
    messages: [
      { id: 'mi-m6-1', fromActor: 'ricardo', toActor: 'phone', kind: 'system', label: '11:40 AM · check phone · see NCB OTP and 2 transfer notifications',
        audio: { text: 'Eleven forty. Check phone. Two transfers I never authorized.', profile: 'victimMale' } },
      { id: 'mi-m6-2', fromActor: 'ricardo', toActor: 'ncb', kind: 'callback', label: '"My phone shows transfers I did not authorize."',
        audio: { text: 'My phone shows transfers I did not authorize.', profile: 'victimMale' } },
      { id: 'mi-m6-3', fromActor: 'ncb', toActor: 'ricardo', kind: 'callback', label: '"Login from Russia at 7:14 AM, OTP entered correctly."',
        audio: { text: 'Login from Russia. O T P entered correctly.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 7 — Phase 1 closes */
  {
    id: 'mi-stage-7',
    label: 'Phase 1 closes',
    title: 'The Initial Access landscape, complete',
    caption: 'NCB\'s fraud team forensically examines Ricardo\'s phone: the "free PDF reader" is identified as a SharkBot variant, a known mobile banking trojan family. Ricardo did not realize the app was malicious; the customer-education materials he had read said "only install from official app stores," which he had largely complied with except for this one WhatsApp-shared APK. The institutional fix is not more customer education; the fix is to retire SMS as NCB\'s second-factor channel for business accounts. NCB accelerates the push-MFA rollout for business customers (already on the roadmap, deferred) and opens an incident review of T1111 exposure across the business banking customer base. T1111 closes the Phase 1 Initial Access landscape: F1081 Phishing, F1088 Vishing, T1451 SIM Swap, F1018.001 Password Reset, T1621 MFA Fatigue, F1072 Insider Access, F1018 ATO parent triage, and now T1111 MFA Interception. Eight techniques covering the full kill-chain entry surface for Caribbean banking fraud.',
    durationMs: 11000,
    messages: [
      { id: 'mi-m7-1', fromActor: 'ncb', toActor: 'ncb', kind: 'system', label: 'Forensics: SharkBot variant · accelerate push-MFA rollout',
        audio: { text: 'SharkBot variant. Accelerate push M F A rollout.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'MFA is only as secure as the channel that delivers the second factor. The bank deployed MFA correctly. The attacker still got in because SMS — the most common second-factor delivery channel in Caribbean banking — is structurally compromised in a world of mobile banking trojans and side-loaded APKs. The institutional fix is not more customer education about app installation hygiene; that has been demonstrated empirically not to scale, and even Google Play has shipped banking trojans. The institutional fix is to retire SMS as the second-factor delivery channel for high-stakes account access — push-based MFA via the bank\'s own app for retail customers, app-based authenticator codes (TOTP) as a smartphone-friendly alternative, FIDO2 hardware tokens for high-value business accounts, and voice OTP via callback as a fallback for customers without smartphones. T1111 closes the Phase 1 Initial Access landscape. Eight techniques shipped: Phishing, Vishing, SIM Swap, Password Reset, MFA Fatigue, Insider Access, ATO parent triage, MFA Interception. The pedagogical surface for Caribbean banking fraud trainees on the entry-to-account techniques is now substantially complete; Phase 2 (Positioning, Execution, Monetization) follows.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const MFA_INTERCEPT_META = {
  techId: 'T1111',
  techName: 'MFA Interception',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-ricardo-ncb-mfa-intercept',
  scenarioContext: 'Mr. Ricardo Powell, NCB business banking customer, age 41, sales rep at a Kingston pharmaceutical distributor. Six weeks before the attack, he installed a side-loaded "free PDF reader" APK from a WhatsApp-shared link a colleague forwarded. The app reads PDFs and also has SMS-read permission, runs a foreground service, and forwards every incoming SMS to a C2 server in Bulgaria (a SharkBot variant, a documented mobile banking trojan family). On Tuesday morning at 7:14 AM, while Ricardo is driving from Mandeville to a client visit in Old Harbour, the fraudster crew (using credentials from a 2024 breach corpus) initiates a login to NCB online banking from a residential IP in St. Petersburg. NCB sends the SMS OTP to Ricardo\'s registered phone. The malware forwards the OTP to the C2 in 700ms; the attacker enters it; login completes. J$1.4M out across two transfers to mule accounts in Spanish Town within 4 minutes. Ricardo discovers the loss at 11:40 AM when he finally checks his phone after the client meeting. Composite case grounded in Zimperium 2024 mobile banking trojan distribution report (Caribbean targeting by Cerberus, Anubis, Hydra, SharkBot families), Group-IB 2025 mobile banking malware atlas, and BOJ 2024-2025 internet-banking fraud reporting. Distinct character role from all prior animation characters. T1111 closes the Phase 1 Initial Access animation set.',
  totalDurationMs: 61500,
  stageCount: 7,
}


export default {
  meta: MFA_INTERCEPT_META,
  engine: 'multi-actor-sequence',
  stages: MFA_INTERCEPT_STAGES,
  controls: MFA_INTERCEPT_CONTROLS,
  signals: MFA_INTERCEPT_SIGNALS,
  actors: MFA_INTERCEPT_ACTORS,
}
