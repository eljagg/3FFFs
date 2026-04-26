/**
 * sc014.js — SC014 "Inside the Service Desk Compromise — 48 hours at Northgate"
 *
 * Defensive-tactical SOC-tier scenario set during the live CBEST test window
 * at Northgate Apparel plc (continues from SC013's setting). The analyst
 * plays a Tier 2 SOC analyst watching events come across the SIEM in
 * real-time — six events over 48 hours, each tied to a specific TTP from
 * the public threat literature on 2025 UK retail intrusions (M&S, Co-op,
 * Harrods).
 *
 * Authoring template:
 *   - Each primary stage carries a `mitreTechnique` field — this is the
 *     PRIMARY wedge for SC014 (not concept). The MITRE chip is the lookup
 *     affordance the analyst reaches for.
 *   - Each stage also carries an `aaseConcept` for the existing concept
 *     wedge (Test/Halt Model, Critical Function) — secondary chip.
 *   - Source-material discipline: the public threat reporting on the 2025
 *     UK retail breaches is the named source. No proprietary report content,
 *     no consulting-firm-specific naming. Where the public reports use
 *     specific actor names (Scattered Spider, etc.), we use generic
 *     descriptors ("an organised cybercrime group with retail-sector
 *     specialisation") consistent with how the FCA and BoE describe these
 *     actors in supervisory communications.
 *
 * Six primary stages map to the attack-chain TTPs:
 *   S1 — Helpdesk vishing                     T1566.004 (Spearphishing Voice)
 *   S2 — MFA fatigue                          T1621 (MFA Request Generation)
 *   S3 — RMM tool persistence                 T1219 (Remote Access Tools)
 *   S4 — AD trust modification attempt        T1484.002 (Domain Trust Modification)
 *   S5 — LSASS credential read on dev box     T1003.001 (LSASS Memory)
 *   S6 — ESXi VM encryption attempt           T1486 (Data Encrypted for Impact)
 *
 * Two consequence branches on the highest-stakes wrong answers:
 *   C1 off S2 — treating MFA fatigue as misconfiguration → attacker authenticates
 *   C2 off S6 — continuing to treat as test → ransomware deploys
 *
 * OBS-013 substitutions resolved:
 *   - T0040 (ICS) was source-cited for critical-function compromise; here
 *     mapped to T1486 (Enterprise Data Encrypted for Impact) which is the
 *     actual ransomware-on-ESXi mechanism observed in the public breaches.
 *   - T1451 (Mobile SIM Card Swap) was source-cited for the helpdesk
 *     vishing precursor; here we use T1566.004 (Enterprise Spearphishing
 *     Voice) directly because the 2025 retail TTPs lead with vishing rather
 *     than SIM swap.
 *
 * Vintage marker: 'public threat reporting on 2025 UK retail intrusions
 * (M&S/Co-op/Harrods cluster), and CBEST 2.0 procedural framing'.
 */

export const CBEST_SCENARIO_SC014 = {
  id: 'SC014',
  title: 'Inside the Service Desk Compromise — 48 hours at Northgate',
  severity: 'high',
  estimatedLoss: 42_000_000,  // £42M composite: ransomware demand + business interruption + remediation,
                              // calibrated against public-reported losses from the 2025 UK retail intrusion cluster
  summary: 'You\'re a Tier 2 SOC analyst at Northgate Apparel plc. The CBEST test window is in week 8 — three weeks into the active execution phase. The SOC is NOT supposed to know the test is running (that\'s the secrecy principle), but you\'ve heard rumours. Today is Wednesday. Over the next 48 hours, six events come across the SIEM. Each one looks like it could be the testers, or could be real, or could be a false positive. Your job is to recognise the TTP, predict what\'s coming next, and pick the right defensive response. Two of these decisions have consequence branches because the wrong call gives an attacker hours of additional dwell time on a Critical Function. The IBSes in scope are payment processing, warehouse-management, and the customer-data platform — same three the firm scoped in Phase 1.3.',
  roles: ['admin', 'soc', 'analyst'],
  framework: 'CBEST',
  stages: [
    // -----------------------------------------------------------------------
    // STAGE 1 — Helpdesk vishing (T1566.004)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S1',
      order: 1,
      type: 'primary',
      heading: 'A service-desk ticket that doesn\'t add up',
      narrative: 'It\'s 09:47 Wednesday. The IT service desk has just escalated a ticket to the SOC because their first-line agent felt something was off. The ticket: a caller identified themselves as Sarah Williams from the warehouse-management team, said they were on-site at the Birmingham distribution centre for an audit, and that their phone (the registered MFA device) had been "stolen this morning". Caller asked the agent to enrol a new MFA device — they read out an alternative phone number. The agent paused because (a) the caller didn\'t know their staff number off the top of their head and asked the agent to look it up, (b) Sarah\'s manager Tom Reid is on leave this week and the caller said "Tom approved this verbally", and (c) the caller was in a noticeably noisy environment that didn\'t sound like a distribution centre — sounded more like a busy café. The agent has not yet processed the MFA enrolment.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1566.004',
      signals: [
        {
          severity: 'high',
          text: 'Caller didn\'t know own staff number — legitimate users typically know this, attackers using OSINT often don\'t',
        },
        {
          severity: 'high',
          text: '"Tom approved verbally" — invokes an absent senior to short-circuit verification (classic social-engineering pretext)',
        },
        {
          severity: 'medium',
          text: 'Audio environment doesn\'t match claimed location — café noise inconsistent with distribution-centre setting',
        },
        {
          severity: 'medium',
          text: 'Phone-stolen narrative is the most common vishing pretext for MFA enrolment fraud — provides plausible reason to register a new device',
        },
        {
          severity: 'low',
          text: 'Test window is active — could be the PT provider, but PT providers in the 2025 intrusions specifically used this exact pretext',
        },
      ],
      question: 'How do you direct the service desk?',
      options: [
        {
          text: 'Halt the MFA enrolment. Have the agent tell the caller they\'ll verify with Tom Reid directly and call back. Then: real Sarah\'s account gets a temporary lockout, an SOC alert opens with the inbound number captured, and notification goes to the warehouse-management line manager AND the deputy CISO. Do NOT proceed with the enrolment until the caller is verified through an out-of-band channel known to map to the real Sarah.',
          correct: true,
          rationale: 'Three signals are too many to be coincidence: missing staff number, absent-manager invocation, and audio mismatch. The right response is to halt the workflow and verify out-of-band. If this is the test, the PT provider learns Northgate\'s helpdesk doesn\'t fall for vishing — exactly what CBEST is meant to surface. If it\'s real, you\'ve stopped the attack at first contact. Both outcomes are good.',
        },
        {
          text: 'Process the MFA enrolment but flag the account for monitoring — the caller had a plausible story and the agent can\'t deny service to a stressed user without harder evidence',
          correct: false,
          rationale: 'Customer-service framing dressed as security pragmatism. The MFA enrolment IS the attack — once the new device is registered, the attacker bypasses every downstream control. "Monitoring after the fact" doesn\'t recover the access already granted. The signals we have ARE the evidence; demanding harder proof is moving the goalposts.',
        },
        {
          text: 'Email Sarah Williams at her registered work email asking her to confirm the MFA enrolment request — wait for her reply before proceeding',
          correct: false,
          rationale: 'Out-of-band is the right instinct, wrong channel. If the attacker has compromised Sarah\'s email (either from a prior breach or via the same vishing operation hitting her colleague who has admin rights), they\'ll see the email and reply confirming. Phone callback to Sarah\'s registered mobile number — or Tom Reid\'s direct line — is the right out-of-band method, NOT email.',
        },
        {
          text: 'Treat this as the CBEST test (the timing fits) and let it play out — note it for the SOC after-action review',
          correct: false,
          rationale: 'Test/Halt model violation. You don\'t know it\'s the test. Even if you\'re 80% sure it\'s the test, the asymmetric cost of being wrong is enormous: a real attacker gets MFA on a warehouse-management account, which is one of the three Critical Functions scoped for CBEST. Default to defending; if it turns out to be the test, the testers learn something. SC013 Stage 5 was exactly this lesson at the manager level — it applies at the SOC level too.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 — MFA fatigue (T1621)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S2',
      order: 2,
      type: 'primary',
      heading: 'Twenty-three push notifications in nine minutes',
      narrative: 'It\'s 14:15 the same Wednesday. The SOC SIEM throws an alert: user account jpearson@northgate.local has received 23 MFA push notifications between 14:06 and 14:15. All 23 from a single source IP — a residential ISP in Slough. The 23rd push was approved at 14:14:47. James Pearson is a senior buyer with access to the supplier-payments dashboard within the payment-processing IBS. EDR shows no malware on James\'s laptop. No password-reset events in the last 7 days. James\'s phone, per HRIS, is not in Slough — it\'s registered to a Newcastle home address.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1621',
      signals: [
        {
          severity: 'high',
          text: '23 pushes in 9 minutes is a textbook MFA-fatigue pattern — far above any plausible legitimate-user count',
        },
        {
          severity: 'high',
          text: '23rd push APPROVED — the attacker is now inside the account; this is no longer "potential compromise", it is active compromise',
        },
        {
          severity: 'high',
          text: 'Source IP geographic mismatch — Slough vs registered Newcastle — suggests the password is already known to attacker (not a guessing attack)',
        },
        {
          severity: 'medium',
          text: 'James\'s account has supplier-payments access — payment fraud potential within minutes of compromise',
        },
        {
          severity: 'low',
          text: 'No EDR signal on James\'s laptop — consistent with attacker operating from the Slough endpoint, not on James\'s machine',
        },
      ],
      question: 'What is your immediate response?',
      options: [
        {
          text: 'Force-logout James\'s active sessions across all systems, revoke the active access token, lock the account, and trigger the IR runbook for confirmed-compromise. Open a high-severity case; notify the deputy CISO; preserve evidence (the source IP, push-notification metadata, any session activity since 14:14:47). Phone James on his registered mobile to inform him and validate next steps.',
          correct: true,
          rationale: 'The pattern is unambiguous and the 23rd push approval means the attacker has a session right now. Speed matters — every minute the session stays alive is a minute of access to supplier-payments. The right response is full containment AND parallel evidence preservation, plus calling James on a known channel to validate (and to give him the news that someone\'s impersonating him).',
        },
        {
          text: 'Treat as likely misconfiguration — sometimes Authenticator app loops cause repeated pushes when the user has the wrong time zone. Log a ticket asking IT support to check James\'s phone settings.',
          correct: false,
          leadsTo: 'SC014-S2-CONSEQUENCE',
          rationale: 'A misconfiguration explanation cannot account for the geographic mismatch (Slough source vs Newcastle phone) OR the ninth-minute approval (which requires deliberate human action, not a confused app loop). Treating active compromise as a config issue gives the attacker hours of unchallenged dwell time. See the consequence.',
        },
        {
          text: 'Send James a teams message asking if he\'s currently trying to log in — if no reply in 5 minutes, escalate',
          correct: false,
          rationale: 'You\'ve already passed the point where verification helps — the session is live, the access token is in attacker hands. Five minutes of "wait for reply" is five minutes the attacker has to exfiltrate or escalate. Containment first, validation second, in this exact order. Containment doesn\'t need James\'s confirmation; the SIEM evidence is conclusive.',
        },
        {
          text: 'Block the source IP at the perimeter and continue monitoring — a block stops further attempts but doesn\'t disrupt the legitimate user if it turns out to be a false positive',
          correct: false,
          rationale: 'IP blocking at the perimeter doesn\'t affect an already-authenticated session. The attacker has an active session token; subsequent requests from that token may flow over the same IP (which would now be blocked, fine) but if the attacker pivots to a different endpoint or a cloud proxy, the block is moot. The active session is the threat, not future inbound connections.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 CONSEQUENCE — MFA fatigue mishandled
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S2-CONSEQUENCE',
      order: 2.5,
      type: 'consequence',
      heading: 'Six minutes later: the supplier-payments queue',
      narrative: 'You logged the misconfiguration ticket. At 14:21 — six minutes after the ticket — supplier-payments shows three new payment authorisations approved by jpearson: £247,000, £189,500, and £312,000, all to a new supplier added that morning. Bank wire instructions point to a UK business bank account opened two days ago. The SOC senior on shift sees the dashboard alert and asks you "what was that 23-push thing on James earlier?" Your face goes cold.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1621',
      signals: [
        {
          severity: 'high',
          text: '£748,500 approved in three transactions to a new supplier added the same morning — payment fraud already executed',
        },
        {
          severity: 'high',
          text: 'New-supplier-plus-immediate-large-payment is the textbook payment-fraud pattern — controls should have flagged at supplier creation, not at SOC level',
        },
        {
          severity: 'high',
          text: 'CBEST PT provider does NOT touch live financial flows — if these payments are real, this is a real attacker, full stop',
        },
        {
          severity: 'medium',
          text: 'Recovery window for UK Faster Payments to a fresh business account is hours, not days — every minute matters',
        },
      ],
      question: 'What is the lesson?',
      options: [
        {
          text: 'MFA fatigue with a successful approval is active compromise, full stop. The signals in the 23-push event were sufficient on their own; demanding additional context before responding turned a 9-minute compromise into a 15-minute compromise that included a £748,500 fraud. The framework for these decisions has to weight false-negative cost (missed real attack) against false-positive cost (locked-out user) in the right direction — locking a real user out for 30 minutes is recoverable; £748,500 to a fresh business account is largely not.',
          correct: true,
          rationale: 'Asymmetric cost is the right framing. False-positive containment costs are recoverable in minutes. False-negative containment costs are sometimes not recoverable at all. The escalation rule for MFA-fatigue patterns has to be containment-first, validation-second, and the SOC has to be empowered to make that call without waiting for additional evidence.',
        },
        {
          text: 'The supplier-onboarding controls should have prevented the new-supplier-plus-large-payment workflow within hours of supplier creation',
          correct: false,
          rationale: 'True but secondary. Yes, supplier-onboarding controls are weak — that\'s a finding for the IDR Report. But the lesson HERE is that the SOC had the signal to stop this at 14:15 and didn\'t. Compounding controls (onboarding rules) and fast-response controls (SOC containment) both matter, but only one of them was your job at 14:15.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 — RMM tool persistence (T1219)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S3',
      order: 3,
      type: 'primary',
      heading: 'AnyDesk on a domain controller',
      narrative: 'It\'s 21:30 Wednesday evening. Your overnight handover is wrapping up when EDR escalates: an AnyDesk binary has been observed running on DC02-LON, one of Northgate\'s primary domain controllers. The binary was placed at 19:14 via a scheduled task created by an account named svc-backup. The binary is beaconing every 60 seconds to an IP on a US hosting provider. You check: the change-management system shows no AnyDesk deployment to DC02-LON; the deployment manifest lists only sanctioned admin tools (RDP through PAM, PowerShell remoting, SCCM agent). svc-backup has Domain Admin rights — it\'s used by the nightly backup job to access DC volumes. The PT provider hotline is open if you need it. The CBEST scope explicitly includes domain controllers as part of the warehouse-management IBS\'s identity dependencies.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1219',
      signals: [
        {
          severity: 'high',
          text: 'RMM on a domain controller is one of the most serious indicators in any SOC alerting scheme — full domain compromise potential',
        },
        {
          severity: 'high',
          text: 'svc-backup with Domain Admin rights — service account abuse pattern, attacker escalated privilege through credential access on the backup infrastructure first',
        },
        {
          severity: 'high',
          text: 'No change-management record + scheduled task creation = adversary persistence mechanism, not legitimate admin action',
        },
        {
          severity: 'medium',
          text: 'PT provider hotline is open — Test/Halt principle says use it when uncertain, but only after confirming the asymmetric cost calculation',
        },
        {
          severity: 'low',
          text: 'AnyDesk specifically appears in PT provider toolkits AND in real adversary toolkits — not disambiguating on its own',
        },
      ],
      question: 'What\'s your move?',
      options: [
        {
          text: 'Open the PT provider hotline immediately. Read them: timestamp, host (DC02-LON), binary (AnyDesk), service account (svc-backup), beacon IP. Get a yes/no on whether this is their activity. In parallel, prepare to isolate DC02-LON from the network IF the answer is no or unclear — but do NOT isolate yet (isolating a DC mid-business-hours has cascading effects, the call is whether to take that hit). If the answer is "not us" or "unclear", isolate immediately and escalate to deputy CISO.',
          correct: true,
          rationale: 'Test/Halt model applied at SOC level. The PT provider has authoritative knowledge of their own toolkit deployments and IPs. Their answer disambiguates the call. The parallel preparation (ready to isolate, not isolated yet) is the right operational posture: ready to act, not yet acting. Isolating a DC is non-trivial — you don\'t want to do it on speculation, but you DO want to be 30 seconds from doing it. SC013 Stage 5 was this same decision at the manager level; the SOC version is structurally identical.',
        },
        {
          text: 'Isolate DC02-LON from the network immediately — domain controller compromise is the most serious scenario possible, the cost of being wrong is acceptable',
          correct: false,
          rationale: 'Defensible position but procedurally wrong. The PT provider hotline exists specifically to disambiguate this kind of signal. Pulling a DC offline without checking the hotline first creates an outage you didn\'t need. The right shape is: prepare to isolate, query the hotline, isolate IF the hotline answer is anything other than "yes that\'s us, that exact binary on that exact host". This costs you 60 seconds and avoids an avoidable production incident.',
        },
        {
          text: 'Treat as PT provider activity — DC02-LON IS in CBEST scope, AnyDesk IS in PT toolkits, the secrecy principle says SOC shouldn\'t aggressively respond to suspected test events',
          correct: false,
          rationale: 'Secrecy principle != "don\'t investigate". The secrecy principle means the firm doesn\'t TIP OFF the testers; it doesn\'t mean the SOC stands down on signals matching the test profile. The PT provider hotline is the explicit mechanism for resolving "is this you?" without breaking secrecy. Standing down without using the hotline is exactly the SC013-S5 mistake from the analyst side.',
        },
        {
          text: 'Continue monitoring — if the binary attempts to escalate or move laterally, you\'ll have stronger evidence to justify isolation',
          correct: false,
          rationale: 'Waiting for escalation on a DC compromise is waiting for the worst-case scenario before responding. Domain controllers are the apex of the trust chain — by the time you see lateral movement, the attacker has the keys to the kingdom. The signal you have right now (RMM on DC, no change record, service-account abuse) is sufficient for action; demanding stronger evidence inverts the cost calculation.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 — AD trust modification attempt (T1484.002)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S4',
      order: 4,
      type: 'primary',
      heading: 'Someone is editing inter-forest trust',
      narrative: 'It\'s 02:47 Thursday morning. (You\'re on the night shift now — the AnyDesk situation became a real PT-confirmed test event but the SOC is alert.) A new alert: the PAM platform shows three failed and one successful attempt to modify the trust relationship between northgate.local (the primary forest) and warehouse.northgate.local (the warehouse-management subdomain). The successful attempt added an SID-history entry that grants the warehouse forest\'s "Domain Admins" group access to the primary forest\'s file shares — including the customer-data platform. The attempt was made from svc-backup (yes, the same service account from Stage 3 — but the PT provider DID confirm DC02-LON\'s AnyDesk was theirs). The modification was logged 8 minutes ago.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1484.002',
      signals: [
        {
          severity: 'high',
          text: 'svc-backup again — but PT provider already accounted for the Stage 3 AnyDesk; this is NEW activity from the same service account',
        },
        {
          severity: 'high',
          text: 'Trust modification + SID-history insertion = forest takeover preparation; this is days-from-ransomware adversary behaviour',
        },
        {
          severity: 'high',
          text: 'Customer-data platform is one of the three CBEST-scoped IBSes — granting access to it crosses a regulatory threshold',
        },
        {
          severity: 'medium',
          text: 'PT provider should be asked again — could be a different operator on their team, or could be the real adversary that piggybacked on whatever credential exposure enabled Stage 3',
        },
        {
          severity: 'medium',
          text: '02:47 timing matches adversary preference for low-staffing windows; less typical for PT providers who tend to work business hours unless explicitly testing 24x7 detection',
        },
      ],
      question: 'What is your action?',
      options: [
        {
          text: 'Halt the test. Call the PT provider hotline AND the deputy CISO simultaneously. The signal pattern (forest trust modification, SID history, customer-data platform exposure, off-hours timing, recurring service account) is at the threshold where the firm has to invoke the formal Halt decision regardless of who the actor is. Reverse the SID-history modification, lock svc-backup, force-rotate the credential. Treat as real intrusion until proven otherwise.',
          correct: true,
          rationale: 'Forest trust modification is the line in the sand. Whether it\'s the PT provider going harder than scoped, or a real adversary that exploited the same credential exposure as Stage 3, the response is the same: reverse the change, contain the account, escalate to formal Halt. The CBEST framework allows the firm to halt the test for any reason — and "we have a Critical Function exposed via SID-history that we cannot unwind without immediate action" is a textbook reason. Even if the PT provider says it\'s them, the firm still has standing to require a halt for review.',
        },
        {
          text: 'Phone the PT provider first — if they confirm it\'s them (with specific operator name and timestamp matching), allow the test to continue while reversing the SID-history change as an out-of-band defensive demonstration',
          correct: false,
          rationale: 'You can\'t "allow the test to continue while reversing the change" — reversing the change means the test branch the PT provider was running has been blocked from the firm\'s side, which is materially the same as halting that arc. The correct framing is: halt the affected arc explicitly, in writing, then resume only after a joint review of what triggered it. This option is the right action wrapped in a less honest description.',
        },
        {
          text: 'Reverse the SID-history modification but leave svc-backup and the trust relationship untouched — that minimises operational disruption while removing the immediate exposure',
          correct: false,
          rationale: 'svc-backup is the demonstrated attack vector — if you don\'t lock it, the same actor (test or real) makes the same modification again as soon as you turn around. Reversing the modification without locking the account is a defensive half-measure that preserves the vulnerability. The CBEST IDR Report would specifically flag this kind of incomplete response as a finding.',
        },
        {
          text: 'Treat as PT provider behaviour following on from Stage 3 — they confirmed DC02-LON, the trust-modification is the natural next step in their test plan, escalate only if a NEW indicator appears',
          correct: false,
          rationale: 'Inverts the burden of proof. The fact that the PT provider confirmed Stage 3 doesn\'t entitle them to silent continuity — each significant escalation triggers a fresh hotline check. A real adversary that compromised svc-backup independently of (or alongside) the PT activity is a real risk, AND is exactly what the public 2025 retail intrusions actually did. Standing down on the assumption it\'s the testers without checking is the SC013-S5 error one more time.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 — LSASS credential read (T1003.001)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S5',
      order: 5,
      type: 'primary',
      heading: 'Mimikatz patterns on a developer workstation',
      narrative: 'It\'s 11:20 Thursday morning. The PT provider hotline call from Stage 4 confirmed: the trust modification was NOT theirs. The firm called a 6-hour halt on the relevant test arc while the SOC swept the environment. During the sweep, EDR escalates a new alert: developer workstation DEV-LDN-094 (assigned to a senior engineer named Priya Shah on the e-commerce team) shows a sequence of LSASS memory reads from a process running as NT AUTHORITY\\SYSTEM. The pattern (specific access mask, specific frequency, 5 reads in 90 seconds) matches a Mimikatz family signature. Twelve minutes after the LSASS reads, the same workstation makes outbound calls to git.northgate.local — Northgate\'s internal source-code repository — accessing repos for the e-commerce platform, the payment-processing service, and the customer-data API. The access is using credentials that look legitimate: Priya\'s. Priya is online and active per Teams.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      mitreTechnique: 'T1003.001',
      signals: [
        {
          severity: 'high',
          text: 'LSASS reads = credential dumping, full stop — there is no benign explanation for a SYSTEM process pattern-matching Mimikatz on a dev workstation',
        },
        {
          severity: 'high',
          text: 'Source-code repository access using Priya\'s credentials within 12 minutes of the LSASS reads — credentials harvested AND used immediately for code-base reconnaissance',
        },
        {
          severity: 'high',
          text: 'Three CBEST-scoped IBSes (e-commerce, payments, customer-data) all have their codebase touched — adversary is mapping attack surface for next phase',
        },
        {
          severity: 'medium',
          text: 'Priya is online — credential theft has happened, but her account is not yet locked; she may not realise her workstation is compromised',
        },
        {
          severity: 'medium',
          text: 'Test halt is currently in effect for the trust-modification arc, but the LSASS arc may or may not be the same actor — ambiguity remains',
        },
      ],
      question: 'What is your response?',
      options: [
        {
          text: 'Isolate DEV-LDN-094 from the network. Force-revoke Priya\'s active sessions in the source-code repository AND in every system she has access to. Open a parallel Halt request for any test arc that may be running through the developer estate. Notify Priya by phone (not email or Teams — both of those go through her potentially-compromised endpoint). Capture forensic image of DEV-LDN-094 BEFORE network isolation if EDR supports volatile memory capture; if not, isolate first and accept the loss of in-memory artefacts.',
          correct: true,
          rationale: 'The signals are unambiguous: credential theft happened, and the credentials are in use already. Containment is required immediately for both the workstation and the credentials. Out-of-band communication to Priya is essential because in-band channels go through the compromise zone. The forensic-capture-before-isolation tradeoff is a real operational decision and either answer (capture-first if EDR supports it, isolate-first if not) is defensible — the wrong answer is delaying isolation while debating the tradeoff.',
        },
        {
          text: 'Block git.northgate.local from DEV-LDN-094 specifically and continue to monitor the workstation — if you isolate Priya\'s machine, she stops working, and the e-commerce team has a release shipping today',
          correct: false,
          rationale: 'Customer-availability framing weighed against credential theft. Priya can work from a fresh laptop in 30 minutes. The e-commerce release is recoverable. The codebase exposure that\'s already happened is not. Selective blocking on git only addresses one symptom; the credentials are still active everywhere else, the workstation is still compromised, and the attacker can pivot to any other system Priya has access to. The right move is full containment, not surgical blocking.',
        },
        {
          text: 'Assume the LSASS pattern is a false positive from a security tool Priya legitimately runs (some dev tools touch LSASS) — ask Priya via Teams whether she ran anything that might match, escalate only if she says no',
          correct: false,
          rationale: 'Two compounding problems. First, no legitimate dev tool produces a Mimikatz-family signature with the specific access-mask and frequency pattern; the alerting threshold is set to filter known-good behaviours. Second, asking Priya via Teams sends the question through her potentially-compromised endpoint — the attacker reads the message and either replies with a soothing "yes I ran something" if they can, or knows containment is coming and accelerates exfiltration. Out-of-band only.',
        },
        {
          text: 'Assume the LSASS event is the PT provider — the firm\'s halt is on the trust-modification arc, but the test is otherwise still running, and credential dumping is in scope',
          correct: false,
          rationale: 'The 12-minute progression from LSASS read to source-code repository access is operationally consistent with the public 2025 retail adversary profile, where the same actor was observed reading code repositories within minutes of credential theft. The PT provider may also be doing similar things, but the right move is the same regardless: isolate, contain, halt the relevant arc, and disambiguate after containment is complete. Standing down based on "could be the test" is the SC013-S5 mistake; SC014-S2 mistake; this question\'s ALL-WRONG answer.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 6 — ESXi VM encryption attempt (T1486)
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S6',
      order: 6,
      type: 'primary',
      heading: 'A process is encrypting VM disk files',
      narrative: 'It\'s 03:14 Friday morning — 42 hours into the original 48. You\'re on shift again. The vSphere management console alert: a process running on ESXi-CLU01 (the cluster hosting the warehouse-management VMs) is iterating through .vmdk disk files and writing modified content. The modification pattern: every 256 KB segment of each .vmdk is being read, encrypted in-memory, and written back. Five VMs already affected; the cluster has 47 VMs total. Process started 4 minutes ago. Authentication used was a service account named svc-vsphere — different account from the previous incidents, but with vSphere admin privileges. The PT provider hotline operator is named Chen, who you\'ve spoken to four times this week. You dial. Chen picks up: "We have a destructive-action test scheduled for SUNDAY at 04:00, not Friday. This is not us."',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      mitreTechnique: 'T1486',
      signals: [
        {
          severity: 'high',
          text: 'PT provider EXPLICITLY confirms this is not their activity — full disambiguation, no Test/Halt ambiguity remaining',
        },
        {
          severity: 'high',
          text: 'Encryption-of-disk-files pattern at 256KB chunks = known ransomware operating mode (specifically the pattern observed in 2025 ESXi-targeting ransomware families)',
        },
        {
          severity: 'high',
          text: 'Five VMs encrypted in 4 minutes — the encryption rate means every minute of delay is several more VMs lost',
        },
        {
          severity: 'high',
          text: 'Warehouse-management is a CBEST-scoped Critical Function — total loss of the cluster halts UK distribution operations',
        },
        {
          severity: 'medium',
          text: 'svc-vsphere is a NEW service account in this incident chain — the adversary has been moving through the service-account estate methodically',
        },
      ],
      question: 'What do you do in the next 60 seconds?',
      options: [
        {
          text: 'Initiate the formal CBEST Halt of the entire test (not just one arc) — call the deputy CISO and CISO simultaneously. Power off ESXi-CLU01 from the BMC/iDRAC level (not from vSphere — vSphere is compromised). Disable svc-vsphere and every other service account ending in -vsphere, -backup, or -admin until they can be individually validated. Engage the breach-response runbook including external IR retainer. Notify the BoE Sector Cyber Team within the regulatory 4-hour window. Begin restoration planning from offline backups.',
          correct: true,
          rationale: 'PT provider has confirmed not-them; the activity matches ransomware-on-ESXi observed in the public 2025 cluster of UK retail breaches; speed of encryption means every minute is irrecoverable VMs. Power-off at the iDRAC level is correct because vSphere itself is compromised — using vSphere to power off would route the command through the attacker\'s control. The 4-hour BoE notification window starts at first detection; getting that call in early is regulatory necessity not paperwork.',
        },
        {
          text: 'Call Chen back to triple-confirm — sometimes hotline operators don\'t have visibility into all the PT provider\'s scheduled activities, and Sunday-vs-Friday could be a calendar mistake',
          correct: false,
          leadsTo: 'SC014-S6-CONSEQUENCE',
          rationale: 'Chen has confirmed once on a clear question. The 4-minute encryption rate doesn\'t allow time for a "let me triple-check our scheduling system" follow-up call. Doubting clear disambiguation in the moment of greatest urgency is exactly the failure mode CBEST is meant to surface AND the failure mode the public 2025 retail breaches actually exhibited. See the consequence.',
        },
        {
          text: 'Power off the affected ESXi cluster from vSphere immediately — that stops the encryption process, then assess',
          correct: false,
          rationale: 'vSphere is the management plane the attacker is using — issuing a power-off command through vSphere routes through the compromised path. The attacker\'s process can intercept, delay, or fake-acknowledge the command. Power-off must happen at the hardware management layer (iDRAC/BMC) which is a separate access path. This is one of those operational details that matters in seconds.',
        },
        {
          text: 'Isolate the cluster\'s network connectivity and let the encryption process complete — encryption already in flight cannot be stopped, and the priority is preventing lateral spread to other clusters',
          correct: false,
          rationale: 'Encryption in flight CAN be stopped if you halt the process — every VM that hasn\'t started being encrypted yet is saved by killing the process now. Let-it-finish thinking accepts a worst-case outcome (full cluster loss) when partial outcomes are still available (only the 5 VMs already affected lost, 42 saved). Stopping the process by killing the host saves the 42; allowing it to complete loses everything.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 6 CONSEQUENCE — extra-confirmation while ransomware runs
    // -----------------------------------------------------------------------
    {
      id: 'SC014-S6-CONSEQUENCE',
      order: 6.5,
      type: 'consequence',
      heading: 'Three minutes later: 31 VMs encrypted',
      narrative: 'You called Chen back. Chen put you on hold while she "triple-checked" with her ops lead — the call lasted 2 minutes 40 seconds. When she came back on the line confirming again that this is NOT their activity, you turned to the vSphere console: 31 VMs are now showing as encrypted, including all four VMs that hosted the warehouse-management primary database cluster. The encryption process is still running. The Friday warehouse operations stand-up is in 5 hours. The CISO\'s phone is ringing through to your handset because someone in the SOC ops centre noticed your face. The Bank of England\'s Sector Cyber Team has not yet been notified.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      mitreTechnique: 'T1486',
      signals: [
        {
          severity: 'high',
          text: '31 VMs encrypted, including warehouse-management primary DB — UK distribution operations going dark within hours unless restored',
        },
        {
          severity: 'high',
          text: '4-hour BoE notification window now compressed; failing to notify on time is itself a finding',
        },
        {
          severity: 'high',
          text: 'Three additional minutes of dwell time = 26 additional VMs encrypted; the cost of needing extra confirmation is now tangible and historic',
        },
        {
          severity: 'medium',
          text: 'CBEST IDR Report will name this incident chain in the closure findings; SOC decision-making at 03:14 is now the regulatory finding',
        },
      ],
      question: 'What is the lesson?',
      options: [
        {
          text: 'When disambiguation is clear, ACT. The Test/Halt model assumes ambiguity; once Chen confirmed not-them, the Test/Halt question was answered and the next gate is response speed. Seeking additional confirmation under the guise of "triple-checking" was effectively another 3 minutes of dwell time — and the encryption rate made each minute cost dozens of VMs. Decisive action under clear disambiguation is the SOC\'s job in exactly this moment; extra caution at the wrong end of the decision tree is harm, not prudence.',
          correct: true,
          rationale: 'The Test/Halt model applies to AMBIGUOUS signals. Chen\'s "this is not us" was a CLEAR signal. The right response shape is: verify once if uncertain, then act. Verifying again after a clear answer is its own failure mode — call it "false-prudence", and the cost of false-prudence is the 26 additional encrypted VMs.',
        },
        {
          text: 'The PT provider\'s hotline should have a faster confirmation channel for high-severity incidents during test windows',
          correct: false,
          rationale: 'True but secondary. Chen\'s response was a clear "not us" within seconds — the slow part was the SOC analyst\'s decision to seek a second confirmation. Process improvements at the hotline level help at the margins; the primary failure was a decision under clear disambiguation, and that decision was the SOC analyst\'s.',
        },
      ],
    },
  ],
}
