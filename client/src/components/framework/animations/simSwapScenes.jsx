/**
 * simSwapScenes.jsx — v25.7.0.14
 *
 * Scene data for the SIM Card Swap (T1451) technique animation under
 * Initial Access (TA0001).
 *
 * Real-world anchor: J$61 million conviction handed down by the
 * Corporate Area Parish Court, October 2025. Three convicted
 * (sentencing November 6, 2025): two telco customer service
 * representatives ages 25 and 29, and a 32-year-old self-employed
 * man. Six more facing trial — including a 34-year-old accountant,
 * 24-year-old account associate, 23-year-old legal filing clerk,
 * 35-year-old counter clerk. Five-year investigation led by the
 * Financial Investigations Division (FID) in collaboration with
 * Jamaica Constabulary Force (JCF). The conviction profile is the
 * pedagogical signal: the insider isn't an exception; the insider
 * IS the pattern. Source: WIC News reporting October 2025.
 *
 * Wider context: Cifas 2025 Fraudscape report — UK SIM swap fraud
 * up 1,055% YoY, ~3,000 cases in 2024. FBI IC3 — US$25.98M reported
 * losses in 2024 alone. T-Mobile $33M arbitration award March 2025.
 * Princeton 2020 study found 80% success rate for fraudulent SIM
 * swap attempts on the first try at major US carriers — and the
 * Caribbean pattern adds insider co-conspirators making success
 * effectively guaranteed. Sources: Cifas, FBI, Keepnet, Specops.
 *
 * Pedagogical insight (locked):
 *   SIM swap fraud is not primarily a customer-vigilance failure or
 *   a technology failure. In the Caribbean pattern documented by
 *   the J$61M conviction, the failure is the insider — telco customer
 *   service representatives accepting payment to port victim numbers.
 *   The customer cannot see the port happening; the bank cannot see
 *   the SIM change at the carrier; the carrier's own controls are
 *   defeated by employees with legitimate access. Defense requires
 *   institution-side controls that operate ACROSS the bank-telco
 *   boundary: SIM-swap-API risk scoring (when did this number last
 *   port?), behavioral anomaly monitoring on logins from new devices
 *   immediately after a SIM change, and customer training that
 *   recognizes the "no service" signal as a fraud cue, not a phone
 *   problem. Bank staff who recognize the SIM-swap kill chain in
 *   customer dispute reports recover faster than those who treat it
 *   as user error.
 *
 * Character: Ms. Tanya Ricketts — Portmore, age 34, marketing
 * coordinator at a Kingston firm, single mother of two. Scotia JM
 * personal account (J$1.4M balance, salary deposit account). Digicel
 * mobile customer for 8 years — same number registered to her
 * Scotia online banking, her email recovery, her Apple ID, her
 * children's school portal. Her phone is the center of her work
 * and family life. The animation grounds in this dependency: when
 * her number ports, every account tied to it cascades.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Real-world training, not sheltered. The animation surfaces the
 *   insider co-conspirator pattern documented in the J$61M Jamaica
 *   conviction. Naming the insider role explicitly — "telco CSR
 *   accepting payment" — is the recognition lesson, not editorial
 *   embellishment. Bank staff who see SIM-swap dispute reports
 *   need to understand that the fraudster did not "trick" the
 *   customer; the fraudster paid an insider to bypass the
 *   customer's protections entirely.
 */


/* ─── Actors: 5-actor sequence — adds Insider lane ──────────── */
export const SIMSWAP_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Recruits + pays insiders',
    initialState: 'active',
  },
  {
    id: 'insider',
    name: 'Telco CSR (insider)',
    role: 'Customer service rep · accepts payment',
    initialState: 'silent',
  },
  {
    id: 'tanya',
    name: 'Ms. Tanya Ricketts',
    role: 'Scotia JM customer · Portmore · age 34',
    initialState: 'unaware',
  },
  {
    id: 'telco',
    name: 'Digicel Jamaica',
    role: 'Carrier · porting + SIM systems',
    initialState: 'silent',
  },
  {
    id: 'scotia',
    name: 'Scotia JM',
    role: 'Bank · online banking + transfer systems',
    initialState: 'silent',
  },
]


/* ─── Detection controls (4 real + 1 naive) ─────────────────── */
export const SIMSWAP_CONTROLS = [
  {
    id: 'ctrl-sim-swap-api',
    label: 'Bank-side SIM-swap API risk scoring',
    meta: 'GSMA-standard SIM-swap API (Telefónica Open Gateway, similar carrier offerings) lets banks query: "when did this customer\'s number last port?" If the answer is "47 minutes ago," the bank treats the next login + transfer as high-risk regardless of whether the OTP succeeds. Available from carriers; requires bank-side integration. Catches stage 5-6 if the bank queries the API on every login from a new device.',
    naive: false,
    revealsAtStages: [5, 6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'recent-port detections',
  },
  {
    id: 'ctrl-insider-monitoring',
    label: 'Telco insider-action monitoring',
    meta: 'Carrier-side monitoring on customer service representative actions: SIM port volumes per CSR per shift, port destinations clustered to specific phones, ports executed without standard authentication trail. The J$61M case took five years to surface partly because no system flagged the insider CSRs\' aberrant port volume in real-time. Catches stage 3 — the moment of insider action — if the carrier has CSR behavioral monitoring deployed.',
    naive: false,
    revealsAtStages: [3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'CSR anomalies',
  },
  {
    id: 'ctrl-customer-no-service-training',
    label: 'Customer "no service" training as fraud cue',
    meta: 'Trains customers: "If your phone suddenly shows NO SERVICE or SOS ONLY while others on the same network have signal, treat it as a fraud cue. Borrow another phone immediately and call your bank\'s fraud line and your carrier\'s fraud line. Do not wait." The signal is unambiguous in the SIM swap kill chain — the moment the port executes, the victim\'s phone goes dark. The 10-minute window between port and first fraudulent transfer is the recovery window.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'recognition opportunities',
  },
  {
    id: 'ctrl-new-device-velocity',
    label: 'New-device login + immediate transfer velocity hold',
    meta: 'Bank places automatic hold on any high-value transfer initiated from a device-fingerprint never seen on the account, within minutes of an initial login from that device. The fraudster\'s newly-activated SIM is on a brand-new device the bank has never seen for Tanya\'s account. The transfer at stage 6 is from this never-seen device — the velocity rule should hold it for callback. Catches stage 6.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'new-device transfers',
  },
  {
    id: 'ctrl-naive-stronger-passwords',
    label: 'Customers should use stronger passwords',
    meta: 'The institutional posture that SIM swap victimization is a customer credential-hygiene problem. Doesn\'t apply because SIM swap fraud bypasses passwords entirely — the fraudster uses Tanya\'s real number to receive password-reset SMS codes and OTP codes. Tanya\'s password could be 32 random characters; it would not protect her once her number ports. The control category that matters is the SMS-2FA channel itself, which "stronger passwords" does not address. Customer-blame framing also distracts from the actual failure point: insider co-conspirators at the carrier.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'SIM swap fraud bypasses passwords entirely — strength does not protect a number that ports. The defense is institution-side: bank-telco SIM-swap-API integration, carrier insider-action monitoring, and migration away from SMS-2FA toward authenticator apps or FIDO2 passkeys. The J$61M Jamaica conviction shows insider co-conspirators were the attack surface — not customer password strength.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const SIMSWAP_SIGNALS = [
  {
    id: 'sig-recent-port-event',
    label: 'Number ported in the last hour',
    description: 'When Scotia\'s online banking system queries the GSMA-standard SIM-swap API at stage 5 or 6, the response shows Tanya\'s Digicel number ported to a new SIM 47 minutes ago. This is the strongest single signal in the SIM swap kill chain — recent ports for accounts that did not request a number change indicate compromise. Banks that integrate this API can downgrade the trust on every authentication signal coming from that number for a 24-72 hour window.',
    revealedBy: 'ctrl-sim-swap-api',
  },
  {
    id: 'sig-insider-port-anomaly',
    label: 'CSR ported 23 numbers in 9 days, all to nearby IMEI cluster',
    description: 'The insider CSR\'s port history shows 23 ports executed in 9 days, all to a small geographic cluster of IMEI codes (the destination phones used by the fraudster crew). Standard CSR port volume is 0-3 per shift. Telco insider-action monitoring would surface this anomaly in real-time. The five-year delay before the J$61M case surfaced partly reflects that this monitoring was not deployed.',
    revealedBy: 'ctrl-insider-monitoring',
  },
  {
    id: 'sig-no-service-signal',
    label: 'Tanya\'s phone shows NO SERVICE while others have signal',
    description: 'The instant the port executes at the carrier, Tanya\'s phone loses cellular service. She is at her desk; her colleague\'s phone (same Digicel network) has full signal. If she recognizes "NO SERVICE while others have signal" as a fraud cue, she has roughly 10 minutes to borrow a phone and call Digicel + Scotia fraud lines before the fraudster\'s first transfer clears. Without this training, she assumes it\'s a network outage and waits for service to return.',
    revealedBy: 'ctrl-customer-no-service-training',
  },
  {
    id: 'sig-new-device-fingerprint',
    label: 'Login + transfer from never-seen device',
    description: 'The fraudster\'s newly-activated SIM is in a phone whose device fingerprint Scotia has never seen for Tanya\'s account in 8 years of banking history. Login at 2:34 PM from new device + IP geolocating to Spanish Town (Tanya is in Portmore). Transfer initiated at 2:36 PM, J$1.2M to a new beneficiary. Velocity rules combining new-device + new-beneficiary + amount-near-balance should hold this transfer for callback. Catches the transfer before it clears.',
    revealedBy: 'ctrl-new-device-velocity',
  },
  {
    id: 'sig-cascade-across-accounts',
    label: 'Single port cascades to 4 separate accounts',
    description: 'The SIM swap doesn\'t just compromise Scotia. Within 90 minutes, the fraudster also resets the password on Tanya\'s Gmail (account recovery via SMS), her Apple ID (SMS verification), her Sagicor pension portal (SMS authentication), and her credit union savings account. Each compromise uses the same hijacked SMS channel. The cascade pattern is the strongest reason to treat any SIM swap as a multi-account incident, not a single-bank incident. SMS-2FA is a single point of failure across the customer\'s entire digital identity.',
    revealedBy: 'ctrl-sim-swap-api',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const SIMSWAP_STAGES = [
  /* Stage 1 — Recon and insider recruitment */
  {
    id: 'ss-stage-1',
    label: 'Recon + insider recruitment',
    title: 'Fraudster recruits Digicel CSR; profiles Tanya from public sources',
    caption: 'Day 0. The fraudster crew has built relationships with telco customer service representatives at multiple Caribbean carriers — paying J$50K-J$150K per successful port. Recruitment happens through encrypted messaging apps, often introduced via existing acquaintances. Today\'s target: Tanya Ricketts. The crew profiles her from her LinkedIn (Scotia JM relationship visible from "I love banking with Scotia for 8 years!" testimonial), her Facebook (children\'s school name, address pattern visible), and her phone number from a business directory listing for her side business selling baked goods.',
    durationMs: 6500,
    messages: [
      { id: 'ss-m1-1', fromActor: 'fraudster', toActor: 'insider', kind: 'system', label: 'Recruitment + payment offer · J$120K per port' },
      { id: 'ss-m1-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'OSINT: Tanya · Scotia · Digicel · 876-XXX-XXXX' },
    ],
    actorStateChanges: { 'insider': 'active' },
    revealedSignalIds: [],
  },

  /* Stage 2 — The port request */
  {
    id: 'ss-stage-2',
    label: 'Port request',
    title: 'Fraudster sends Tanya\'s details to insider CSR',
    caption: 'Tuesday, 2:14 PM. The fraudster messages the insider CSR via encrypted app: Tanya\'s full name, DOB, address, last four digits of her national ID, the Digicel number to port, and the IMEI of the destination phone (the one the fraudster will activate the new SIM in). The insider already has access to Digicel\'s CSR system from his legitimate workstation. He receives the message during a slow afternoon and waits for an opportunity when his supervisor steps away.',
    durationMs: 6000,
    messages: [
      { id: 'ss-m2-1', fromActor: 'fraudster', toActor: 'insider', kind: 'system', label: 'Tanya\'s PII + destination IMEI', suspicious: true },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — The port executes */
  {
    id: 'ss-stage-3',
    label: 'Port executes',
    title: 'Insider CSR ports Tanya\'s number at 2:33 PM',
    caption: '2:33 PM. The insider CSR opens Digicel\'s porting workflow. He enters Tanya\'s number, claims the SIM was lost or damaged (the standard pretext), bypasses the required customer-callback verification by checking the "customer present at retail location" override (which his role allows), and activates the new SIM. The port completes in under two minutes. Digicel\'s system has no anomaly flag — this is the 23rd port this CSR has executed in 9 days, but no monitoring layer is watching that pattern. The insider sends the fraudster confirmation: "Done."',
    durationMs: 7500,
    messages: [
      { id: 'ss-m3-1', fromActor: 'insider', toActor: 'telco', kind: 'http', label: 'SIM port · "customer present" override', tooltip: '23rd port in 9 days · no anomaly flag', suspicious: true },
      { id: 'ss-m3-2', fromActor: 'telco', toActor: 'insider', kind: 'system', label: 'Port complete · new SIM active' },
      { id: 'ss-m3-3', fromActor: 'insider', toActor: 'fraudster', kind: 'system', label: '"Done."' },
    ],
    revealedSignalIds: ['sig-insider-port-anomaly'],
  },

  /* Stage 4 — Tanya's phone goes dark */
  {
    id: 'ss-stage-4',
    label: 'Phone goes dark',
    title: 'Tanya\'s phone shows NO SERVICE',
    caption: '2:34 PM. Tanya is at her desk. Her phone, which had full signal moments ago, now shows "No Service." Her colleague\'s phone (same Digicel network) still has signal. Tanya assumes it\'s a tower issue or her phone needs a restart. She powers off her phone, waits 30 seconds, powers it back on. Still no service. She thinks she\'ll deal with it after her 3 PM meeting. She does not recognize that her number is now active on the fraudster\'s phone — and that the fraudster has roughly 10 minutes before any monitoring system might catch the cascade that\'s about to happen.',
    durationMs: 7000,
    messages: [
      { id: 'ss-m4-1', fromActor: 'telco', toActor: 'tanya', kind: 'system', label: 'Service drops · "NO SERVICE"', tooltip: 'Single most actionable cue for the customer', suspicious: true },
    ],
    actorStateChanges: { 'tanya': 'targeted' },
    revealedSignalIds: ['sig-no-service-signal'],
  },

  /* Stage 5 — Bank login from new device */
  {
    id: 'ss-stage-5',
    label: 'Bank login',
    title: 'Fraudster logs into Scotia online banking',
    caption: '2:35 PM. The fraudster opens Scotia\'s online banking on the new device. Username: tanya.ricketts (visible from prior breach corpora — Scotia usernames are typically firstname.lastname). Password reset path: "I forgot my password." Scotia sends the reset link via SMS. The SMS arrives on the fraudster\'s phone (Tanya\'s ported number). Reset complete. New password set. Login successful. Scotia sees a login from a never-seen device, but without SIM-swap-API integration, Scotia has no signal that the SMS just went to a fraudster.',
    durationMs: 8000,
    messages: [
      { id: 'ss-m5-1', fromActor: 'fraudster', toActor: 'scotia', kind: 'http', label: 'Login attempt · "forgot password"' },
      { id: 'ss-m5-2', fromActor: 'scotia', toActor: 'telco', kind: 'sms', label: 'Password reset SMS to Tanya\'s number' },
      { id: 'ss-m5-3', fromActor: 'telco', toActor: 'fraudster', kind: 'sms', label: 'SMS delivered · to ported SIM', tooltip: 'Goes to fraudster\'s phone, not Tanya\'s', suspicious: true },
      { id: 'ss-m5-4', fromActor: 'fraudster', toActor: 'scotia', kind: 'http', label: 'Reset link clicked · new password set', suspicious: true },
    ],
    actorStateChanges: { 'tanya': 'compromised' },
    revealedSignalIds: ['sig-recent-port-event'],
  },

  /* Stage 6 — Transfer */
  {
    id: 'ss-stage-6',
    label: 'Transfer',
    title: 'J$1.2M transfer · 2:36 PM',
    caption: '2:36 PM, three minutes after the port. The fraudster initiates a J$1.2M transfer from Tanya\'s Scotia account to a new beneficiary. Scotia\'s system fires the OTP — to Tanya\'s number, which means to the fraudster\'s phone. OTP entered. Transfer authorized. Without bank-telco SIM-swap-API integration, Scotia\'s velocity rules see "login from new device" but not "number ported 47 minutes ago" — and the new-device login is just barely below the velocity threshold for a callback. The transfer clears in under 90 seconds.',
    durationMs: 8000,
    messages: [
      { id: 'ss-m6-1', fromActor: 'fraudster', toActor: 'scotia', kind: 'http', label: 'Initiate J$1.2M transfer · new beneficiary', suspicious: true },
      { id: 'ss-m6-2', fromActor: 'scotia', toActor: 'telco', kind: 'sms', label: 'OTP SMS · 482917' },
      { id: 'ss-m6-3', fromActor: 'telco', toActor: 'fraudster', kind: 'sms', label: 'OTP delivered to ported SIM', suspicious: true },
      { id: 'ss-m6-4', fromActor: 'fraudster', toActor: 'scotia', kind: 'http', label: 'OTP entered · transfer cleared', suspicious: true },
    ],
    revealedSignalIds: ['sig-recent-port-event', 'sig-new-device-fingerprint'],
  },

  /* Stage 7 — Cascade across accounts */
  {
    id: 'ss-stage-7',
    label: 'Cascade',
    title: 'Same hijacked number compromises 3 more accounts',
    caption: 'Over the next 90 minutes, the fraudster repeats the password-reset pattern against Tanya\'s Gmail (which she uses for personal and side-business correspondence), her Apple ID (which protects iCloud photos and her credit card), and her Sagicor pension portal. Each service trusts SMS-2FA. Each SMS routes to the fraudster\'s phone. Tanya\'s entire digital identity is being copied while she sits in her 3 PM meeting wondering when her phone signal will come back. The cascade is the structural lesson: SMS-2FA is a single point of failure across every service that uses it.',
    durationMs: 8000,
    messages: [
      { id: 'ss-m7-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Gmail · password reset · access gained' },
      { id: 'ss-m7-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Apple ID · password reset · access gained', suspicious: true },
      { id: 'ss-m7-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Sagicor pension portal · access gained', suspicious: true },
    ],
    revealedSignalIds: ['sig-cascade-across-accounts'],
  },

  /* Stage 8 — Realization + recovery */
  {
    id: 'ss-stage-8',
    label: 'Realization',
    title: '4:47 PM — Tanya borrows a phone',
    caption: '4:47 PM. Tanya\'s phone has been showing "No Service" for over two hours. After her meeting she borrows a colleague\'s phone to call Digicel. The Digicel agent confirms her number was ported to a new SIM at 2:33 PM today — at her request, the system shows. Tanya says she did not request anything. The agent escalates. Tanya then calls Scotia. Scotia confirms a J$1.2M transfer cleared at 2:38 PM, authorized via OTP. The recovery window has closed; the funds are dispersed. Five years later, the J$61M conviction case will show that Tanya\'s incident was one of dozens enabled by the same insider CSR ring.',
    durationMs: 9000,
    messages: [
      { id: 'ss-m8-1', fromActor: 'tanya', toActor: 'telco', kind: 'callback', label: '"My number — what happened?"', tooltip: '4:47 PM · borrowed colleague\'s phone' },
      { id: 'ss-m8-2', fromActor: 'telco', toActor: 'tanya', kind: 'callback', label: '"Ported at 2:33 PM at your request"' },
      { id: 'ss-m8-3', fromActor: 'tanya', toActor: 'scotia', kind: 'callback', label: '"What was the J$1.2M transfer?"' },
      { id: 'ss-m8-4', fromActor: 'scotia', toActor: 'tanya', kind: 'callback', label: '"Authorized via OTP at 2:38 PM"' },
    ],
    actorStateChanges: { 'tanya': 'aware', 'telco': 'investigating', 'scotia': 'investigating' },
    revealedSignalIds: ['sig-insider-port-anomaly', 'sig-cascade-across-accounts'],
    finalHeadline: 'Tanya did nothing wrong. Her password was strong. She did not click a phishing link, did not answer a vishing call, did not share an OTP. The J$61 million Jamaica conviction (October 2025) shows the actual attack surface: insider customer service representatives at the carrier, paid to bypass port-out verification. Five years of insider activity surfaced only when the FID-led investigation worked backward from victim disputes. The four detection controls above each break the kill chain at a different stage — but the most important architectural point is that no single institution (bank or telco) can defend SIM swap alone. SMS-2FA is a single point of failure spanning the customer\'s entire digital identity. Migration to authenticator apps or FIDO2 passkeys, plus bank-telco SIM-swap-API integration, plus carrier insider-action monitoring, is the institutional defense. Customer "vigilance" is not.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const SIMSWAP_META = {
  techId: 'T1451',
  techName: 'SIM Card Swap',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-tanya-scotia-simswap',
  scenarioContext: 'Ms. Tanya Ricketts, Scotia JM customer in Portmore, age 34, marketing coordinator, single mother of two. SIM swap victim — did nothing wrong. Strong password, careful with phishing, did not share OTP. Compromised entirely via insider CSR at Digicel. The animation grounds in the J$61 million Jamaica conviction (Corporate Area Parish Court, October 2025; sentencing November 6, 2025) where two of three convicted were telco customer service representatives. Distinct character role from existing roster: Allison Brown (mule recruitment scenario (SC007), recruited mule), Marcia Edwards (legitimate vendor in Structuring (F1087)), Trevor Bennett (structurer in Structuring (F1087)), Marcus Walters (3DS Bypass (F1076) victim, deferred), Beverly Williams (phishing victim in Phishing (F1081)), Devon Henry (vishing victim in Vishing (F1088)). Tanya represents the demographic that "stronger passwords" advice fails — her credential hygiene was already strong; her vulnerability was structural to SMS-2FA + insider co-conspirators.',
  totalDurationMs: 60000,
  stageCount: 8,
}


export default {
  meta: SIMSWAP_META,
  engine: 'multi-actor-sequence',
  stages: SIMSWAP_STAGES,
  controls: SIMSWAP_CONTROLS,
  signals: SIMSWAP_SIGNALS,
  actors: SIMSWAP_ACTORS,
}
