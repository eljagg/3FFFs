/**
 * aase-content.js — content seed for the ABS Singapore "Adversarial Attack
 * Simulation Exercise" framework, derived from the November 2018 v1.0 guidance.
 *
 * Source: Association of Banks in Singapore (ABS), SCCS Working Group on AASE,
 * project led by DBS Bank Ltd. Cited verbatim where definitions are involved;
 * paraphrased where examples or guidance are reframed for analyst training.
 *
 * Structure:
 *   - framework: the AASE node itself
 *   - phases: the 4-phase lifecycle (Planning → Attack Prep → Execution → Closure)
 *   - roles: the named human roles in an AASE
 *   - deliverables: the 8 reports an AASE produces
 *   - concepts: the shared vocabulary (Concession, Critical Function, etc.)
 *   - threatActors: the example actors from the PDF's threat matrix (page 39)
 *
 * IMPORTANT: This is a 2018 document. Where guidance has been superseded
 * (TIBER-EU revisions, MITRE ATT&CK has continued to evolve, etc.) the
 * scenarios in v25.1+ will frame the content as historical baseline.
 */

export const AASE_FRAMEWORK = {
  id: 'AASE',
  name: 'Adversarial Attack Simulation Exercise',
  alsoKnownAs: 'Red Team Exercise',
  publishedBy: 'Association of Banks in Singapore (ABS)',
  publishedYear: 2018,
  version: '1.0',
  region: 'Singapore',
  description: 'Sanctioned, planned, risk-managed and objective-driven cyber security assessments that simulate highly sophisticated targeted attacks against a financial institution. Goal: assess and enhance the FI\'s ability to prevent, detect and respond to cyber-attacks impacting Critical Functions or business continuity.',
  primaryGoal: 'Assess organisational resilience by simulating a full end-to-end cycle of a cyber security attack, replicating the actions and procedures of real-world adversaries.',
  // Citing one short verbatim phrase per source — copyright-safe paraphrase elsewhere
  oneLineSummary: 'Goals-driven, intelligence-led, secret, executed against live production.',
}

export const AASE_PHASES = [
  {
    id: 'AASE-PHASE-PLANNING',
    order: 1,
    name: 'Planning',
    summary: 'Scope the assessment, form the Exercise Working Group, select providers, set the budget, define communication and escalation protocols, and assess risk to live production.',
    keyDecisions: [
      'How much secrecy do we want? (Higher = more realistic detection-and-response signal, but higher operational risk.)',
      'Who is on the Exercise Working Group, and which Organisational Escalation Path members do we co-opt so security alerts don\'t reach law enforcement during the test?',
      'Which Critical Functions are in scope? Are any "no-fly zones" off-limits due to operational risk?',
      'Same provider as last time, or rotate for new perspectives?',
      'What concessions are pre-approved, and what triggers their use?',
    ],
    keyDeliverables: ['EXERCISE-PREP-REPORT'],
  },
  {
    id: 'AASE-PHASE-PREPARATION',
    order: 2,
    name: 'Attack Preparation',
    summary: 'Identify the Critical Functions to target, perform threat modelling using both generic and targeted threat intelligence, and design attack scenarios with success criteria.',
    keyDecisions: [
      'What is the threat landscape specific to THIS bank, not just the industry?',
      'Of the threat actors we\'ve modelled, which combination of intent × capability puts them in the High-Threat zone of the matrix?',
      'For each scenario, what counts as success? Access to credentials? Ability to demonstrate a fraudulent transfer end-to-end?',
      'Are we testing the technical kill chain, the business control chain (maker/checker, reconciliation, alerts), or both?',
    ],
    keyDeliverables: ['THREAT-MODELLING-REPORT', 'TARGETING-REPORT'],
  },
  {
    id: 'AASE-PHASE-EXECUTION',
    order: 3,
    name: 'Attack Execution',
    summary: 'The Attacker works through the kill chain (Recon → Exploitation → Lateral Movement → Privilege Escalation → Persistence → Action on Objectives) under continuous oversight from the Exercise Director, using the Test/Halt engagement model.',
    keyDecisions: [
      'When does the Director pause vs. proceed? When does the entire exercise terminate?',
      'If the Attacker uncovers evidence of a real prior compromise (not from the simulation), how is that escalated without breaking exercise secrecy?',
      'When the Defenders escalate a real-looking incident, does the Working Group intervene to redirect or let it run its full course?',
      'A new high-risk vulnerability is discovered (e.g., RCE on internet-facing infrastructure) — disclose now and risk tipping off Defenders, or grant the Attacker assumed-access concession and continue?',
    ],
    keyDeliverables: ['EXECUTION-LOG-REPORT'],
  },
  {
    id: 'AASE-PHASE-CLOSURE',
    order: 4,
    name: 'Exercise Closure',
    summary: 'Clean up artefacts, contain tactical vulnerabilities, produce the Defence Report, hold a joint attack/defence replay, deliver the final Exercise Report, and commit to a Remediation Management Action Plan.',
    keyDecisions: [
      'Who handles clean-up — the FI\'s internal admins, or the provider? (PDF recommends internal, due to legitimate access and process knowledge.)',
      'Should the joint replay happen as a tabletop or in the live environment showing failed controls in real time?',
      'What is sharable externally as a "Lessons Learned" document for industry benefit, and what stays confidential?',
      'How are remediation actions tracked to closure, and who reports progress to the Sponsoring Executive?',
    ],
    keyDeliverables: ['DEFENCE-REPORT', 'EXERCISE-REPORT', 'CLEANUP-REPORT', 'REMEDIATION-PLAN'],
  },
]

export const AASE_ROLES = [
  {
    id: 'ROLE-EXERCISE-DIRECTOR',
    name: 'Exercise Director',
    summary: 'The single point of accountability for managing exercise delivery and the operational risk of running a simulated attack on production. Decides at each stage whether to proceed, pause, or terminate. Must understand both the technical detail of the attack and the FI\'s infrastructure intimately.',
    keyResponsibilities: [
      'Oversees development, execution, review and approval of the exercise',
      'Makes proceed/pause/terminate calls in real time',
      'Manages the chain of control for any operational issues',
      'Granted situational privileges (must be documented; pre-approved by senior management)',
    ],
    secretAware: true,
  },
  {
    id: 'ROLE-WORKING-GROUP',
    name: 'Exercise Working Group',
    summary: 'Attackers + Exercise Director, plus the senior stakeholders whose systems are being targeted. The only people in the FI who know the full scope, nature and timing of the exercise. Charged with maintaining absolute secrecy from the Defenders.',
    keyResponsibilities: [
      'Holds the secret of the exercise',
      'Includes members from Senior Management, Risk Units, BCP/Crisis Management, Incident Management, Information Security, relevant Business and System owners, and Legal/Compliance',
      'Members must sit in the Organisational Escalation Path so security alerts can be intercepted before reaching law enforcement',
    ],
    secretAware: true,
  },
  {
    id: 'ROLE-ATTACKER',
    name: 'Attacker (Red Team)',
    summary: 'Individual or team — typically a contracted external provider — that simulates the TTPs of a real-world adversary based on intelligence about prevailing threats. Skills should ideally match those expected of the real-world adversary being simulated.',
    keyResponsibilities: [
      'Performs threat intelligence gathering and target reconnaissance',
      'Executes the attack kill chain under Director oversight',
      'Maintains the Execution Log Report continuously',
      'Produces the final Exercise Report',
      'Participates in the joint attack/defence replay',
    ],
    secretAware: true,
  },
  {
    id: 'ROLE-DEFENDER',
    name: 'Defender (Blue Team)',
    summary: 'The FI\'s Security Operations Centre, incident response teams, and technology infrastructure support functions. They do NOT know the exercise is happening — that is the entire point — and must respond as they would to a real incident.',
    keyResponsibilities: [
      'Detect, respond to, and contain what they perceive as a real attack',
      'Produces the Defence Report after the exercise ends, reconciling their actions against the Attacker\'s timeline',
    ],
    secretAware: false,
  },
  {
    id: 'ROLE-FACILITATOR',
    name: 'Facilitator',
    summary: 'FI employees in key positions (typically business or IT support) who provide pre-approved support to the Attacker on the Director\'s request — issuing accounts, providing laptops, granting access. They know they may be asked to help with an exercise but do NOT know the details, scope, or whether one is currently active.',
    keyResponsibilities: [
      'Honour pre-approved concession requests from the Director',
      'Document every concession action they take',
    ],
    secretAware: false,
  },
  {
    id: 'ROLE-SPONSOR',
    name: 'Sponsoring Executive',
    summary: 'The FI executive (typically CISO, CIO, or a senior delegate of the Board) who commissions the exercise, approves the Letter of Engagement, receives the final report, and commits to remediation.',
    keyResponsibilities: [
      'Authorises the exercise via the Letter of Engagement',
      'Receives and approves the final Exercise Report',
      'Commits the FI to the Remediation Management Action Plan',
    ],
    secretAware: true,
  },
]

export const AASE_DELIVERABLES = [
  {
    id: 'EXERCISE-PREP-REPORT',
    name: 'Exercise Preparation Report',
    producedBy: 'ROLE-WORKING-GROUP',
    phase: 'AASE-PHASE-PLANNING',
    contents: [
      'Team composition and roles',
      'Exercise code name and description',
      'Attack objectives and scenarios',
      'Communication management strategy and contacts',
      'Risk management strategy with escalation processes',
      'Test plan, weekly progress meeting cadence',
      'Legal and liability insurance arrangements',
    ],
  },
  {
    id: 'THREAT-MODELLING-REPORT',
    name: 'Threat Modelling Report',
    producedBy: 'ROLE-ATTACKER',
    phase: 'AASE-PHASE-PREPARATION',
    contents: [
      'Threat matrix plotting actors by intent vs. capability',
      'Threat summary table with intent / capability / threat-rating per actor',
      'Cybercriminal threats (organised crime groups, DDoS extortionists, ransomware, data leak extortion, malicious insiders)',
      'Nation-state threats',
      'Cyber-activist threats',
      'Threat scenarios derived from high-rated actors',
    ],
  },
  {
    id: 'TARGETING-REPORT',
    name: 'Targeting Report',
    producedBy: 'ROLE-ATTACKER',
    phase: 'AASE-PHASE-PREPARATION',
    contents: [
      'Phishing campaigns and security controls to bypass',
      'Key systems, key personnel, key suppliers',
      'Organisation structure, policies, announcements, awards, events, social media, locations',
      'Network and DNS infrastructure (ASNs, IP blocks, certificates)',
      'Email gateway, content, address format',
      'General technologies: cloud, security, networking, server, desktop, mobile',
    ],
  },
  {
    id: 'EXECUTION-LOG-REPORT',
    name: 'Execution Log Report',
    producedBy: 'ROLE-ATTACKER',
    phase: 'AASE-PHASE-EXECUTION',
    contents: [
      'Live document maintained throughout execution',
      'Attack path actually taken vs. planned',
      'Each phase: status, objective, methodology, outcome, requirements, details',
      'Concessions used and the Director\'s approval for each',
      'Attack attribution protocol — distinguishing simulation traffic from any legitimate intrusion that happens during the window',
    ],
  },
  {
    id: 'EXERCISE-REPORT',
    name: 'Exercise Report (Attacker\'s Final Report)',
    producedBy: 'ROLE-ATTACKER',
    phase: 'AASE-PHASE-CLOSURE',
    contents: [
      'Executive overview with strategic recommendations and security benchmark',
      'Project scope and methodology',
      'Findings and recommendations (prevention; detection and response)',
      'Attack details by phase: threat intel, recon, phishing, privilege escalation, info gathering, lateral movement, attack on objectives',
      'Use of concessions and any deviation from live environment',
      'Indicators of Compromise, compromised assets, incident response observations',
    ],
  },
  {
    id: 'CLEANUP-REPORT',
    name: 'Clean-up Report',
    producedBy: 'ROLE-WORKING-GROUP',
    phase: 'AASE-PHASE-CLOSURE',
    contents: [
      'IOCs and artefacts left from the exercise that must be removed',
      'Configuration changes made during the exercise that need to be reverted',
      'Internal system administrators typically execute the clean-up due to their legitimate access',
    ],
  },
  {
    id: 'DEFENCE-REPORT',
    name: 'Defence Report (Blue Team Report)',
    producedBy: 'ROLE-DEFENDER',
    phase: 'AASE-PHASE-CLOSURE',
    contents: [
      'Reconciles the attack timeline from the Defenders\' perspective',
      'At which stages and points were Attackers detected, observed, tracked, contained, eradicated, or lost',
      'Used by the FI to identify missing or weak security controls',
    ],
  },
  {
    id: 'REMEDIATION-PLAN',
    name: 'Remediation Management Action Plan',
    producedBy: 'ROLE-SPONSOR',
    phase: 'AASE-PHASE-CLOSURE',
    contents: [
      'Identified systemic vulnerabilities and gaps',
      'Management-committed remediation activities and timelines',
      'Project manager assigned to track actions to closure',
      'Periodic reporting to Sponsoring Executive',
    ],
  },
]

export const AASE_CONCEPTS = [
  {
    id: 'CONCEPT-CRITICAL-FUNCTION',
    name: 'Critical Function',
    universal: true,
    summary: 'A business function or service that, if compromised, would significantly impact business continuity, reputation, or finances. Critical Functions are what real-world adversaries target — exercise scenarios should target the same.',
    examples: [
      'Funds movement and payment processing',
      'Trading and settlement',
      'Customer-data systems holding significant volumes of confidential information',
      'Authentication and access control infrastructure',
    ],
  },
  {
    id: 'CONCEPT-CONCESSION',
    name: 'Concession',
    universal: true,
    summary: 'Explicit, agreed assistance given to the Attacker by the Director to alter the course of the exercise — typically to skip past an undefeated control, simulate the passage of long reconnaissance time, or delay the organisational response to enable further scenarios. Every concession used must be documented and reported, and its impact on the security control efficacy assessment must be considered.',
    examples: [
      'Issue an admin or plain-user account on demand',
      'Issue a laptop or token from local IT support',
      'Provide a network diagram or asset inventory',
      'Bypass a physically-secured network outlet',
      'Assume a phishing payload would have executed (avoiding the need to actually phish staff)',
    ],
  },
  {
    id: 'CONCEPT-LETTER-OF-ENGAGEMENT',
    name: 'Letter of Engagement',
    universal: true,
    summary: 'A document signed by the Sponsoring Executive that authorises the exercise. Briefly describes the test\'s intent, the testers\' scope of involvement, and instructions on how to authenticate the testers if they are apprehended by security staff during physical or social-engineering elements of the exercise.',
  },
  {
    id: 'CONCEPT-TEST-HALT-MODEL',
    name: 'Test/Halt Engagement Model',
    universal: false,  // AASE-specific terminology, but the concept appears in CBEST/TIBER under different names
    summary: 'A risk-based pattern in which simulated attacks are planned and analysed before execution, and the Director can decide at any point to pursue, pause, divert, or terminate an attack path based on adverse reactions or operational risk. Distinguishes AASE from a real attack, which has no such oversight.',
  },
  {
    id: 'CONCEPT-EXERCISE-SECRECY',
    name: 'Exercise Secrecy',
    universal: true,
    summary: 'The principle that the scope, nature and timing of the exercise are kept confidential to the Working Group. Without secrecy, Defenders\' responses are influenced and the assessment becomes unreliable. The PDF observes that in exercises where secrecy was not preserved, leaked information substantially compromised the benefits.',
  },
  {
    id: 'CONCEPT-ESCALATION-PATH',
    name: 'Organisational Escalation Path',
    universal: true,
    summary: 'The chain of control by which security or operational issues are escalated to senior management during normal business. During an exercise, the Working Group co-opts members of this path so that security alerts generated by the simulation can be intercepted before reaching law enforcement, regulators, or other parties outside the Working Group.',
  },
  {
    id: 'CONCEPT-NO-FLY-ZONE',
    name: 'No-Fly Zone',
    universal: false,
    summary: 'Functions, assets, or areas explicitly excluded from the exercise scope due to excessive operational risk if tested in the live environment. Any no-fly zone must be documented in the report with reasons.',
  },
  {
    id: 'CONCEPT-THREAT-MATRIX',
    name: 'Threat Matrix',
    universal: true,
    summary: 'A 2-D plot of threat actors by Intent (vertical axis: Very Low → Very High) and Capability (horizontal axis: Very Low → Very High). Actors in the High/Very-High quadrants are the ones whose TTPs should drive scenario creation. Used to focus the exercise on credible adversaries rather than every theoretical threat.',
  },
]

export const AASE_THREAT_ACTORS = [
  // Sample actors from the threat summary table on page 39 of the PDF.
  // The labels (OCG, NST1-4) are deliberately generic — real threat models name specific groups.
  {
    id: 'ACTOR-OCG',
    name: 'Organised Cybercriminal Groups',
    intent: 'High',
    capability: 'High',
    threatRating: 'High',
    summary: 'The most sophisticated cybercriminal actors. Demonstrated capability to compromise diverse system types in financial-services scope. Motivated primarily by financial gain.',
  },
  {
    id: 'ACTOR-NST1',
    name: 'Nation-State Actor (Tier 1)',
    intent: 'High',
    capability: 'High',
    threatRating: 'High',
    summary: 'High intent against the regional financial sector with strong technical capability. Motivations include intelligence gathering and economic disruption.',
  },
  {
    id: 'ACTOR-NST2',
    name: 'Nation-State Actor (Tier 2)',
    intent: 'High',
    capability: 'Very High',
    threatRating: 'High',
    summary: 'Highest demonstrated capability, including custom malware and supply-chain compromise. Intent varies but capability alone justifies high threat rating.',
  },
  {
    id: 'ACTOR-DDOS',
    name: 'DDoS Extortionists',
    intent: 'Medium',
    capability: 'Medium',
    threatRating: 'Medium',
    summary: 'Have successfully targeted similar-profile organisations in the past. Likely to disrupt public-facing portals to extract ransoms.',
  },
  {
    id: 'ACTOR-INSIDER',
    name: 'Malicious Insiders',
    intent: 'Medium',
    capability: 'Medium',
    threatRating: 'Medium',
    summary: 'Privileged access to key systems renders them potentially among the most capable actors. Generally intent is opportunistic rather than sustained.',
  },
  {
    id: 'ACTOR-NST3',
    name: 'Nation-State Actor (Tier 3)',
    intent: 'Low',
    capability: 'Very High',
    threatRating: 'Medium',
    summary: 'High capability but low current intent against this specific institution. Worth monitoring as geopolitical conditions shift.',
  },
  {
    id: 'ACTOR-RANSOMWARE',
    name: 'Ransomware Operators (untargeted)',
    intent: 'Low',
    capability: 'Low',
    threatRating: 'Low',
    summary: 'High volume of activity but typically untargeted. Unlikely to specifically pursue in-scope systems.',
  },
  {
    id: 'ACTOR-DATALEAK',
    name: 'Data Leak Extortionists',
    intent: 'Low',
    capability: 'Medium',
    threatRating: 'Low',
    summary: 'Capable of breaching and threatening to release sensitive information, but typically pursue smaller and more vulnerable organisations.',
  },
  {
    id: 'ACTOR-ACTIVIST',
    name: 'Cyber Activists',
    intent: 'Low',
    capability: 'Low',
    threatRating: 'Low',
    summary: 'Low capability across in-scope systems, with the possible exception of DDoS against online banking portals. Low intent further deters.',
  },
  {
    id: 'ACTOR-NST4',
    name: 'Nation-State Actor (Tier 4)',
    intent: 'Very Low',
    capability: 'Very High',
    threatRating: 'Low',
    summary: 'Very high theoretical capability but no observed intent against this institution or sector.',
  },
]
