/**
 * vishingScenes.jsx — v25.7.0.13
 *
 * Scene data for the Vishing (F1088) technique animation under
 * Initial Access (TA0001).
 *
 * Real-world anchor: Caribbean vishing pattern documented across
 * BOJ Financial Stability Reports, JCF Fraud Squad investigations,
 * Bahamas Tribune coverage of Jamaican-perpetrated cross-border
 * cyber scams. The pattern: live social engineering call from
 * "fraud officer" or "FID investigator" with caller-ID spoofed
 * to a known bank or government number. The fraudster cycles
 * through authority claims, urgency framing, and isolation
 * tactics ("don't hang up, don't call your bank, don't tell
 * anyone — they could be involved"). Different from phishing:
 * the attacker IS the social engineering surface, adapting in
 * real-time to victim resistance.
 *
 * Pedagogical insight (locked):
 *   Vishing works on sophisticated victims because the script is
 *   calibrated to their sophistication. The educated, skeptical
 *   business owner is more vulnerable to a well-crafted authority
 *   call than the elderly retiree, because the script anticipates
 *   skepticism and addresses it ("we know you're careful, that's
 *   why we're calling YOU first"). The trainee who thinks "I'd
 *   never fall for that" is the trainee who needs this animation
 *   most. Bank staff who recognize the vishing kill chain in
 *   customer dispute reports recover faster than those who treat
 *   it as user error.
 *
 * Character: Mr. Devon Henry — small business owner in Montego Bay,
 * age 42, runs a hardware/auto-parts shop, JNCB business banking
 * customer. Holds a J$8M business operating account. Married,
 * two children. Devon is professionally active, used to making
 * fast decisions, and would describe himself as "skeptical of
 * scams." The fraudster's script is calibrated to exactly that
 * profile.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Real-world training, not sheltered. Vishing works because
 *   it exploits the legitimate authority claims of real
 *   institutions — FID, JCF Fraud Squad, bank fraud-ops teams.
 *   The animation surfaces the actual call structure used in
 *   the field so trainees recognize it when they hear customers
 *   describe it. Staff who understand HOW the call worked can
 *   help the customer reconstruct what the fraudster knew vs.
 *   guessed, which is critical for both fraud-recovery
 *   operations and follow-up customer protection.
 */


/* ─── Actors: 4-actor multi-actor sequence ──────────────────── */
export const VISHING_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster',
    role: '"FID Investigator Officer Reid"',
    initialState: 'active',
  },
  {
    id: 'devon',
    name: 'Mr. Devon Henry',
    role: 'JNCB business customer · Montego Bay · age 42',
    initialState: 'unaware',
  },
  {
    id: 'jncb',
    name: 'JNCB Jamaica',
    role: 'Bank · business account systems',
    initialState: 'silent',
  },
  {
    id: 'spoofed-fid',
    name: 'FID identity (impersonated)',
    role: 'Real institution being claimed',
    initialState: 'silent',
  },
]


/* ─── Detection controls (4 real + 1 naive) ─────────────────── */
export const VISHING_CONTROLS = [
  {
    id: 'ctrl-callback-protocol',
    label: 'Customer callback protocol',
    meta: 'Bank trains customers: "If anyone calls claiming to be from JNCB, the FID, the JCF, or any official body — hang up and call us back on the number on the back of your card." Removes caller-ID trust from the customer\'s decision. Catches stages 2-3 if customer recognizes the cue and calls back rather than continuing the call.',
    naive: false,
    revealsAtStages: [2, 3, 5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'recognition opportunities',
  },
  {
    id: 'ctrl-otp-no-disclosure',
    label: 'Never-share-OTP customer training',
    meta: 'Customer is trained: "JNCB will never call you and ask for an OTP. If anyone — even a JNCB employee — asks for an OTP over the phone, that is a fraud signal." Devon receives the OTP at stage 6 and reads it to the caller. This control catches the moment of OTP disclosure if Devon recognizes the trained pattern.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'OTP disclosure events',
  },
  {
    id: 'ctrl-out-of-band-verification',
    label: 'Out-of-band verification for high-risk transfers',
    meta: 'Bank requires callback to a number-on-file for any business transfer above J$2M to a new beneficiary. Devon\'s J$5.8M transfer to "the secure holding account" would trigger an automated callback to his registered mobile — except the fraudster has scripted Devon to expect this and stay on the original line ("they will call you to verify; tell them yes"). Catches at stage 7 if the callback agent asks the right verification question.',
    naive: false,
    revealsAtStages: [7],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'callback verifications',
  },
  {
    id: 'ctrl-anomaly-monitoring',
    label: 'Behavioral anomaly monitoring on business accounts',
    meta: 'Detects deviation from established business banking patterns. Devon\'s shop has a 4-year baseline of supplier payments to known beneficiaries (auto-parts wholesalers, utilities, payroll). A J$5.8M transfer to a brand-new beneficiary — never seen before — is a hard outlier even before factoring in the timing and amount. Catches at stage 7.',
    naive: false,
    revealsAtStages: [7],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'baseline deviations',
  },
  {
    id: 'ctrl-naive-customer-vigilance',
    label: 'Customers should know not to talk to scammers',
    meta: 'The institutional posture that vishing victims are "naive" or "careless." Doesn\'t work because vishing scripts are specifically calibrated to sophisticated victims — the script anticipates skepticism, simulates authority documentation, and isolates the victim from verification channels. Devon is a professional business owner with 4 years of clean banking history; he is not naive. The script worked because it was designed to work on people exactly like him. The "vigilance" framing puts the institutional burden on customers and removes responsibility from bank-side controls (callback verification, behavioral monitoring, OTP customer-training).',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Vishing scripts are calibrated to sophisticated victims; the educated business owner is the target profile, not the exception. Real defense is institution-side controls (callback verification, behavioral monitoring) operating regardless of customer behavior. The bank\'s regulatory obligation does not transfer to the customer.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const VISHING_SIGNALS = [
  {
    id: 'sig-spoofed-caller-id',
    label: 'Spoofed caller-ID claiming to be FID',
    description: 'The call displays "FID — 876-554-XXXX" on Devon\'s phone. The real FID number is publicly listed; the spoof matches it exactly. Caller-ID is not authenticated on standard mobile networks and is trivial to spoof using VOIP tools widely sold in the Smishing Triad-style kit ecosystem. Recognition pattern: any inbound call claiming to be from a financial regulator should trigger a callback-on-known-number rather than treating the displayed number as proof of identity.',
    revealedBy: 'ctrl-callback-protocol',
  },
  {
    id: 'sig-isolation-script',
    label: 'Isolation language: "do not hang up, do not call your bank"',
    description: 'The fraudster\'s script explicitly instructs Devon to stay on the line and not call JNCB independently — claiming bank staff "may be involved in the breach we\'re investigating." This isolation pattern is the hallmark of vishing. Real investigators never instruct a victim to bypass their bank\'s callback verification. Recognition pattern: any caller asking the customer NOT to verify independently is the strongest single vishing signal.',
    revealedBy: 'ctrl-callback-protocol',
  },
  {
    id: 'sig-otp-request-during-call',
    label: 'Caller requesting OTP read aloud',
    description: 'JNCB will never call a customer and ask them to read an OTP code over the phone. The OTP is, by design, the second factor that the customer alone holds — the bank already knows the first factor (account credentials). A live caller asking for the OTP is requesting Devon to defeat his own 2FA. This is the textbook OTP-disclosure attack and the strongest control point in the vishing kill chain.',
    revealedBy: 'ctrl-otp-no-disclosure',
  },
  {
    id: 'sig-callback-conditioning',
    label: 'Customer pre-conditioned to expect callback verification',
    description: 'The script trains Devon: "JNCB security will call you in a moment to verify the protective transfer. Tell them you authorized it — that\'s how we know it\'s really you." Devon thinks the callback is part of the official process. When the real out-of-band callback comes, he confirms the transfer he was tricked into authorizing. The callback control fails because the script anticipated and weaponized it.',
    revealedBy: 'ctrl-out-of-band-verification',
  },
  {
    id: 'sig-baseline-deviation',
    label: 'J$5.8M to brand-new beneficiary breaks 4-year baseline',
    description: 'Devon\'s shop banking pattern: ~30 transfers per month, all to ~12 known supplier/utility/payroll beneficiaries, average J$120K, max ever J$1.4M. A J$5.8M transfer to a beneficiary added 3 minutes ago is a 4× baseline-max anomaly going to an entity with zero history. Behavioral anomaly monitoring on business accounts surfaces this in real-time without any other signal.',
    revealedBy: 'ctrl-anomaly-monitoring',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const VISHING_STAGES = [
  /* Stage 1 — Reconnaissance */
  {
    id: 'vh-stage-1',
    label: 'Reconnaissance',
    title: 'Fraudster builds Devon\'s profile from public sources',
    caption: 'Day 0 of the operation. Before calling, the fraudster crew profiles Devon from public sources: business directory entry for Henry Auto Parts, his LinkedIn (4 years at JNCB business banking — visible in his "About" page mentioning his banking relationship), his phone number from the shop\'s website. The script is then calibrated specifically: "Mr. Henry, this is regarding your JNCB business operating account at Montego Bay branch."',
    durationMs: 5500,
    messages: [
      { id: 'vh-m1-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'OSINT: shop website + LinkedIn + business directory' },
      { id: 'vh-m1-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Script calibration: JNCB business · Montego Bay · 4yr customer' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — The call comes in */
  {
    id: 'vh-stage-2',
    label: 'The call',
    title: 'Caller-ID shows "FID — 876-554-XXXX"',
    caption: 'Tuesday, 10:47 AM. Devon\'s phone rings during the morning rush at the shop. Caller-ID displays "FID — 876-554-XXXX." Devon recognizes FID — Financial Investigations Division, the agency that handles money laundering reports. He answers. The voice is calm, professional: "Mr. Henry? This is Officer Marlon Reid from the Financial Investigations Division. I\'m calling about activity on your JNCB business account that I need to discuss with you urgently."',
    durationMs: 6500,
    messages: [
      { id: 'vh-m2-1', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: 'Inbound call', tooltip: 'Caller-ID: "FID — 876-554-XXXX" (SPOOFED)', suspicious: true },
      { id: 'vh-m2-2', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Officer Reid, FID. Activity on your JNCB account."',
        audio: { text: 'Mister Henry. Officer Reid, Financial Investigations Division. Urgent activity on your JNCB account.', profile: 'authority' } },
    ],
    actorStateChanges: { 'devon': 'targeted' },
    revealedSignalIds: ['sig-spoofed-caller-id'],
  },

  /* Stage 3 — Authority + urgency + isolation */
  {
    id: 'vh-stage-3',
    label: 'Authority + isolation',
    title: 'The script anticipates skepticism',
    caption: 'The fraudster offers to verify his identity: "You can hang up and call FID directly to confirm I\'m a real officer." Devon almost does — but the fraudster continues: "However, our investigation is at a sensitive stage. We have reason to believe a JNCB employee may be involved in the fraud ring we\'re tracking. If you call JNCB directly, you may tip them off and we lose the suspect. I need your discretion for the next 15 minutes." The skepticism handling is designed for sophisticated victims. Devon stays on the line.',
    durationMs: 11000,
    messages: [
      { id: 'vh-m3-1', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"You can verify with FID — but bank may be compromised."', tooltip: 'Isolation script — designed to defeat callback', suspicious: true,
        audio: { text: 'You can call FID to confirm me. But a JNCB employee may be involved.', profile: 'authority' } },
      { id: 'vh-m3-2', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"15 minutes of your discretion to catch the suspect."',
        audio: { text: 'Fifteen minutes of discretion. Call the bank, we lose the suspect.', profile: 'authority' } },
    ],
    revealedSignalIds: ['sig-isolation-script'],
  },

  /* Stage 4 — The pretext */
  {
    id: 'vh-stage-4',
    label: 'The pretext',
    title: '"Funds will be moved to a protected holding account"',
    caption: 'The fraudster explains the pretext: "Mr. Henry, J$5.8 million is about to be fraudulently transferred out of your account. We\'ve been monitoring this for 48 hours. To protect your funds during the investigation, FID will move the J$5.8 million to a protected holding account in your name. The funds will be returned within 48 hours after we close the case." This sounds plausible. Devon\'s account does hold roughly that amount. He asks how the protection works.',
    durationMs: 10500,
    messages: [
      { id: 'vh-m4-1', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"J$5.8M will be fraudulently transferred — we\'ll protect it."', suspicious: true,
        audio: { text: 'Five point eight million is about to be fraudulently transferred. FID will move it to a protected account.', profile: 'authority' } },
      { id: 'vh-m4-2', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Holding account in your name · 48-hour return"',
        audio: { text: 'Returned within forty-eight hours.', profile: 'authority' } },
    ],
    revealedSignalIds: ['sig-isolation-script'],
  },

  /* Stage 5 — The transfer instruction */
  {
    id: 'vh-stage-5',
    label: 'The instruction',
    title: '"Log into JNCB online banking. I\'ll guide you."',
    caption: 'The fraudster directs Devon to log into JNCB online banking on his phone while staying on the call. "Don\'t put me on speaker — your phone\'s microphone needs to stay clean for the recording." Devon logs in. The fraudster reads beneficiary details aloud: "Beneficiary name: JNCB Asset Protection Trust. Account number: 8841-7720-3349. Amount: five million eight hundred thousand Jamaican dollars." Devon enters the details. The fraudster\'s voice stays calm and procedural — exactly like a real official walking someone through a legitimate process.',
    durationMs: 10500,
    messages: [
      { id: 'vh-m5-1', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Log into JNCB. Stay on the call."',
        audio: { text: 'Log into JNCB. Stay on the call.', profile: 'authority' } },
      { id: 'vh-m5-2', fromActor: 'devon', toActor: 'jncb', kind: 'http', label: 'JNCB online banking login', tooltip: 'Devon\'s legitimate session' },
      { id: 'vh-m5-3', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Beneficiary: JNCB Asset Protection Trust · 8841-7720-3349"', suspicious: true,
        audio: { text: 'Beneficiary: JNCB Asset Protection Trust. Account: eight eight four one. Amount: five point eight million.', profile: 'authority' } },
      { id: 'vh-m5-4', fromActor: 'devon', toActor: 'jncb', kind: 'http', label: 'Add beneficiary · J$5.8M transfer initiated' },
    ],
    actorStateChanges: { 'devon': 'compromised' },
    revealedSignalIds: ['sig-isolation-script'],
  },

  /* Stage 6 — OTP capture */
  {
    id: 'vh-stage-6',
    label: 'OTP disclosure',
    title: 'Devon reads the OTP aloud',
    caption: 'JNCB\'s real system sends an OTP to Devon\'s phone for the J$5.8M transfer authorization. Devon\'s phone shows the SMS: "JNCB: 738291 is your one-time code. NEVER share this code with anyone, including JNCB staff." Devon reads the warning. He pauses. The fraudster says: "Yes, I see — that warning is for protection against external scams. Since I\'m FID, not JNCB staff, the warning doesn\'t apply. Read me the six digits." Devon reads: "738291." The fraudster confirms the transfer on the JNCB session, which the fraudster has been controlling via screen-share request that Devon approved earlier in the call without realizing what it was.',
    durationMs: 14000,
    messages: [
      { id: 'vh-m6-1', fromActor: 'jncb', toActor: 'devon', kind: 'sms', label: 'OTP: 738291 · "NEVER share this code"',
        audio: { text: 'JNCB. Code seven three eight two nine one. Never share this code.', profile: 'system' } },
      { id: 'vh-m6-2', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"That warning is for external scams. Read me the six digits."', suspicious: true,
        audio: { text: 'That warning is for external scams. I am FID. Read me the six digits.', profile: 'authority' } },
      { id: 'vh-m6-3', fromActor: 'devon', toActor: 'fraudster', kind: 'callback', label: '"Seven three eight two nine one"',
        audio: { text: 'Seven three eight two nine one.', profile: 'victimMale' } },
      { id: 'vh-m6-4', fromActor: 'fraudster', toActor: 'jncb', kind: 'http', label: 'OTP entered · transfer authorized', suspicious: true },
    ],
    revealedSignalIds: ['sig-otp-request-during-call'],
  },

  /* Stage 7 — Callback control bypass */
  {
    id: 'vh-stage-7',
    label: 'Callback weaponized',
    title: 'JNCB\'s out-of-band callback gets defeated by the script',
    caption: 'JNCB\'s velocity rules trigger: J$5.8M to a never-before-seen beneficiary on a business account. The system places an automated callback to Devon\'s registered mobile. Devon\'s second line rings. The fraudster\'s script anticipated this: "Mr. Henry, JNCB security will call you to verify. Tell them YES, you authorized the protective transfer. That\'s how the system confirms it\'s really you." The JNCB callback agent asks: "Mr. Henry, did you authorize a transfer of J$5.8 million to JNCB Asset Protection Trust?" Devon says yes. The agent releases the hold. The transfer clears. Funds disperse.',
    durationMs: 11000,
    messages: [
      { id: 'vh-m7-1', fromActor: 'jncb', toActor: 'devon', kind: 'callback', label: 'Automated callback · "Did you authorize J$5.8M transfer?"',
        audio: { text: 'JNCB security. Did you authorize a transfer of five point eight million?', profile: 'investigator' } },
      { id: 'vh-m7-2', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Tell them YES — that confirms your identity."', suspicious: true,
        audio: { text: 'Tell them yes. That confirms your identity.', profile: 'authority' } },
      { id: 'vh-m7-3', fromActor: 'devon', toActor: 'jncb', kind: 'callback', label: '"Yes, I authorized it."',
        audio: { text: 'Yes. I authorized it.', profile: 'victimMale' } },
      { id: 'vh-m7-4', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Callback verification passed · transfer cleared', suspicious: true },
    ],
    revealedSignalIds: ['sig-callback-conditioning', 'sig-baseline-deviation'],
  },

  /* Stage 8 — Realization */
  {
    id: 'vh-stage-8',
    label: 'Realization',
    title: '"Don\'t worry about anything else for the next 48 hours"',
    caption: 'The fraudster wraps up: "Mr. Henry, the protective transfer is complete. Your funds are secure. FID will return them within 48 hours after the case is closed. You\'ll receive a confirmation email from FID this evening. Do not contact JNCB about this — it would compromise the investigation. Have a good day." Devon hangs up. He gets back to the morning rush. Three days later, no funds returned, no email arrived. Devon calls JNCB to ask about the J$5.8M. JNCB confirms the transfer cleared, signed off via callback verification by Devon himself. The funds are gone. The shop\'s operating cash flow is gone. Devon employs 6 people.',
    durationMs: 12000,
    messages: [
      { id: 'vh-m8-1', fromActor: 'fraudster', toActor: 'devon', kind: 'callback', label: '"Don\'t contact JNCB · 48-hour return · confirmation tonight"',
        audio: { text: 'Transfer complete. Returned in forty-eight hours. Do not contact JNCB.', profile: 'authority' } },
      { id: 'vh-m8-2', fromActor: 'devon', toActor: 'jncb', kind: 'callback', label: '"Where is my J$5.8M? It\'s been 3 days."', tooltip: 'Day +3 · funds dispersed',
        audio: { text: 'Where is my five point eight million? Three days now.', profile: 'victimMale' } },
      { id: 'vh-m8-3', fromActor: 'jncb', toActor: 'devon', kind: 'callback', label: '"Your callback authorization cleared the transfer."',
        audio: { text: 'Your callback authorization cleared the transfer.', profile: 'investigator' } },
    ],
    actorStateChanges: { 'devon': 'aware', 'jncb': 'investigating' },
    revealedSignalIds: ['sig-callback-conditioning', 'sig-baseline-deviation'],
    finalHeadline: 'Devon is not naive. He is a 4-year clean-history JNCB business customer who runs a shop and employs six people. The vishing script worked because it was calibrated to exactly his profile — sophisticated, busy, used to dealing with officials, capable of skepticism that the script anticipated and defeated. Each of the four detection controls above could break the kill chain at a different stage. The bank\'s callback verification got weaponized by the script — meaning that one control alone is insufficient. Layered controls + customer training that includes "no real official will ask you to bypass your bank\'s callback" is the institutional defense. Calling Devon naive is not the answer.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const VISHING_META = {
  techId: 'F1088',
  techName: 'Vishing',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-devon-jncb-vishing',
  scenarioContext: 'Mr. Devon Henry, JNCB business customer in Montego Bay, age 42, runs Henry Auto Parts (hardware/auto parts shop). 4-year banking relationship, J$8M business operating account. Married, two children. Vishing victim — sophisticated, professionally active, would describe himself as skeptical of scams. The fraudster\'s script is calibrated to exactly that profile. Distinct character role from Allison Brown (mule recruitment scenario (SC007), recruited mule), Marcia Edwards (legitimate vendor in Structuring (F1087)), Trevor Bennett (structurer in Structuring (F1087)), Marcus Walters (3DS Bypass (F1076) victim, deferred), and Beverly Williams (phishing victim in Phishing (F1081)).',
  totalDurationMs: 81000,
  stageCount: 8,
}


export default {
  meta: VISHING_META,
  engine: 'multi-actor-sequence',
  stages: VISHING_STAGES,
  controls: VISHING_CONTROLS,
  signals: VISHING_SIGNALS,
  actors: VISHING_ACTORS,
}
