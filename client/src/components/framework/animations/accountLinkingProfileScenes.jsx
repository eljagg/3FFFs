/**
 * accountLinkingProfileScenes.jsx — v25.7.0.29.1
 *
 * Scene data for Account Linking: Linked Profile Add (F1007.002) —
 * second F1007 sub-technique under Positioning (FA0001). Uses
 * MultiActorSequenceAnimation engine.
 *
 * v25.7.0.29.1 hotfix: rewrites the scene file to match the
 * MultiActorSequenceAnimation engine contract.
 *
 * F1007.002 is the digital-channel-native case of Account Linking.
 * After session compromise via SIM-swap, vishing-driven recovery
 * flow, or push-MFA fatigue, the adversary uses the customer's
 * own mobile banking app to register a SECONDARY profile on the
 * account — their own device, their own biometric, their own
 * recovery email — establishing a parallel authentication path
 * that survives any password reset. Critically, the bank's
 * "Active Devices" list typically does not surface secondary-
 * profile devices the same way it surfaces primary-profile
 * devices, so the persistence is invisible to the customer's
 * normal hygiene.
 *
 * Composite case grounded in:
 * - Caribbean digital banking platform documentation (linked-
 *   profile / secondary-profile / household-profile features
 *   at Republic Bank, RBC, NCB, JNCB, Sagicor 2023-2025)
 * - Public industry reporting on SIM-swap-enabled session
 *   takeover (Caribbean and US case patterns 2022-2025) followed
 *   by in-session profile manipulation as persistence
 * - FFIEC and ABA published guidance on out-of-band step-up
 *   authentication for security-sensitive in-session changes
 *
 * Scenario character: Mr. Tariq Mohammed, age 33, Republic Bank
 * Trinidad customer, freelance graphic designer in Port of Spain,
 * 8-year customer. SIM-swap compromise upstream — adversary
 * social-engineered Tariq's mobile carrier into porting his
 * number, intercepted Republic Bank recovery SMS, completed
 * recovery flow. Republic Bank is the FIRST Trinidad-based
 * institution represented in animations.
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Persistence outlives credentials. For F1007.002 specifically,
 *   the persistence lives in surfaces the customer doesn't know
 *   to inspect. Active Devices UI parity between primary and
 *   secondary profiles is the diagnostic protocol fix; out-of-
 *   band step-up authentication on secondary-profile creation
 *   is the institutional control point.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'SIM-swap session takeover · authenticated as Tariq via recovery flow · in-session persistence',
    initialState: 'active',
  },
  {
    id: 'tariq',
    name: 'Mr. Tariq Mohammed',
    role: 'Republic Bank Trinidad customer · graphic designer · Port of Spain · age 33',
    initialState: 'unaware',
  },
  {
    id: 'republic',
    name: 'Republic Bank',
    role: 'Issuer · mobile banking platform · device registration · transaction monitoring',
    initialState: 'silent',
  },
  {
    id: 'secondary',
    name: 'Secondary Device',
    role: 'Adversary-controlled device · about to be registered as Tariq\'s "secondary profile"',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_CONTROLS = [
  {
    id: 'ctrl-stepup-auth-on-profile-add',
    label: 'Out-of-band step-up authentication on secondary profile / device registration',
    meta: 'Registration flow: any "Add Secondary Profile" / "Register Additional Device" action triggers step-up authentication via a channel independent of the current session — typically an SMS to the registered phone of file (NOT the current session\'s authenticated phone, which post-SIM-swap is the adversary\'s) or an email to a registered email of file (which the adversary may not have compromised). The step-up requires the customer to confirm the new profile via OTP or by tapping an in-app push on the EXISTING primary device. Catches F1007.002 at Stage 4 before any provisioning happens. Implementation cost: marginal — adds 30-60 seconds to legitimate first-time registrations. Defeats the entire F1007.002 attack pattern unless the adversary has compromised email AND existing primary device — much higher bar than session-level compromise.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'secondary profile registrations',
  },
  {
    id: 'ctrl-active-devices-parity',
    label: 'Active Devices UI parity: primary + secondary profile devices listed with equal prominence',
    meta: 'Mobile/web UI: the "Active Devices" / "Sessions" / "Connected Devices" page surfaces ALL devices with active credentials on the account — primary profile, secondary profile, household profile, biometric registrations, browser sessions — with consistent labelling and equal visual prominence. The customer\'s ability to identify "what does not belong" is gated on the UI showing it. Catches F1007.002 at Stage 7 when Tariq responds to a "new device" alert by checking active devices — and IS now able to see the adversary\'s secondary device. Without this control the secondary profile is invisible to the audit and persistence survives indefinitely. Implementation cost: marginal UI work. Critical complement to the step-up control.',
    naive: false,
    revealsAtStages: [7],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'customer audit moments',
  },
  {
    id: 'ctrl-notification-to-primary-contacts',
    label: 'Notification (SMS + email) to PRIMARY profile contacts on secondary profile add',
    meta: 'Issuer-side: any secondary-profile / additional-device registration triggers immediate notification to the PRIMARY profile\'s registered SMS AND email — both — with a 1-tap "Not me" button. Notification routing is critical: post-SIM-swap, the adversary controls the primary profile\'s registered phone, so SMS may reach the adversary not the customer. Email registered on the primary profile that has not been compromised remains an effective channel. Best-effort detection control: surfaces the persistence at Stage 4 (the moment the secondary profile is added) instead of Stage 7+. Implementation cost: marginal. Should be paired with step-up control above.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'customer awareness moments',
  },
]


/* ─── Detection signals ──────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_SIGNALS = [
  {
    id: 'sig-recovery-flow-from-new-ip',
    label: 'Account recovery flow completed from a new IP / new device, immediately followed by in-session profile changes',
    description: 'Republic Bank\'s recovery-flow audit shows completion from an IP that has never authenticated for Tariq before, followed within minutes by a Profile → Linked Profiles → Add Secondary Profile sequence. Either event in isolation would not flag (legitimate recoveries happen, legitimate profile-adds happen); the combination — recovery + immediate profile change — is the F1007.002 signature. The step-up control would have blocked the second event at Stage 4 by routing through a channel the adversary cannot reach.',
    revealedBy: 'ctrl-stepup-auth-on-profile-add',
  },
  {
    id: 'sig-secondary-profile-no-stepup',
    label: 'Secondary profile registered without out-of-band step-up authentication',
    description: 'The registration flow accepted the new device + biometric on the strength of the current session\'s credentials alone. No SMS to the registered phone of file. No email to the registered email of file. No push to the existing primary device. The flow is designed for legitimate household use and assumed the current session belongs to the customer; that assumption fails when the current session is a recovered session post-SIM-swap. The step-up control closes this gap.',
    revealedBy: 'ctrl-stepup-auth-on-profile-add',
  },
  {
    id: 'sig-secondary-profile-different-fingerprint',
    label: 'Secondary profile device fingerprint differs from primary in OS, model, locale, timezone',
    description: 'Tariq\'s primary device is an Android phone, locale en-TT, timezone America/Port_of_Spain. The secondary profile registers from an iOS device, locale en-US, timezone Europe/Lagos. Atypical for a single-customer multi-device pattern (legitimate household additions tend to share locale/timezone with the primary). The active-devices parity control surfaces this at Stage 7 by listing the secondary device alongside the primary with full fingerprint metadata.',
    revealedBy: 'ctrl-active-devices-parity',
  },
  {
    id: 'sig-no-notification-on-primary-email',
    label: 'Secondary profile add not surfaced via primary-profile registered email',
    description: 'Republic Bank\'s flow dispatches SMS-only on secondary-profile registration. The SMS goes to the registered phone — which post-SIM-swap is now adversary-controlled. Tariq does not receive any notification of the new profile during the compromise window. The notification-to-primary-contacts control would have routed an alert to his registered email AND SMS, with the email remaining intact even when the SIM is compromised.',
    revealedBy: 'ctrl-notification-to-primary-contacts',
  },
  {
    id: 'sig-secondary-profile-resumes-after-reset',
    label: 'After password reset on primary, secondary profile authenticates successfully and transacts',
    description: 'Tariq resets his primary password at Stage 7, disables the visible recovered-session device, believes the compromise is cleaned. At Stage 9 the secondary profile authenticates with biometric on the adversary\'s device — the password reset on the primary did not affect secondary credentials. Transactions proceed. This is the diagnostic signature that distinguishes F1007.002 from a recoverable session compromise: the persistence is registration-shaped, not credential-shaped.',
    revealedBy: 'ctrl-active-devices-parity',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_STAGES = [
  /* Stage 1 — SIM-swap aftermath */
  {
    id: 'al-profile-stage-1',
    label: 'SIM-swap aftermath',
    title: 'Yesterday morning — Tariq\'s SIM ported · adversary in active session',
    caption: 'Yesterday morning, Tariq\'s mobile number was social-engineered out of his Trinidadian carrier and ported to a SIM card the adversary controls. Tariq has not yet realized — he travels for a graphic-design conference and his phone has been "no signal" all day, which he attributes to roaming issues. The adversary used the SIM-swap window to intercept Republic Bank\'s recovery-flow OTP and is now in an authenticated session on Tariq\'s primary profile.',
    durationMs: 7500,
    messages: [
      { id: 'al-profile-m1-1', fromActor: 'adversary', toActor: 'republic', kind: 'http',
        label: 'Recovery flow completed · session active · Tariq\'s primary profile authenticated', suspicious: true,
        audio: { text: 'SIM swap. Recovery flow. Session active on Tariq\'s primary profile.', profile: 'narrator' } },
      { id: 'al-profile-m1-2', fromActor: 'tariq', toActor: 'tariq', kind: 'system',
        label: 'At conference · phone no signal · attributes to roaming · unaware' },
    ],
    actorStateChanges: { 'republic': 'silent' },
    revealedSignalIds: [],
  },

  /* Stage 2 — Plan: secondary profile, not direct drain */
  {
    id: 'al-profile-stage-2',
    label: 'Plan: persistence first',
    title: 'The adversary plans secondary profile registration',
    caption: 'The adversary considers direct authentication-and-drain. They reject this. The session is from a new IP; high-value transfers will pull a manual review and Tariq will eventually notice the SIM-swap and reset credentials. Instead they plan persistence: register a secondary profile on Tariq\'s account using their own device and biometric, then exit the recovered session. When Tariq inevitably resets his credentials in response to noticing the SIM-swap, the secondary profile remains intact. Wait three weeks for the post-reset anomaly window to fade, then exfil through the secondary profile.',
    durationMs: 7000,
    messages: [
      { id: 'al-profile-m2-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Reject direct drain · session-level compromise will be reset',
        audio: { text: 'Direct drain rejected. Session will be reset.', profile: 'fraudster' } },
      { id: 'al-profile-m2-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Plan: secondary profile · own device · own biometric · 3-week dormancy',
        audio: { text: 'Secondary profile. Own device. Biometric. Wait three weeks.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — Navigate Profile → Linked Profiles → Add Secondary */
  {
    id: 'al-profile-stage-3',
    label: 'Navigate registration',
    title: 'Adversary navigates to "Add Secondary Profile" in Tariq\'s session',
    caption: 'In Tariq\'s active mobile banking session, the adversary navigates: Profile → Linked Profiles → Add Secondary Profile. Republic Bank\'s flow is designed for legitimate household use (couples, small-business co-owners). The flow asks for a name for the new profile, a registration code sent to the new device, and biometric enrollment on the new device. No out-of-band step-up to Tariq\'s registered email or push to his existing primary device is required.',
    durationMs: 8000,
    messages: [
      { id: 'al-profile-m3-1', fromActor: 'adversary', toActor: 'republic', kind: 'http',
        label: 'GET /profile/linked-profiles/add-secondary · Tariq\'s session' },
      { id: 'al-profile-m3-2', fromActor: 'republic', toActor: 'adversary', kind: 'http',
        label: 'Renders secondary-profile registration flow · no step-up gate', suspicious: true },
      { id: 'al-profile-m3-3', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'No out-of-band verification required · proceeding',
        audio: { text: 'No step-up. Proceeding to register adversary device.', profile: 'fraudster' } },
    ],
    revealedSignalIds: ['sig-recovery-flow-from-new-ip'],
  },

  /* Stage 4 — Secondary profile + device + biometric registered */
  {
    id: 'al-profile-stage-4',
    label: 'Secondary registered',
    title: 'Secondary profile "Tariq M (work)" provisioned · biometric enrolled · adversary device',
    caption: 'The adversary completes the flow: names the secondary profile "Tariq M (work)," registers their own device, enrolls their own fingerprint as the biometric. Republic Bank issues credentials for the secondary profile bound to the adversary\'s device. The secondary profile is now an independent authentication path: distinct username, distinct device fingerprint, distinct biometric. SMS notification dispatches — to Tariq\'s now-adversary-controlled SIM. No email notification (Republic Bank\'s flow does SMS-only on this surface). The step-up control would have routed the confirmation through Tariq\'s registered email instead of (or in addition to) the SIM, blocking provisioning until verified through a channel the adversary does not control.',
    durationMs: 10000,
    messages: [
      { id: 'al-profile-m4-1', fromActor: 'adversary', toActor: 'republic', kind: 'http',
        label: 'POST /profile/linked-profiles · name: "Tariq M (work)" · adversary device fingerprint', suspicious: true },
      { id: 'al-profile-m4-2', fromActor: 'republic', toActor: 'secondary', kind: 'system',
        label: 'Provisions secondary profile · biometric enrolled on adversary device',
        audio: { text: 'Secondary profile provisioned. Biometric on adversary device.', profile: 'narrator' } },
      { id: 'al-profile-m4-3', fromActor: 'republic', toActor: 'tariq', kind: 'sms',
        label: 'SMS notification to registered phone · phone is SIM-swapped · adversary receives', suspicious: true,
        audio: { text: 'SMS goes to compromised SIM. Tariq does not see it.', profile: 'narrator' } },
      { id: 'al-profile-m4-4', fromActor: 'republic', toActor: 'tariq', kind: 'system',
        label: 'No email dispatch · primary email never receives notification' },
    ],
    actorStateChanges: { 'republic': 'recording', 'secondary': 'active' },
    revealedSignalIds: ['sig-secondary-profile-no-stepup', 'sig-secondary-profile-different-fingerprint', 'sig-no-notification-on-primary-email'],
  },

  /* Stage 5 — Adversary exits */
  {
    id: 'al-profile-stage-5',
    label: 'Exit primary',
    title: 'Adversary logs out of Tariq\'s primary profile · keeps secondary authenticated',
    caption: 'The adversary logs out of Tariq\'s primary profile session and ends the recovery-flow context. They keep the secondary profile authenticated on their own device. From Republic Bank\'s telemetry: the recovered session ended cleanly, no transactions occurred, no high-risk actions outside profile-management. Risk score on the recovery flow is "low concern."',
    durationMs: 6500,
    messages: [
      { id: 'al-profile-m5-1', fromActor: 'adversary', toActor: 'republic', kind: 'http',
        label: 'Logout · primary profile session ended · secondary profile still authenticated' },
      { id: 'al-profile-m5-2', fromActor: 'republic', toActor: 'republic', kind: 'system',
        label: 'Recovery session closed cleanly · no transactional activity · risk score low' },
    ],
    actorStateChanges: { 'adversary': 'dormant' },
    revealedSignalIds: [],
  },

  /* Stage 6 — Tariq's SIM restored · sees suspicious emails */
  {
    id: 'al-profile-stage-6',
    label: 'SIM restored',
    title: 'Day 5 — Tariq\'s SIM restored · sees delayed Republic Bank emails',
    caption: 'Tariq returns home, calls his carrier, gets the SIM-swap reversed (5 days after the original swap). He finds delayed Republic Bank "new device login" emails in his inbox referencing the recovery-flow session. He logs into his primary profile to investigate.',
    durationMs: 7500,
    messages: [
      { id: 'al-profile-m6-1', fromActor: 'tariq', toActor: 'tariq', kind: 'system',
        label: 'SIM restored · sees Republic Bank emails about unusual login · alarmed',
        audio: { text: 'SIM restored. Login alerts in inbox. Alarmed.', profile: 'victimMale' } },
      { id: 'al-profile-m6-2', fromActor: 'tariq', toActor: 'republic', kind: 'http',
        label: 'Login on primary profile · investigating' },
    ],
    actorStateChanges: { 'tariq': 'reacting' },
    revealedSignalIds: [],
  },

  /* Stage 7 — Tariq resets password + disables visible device */
  {
    id: 'al-profile-stage-7',
    label: 'Reset · partial cleanup',
    title: 'Tariq resets primary password · disables visible recovered-session device',
    caption: 'On the primary profile, Tariq resets his password, navigates to "Active Devices," and disables the device the recovery flow registered. The Active Devices page shows only primary-profile devices. The secondary profile "Tariq M (work)" — and its associated adversary-controlled device — does not appear on this page; it lives on a separate "Linked Profiles" page two screens deeper. Tariq does not check that page; he doesn\'t know to. He believes he has cleaned up the compromise. The active-devices parity control would have surfaced the secondary device alongside the primary, giving Tariq the affordance to recognize "I did not register this."',
    durationMs: 9500,
    messages: [
      { id: 'al-profile-m7-1', fromActor: 'tariq', toActor: 'republic', kind: 'http',
        label: 'Password reset on primary · credentials rotated' },
      { id: 'al-profile-m7-2', fromActor: 'tariq', toActor: 'republic', kind: 'http',
        label: 'Active Devices page · disables recovered-session device · sees only primary-profile devices' },
      { id: 'al-profile-m7-3', fromActor: 'tariq', toActor: 'tariq', kind: 'system',
        label: 'Believes compromise cleaned · does not check Linked Profiles page',
        audio: { text: 'Believes compromise cleaned. Does not check linked profiles.', profile: 'victimMale' } },
      { id: 'al-profile-m7-4', fromActor: 'republic', toActor: 'republic', kind: 'system',
        label: 'Primary password rotated · secondary profile credentials unchanged · separate path' },
    ],
    revealedSignalIds: ['sig-secondary-profile-resumes-after-reset'],
  },

  /* Stage 8 — Three-week dormancy */
  {
    id: 'al-profile-stage-8',
    label: 'Dormancy',
    title: 'Days 5 → 26 — secondary profile dormant · anomaly window cools',
    caption: 'For 21 days the adversary does not transact. Republic Bank\'s anomaly scoring on Tariq\'s account, which would have flagged a high-value transfer in the immediate post-reset window, cools to baseline. Tariq returns to using Republic Bank normally and considers the SIM-swap incident resolved.',
    durationMs: 6500,
    messages: [
      { id: 'al-profile-m8-1', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Secondary profile dormant · 21 days · waiting for anomaly window' },
      { id: 'al-profile-m8-2', fromActor: 'republic', toActor: 'republic', kind: 'system',
        label: 'Account anomaly score returns to baseline' },
      { id: 'al-profile-m8-3', fromActor: 'tariq', toActor: 'tariq', kind: 'system',
        label: 'Resumes normal banking · believes incident resolved' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 9 — Secondary profile exfils · final */
  {
    id: 'al-profile-stage-9',
    label: 'Exfil',
    title: 'Day 26 — secondary profile authenticates · structured exfil',
    caption: 'On Day 26 post-registration, the adversary opens their app, authenticates with their fingerprint on the "Tariq M (work)" secondary profile, and initiates transfers from Tariq\'s current account to external accounts. Transfers structured below the equivalent of the local CTR threshold. From Republic Bank\'s perspective: a verified secondary profile is transacting on the account it has authority over, using its own biometric, from its registered device. No anomaly. The fraud signal — "secondary profile registered during a recovered session, dormant 21 days, then drained the account" — exists in the audit data but is not surfaced by any single transactional rule.',
    durationMs: 11500,
    messages: [
      { id: 'al-profile-m9-1', fromActor: 'adversary', toActor: 'republic', kind: 'http',
        label: 'Biometric login on "Tariq M (work)" secondary profile · authentication successful',
        audio: { text: 'Day twenty-six. Biometric login on secondary profile. Authentication successful.', profile: 'fraudster' } },
      { id: 'al-profile-m9-2', fromActor: 'adversary', toActor: 'republic', kind: 'transfer',
        label: 'Structured transfers initiated · sub-threshold · multiple external destinations', suspicious: true },
      { id: 'al-profile-m9-3', fromActor: 'republic', toActor: 'republic', kind: 'system',
        label: 'Authorizes transfers · secondary profile transacting · no flag',
        audio: { text: 'Verified secondary profile transacting. No flag.', profile: 'narrator' } },
      { id: 'al-profile-m9-4', fromActor: 'tariq', toActor: 'republic', kind: 'callback',
        label: 'Day 27 · Tariq reviews balance · funds missing · contacts Republic Bank',
        audio: { text: 'Day twenty-seven. Tariq discovers the loss. Contacts Republic Bank.', profile: 'victimMale' } },
    ],
    actorStateChanges: { 'adversary': 'executing', 'republic': 'authorizing', 'tariq': 'discovering' },
    revealedSignalIds: ['sig-secondary-profile-resumes-after-reset'],
    finalHeadline: 'Persistence outlives credentials. Tariq did everything his post-vishing-era training prepared him to do — when he saw the SIM-swap fallout, he reset his password, audited Active Devices, disabled the suspicious device, and believed the compromise was cleaned. The reset closed the credential path. The Active Devices audit closed the visible-session path. Neither addressed the secondary profile, which lives on a separate Linked Profiles page Tariq did not know to inspect. The diagnostic protocol for F1007.002 is not "audit Active Devices" but "audit Active Devices AND audit Linked Profiles AND audit External Accounts" — three separate surfaces, three separate audits. Republic Bank\'s control points are out-of-band step-up authentication on secondary-profile creation (closes the persistence path at the moment of creation), Active Devices UI parity between primary and secondary profiles (gives the customer the affordance to recognize unauthorized secondaries during routine audits), and notification-to-primary-contacts on secondary-profile add (surfaces the persistence to the customer at Stage 4 instead of Stage 9). The next F1007 sub-technique (F1007.003 External Account Link) covers cross-bank persistence — same pedagogical insight, same diagnostic protocol expansion.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_META = {
  techId: 'F1007.002',
  techName: 'Account Linking: Linked Profile Add',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'SC-tariq-republic-linked-profile',
  scenarioContext: 'Mr. Tariq Mohammed, age 33, Republic Bank Trinidad customer, freelance graphic designer in Port of Spain, 8-year customer (current account + savings + business sub-account). Yesterday morning Tariq\'s mobile number was social-engineered out of his Trinidadian carrier and ported to a SIM card the adversary controls. Tariq attributes the resulting "no signal" to conference roaming. Adversary uses the SIM-swap window to intercept Republic Bank\'s recovery-flow OTP and complete account recovery. Rather than direct drain (would trigger transaction monitoring on a session from a new IP), adversary plans persistence: navigates Profile → Linked Profiles → Add Secondary Profile, registers their own device + biometric as a secondary profile named "Tariq M (work)." Republic Bank dispatches an SMS notification to the registered phone — which is the SIM-swapped phone the adversary controls. No email dispatch. No out-of-band step-up. Adversary logs out of Tariq\'s primary profile. Day 5: Tariq restores his SIM, sees delayed Republic Bank "new device login" emails, resets primary password, audits Active Devices, disables the recovered-session device, believes compromise cleaned. The Active Devices page shows only primary-profile devices; the secondary profile "Tariq M (work)" lives on a separate Linked Profiles page Tariq does not check. Adversary waits 21 days for post-reset anomaly window to cool. Day 26: biometric login on secondary profile, structured sub-threshold transfers exfil funds. Republic Bank\'s perspective: verified secondary profile transacting normally with own biometric on registered device, no anomaly. Tariq discovers loss Day 27. Composite case grounded in Caribbean digital banking platform documentation (linked-profile / secondary-profile features at Republic Bank, RBC, NCB, JNCB, Sagicor 2023-2025), public industry reporting on SIM-swap session takeover with in-session profile manipulation, and FFIEC/ABA guidance on out-of-band step-up authentication. Republic Bank is the FIRST Trinidad-based institution represented in animations; first-name "Tariq" reflects Trinidad\'s Indo-Caribbean demographic, distinct from Jamaican-leaning roster.',
  totalDurationMs: 74000,
  stageCount: 9,
}


export default {
  meta: ACCOUNT_LINKING_PROFILE_META,
  engine: 'multi-actor-sequence',
  stages: ACCOUNT_LINKING_PROFILE_STAGES,
  controls: ACCOUNT_LINKING_PROFILE_CONTROLS,
  signals: ACCOUNT_LINKING_PROFILE_SIGNALS,
  actors: ACCOUNT_LINKING_PROFILE_ACTORS,
}
