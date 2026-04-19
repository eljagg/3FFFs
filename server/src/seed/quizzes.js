/**
 * Quiz questions — short multiple-choice questions tied to F3 tactics.
 *
 * IMPORTANT: tacticId values must match the real F3 tactic IDs used in the
 * MITRE framework Excel (TA0043, TA0042, TA0001, TA0005, FA0001, TA0002,
 * FA0002). Earlier versions of this file used placeholder IDs like T001,
 * T005 etc. which silently failed the `MATCH (tac:Tactic {id: $tacticId})`
 * in run.js's quiz loader — so zero quizzes ever made it into the graph.
 *
 * Coverage: at least one question per F3 tactic so the quiz cycles through
 * the whole framework if the player does enough of them. Monetization and
 * Positioning (the two F3-unique tactics) have two questions each since
 * they're the most likely knowledge gaps for staff coming from ATT&CK.
 */

export const QUIZZES = [
  {
    id: 'Q001',
    tacticId: 'FA0001',  // Positioning (F3-unique)
    difficulty: 'medium',
    roles: ['analyst', 'executive'],
    question: 'Which of the following is the clearest example of the F3 Positioning tactic?',
    options: [
      { text: 'A fraudster phishes a bank employee for credentials',                                                          correct: false, rationale: 'That is Initial Access, not Positioning.' },
      { text: 'A fraud ring builds 12 months of on-time credit history on synthetic identities before executing a bust-out',  correct: true,  rationale: 'Positioning covers the preparation period within a compromised environment — waiting, cultivating trust, and mimicking legitimate behavior before execution.' },
      { text: 'A stolen $2M wire is split across 5 mule accounts',                                                            correct: false, rationale: 'That is Monetization (layering), not Positioning.' },
      { text: 'An attacker spoofs a trusted vendor\'s email domain',                                                          correct: false, rationale: 'That is Resource Development, not Positioning.' },
    ],
  },
  {
    id: 'Q002',
    tacticId: 'FA0002',  // Monetization (F3-unique)
    difficulty: 'easy',
    roles: ['analyst', 'teller', 'soc', 'executive'],
    question: 'In a cyber-enabled fraud case, what determines fund recovery rate most strongly?',
    options: [
      { text: 'The quality of the SAR narrative filed with FinCEN',         correct: false, rationale: 'SARs are important but do not drive direct recovery.' },
      { text: 'Time elapsed between Execution and response',                correct: true,  rationale: 'Recovery probability drops sharply after the first 60 minutes as layering (Monetization) proceeds. Speed matters more than any other factor.' },
      { text: 'The total dollar amount lost',                               correct: false, rationale: 'Size does not determine recoverability; speed and layering status do.' },
      { text: 'Whether the attacker used cryptocurrency',                   correct: false, rationale: 'Crypto makes recovery harder but responsiveness still matters more.' },
    ],
  },
  {
    id: 'Q003',
    tacticId: 'TA0001',  // Initial Access
    difficulty: 'medium',
    roles: ['soc', 'analyst'],
    question: 'A customer\'s account shows: (1) new device login from a new country, (2) SMS MFA code delivery failing, (3) device fingerprint changed. Which F3 stage is most likely active?',
    options: [
      { text: 'Reconnaissance',         correct: false, rationale: 'Recon does not involve interacting with the target account.' },
      { text: 'Initial Access',         correct: true,  rationale: 'The pattern indicates an active account takeover attempt — likely following a SIM swap that enabled MFA bypass.' },
      { text: 'Positioning',            correct: false, rationale: 'Positioning is characterized by patient, legitimate-looking behavior.' },
      { text: 'Monetization',           correct: false, rationale: 'Monetization happens after the fraudulent transaction has been executed.' },
    ],
  },
  {
    id: 'Q004',
    tacticId: 'TA0002',  // Execution
    difficulty: 'easy',
    roles: ['teller', 'analyst', 'executive'],
    question: 'A customer walks in demanding an urgent wire based on "an email from the CFO." Which control is the single best defense?',
    options: [
      { text: 'Require a printed copy of the email',                         correct: false, rationale: 'Email is trivial to print — this adds no security.' },
      { text: 'Call the CFO on a pre-established, known phone number',       correct: true,  rationale: 'Out-of-band verification via a known channel defeats BEC entirely. The attacker controls the email but not the phone line.' },
      { text: 'Require the email be forwarded to compliance',                correct: false, rationale: 'Compliance review without out-of-band contact can also be deceived.' },
      { text: 'Add a 1-hour delay',                                          correct: false, rationale: 'Delays are often overridden for "urgent" requests, which is exactly the pattern BEC exploits.' },
    ],
  },
  {
    id: 'Q005',
    tacticId: 'TA0042',  // Resource Development
    difficulty: 'easy',
    roles: ['analyst', 'executive'],
    question: 'Why is lookalike domain monitoring considered "high leverage" in F3 defense?',
    options: [
      { text: 'It generates the most alerts of any control',                                   correct: false, rationale: 'Quantity of alerts is not the goal.' },
      { text: 'It catches attacker infrastructure before it is used in an attack',             correct: true,  rationale: 'Domains are typically registered days before a phishing campaign. Monitoring gives you a proactive detection window at low cost.' },
      { text: 'It detects all phishing attempts',                                              correct: false, rationale: 'Many phishing attacks use legitimate compromised infrastructure, not lookalike domains.' },
      { text: 'It is required by FFIEC',                                                      correct: false, rationale: 'Regulatory status is not why the control is high-leverage.' },
    ],
  },
  {
    id: 'Q006',
    tacticId: 'TA0005',  // Defense Evasion
    difficulty: 'medium',
    roles: ['soc', 'analyst'],
    question: 'Which of these is NOT a Defense Evasion technique in F3?',
    options: [
      { text: 'SIM swapping to defeat SMS MFA',                                 correct: false, rationale: 'This IS a Defense Evasion technique.' },
      { text: 'Device fingerprint spoofing',                                    correct: false, rationale: 'This IS a Defense Evasion technique.' },
      { text: 'Rapid layering of funds across mule accounts',                   correct: false, rationale: 'This IS Defense Evasion (specifically, evading transaction monitoring).' },
      { text: 'Purchasing stolen SSNs on a dark web marketplace',               correct: true,  rationale: 'That is a Resource Development activity, not Defense Evasion.' },
    ],
  },
  {
    id: 'Q007',
    tacticId: 'FA0001',  // Positioning (F3-unique)
    difficulty: 'hard',
    roles: ['analyst', 'executive'],
    question: 'A pig butchering scheme involves an attacker building a romantic relationship with a victim over 3 months before convincing them to "invest" in a fake platform. Which F3 tactic best describes those 3 months?',
    options: [
      { text: 'Reconnaissance',                                   correct: false, rationale: 'Reconnaissance precedes contact with the target. The active relationship is not recon.' },
      { text: 'Resource Development',                             correct: false, rationale: 'The fake platform is the resource; the relationship is not a developed asset in the F3 sense.' },
      { text: 'Positioning',                                      correct: true,  rationale: 'Positioning captures the cultivation-of-trust phase that enables later execution. Pig butchering is the textbook example of why this tactic was added to F3.' },
      { text: 'Execution',                                        correct: false, rationale: 'Execution is the authorized transfer itself, which happens after the Positioning phase ends.' },
    ],
  },
  {
    id: 'Q008',
    tacticId: 'FA0002',  // Monetization (F3-unique)
    difficulty: 'hard',
    roles: ['executive', 'soc'],
    question: 'From a governance standpoint, which capability most distinguishes institutions that recover fraud losses from those that do not?',
    options: [
      { text: 'A larger fraud investigation team',                                                      correct: false, rationale: 'Team size alone does not drive recovery.' },
      { text: 'A pre-established, 24/7 interbank fraud coordination protocol with SWIFT gpi capability', correct: true,  rationale: 'Recovery requires rapid coordination with the receiving bank within minutes. Institutions that build this muscle — with named contacts and clear escalation paths — recover at materially higher rates.' },
      { text: 'A higher fraud insurance limit',                                                          correct: false, rationale: 'Insurance covers loss but is not a recovery capability.' },
      { text: 'Use of AI/ML transaction monitoring',                                                     correct: false, rationale: 'ML detection helps prevent fraud but does not drive post-event recovery.' },
    ],
  },

  // ─── Added in v21: coverage gap + Caribbean-grounded questions ──────────

  {
    id: 'Q009',
    tacticId: 'TA0043',  // Reconnaissance — previously uncovered
    difficulty: 'medium',
    roles: ['analyst', 'teller', 'soc'],
    question: 'Which of these is the clearest Reconnaissance activity in F3?',
    options: [
      { text: 'A crew in Montego Bay scrapes Florida obituaries and Jamaican-American church directories to identify elderly diaspora targets',
        correct: true,
        rationale: 'Reconnaissance is the pre-contact intelligence phase — gathering targetable information about victims before any interaction begins. Obituary scraping is a documented pattern in the Carty (2025) lottery-scam case and fits the tactic precisely.' },
      { text: 'Buying a batch of stolen credit card numbers on a dark web market',
        correct: false,
        rationale: 'Acquiring stolen credentials is Resource Development — you are assembling the attack infrastructure, not researching a specific victim.' },
      { text: 'Installing a card-skimmer on a Montego Bay ATM',
        correct: false,
        rationale: 'Physical placement of skimming hardware is Positioning — establishing a compromise point within the target environment.' },
      { text: 'Impersonating a CFO in an email to authorize a wire',
        correct: false,
        rationale: 'Impersonation to gain a compromise is Initial Access; the reconnaissance happened earlier when the attacker learned who the CFO was.' },
    ],
  },
  {
    id: 'Q010',
    tacticId: 'TA0001',  // Initial Access (Caribbean-grounded)
    difficulty: 'medium',
    roles: ['soc', 'analyst', 'executive'],
    question: 'Between April and June 2022, an organised syndicate drained JMD$47.5 million from 16 NCB customer accounts via smishing — phishing SMS that led to a spoofed login page. From an F3 perspective, what would have prevented most of the loss?',
    options: [
      { text: 'Device-bound authentication (passkey / FIDO2) or push-notification MFA, not SMS OTP',
        correct: true,
        rationale: 'The smishing page asked victims to read back the SMS OTP, which defeats any phone-based second factor. Device-bound auth cannot be phished over SMS because the key never leaves the trusted device.' },
      { text: 'Longer passwords — require 16+ characters with special chars',
        correct: false,
        rationale: 'The attacker harvested the passwords directly from victims via the spoofed page. Length is irrelevant once the password is typed into the attacker\'s form.' },
      { text: 'More frequent SMS security alerts to customers',
        correct: false,
        rationale: 'Adds noise to the same SMS channel the attacker is already exploiting. NCB actually suspended SMS alerts in October 2023 for this reason.' },
      { text: 'Post warning banners on the bank\'s public website',
        correct: false,
        rationale: 'Reactive awareness does not stop an active campaign and the population most at risk is not reading the bank\'s website in the moment of the attack.' },
    ],
  },
]
