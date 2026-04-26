/**
 * cbest-phases.js — CBEST FrameworkPhase taxonomy (v25.6.1)
 *
 * Authoritative source: Bank of England, "CBEST Threat Intelligence-Led
 * Assessments: Implementation Guide for CBEST participants", 2024 edition,
 * Prudential Regulation Authority. CC-BY 4.0 International Licence.
 * Specifically Figures 3 + 4 (CBEST phases and timeline) and §6 / §7 / §8
 * / §9 (per-phase narrative).
 *
 * Structure (Option A, flat 19 — see v25.6.1 deploy notes):
 *   - 5 top-level phases (level: 'phase'): Initiation, Threat Intelligence,
 *     Penetration Testing, Closure, plus a Post-CBEST Thematic Analysis
 *   - 14 sub-stages (level: 'sub-stage') as children of phases 1-4
 *   - parentId links sub-stage to phase; null on top-level phases
 *
 * OBS-018 four-level Interactivity Design lives in the `roleContent` block.
 * Each node carries four lenses: teller / analyst / soc / executive.
 * Each lens has:
 *   - summary: 1-2 sentence "what this phase means for you" framing
 *   - keyPoints: 3-4 role-relevant detail bullets
 *
 * The CLIENT picks which lens to display based on the user's roles
 * property. If a user has multiple roles (e.g. analyst+soc), the
 * sidebar shows tabs to switch lenses. If the user has none of the
 * four canonical roles, the sidebar defaults to the analyst lens.
 *
 * The phase-level (top) content is shown as the "What is this phase"
 * answer; the sub-stage content is the per-sub-stage detail.
 *
 * Vintage marker: 'CBEST 2024 BoE Implementation Guide (v25.6.1)'
 */

export const CBEST_PHASES = [
  // ===========================================================================
  // PHASE 1 — Initiation (top-level)
  // ===========================================================================
  {
    id: 'CBEST-PHASE-1',
    framework: 'CBEST',
    level: 'phase',
    parentId: null,
    order: 1,
    name: 'Initiation',
    code: 'Phase 1',
    durationLabel: '4–6 weeks',
    summary: 'The CBEST assessment is formally launched. The regulator engages with the firm/FMI, the Control Group is formed, scope is established, and CBEST-accredited service providers are procured.',
    boeReference: '§6 Initiation phase',
    deliverables: ['Notification letter', 'Legal Clauses and Privacy Notice (CBEST 2024c)', 'Scope Specification (CBEST 2024d)', 'Project Initiation Document (PID)'],
    roleContent: {
      teller: {
        summary: 'You will not normally see any of this from your branch. This is governance work happening at headquarters; the test does not start touching live systems until later phases.',
        keyPoints: [
          'A small group at HQ — the Control Group — is being formed to coordinate the test.',
          'The test scope is decided here. Your branch systems may or may not be in scope.',
          'Secrecy starts now: the rest of the bank, including your manager, is not told a CBEST is running.',
        ],
      },
      analyst: {
        summary: 'The setup phase. A four-to-six-week window where the firm prepares: forms the CG, agrees scope with the regulator, procures CBEST-accredited TISP and PTSP. Most of the heavy procedural work happens here, before any threat intelligence is collected.',
        keyPoints: [
          'Four sub-stages — Launch (notification), Engagement (kickoff), Scoping (which IBSs in scope), Procurement (which providers).',
          'Key deliverable is the Scope Specification (CBEST 2024d) — the firm proposes IBSs; the regulator validates against threat intelligence.',
          'Both TISP and PTSP must be CBEST-accredited (BoE-issued). Verifying their status before contract signature is the analyst\'s job.',
          'Practiced in SC013 stages 1 through 3.',
        ],
      },
      soc: {
        summary: 'Secrecy starts here. The CG is formed, but the SOC is deliberately NOT told a CBEST is in flight. Your role at this phase is to keep doing what you normally do — that is the entire point.',
        keyPoints: [
          'The Detection & Response Capability Assessment in Phase 3.3 is what evaluates your team. Phase 1 is the setup that makes that assessment possible.',
          'If you hear chatter about a "test", report it to your manager — secrecy compromise is a notification trigger to the regulator.',
          'Scope decisions made here determine which IBSs the testers will eventually attack against. You do not get to know which.',
        ],
      },
      executive: {
        summary: 'Phase 1 is where executive sign-off matters most. The Scope Specification needs the executive sponsor\'s signature; procurement decisions carry direct supervisory consequences if regulatory gates are misapplied.',
        keyPoints: [
          'Executive sponsor is accountable for the overall delivery of the CBEST (RACI, Annex B of BoE Guide).',
          'Scope Specification (CBEST 2024d) signed off by the executive sponsor; the Board should be aware of in-scope IBSs.',
          'Procurement gate: providers must be CBEST-accredited by the BoE. Misapplying this gate (e.g. accepting "in renewal") loses 4–6 weeks and earns a supervisory note. See SC013-S3-CONSEQUENCE.',
          'Cross-jurisdictional CBEST possible; relevant regulators must agree at this phase.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-1-1-LAUNCH',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-1',
    order: 1,
    name: 'Launch',
    code: 'Phase 1.1',
    durationLabel: 'Phase 1 opening',
    summary: 'The regulator formally notifies the firm/FMI in writing that a CBEST is requested, via the CBEST notification letter. The firm has 40 working days to contact their supervision team to start the process.',
    boeReference: '§6.1 Launch',
    deliverables: ['Notification letter'],
    roleContent: {
      teller: {
        summary: 'A letter from the Bank of England arrives at HQ. You will not see it; the regulator and your CISO will be in touch about scope.',
        keyPoints: [
          'This is the official "you have been picked for CBEST" moment.',
          'A small set of senior people will know about it; the rest of the bank, including you, will not.',
        ],
      },
      analyst: {
        summary: 'Regulatory notification arrives. The 40-working-day clock to engage starts. The firm prepares to manage the CBEST per the Implementation Guide; the regulator begins drafting the initial Scope Specification.',
        keyPoints: [
          'Notification letter is the formal trigger.',
          'The CISO and prospective CG members need to read the Implementation Guide before the kickoff.',
          'Supervision team is the first contact; the regulator drives the schedule from here.',
        ],
      },
      soc: {
        summary: 'You will hear nothing. The notification is contained to the executive sponsor and the people forming the CG.',
        keyPoints: [
          'Notification arrives. Scope is not yet defined; testers are not yet engaged.',
          'No SOC action. Continue normal operations.',
        ],
      },
      executive: {
        summary: 'You receive the notification. The 40-working-day window starts. Decide the executive sponsor, identify the prospective CGC, and begin internal planning for engagement.',
        keyPoints: [
          'Executive sponsor (typically COO, CIO, or CISO) is accountable.',
          'Identify CGC and CG members early; the CGC chairs all CBEST coordination.',
          'Discuss with the Board so the engagement is in their risk register.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-1-2-ENGAGEMENT',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-1',
    order: 2,
    name: 'Engagement',
    code: 'Phase 1.2',
    durationLabel: 'Phase 1, weeks 1–2',
    summary: 'The "CBEST kick off" meeting. The regulator and firm/FMI meet to discuss CBEST objectives, process, stakeholder roles, security protocols, contractual considerations, and project schedule. The Control Group is formed and roles confirmed.',
    boeReference: '§6.2 Engagement',
    deliverables: ['Legal Clauses and Privacy Notice (CBEST 2024c)', 'CG membership confirmed'],
    roleContent: {
      teller: {
        summary: 'A meeting at HQ that you will not be in. The bank decides who is "in the loop" for the test. That list is short.',
        keyPoints: [
          'The Control Group (CG) is finalised here — usually 4–8 senior people.',
          'You are intentionally not on this list. That is by design.',
        ],
      },
      analyst: {
        summary: 'The regulator-led kickoff. CG membership formalised; legal clauses drafted into TISP/PTSP contracts; secure document transfer protocols agreed. This is the SC013 Stage 1 setting.',
        keyPoints: [
          'Three-hour kickoff meeting facilitated by the regulator.',
          'CG composition: senior individuals with decision authority, not necessarily limited to COO/CIO/CTO/CISO.',
          'Project code name agreed for confidentiality; all CBEST documentation refers to the firm by code name.',
          'Practiced in SC013-S1 (the cyber-posture opening question).',
        ],
      },
      soc: {
        summary: 'Still nothing for you. The CG is being formed. You will not be on it.',
        keyPoints: [
          'CG members are bound by secrecy. They will continue working alongside you as if nothing is happening.',
          'If you notice unusual senior calendar activity in your org, do not speculate.',
        ],
      },
      executive: {
        summary: 'You attend the kickoff. CG composition is your call — keep it as small as practically possible (info on need-to-know basis). You commit to the schedule and the legal clauses.',
        keyPoints: [
          'Engagement workshop is the formal start; FCA may attend if cross-jurisdictional.',
          'CG composition rule: small, senior, decision-authoritative. Exclusions are deliberate.',
          'Legal clauses (CBEST 2024c) go into TISP/PTSP contracts; review with general counsel.',
          'CGC appointment is finalised here; CGC reports to executive sponsor.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-1-3-SCOPING',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-1',
    order: 3,
    name: 'Scoping',
    code: 'Phase 1.3',
    durationLabel: 'Phase 1, weeks 2–4',
    summary: 'The Scope Specification document (CBEST 2024d) is produced. The regulator identifies relevant Important Business Services (IBSs); the CG proposes the key systems that underpin each IBS plus the compromise actions to be targeted (confidentiality, integrity, availability).',
    boeReference: '§6.3 Scoping',
    deliverables: ['Scope Specification (CBEST 2024d)', 'PID (initial)'],
    roleContent: {
      teller: {
        summary: 'Scoping decides which systems get tested. If your branch\'s payment terminal or core banking app is named in the scope, your everyday transactions become test data — but the test stays invisible to you and your customers.',
        keyPoints: [
          'IBS = Important Business Service: services whose disruption would meaningfully harm customers or the financial system.',
          'Live production is in scope unless legal or ethical constraints prevent it.',
          'You will not be told which systems were picked. That is part of the test design.',
        ],
      },
      analyst: {
        summary: 'IBS list, supporting key systems, and compromise actions all written down and signed off. Firm-led with regulator review — the firm proposes; the regulator validates against threat intelligence. This is SC013-S2.',
        keyPoints: [
          'Three layers in the Scope Specification: (i) IBSs, (ii) systems that underpin each, (iii) compromise actions targeted.',
          'Compromise actions: confidentiality, integrity, availability — pick those relevant to each IBS.',
          'The CG proposes; deferring entirely to the regulator inverts the design and reads as a finding (SC013-S2 wrong-answer rationale).',
          'Practiced in SC013-S2.',
        ],
      },
      soc: {
        summary: 'You do not learn the scope. The Scope Specification is shared on a need-to-know basis within the CG only — the entire point is that you respond to the test as if it were a real attack.',
        keyPoints: [
          'Scope is the firm\'s "what would actually hurt us" picture. Knowing it would compromise your detection/response signal.',
          'During Phase 3.2 Execution, attack activity will hit one or more in-scope systems. If you spot it, treat it as real.',
          'Your D&R Capability Assessment (Phase 3.3) is partly about whether you flagged scoped activity.',
        ],
      },
      executive: {
        summary: 'You sign off the Scope Specification. This is one of three executive-decision moments in the CBEST cycle (the others being procurement and remediation prioritisation). The IBS selection becomes the entire downstream test.',
        keyPoints: [
          'Scope Specification (CBEST 2024d) signed off by you; the regulator countersigns.',
          'Scope must be representative of the firm\'s real IBSs — over-narrowing the scope to dodge findings is itself a finding.',
          'Third-party / supplier-underpinned IBSs in scope require Supplementary Guidance (CBEST 2024k) handling.',
          'Practiced in SC013-S2 — the IBS triage decision.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-1-4-PROCUREMENT',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-1',
    order: 4,
    name: 'Procurement',
    code: 'Phase 1.4',
    durationLabel: 'Phase 1, weeks 4–6 (concurrent with Scoping)',
    summary: 'The firm/FMI procures and onboards CBEST-accredited TISP and PTSP. The accredited-provider register is on the CREST website; CBEST accreditation itself is BoE-issued. Legal clauses go into provider contracts; PID is finalised.',
    boeReference: '§6.4 Procurement',
    deliverables: ['TISP contract', 'PTSP contract', 'PID (final)'],
    roleContent: {
      teller: {
        summary: 'The bank hires two outside firms: one to study how attackers might target the bank, one to actually run the test. Both must be on the regulator\'s approved list.',
        keyPoints: [
          'TISP = Threat Intelligence Service Provider; PTSP = Penetration Testing Service Provider.',
          'They are accredited by the Bank of England — not just any cyber firm can do this work.',
          'You will not interact with either of them.',
        ],
      },
      analyst: {
        summary: 'Two contracts, two CBEST-accredited providers. The accreditation gate is binary: you are either CBEST-accredited at the time of procurement or you are not. "In renewal" is not "accredited". This is SC013-S3.',
        keyPoints: [
          'TISP day-to-day contact: CCTIM (CREST Certified Threat Intelligence Manager). Day-to-day contact for PTSP: CCSAM (CREST Certified Simulated Attack Manager).',
          'Verify CBEST accreditation status before contract signature — register is on the CREST website.',
          'Sector relevance matters within the accredited pool — retail expertise vs banking expertise can shift Targeting Report quality.',
          'Practiced in SC013-S3 and SC013-S3-CONSEQUENCE.',
        ],
      },
      soc: {
        summary: 'Two outside firms are now under contract. One of them — the PTSP — will eventually attack you. You will not know when or which one.',
        keyPoints: [
          'PTSP contracts include legal authorisation to test against in-scope systems (Computer Misuse Act).',
          'During Execution, the PT provider may stand up infrastructure that resembles real adversary tooling. That is by design.',
          'There will be a PT provider hotline on the CG side. You will not have access to it.',
        ],
      },
      executive: {
        summary: 'You approve the procurement decision. The accreditation gate is the second executive-discipline moment of the CBEST. If it is misapplied, the slippage cost is 4–6 weeks plus a supervisory note.',
        keyPoints: [
          'Hard gate: CBEST accreditation, BoE-issued, verified pre-signature. CREST membership is a separate co-requirement, not a substitute.',
          'Within the accredited pool: pick on sector match, prior CBEST experience, and price — in that order of importance.',
          'Treat any "in renewal" status as not-accredited until certification issues. See SC013-S3-CONSEQUENCE.',
          'Practiced in SC013-S3.',
        ],
      },
    },
  },

  // ===========================================================================
  // PHASE 2 — Threat Intelligence (top-level)
  // ===========================================================================
  {
    id: 'CBEST-PHASE-2',
    framework: 'CBEST',
    level: 'phase',
    parentId: null,
    order: 2,
    name: 'Threat Intelligence',
    code: 'Phase 2',
    durationLabel: '~10 weeks',
    summary: 'The TISP collects, analyses and disseminates IBS-focused threat intelligence. Output: a Targeting Report (what attackers can learn about us) and a Threat Intelligence Report (who would plausibly target us, and how). The PTSP develops a draft Penetration Test Plan from the scenarios.',
    boeReference: '§7 Threat Intelligence phase',
    deliverables: ['TI Plan', 'Targeting Report (CBEST 2024e)', 'Threat Intelligence Report (CBEST 2024f)', 'Draft PT Plan', 'TIMA (CBEST 2024g) — completed AFTER PT'],
    roleContent: {
      teller: {
        summary: 'Outside experts study how attackers might target the bank. You will not see their reports — they go to the CG and the regulator. The findings sometimes mention frontline-relevant patterns: phishing calls, helpdesk vishing, fake supplier emails.',
        keyPoints: [
          'They look at what attackers can find publicly about the bank — your branch addresses, employee names on social media, system names that have leaked.',
          'They also study which actors would target a bank like yours and how.',
          'The "golden thread" — threats → scenarios → attack paths → vulnerabilities — starts here.',
        ],
      },
      analyst: {
        summary: 'Ten weeks of targeted intelligence collection. The TISP delivers two distinct documents (Targeting + TI Reports) and a TIMA assessment of the firm\'s own TI maturity. The Validation workshop produces a draft Penetration Test Plan. SC013-S4 plays the Validation moment.',
        keyPoints: [
          'Sub-stages: 2.1 Direction, 2.2 Intelligence, 2.3 Validation, 2.4 TI Assessment (TIMA).',
          'TIMA is intentionally completed AFTER PT execution to preserve secrecy from staff outside the CG (BoE §7.4).',
          'Targeting Report (CBEST 2024e) ≠ Threat Intelligence Report (CBEST 2024f). Two distinct deliverables.',
          'Validation workshop is three hours and includes the CG, regulator, TISP, and PTSP together.',
        ],
      },
      soc: {
        summary: 'Outside intelligence is being gathered about your firm. The TISP minimises direct interaction with your network — they want to avoid tipping off your detection. Some of what they find will inform what attacks the PT provider runs against you in Phase 3.',
        keyPoints: [
          'TISP avoids direct network interaction during this phase to keep you blind.',
          'If the TISP discovers a major vulnerability or imminent threat, they disclose immediately to the CG. The CG may remediate. You may see security work happening without context.',
          'Threat scenarios produced here become the attacks executed against you in Phase 3.2.',
        ],
      },
      executive: {
        summary: 'Two reports land on your desk to review and validate. Each rejected scenario must be justified in writing to the regulator. Validation is calibration, not capitulation — the firm has standing to argue.',
        keyPoints: [
          'TI Report scenarios become the test plan. Misjudging probability here flows downstream.',
          'TIMA scoring is independent; the CCTIM challenges firm self-scores.',
          'CG reviews the TI deliverables; final versions cannot be shared more widely than the CG until CBEST closes.',
          'Practiced in SC013-S4.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-2-1-DIRECTION',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-2',
    order: 1,
    name: 'Direction',
    code: 'Phase 2.1',
    durationLabel: 'Phase 2, weeks 1–2',
    summary: 'The TISP receives direction from the CG and produces an IBS-focused Threat Intelligence Plan. Targeting Report Specification (CBEST 2024e) and TI Report Specification (CBEST 2024f) are issued.',
    boeReference: '§7.1 Direction',
    deliverables: ['TI Plan', 'Targeting Report Specification (CBEST 2024e)', 'TI Report Specification (CBEST 2024f)'],
    roleContent: {
      teller: {
        summary: 'Outside experts get a briefing from HQ and start planning their work.',
        keyPoints: [
          'No branch-side activity at this point.',
        ],
      },
      analyst: {
        summary: 'TISP and CG sync on what intelligence to gather. The TI Plan is the analyst-side roadmap for the next eight weeks.',
        keyPoints: [
          'TI Plan covers organisational structure, business and technical overview of in-scope systems, current firm threat assessment, leaked data, recent incidents.',
          'PID is updated with the TI Plan.',
        ],
      },
      soc: {
        summary: 'TISP starts collecting OSINT about your firm. They minimise direct interaction with you.',
        keyPoints: [
          'OSINT collection only — no active probing of internal networks at this stage.',
        ],
      },
      executive: {
        summary: 'CG provides direction to the TISP — what to focus on. The PID is updated with TI Plan.',
        keyPoints: [
          'Critical: any significant risk changes during TI direction must be communicated to the regulator.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-2-2-INTELLIGENCE',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-2',
    order: 2,
    name: 'Intelligence',
    code: 'Phase 2.2',
    durationLabel: 'Phase 2, weeks 2–6',
    summary: 'The TISP collects, analyses, and disseminates IBS-focused intelligence covering Targeting (attack surfaces) and Threat Intelligence (relevant actors and probable scenarios). Two distinct deliverables produced: Targeting Report and Threat Intelligence Report.',
    boeReference: '§7.2 Intelligence',
    deliverables: ['Targeting Report (CBEST 2024e)', 'Threat Intelligence Report (CBEST 2024f)'],
    roleContent: {
      teller: {
        summary: 'The investigators study what attackers could learn about your bank from outside, then identify which attackers would actually target you.',
        keyPoints: [
          'Some of their findings will be about what is leaked publicly — staff names on LinkedIn, system names in job postings.',
          'These findings can inform later branch-level training even though they are not directly about you.',
        ],
      },
      analyst: {
        summary: 'Two distinct deliverables get drafted. Targeting Report identifies attack surfaces (people, processes, infrastructure). Threat Intelligence Report profiles relevant actors and develops scenarios. Malicious insider and supply chain scenarios are mandatory.',
        keyPoints: [
          'Targeting Report is published-information + unintentionally-leaked-information mapped to IBSs.',
          'TI Report scenarios use TTPs described in established frameworks (MITRE ATT&CK, Cyber Kill Chain) — explicitly endorsed by BoE §7.2.2.',
          'Insider and supply-chain scenarios MUST be analysed (BoE §7.2.3).',
          'Major vulnerabilities found are disclosed to the CG immediately; the CG may remediate.',
        ],
      },
      soc: {
        summary: 'The TISP works mostly off external sources, but if they find something serious about you, they will tell the CG immediately. You may see emergency patching activity without context.',
        keyPoints: [
          'TISP minimises direct network interaction to avoid tipping you off.',
          'Found vulnerabilities → CG → potentially remediated before PT phase.',
          'The TI Report names the actors and methods that will be simulated against you in Phase 3.2.',
        ],
      },
      executive: {
        summary: 'Two reports get drafted. You will review them at Validation. Insider and supply-chain scenarios always get analysed — that is mandatory.',
        keyPoints: [
          'Targeting and TI Reports are evidential foundation for the test plan.',
          'TI Report scenarios use MITRE ATT&CK / Cyber Kill Chain — the same frameworks your SOC tools reference.',
          'Scenarios beyond test scope (e.g. DDoS, physical) get noted but not executed; consider follow-up testing outside CBEST.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-2-3-VALIDATION',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-2',
    order: 3,
    name: 'Validation',
    code: 'Phase 2.3',
    durationLabel: 'Phase 2, weeks 6–8',
    summary: 'The regulator facilitates a three-hour Validation workshop with the CG, TISP, and PTSP. TI deliverables are reviewed; PTSP presents the draft Penetration Test Plan. Final TI deliverables produced after the workshop. Marks formal handover from TISP to PTSP.',
    boeReference: '§7.3 Validation',
    deliverables: ['Final Targeting Report', 'Final Threat Intelligence Report', 'Draft PT Plan'],
    roleContent: {
      teller: {
        summary: 'A formal review meeting happens at HQ involving the regulator and the testing firms. You will not be there.',
        keyPoints: [
          'This meeting decides which threats become real attacks against the bank in the next phase.',
        ],
      },
      analyst: {
        summary: 'Three-hour workshop with everyone in the room. The TISP presents the two reports; the regulator gives feedback; the PTSP presents the draft PT Plan including scenario-to-IBS mapping. This is SC013-S4.',
        keyPoints: [
          'Validation is calibration, not capitulation — the firm has standing to argue scope. Each rejected scenario justified in writing.',
          'Final TI deliverables produced after workshop incorporates regulator feedback.',
          'Formal TISP → PTSP handover happens at the end of Validation.',
          'Practiced in SC013-S4.',
        ],
      },
      soc: {
        summary: 'The PT Plan now exists. Within the next 14 weeks, attacks based on the validated scenarios will hit your monitored systems. You will not know which attacks. You will not know when.',
        keyPoints: [
          'Plan includes start and stop dates; weekly status updates with the CG begin in Phase 3.2.',
          'The Targeting Report you never see may explain why a particular attack vector is chosen.',
        ],
      },
      executive: {
        summary: 'You attend the Validation workshop. You sign off on the final TI deliverables. The PT Plan you accept here will be executed against the firm in the next phase.',
        keyPoints: [
          'Workshop is regulator-facilitated; CG, TISP, PTSP attend.',
          'You can argue scope — defending the firm\'s threat picture is not pushback, it is engagement.',
          'PID updated with PT phase plan; CG ensures key stakeholders aware of test risks.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-2-4-TI-ASSESSMENT',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-2',
    order: 4,
    name: 'TI Assessment (TIMA)',
    code: 'Phase 2.4',
    durationLabel: 'Completed AFTER Phase 3.2 to preserve secrecy',
    summary: 'Threat Intelligence Maturity Assessment of the firm/FMI\'s internal TI function. Run by the TISP\'s CCTIM resource. Although part of Phase 2 by structure, the TIMA is intentionally completed AFTER the Penetration Test phase to avoid drawing attention to staff outside the CG.',
    boeReference: '§7.4 Assessment',
    deliverables: ['TIMA (CBEST 2024g)', 'Intelligence Assessment Report'],
    roleContent: {
      teller: {
        summary: 'A separate review of how good the bank\'s in-house intelligence work is. You will not be involved.',
        keyPoints: [
          'This is about the threat-intelligence team at HQ, not branches.',
        ],
      },
      analyst: {
        summary: 'Assessment of internal TI capability against CREST\'s Intermediate Maturity tool. CCTIM-led; not self-certification. The TI staff inside the firm get interviewed, evidence is collected, scores agreed.',
        keyPoints: [
          'Uses CREST\'s TI Maturity Assessment Tool — Intermediate level.',
          'Self-scores get challenged by the CCTIM based on industry benchmarks.',
          'Run after PT execution (per BoE §7.4) to keep CBEST secrecy intact during PT.',
          'Output: Intelligence Assessment Report; recommendations feed into the Remediation Plan.',
        ],
      },
      soc: {
        summary: 'Not your assessment — the TIMA evaluates the threat-intelligence function. Your assessment is the D&R Capability Assessment in Phase 3.3.',
        keyPoints: [
          'Run after the PT phase, so you are no longer secrecy-protected by the time interviews happen.',
        ],
      },
      executive: {
        summary: 'Independent maturity scoring of your internal TI team. CCTIM resource vouches for the evidence and the final scores. Not subject to vetting by the firm prior to regulator review.',
        keyPoints: [
          'Scoring is the CCTIM\'s — you cannot edit before regulator submission.',
          'Findings feed into the Remediation Plan (Phase 4.1).',
          'Sensitive — recommendations are shared in the Intelligence Assessment Report.',
        ],
      },
    },
  },

  // ===========================================================================
  // PHASE 3 — Penetration Testing (top-level)
  // ===========================================================================
  {
    id: 'CBEST-PHASE-3',
    framework: 'CBEST',
    level: 'phase',
    parentId: null,
    order: 3,
    name: 'Penetration Testing',
    code: 'Phase 3',
    durationLabel: '~14 weeks',
    summary: 'The PTSP executes the intelligence-led Penetration Test against in-scope IBS-supporting systems on live production. The test runs against the firm\'s real environment, the firm\'s SOC and IR teams respond as if it were a real attack, and findings are captured in the PT Report and D&R Capability Assessment.',
    boeReference: '§8 Penetration Testing phase',
    deliverables: ['PT Plan + PT Risk Management Plan', 'PT Report (CBEST 2024h)', 'D&R Capability Assessment (CBEST 2024i)'],
    roleContent: {
      teller: {
        summary: 'For about 14 weeks, the testing firm tries to break into the bank for real. They are using real attack methods against real systems. Your branch operations continue normally. You will not know any of it is happening.',
        keyPoints: [
          'Live production systems — the test is against the same systems you use every day.',
          'Customers are not affected. The testers stop short of any actual harm.',
          'If you suspect something — a strange call, a suspicious email — you report it through normal channels. That is the test.',
        ],
      },
      analyst: {
        summary: 'Fourteen weeks of intelligence-led testing on live production. PTSP executes scenarios with weekly status updates to the CG. De-chaining permitted if the testers get stuck. PT Report drafted within two weeks of execution end.',
        keyPoints: [
          'Sub-stages: 3.1 Planning, 3.2 Execution, 3.3 D&R Assessment, 3.4 Review.',
          'Live production unless legal/ethical constraints prevent (Annex A minimum criteria).',
          'PT phase has its own Risk Management Plan; weekly updates between PTSP and CG.',
          '"De-chaining" — if PTSP gets stuck, CG can grant assistance to advance to next attack phase. Logged in PT Report.',
        ],
      },
      soc: {
        summary: 'This is the phase that puts you in the hot seat. For 14 weeks, attacks based on the Phase 2 scenarios will be hitting your monitored systems. You will not know which incidents are tests and which are real. Your decision-making during this phase is what the D&R Capability Assessment grades.',
        keyPoints: [
          'Live production. The attacks are real techniques against real systems.',
          'Test/Halt model: if you escalate the wrong way, the test is degraded; if you escalate poorly, it is a finding.',
          'Some signals will be testers; some will be real attackers. Treat everything as real until proven otherwise.',
          'Practiced in all of SC014.',
        ],
      },
      executive: {
        summary: 'The 14-week window where the firm has a continuous low-grade controlled threat against production. CG supervises, signs off the PT Plan and Risk Management Plan, and can halt the test at any time for any reason.',
        keyPoints: [
          'CG retains technical and operational control throughout (BoE §5).',
          'Halt authority is the firm\'s; document the reason if invoked.',
          'Any concerns about scope drift or risk get reported to the regulator immediately.',
          'Practiced in SC014-S6 (the formal halt decision under ransomware).',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-3-1-PLANNING',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-3',
    order: 1,
    name: 'PT Planning',
    code: 'Phase 3.1',
    durationLabel: 'Phase 3, weeks 1–2',
    summary: 'The PTSP finalises the Penetration Test Plan begun in Phase 2.3. PT Risk Management Plan accompanies it. PTSP starts from a "warm start" because they have had early sight of the Scope Specification and the draft TI Reports.',
    boeReference: '§8.1 PT Planning',
    deliverables: ['Final PT Plan', 'PT Risk Management Plan'],
    roleContent: {
      teller: {
        summary: 'The testers finalise their attack plan. Nothing reaches your branch yet.',
        keyPoints: [
          'The plan maps scenarios from Phase 2 to specific test steps.',
        ],
      },
      analyst: {
        summary: 'PT Plan and PT Risk Management Plan finalised. The Plan must explicitly map test steps back to TI Report scenarios and to IBS-supporting systems. Golden thread preserved.',
        keyPoints: [
          'Test plan structure: prerequisites, target action/flags, success criteria, de-chaining options, expected timeline per phase.',
          'Attack methodology aligns to MITRE ATT&CK / Cyber Kill Chain (BoE §8.1).',
          'Risk Management Plan covers degradation-of-service and disclosure risks during test.',
        ],
      },
      soc: {
        summary: 'Test start is imminent. You still do not know it is coming. Your D&R baseline is what you do today and tomorrow.',
        keyPoints: [
          'PTSP plans include a hotline that the CG can use; you will not have access.',
          'Within days the first attacks begin. Continue normal operations.',
        ],
      },
      executive: {
        summary: 'You receive and accept the PT Plan and PT Risk Management Plan. CG approves the plans before Execution begins.',
        keyPoints: [
          'Approval gates the start of Phase 3.2.',
          'Risk Management Plan covers the controlled degradation thresholds the CG accepts.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-3-2-EXECUTION',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-3',
    order: 2,
    name: 'Execution',
    code: 'Phase 3.2',
    durationLabel: 'Phase 3, weeks 2–10 (~8 weeks active testing)',
    summary: 'PTSP executes the intelligence-led Penetration Test against in-scope target systems. Weekly status updates with the CG. Goals identified in the Intelligence phase provide the "flags" the PTSP attempts to capture.',
    boeReference: '§8.2 Execution',
    deliverables: ['Draft PT Report (within 2 weeks of test end)'],
    roleContent: {
      teller: {
        summary: 'The 14-week window where the test is actually happening. Continue normal operations exactly as you would on any other day.',
        keyPoints: [
          'Helpdesk vishing, phishing emails, suspicious supplier requests — your normal vigilance is the test.',
          'Report anything suspicious through normal channels. Do not investigate yourself.',
        ],
      },
      analyst: {
        summary: 'Active testing on live production. Weekly status meetings between PTSP and CG. Targeting Report continuously refined as tests run; CG and regulator notified of any scenario changes.',
        keyPoints: [
          'PTSP captures flags identified in Phase 2 scenarios.',
          'De-chaining permitted with regulator notification — logged in PT Report.',
          'Test/Halt model: CG can halt at any time. PTSP can pause for safety.',
          'Draft PT Report due within 2 weeks of execution completion.',
        ],
      },
      soc: {
        summary: 'You are under continuous controlled attack and you do not know it. Your responses, escalations, halts, and missed signals are all being graded for the D&R Capability Assessment in Phase 3.3.',
        keyPoints: [
          'Treat every signal as real. The asymmetric cost of being wrong about "is this the test" is enormous (SC014-S2 lesson).',
          'Test/Halt violations: standing down on a real intrusion is the worst case (SC013-S5-CONSEQUENCE).',
          'Some scoped systems will be hit. Without knowing which, your job is to detect and respond as you would to any other attacker.',
          'Practiced in all 8 stages of SC014.',
        ],
      },
      executive: {
        summary: 'CG receives weekly PTSP updates. You retain halt authority. Any significant concerns — scope drift, risk events — get reported immediately to the regulator.',
        keyPoints: [
          'Weekly cadence with PTSP; expect status reports on flags captured, missed, and emerging risk.',
          'Halt authority is yours; document the reason.',
          'Practiced in SC014-S6 (the halt decision under live ransomware).',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-3-3-DR-ASSESSMENT',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-3',
    order: 3,
    name: 'D&R Assessment',
    code: 'Phase 3.3',
    durationLabel: 'Phase 3, weeks 10–12 (after Execution)',
    summary: 'PTSP assesses the firm/FMI\'s Detection & Response capability. Quantitative + qualitative Capability Indicators. CCSAM-led. Includes post-test interviews with SOC and Incident Response teams. Returned to the regulator within two weeks of PT execution end.',
    boeReference: '§8.3 Assessment',
    deliverables: ['D&R Capability Assessment (CBEST 2024i)'],
    roleContent: {
      teller: {
        summary: 'The testers grade how well the bank\'s defenders responded. You may see SOC staff being interviewed; this is normal at this point.',
        keyPoints: [
          'The defenders\' performance is what gets graded here, not yours.',
        ],
      },
      analyst: {
        summary: 'CCSAM-led capability assessment of the SOC and IR. Like TIMA, this is independent — not self-certification. Capability Indicators are quantitative and qualitative.',
        keyPoints: [
          'CCSAM vouches for the evidence and final scores.',
          'Interview-based; firm identifies relevant SOC and IR staff.',
          'Within 2 weeks of PT execution end; regulator-bound.',
          'Practiced in SC014 — every stage feeds into this assessment retrospectively.',
        ],
      },
      soc: {
        summary: 'The grading round. Now you find out it was a test. CCSAM interviews you and your team. Your decisions during Execution become the assessment evidence.',
        keyPoints: [
          'Bring the actual logs, escalations, and decisions you made during Phase 3.2.',
          'Honest reporting — including missed signals — is the right answer.',
          'Findings flow into the PT Report and the Remediation Plan.',
        ],
      },
      executive: {
        summary: 'Independent assessment of your SOC and IR capability against industry benchmarks. CCSAM cannot be vetoed pre-regulator. Findings flow to remediation prioritisation.',
        keyPoints: [
          'Process is not self-certification.',
          'Significant gaps named here will need a Board-visible response.',
          'Findings feed the Remediation Plan in Phase 4.1.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-3-4-REVIEW',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-3',
    order: 4,
    name: 'Review',
    code: 'Phase 3.4',
    durationLabel: 'Phase 3, weeks 12–14',
    summary: 'CG, regulator, PTSP, and TISP hold a Review workshop. Draft PT Report and D&R Capability Assessment reviewed; TI findings revisited; TIMA results discussed; mitigation strategies proposed. Final PT Report produced.',
    boeReference: '§8.4 Review',
    deliverables: ['Final Penetration Test Report (CBEST 2024h)'],
    roleContent: {
      teller: {
        summary: 'The findings are reviewed. Some may eventually translate into staff training or process changes that reach your branch.',
        keyPoints: [
          'You may receive new training on patterns the test exposed.',
        ],
      },
      analyst: {
        summary: 'All four parties together. PT performance reviewed, D&R findings discussed, TIMA results compared, mitigation discussed. Final PT Report produced after CG corrections.',
        keyPoints: [
          'Inaccuracies in the draft PT Report can be corrected with the regulator before the final.',
          'PTSP also discusses what could have been achieved with more time/resources — calibration of the threat picture.',
          'Out-of-scope scenarios surfaced as candidates for follow-up.',
        ],
      },
      soc: {
        summary: 'You are now part of the conversation. The Review workshop discusses what the testers achieved versus what your team detected. Use this for honest calibration of what your detection covers and where the gaps are.',
        keyPoints: [
          'Drafts are reviewable; corrections to inaccuracies are normal.',
          'Test/Halt violations and missed signals get named here.',
          'Findings inform the Remediation Plan you will help execute in Phase 4.',
        ],
      },
      executive: {
        summary: 'Workshop is regulator-organised. Final PT Report produced for delivery to the regulator. CG should start drafting the Remediation Plan considering all findings.',
        keyPoints: [
          'CG can request corrections to the draft PT Report before finalising.',
          'Out-of-scope findings flagged for Business Continuity follow-up.',
          'Final PT Report becomes the basis for Phase 4.1 remediation.',
        ],
      },
    },
  },

  // ===========================================================================
  // PHASE 4 — Closure (top-level)
  // ===========================================================================
  {
    id: 'CBEST-PHASE-4',
    framework: 'CBEST',
    level: 'phase',
    parentId: null,
    order: 4,
    name: 'Closure',
    code: 'Phase 4',
    durationLabel: '~4 weeks',
    summary: 'Firm/FMI Remediation Plan is finalised. Remediation Plan workshop with regulator. Debrief with all parties. Regulator supervises the execution of the Remediation Plan as part of ongoing supervisory engagement.',
    boeReference: '§9 Closure phase',
    deliverables: ['Final Remediation Plan (CBEST 2024j)', 'Debrief log'],
    roleContent: {
      teller: {
        summary: 'The findings get turned into action. Some changes may reach your branch — new training, new processes, new system updates.',
        keyPoints: [
          'Branch-level remediation can include training updates and refreshed alerting.',
        ],
      },
      analyst: {
        summary: 'Closure pack: Remediation Plan + Debrief. CG drafts the Remediation Plan from PT Report, D&R Assessment, and TIMA findings. Workshop with regulator to revise and agree.',
        keyPoints: [
          'Sub-stages: 4.1 Remediation, 4.2 Debrief, 4.3 Supervision.',
          'Plan covers risk and impact assessments translated to business risk and IBS impact.',
          'Practiced in SC013-S6.',
        ],
      },
      soc: {
        summary: 'Remediation actions you helped identify get scheduled. The Supervision phase means the regulator tracks closure for months afterward.',
        keyPoints: [
          'Detection gaps get prioritised remediation; budget allocation flows from CG sign-off.',
          'You may run new pilots, new tooling, new playbooks based on the findings.',
        ],
      },
      executive: {
        summary: 'Final deliverable to the regulator: Remediation Plan. Board input expected. Plan covers governance, risk owners, and technical work agreed with technical functions.',
        keyPoints: [
          'CG ends formal CBEST engagement at Remediation; Supervision continues.',
          'Plan structure: governance, Board input, risk owners, technical activities.',
          'Practiced in SC013-S6.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-4-1-REMEDIATION',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-4',
    order: 1,
    name: 'Remediation',
    code: 'Phase 4.1',
    durationLabel: 'Phase 4, weeks 1–3',
    summary: 'CG drafts initial Remediation Plan using CBEST 2024j template. Plan considers PT Report, TIMA, and D&R Capability Assessment findings. Workshop with regulator to agree revisions. Final plan signed off.',
    boeReference: '§9.1 Remediation',
    deliverables: ['Final Remediation Plan (CBEST 2024j)'],
    roleContent: {
      teller: {
        summary: 'Findings get translated into plans. Some changes may reach your branch in the months following.',
        keyPoints: [
          'Training refreshes are a common branch-level remediation outcome.',
        ],
      },
      analyst: {
        summary: 'CG drafts Remediation Plan. Considers all CBEST findings. Final plan signed off after regulator workshop. Each finding has a remediation path. SC013-S6 plays the prioritisation decision.',
        keyPoints: [
          'CBEST is not pass/fail. Findings become improvement actions.',
          'Risk and impact assessments translate technical findings to business risk.',
          'Practiced in SC013-S6.',
        ],
      },
      soc: {
        summary: 'Detection and response gaps named in the D&R Assessment become specific remediation items. You contribute to the technical remediation design.',
        keyPoints: [
          'Detection enhancements, runbook updates, tooling changes — typical D&R remediations.',
        ],
      },
      executive: {
        summary: 'Remediation prioritisation is the firm\'s call, supervised by the regulator. Picking the largest blast-radius finding first is what the framework rewards. Deferring to the regulator inverts the design.',
        keyPoints: [
          'Three executive-decision moments in CBEST: scope sign-off, procurement gate, remediation prioritisation. This is the third.',
          'Board sign-off expected.',
          'Practiced in SC013-S6 — picking which of three findings to fund first.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-4-2-DEBRIEF',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-4',
    order: 2,
    name: 'Debrief',
    code: 'Phase 4.2',
    durationLabel: 'Phase 4, weeks 3–4',
    summary: 'Final Debrief with the regulator. TISP and PTSP provide feedback on the CBEST process and suggest improvements. Debrief log captures outcomes.',
    boeReference: '§9.2 Debrief',
    deliverables: ['Debrief log'],
    roleContent: {
      teller: {
        summary: 'A wrap-up meeting at HQ. You will not be there.',
        keyPoints: [
          'The findings are now committed to a plan; this is the close-out conversation.',
        ],
      },
      analyst: {
        summary: 'TISP, PTSP, CG, and regulator all give and receive feedback on how the CBEST process ran. Lessons captured.',
        keyPoints: [
          'Regulator-led; feedback both ways.',
          'Improvements feed into future CBEST cycles.',
        ],
      },
      soc: {
        summary: 'You may participate in the Debrief depending on how the firm structures it. Useful to share what you learned about your detection blind spots.',
        keyPoints: [
          'Honest debrief gets better follow-on training, tooling, and process.',
        ],
      },
      executive: {
        summary: 'Final formal meeting with the regulator. Debrief log is closure documentation; supervisory engagement continues separately.',
        keyPoints: [
          'CG\'s formal CBEST engagement ends with Remediation; Debrief is process feedback.',
        ],
      },
    },
  },

  {
    id: 'CBEST-PHASE-4-3-SUPERVISION',
    framework: 'CBEST',
    level: 'sub-stage',
    parentId: 'CBEST-PHASE-4',
    order: 3,
    name: 'Supervision',
    code: 'Phase 4.3',
    durationLabel: 'Continues for months/years post-CBEST',
    summary: 'The regulator supervises the execution of the Remediation Plan as part of ongoing supervisory engagement. Tracks compliance with agreed actions; follow-up at 3, 6, 12 months typical.',
    boeReference: '§9.3 Supervision',
    deliverables: ['Ongoing supervisory engagement'],
    roleContent: {
      teller: {
        summary: 'The bank reports progress to the regulator over the following year. You will not be involved directly.',
        keyPoints: [
          'Branch-level changes from the Remediation Plan land here over time.',
        ],
      },
      analyst: {
        summary: 'Compliance tracking against the Remediation Plan. Follow-ups at 3/6/12 months are typical. Findings prioritisation will be remembered.',
        keyPoints: [
          'Regulator tracks remediation execution, not just plan agreement.',
          'Continued evidence requests possible.',
        ],
      },
      soc: {
        summary: 'Detection and response improvements get stood up and reviewed for effectiveness. Some remediations are quick (runbook updates); others take quarters (architecture changes).',
        keyPoints: [
          'Track remediation execution honestly — gaps become future findings.',
        ],
      },
      executive: {
        summary: 'Ongoing supervisory engagement. Regulator tracks the firm\'s remediation execution at 3, 6, 12 month touchpoints. Supervisory file note follows the firm.',
        keyPoints: [
          'Track remediation execution to closure; report progress to Board and regulator.',
          'Choice of which finding to fund first (Phase 4.1) is remembered here.',
        ],
      },
    },
  },

  // ===========================================================================
  // POST-CBEST — Thematic Analysis (top-level, no sub-stages)
  // ===========================================================================
  {
    id: 'CBEST-POST-THEMATIC',
    framework: 'CBEST',
    level: 'phase',
    parentId: null,
    order: 5,
    name: 'Thematic Analysis',
    code: 'Post-CBEST',
    durationLabel: 'After CBEST cycle completion',
    summary: 'PRA and FCA jointly compile anonymised cross-firm findings, with NCSC alignment, into a periodic thematic report. Shared with non-CBEST participant firms/FMIs to improve sector-level cyber resilience.',
    boeReference: '§10 Post CBEST: thematic analysis',
    deliverables: ['Thematic Report (sector-shared)'],
    roleContent: {
      teller: {
        summary: 'The regulator publishes lessons learned across all CBESTs run. Sometimes those lessons influence sector-wide guidance that reaches your training.',
        keyPoints: [
          'Anonymised — no firm is named.',
          'Findings about frontline-relevant patterns (vishing, supplier social engineering) sometimes appear here.',
        ],
      },
      analyst: {
        summary: 'Anonymised findings across CBEST cohort produce sector-level themes. PRA + FCA jointly compile, NCSC contributes context.',
        keyPoints: [
          'Useful threat-intelligence input even for non-participant firms.',
          'Themes track year-over-year (e.g. helpdesk vishing dominance in retail).',
        ],
      },
      soc: {
        summary: 'Sector-level themes become public reference for what attackers are achieving across the industry. Useful for benchmarking your detection posture.',
        keyPoints: [
          'Use thematic reports to validate your detection coverage against sector findings.',
        ],
      },
      executive: {
        summary: 'PRA + FCA + NCSC collaboration. Thematic report shared with non-participants to lift sector resilience.',
        keyPoints: [
          'Useful for Board-level briefing on sector posture.',
          'Anonymised — no firm-specific information leaves CBEST.',
        ],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Stage → CBEST sub-stage mappings (the IN_FRAMEWORK_PHASE edges).
// Authored from BoE doc §6/§7/§8/§9 alignment with SC013/SC014 narratives.
// ---------------------------------------------------------------------------
export const SC013_STAGE_PHASE_MAP = {
  'SC013-S1':              'CBEST-PHASE-1-2-ENGAGEMENT',
  'SC013-S1-CONSEQUENCE':  'CBEST-PHASE-1-2-ENGAGEMENT',
  'SC013-S2':              'CBEST-PHASE-1-3-SCOPING',
  'SC013-S3':              'CBEST-PHASE-1-4-PROCUREMENT',
  'SC013-S3-CONSEQUENCE':  'CBEST-PHASE-1-4-PROCUREMENT',
  'SC013-S4':              'CBEST-PHASE-2-3-VALIDATION',
  'SC013-S5':              'CBEST-PHASE-3-2-EXECUTION',
  'SC013-S5-CONSEQUENCE':  'CBEST-PHASE-3-2-EXECUTION',
  'SC013-S6':              'CBEST-PHASE-4-1-REMEDIATION',
}

export const SC014_STAGE_PHASE_MAP = {
  'SC014-S1':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S2':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S2-CONSEQUENCE':  'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S3':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S4':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S5':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S6':              'CBEST-PHASE-3-2-EXECUTION',
  'SC014-S6-CONSEQUENCE':  'CBEST-PHASE-3-2-EXECUTION',
}
