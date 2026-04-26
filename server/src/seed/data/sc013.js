/**
 * sc013.js — SC013 "Commissioning a CBEST Assessment — Northgate Apparel"
 *
 * Governance-tier scenario, parallel to SC010 in shape but in the CBEST
 * frame instead of AASE. The analyst plays the security manager at a UK
 * retailer that has just been notified by the Bank of England that they're
 * in CBEST scope. Six primary stages, one per meaningful CBEST phase
 * decision, plus two consequence branches on the most catastrophic wrong
 * answers.
 *
 * Authoring template matches SC010-SC012:
 *   - Each primary stage carries an `aaseConcept` (Concept ID it tests)
 *   - Stages 4 and 5 also carry `mitreTechnique` (the v25.5 wedge — first
 *     user-facing consumer of the MITRE foundation seeded in v25.5)
 *   - 4 options per stage, exactly 1 marked correct
 *   - Consequence branches on the most seductive wrong answers
 *   - Northgate Apparel plc is the fictional UK-retailer composite
 *
 * IMPORTANT: this scenario does NOT carry `aasePhase` per-stage, because
 * the framework is CBEST not AASE, and CBEST phase nodes don't exist in
 * the graph yet. CBEST phase data lands in v25.6 (the freshness pass).
 * The framework property at the scenario level is 'CBEST' — that's
 * sufficient for v25.5.1.
 *
 * Source-material caveat: this scenario is authored from the Exabeam
 * CBEST 2.0 solution brief plus general public CBEST knowledge. The Bank
 * of England's authoritative CBEST Implementation Guide is the canonical
 * source; v25.6 freshness pass should verify procedural detail against
 * that document and update as needed. The four-phase shape, party
 * structure (SCT, Firm/FMI, TI provider, PT provider, Regulator), and
 * CREST accreditation requirement are public knowledge and reflected
 * accurately here.
 *
 * Vintage marker: 'CBEST 2.0 (procedural shape from Exabeam brief, July 2020)'
 */

export const CBEST_SCENARIO_SC013 = {
  id: 'SC013',
  title: 'Commissioning a CBEST Assessment — Northgate Apparel',
  severity: 'high',
  estimatedLoss: 15_000_000,  // £15M composite: regulator scrutiny, remediation cost, reputational
  summary: 'You\'re the security manager at Northgate Apparel plc, a UK retailer with around £2.4bn annual revenue and a digital footprint covering e-commerce, in-store payments, warehouse management and customer data. Yesterday the CISO forwarded you a letter from the Bank of England: Northgate has been added to the CBEST scope. Your job for the next six months is to coordinate the assessment — scope it, procure the providers, validate the threat intelligence, supervise the live test, and close it out with the Bank\'s Sector Cyber Team. Six decisions stand between you and a clean closure. Two of them have consequence branches because the wrong answer triggers the regulator before the test even finishes.',
  roles: ['admin', 'manager', 'analyst'],
  framework: 'CBEST',
  stages: [
    // -----------------------------------------------------------------------
    // STAGE 1 — Phase 1.1 Launch: framing posture in the kickoff
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S1',
      order: 1,
      type: 'primary',
      heading: 'The kickoff with the Sector Cyber Team',
      narrative: 'You and the CISO meet the Bank of England\'s Sector Cyber Team for the formal CBEST kickoff. There are four people in the room from the SCT side, plus a representative from the FCA who\'s observing. The SCT chair opens with a question you weren\'t expecting: "Before we start the formal scoping, walk us through how you\'d describe Northgate\'s current cyber posture in two minutes — what you\'d tell your Board if they asked tonight." You have a minute to think. The CISO has signalled with a glance that this is your call.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      signals: [
        {
          severity: 'medium',
          text: 'FCA observer present — anything you say informs how the regulator will read Northgate\'s posture going into the test',
        },
        {
          severity: 'medium',
          text: 'CBEST is intelligence-led penetration testing — a defensive posture overstatement here will be tested against reality in week 12',
        },
        {
          severity: 'low',
          text: 'The SCT runs CBEST kickoffs at 5-7 firms per quarter — they have a calibrated sense of what honest posture sounds like',
        },
      ],
      question: 'How do you frame Northgate\'s posture?',
      options: [
        {
          text: 'Honest and specific. Two recent strengths (MFA rollout completed across all employee accounts in 2024, EDR deployed to all servers), two known gaps (legacy warehouse-management system has not been pen-tested since 2021, no formal threat-hunting capability in-house). Frame the gaps as the specific things you hope the CBEST test will quantify.',
          correct: true,
          rationale: 'CBEST is intelligence-led — meaning the testers will find what\'s really there, regardless of what you said in week one. Specific, calibrated honesty about known gaps positions Northgate as a serious participant. The SCT and FCA both reward this: it tells them you understand the framework. The CISO\'s glance was permission to be candid, not pressure to perform.',
        },
        {
          text: 'Defensive — emphasise what Northgate has invested in, downplay gaps. The Board will see this transcript and you don\'t want to be the security manager who undersold the team\'s work.',
          correct: false,
          leadsTo: 'SC013-S1-CONSEQUENCE',
          rationale: 'Tempting because it protects internal politics. But CBEST is going to find the gaps anyway — that is the entire point of the framework. A defensive opening creates a credibility delta when the test report lands twelve weeks later. The SCT\'s tolerance for "we didn\'t know" shrinks rapidly when their kickoff notes show you DID know. See the consequence.',
        },
        {
          text: 'Aspirational — describe the posture you\'re building toward in 2026 (zero-trust architecture, SOC 24x7) rather than today\'s reality',
          correct: false,
          rationale: 'Aspirational framing reads as evasion to the regulator. The SCT asks "what would you tell your Board tonight" specifically to get current-state, not roadmap. Answering the wrong question is itself a signal about how Northgate handles regulatory scrutiny.',
        },
        {
          text: 'Decline to answer until the formal scoping is done — say it\'s premature to characterise posture before the test',
          correct: false,
          rationale: 'Refusing to answer a regulator\'s opening question is not neutral; it\'s a posture statement in itself. The SCT will note it. The CISO\'s glance was telling you to engage, not deflect. There is no version of this scenario where silence helps you.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 1 CONSEQUENCE — defensive-framing fallout
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S1-CONSEQUENCE',
      order: 1.5,
      type: 'consequence',
      heading: 'Twelve weeks later: the credibility delta lands',
      narrative: 'The penetration test is complete. The PT provider\'s draft report shows the testers achieved domain admin via the legacy warehouse-management system in 11 days — exploiting an unpatched vulnerability you knew about in October. The SCT chair calls a meeting. Their kickoff notes from week one are open on the screen. They quote your answer back to you: "...solid coverage across our critical business systems..." and ask you to reconcile that statement with the fact that the warehouse system had a known unpatched RCE for six months. The FCA observer is on the call.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      signals: [
        {
          severity: 'high',
          text: 'Quoted directly from kickoff transcript — your week-one framing is now in the formal regulatory record',
        },
        {
          severity: 'high',
          text: 'Six-month known-unpatched RCE on a system you described as "solid coverage" — credibility delta is documentary not interpretive',
        },
        {
          severity: 'high',
          text: 'FCA observer on the call means this conversation is feeding their separate supervisory file on Northgate',
        },
      ],
      question: 'What is the lesson?',
      options: [
        {
          text: 'CBEST will find what\'s really there. Defensive framing in week one creates documentary evidence that the firm misrepresented its posture to the regulator — which is materially worse than the underlying gap. Honesty in the kickoff IS a control: it sets the firm\'s credibility baseline before the test produces ground truth.',
          correct: true,
          rationale: 'The framework rewards calibrated honesty because the test produces ground truth that a kickoff statement cannot survive contradicting. The kickoff is not a sales pitch — it\'s a baseline.',
        },
        {
          text: 'The warehouse system should have been patched before the CBEST window started',
          correct: false,
          rationale: 'True but irrelevant to the lesson. The patching gap is one finding among many that CBEST surfaces. The compounding harm came from describing the system as well-covered when you knew it wasn\'t.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 — Phase 1.3 Scoping: selecting Critical Functions
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S2',
      order: 2,
      type: 'primary',
      heading: 'Selecting the Critical Functions in scope',
      narrative: 'Phase 1.3 of CBEST is Scoping. The SCT asks Northgate to propose two to four "Important Business Services" (CBEST\'s term for what AASE calls Critical Functions) for the test. Six candidate systems are on your shortlist. The CRO wants the payment-processing platform tested because that\'s where regulator pressure concentrates. The COO wants the warehouse-management system because of the recent vulnerability disclosure. Customer Operations wants the e-commerce platform because Black Friday is in the test window and they need confidence. Marketing wants the customer-data platform because of GDPR. Trade Finance has just one system but it processes £400m a quarter. The legacy point-of-sale platform is end-of-life and being replaced next year. You can recommend three.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      signals: [
        {
          severity: 'high',
          text: 'Black Friday falls inside the planned test window — testing the e-commerce platform during peak load is operationally risky',
        },
        {
          severity: 'high',
          text: 'Legacy POS is being replaced next year — testing it teaches Northgate nothing about its forward-looking posture',
        },
        {
          severity: 'medium',
          text: 'CRO + COO + Customer Ops all have legitimate claims — politics will follow whatever you don\'t pick',
        },
        {
          severity: 'medium',
          text: 'CBEST tests Important Business Services, not all systems — the goal is to learn something the firm can act on',
        },
      ],
      question: 'Which three do you recommend?',
      options: [
        {
          text: 'Payment processing, warehouse-management, customer-data platform. Three different threat surfaces (financial, operational, data-protection), three different system architectures. All three are Important Business Services per CBEST\'s definition. E-commerce excluded because of Black Friday operational risk; POS excluded because end-of-life testing teaches nothing forward-looking; trade finance excluded because it has only one system and the diversity of the other three is more informative.',
          correct: true,
          rationale: 'The right answer balances regulatory weight (payment processing for the CRO\'s point), recent risk visibility (warehouse-management following the disclosure), and customer impact (data platform for GDPR exposure). The exclusions also matter: testing during peak commercial load is itself a compromise of test integrity, and testing end-of-life systems teaches the firm nothing it can act on.',
        },
        {
          text: 'E-commerce, payment processing, warehouse-management. Test the systems with the highest customer-facing visibility and biggest blast radius if they fail.',
          correct: false,
          rationale: 'E-commerce during Black Friday compromises the test: either the testers go easy to avoid disrupting peak trade, or they don\'t and the test becomes the disruption itself. CBEST is intelligence-led penetration testing, not chaos engineering — the test environment should reflect normal operations, not peak.',
        },
        {
          text: 'Payment processing, trade finance, legacy POS. Cover the highest-£-value systems and the most-exposed legacy platform.',
          correct: false,
          rationale: 'Trade finance is plausible but it has only one system, narrowing the architectural diversity of the test. Legacy POS being replaced next year means the findings have a one-year shelf life — the firm gets a snapshot of a system it\'s already deprecating. Both are legitimate concerns but neither produces enduring learning.',
        },
        {
          text: 'Defer to the SCT — let them pick three from the list based on their cross-sector threat picture',
          correct: false,
          rationale: 'CBEST\'s scoping principle is firm-led with regulator review. The firm proposes Important Business Services because the firm understands its own business; the SCT validates the proposal against threat intelligence. Deferring to the SCT inverts that and signals that the firm doesn\'t understand which of its services matter most — which is itself a finding.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 — Phase 1.4 Procurement: choosing TI and PT providers
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S3',
      order: 3,
      type: 'primary',
      heading: 'Choosing the Threat Intelligence provider',
      narrative: 'Phase 1.4 of CBEST is Procurement. You need to onboard two service providers: a Threat Intelligence (TI) provider who will produce a Targeting Report and Threat Modelling Report for Northgate, and a Penetration Testing (PT) provider who will execute the test using that intelligence. CBEST requires both to be CREST-accredited. You have three TI quotes on your desk. Provider Alpha is CREST-accredited, has done eight UK retail CBESTs, quotes £180,000 for the TI phase. Provider Beta is CREST-accredited, has only done banking sector CBESTs, quotes £140,000. Provider Gamma is a respected boutique with deep retail-sector expertise — but their CREST accreditation lapsed three months ago and is "in renewal", quotes £120,000. The CFO has signalled budget pressure.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',  // tests rigour around the firm's qualification process — closest existing concept; the new CREST concept gets its own TESTS_CONCEPT below via cbestConcept
      cbestConcept: 'CONCEPT-CREST-ACCREDITATION',
      signals: [
        {
          severity: 'high',
          text: 'CBEST requires CREST accreditation — "in renewal" is not the same as "accredited"',
        },
        {
          severity: 'medium',
          text: 'Sector relevance matters: retail-CBEST experience > banking-CBEST experience for Northgate\'s threat surface',
        },
        {
          severity: 'medium',
          text: 'CFO budget pressure is real but cannot override a hard regulatory requirement',
        },
        {
          severity: 'low',
          text: 'Provider Gamma\'s lapsed accreditation is itself a signal about how they manage their own compliance baseline',
        },
      ],
      question: 'Which TI provider do you recommend?',
      options: [
        {
          text: 'Provider Alpha — CREST-accredited and retail-experienced. £40k more than Beta but the sector match is worth more than the price difference, and Beta\'s banking-only history means Northgate\'s threat profile is unfamiliar territory for them.',
          correct: true,
          rationale: 'CREST accreditation is the regulatory floor, not a preference. Within accredited providers, sector relevance is the deciding factor. Alpha\'s eight UK retail CBESTs means their Targeting Report will be calibrated to threat actors that actually target retailers — not extrapolated from banking-sector intelligence. The £40k delta against Beta is real but defensible to the CFO because the alternative compromises test quality.',
        },
        {
          text: 'Provider Gamma — they have the deepest retail expertise and the lowest price; the lapsed accreditation is a paperwork issue that will be resolved before the test starts',
          correct: false,
          leadsTo: 'SC013-S3-CONSEQUENCE',
          rationale: 'CBEST requires CREST accreditation as a hard condition. "In renewal" is a procedural status, not the same as accredited. The SCT will reject the procurement when they review it, and Northgate will lose 4-6 weeks re-running the procurement — but only if they catch it before the contract is signed. See the consequence.',
        },
        {
          text: 'Provider Beta — accredited, cheapest of the accredited options, banking-sector experience is close enough to retail',
          correct: false,
          rationale: 'Beta meets the regulatory floor but their banking-only experience means the Targeting Report will draw on banking-sector threat intelligence and try to map it to a retailer. Threat actors targeting UK retailers (Scattered Spider variants, retail-focused organised crime groups) have different TTPs than those targeting banks. The £40k saved is recovered when the test misses retail-specific attack patterns.',
        },
        {
          text: 'Run a competitive process between all three, scoring CREST status as 30% of the selection criteria',
          correct: false,
          rationale: 'CREST accreditation cannot be "30% of the criteria" because CBEST requires it absolutely. Scoring it as a fraction means the procurement framework is unsound. The right structure is: CREST accreditation as a gate (binary, must pass), then competitive selection among those who pass.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 CONSEQUENCE — non-CREST procurement fallout
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S3-CONSEQUENCE',
      order: 3.5,
      type: 'consequence',
      heading: 'Six weeks later: the SCT rejects the procurement',
      narrative: 'The SCT reviews the procurement documentation as part of Phase 1.4 sign-off. They flag Provider Gamma\'s accreditation status. Their lapse-renewal cycle is real — the lapse occurred in January, renewal paperwork was filed in February, but as of the procurement decision in April CREST has not yet issued the new certificate. The SCT instructs Northgate to either select a currently-accredited provider or wait until Gamma\'s renewal completes. Six weeks of slippage. The Black Friday test window is now compressed.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      cbestConcept: 'CONCEPT-CREST-ACCREDITATION',
      signals: [
        {
          severity: 'high',
          text: 'Six weeks of test-window slippage — the planned execution phase now overlaps Black Friday peak trading',
        },
        {
          severity: 'high',
          text: 'SCT supervisory note added to Northgate\'s file: "Procurement governance requires reinforcement"',
        },
        {
          severity: 'medium',
          text: 'CFO not happy: contract with Gamma now has to be void-or-amended, legal cost £8-12k',
        },
      ],
      question: 'What is the lesson?',
      options: [
        {
          text: 'Hard regulatory requirements (CREST accreditation, FCA handbook rules, BoE supervisory expectations) are gates, not preferences. Treat them as binary qualifying conditions before any cost or capability comparison. The slippage cost of getting this wrong always exceeds any saving on the original procurement.',
          correct: true,
          rationale: 'CREST is the regulatory gate. The £60k saved on Gamma\'s quote is now consumed by the legal cost, the procurement re-run, and the supervisory note in Northgate\'s file. Treating regulatory floors as floors — not as one criterion among many — is the procedural discipline CBEST tests.',
        },
        {
          text: 'CREST should accelerate their re-accreditation timelines so firms aren\'t penalised for choosing capable providers',
          correct: false,
          rationale: 'Plausible-sounding but it shifts blame outward. The decision was Northgate\'s; the framework rule was knowable. Better governance would have caught it before the contract.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 — Phase 2.3 Validation: reading the Targeting Report
    // (FIRST USE OF THE MITRE WEDGE — stage carries mitreTechnique field)
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S4',
      order: 4,
      type: 'primary',
      heading: 'Validating the Threat Intelligence',
      narrative: 'Provider Alpha has delivered the draft Targeting Report. It identifies three threat actors as plausibly relevant to Northgate: an organised cybercriminal group with known UK retail TTPs (helpdesk vishing → MFA bypass → ransomware), a North Korean state-aligned group focused on financial gain, and a Russian intelligence service that occasionally compromises Western retailers as a peripheral target. The Targeting Report recommends in-scope TTPs including T1566.004 (spearphishing voice) and T1219 (remote access tools as command-and-control). Phase 2.3 of CBEST is Validation — the firm reviews the TI report and either accepts it or argues it. Each rejected scenario must be justified in writing to the SCT.',
      aaseConcept: 'CONCEPT-THREAT-MATRIX',
      mitreTechnique: 'T1566.004',  // v25.5 wedge — stage carries a MITRE technique reference
      signals: [
        {
          severity: 'high',
          text: 'Three threat actors named — accepting all three means three test arcs which doubles the test cost',
        },
        {
          severity: 'high',
          text: 'Russian intelligence service rarely targets UK retailers directly — argument for excluding is plausible',
        },
        {
          severity: 'medium',
          text: 'Organised cybercrime group TTPs match the M&S/Co-op/Harrods 2025 retail breach pattern — clearly in scope',
        },
        {
          severity: 'medium',
          text: 'North Korean state-aligned group has hit UK targets but more often financial sector than retail',
        },
      ],
      question: 'How do you respond to the Targeting Report?',
      options: [
        {
          text: 'Accept the organised cybercrime group as primary scope, accept the North Korean group as secondary scope, formally argue the Russian intelligence service out of scope on the grounds that their UK-retail targeting is peripheral and the test budget is better spent on the two more probable threat profiles.',
          correct: true,
          rationale: 'CBEST validation is calibration, not capitulation. The firm has standing to argue scope based on threat probability against its specific business profile. The organised cybercrime group is the dominant threat to UK retailers right now and accepting that is non-negotiable. The North Korean group is a secondary but real threat. Arguing the Russian state actor out is defensible IN WRITING with the supporting argument — and the SCT respects firms that engage with the report rather than rubber-stamping it.',
        },
        {
          text: 'Accept all three threat actors as in-scope. The TI provider has more visibility than Northgate and the validation is a formality.',
          correct: false,
          rationale: 'Accepting everything signals that Northgate isn\'t engaging with the TI report critically. The validation phase exists specifically because the firm has knowledge of its own business that the TI provider doesn\'t — for example, Northgate has no Russian government contracts, no Russia-adjacent payments flows, and no operations in regions where Russian intelligence has retail-targeting interests. Failure to argue scope is itself a signal of poor governance.',
        },
        {
          text: 'Argue the North Korean group out and accept the Russian intelligence service. State actors are more interesting to test against because they expose the highest-value defensive gaps.',
          correct: false,
          rationale: 'Inverts the threat probability. The North Korean group has substantially more UK retail-adjacent activity than Russian intelligence. Choosing what to test against based on what\'s "more interesting" rather than what\'s most probable produces a test that\'s entertaining but not informative.',
        },
        {
          text: 'Accept the report in full to avoid delay; the validation phase has a 2-week clock',
          correct: false,
          rationale: 'Same flaw as option 2 dressed up as schedule pressure. CBEST\'s 2-week validation window exists to make the firm engage with the report — using the clock as an excuse to skip engagement defeats the phase\'s purpose. The SCT allows extensions for substantive validation; they do not allow extensions for "we needed more time to argue".',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 — Phase 3.2 Execution: real intrusion alert during the test
    // (SECOND USE OF MITRE WEDGE — references T1219 RMM-as-C2)
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S5',
      order: 5,
      type: 'primary',
      heading: 'Real intrusion or simulated? You have 30 minutes to decide',
      narrative: 'It\'s week 8 of the assessment. Provider Alpha\'s PT team has been executing for three weeks. Northgate\'s SOC has not been told the test is in progress (per the secrecy principle). At 14:23 on a Thursday, the SOC opens an emergency ticket: AnyDesk has been observed running on a compromised server in the warehouse-management environment, beaconing to an IP on a US hosting provider. EDR shows the binary was placed via a scheduled task at 06:14 the previous morning. The SOC is asking for permission to disconnect the server. You have a short hotline call with the PT provider: they confirm AnyDesk is in their toolkit but they don\'t recognise the specific IP. You have 30 minutes before the SOC will act unilaterally per their incident-response SLA.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      mitreTechnique: 'T1219',  // Remote Access Tools — exact match to the source-document attack map
      signals: [
        {
          severity: 'high',
          text: 'AnyDesk is in PT provider\'s toolkit BUT they don\'t recognise the specific IP — provider has partial confirmation',
        },
        {
          severity: 'high',
          text: 'SOC will act unilaterally in 30 minutes — the decision window is real and short',
        },
        {
          severity: 'high',
          text: 'Scheduled task placed 06:14 yesterday — too recent to be a long-dwell intrusion, plausibly within test timeline',
        },
        {
          severity: 'medium',
          text: 'Test/Halt model says: when uncertain, halt. The cost of halting and discovering it was the testers is small. The cost of NOT halting and it being real is large.',
        },
      ],
      question: 'What do you tell the SOC?',
      options: [
        {
          text: 'Authorise full incident response. Treat as real until proven otherwise. Halt the PT provider\'s execution. Walk through the EDR evidence with both the SOC and the PT provider in parallel. Decide to resume or terminate based on what the joint review establishes.',
          correct: true,
          rationale: 'Test/Halt model. When the PT provider says "we use AnyDesk but don\'t recognise this IP", they are telling you the signal is consistent with both their activity AND a real intrusion. The asymmetric cost is decisive: a 6-hour pause to investigate costs the test maybe 0.5% of its value; ignoring a real intrusion costs the firm orders of magnitude more. The framework is built for this exact moment.',
        },
        {
          text: 'Tell the SOC to stand down. The PT provider uses AnyDesk; this is almost certainly the test; don\'t blow secrecy by activating IR for what\'s probably a simulation.',
          correct: false,
          leadsTo: 'SC013-S5-CONSEQUENCE',
          rationale: 'Tempting because it preserves test secrecy. But the PT provider\'s "we don\'t recognise the IP" is a hedge, not a confirmation. Standing down on a partial confirmation accepts the asymmetric risk in the wrong direction. See the consequence.',
        },
        {
          text: 'Have the SOC continue investigating quietly while the test continues — let the SOC\'s detection capability prove itself in real time',
          correct: false,
          rationale: 'Two attack streams against the same target make the SOC\'s response data uninterpretable — same logical error as SC011 Stage 1. You can\'t tell which alerts the SOC raised on which stream. The clean cost-benefit decision is to halt and clarify, not to muddle the test by running parallel streams.',
        },
        {
          text: 'Pull the server off the network as a precaution while leaving the rest of the test running',
          correct: false,
          rationale: 'Halfway measures. If the AnyDesk activity is the testers, you\'ve unilaterally removed a host from their scope without notifying them — they continue their operation thinking that path is open. If it\'s real, isolating one host doesn\'t address whatever else the real attacker has touched. Either fully halt to investigate, or fully allow the test to continue. Splitting the difference creates new problems.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 CONSEQUENCE — stand-down outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S5-CONSEQUENCE',
      order: 5.5,
      type: 'consequence',
      heading: 'Two days later: the IP belongs to the testers AND a real attacker',
      narrative: 'You stood down the SOC. Forty-eight hours later, the PT provider escalates: the IP they "didn\'t recognise" is a hosting endpoint they share with another active engagement. They\'re sure their use of AnyDesk on Northgate stopped at 03:00 Wednesday — the activity yesterday morning at 06:14 is NOT theirs. Northgate has a real intrusion. The SOC, having been told to stand down, did not investigate further. The intrusion has now been live for a full additional day. The PT provider halts the test. The CISO and Bank of England SCT chair are on a call within the hour. The opening line is: "Walk us through your decision-making at 14:30 on Thursday."',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      mitreTechnique: 'T1219',
      signals: [
        {
          severity: 'high',
          text: 'Real intrusion live an additional 24+ hours because Northgate told the SOC to stand down based on a partial confirmation',
        },
        {
          severity: 'high',
          text: 'CBEST test now compromised — cannot tell which findings came from PT provider activity vs real attacker activity',
        },
        {
          severity: 'high',
          text: 'BoE supervisory action will follow: Northgate\'s decision-making at the moment of uncertainty is now the regulatory finding',
        },
      ],
      question: 'What is the lesson?',
      options: [
        {
          text: 'Test/Halt is a halt-on-uncertainty model, not a halt-on-confirmation model. The decision rule is: if you cannot rule out the possibility this is real with confidence, treat it as real. Partial confirmation from the provider ("we use the tool, but not this IP") is not confirmation; it\'s ambiguity, and ambiguity goes to the safer interpretation.',
          correct: true,
          rationale: 'The framework rewards the firm that defaults to the safer interpretation when signals are ambiguous. The cost of pausing the test for a few hours to investigate is small; the cost of letting a real intrusion run an extra day to preserve test secrecy is enormous. The lesson is not "the SOC should have escalated harder" — the SOC did escalate, and was overruled.',
        },
        {
          text: 'The PT provider should have known the IP was theirs from another engagement — better tool inventory would have prevented this',
          correct: false,
          rationale: 'True but irrelevant to the decision Northgate had to make at 14:30. The framework expects ambiguity from the providers; it gives the firm the Test/Halt model precisely because providers cannot always disambiguate in real time.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 6 — Phase 4.2 Remediation: Board prioritisation
    // -----------------------------------------------------------------------
    {
      id: 'SC013-S6',
      order: 6,
      type: 'primary',
      heading: 'The Board asks: which remediation matters most?',
      narrative: 'The Bank of England\'s Sector Cyber Team has issued the Intelligence, Detection and Response (IDR) Report. Three remediation findings have been agreed with Northgate. Finding A: the warehouse-management system\'s legacy authentication gateway has insufficient logging — testers were able to operate undetected for 9 days. Finding B: the SOC\'s detection of MFA-fatigue patterns lags behind current best practice. Finding C: Northgate\'s incident-response runbook does not have an explicit branch for "is this the CBEST test or a real intrusion" decisions. The Board meets next week and the CFO has signalled there\'s budget for one of these to start immediately, with the other two phased over the following six months. The Board chair asks you: which one first?',
      aaseConcept: 'CONCEPT-ESCALATION-PATH',
      signals: [
        {
          severity: 'high',
          text: 'Finding C is procedural and cheap — could be drafted in 2 weeks, cost is people-time only',
        },
        {
          severity: 'high',
          text: 'Finding A is the largest blast-radius gap — 9 days undetected access on a Critical Function',
        },
        {
          severity: 'medium',
          text: 'Finding B is the highest-craft technical work — SOC tooling upgrade plus analyst training',
        },
        {
          severity: 'medium',
          text: 'CBEST closure is supervised — the SCT will track which finding got prioritised and follow up at 3, 6, and 12 months',
        },
      ],
      question: 'Which do you recommend the Board prioritise?',
      options: [
        {
          text: 'Finding A first. The 9-day undetected access on a Critical Function is the root concern that the entire CBEST exercise was designed to surface. Funding A immediately demonstrates to the SCT that Northgate is taking the most serious finding seriously. Findings B and C are sequenced behind A: B in months 1-3, C in months 1-2 (it\'s cheap and procedural so it can run in parallel to A).',
          correct: true,
          rationale: 'CBEST remediation prioritisation is supervised — the SCT will assess Northgate\'s judgment as well as the remediation itself. Picking the largest blast-radius finding first is the answer the framework rewards. Finding C is cheap enough to run in parallel without competing for the budget envelope, and Finding B can sequence behind A without compromising the priority signal.',
        },
        {
          text: 'Finding C first. It\'s the cheapest, fastest, and shows Board-level engagement immediately — quick win for the supervisory file.',
          correct: false,
          rationale: 'Finding C is cheap and worth doing, but leading with it sends the wrong signal — that the firm prioritised the easy fix over the hard one. The SCT reads the prioritisation as a posture statement: "what does Northgate think mattered most about this test?" Leading with the procedural fix instead of the 9-day undetected access answers that question badly.',
        },
        {
          text: 'Finding B first. SOC capability uplift is the long-term lever — you can\'t solve A or C without a stronger detection capability behind them.',
          correct: false,
          rationale: 'Plausible but inverts the right framing. SOC tooling matters, but Finding B is a capability uplift — useful, not urgent. Finding A is a known active gap on a Critical Function. The Board\'s question is "which remediation first" not "which capability investment first" — those are different questions.',
        },
        {
          text: 'Defer to the SCT — they\'ve seen the test, they should rank the findings',
          correct: false,
          rationale: 'CBEST closure assigns remediation prioritisation to the firm, with SCT supervision of execution. Asking the SCT to rank means Northgate is not engaging with its own remediation governance. The supervisory file note will be unfavourable.',
        },
      ],
    },
  ],
}
