/**
 * phishingScenes.jsx — v25.7.0.12
 *
 * Scene data for the Phishing (F1081) technique animation under
 * Initial Access (TA0001).
 *
 * Real-world anchor: NCB J$47.5M phishing case, April-June 2022.
 * 16 NCB customer accounts compromised; over J$47M siphoned via
 * fraudulent transfers; funds dispersed across beneficiary accounts
 * and withdrawn before intervention. Suspects arrested by MOCA in
 * 2024-2025 included a JDF soldier and a policeman in the connected
 * smishing operation. NCB's response in October 2023 was to suspend
 * SMS transaction alerts entirely rather than secure the messaging
 * channel — a real public executive decision that the animation
 * surfaces in stage 7. Reference: WiredJA "Click, Send, Gone"
 * investigation, Jamaica Observer MOCA arrest reports.
 *
 * Smishing kit context: Smishing Triad's "Lighthouse" kit, sold via
 * Telegram channel laowang_notice (March 2025), specifically
 * geo-targets countries including Jamaica (876 prefix) and supports
 * 300+ "front desk staff" worldwide for fraud workflow. Caribbean
 * fraud ops are connected to global criminal infrastructure economy.
 * Reference: Silent Push Smishing Triad research.
 *
 * Pedagogical insight (locked):
 *   Caribbean banking phishing has a recognizable Caribbean signature.
 *   Jamaican phishing campaigns aren't generic global phishing — they
 *   target NCB / JNCB / Scotia JM / CIBC by name; reference J$ amounts;
 *   spoof local bank phone numbers; arrive from 876-prefix numbers or
 *   international SMS gateways. Tellers and analysts who recognize the
 *   Caribbean signature catch attacks earlier. The animation teaches
 *   the recognition skill specifically calibrated to what Caribbean
 *   bank staff actually see when customers walk in to dispute.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive animation coverage; real-world training, not
 *   sheltered. The bank executives publicly framing customer behavior
 *   as the problem ("customers are exposing themselves" — Dane
 *   Nicholson, Jamaica Bankers Association anti-fraud chair) is
 *   surfaced as the naive control with an explicit pedagogical
 *   counter. The bank's reputation and regulatory obligation depend
 *   on customers trusting the institution's communications channels.
 */


/* ─── Actors: 4-actor multi-actor sequence ────────────────────── */
export const PHISHING_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Smishing Triad kit operator',
    initialState: 'active',
  },
  {
    id: 'beverly',
    name: 'Mrs. Beverly Williams',
    role: 'NCB customer · Spanish Town · age 58',
    initialState: 'unaware',
  },
  {
    id: 'ncb',
    name: 'NCB Jamaica',
    role: 'Bank · login + transfer systems',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'Mule beneficiary chain',
    role: '23 dispersion accounts',
    initialState: 'silent',
  },
]


/* ─── Detection controls (4 real + 1 naive) ─────────────────── */
export const PHISHING_CONTROLS = [
  {
    id: 'ctrl-customer-hygiene',
    label: 'Customer info-hygiene training',
    meta: 'Trains customers to recognize phishing patterns: typosquat domains, urgency framing, requests for OTP codes. Trains them to call the bank on a known number rather than clicking links. Catches stages 3-4 if customer recognizes the smishing.',
    naive: false,
    revealsAtStages: [3, 4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'recognition opportunities',
  },
  {
    id: 'ctrl-login-anomaly',
    label: 'Real-time login-anomaly monitoring',
    meta: 'Detects login from new device + new IP + within seconds of OTP delivery to a different device. Beverly\'s legitimate phone receives the OTP; the attacker enters it from a different location 60 seconds later. Strong impossible-travel signal.',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'anomalous logins',
  },
  {
    id: 'ctrl-velocity-rules',
    label: 'Outbound transfer velocity rules',
    meta: 'Holds transfers above J$1M (or any large transfer to a new beneficiary added within the last 24 hours) for callback verification. Beverly\'s J$2.4M transfer to a 30-day-old NCB account would have been held for callback. Catches stage 6.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'high-risk transfers',
  },
  {
    id: 'ctrl-sms-alert-system',
    label: 'Active SMS alert system',
    meta: 'Real-time SMS notification on every transfer. NCB suspended this in October 2023 rather than secure their messaging channel. With it active, Beverly receives the alert AT 4:21 PM, can call NCB within minutes, and the transfer chain can be reversed before mules withdraw cash. Without it, she discovers the loss the next day.',
    naive: false,
    revealsAtStages: [6, 7],
    catchCount: 1,
    catchTotal: 2,
    catchUnit: 'detection windows',
  },
  {
    id: 'ctrl-naive-customer-blame',
    label: 'Customers should know not to click suspicious links',
    meta: '"Customers are exposing themselves" framing publicly used by the Jamaica Bankers Association anti-fraud committee. Treats customer fallibility as the problem; positions training and vigilance as the customer\'s responsibility while removing institution detection capability. Doesn\'t work because phishing kits are sophisticated and legitimate-looking; the bank\'s reputation depends on customers trusting the bank\'s communications channels. The alternative — customers opening every NCB SMS in fear — is itself a brand failure.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Blames the customer for institutional security failure. The Smishing Triad kit (used in J$47.5M NCB case) renders identical NCB login pages — visual recognition is not a reliable defense. Real defense is institution-side detection and active fraud-monitoring systems, which is the bank\'s regulatory obligation.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const PHISHING_SIGNALS = [
  {
    id: 'sig-typosquat-domain',
    label: 'Typosquat domain (ncb-secure.live vs jncb.com)',
    description: 'The smishing message links to ncb-secure.live — a typosquat. The legitimate NCB Jamaica online banking domain is jncb.com. URL inspection by trained customers, or domain-reputation checking by browser security, would catch this. Smishing Triad rotates ~25,000 domains per 8-day window to stay ahead of blocklists.',
    revealedBy: 'ctrl-customer-hygiene',
  },
  {
    id: 'sig-urgency-language',
    label: 'Urgency + verify-or-lose-account language',
    description: 'The smishing message uses the pattern: "Unusual login from Kingston. Verify in 30 minutes or account will be locked." Real NCB security communications never give a deadline that pressures action. Recognition signature for trained customers.',
    revealedBy: 'ctrl-customer-hygiene',
  },
  {
    id: 'sig-impossible-travel',
    label: 'OTP entered from different IP within seconds',
    description: 'Beverly\'s legitimate phone (Digicel, Spanish Town tower) receives the OTP at 4:18:47 PM. The OTP is then entered on the NCB login page from an IP geolocating to St. Petersburg, Russia at 4:19:42 PM — 55 seconds later. Impossible-travel signal that real-time login-anomaly monitoring catches.',
    revealedBy: 'ctrl-login-anomaly',
  },
  {
    id: 'sig-rapid-large-transfer-new-beneficiary',
    label: 'J$2.4M transfer to new beneficiary within 60s of login',
    description: 'Account login at 4:19:42 PM; J$2.4M transfer initiated at 4:20:35 PM (53 seconds after login); recipient is an NCB account created 30 days ago with no organic transaction history. Velocity rules would hold this transfer pending Beverly callback verification. Held funds are recoverable; cleared funds are not.',
    revealedBy: 'ctrl-velocity-rules',
  },
  {
    id: 'sig-no-customer-notification',
    label: 'No transfer notification to Beverly\'s phone',
    description: 'Without active SMS alert system, Beverly has no signal anything is wrong until she logs in next day. Active SMS alerts at the time of transfer give her a ~5 minute window to call NCB and stop the transfer chain. NCB removed this customer detection capability in October 2023.',
    revealedBy: 'ctrl-sms-alert-system',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const PHISHING_STAGES = [
  /* Stage 1 — Smishing kit purchase */
  {
    id: 'ph-stage-1',
    label: 'Smishing kit purchase',
    title: 'The fraudster acquires the infrastructure',
    caption: 'Day 0 of the operation. The fraudster crew purchases a Smishing Triad-style "Lighthouse" kit via Telegram (publicly documented sales channels). The kit includes NCB-targeting phishing templates, ~25,000 rotating typosquat domains, and access to "front desk staff" who handle fraud workflow. Cost: a few hundred USD. The kit is software-as-a-service for fraud.',
    durationMs: 5000,
    messages: [
      { id: 'm1-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Purchase Smishing Triad kit · NCB template' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Bulk SMS broadcast */
  {
    id: 'ph-stage-2',
    label: 'Bulk SMS broadcast',
    title: '50,000 messages to 876-prefix numbers',
    caption: 'The kit broadcasts the phishing SMS to ~50,000 Jamaican mobile numbers (876 area code). The geo-targeting is precise: only Jamaican numbers, only on weekday afternoons when working customers are most likely to engage. Beverly is one recipient; thousands of others get the same message. The kit\'s "front desk staff" stand by to handle responses.',
    durationMs: 5000,
    messages: [
      { id: 'm2-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Broadcast to 50,000 numbers · 876 prefix targeting' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 3 — The message arrives */
  {
    id: 'ph-stage-3',
    label: 'The message arrives',
    title: 'Beverly receives the smishing SMS at 4:17 PM',
    caption: 'Tuesday afternoon, 4:17 PM. Beverly\'s phone buzzes. SMS from "NCB-ALERT": "Unusual login from Kingston. Verify in 30 minutes or account will be locked. ncb-secure.live/verify". The message format mirrors real NCB security SMS exactly. The 30-minute deadline triggers urgency. Beverly is in a grocery store; she clicks while walking to her car.',
    durationMs: 6000,
    messages: [
      { id: 'm3-1', fromActor: 'fraudster', toActor: 'beverly', kind: 'sms', label: '"NCB ALERT: Unusual login. Verify in 30 min."', tooltip: 'ncb-secure.live/verify · TYPOSQUAT', suspicious: true },
    ],
    actorStateChanges: { 'beverly': 'targeted' },
    revealedSignalIds: ['sig-typosquat-domain', 'sig-urgency-language'],
  },

  /* Stage 4 — The clone site */
  {
    id: 'ph-stage-4',
    label: 'The clone site',
    title: 'Visual clone harvests credentials',
    caption: 'Beverly clicks the link. The page loads. NCB Jamaica branding, NCB color scheme, NCB layout — pixel-perfect clone. She enters her NCB username and password. The page shows a "verifying..." spinner. In reality, her credentials have just been transmitted to the fraudster. The page now requests her one-time code, claiming "additional verification".',
    durationMs: 7000,
    messages: [
      { id: 'm4-1', fromActor: 'beverly', toActor: 'fraudster', kind: 'http', label: 'Username + password submitted', tooltip: 'to ncb-secure.live (clone)', suspicious: true },
    ],
    actorStateChanges: { 'beverly': 'compromised' },
    revealedSignalIds: ['sig-typosquat-domain'],
  },

  /* Stage 5 — OTP harvest */
  {
    id: 'ph-stage-5',
    label: 'OTP harvest',
    title: 'Real OTP captured and replayed within 60 seconds',
    caption: 'The fraudster pivots to the real NCB site, attempts login with Beverly\'s credentials. NCB sends the OTP to Beverly\'s real phone at 4:18:47 PM. Beverly, still on the clone site, receives the OTP and dutifully enters it into the "additional verification" field. The fraudster captures the OTP and enters it on the real NCB site at 4:19:42 PM — 55 seconds later. Authenticated session established from a Russian IP.',
    durationMs: 6000,
    messages: [
      { id: 'm5-1', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'Login with Beverly\'s credentials', suspicious: true },
      { id: 'm5-2', fromActor: 'ncb', toActor: 'beverly', kind: 'sms', label: 'OTP: 384719 (legitimate)', tooltip: 'sent 4:18:47 PM' },
      { id: 'm5-3', fromActor: 'beverly', toActor: 'fraudster', kind: 'http', label: 'OTP entered on clone site' },
      { id: 'm5-4', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'OTP replay · session established', tooltip: '4:19:42 PM · 55s after delivery', suspicious: true },
    ],
    revealedSignalIds: ['sig-impossible-travel'],
  },

  /* Stage 6 — Funds transfer cascade */
  {
    id: 'ph-stage-6',
    label: 'Transfer cascade',
    title: 'J$2.4M moves out in 47 seconds',
    caption: 'Authenticated as Beverly, the fraudster initiates a J$2.4M transfer to "Beneficiary Account #1" — an NCB account created 30 days ago. Transfer initiated at 4:20:35 PM. Without velocity rules holding the transfer for callback, it processes immediately. Within minutes the funds bounce through Beneficiary #2, #3, and onward into the 23-account dispersion network documented in the actual NCB J$47.5M case.',
    durationMs: 6000,
    messages: [
      { id: 'm6-1', fromActor: 'fraudster', toActor: 'ncb', kind: 'http', label: 'Initiate J$2.4M transfer to Beneficiary #1', suspicious: true },
      { id: 'm6-2', fromActor: 'ncb', toActor: 'mule', kind: 'transfer', label: 'J$2.4M · cleared', tooltip: '4:20:35 PM · no velocity hold', suspicious: true },
      { id: 'm6-3', fromActor: 'mule', toActor: 'mule', kind: 'transfer', label: 'Disperse across 23 accounts', suspicious: true },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: ['sig-rapid-large-transfer-new-beneficiary', 'sig-no-customer-notification'],
  },

  /* Stage 7 — The 90-minute aftermath */
  {
    id: 'ph-stage-7',
    label: 'The aftermath',
    title: 'Beverly discovers the loss the next morning',
    caption: 'Without active SMS alerts (NCB suspended these in October 2023), Beverly has no notification anything is wrong. She drives home, has dinner, goes to bed. The next morning she logs in to NCB to pay a bill and sees the J$2.4M transfer. She calls NCB. By then the funds have been withdrawn from the dispersion accounts. NCB\'s position: she provided the OTP herself, so the bank has no liability. Beverly\'s position: the bank suspended the alert system that would have given her a chance to stop this. Both positions are documented in the actual NCB J$47.5M case.',
    durationMs: 6000,
    messages: [
      { id: 'm7-1', fromActor: 'beverly', toActor: 'ncb', kind: 'callback', label: 'Discovers loss · calls NCB', tooltip: 'Wednesday morning, ~16 hours later' },
      { id: 'm7-2', fromActor: 'ncb', toActor: 'beverly', kind: 'system', label: 'Funds already withdrawn · "you provided OTP yourself"' },
    ],
    actorStateChanges: { 'beverly': 'aware', 'ncb': 'investigating' },
    revealedSignalIds: ['sig-no-customer-notification'],
    finalHeadline: 'Beverly is not unique. The Smishing Triad-style kits used in the J$47.5M NCB case (April-June 2022) and the J$80M smishing operation (April 2022 – December 2023, eight NCB customers, 23 mule beneficiaries) compromise hundreds of Caribbean customers in similar flows. Each of the 4 detection controls above could break the kill chain at a different stage. NCB suspending SMS alerts removed one of the most important customer-side detection capabilities. Real defense requires institution-side controls operating at the bank\'s scale, not customer vigilance.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const PHISHING_META = {
  techId: 'F1081',
  techName: 'Phishing',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-beverly-ncb-phishing',
  scenarioContext: 'Mrs. Beverly Williams, NCB customer in Spanish Town, age 58, retired teacher. She is a phishing victim — not complicit, not careless within typical Caribbean banking customer norms, just targeted by a sophisticated kit-based campaign. The animation grounds in the documented NCB J$47.5M case (April-June 2022, 16 accounts compromised) and uses the Smishing Triad kit context (publicly documented via Silent Push research). Distinct character role from Allison Brown (mule recruitment scenario (SC007), recruited mule), Marcia Edwards (legitimate vendor in Structuring (F1087)), Trevor Bennett (structurer in Structuring (F1087)), and Marcus Walters (3DS Bypass (F1076) victim, deferred animation).',
  totalDurationMs: 41000,
  stageCount: 7,
}


export default {
  meta: PHISHING_META,
  engine: 'multi-actor-sequence',
  stages: PHISHING_STAGES,
  controls: PHISHING_CONTROLS,
  signals: PHISHING_SIGNALS,
  actors: PHISHING_ACTORS,
}
