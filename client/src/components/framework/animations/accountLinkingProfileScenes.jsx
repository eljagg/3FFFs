/**
 * accountLinkingProfileScenes.jsx — v25.7.0.29
 *
 * Scene data for Account Linking: Linked Profile Add (F1007.002) —
 * second F1007 sub-technique. Uses MultiActorSequenceAnimation
 * engine.
 *
 * F1007.002 is the digital-channel-native case of Account Linking.
 * After session compromise via SIM-swap, vishing-driven recovery
 * flow, or push-MFA fatigue, the adversary uses the customer\'s
 * own mobile banking app to register a SECONDARY profile on the
 * account — their own device, their own biometric, their own
 * recovery email — establishing a parallel authentication path
 * that survives any password reset because the secondary profile
 * is a distinct credential set, not a derivative of the primary.
 *
 * Critically, the bank\'s "Active Devices" list typically does
 * not surface secondary-profile devices the same way it surfaces
 * primary-profile devices. When the customer responds to a
 * "new device" alert by checking active devices and disabling
 * what looks suspicious, the secondary profile is invisible to
 * the audit. The persistence lives in surfaces the customer
 * doesn\'t know to inspect.
 *
 * Why linked-profile add deserves a separate animation from
 * joint-account add (F1007.001):
 * - Different attack surface (digital flow vs. call centre)
 * - Different defender response window (registration-flow
 *   step-up vs. call-centre callback)
 * - Different audit visibility (primary-profile devices vs.
 *   secondary-profile devices treated differently in most UIs)
 * - Different customer mental model (the customer who has been
 *   trained on "audit your signatories" still has no model for
 *   "audit your linked profiles")
 *
 * The pedagogical insight is the same as F1007.001 (persistence
 * outlives credentials), but the diagnostic protocol is
 * different: for F1007.002 the trainee must learn to navigate
 * the digital banking surface and audit linked-profile
 * registrations specifically, not just signatories.
 *
 * Composite case grounded in:
 * - Caribbean digital banking platform documentation (publicly
 *   accessible feature pages from 2023-2025 referencing
 *   "linked profiles" / "secondary profiles" / "household
 *   profiles" as supported features in mobile banking apps
 *   from Republic Bank, RBC, NCB, JNCB, and Sagicor)
 * - Public industry reporting on SIM-swap-enabled session
 *   takeover (Caribbean and US case patterns 2022-2025)
 *   followed by in-session profile manipulation as a
 *   persistence step
 * - FFIEC and ABA published guidance on out-of-band step-up
 *   authentication for security-sensitive in-session changes,
 *   including the specific recommendation that secondary
 *   profile / device registrations be treated as security-
 *   sensitive and gated on out-of-band confirmation
 *
 * Scenario character: Mr. Tariq Mohammed, age 33, Republic Bank
 * Trinidad customer, freelance graphic designer in Port of
 * Spain. Republic Bank customer for 8 years (current account +
 * savings + business sub-account). SIM-swap compromise in the
 * upstream kill chain — the adversary social-engineered Tariq\'s
 * mobile carrier into porting his number, intercepted the
 * recovery SMS, and used Republic Bank\'s account-recovery flow
 * to log in. The scenario picks up in the active session after
 * recovery succeeded.
 *
 * Republic Bank is the FIRST Trinidad-based institution
 * represented in animations (joining NCB, JNCB, Scotia, CIBC,
 * Sagicor — all Jamaica-headquartered). This expands the
 * geographic footprint of the corpus beyond Jamaica and
 * provides Trinidad-based trainees with a scenario at their
 * own institution. The first-name "Tariq" reflects Trinidad\'s
 * Indo-Caribbean demographic, distinct from the
 * Jamaican-leaning roster.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell, Karen Ferguson,
 * Anthony Spencer, Renee Patterson). First-name and surname
 * both new to the roster.
 *
 * Pedagogical insight (locked v25.7.0.29 — composite for F1007):
 *   Same as F1007.001 — persistence outlives credentials. The
 *   sub-technique-specific diagnostic protocol: audit linked
 *   profiles in addition to signatories. The institutional
 *   control point is the registration-flow design — out-of-band
 *   step-up authentication on secondary-profile creation, with
 *   notifications routed to the registered contacts on the
 *   primary profile, and Active Devices UI parity between
 *   primary and secondary profiles.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary',
    role: 'SIM-swap session takeover · authenticated as Tariq via recovery flow · running in-session persistence',
    initialState: 'active',
  },
  {
    id: 'tariq',
    name: 'Mr. Tariq Mohammed',
    role: 'Republic Bank Trinidad customer · graphic designer · Port of Spain · age 33 · 8-year customer',
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
    meta: 'Registration flow: any "Add Secondary Profile" / "Register Additional Device" action triggers step-up authentication via a channel independent of the current session — typically an SMS to the registered phone of file (NOT the current session\'s authenticated phone, which post-SIM-swap is the adversary\'s) or an email to a registered email of file (which the adversary may not have compromised). The step-up requires the customer to confirm the new profile/device by entering a one-time code OR by tapping an in-app push notification on the EXISTING primary device. Catches F1007.002 at Stage 4 before any provisioning happens. Implementation cost: marginal — adds 30-60 seconds to the legitimate secondary-profile flow but only on first-time registrations. Defeats the entire F1007.002 attack pattern unless the adversary has also compromised the customer\'s email AND their existing primary device — a much higher bar than session-level compromise.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'secondary profile registrations',
  },
  {
    id: 'ctrl-active-devices-parity',
    label: 'Active Devices UI parity: primary + secondary profile devices listed with equal prominence',
    meta: 'Mobile/web UI: the "Active Devices" / "Sessions" / "Connected Devices" page surfaces ALL devices with active credentials on the account — primary profile, secondary profile, household profile, biometric registrations, browser sessions — with consistent labelling and equal visual prominence. The customer\'s ability to identify "what does not belong" is gated on the UI showing it. Catches F1007.002 at Stage 7 when the customer responds to a "new device" alert by checking active devices and is now able to see the adversary\'s secondary device. Without this control, the secondary profile is invisible to the customer\'s audit and the persistence survives indefinitely. Implementation cost: marginal UI work. Critical complement to the step-up control — together they make secondary-profile add hard to perform AND easy to detect retrospectively.',
    naive: false,
    revealsAtStages: [7],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'customer audit moments',
  },
  {
    id: 'ctrl-notification-to-primary-contacts',
    label: 'Notification (SMS + email) to PRIMARY profile contacts on secondary profile add',
    meta: 'Issuer-side: any secondary-profile / additional-device registration triggers immediate notification to the PRIMARY profile\'s registered SMS and email — both — with a 1-tap "Not me" button. The notification routing is critical: post-SIM-swap, the adversary controls the primary profile\'s registered phone, so SMS may reach the adversary not the customer. Email registered on the primary profile that has not been compromised remains an effective channel. Best-effort detection control: surfaces the persistence to the customer at Stage 4 (the moment the secondary profile is added) instead of Stage 7+ (when the customer notices something else and investigates). Implementation cost: marginal — extends existing alert infrastructure. Should be paired with the step-up control above for layered defense.',
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
    stage: 2,
    severity: 'high',
    text: 'Account recovery flow completed from a new IP / new device fingerprint, immediately followed by in-session profile changes',
  },
  {
    id: 'sig-secondary-profile-no-stepup',
    stage: 4,
    severity: 'high',
    text: 'Secondary profile registered without out-of-band step-up — current session credentials only',
  },
  {
    id: 'sig-secondary-profile-different-fingerprint',
    stage: 4,
    severity: 'medium',
    text: 'Secondary profile device fingerprint differs from primary in OS, model, locale, and timezone — atypical for a single-customer multi-device pattern',
  },
  {
    id: 'sig-no-notification-on-primary-email',
    stage: 4,
    severity: 'medium',
    text: 'Secondary profile add not surfaced via primary-profile registered email — registered SMS may have been delivered to compromised SIM',
  },
  {
    id: 'sig-tariq-resets-password-not-profile',
    stage: 7,
    severity: 'medium',
    text: 'Customer responds to "new device" alert by resetting password and disabling visible suspicious device — secondary profile not visible in audit, not addressed',
  },
  {
    id: 'sig-secondary-profile-resumes-after-reset',
    stage: 9,
    severity: 'high',
    text: 'After password reset on primary, secondary profile authenticates successfully and transacts — proves credential rotation did not affect persistence',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_STAGES = [
  {
    id: 'sim-swap-aftermath',
    title: 'Stage 1 — SIM-swap aftermath (upstream)',
    body: 'Yesterday morning, Tariq\'s mobile number was social-engineered out of his Trinidadian carrier and ported to a SIM card the adversary controls. Tariq has not yet realized — he travels for a graphic-design conference and his phone has been "no signal" all day, which he attributes to roaming issues. The adversary used the SIM-swap window to intercept Republic Bank\'s recovery-flow OTP and is now in an authenticated session on Tariq\'s primary profile.',
    actorActions: [
      { actor: 'adversary', text: 'Authenticated session via recovery flow · controls Tariq\'s phone', state: 'active' },
      { actor: 'tariq', text: 'At conference · phone "no signal" · unaware', state: 'unaware' },
      { actor: 'republic', text: 'Recovery flow completed normally · session active', state: 'silent' },
    ],
    duration: 6500,
  },
  {
    id: 'plan',
    title: 'Stage 2 — Plan: secondary profile, not direct drain',
    body: 'The adversary considers direct authentication-and-drain. They reject this. The session is from a new IP; high-value transfers will pull a manual review. Instead they plan persistence: register a secondary profile on Tariq\'s account using their own device and biometric, then exit the recovered session. When Tariq inevitably resets his credentials in response to noticing the SIM-swap, the secondary profile remains intact.',
    actorActions: [
      { actor: 'adversary', text: 'Plans secondary profile registration · controls own device', state: 'preparing' },
      { actor: 'tariq', text: 'Unaware', state: 'unaware' },
    ],
    duration: 6000,
  },
  {
    id: 'navigate',
    title: 'Stage 3 — Navigate to "Add Secondary Profile"',
    body: 'In Tariq\'s active mobile banking session, the adversary navigates: Profile → Linked Profiles → Add Secondary Profile. Republic Bank\'s flow is designed for legitimate household use (couples, small-business co-owners). The flow asks for: a name for the new profile, a registration code sent to the new device, and biometric enrollment on the new device. No out-of-band step-up to Tariq\'s registered email or push to his existing device is required.',
    actorActions: [
      { actor: 'adversary', text: 'Navigates Profile → Linked Profiles → Add Secondary Profile', state: 'active' },
      { actor: 'republic', text: 'Renders secondary-profile registration flow · no step-up gate', state: 'rendering' },
      { actor: 'tariq', text: 'Unaware', state: 'unaware' },
    ],
    duration: 7000,
  },
  {
    id: 'register',
    title: 'Stage 4 — Secondary profile + device + biometric registered',
    body: 'The adversary completes the flow: names the secondary profile "Tariq M (work)," registers their own device, enrolls their own fingerprint as the biometric. Republic Bank issues credentials for the secondary profile bound to the adversary\'s device. The secondary profile is now an independent authentication path: distinct username, distinct device fingerprint, distinct biometric. SMS notification is sent — to Tariq\'s now-adversary-controlled SIM. No email notification (Republic Bank\'s flow does SMS-only on this surface).',
    actorActions: [
      { actor: 'adversary', text: 'Completes registration · secondary profile "Tariq M (work)" provisioned on adversary device', state: 'completed' },
      { actor: 'secondary', text: 'Registered as authorized secondary device · biometric enrolled', state: 'active' },
      { actor: 'republic', text: 'Provisions secondary profile · SMS sent to registered phone (now compromised)', state: 'recording' },
      { actor: 'tariq', text: 'Phone has no signal · SMS not delivered to him', state: 'unaware' },
    ],
    duration: 9000,
  },
  {
    id: 'exit',
    title: 'Stage 5 — Adversary exits the recovered session',
    body: 'The adversary logs out of Tariq\'s primary profile session and ends the recovery-flow context. They keep the secondary profile authenticated on their own device. From Republic Bank\'s telemetry: the recovered session ended cleanly, no transactions occurred, no high-risk actions outside profile-management. Risk score on the recovery flow is "low concern."',
    actorActions: [
      { actor: 'adversary', text: 'Logs out of primary profile session · keeps secondary profile authenticated', state: 'waiting' },
      { actor: 'republic', text: 'Recovery session closed · risk score low · secondary profile active', state: 'silent' },
      { actor: 'tariq', text: 'Unaware', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'sim-restored',
    title: 'Stage 6 — Tariq\'s SIM restored · sees suspicious activity emails',
    body: 'Tariq returns home, calls his carrier, gets the SIM-swap reversed (5 days after the original swap). He finds delayed Republic Bank "new device login" emails in his inbox. He logs into his primary profile to investigate.',
    actorActions: [
      { actor: 'tariq', text: 'SIM restored · sees Republic Bank emails about unusual login · alarmed', state: 'alarmed' },
      { actor: 'adversary', text: 'Secondary profile authenticated · waiting', state: 'dormant' },
      { actor: 'republic', text: 'Receives Tariq\'s primary profile login from his usual IP', state: 'silent' },
    ],
    duration: 7000,
  },
  {
    id: 'reset',
    title: 'Stage 7 — Tariq resets password + disables visible device',
    body: 'On the primary profile, Tariq resets his password, navigates to "Active Devices," and disables the device the recovery flow registered. The Active Devices page shows only primary-profile devices. The secondary profile "Tariq M (work)" — and its associated adversary-controlled device — does not appear on this page; it lives on a separate "Linked Profiles" page two screens deeper. Tariq does not check that page; he doesn\'t know to. He believes he has cleaned up the compromise.',
    actorActions: [
      { actor: 'tariq', text: 'Resets primary password · disables visible recovered-flow device · believes compromise cleaned', state: 'reacting' },
      { actor: 'republic', text: 'Password reset on primary · visible device disabled · secondary profile unaffected', state: 'recording' },
      { actor: 'adversary', text: 'Secondary profile credentials unchanged · device fingerprint unchanged', state: 'dormant' },
    ],
    duration: 8500,
  },
  {
    id: 'dormancy',
    title: 'Stage 8 — Three-week dormancy',
    body: 'For 21 days the adversary does not transact. Republic Bank\'s anomaly scoring on Tariq\'s account, which would have flagged a high-value transfer in the immediate post-reset window, cools to baseline. Tariq returns to using Republic Bank normally and considers the SIM-swap incident resolved.',
    actorActions: [
      { actor: 'adversary', text: 'Secondary profile dormant · waiting for anomaly window to close', state: 'waiting' },
      { actor: 'republic', text: 'Account anomaly score returns to baseline', state: 'silent' },
      { actor: 'tariq', text: 'Account looks normal · believes incident resolved', state: 'unaware' },
    ],
    duration: 6500,
  },
  {
    id: 'exfil',
    title: 'Stage 9 — Secondary profile authenticates · exfils funds',
    body: 'On Day 26 post-registration, the adversary opens their app, authenticates with their fingerprint on the "Tariq M (work)" secondary profile, and initiates transfers from Tariq\'s current account to external accounts. The transfers are structured below the equivalent of the local CTR threshold. From Republic Bank\'s perspective: a verified secondary profile is transacting on the account it has authority over, using its own biometric, from its registered device. No anomaly. The fraud signal — "secondary profile registered during a recovered session, dormant 21 days, then drained the account" — exists in the audit data but is not surfaced by any single transactional rule.',
    actorActions: [
      { actor: 'adversary', text: 'Biometric login on secondary profile · structured exfil transfers initiated', state: 'executing' },
      { actor: 'republic', text: 'Authorizes transfers · secondary profile transacting · no flag', state: 'authorizing' },
      { actor: 'tariq', text: 'Discovers loss next day reviewing balance · contacts Republic Bank', state: 'discovering' },
    ],
    duration: 9000,
  },
]


/* ─── Metadata ──────────────────────────────────────────────── */
export const ACCOUNT_LINKING_PROFILE_META = {
  techniqueId: 'F1007.002',
  techniqueName: 'Account Linking: Linked Profile Add',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'Tariq Mohammed · Republic Bank Trinidad · secondary profile registration in recovered session',
  totalStages: 9,
}


export default {
  actors: ACCOUNT_LINKING_PROFILE_ACTORS,
  controls: ACCOUNT_LINKING_PROFILE_CONTROLS,
  signals: ACCOUNT_LINKING_PROFILE_SIGNALS,
  stages: ACCOUNT_LINKING_PROFILE_STAGES,
  meta: ACCOUNT_LINKING_PROFILE_META,
}
