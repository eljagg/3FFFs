/**
 * aase-scenario.js — SC010 content for v25.1
 *
 * "Commissioning Your First AASE" — the analyst plays the security manager
 * delegated by the Bank's CISO to plan, scope, and commission the bank's
 * first ABS-style Adversarial Attack Simulation Exercise.
 *
 * Why this scenario exists:
 *   The other nine scenarios (SC001-SC009) train front-line and ops staff
 *   to detect specific fraud techniques. SC010 trains the security manager
 *   tier — someone who reports to the CISO — to commission a red-team
 *   exercise without making expensive mistakes (wrong provider, scope too
 *   narrow, secrecy compromised, escalation path mishandled).
 *
 * Audience: Caribbean bank security analyst preparing their first AASE.
 *   The narrative is set at "First Caribbean Trust Bank" (a fictional
 *   composite of regional banks) so the framing is concrete without
 *   naming any real institution.
 *
 * Structure:
 *   7 primary stages walking the planning phase end-to-end
 *   2 consequence branches showing what happens when the analyst
 *     picks the seductive-but-wrong answer at the high-stakes stages
 *
 * Stage-to-graph wiring:
 *   Each primary stage carries an `aaseConcept` (the Concept ID it tests)
 *   and an `aasePhase` (the FrameworkPhase ID it lives in). The migration
 *   creates :TESTS_CONCEPT and :IN_AASE_PHASE edges. The client renders
 *   these as the new chip in StagePanel and as the lookup affordance for
 *   the Concept sidebar.
 *
 * Notes:
 *   - No technique/tactic links — SC010 is AASE-native, not F3-mapped.
 *     Existing Scenario.jsx already handles missing tactic gracefully
 *     (the AttackPath circles render with stage number alone).
 *   - Severity = high because the operational risk of getting AASE
 *     planning wrong (e.g., letting a real attack through the response
 *     queue because everyone thinks it's the test) is genuine.
 */

export const AASE_SCENARIO = {
  id: 'SC010',
  title: 'Commissioning Your First AASE — First Caribbean Trust',
  severity: 'high',
  // Estimated loss is the order-of-magnitude exposure if the bank's first
  // red-team is mis-commissioned. A failed AASE that proceeds anyway can
  // produce false assurance for years; a successful AASE that breaks
  // production can cost millions in outage. Both are real bank scenarios.
  estimatedLoss: 5_000_000,
  summary: 'You\'re a senior security analyst at First Caribbean Trust, a regional bank with retail, trade-finance, and correspondent-banking operations across Jamaica, Cayman, and the OECS. The CISO has delegated the planning of the bank\'s first Adversarial Attack Simulation Exercise to you. The Board has approved a budget. The Bank of Jamaica\'s cyber-resilience guidance points at the four major frameworks (AASE, CBEST, TIBER-EU, iCAST) but mandates none. Decisions you make in the next four weeks shape whether the exercise tells the truth, costs the bank operational pain for nothing, or — worst — fails silently and gives senior management false confidence. Work through the Planning phase one decision at a time.',
  roles: ['admin', 'manager', 'analyst'],
  framework: 'AASE',  // new field, denotes which framework this scenario teaches
  stages: [
    // -----------------------------------------------------------------------
    // STAGE 1 — Critical Functions identification
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S1',
      order: 1,
      type: 'primary',
      heading: 'Identifying the Critical Functions to put in scope',
      narrative: 'First Caribbean Trust runs roughly 40 distinct business systems across its three jurisdictions. The CISO has asked you to recommend two or three Critical Functions for this exercise. You meet with the COO, Heads of Retail and Trade Finance, and the Chief Risk Officer. They each have a favourite — Retail wants its mobile banking platform tested because that\'s where customer complaints concentrate, the COO wants the HR system because it had a vendor breach last year, and the CRO wants Trade Finance because that\'s where the largest single transactions clear.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-PLANNING',
      // No signals in this stage — analyst-tier scenarios reference the
      // AASE concept itself rather than fraud-detection signals
      signals: [],
      question: 'Which set of Critical Functions makes the strongest scope for a first AASE?',
      options: [
        {
          text: 'The mobile banking platform, the trade-finance settlement system, and correspondent-banking SWIFT messaging',
          correct: true,
          rationale: 'Right call. Critical Functions are functions that, if compromised, would significantly impact business continuity, reputation, or finances — and that real-world adversaries are motivated to target. Mobile banking covers retail-fraud exposure; trade-finance settlement is the highest-value transaction path; SWIFT messaging is what every nation-state and OCG actor in the threat matrix wants to compromise. Together they cover the three motives (financial gain, business disruption, intellectual-property/data theft) called out in section 6.3 of the AASE guidance. The HR system, while breached previously, is not where adversaries are most motivated to attack a bank — it\'s a learning opportunity but it\'s not Critical Function territory.',
        },
        {
          text: 'The HR system (because it had the vendor breach last year), the mobile banking platform, and the corporate intranet',
          correct: false,
          // No leadsTo — wrong but not catastrophic enough to warrant a consequence branch
          rationale: 'Tempting because the HR breach is fresh in everyone\'s mind, but this misreads what makes a function Critical. The AASE guidance is specific: Critical Functions represent the greatest opportunity for real-world adversaries motivated by financial gain, information theft, or business disruption against the bank. The corporate intranet rarely meets that bar. Including HR for institutional-memory reasons turns the exercise into a vendor-management retrospective rather than an adversarial test.',
        },
        {
          text: 'Every customer-facing system the bank operates, so the exercise is comprehensive',
          correct: false,
          leadsTo: 'SC010-S1-CONSEQUENCE',  // this triggers the consequence branch
          rationale: 'Scope inflation is the most common failure mode of first-time AASEs. The guidance is explicit that exercises should focus on Critical Functions — not be comprehensive. Trying to test everything means each system is tested shallowly, the exercise runs over budget and over schedule, and the final report can\'t produce strategic recommendations because the findings are too diffuse. See the consequence branch for what happens when this choice is left unchallenged.',
        },
        {
          text: 'A staged-environment replica of the trade-finance system only, to minimise operational risk',
          correct: false,
          rationale: 'Section 6.3 of the AASE guidance is direct: "exercise should be conducted against the live environment. Assessments in staged or otherwise non-live environments may influence the outcome of the exercise, and would not be representative of organisational cyber resilience against real-world threats." Staged-only testing should be an exception (with reasoning documented), not the default. There are valid reasons to use staged environments for high-risk activities — but choosing them upfront, before any threat modelling, abandons the AASE\'s core value proposition.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 1 CONSEQUENCE — scope inflation outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S1-CONSEQUENCE',
      order: 1.5,
      type: 'consequence',
      heading: 'Six months in: the exercise is broke and the report is unreadable',
      narrative: 'You scoped 14 systems. The provider\'s threat-modelling phase took eleven weeks instead of three because every system had to be modelled separately. By the time attack execution started, you were over budget. The Attacker found 47 minor vulnerabilities and 2 major ones, but the major ones were in systems the Board doesn\'t consider critical. The final report is 130 pages. The CFO asks at the readout: "What is the single thing we should fix first?" — and you can\'t answer concisely because the findings span too many systems with no thread connecting them.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'high',
          text: 'Threat modelling took 11 weeks, draining 60% of the budget before any attack ran',
        },
        {
          severity: 'high',
          text: 'No single Critical Function received deep enough testing to produce a meaningful conclusion',
        },
        {
          severity: 'medium',
          text: 'Board readout produced no strategic remediation actions — only 47 tactical patches',
        },
      ],
      question: 'You\'re six months into a low-value exercise. What\'s the recoverable lesson for next year?',
      options: [
        {
          text: 'Next year, scope to 2-3 Critical Functions defined by where adversaries are most motivated to attack — not by which systems have unresolved internal incidents',
          correct: true,
          rationale: 'Exactly the lesson. Scope is set by adversary motivation, not by internal politics. The AASE guidance frames Critical Functions as "what real-world adversaries may be after, for their benefit or the FI\'s detriment." That\'s the discipline.',
        },
        {
          text: 'Hire a bigger provider next time so they can handle 14 systems in parallel',
          correct: false,
          rationale: 'Wrong direction. Throwing more provider hours at a too-broad scope produces 14 shallow tests, not one good one. The constraint is depth per system, not parallelism.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 — Secrecy level
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S2',
      order: 2,
      type: 'primary',
      heading: 'Setting the secrecy level',
      narrative: 'Your COO is uncomfortable. "If the SOC team doesn\'t know an exercise is running and they trigger our incident-response plan, we could end up notifying the Bank of Jamaica that we\'ve been breached. We could spin up the crisis-management team. We could call our correspondent banks. The reputational and regulatory cost of a false alarm could be material." She wants you to brief the SOC manager that an exercise is coming. The Head of Risk wants the BCM team briefed too. The CISO is silent and waiting for your recommendation.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'medium',
          text: 'Bank previously notified BoJ of a suspected breach that turned out to be a phishing test — relationship strain followed',
        },
        {
          severity: 'low',
          text: 'BCM team has standing procedures for crisis activation that are expensive to invoke',
        },
      ],
      question: 'How do you handle the secrecy question?',
      options: [
        {
          text: 'Maintain full secrecy from the SOC. Co-opt one senior member of the Organisational Escalation Path into the Working Group so they can intercept the SOC\'s escalation before it reaches BoJ or correspondent banks. Document the interception protocol in the Exercise Preparation Report.',
          correct: true,
          rationale: 'This is the AASE-prescribed answer. Section 6.2 is explicit: secrecy from Defenders is what makes the assessment meaningful. The COO\'s legitimate concern about regulatory notification is solved by including a senior member of the escalation path in the Working Group — that person sees the SOC\'s alert as it travels up and can intercept it. Section 4 (Organisational Escalation Path) describes this exact pattern. The cost is one extra person in the Working Group; the benefit is preserving the validity of the exercise and maintaining BoJ relations.',
        },
        {
          text: 'Brief the SOC manager and BCM team. They\'ll respond as if it\'s real but won\'t escalate externally.',
          correct: false,
          leadsTo: 'SC010-S2-CONSEQUENCE',
          rationale: 'This is the seductive-but-wrong answer. Section 7.1.6.1 of the guidance reports explicitly that "in AASE where secrecy was not preserved, the information leaked impacted negatively the behaviour of the incident response teams substantially and may compromise the benefits of the exercise." Once a defender knows an exercise is happening, their response is performative, not genuine. You haven\'t tested anything. See the consequence.',
        },
        {
          text: 'Run the exercise as a formal table-top instead of a live simulation, since the operational risk concerns are real',
          correct: false,
          rationale: 'A reasonable choice for a low-maturity organisation, but you\'re past that. The Bank has done penetration testing for years, has a SOC, has incident-response playbooks. A table-top is appropriate for organisations with no prior testing experience (the "Low" maturity row in section 5.1 of the guidance). Choosing it here cedes the entire detection-and-response signal that\'s the point of an AASE.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 CONSEQUENCE — secrecy compromise outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S2-CONSEQUENCE',
      order: 2.5,
      type: 'consequence',
      heading: 'Three weeks into execution: the SOC is going through the motions',
      narrative: 'You briefed the SOC manager. He briefed his shift leads. The shift leads, professional adults, are running the response procedurally — opening tickets, escalating to him, closing the loop. The Attacker observes everything is being detected within 4 hours. They escalate the campaign sophistication. Detection times remain at 4 hours regardless. The Attacker realises the SOC is responding on a timer because they\'re expecting traffic, not because they\'re finding it. The exercise still runs to completion, but the Defence Report says "All attacker activity was detected within 4 hours." Six months later, a real intrusion runs undetected for 3 weeks before being noticed externally.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'high',
          text: 'Defenders\' detection times suspiciously consistent regardless of attack sophistication — a signature of expecting-the-test, not detecting the test',
        },
        {
          severity: 'high',
          text: 'Defence Report praised SOC performance; six months later a real intrusion exposed the actual response capability as much weaker',
        },
        {
          severity: 'medium',
          text: 'Bank Board now believes its detection capability is stronger than it actually is — the most dangerous failure mode for a security investment',
        },
      ],
      question: 'Where did the planning go wrong?',
      options: [
        {
          text: 'Trading secrecy for operational comfort meant the exercise produced no useful detection-and-response signal. The right move was the Organisational Escalation Path interception — protect the assessment validity AND manage the regulatory risk.',
          correct: true,
          rationale: 'The AASE is a detection-and-response test. Removing secrecy removes the test. The framework gives you a way to manage operational risk without compromising the test (the Working Group escalation interception); skipping that mechanism turns the exercise into theatre.',
        },
        {
          text: 'The provider should have been more aggressive in their TTPs to overcome the SOC\'s preparedness',
          correct: false,
          rationale: 'No amount of TTP sophistication can overcome a Defender who knows traffic is coming. The problem was upstream of execution — it was in the planning decision to brief the SOC. More-aggressive simulation against a pre-warned defender just produces more theatre.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 — Working Group composition
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S3',
      order: 3,
      type: 'primary',
      heading: 'Forming the Exercise Working Group',
      narrative: 'You\'re sitting with the CISO drafting the Working Group invite list. The CISO will chair. You will be the Exercise Director. Beyond that, the question is who gets invited in — and who gets kept out.',
      aaseConcept: 'CONCEPT-ESCALATION-PATH',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'medium',
          text: 'BoJ\'s cyber-resilience supervisor reviews material breach notifications within 24 hours of submission',
        },
        {
          severity: 'low',
          text: 'Bank legal counsel is external; engagement requires retainer activation',
        },
      ],
      question: 'Who belongs on the Working Group?',
      options: [
        {
          text: 'CISO (chair), you (Exercise Director), Head of Risk, BCM Manager, Head of Incident Management, General Counsel, Head of Trade Finance (System Owner), Head of Retail (System Owner), and the SOC Manager\'s direct supervisor (the COO) — so escalation can be intercepted but the SOC itself stays unaware',
          correct: true,
          rationale: 'This composition matches Section 7.1.2 of the guidance. The Working Group has the senior decision-making capability to pause/proceed, the operational coverage to manage real risks (BCM, Risk, Incident Management), the legal cover (General Counsel), the system-owner sign-off (Trade Finance, Retail Heads), and — critically — the COO is in the SOC\'s escalation path. When the SOC escalates the simulated incident upward, the COO can quietly contain it within the Working Group. The SOC manager themselves stays out so secrecy is preserved.',
        },
        {
          text: 'CISO, you, the SOC Manager (so they can warn their team if things go off the rails), the Head of Risk, the BCM Manager',
          correct: false,
          rationale: 'Including the SOC Manager breaks secrecy at the level closest to the response. Once the SOC Manager is in, every shift lead they speak to is effectively in too. This is the same trap as Stage 2\'s wrong answer — restated as "but only one person." It still kills the assessment.',
        },
        {
          text: 'CISO, you, the Head of Risk, the General Counsel, the BoJ\'s designated supervisory contact (so the regulator is informed upfront)',
          correct: false,
          rationale: 'Pre-disclosure to BoJ is regulator-relationship hygiene that should happen at the executive level (Section 7.1.6.4 — Regulatory Disclosure) — but the BoJ contact does NOT belong inside the Working Group. They have no operational role in the exercise and including them creates legal-disclosure obligations the bank does not need to absorb. Inform the regulator separately, formally, and at the right level.',
        },
        {
          text: 'Just the CISO and yourself — minimum group is best for secrecy',
          correct: false,
          rationale: 'Two people cannot intercept escalations across the BCM, Risk, Incident Management, and Legal channels simultaneously. A too-small Working Group fails the moment the SOC escalates to the COO and the COO calls correspondent banks. The Working Group must be large enough to cover every escalation path the simulation might trigger — typically 6-9 people in a mid-sized bank.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 — Provider selection
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S4',
      order: 4,
      type: 'primary',
      heading: 'Selecting the provider',
      narrative: 'Three providers responded to your RFP. Provider A is a regional firm with strong Caribbean references and competitive pricing — but no recognised offensive-security accreditations and references that are all penetration-testing engagements rather than full red-team exercises. Provider B is a global Big Four consultancy with deep financial-services experience, current insurance coverage and indemnity, CREST and CBEST accreditations, and published research on banking-sector TTPs — but their proposed daily rate is 60% higher than Provider A\'s. Provider C is a boutique that has done TIBER-EU work in the Netherlands and ECB-regulated banks; their accreditations are strong, their consultants\' biographies are public and credible, but they\'ve never operated in the Caribbean.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'medium',
          text: 'Bank\'s third-party-risk policy requires provider insurance coverage of at least US$5M for engagements affecting production systems',
        },
        {
          severity: 'medium',
          text: 'CFO has flagged provider cost as a Board scrutiny item',
        },
        {
          severity: 'low',
          text: 'CISO has worked with Provider B at a previous bank and rates them highly',
        },
      ],
      question: 'Which provider, and why?',
      options: [
        {
          text: 'Provider B — recognised accreditations (CREST/CBEST) and current insurance/indemnity meet Section 7.1.4 of the AASE guidance, financial-services experience reduces operational risk during execution, and the higher rate is justified by the assessment quality. Document the cost-justification for the CFO.',
          correct: true,
          rationale: 'Section 7.1.4 of the guidance specifies that providers should hold "accreditations or certifications that require practical demonstration of an advanced understanding of offensive and/or defensive security skills and the tactics, techniques and procedures utilised by real world sophisticated adversaries." CREST and CBEST are specifically called out as the accreditations to look for. Insurance/indemnity is explicitly required (mutual damages and liabilities). Provider B is the only provider that meets the bar without compromise. The cost is real but the consequences of choosing the cheaper-but-uncredentialed Provider A are existential — see the consequence branch for what that looks like.',
        },
        {
          text: 'Provider A — Caribbean references and competitive pricing demonstrate value-for-money, and accreditations can be addressed by adding contractual requirements',
          correct: false,
          leadsTo: 'SC010-S4-CONSEQUENCE',
          rationale: 'Adding accreditation requirements to a contract does not retroactively give the provider the experience or methodology that accreditation requires. Section 7.1.4.4 is direct: accreditations should "always be sought." A regional firm without offensive-security accreditation may be perfectly competent at penetration testing but lacks the methodology and discipline for adversary simulation. The cost saving is illusory. See the consequence.',
        },
        {
          text: 'Provider C — TIBER-EU credentials are the gold standard, and lack of Caribbean experience is offset by the global rigour',
          correct: false,
          rationale: 'Provider C is qualified, but lack of regional context creates real friction during the threat-intelligence phase. AASE-quality threat modelling requires understanding the local threat landscape (geopolitics, regional cybercrime patterns, supplier ecosystem). A provider who has never worked in the Caribbean will need 2-4 extra weeks to build that context — time better spent on execution. Provider B has both accreditations AND regional financial-services experience.',
        },
        {
          text: 'Run a hybrid: Provider B leads, Provider A executes the Caribbean-specific reconnaissance under their supervision',
          correct: false,
          rationale: 'Two-vendor structures sound clever and are in practice nightmare to manage. Section 7.1.4 talks about provider integrity and data-handling controls — splitting the engagement across two firms doubles the contractual surface area, doubles the data-handling risk, and creates ambiguous accountability when something goes wrong. Pick one provider with the right capability.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 CONSEQUENCE — wrong-provider outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S4-CONSEQUENCE',
      order: 4.5,
      type: 'consequence',
      heading: 'Week 8: a Provider A consultant tweets about "interesting work in the Caribbean"',
      narrative: 'A Provider A consultant — junior, ambitious, unaware that their employer\'s NDA prohibits social-media reference to active engagements — posts on LinkedIn about "doing interesting offensive-security work for a Caribbean financial institution this quarter." The post is liked by colleagues and a competing bank\'s CISO, who reaches out asking for an introduction. Within 48 hours the existence of the engagement is informally known across the regional security community. Your bank\'s SOC Manager hears about it. Secrecy is gone. The CISO has to decide whether to terminate the engagement (costly, embarrassing) or proceed knowing the assessment validity is compromised.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'high',
          text: 'Active engagement publicly referenced on LinkedIn within first 8 weeks of execution',
        },
        {
          severity: 'high',
          text: 'Bank\'s SOC Manager learned of the exercise from external sources, breaking secrecy from the inside',
        },
        {
          severity: 'medium',
          text: 'Provider A had no documented social-media policy for active engagements — this would have been caught during proper provider vetting',
        },
      ],
      question: 'What does this incident teach about provider selection?',
      options: [
        {
          text: 'Accreditation isn\'t bureaucratic theatre — it\'s the proxy for the operational discipline (data handling, NDA enforcement, consultant training) that prevents exactly this incident. Provider B\'s higher rate paid for that discipline.',
          correct: true,
          rationale: 'CREST, CBEST, and equivalent accreditations require providers to demonstrate operational-security maturity including consultant NDA training, social-media policies, and data-handling controls. The premium price reflects a real operational cost the provider absorbs. Choosing the cheaper provider transfers that cost to the customer in the form of incidents like this one.',
        },
        {
          text: 'The fix is contractual — add a social-media clause to the NDA and proceed',
          correct: false,
          rationale: 'A clause cannot put toothpaste back in the tube. Once secrecy is gone, no contract restores it. The lesson is at the selection stage, not the contractual stage.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 — Concession policy
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S5',
      order: 5,
      type: 'primary',
      heading: 'Defining the concession policy',
      narrative: 'Provider B is asking what concessions you\'ll pre-approve. They want to know in advance because it shapes their attack planning. They\'ve proposed a list: (a) issue an AD account on demand at any privilege level, (b) provide network diagrams and asset inventory upfront, (c) bypass MFA on a single named test account, (d) skip the phishing campaign entirely and assume successful credential compromise, (e) have a Facilitator on call for physical access bypasses.',
      aaseConcept: 'CONCEPT-CONCESSION',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'low',
          text: 'Bank\'s anti-phishing training program reaches 95% of staff annually — phishing-control efficacy is a known strength',
        },
        {
          severity: 'medium',
          text: 'Identity-management infrastructure is the bank\'s most modern security control and is high-priority for testing',
        },
      ],
      question: 'Which concessions do you pre-approve, and which do you decline?',
      options: [
        {
          text: 'Pre-approve (b) network diagrams and (e) facilitator on call. Decline (a), (c), and (d) — those concessions would skip past exactly the controls the exercise is meant to assess.',
          correct: true,
          rationale: 'The principle from Section 7.1.5: concessions are for "simulating the passage of a long period (e.g. reconnaissance time)" or "skipping over an undefeated control" when the goal is to test what comes next, not to validate that control. Network diagrams (b) are reasonable — adversaries with sufficient time and money would obtain them eventually, so granting them upfront accelerates the exercise without invalidating any control. Facilitator on call (e) is fine for physical access edge cases. But (a) AD accounts on demand circumvents identity-management entirely — the highest-value control to test. (c) MFA bypass undermines the same control. (d) Skipping phishing skips the human layer where the bank invests heavily and wants real signal. Granting those would gut the exercise.',
        },
        {
          text: 'Pre-approve all five — concessions accelerate the exercise and let the provider focus on the high-value testing',
          correct: false,
          rationale: 'Section 7.1.5 says every concession used "must be documented and reported, and considered when assessing the security control efficacy." That language is in the guidance specifically because excessive concessions reduce the assessment to fiction. If the Attacker can obtain an admin account on request, the report cannot say anything about the bank\'s identity-management controls. The whole exercise becomes about the layer above identity-management.',
        },
        {
          text: 'Decline all five — purity of the assessment requires the Attacker to overcome every control unaided',
          correct: false,
          rationale: 'The other extreme is also wrong. Some concessions accelerate the exercise without compromising the assessment — the AASE guidance lists examples specifically. Refusing all concessions stretches a 4-month exercise into 9 months and consumes budget on reconnaissance time that real adversaries would have. Be selective, not absolutist.',
        },
        {
          text: 'Defer the concession decision to the Exercise Director (you) at runtime — pre-approving anything is risky',
          correct: false,
          rationale: 'The guidance says concessions can be pre-approved upfront OR issued during the exercise — but that pre-approving the obvious ones (b, e in this case) saves a 48-hour decision cycle every time they\'re needed. Deferring everything creates operational drag. Pre-approve the safe ones; defer the risky ones.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 6 — Escalation path
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S6',
      order: 6,
      type: 'primary',
      heading: 'Wiring the escalation path',
      narrative: 'During execution, the SOC will escalate suspicious activity. The escalation chain in the bank\'s standing playbook is: SOC analyst → SOC manager → Head of Incident Management → CISO → COO → CEO → BoJ supervisory contact (for material breaches). At what point does the simulated activity stop being treated as a real incident and get contained within the Working Group?',
      aaseConcept: 'CONCEPT-ESCALATION-PATH',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [
        {
          severity: 'medium',
          text: 'BoJ requires material breach notification within 24 hours — late notification has regulatory consequences',
        },
        {
          severity: 'low',
          text: 'CEO is on the bank\'s Board but is NOT on the Working Group',
        },
      ],
      question: 'Where do you place the interception point?',
      options: [
        {
          text: 'At the COO level. The COO is on the Working Group. When SOC → SOC Manager → Head of Incident Management → CISO escalation reaches the COO, the COO recognises the simulated activity (the Exercise Director has briefed them via the agreed hotline) and contains the escalation. The CEO and BoJ are never notified.',
          correct: true,
          rationale: 'This is the architecture Section 4 (Organisational Escalation Path) and Section 7.3.8 (Directing the Attack) describe. The escalation runs its full natural course up to the lowest point in the chain that is also in the Working Group. That point intercepts. Everyone below the interception point experiences the response as real — which is what makes the assessment meaningful. Everyone above is protected from acting on what they\'d see as a real incident.',
        },
        {
          text: 'At the CISO level — they\'re in the Working Group and they\'re the natural authority over security incidents',
          correct: false,
          rationale: 'Intercepting at the CISO level cuts the test short before the COO and Head of Incident Management have responded. Those are critical-function operational decisions: how does the bank\'s top operational executive react to a perceived breach? Is there a clear chain of command? Are tabletop crisis procedures invoked correctly? Intercepting at CISO loses the data on the layer above.',
        },
        {
          text: 'At the CEO level — let the entire executive chain experience the response, then intercept before regulator notification',
          correct: false,
          rationale: 'Tempting but operationally risky. Once the CEO is convinced an incident is real, the Bank\'s crisis-management protocol is fully activated — which may involve external communications, media holds, customer notifications, correspondent-bank stand-downs. Even with interception before regulator notification, you cannot easily un-trigger crisis-mode at the CEO level. The COO is the right interception point: senior enough that escalation has run a meaningful course, junior enough that the corporate-communication and external-disclosure cascade hasn\'t started.',
        },
        {
          text: 'No interception — let it run all the way to BoJ and inform them at that point that it was a test',
          correct: false,
          rationale: 'This is what the guidance specifically warns against. BoJ\'s relationship with the bank degrades materially each time the bank cries wolf. Section 7.1.6.4 describes regulatory disclosure as something done formally and upfront ("advise regulators of the intent to execute such exercises"), not as a recovery action after a false alarm. This option also breaches the standing breach-notification timeline.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 7 — Letter of Engagement scope
    // -----------------------------------------------------------------------
    {
      id: 'SC010-S7',
      order: 7,
      type: 'primary',
      heading: 'Drafting the Letter of Engagement',
      narrative: 'The Sponsoring Executive (the CISO, on the Board\'s authority) will sign the Letter of Engagement. You\'re drafting it. The provider\'s lawyers have asked what it should contain. The bank\'s General Counsel wants it short and unambiguous.',
      aaseConcept: 'CONCEPT-LETTER-OF-ENGAGEMENT',
      aasePhase: 'AASE-PHASE-PLANNING',
      signals: [],
      question: 'What MUST the Letter of Engagement contain?',
      options: [
        {
          text: 'Brief description of the test\'s intent, scope of the testers\' involvement, instructions on how the testers can be authenticated by bank security staff if apprehended during physical or social-engineering elements, and the signature of the Sponsoring Executive',
          correct: true,
          rationale: 'Section 4 (Definitions — Letter of Engagement) and supporting passages specify exactly these four elements. The authentication-if-apprehended provision is the one most often forgotten — and most critical when physical-access attempts are in scope. A tester arrested by branch security with no verifiable authorisation creates legal and reputational exposure that dwarfs the test\'s value.',
        },
        {
          text: 'A complete attack plan, every TTP the tester will use, and a daily reporting schedule',
          correct: false,
          rationale: 'A Letter of Engagement is a short authorisation document, not an operational plan. The full attack plan lives in the Exercise Preparation Report and Threat Modelling Report. Putting TTPs into a signed document also creates discovery risk if the document leaks — the LoE is a high-circulation legal artefact.',
        },
        {
          text: 'The full Working Group roster, all concession decisions, and the escalation-interception protocol',
          correct: false,
          rationale: 'These are operational artefacts. They belong in the Exercise Preparation Report (which is internal and confidential), not in a Letter of Engagement (which the testers carry on their person if apprehended).',
        },
      ],
    },
  ],
}
