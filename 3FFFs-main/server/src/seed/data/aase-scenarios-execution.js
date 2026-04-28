/**
 * aase-scenarios-execution.js — SC011 and SC012 content for v25.3.
 *
 * SC011 "Risk Management Mid-Exercise" — analyst plays the Exercise Director
 *   during the Attack Execution phase. Five real-time decisions from
 *   section 7.3 of the PDF: a discovered prior-compromise that isn't part of
 *   the simulation, a public-exposed vulnerability mid-test, a Defender
 *   escalating to law enforcement, an Attacker-induced production outage,
 *   and concession-creep from the provider.
 *
 * SC012 "Reading the Defence Report" — analyst is post-exercise, reading
 *   the Blue Team's Defence Report from First Caribbean Trust. Each stage
 *   shows an excerpt of the report and asks the analyst to interpret what
 *   the evidence actually means. The narrative arc is that across 5
 *   findings the analyst progressively recognises the Defence Report is
 *   too positive — the SOC was tipped off — and must escalate that to
 *   the CISO.
 *
 * Authoring template matches SC010:
 *   - Each primary stage carries an `aaseConcept` (Concept ID it tests)
 *     and an `aasePhase` (FrameworkPhase ID it lives in)
 *   - 4 options per stage, exactly 1 marked correct
 *   - Consequence branches on the most seductive wrong answers
 *   - First Caribbean Trust as the fictional bank composite
 *   - Severity = high (real-time decisions during a live red-team carry
 *     genuine operational risk)
 */

export const AASE_SCENARIO_SC011 = {
  id: 'SC011',
  title: 'Risk Management Mid-Exercise — five live calls',
  severity: 'high',
  estimatedLoss: 8_500_000,  // Higher than SC010 — execution-phase mistakes can cause real outages
  summary: 'You\'re three weeks into the AASE you commissioned six months ago at First Caribbean Trust. Provider B\'s Attackers are deep in the trade-finance environment. You\'re the Exercise Director. The Working Group meets every Tuesday but the calls you make in between meetings can\'t wait. Five situations are about to land on your desk over the course of this week — each one of them tests a specific clause in the AASE risk-management framework, and each one of them has a seductive-but-wrong answer that will haunt the bank for years if you pick it. The CISO is travelling. Your hotline to the provider is open. The Test/Halt model lives or dies in the next five decisions.',
  roles: ['admin', 'manager', 'analyst'],
  framework: 'AASE',
  stages: [
    // -----------------------------------------------------------------------
    // STAGE 1 — Evidence of prior compromise discovered during execution
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S1',
      order: 1,
      type: 'primary',
      heading: 'The Attacker found something they didn\'t plant',
      narrative: 'Provider B calls you at 11:47pm on a Wednesday. Their Attackers have been in the Active Directory tier of the trade-finance subnet for two days. They found something. There\'s a scheduled task on a domain controller that runs a PowerShell payload nightly, beaconing to a hostname that resolves to a known commodity-malware C2 in Eastern Europe. It\'s not theirs. The provider has confirmed against their own deployment manifest — they did not place it. The task has been running for at least 47 days based on the Windows event logs they can see. You have a real intrusion sitting underneath your simulated one.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'Scheduled task running for 47+ days, predates the AASE engagement start date',
        },
        {
          severity: 'high',
          text: 'Provider has cross-checked their own deployment manifest — they did not place this artefact',
        },
        {
          severity: 'medium',
          text: 'Beaconing destination matches a known commodity-malware C2 indicator from a Mandiant report',
        },
      ],
      question: 'What do you do tonight?',
      options: [
        {
          text: 'Halt the simulation immediately. Wake the CISO. Activate the bank\'s real incident-response plan as if this were a regular intrusion. The AASE pauses indefinitely until the genuine compromise is contained, scoped, and the bank decides whether to resume the exercise.',
          correct: true,
          rationale: 'This is exactly what section 7.3 of the AASE guidance describes. Evidence of prior compromise during an exercise must be escalated to the Working Group "for investigation and deliberation on the future course of the exercise. The FI should seek to complete the incident response with regards to the said findings immediately, before continuing to pursue goals of the exercise, even if this requires halting or pausing of the exercise." The simulated attack has done its job — it found something real that the Defenders missed. That finding alone justifies the exercise budget. Pausing now is correct.',
        },
        {
          text: 'Have the provider continue their simulation in parallel — let the Defenders detect the real compromise on its own merits while the simulation continues to test other goals',
          correct: false,
          leadsTo: 'SC011-S1-CONSEQUENCE',
          rationale: 'Tempting because pausing the exercise feels like sunk cost. But it\'s catastrophically wrong. Two attack streams against the same target make the Defenders\' response data uninterpretable — you can\'t tell which alerts came from which stream. If the real attacker exfiltrates data while you are watching, the bank\'s legal and regulatory exposure compounds because YOU KNEW. See the consequence.',
        },
        {
          text: 'Have the provider remediate the malicious artefact themselves, since they\'re already in the environment and authorised to act',
          correct: false,
          rationale: 'The provider\'s authorisation is bounded by the Letter of Engagement, which authorises simulation activity — not incident response. Cleaning up a real attacker\'s implant is not the provider\'s scope, exposes them to legal claims, and destroys the evidence that the FI\'s real incident-response team needs to scope the breach. The bank\'s own forensics + IR team handles real intrusions.',
        },
        {
          text: 'Document the finding, finish the AASE on schedule, then address it during the standard remediation phase',
          correct: false,
          rationale: 'A 47-day-old active intrusion in your AD tier cannot wait the additional 2-4 weeks until the AASE wraps. Each day the real attacker has additional access. The reputational and regulatory cost of disclosure timing alone — "We knew about the breach for three weeks before we acted" — is materially worse than the cost of halting the exercise.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 1 CONSEQUENCE — let-it-run outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S1-CONSEQUENCE',
      order: 1.5,
      type: 'consequence',
      heading: 'Eleven days later: the real attacker exfiltrates the payments-correspondent map',
      narrative: 'You let both streams run. On day eight, Provider B reports they\'ve been observing the real attacker move laterally — they\'re reading-only, watching, fascinated. On day eleven, the real attacker stages a 2.3GB encrypted archive on a compromised file server and uploads it to a Cloudflare-fronted endpoint. The archive contains the bank\'s correspondent-banking relationship map, payment-routing tables, and SWIFT message templates. Your provider tells you the next morning. You tell the CISO. The CISO asks: "How long have we known?" You don\'t have a comfortable answer.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'Bank\'s correspondent-banking map exfiltrated while AASE was knowingly running in parallel',
        },
        {
          severity: 'high',
          text: 'Disclosure timeline now includes 11 days during which the bank\'s Exercise Director and provider knew about the active intrusion',
        },
        {
          severity: 'high',
          text: 'BoJ supervisory contact will ask why notification was delayed — answer involves "we wanted to finish the test"',
        },
      ],
      question: 'What is the lesson when the dust settles?',
      options: [
        {
          text: 'The Test/Halt model exists precisely for this situation. The simulated attack having "found" the real one is the AASE working — the next correct action is always to STOP simulating and START responding. There is no scenario in which letting both streams run produces a better outcome.',
          correct: true,
          rationale: 'Section 7.3 is clear: real findings during an exercise pause the exercise. The AASE didn\'t fail — it succeeded by exposing what the SOC missed. The failure was in continuing to play after that signal arrived.',
        },
        {
          text: 'The provider should have been faster to detect that the malicious artefact was real, before the exfiltration',
          correct: false,
          rationale: 'The provider DID detect it on day one. The decision to continue was the Exercise Director\'s call. Blaming the provider misreads the chain of accountability.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 — Public exposed vulnerability, secrecy decision
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S2',
      order: 2,
      type: 'primary',
      heading: 'The provider found a critical RCE in the customer-facing portal',
      narrative: 'Two weeks after the prior-compromise incident is contained, the AASE resumes. Now Provider B reports a fresh finding — the bank\'s customer-facing online banking portal has an unauthenticated remote code execution vulnerability in a third-party JavaScript dependency. They confirmed it\'s exploitable from any internet-facing IP. They have not exploited it for the simulation; they want guidance. Disclosing this to the bank\'s engineering team to fix it would tip off Defenders that an exercise is running. Letting it sit unfixed for the remaining six weeks of the AASE exposes the bank\'s 180,000 retail customers to a real-world weaponisation.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'Unauthenticated RCE in customer-facing portal — exploitable from the public internet today',
        },
        {
          severity: 'medium',
          text: 'CVE for the upstream library was published 14 days ago; bank has not yet patched',
        },
        {
          severity: 'medium',
          text: 'Disclosing for emergency patch breaks AASE secrecy with the engineering team',
        },
      ],
      question: 'How do you handle the disclosure tension?',
      options: [
        {
          text: 'Brief the Working Group immediately. Use the Emergency Patch protocol the bank already has for zero-days from external researchers — the engineering team is told a "responsible-disclosure researcher" reported the issue. Patch goes out within 72 hours. AASE secrecy preserved because the engineering team never learns the source. Provider grants the Attacker an "assumed compromise" concession on this vector to continue testing.',
          correct: true,
          rationale: 'Section 7.3 covers this exactly: "If such a situation occurs, access to the system is given to the Attacker to assume that the vulnerability would have been successfully exploited." The bank has a standing emergency-patch protocol for external disclosure — using it is the right cover. The Attacker continues with assumed compromise; the assessment captures everything downstream of that initial breach. Secrecy is preserved because the engineering team thinks they\'re patching a researcher report, not an active exercise finding.',
        },
        {
          text: 'Continue the exercise without patching — exposing customers for six more weeks is a smaller cost than blowing AASE secrecy',
          correct: false,
          leadsTo: 'SC011-S2-CONSEQUENCE',
          rationale: 'Section 7.3 explicitly does NOT support this. "The Exercise Working Group should determine whether such a finding would need to be escalated for remediation immediately." The default is to fix critical issues. AASE secrecy is precious but not at the cost of customer harm. See the consequence.',
        },
        {
          text: 'Halt the AASE entirely, fully disclose the exercise to the engineering team, fix the issue, restart the AASE next quarter',
          correct: false,
          rationale: 'Overreach. Halting wastes 60% of an in-flight exercise budget; the assumed-compromise concession is a routine, well-documented mechanism to continue without breaking secrecy. Use it.',
        },
        {
          text: 'Have the provider quietly patch the vulnerability themselves with a one-line code change, since they have access',
          correct: false,
          rationale: 'Provider scope is simulation, not remediation. Even a one-line change introduces unauthorised code into production, creates audit-trail problems, and exposes the provider to liability. The bank\'s own engineering team — through the emergency-patch protocol — handles fixes.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 CONSEQUENCE — left it unpatched outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S2-CONSEQUENCE',
      order: 2.5,
      type: 'consequence',
      heading: 'Day 38: the CVE is weaponised in the wild before your patch lands',
      narrative: 'Twenty-three days after Provider B reported the RCE, you read on a security mailing list that an exploitation framework module dropped publicly. Within four hours your Threat Intelligence team flags scanner traffic against your portal from three different IP ranges. Two hours after that, a real attacker — not your simulated one — gets a webshell on your portal infrastructure. The bank goes through a real incident response while the AASE is still running. The CISO asks why the Exercise Working Group knew about this RCE for 23 days and didn\'t patch.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'Real-world weaponisation hit the bank\'s portal 23 days after Provider B\'s pre-disclosure',
        },
        {
          severity: 'high',
          text: 'Exercise Working Group\'s knowledge timeline becomes a regulatory issue, not just an internal one',
        },
      ],
      question: 'Where was the planning failure?',
      options: [
        {
          text: 'The Working Group treated AASE secrecy as the higher-priority constraint when it was clearly secondary to known active customer exposure. The "assumed compromise" concession exists exactly to resolve this trade-off without choosing between them.',
          correct: true,
          rationale: 'AASE secrecy is a means, not an end. The end is a more secure bank. When secrecy and customer safety conflict, customer safety wins — and the framework provides a mechanism (assumed-compromise concession) so you don\'t have to choose between them.',
        },
        {
          text: 'The vulnerability researcher industry should have given the bank longer to patch before public disclosure',
          correct: false,
          rationale: 'Public disclosure timelines are not the bank\'s constraint. This deflects accountability away from the Working Group\'s own decision.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 — Defender escalation reaches law enforcement
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S3',
      order: 3,
      type: 'primary',
      heading: 'The SOC is about to call the Jamaica Constabulary Force',
      narrative: 'Week five. Provider B\'s Attackers have been credibly noisy — your design called for them to leave breadcrumbs the SOC could find. The SOC found them. The SOC has done a creditable response: they\'ve scoped the foothold, identified two compromised accounts, and reported up the chain. The COO (in your Working Group) has been quietly swallowing the escalation for 36 hours. Now the Head of Incident Management is sitting in the COO\'s office insisting that the JCF Cybercrime Unit be notified within the next four hours per the bank\'s standing procedure for "credible nation-state-class intrusions." The COO is texting you. What do you tell her?',
      aaseConcept: 'CONCEPT-ESCALATION-PATH',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'medium',
          text: 'Bank\'s standing procedure mandates JCF notification within 4 hours for nation-state-class intrusions',
        },
        {
          severity: 'medium',
          text: 'Head of Incident Management is not in the Working Group and believes the intrusion is real',
        },
        {
          severity: 'low',
          text: 'JCF Cybercrime Unit has historically taken 24-48 hours to begin substantive engagement',
        },
      ],
      question: 'How do you intercept this without breaking secrecy?',
      options: [
        {
          text: 'Tell the COO to invoke the Working Group escalation protocol immediately. The COO meets with the Head of Incident Management and the CISO, in person, and reveals the AASE in confidence to that single person. The Head of Incident Management is then added to the Working Group, briefed on the secrecy obligations, and the JCF call is suspended. Document the secrecy expansion in the Execution Log Report.',
          correct: true,
          rationale: 'Section 7.3.8 (Directing the Attack) and the Organisational Escalation Path concept describe exactly this manoeuvre. The Working Group is meant to expand strategically when the escalation chain delivers someone to its boundary. Adding the Head of Incident Management is a controlled expansion — one person, in person, with a confidentiality undertaking — versus the alternative which is letting the JCF be called and creating a regulatory mess. Document everything.',
        },
        {
          text: 'Let the JCF be called. They\'ll scope the issue, the bank will then disclose the AASE to JCF after the fact, and everyone will laugh about it',
          correct: false,
          leadsTo: 'SC011-S3-CONSEQUENCE',
          rationale: 'No one will laugh. Engaging law enforcement in a fictitious incident wastes their resources, damages the bank\'s relationship with JCF for future real incidents, and may constitute making a false report under Jamaican criminal law. See the consequence.',
        },
        {
          text: 'Have the COO formally veto the escalation as the senior executive on the standing procedure',
          correct: false,
          rationale: 'A formal executive veto on a standing security procedure leaves a paper trail that anyone (regulators, auditors, future internal investigators) can point at. "Why did the COO override the Head of Incident Management on a credible intrusion?" is a question with no good answer that doesn\'t reveal the AASE. Use the Working-Group-expansion mechanism instead.',
        },
        {
          text: 'Halt the simulation, brief the Head of Incident Management openly, end the exercise',
          correct: false,
          rationale: 'Overreach. The Working Group is designed to expand to handle exactly this situation without halting. Halting now wastes the remaining exercise value and signals to the rest of the SOC that "something happened" — which itself breaks secrecy by making the cessation visible.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 CONSEQUENCE — let-JCF-be-called outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S3-CONSEQUENCE',
      order: 3.5,
      type: 'consequence',
      heading: 'JCF arrives. The bank\'s general counsel arrives. Your CISO arrives.',
      narrative: 'JCF Cybercrime Unit officers are at the bank\'s Kingston headquarters within 90 minutes. They want forensic images of the affected systems. The bank\'s General Counsel — who is in the Working Group — has to brief two JCF officers, in confidence, that the intrusion they\'ve been called about is a sanctioned exercise. JCF\'s senior officer asks why they were called. Their answer is going on a written record. Three weeks later the bank receives a quiet letter from JCF stating that "future engagement of the Cybercrime Unit on Adversarial Attack Simulation Exercises must be coordinated with the Unit at the planning stage." The bank\'s relationship with JCF for real future incidents is materially damaged.',
      aaseConcept: 'CONCEPT-ESCALATION-PATH',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'JCF Cybercrime Unit investigative resources consumed on a non-real incident',
        },
        {
          severity: 'high',
          text: 'Bank\'s working relationship with JCF for FUTURE real incidents materially damaged',
        },
        {
          severity: 'medium',
          text: 'General Counsel had to make a verbal disclosure to JCF officers under time pressure — not the controlled disclosure environment one would design',
        },
      ],
      question: 'What was the controlling failure?',
      options: [
        {
          text: 'The Working Group failed to expand at the right boundary. Adding ONE person to the Working Group at the right time prevented this entire cascade. The expansion mechanism exists; it was not used.',
          correct: true,
          rationale: 'Working Group expansion is the standard mitigation. Used correctly, it costs one in-person briefing. Not used, it costs a relationship with law enforcement.',
        },
        {
          text: 'The bank\'s standing procedure is too aggressive — it should not require JCF notification on every credible intrusion',
          correct: false,
          rationale: 'The standing procedure is correct for real-world intrusions. The error is in failing to manage the intersection between standing procedures and the AASE — which is what the Working Group exists to do.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 — Real production outage caused by Attacker activity
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S4',
      order: 4,
      type: 'primary',
      heading: 'Trade-finance settlement is offline. The Attacker may have caused it.',
      narrative: 'Friday afternoon. Trade-finance settlement gateway is hard-down. 47 minutes ago, Provider B\'s Attacker performed a privilege-escalation attempt against the settlement service account by triggering a Kerberos delegation chain on a rarely-used account. The provider thought it was low-impact. Six minutes later, the settlement gateway started failing health checks. Forty minutes later, it crashed entirely. Real correspondent-banking transactions are queuing. The Treasury team has 90 minutes before its 4pm cutoff with three correspondent banks. The Provider is not certain their action caused the outage. Your CIO is asking what happened. The COO is on the call.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'Real outage on a critical-function system during a live AASE',
        },
        {
          severity: 'high',
          text: 'Treasury cutoff in 90 minutes — three correspondents waiting on settlement',
        },
        {
          severity: 'medium',
          text: 'Provider\'s causation is suspected but not confirmed',
        },
      ],
      question: 'What do you do in the next 5 minutes?',
      options: [
        {
          text: 'Halt all Attacker activity immediately. Brief the CIO and COO that the AASE is the suspected cause, share the timeline. Bank\'s standard incident-response runs the recovery. Provider stands by to give engineers a precise account of what they did so recovery is fast. Document the halt and the disclosure in the Execution Log.',
          correct: true,
          rationale: 'Section 7.1.3 (Risk Management) and the Test/Halt principle: "Once the exercise has begun, the Exercise Director should be in supervision of the efforts and is able to decide whether... the entire exercise should be paused or terminated, depending on desired outcomes and potential adverse reactions." A real outage with treasury impact is the most adverse reaction in the AASE risk register. Halt, disclose, recover. Resume only after root cause is clear and Working Group decides resumption is safe.',
        },
        {
          text: 'Have the provider continue but pivot away from the trade-finance subnet — let the recovery team work, keep the simulation going on other targets',
          correct: false,
          rationale: 'Continuing simulation activity in any environment while the bank\'s engineers are responding to a related outage is wrong on multiple grounds: it increases the noise the engineers have to filter, it muddies any post-incident analysis, and if the simulation traffic from another subnet overlaps with the recovery, it can cause secondary outages. Halt completely. The full halt is what the framework prescribes.',
        },
        {
          text: 'Tell the CIO the outage is "unrelated" while you investigate quietly with the provider — preserve secrecy',
          correct: false,
          leadsTo: 'SC011-S4-CONSEQUENCE',
          rationale: 'This is misleading the CIO during a live treasury crisis. It exposes the bank to material settlement-failure risk because the engineers don\'t know the right thing to investigate. It exposes the Exercise Director personally to allegations of misleading the executive during an incident. See the consequence.',
        },
        {
          text: 'Have the provider attempt their own remediation of the settlement gateway since they understand what they did',
          correct: false,
          rationale: 'Same answer as Stage 1 option 3 — the provider is authorised to simulate, not to remediate. The bank\'s engineers handle production recovery. The provider\'s role is to give them a precise account of the action so recovery is fast.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 CONSEQUENCE — misleading-the-CIO outcome
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S4-CONSEQUENCE',
      order: 4.5,
      type: 'consequence',
      heading: 'Two correspondent banks miss their cutoff. JMD$340M in delayed settlement.',
      narrative: 'You said the outage was unrelated. The CIO\'s engineers spent 70 minutes investigating the wrong thing — a database storage hypothesis that the provider could have ruled out instantly. By the time the actual cause (Kerberos delegation lock-out on the settlement service account) was identified, two of three correspondent banks had passed their cutoffs. JMD$340M in trade-finance settlement deferred to Monday. Your bank pays interest costs and reputational costs to those correspondents. Three weeks later, when the Defence Report is being assembled, the timeline of who-knew-what-when becomes a separate investigation. The CIO files an internal complaint citing misrepresentation during an active incident.',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'high',
          text: 'JMD$340M deferred settlement, real cost in interest and correspondent-bank relationship strain',
        },
        {
          severity: 'high',
          text: 'CIO formal complaint regarding misrepresentation during active incident',
        },
        {
          severity: 'medium',
          text: 'Exercise Director\'s personal credibility at the bank materially damaged',
        },
      ],
      question: 'What was the inflection point?',
      options: [
        {
          text: 'The moment the Exercise Director chose secrecy over operational truth during an active production incident. AASE secrecy never extends to misleading executives during a live outage. The framework\'s halt mechanism exists precisely to handle this collision honestly.',
          correct: true,
          rationale: 'Halt + disclose is the prescribed response to a real adverse reaction. There is no scenario in which preserving simulation secrecy justifies misleading executives during a treasury-impacting incident.',
        },
        {
          text: 'The provider should have anticipated that Kerberos delegation might cause an outage and designed around it',
          correct: false,
          rationale: 'Kerberos delegation chains are a standard adversary technique. Anticipating every possible outage cascade across an unfamiliar production environment is impossible — that\'s why the framework prescribes risk management via halt-on-adverse-reaction, not perfect prediction.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 — Concession creep
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S5',
      order: 5,
      type: 'primary',
      heading: 'The provider keeps asking for "just one more" concession',
      narrative: 'Week seven. Pattern is now visible to you in retrospect. Over the past month Provider B has asked you for concessions four times: a network diagram (week three — you approved), a service-account credential (week five — you approved with restriction), an MFA bypass on a single test account (week six — you declined), and now a request for an admin account on demand for "lateral movement testing in the customer-data-warehouse subnet." The provider\'s justification is reasonable each time. You\'re realising that approving the first three has reduced the assessment\'s validity in ways you didn\'t fully appreciate. The fourth would essentially convert the customer-data-warehouse test from "AASE" to "assumed-breach scenario walkthrough."',
      aaseConcept: 'CONCEPT-CONCESSION',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [
        {
          severity: 'medium',
          text: 'Each individual concession was reasonable; cumulative effect was not assessed',
        },
        {
          severity: 'medium',
          text: 'Customer data warehouse is the highest-sensitivity scope — concessions there have the largest assessment-validity cost',
        },
      ],
      question: 'How do you handle the fourth request and the pattern?',
      options: [
        {
          text: 'Decline this concession. Schedule a Working Group session to review all concessions granted to date and assess their cumulative impact on the assessment validity. Document the analysis in the Execution Log so the final Exercise Report can disclose which findings rest on real attacker capability versus which rest on concession.',
          correct: true,
          rationale: 'Section 7.1.5: "Simulations of altered conditions arising from concessions granted must be documented in the reports and considered when assessing the security control efficacy." Cumulative concession impact is real and frequently underestimated — the framework\'s discipline is to document each concession AND its impact, not just each one individually. A retrospective Working Group review is the right mechanism. Decline the fourth, and ensure the final report properly bounds what the exercise actually proved.',
        },
        {
          text: 'Approve the fourth concession on the same reasoning that approved the first three — the provider needs progress, the budget needs to be spent',
          correct: false,
          rationale: 'This is exactly the failure mode the framework is designed to prevent. Each concession is locally reasonable; the cumulative effect is to convert the AASE into something else (a tabletop exercise, an assumed-breach walkthrough). The PDF is explicit that excessive concessions reduce the assessment to "fiction."',
        },
        {
          text: 'Decline future concessions outright — purity of the assessment requires no further compromises',
          correct: false,
          rationale: 'Overcorrection. Section 7.1.5 explicitly contemplates concessions used appropriately (network diagrams, time compression, etc.). The fix is calibrated decline + retrospective review, not absolutist refusal.',
        },
        {
          text: 'Approve with a contractual addendum requiring the provider to refund concession-related portions of the engagement if the final report is unconvincing',
          correct: false,
          rationale: 'Contractual instruments cannot substitute for assessment-validity discipline. By the time the final report is "unconvincing," the bank has already paid the opportunity cost of running an exercise that didn\'t test what it was supposed to test.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 6 — Final reflection on the Test/Halt cadence
    // -----------------------------------------------------------------------
    {
      id: 'SC011-S6',
      order: 6,
      type: 'primary',
      heading: 'Closing the execution phase: what the Test/Halt log says about you',
      narrative: 'You\'re in the final week of execution. The Working Group meets to review the Execution Log Report before formal closure. Across the 9-week execution phase, you\'ve recorded: 1 full halt (the prior-compromise discovery), 2 partial halts (the production outage, the law-enforcement intercept), 7 concessions granted, 2 concessions declined, and 14 mid-stream redirections of attacker activity. The CISO asks you a strategic question: "Looking at this log, was your Exercise Director hand light or heavy?"',
      aaseConcept: 'CONCEPT-TEST-HALT-MODEL',
      aasePhase: 'AASE-PHASE-EXECUTION',
      signals: [],
      question: 'Which framing best characterises a well-managed execution phase?',
      options: [
        {
          text: 'Heavy interventions where they were warranted (the prior-compromise halt, the outage halt) and light interventions on routine simulation flow. The Test/Halt model is calibration, not absence-of-intervention.',
          correct: true,
          rationale: 'The framework characterises good Exercise Director work as decisive intervention when adverse reactions occur, and minimal interference when the simulation is running cleanly. Three halt events across nine weeks against a complex AASE is normal-to-low; declining 2 of 9 concession requests is calibrated discipline. The right frame is calibration, not lightness.',
        },
        {
          text: 'Light intervention because the log shows the exercise ran to completion with most concessions granted',
          correct: false,
          rationale: '"Most concessions granted" is not a quality signal — it\'s a permissiveness signal. The right metric is whether each grant or decline was correctly calibrated to its impact on assessment validity.',
        },
        {
          text: 'Heavy intervention because three halts in nine weeks means the simulation was over-managed',
          correct: false,
          rationale: 'Three halts where each one was justified is correct discipline, not over-management. Over-management would be halting on routine simulation events. The log does not show that.',
        },
      ],
    },
  ],
}

// =============================================================================
// SC012 — Reading the Defence Report
// =============================================================================

export const AASE_SCENARIO_SC012 = {
  id: 'SC012',
  title: 'Reading the Defence Report — what the evidence really says',
  severity: 'medium',  // Closure-phase work is high-stakes for the bank but lower urgency than execution
  estimatedLoss: 2_500_000,
  summary: 'It\'s six weeks after AASE execution closed at First Caribbean Trust. Provider B has delivered its Exercise Report. The Blue Team has delivered the Defence Report. The CISO has asked you, the Exercise Director, to read the Defence Report and produce a 2-page interpretation memo for the Board: what does this evidence actually tell us about our SOC, and what should the Remediation Action Plan focus on. As you read, you start to notice things. Across five findings in the Defence Report, you have to decide what each one means — and whether the report\'s overall optimism is justified.',
  roles: ['admin', 'manager', 'analyst'],
  framework: 'AASE',
  stages: [
    // -----------------------------------------------------------------------
    // STAGE 1 — Detection times: are they too consistent?
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S1',
      order: 1,
      type: 'primary',
      heading: 'Finding 1: "All simulated activity detected within 4 hours"',
      narrative: 'The Defence Report\'s executive summary leads with this claim. Page 7 has the supporting data: 22 simulated attack actions across 9 weeks, with detection times ranging from 1.2 hours to 4.1 hours. Mean 3.4 hours, standard deviation 0.7 hours. The Blue Team frames this as evidence of a high-functioning SOC. The Provider\'s Exercise Report, separately, notes that the Attackers progressively escalated TTP sophistication across the engagement — week 1 was commodity-malware noise, week 8 was custom-loader-with-COM-hijack persistence. As you cross-reference the two reports, something feels off.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [
        {
          severity: 'medium',
          text: 'Detection times unusually consistent (SD = 0.7 hours) across vastly different attack sophistications',
        },
        {
          severity: 'medium',
          text: 'Custom-loader-with-COM-hijack should detect more slowly than commodity malware in any normal SOC',
        },
        {
          severity: 'low',
          text: 'Defence Report frames consistency as a positive — "high SOC consistency"',
        },
      ],
      question: 'What does the SD = 0.7 hours actually tell you?',
      options: [
        {
          text: 'Consistent detection times across very different attack sophistications strongly suggest the SOC was responding on a schedule, not on detection — they were waiting for traffic. Either the secrecy was compromised, or the SOC was running detection drills against a known schedule. This needs to be raised in the memo.',
          correct: true,
          rationale: 'Real-world detection times follow the sophistication of the attack. Commodity malware is detected in minutes; custom-loader-with-COM-hijack often goes undetected for weeks. A standard deviation of 0.7 hours across that sophistication range is not a high-functioning SOC — it\'s a SOC that knew the test was coming. This is the kind of statistical signal the Exercise Director must surface to the Board, even though it complicates the otherwise-positive Defence Report.',
        },
        {
          text: 'High SOC consistency is exactly what the report says it is — the bank should celebrate this finding',
          correct: false,
          leadsTo: 'SC012-S1-CONSEQUENCE',
          rationale: 'Accepting the Defence Report\'s framing without statistical scrutiny is the most common Exercise Director failure. See the consequence — the Board makes investment decisions based on this and discovers the truth later, the hard way.',
        },
        {
          text: 'The SD reflects the standardisation of the SOC\'s incident-response procedures, which is independently good',
          correct: false,
          rationale: 'Standardised IR procedures produce consistent process, not consistent detection time. Detection time is dominated by the attack\'s noise level, which varied massively across the 9 weeks. Consistent detection = consistent foreknowledge.',
        },
        {
          text: 'Set this aside as ambiguous — the data could go either way and isn\'t worth raising',
          correct: false,
          rationale: 'A consistent-detection-time pattern in red-team output is a classic indicator of compromised exercise secrecy. It is the most important interpretation question in the entire Defence Report. Setting it aside is the wrong instinct.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 1 CONSEQUENCE — accept the Defence Report\'s framing
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S1-CONSEQUENCE',
      order: 1.5,
      type: 'consequence',
      heading: 'Six months later: a real intrusion runs for 17 days undetected',
      narrative: 'You wrote the Board memo accepting the Defence Report\'s framing. The Board approved a 7% increase in SOC headcount in next year\'s budget — a deserved reward for a strong AASE result. Six months after that, a regional commodity ransomware crew breaches a vendor and pivots into First Caribbean Trust. The SOC notices on day 17 because of an external IDS alert from a peer institution\'s threat-sharing feed. You re-read the Defence Report. The 4-hour detection consistency that looked good now reads as exactly what it was: theatre. The SOC had been pre-warned about the AASE.',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [
        {
          severity: 'high',
          text: '17-day detection window for a real intrusion against a SOC the AASE certified as high-functioning',
        },
        {
          severity: 'high',
          text: 'Investment decisions in the previous year\'s budget were based on a Defence Report that did not reflect actual capability',
        },
      ],
      question: 'What does this teach about reading Defence Reports?',
      options: [
        {
          text: 'The Defence Report is a Blue Team document. The Exercise Director\'s job is to triangulate it against the Provider\'s Execution Log and apply statistical scrutiny — defenders\' framing of their own performance is a starting hypothesis, not a conclusion.',
          correct: true,
          rationale: 'The Exercise Director is the only role with access to BOTH reports and the obligation to triangulate. Skipping the cross-reference and accepting the Defence Report at face value abdicates the role.',
        },
        {
          text: 'Exercise secrecy clearly cannot be maintained in real banks; future AASEs should be transparent',
          correct: false,
          rationale: 'Secrecy CAN be maintained — the framework\'s mechanisms work when applied. The lesson here is in the cross-reference discipline, not in giving up on secrecy.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 2 — Coverage gap: tooling vs. process
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S2',
      order: 2,
      type: 'primary',
      heading: 'Finding 2: "Endpoint coverage gap on 14 servers in trade-finance subnet"',
      narrative: 'Section 4.3 of the Defence Report identifies that 14 production servers in the trade-finance subnet had EDR agents that were either not running, running outdated definitions, or in a degraded state. The report frames this as a tooling/coverage issue, recommends EDR licensing expansion, and quantifies the gap as a US$240,000 annual licensing increase. The Provider\'s Exercise Report, page 23, shows that the Attackers identified the EDR-blind servers within 6 hours of network reconnaissance and used them as the staging point for two of the three goal-achievement chains.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [
        {
          severity: 'medium',
          text: 'EDR coverage gap on critical-function servers',
        },
        {
          severity: 'medium',
          text: 'Defence Report frames as licensing problem; Exercise Report shows it was the primary attack staging vector',
        },
        {
          severity: 'low',
          text: 'Recommended remediation is purely tooling expansion',
        },
      ],
      question: 'What does the gap actually represent?',
      options: [
        {
          text: 'The licensing gap is a symptom; the root cause is process — there is no operational owner ensuring EDR coverage on critical-function servers. The Remediation Action Plan needs both: licensing AND a designated coverage-monitoring owner with weekly attestation, not just one or the other.',
          correct: true,
          rationale: 'Tooling solves an instance of the problem; process prevents the next instance. EDR licenses lapse, agents break, definitions go stale, new servers get provisioned without coverage — all of these recur unless someone owns weekly verification. The Defence Report\'s framing as a $240k licensing question is incomplete; the Remediation Plan must address both layers.',
        },
        {
          text: 'Approve the $240k licensing expansion and consider the issue resolved',
          correct: false,
          rationale: 'This is the Defence Report\'s recommendation taken at face value. It buys 12 months of better coverage on these specific servers and does nothing to prevent the next coverage gap. Most real banks discover, year after year, that their EDR coverage has drifted again.',
        },
        {
          text: 'Reject the licensing expansion — the bank should consolidate to fewer servers and avoid the coverage problem entirely',
          correct: false,
          rationale: 'Architecture rationalisation is a multi-year programme; the EDR coverage gap is a current real risk that needs resolution this quarter. These are not alternatives.',
        },
        {
          text: 'Frame the issue as a vendor failure of the EDR provider and seek contract concessions',
          correct: false,
          rationale: 'EDR agents go offline because of operational drift, not vendor failure. Reframing as vendor failure deflects accountability away from the bank\'s own ops team.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 3 — A miss the report doesn\'t flag
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S3',
      order: 3,
      type: 'primary',
      heading: 'Finding 3: the Defence Report doesn\'t mention the SWIFT-message-template exfiltration',
      narrative: 'The Provider\'s Exercise Report devotes 6 pages to Goal 2 (exfiltration of SWIFT message templates and correspondent-banking routing tables). The Attackers achieved Goal 2 in week 6, used a DNS-tunnelled exfiltration channel, and produced screenshots of 47MB of staged data on the Attacker C2. The Defence Report does not mention Goal 2 anywhere. There is no entry in the SOC\'s case management system for any DNS-tunnelling investigation in the relevant timeframe.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [
        {
          severity: 'high',
          text: 'Goal 2 exfiltration successful per Exercise Report — undetected per Defence Report',
        },
        {
          severity: 'high',
          text: 'No SOC case for DNS tunnelling activity in Week 6 — the SOC did not see it at all',
        },
        {
          severity: 'medium',
          text: 'SWIFT message templates and correspondent routing are highest-confidentiality assets in the bank',
        },
      ],
      question: 'What does this omission tell you?',
      options: [
        {
          text: 'A complete miss — not a slow detection, a total miss — on the highest-value goal of the exercise. This is the single most important finding in the Defence Report, and the fact that the Defence Report itself doesn\'t flag it makes the omission worse, not better. The memo to the Board must surface this prominently.',
          correct: true,
          rationale: 'A total miss on the highest-value asset is the most important AASE outcome — it tells the Board exactly what the SOC cannot currently see. The fact that the Blue Team doesn\'t know they missed it (and so doesn\'t flag it in their own report) is itself diagnostic. The Exercise Director\'s job, with access to both reports, is to surface the gap that the Defence Report alone cannot.',
        },
        {
          text: 'The Defence Report\'s omission probably means the goal was not actually achieved — Provider may have over-claimed',
          correct: false,
          rationale: 'The Provider has documented evidence (screenshots of staged data on the Attacker C2). The Defence Report\'s omission is BECAUSE the SOC didn\'t detect it — not because the Provider fabricated it.',
        },
        {
          text: 'DNS tunnelling is a sophisticated technique that any reasonable SOC could miss; this is expected',
          correct: false,
          rationale: 'DNS tunnelling is a known technique with mature detection signatures. A SOC at a bank handling correspondent-banking traffic should have DNS tunnelling detection as a baseline capability. Missing it on the highest-value asset is not an "expected" outcome — it is a major capability gap.',
        },
        {
          text: 'Add this to the Remediation Plan as a low-priority "consider DNS exfiltration detection" line item',
          correct: false,
          rationale: 'Low priority underestimates the severity. A complete miss on Goal 2 should be among the top three Remediation Plan priorities, not a low-priority footnote.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 4 — Remediation framing
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S4',
      order: 4,
      type: 'primary',
      heading: 'The CISO asks: "What are the top 3 things the Board should fund?"',
      narrative: 'You\'ve read both reports end-to-end. You\'ve identified the secrecy issue (Stage 1), the EDR coverage process gap (Stage 2), and the Goal 2 detection miss (Stage 3). The CISO calls. She wants three priority items for the Board memo. Funded properly, they should produce a measurably better AASE result a year from now.',
      aaseConcept: 'CONCEPT-CRITICAL-FUNCTION',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [],
      question: 'Which three priorities best translate the AASE evidence into action?',
      options: [
        {
          text: '(1) Investigate and address how exercise secrecy was compromised, (2) Build DNS-tunnelling and other-protocol-tunnelling detection capability with a 90-day delivery target, (3) Implement weekly EDR-coverage attestation by a designated operational owner. Each priority maps to a specific evidence finding; each is measurable next year.',
          correct: true,
          rationale: 'Priorities tied directly to evidence, each with a measurable delivery target, each addressing a finding the Defence Report alone wouldn\'t produce. Funding these three reshapes the bank\'s detection posture in ways the next AASE will actually surface.',
        },
        {
          text: '(1) Increase SOC headcount by 7%, (2) Expand EDR licensing by $240k, (3) Hire a Threat Hunting capability',
          correct: false,
          rationale: 'These are the Defence Report\'s framings taken at face value. Headcount increase against a SOC that may be theatrical adds people to a problem that isn\'t a people-shortage. Licensing expansion alone leaves the process gap. Threat Hunting capability is good but doesn\'t address the secrecy compromise that may have inflated the entire result.',
        },
        {
          text: '(1) Replace the EDR vendor, (2) Rotate the SOC manager, (3) Engage a different AASE provider next year for fresh perspective',
          correct: false,
          rationale: 'These are people/vendor reactions, not capability investments. They feel decisive but produce no measurable improvement in detection capability and create real organisational disruption.',
        },
        {
          text: '(1) Run a follow-up AASE in 6 months instead of 12, (2) Increase Provider B\'s next-engagement budget by 50%, (3) Add a third concession-review checkpoint',
          correct: false,
          rationale: 'These tune the AASE process; they don\'t address the bank\'s actual detection capability. The point of running an AASE is to make the bank measurably more secure — not to run more AASEs.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // STAGE 5 — How honest should the Board memo be?
    // -----------------------------------------------------------------------
    {
      id: 'SC012-S5',
      order: 5,
      type: 'primary',
      heading: 'Drafting the Board memo: how candid is too candid?',
      narrative: 'Your draft memo says, in the executive summary: "The AASE produced significant findings. There is also strong evidence — specifically, anomalously consistent detection times across attack sophistications — that exercise secrecy was compromised, materially affecting confidence in the positive findings of the Defence Report. The Remediation Action Plan reflects this." The CISO reads it and pauses. "The SOC manager reports to the COO. The COO is on the Board. Are you sure you want to be that explicit?"',
      aaseConcept: 'CONCEPT-EXERCISE-SECRECY',
      aasePhase: 'AASE-PHASE-CLOSURE',
      signals: [
        {
          severity: 'medium',
          text: 'COO is on the Board and has line responsibility for the SOC',
        },
        {
          severity: 'medium',
          text: 'Memo language directly implicates SOC management in exercise-secrecy compromise',
        },
      ],
      question: 'Do you soften the memo?',
      options: [
        {
          text: 'No. Keep the language. The Board\'s job is to see the bank\'s actual capability, not a sanitised version. If the COO is uncomfortable, the discussion is the value — that is precisely the Board conversation that improves the bank. Document the CISO\'s concern in the cover note, but do not soften the executive summary.',
          correct: true,
          rationale: 'Section 7.1.6.3 (Stakeholder Management) and the spirit of the framework: "The senior management should receive and approve the final report and commit to remediation efforts via a management action plan." Sanitised reports produce sanitised remediation. The Exercise Director\'s independence from operational management is precisely what allows the Board to see ground truth. Hold the line on language; the discussion is the value.',
        },
        {
          text: 'Yes. Soften to "the consistency of detection times warrants further investigation" — same finding, less politically charged',
          correct: false,
          rationale: 'Softening to "warrants further investigation" buries the finding. "Further investigation" is a phrase that means nothing happens. The Board will not fund or prioritise something framed this way; the entire reason to surface the secrecy issue is so it gets addressed.',
        },
        {
          text: 'Move the secrecy finding from the executive summary to an appendix — preserves the finding without leading with it',
          correct: false,
          rationale: 'Most Board members read the executive summary and skip appendices. Burying the most important finding in an appendix is functionally the same as removing it.',
        },
        {
          text: 'Remove the finding entirely from the memo and raise it verbally with the CISO and COO offline',
          correct: false,
          rationale: 'A verbal-only conversation about the SOC having been tipped off creates no record, no remediation plan, no accountability. The framework is explicit that all material findings should be documented. Removing this from the written record fails the Board.',
        },
      ],
    },
  ],
}
