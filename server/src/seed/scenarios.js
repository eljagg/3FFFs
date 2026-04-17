/**
 * Scenarios — mapped to authentic MITRE F3 technique IDs.
 *
 * Each stage.techniqueId must match a real Technique in the F3 framework.
 * If the technique doesn't exist in the current F3 version, the seed will warn.
 */

export const SCENARIOS = [
  {
    id: 'SC001',
    title: 'Business Email Compromise — CFO impersonation',
    severity: 'high',
    summary: 'Threat actor compromises the CFO\'s email and redirects a $2.3M vendor wire transfer to a mule account, then layers funds into cryptocurrency.',
    estimatedLoss: 2_300_000,
    roles: ['analyst', 'soc', 'executive'],
    stages: [
      {
        order: 1,
        techniqueId: 'F1067',
        heading: 'Reconnaissance — executive profiling',
        narrative: 'The attacker harvests LinkedIn profiles, press releases, and an SEC filing to identify the CFO, the company\'s top 5 vendors, and the typical monthly invoice cycle.',
        signals: [
          { severity: 'low',    text: 'Unusual OSINT activity on executive LinkedIn profiles' },
          { severity: 'medium', text: 'Lookalike domain registered — 3 characters different from trusted vendor' },
          { severity: 'high',   text: 'Spoofed vendor domain registered 3 days before typical invoice date' },
        ],
        question: 'Which control provides the highest leverage at the Reconnaissance stage?',
        options: [
          { text: 'Daily manual review of executive social media',                              correct: false, rationale: 'Manual monitoring does not scale and is inherently reactive.' },
          { text: 'Automated lookalike domain monitoring for your institution and top vendors', correct: true,  rationale: 'Domain surveillance catches attacker infrastructure before it is used. Cost per alert is low; leverage is high.' },
          { text: 'Restrict wire authorization to 2 named individuals',                         correct: false, rationale: 'Useful at Execution stage but addresses the wrong phase here.' },
          { text: 'Quarterly phishing awareness training for the CFO',                          correct: false, rationale: 'Awareness helps but is not the highest-leverage control at this phase.' },
        ],
      },
      {
        order: 2,
        techniqueId: 'F1081',
        heading: 'Initial Access — phishing for credentials',
        narrative: 'A spear-phishing email from the spoofed vendor domain prompts the CFO\'s assistant to click a credential-harvesting link. Within hours, the attacker is logged into the CFO\'s email and has added a silent forwarding rule.',
        signals: [
          { severity: 'high',   text: 'Mailbox login from new device + country change within 1 hour' },
          { severity: 'high',   text: 'Silent email-forwarding rule added to CFO inbox' },
          { severity: 'medium', text: 'Assistant clicked link from domain registered 72 hours earlier' },
        ],
        question: 'Which control most directly prevents this initial access?',
        options: [
          { text: '90-day mandatory password rotation',                                         correct: false, rationale: 'Rotation does not help when credentials are phished at the point of use.' },
          { text: 'Phishing-resistant MFA (FIDO2 hardware keys) on all executive accounts',     correct: true,  rationale: 'FIDO2 is resistant to real-time phishing; the attacker cannot replay a hardware-backed assertion.' },
          { text: 'Block all external email',                                                   correct: false, rationale: 'Impractical and does not address the underlying technique.' },
          { text: 'Quarterly security awareness training',                                      correct: false, rationale: 'Complements but does not replace a technical control at this stage.' },
        ],
      },
      {
        order: 3,
        techniqueId: 'F1038',
        heading: 'Execution — fraudulent bank transfer',
        narrative: 'The attacker, now in control of the CFO\'s email, emails accounts payable with an "urgent confidential acquisition" and instructs a $2.3M wire to a new beneficiary. Urgency framing is used to suppress normal verification.',
        signals: [
          { severity: 'high',   text: 'Wire request bypasses normal 2-person approval chain' },
          { severity: 'high',   text: 'Urgency and confidentiality language in the email' },
          { severity: 'medium', text: 'Destination account is a new beneficiary' },
        ],
        question: 'Which process control would stop the wire?',
        options: [
          { text: 'Out-of-band voice verification via a pre-established phone number for all wires over $100k', correct: true,  rationale: 'Out-of-band verification defeats BEC entirely — the attacker cannot intercept a separate channel.' },
          { text: '24-hour delay on all wires',                                                                 correct: false, rationale: 'Delays are routinely overridden for "urgent" transactions.' },
          { text: 'Require CFO to personally approve wires in the banking portal',                              correct: false, rationale: 'The email is compromised — the CFO\'s "approval" is coming from the attacker.' },
          { text: 'Flag wires over $500k for compliance review',                                                correct: false, rationale: 'Helpful but can be defeated by sophisticated social engineering of the reviewer.' },
        ],
      },
      {
        order: 4,
        techniqueId: 'F1047',
        heading: 'Monetization — cashout to cryptocurrency',
        narrative: 'Funds land in a domestic mule account, are split across 5 accounts within 6 hours, and 40% is converted to Bitcoin at an offshore exchange within 48 hours.',
        signals: [
          { severity: 'high',   text: 'Funds split across 5+ accounts within 6 hours of receipt' },
          { severity: 'high',   text: 'Crypto conversion detected at receiving institution' },
          { severity: 'medium', text: 'Mule account was opened 14 days prior with minimal history' },
        ],
        question: 'Which response action maximizes fund recovery?',
        options: [
          { text: 'File a SAR with FinCEN and wait for guidance',                                                                correct: false, rationale: 'SARs are mandatory but slow. Recovery is time-sensitive.' },
          { text: 'Initiate SWIFT gpi recall and directly contact the receiving bank\'s fraud team within the first hour',       correct: true,  rationale: 'The first 60 minutes determine recovery rate. Direct bank-to-bank coordination works when layering has not completed.' },
          { text: 'Launch an internal investigation before acting',                                                              correct: false, rationale: 'Every hour reduces recovery probability significantly.' },
          { text: 'Alert law enforcement and take no other action',                                                              correct: false, rationale: 'Law enforcement is important but slow. Direct interbank coordination is faster for fund recovery.' },
        ],
      },
    ],
  },

  {
    id: 'SC002',
    title: 'Synthetic Identity — 18-month bust-out',
    severity: 'high',
    summary: 'A fraud ring builds 12 synthetic identities over 18 months, cultivates credit history on each, then busts out all accounts simultaneously for $850k.',
    estimatedLoss: 850_000,
    roles: ['analyst', 'executive', 'teller'],
    stages: [
      {
        order: 1,
        techniqueId: 'F1062',
        heading: 'Resource Development — fake identity documents',
        narrative: 'The ring purchases unused SSNs (belonging to children) from a dark web market and combines them with fabricated names, addresses, and employment records, plus fake supporting documents.',
        signals: [
          { severity: 'medium', text: 'SSN issuance date inconsistent with claimed birth year' },
          { severity: 'medium', text: 'Thin credit file with no historical tradelines' },
          { severity: 'high',   text: 'Same address appears on 12+ recent applications at your bank' },
        ],
        question: 'Which onboarding control most reliably detects synthetic identities?',
        options: [
          { text: 'Standard CIP (Customer Identification Program) checks',                                correct: false, rationale: 'CIP validates SSNs but does not detect synthetic combinations.' },
          { text: 'SSN-age-vs-birthyear cross-referencing plus cross-institution application velocity',   correct: true,  rationale: 'Synthetic IDs reliably show either SSN age mismatches or appear at many institutions in short windows. Both signals are operationally cheap.' },
          { text: 'Mandatory in-person identity verification for all new accounts',                       correct: false, rationale: 'Helpful but defeated by high-quality fabricated IDs.' },
          { text: 'Cap all new account credit lines at $1,000',                                           correct: false, rationale: 'Punishes legitimate customers and does not prevent the eventual bust-out.' },
        ],
      },
      {
        order: 2,
        techniqueId: 'F1008',
        heading: 'Positioning — account manipulation over time',
        narrative: 'For 12–18 months the ring makes small on-time payments on each account and gradually modifies account settings (credit limit increases, beneficiary additions) to prepare for the bust-out. This is the Positioning tactic unique to F3.',
        signals: [
          { severity: 'low',    text: 'Pattern-perfect payment behavior across all accounts' },
          { severity: 'medium', text: 'Multiple credit limit increase requests in short windows' },
          { severity: 'high',   text: 'Similar account lifecycle pattern across 8 accounts in same region' },
        ],
        question: 'The Positioning tactic is unique to F3. What is the key risk management implication?',
        options: [
          { text: 'Fraud rings can operate undetected for over a year before the attack',                   correct: true,  rationale: 'Positioning means point-in-time fraud scoring fails. Behavioral analytics over the account lifecycle are essential.' },
          { text: 'Credit limit increases should be automatically denied',                                  correct: false, rationale: 'Blanket denials harm legitimate customers.' },
          { text: 'Fraud only occurs at account opening',                                                   correct: false, rationale: 'Positioning specifically captures fraud that matures well after account opening.' },
          { text: 'On-time payments always indicate a legitimate account',                                  correct: false, rationale: 'The Positioning tactic shows fraudsters deliberately mimic this behavior.' },
        ],
      },
      {
        order: 3,
        techniqueId: 'F1048',
        heading: 'Execution — coordinated fraudulent purchasing',
        narrative: 'On a single business day, the ring simultaneously maxes out all 12 accounts via cash advances and large purchases, then abandons the identities. Total loss: $850k across 4 institutions.',
        signals: [
          { severity: 'high', text: 'Simultaneous max utilization across 8+ accounts in 48 hours' },
          { severity: 'high', text: 'All accounts become delinquent on the same billing cycle' },
          { severity: 'high', text: 'Cash advance and purchase pattern across multiple linked accounts within 24 hours' },
        ],
        question: 'What analytics capability best detects coordinated bust-outs in progress?',
        options: [
          { text: 'Individual account utilization alerts',                                                correct: false, rationale: 'By design, no single account looks unusual — it is the correlation that matters.' },
          { text: 'Graph analytics linking accounts by shared attributes (address, device, application metadata)', correct: true, rationale: 'The ring shares operational attributes across all synthetic identities. Graph detection reveals the cluster in real time.' },
          { text: 'Raising minimum payment requirements portfolio-wide',                                  correct: false, rationale: 'Loss mitigation, not detection.' },
          { text: 'Manual freezing after delinquency is reported',                                        correct: false, rationale: 'Too late — losses have already occurred.' },
        ],
      },
    ],
  },

  {
    id: 'SC003',
    title: 'SIM Swap — customer account takeover',
    severity: 'medium',
    summary: 'Attacker uses breached PII to execute a SIM swap at the mobile carrier, intercepts SMS MFA codes, and drains $180k from the victim\'s investment account.',
    estimatedLoss: 180_000,
    roles: ['analyst', 'teller', 'soc'],
    stages: [
      {
        order: 1,
        techniqueId: 'F1067',
        heading: 'Reconnaissance — gathering victim information',
        narrative: 'The attacker purchases the customer\'s full identity bundle (name, address, DOB, last four SSN, phone number) from a dark web marketplace and verifies high account balance via social media.',
        signals: [
          { severity: 'low', text: 'Customer PII present in recent breach databases' },
          { severity: 'low', text: 'Customer publicly discusses investment account on social media' },
        ],
        question: 'What proactive control addresses this stage best?',
        options: [
          { text: 'Continuous dark web monitoring for your customers\' exposed credentials, paired with proactive step-up authentication on high-risk accounts', correct: true, rationale: 'You cannot stop breaches at other companies — but you can detect exposure and raise the bar preemptively for those customers.' },
          { text: 'Quarterly customer password rotation',                                                 correct: false, rationale: 'The attacker has PII, not passwords. Rotation does not help.' },
          { text: 'Block SMS authentication entirely',                                                    correct: false, rationale: 'Blunt and harms customers.' },
          { text: 'Increase the minimum account balance requirement',                                     correct: false, rationale: 'Irrelevant to the information exposure risk.' },
        ],
      },
      {
        order: 2,
        techniqueId: 'T1451',
        heading: 'Initial Access — SIM card swap',
        narrative: 'Using stolen PII, the attacker social-engineers the mobile carrier into porting the victim\'s number to a new SIM. SMS-based MFA codes now flow to the attacker. The bank sees a sudden device change on the customer\'s account.',
        signals: [
          { severity: 'high',   text: 'Telecom partner reports SIM port event on customer\'s number' },
          { severity: 'high',   text: 'SMS delivery failure for customer notifications' },
          { severity: 'medium', text: 'Customer device fingerprint changes suddenly' },
        ],
        question: 'Which control most directly addresses SIM swap attacks?',
        options: [
          { text: 'Require customers to verify recent transactions when calling support',                correct: false, rationale: 'The swap happens at the carrier, not the bank\'s phone channel.' },
          { text: 'Real-time SIM swap detection via telecom API partnerships, triggering mandatory step-up authentication', correct: true, rationale: 'Telecom APIs (available from all major US carriers) expose SIM port events. Using them as a step-up trigger closes the window.' },
          { text: 'Require SMS OTP for all transactions',                                                 correct: false, rationale: 'SMS OTP is exactly what SIM swapping defeats.' },
          { text: 'Mandate biometric authentication inside the mobile app',                              correct: false, rationale: 'Useful but the attacker can trigger SMS-based password resets that bypass the app entirely.' },
        ],
      },
    ],
  },
]
