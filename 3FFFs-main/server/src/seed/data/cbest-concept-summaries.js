/**
 * cbest-concept-summaries.js — CBEST per-framework concept summaries (v25.6.2)
 *
 * ISS-014. Fills in the `pending: true` APPEARS_IN_FRAMEWORK edges from
 * AASE concepts to the CBEST framework (8 concepts), plus enriches the
 * already-populated CONCEPT-CREST-ACCREDITATION → CBEST edge with the
 * v25.6.1-canonical OBS-018 four-lens roleContent.
 *
 * Each entry sets:
 *   summary       — single text block (the analyst lens, basically; the
 *                   existing single-text fallback path keeps showing this
 *                   for any caller that hasn't been updated to read
 *                   roleContent)
 *   roleContent   — { teller, analyst, soc, executive } each with
 *                   summary (1-2 sentences) + keyPoints (2-3 bullets)
 *   pending       — false (these are now populated)
 *   vintage       — '2024' (BoE Implementation Guide reference period)
 *
 * Authoritative source: Bank of England, "CBEST Threat Intelligence-Led
 * Assessments — Implementation Guide", 2024 edition, PRA, CC-BY 4.0.
 *
 * Vintage marker: 'CBEST 2024 BoE Implementation Guide (v25.6.2)'
 */

export const CBEST_CONCEPT_SUMMARIES = [
  // ===========================================================================
  // CONCEPT-CRITICAL-FUNCTION → CBEST IBS (Important Business Service)
  // ===========================================================================
  {
    conceptId: 'CONCEPT-CRITICAL-FUNCTION',
    framework: 'CBEST',
    summary: 'CBEST does not use the AASE term "Critical Function". The CBEST equivalent is "Important Business Service" (IBS), defined and proposed by the firm in Phase 1.3 Scoping and validated by the regulator. The IBS list anchors the entire CBEST: Targeting Reports, Threat Intelligence Reports, and Penetration Test scope all key off it. Disruption to an IBS is what would meaningfully harm customers or the financial system.',
    roleContent: {
      teller: {
        summary: 'In CBEST these are called "Important Business Services" rather than Critical Functions. If your branch\'s payment terminal or core banking system is named on the IBS list, it is in scope for testing.',
        keyPoints: [
          'Same idea as Critical Function, different name.',
          'IBS scope is decided at HQ; you will not be told which systems are scoped.',
          'In-scope systems get tested live; you do not see the test.',
        ],
      },
      analyst: {
        summary: 'In CBEST, "Important Business Service" replaces AASE\'s "Critical Function". The firm proposes the IBS list in Phase 1.3 Scoping; the regulator validates it. Each IBS gets supporting key systems and compromise actions (CIA) defined for it. The CBEST procedural arc keys off this list.',
        keyPoints: [
          'IBS list is firm-led; deferring to the regulator is itself a finding (SC013-S2).',
          'Each IBS is paired with supporting systems + compromise actions (confidentiality, integrity, availability).',
          'The Targeting Report (CBEST 2024e) and TI Report (CBEST 2024f) both key off the IBS list.',
          'Practiced in SC013-S2 — the IBS triage decision.',
        ],
      },
      soc: {
        summary: 'CBEST IBS list is a Control Group secret. You do not learn which IBSs are scoped — by design. The point is that you respond to test activity against any system as if it were real.',
        keyPoints: [
          'Need-to-know within the CG; the SOC is intentionally outside.',
          'During Phase 3.2 Execution, attacks will hit one or more in-scope IBSs.',
          'Your D&R Capability Assessment grades how you responded — not whether you guessed which IBS was scoped.',
        ],
      },
      executive: {
        summary: 'You sign off the IBS list as part of the Scope Specification (CBEST 2024d). One of three executive-decision moments in CBEST. The list must be representative — over-narrowing to dodge findings is itself a finding.',
        keyPoints: [
          'Scope Specification signed off by you; regulator countersigns.',
          'Third-party / supplier-underpinned IBSs require Supplementary Guidance (CBEST 2024k).',
          'IBS scope flows into the entire downstream test — bad scope, bad test.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-CONCESSION → CBEST de-chaining
  // ===========================================================================
  {
    conceptId: 'CONCEPT-CONCESSION',
    framework: 'CBEST',
    summary: 'CBEST has a near-equivalent of the AASE "Concession" called "de-chaining". If the PTSP gets stuck at one phase of an attack chain (e.g. cannot achieve initial access via the planned vector), the CG can grant a controlled assist to advance them to the next phase — typically by providing assumed-access credentials. De-chaining is logged in the PT Report; the test continues from the next stage of the kill chain.',
    roleContent: {
      teller: {
        summary: 'A concession in CBEST means giving the testers a small leg up if they get stuck — to keep the test moving without breaking realism. Branches are not involved in concession decisions.',
        keyPoints: [
          'Decided by the Control Group, not by you.',
          'Logged in the final test report.',
        ],
      },
      analyst: {
        summary: 'CBEST calls this "de-chaining" (BoE §8.2). The CG can grant the PTSP an assumed-access concession to advance from one phase of the kill chain to the next. Used when the test is genuinely blocked, not as an easy out. Documented in the PT Report so the regulator can read the limitation.',
        keyPoints: [
          'CG decision; regulator notified per Risk Management Plan.',
          'Logged in the final PT Report (CBEST 2024h) so findings are interpretable.',
          'Common case: PTSP cannot achieve initial access in time; CG grants an assumed-credential concession to progress to lateral movement.',
        ],
      },
      soc: {
        summary: 'You will not know a concession was granted. The PTSP suddenly having credentials they should not have had is part of the test design — but you cannot tell concession apart from a real attacker who already has them.',
        keyPoints: [
          'Concession granting is opaque to the SOC by design.',
          'A "credentials appearing from nowhere" pattern in test logs may simply be a logged concession.',
          'Your job stays the same: detect, escalate, contain — concession or not.',
        ],
      },
      executive: {
        summary: 'CG decision. You weigh test progress against scope drift. Granting too readily turns the test into a guided tour; refusing dogmatically wastes the engagement when minor assists would unlock useful findings.',
        keyPoints: [
          'CG approval required; document the rationale.',
          'Regulator visibility maintained via Risk Management Plan updates.',
          'Concession patterns surface in the Review workshop and are noted in the PT Report.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-LETTER-OF-ENGAGEMENT → CBEST Notification Letter + PID
  // ===========================================================================
  {
    conceptId: 'CONCEPT-LETTER-OF-ENGAGEMENT',
    framework: 'CBEST',
    summary: 'CBEST splits the AASE Letter of Engagement role across two artefacts: the Notification Letter (regulator → firm; formally launches the CBEST per Phase 1.1) and the Project Initiation Document (PID), which is the firm-side internal artefact capturing scope, schedule, and CG composition. Together they serve the same function: a written, regulator-visible commitment to the CBEST.',
    roleContent: {
      teller: {
        summary: 'CBEST starts with a formal letter from the regulator. There is also an internal project document but you will not see either.',
        keyPoints: [
          'Notification Letter is the regulator\'s formal request.',
          'PID is internal; both are short of public.',
        ],
      },
      analyst: {
        summary: 'Two artefacts where AASE has one. The Notification Letter is written-to-the-firm by the regulator (Phase 1.1 Launch) and starts the 40-working-day clock. The PID is firm-side: scope, schedule, CG composition, communication protocols. Both are mandatory before procurement begins.',
        keyPoints: [
          'Notification Letter triggers CBEST formally; firm has 40 working days to engage.',
          'PID is the firm\'s internal CBEST charter; updated through Phases 1 and 2.',
          'Practiced in SC013-S1 (engagement workshop where both artefacts are referenced).',
        ],
      },
      soc: {
        summary: 'Neither artefact reaches you. The Notification Letter is regulator-to-firm; the PID is CG-internal. CBEST secrecy obligations keep both off your desk.',
        keyPoints: [
          'No SOC role in either artefact.',
          'You should not see, read, or discuss either.',
        ],
      },
      executive: {
        summary: 'You receive the Notification Letter on behalf of the firm. You sign off on the PID as the CBEST charter. Both define your accountability for the engagement.',
        keyPoints: [
          'Notification Letter goes to the executive sponsor; 40 working days to respond.',
          'PID names the executive sponsor and CGC explicitly.',
          'Cross-jurisdictional CBESTs require additional regulator alignment in the PID.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-TEST-HALT-MODEL → CBEST Halt authority
  // ===========================================================================
  {
    conceptId: 'CONCEPT-TEST-HALT-MODEL',
    framework: 'CBEST',
    summary: 'CBEST has the same Test/Halt model as AASE, but it is anchored to the Control Group and explicitly retained by the firm/FMI throughout the test (BoE §5). The CG can halt at any time for any reason; the PTSP can pause for safety. The model is codified in the PT Risk Management Plan agreed in Phase 3.1 Planning, and the halt threshold is invoked in real-world contexts during Execution (SC014-S6 plays this).',
    roleContent: {
      teller: {
        summary: 'The bank can stop the test at any time if something is going wrong. You do not make this call; the Control Group does.',
        keyPoints: [
          'Halt authority sits with the CG.',
          'PTSP can also pause if they think they are about to break something live.',
        ],
      },
      analyst: {
        summary: 'Same shape as AASE. CG halt authority is codified in the PT Risk Management Plan (Phase 3.1) and operationalised throughout Phase 3.2 Execution. Halt invocation is a documented event — the PT Report will reference it. Practiced in SC013-S5 (test halt under PT confusion) and SC014-S6 (halt under live ransomware).',
        keyPoints: [
          'CG retains technical and operational control (BoE §5).',
          'Halt rationale documented; regulator notified.',
          'Standing down on a real intrusion (mistaking it for the test) is the worst-case Test/Halt failure (SC013-S5-CONSEQUENCE).',
        ],
      },
      soc: {
        summary: 'You don\'t invoke the halt — that\'s the CG\'s call. But your escalation behaviour is what feeds halt decisions. Treating real activity as test (or test as not-our-problem) is what produces a missed halt or a wasted halt. The asymmetry: missed halts are findings, wasted halts are noted but recoverable.',
        keyPoints: [
          'Escalate everything as if real; let the CG decide what is test.',
          'Test/Halt failures are graded in the D&R Capability Assessment.',
          'SC014-S6 plays the canonical test/real ambiguity moment.',
        ],
      },
      executive: {
        summary: 'You hold halt authority through the CG. Document the rationale every time it is invoked. Halt is not failure — it is responsible test management, especially under live production constraint.',
        keyPoints: [
          'Halt rationale recorded in PT Risk Management Plan supplements.',
          'Regulator notified of any halt or significant pause.',
          'Halt patterns inform the Review workshop and Remediation Plan.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-EXERCISE-SECRECY → CBEST §3.2.2 / §5 secrecy obligations
  // ===========================================================================
  {
    conceptId: 'CONCEPT-EXERCISE-SECRECY',
    framework: 'CBEST',
    summary: 'CBEST secrecy is firm-wide and binding. CG members are secrecy-bound; SOC, IR, and the broader workforce are intentionally kept blind to the test. Secrecy compromise — including suspicion of compromise — triggers an immediate notification obligation to the regulator under BoE Implementation Guide §3.2.2 and §5. There is no specific clock; the requirement is "immediately" and judgement-based.',
    roleContent: {
      teller: {
        summary: 'The bank does not tell most of its own staff that a CBEST is happening. That includes you. If you somehow find out, do not share it — secrecy compromise is a regulatory event.',
        keyPoints: [
          'Secrecy is a firm-wide commitment to the regulator.',
          'If you suspect a colleague has been told: tell your manager, not the colleague.',
        ],
      },
      analyst: {
        summary: 'Secrecy applies firm-wide; the CG is the only group permitted full visibility. Secrecy compromise — actual or suspected — must be notified to the regulator immediately (BoE §3.2.2). No specific clock; the bar is "without delay" and judgement-based on the nature of the compromise.',
        keyPoints: [
          'CG composition is intentionally small — secrecy is preserved by limiting "in-the-loop" headcount.',
          'Notification obligation is immediate, not on a fixed clock (corrects v25.5.2 misframing of a 4-hour window).',
          'Disclosed scope before procurement = potential test invalidation; regulator decides remedy.',
        ],
      },
      soc: {
        summary: 'You are deliberately outside CBEST secrecy — that is the entire point of the test. If you become aware a CBEST is running, treat that knowledge itself as a compromise, escalate to your manager (NOT the CG directly), and stop investigating until told otherwise.',
        keyPoints: [
          'Awareness compromises detection signal — your blindness is the test instrument.',
          'CBEST secrecy obligations apply to you the moment you become aware.',
          'SC014-S6 plays the secrecy-aware reporting decision under live ransomware suspicion.',
        ],
      },
      executive: {
        summary: 'Secrecy is your firm\'s commitment to the regulator. Compromise events go to the regulator immediately — judgement-based, not on a fixed clock. CG composition discipline is the primary tool for keeping secrecy intact.',
        keyPoints: [
          'CG composition: small, senior, decision-authoritative.',
          'Compromise notification: immediate, BoE §3.2.2 / §5.',
          'Document the compromise rationale; regulator decides whether the test can continue.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-ESCALATION-PATH → CBEST CG composition + CGC role
  // ===========================================================================
  {
    conceptId: 'CONCEPT-ESCALATION-PATH',
    framework: 'CBEST',
    summary: 'CBEST formalises the AASE "Organisational Escalation Path" through two structures: the Control Group (CG) and the CG Coordinator (CGC). The CG holds decision authority; the CGC chairs CG activity day-to-day and is the firm\'s primary point of contact with the regulator and providers. SOC and IR escalations during Phase 3.2 Execution route around the CG to avoid breaking secrecy (BoE Annex B).',
    roleContent: {
      teller: {
        summary: 'CBEST has a small group of senior people who coordinate the test. That group is shielded from the rest of the bank to keep the test honest. Your normal escalation path stays the same.',
        keyPoints: [
          'Control Group is CBEST\'s decision body.',
          'You escalate normally — to your manager or fraud team, not to the CG.',
        ],
      },
      analyst: {
        summary: 'The Control Group is CBEST\'s decision body; the CGC chairs it and runs day-to-day coordination. SOC and IR escalations during Phase 3.2 deliberately bypass the CG (Annex B RACI) — that is what keeps secrecy intact.',
        keyPoints: [
          'CG composition: small, senior, decision-authoritative; not necessarily limited to COO/CIO/CTO/CISO.',
          'CGC is the firm\'s primary contact with regulator + providers.',
          'BoE Annex B has the canonical RACI for CBEST roles.',
        ],
      },
      soc: {
        summary: 'You escalate as if it were a real attack — through your normal incident response path, NOT to the CG. That bypass is intentional. The CG learns about your responses through the D&R Capability Assessment, not through real-time channels.',
        keyPoints: [
          'Real-time SOC escalations follow normal IR runbook; CG is not on the call.',
          'Bypassing the CG keeps your detection signal honest.',
          'D&R Assessment captures your decisions retrospectively (Phase 3.3).',
        ],
      },
      executive: {
        summary: 'You sit on the CG (typically as executive sponsor or delegate). The CGC reports to you. CG composition discipline is the primary risk control: small, senior, decision-authoritative.',
        keyPoints: [
          'Executive sponsor is RACI-accountable for CBEST delivery.',
          'CGC is the day-to-day chair; reports up to executive sponsor.',
          'CG composition rule: needs-to-know, decision-authoritative; exclusions are deliberate.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-NO-FLY-ZONE → CBEST scope exclusions / Annex A constraints
  // ===========================================================================
  {
    conceptId: 'CONCEPT-NO-FLY-ZONE',
    framework: 'CBEST',
    summary: 'CBEST allows scope exclusions where legal, regulatory, ethical, or operational-risk constraints make live testing inappropriate. Excluded systems are documented in the Scope Specification (CBEST 2024d) with rationale; the regulator weighs the exclusion against the test\'s value. Non-CBEST follow-up testing (e.g. tabletop, lab) is recommended for excluded systems. Differs from AASE No-Fly Zones in that CBEST scope is regulator-validated not just firm-discretionary.',
    roleContent: {
      teller: {
        summary: 'Some systems are kept out of CBEST testing because the risk to operations is too high. The bank decides which, with regulator agreement.',
        keyPoints: [
          'Exclusions are negotiated, not unilateral.',
          'Excluded systems usually get tested some other way.',
        ],
      },
      analyst: {
        summary: 'Exclusions live in the Scope Specification with rationale. The regulator validates each exclusion; over-broad exclusions are themselves a finding (the test cannot dodge findings by scoping them out). Annex A in the BoE Implementation Guide lists scope-shape minimum criteria.',
        keyPoints: [
          'Each exclusion documented with rationale.',
          'Regulator can challenge exclusions during Validation (Phase 2.3).',
          'Tabletop or lab testing recommended for excluded systems as parallel coverage.',
        ],
      },
      soc: {
        summary: 'You will not know which systems are excluded — same secrecy principle as for the in-scope IBSs. If an attack on an excluded system materialises during Execution, treat it as real (because it isn\'t the test, by definition).',
        keyPoints: [
          'Excluded systems are still attacked by real adversaries.',
          'A test-feeling event on an excluded system is, by definition, not the test.',
          'Detection coverage for excluded systems matters in the D&R Assessment.',
        ],
      },
      executive: {
        summary: 'You sign off on exclusions as part of the Scope Specification. The regulator reviews. Over-broad exclusions read as scope-shopping and become a finding.',
        keyPoints: [
          'Each exclusion documented and justified.',
          'Regulator weighs the exclusion against test value.',
          'Practice: ensure non-CBEST testing covers any excluded high-risk systems.',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-THREAT-MATRIX → CBEST TI Report scenarios (CBEST 2024f)
  // ===========================================================================
  {
    conceptId: 'CONCEPT-THREAT-MATRIX',
    framework: 'CBEST',
    summary: 'CBEST does not use the AASE term "Threat Matrix". Instead, the TISP produces a Threat Intelligence Report (CBEST 2024f) that profiles relevant threat actors, their TTPs (using established frameworks like MITRE ATT&CK and Cyber Kill Chain), and develops scenarios. The output is more structured than AASE\'s matrix; it explicitly cross-references intelligence sources and validates probability against the firm\'s real attack surface (from the Targeting Report).',
    roleContent: {
      teller: {
        summary: 'In CBEST, threat actors and their methods are studied in detail by an outside firm and written into a report. You do not see the report, but the threats it describes are real ones that target banks like yours.',
        keyPoints: [
          'Outside experts research relevant attackers and methods.',
          'Findings often relate to vishing, phishing, supplier social engineering — patterns you may already be trained on.',
        ],
      },
      analyst: {
        summary: 'TI Report (CBEST 2024f) replaces the matrix structure with named-actor profiles, TTPs from MITRE ATT&CK / Cyber Kill Chain, and validated scenarios. Insider and supply-chain scenarios are mandatory (BoE §7.2.3). Validation workshop (Phase 2.3) is where the firm calibrates the report — not capitulation, calibration.',
        keyPoints: [
          'Two distinct deliverables: Targeting Report (CBEST 2024e) + TI Report (CBEST 2024f).',
          'Scenarios use MITRE ATT&CK / Cyber Kill Chain — same frameworks your tooling references.',
          'Practiced in SC013-S4 (Validation workshop).',
        ],
      },
      soc: {
        summary: 'The TI Report names the actors and TTPs that will be simulated against you in Phase 3.2. You don\'t read the report — but the attacks you face during Execution map back to it. The Cyber Kill Chain and MITRE ATT&CK references give you a shared language with the testers.',
        keyPoints: [
          'Phase 3.2 attacks key off the TI Report.',
          'MITRE ATT&CK references throughout — shared vocabulary.',
          'Real-actor TTPs simulated; treat detection signal as adversarial.',
        ],
      },
      executive: {
        summary: 'You review the TI Report in the Validation workshop. Calibration is engagement, not pushback. Each rejected scenario justified in writing. The TI Report\'s scenarios become the test plan that runs against the firm.',
        keyPoints: [
          'Validation workshop in Phase 2.3 — three hours, regulator-facilitated.',
          'Rejected scenarios documented; CG decision authority.',
          'Insider + supply-chain scenarios mandatory (BoE §7.2.3).',
        ],
      },
    },
  },

  // ===========================================================================
  // CONCEPT-CREST-ACCREDITATION (CBEST-defined; v25.6.0 already populated;
  // we add roleContent here for OBS-018 completeness)
  // ===========================================================================
  {
    conceptId: 'CONCEPT-CREST-ACCREDITATION',
    framework: 'CBEST',
    // Keep the v25.6.0 summary intact — already correct. Just adding
    // roleContent. The migration script preserves this field.
    summary: null,  // signal: do not overwrite v25.6.0 summary
    roleContent: {
      teller: {
        summary: 'The bank only hires test firms that the Bank of England has approved. The list is public; the rules are strict.',
        keyPoints: [
          'CBEST-accredited means BoE-approved.',
          'CREST membership is also required but is separate.',
        ],
      },
      analyst: {
        summary: 'CBEST accreditation is BoE-issued; CREST membership is a co-requirement, not a substitute. The accreditation register is on the CREST website but the gate is BoE\'s. "In renewal" is not "accredited" — verify before contract signature.',
        keyPoints: [
          'TISP day-to-day: CCTIM (CREST Certified Threat Intelligence Manager).',
          'PTSP day-to-day: CCSAM (CREST Certified Simulated Attack Manager).',
          'Practiced in SC013-S3 + SC013-S3-CONSEQUENCE.',
        ],
      },
      soc: {
        summary: 'Two outside firms become operational against your network during Phase 3.2: TISP collects intelligence, PTSP runs the test. Both must be on the BoE\'s accredited register.',
        keyPoints: [
          'Accreditation is the regulator\'s quality bar for who tests you.',
          'Both providers contractually authorised under Computer Misuse Act.',
        ],
      },
      executive: {
        summary: 'Accreditation gate is one of three executive-decision moments in CBEST. The slippage cost of getting it wrong is 4–6 weeks plus a supervisory note. Verify register status before contract signature, every time.',
        keyPoints: [
          'Hard binary gate — accredited or not, no fractional credit.',
          'Within accredited pool: pick on sector match, prior CBEST experience, and price.',
          'Practiced in SC013-S3 + S3-CONSEQUENCE.',
        ],
      },
    },
  },
]
