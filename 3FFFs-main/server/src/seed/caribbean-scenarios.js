/**
 * Caribbean-specific fraud scenarios, grounded in real 2022-2026 cases from
 * Jamaica and the wider region. These supplement the generic scenarios in
 * scenarios.js with locally-relevant narratives, named personas, JMD/USD
 * amounts, and controls suited to BOJ-supervised deposit-taking institutions.
 *
 * Source cases (publicly reported):
 *  - SC004: Carty extradition (US v. Carty, W.D. Wash. 2025) — US$800K lottery
 *    scam, 4-year scheme, Publishers Clearing House pretext. Also Clarke/Shaw
 *    Montego Bay convictions (USAO SDFL).
 *  - SC005: NCB smishing heist, Apr-Jun 2022 — JMD$47.5M from 16 accounts,
 *    14+ charged by MOCA (arrests ongoing through 2025). Second JMD$80M NCB
 *    case, Apr 2022-Dec 2023, 4 arrested Dec 2025.
 *  - SC006: Jamaican SIM-swap / money-laundering ring, JMD$61M, 3 convicted
 *    including 2 telco customer-service reps (WIC News, 2025). Near-JMD$100M
 *    industry-wide via SIM swap over 18 months (Sunday Gleaner, 2022).
 *  - SC007: FID money-mule bust, Mar 2026 (Johnson, Bentley, Brevett) under
 *    Proceeds of Crime Act. Published red-flag list from FID.
 *  - SC008: Bulgarian-origin Caribbean skimming rings (ongoing); Barbados
 *    Nation 2012 outbreak; Montego Bay tourist-zone incidents.
 *  - SC009: Cheque-washing / mobile-deposit fraud — emerging pattern per BOJ's
 *    2024-2025 internet-banking fraud reporting.
 */

export const CARIBBEAN_SCENARIOS = [

  // ============================================================================
  // SC004 — ADVANCE-FEE LOTTERY SCAM (Jamaican crew → US diaspora)
  // ============================================================================
  {
    id: 'SC004',
    title: 'Advance-Fee Lottery Scam — diaspora victim, Jamaican crew',
    severity: 'high',
    summary: 'A Montego Bay crew convinces Miss Delores Brown, 73, a Jamaican-born widow in Fort Lauderdale, that she has won US$22M in the Publishers Clearing House sweepstakes. Over four years they extract US$800,000 in "taxes and fees" — delivered via Western Union to Jamaica, gift cards, and her own US debit card used to buy a Mercedes in Japan. Based on US v. Carty (W.D. Wash., 2025).',
    estimatedLoss: 800_000,
    roles: ['analyst', 'teller', 'soc'],
    stages: [
      {
        id: 'SC004-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1067',
        heading: 'Reconnaissance — profiling the Jamaican-American diaspora',
        narrative: 'Donovan and his crew scrape Florida obituaries for Jamaican surnames, buy elderly-donor lists from grey-market data brokers, and scan Facebook groups like "Spanish Town Past Students" for older members. Miss Delores surfaces: 73, widowed, attends her Pembroke Pines Jamaican church weekly, posts grandchildren photos.',
        signals: [
          { severity: 'low',    text: 'Jamaican church directories being scraped from public-facing websites' },
          { severity: 'low',    text: 'Data-broker listings targeting "Caribbean diaspora 65+"' },
          { severity: 'medium', text: 'Unusual inbound-remittance corridor forming: Florida zip clusters → Jamaican individual recipients' },
        ],
        question: 'As a Jamaican FI with correspondent banking to US counterparts, what is the highest-leverage control at this stage?',
        options: [
          { text: 'Partner with Western Union / MoneyGram Jamaica to flag recurring transfers from US elderly senders to individual (not business) Jamaican recipients with no prior family-remittance history', correct: true, rationale: 'The attack requires a remittance corridor. Pattern-monitoring on that corridor is the earliest intervention you control.' },
          { text: 'Train Jamaican bank tellers to identify elderly Jamaican-American customers at US branches', correct: false, rationale: 'Out of scope — Jamaican FIs don\'t operate US branches. The US-side detection is a correspondent-bank problem.' },
          { text: 'Raise remittance fees across the board to deter misuse', correct: false, rationale: 'Punishes legitimate diaspora remitting to family and doesn\'t address pattern.' },
          { text: 'Block all Western Union transfers originating from Florida', correct: false, rationale: 'Discriminatory and disproportionate. Florida is home to 300K+ Jamaican-Americans legitimately remitting.' },
        ],
      },
      {
        id: 'SC004-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1071',
        heading: 'Initial Access — impersonating Publishers Clearing House',
        narrative: '"Miss Brown, congratulations! This is Agent Michaels from Publishers Clearing House Prize Patrol. You\'ve won US$22 million. The FBI is recording this call for your protection — don\'t tell anyone, not even family, or the prize will be voided. We just need US$2,400 for the insurance release fee. Send it Western Union to our field agent in Mandeville."',
        signals: [
          { severity: 'high',   text: 'First-time remittance recipient: no prior relationship with the US sender' },
          { severity: 'high',   text: 'Amount falls into classic advance-fee pattern: US$1,500–US$3,500' },
          { severity: 'medium', text: 'Memo field contains ambiguous language — "gift", "taxes", "fees"' },
        ],
        question: 'At the Jamaican WU/MTO agent or bank branch receiving the pickup, what is the sharpest detection?',
        options: [
          { text: 'Step-up KYC on first-time pickups from elderly US senders, with refusal-to-pay triggers on suspicious memos and a mandatory supervisor review', correct: true, rationale: 'Shame isolation and memo ambiguity are hallmarks. A 60-second supervisor pause has been shown to interrupt most active scams.' },
          { text: 'Train agents to ask the pickup recipient "do you know this sender personally?"', correct: false, rationale: 'Easily defeated by a coached recipient. Still worth doing but not sufficient.' },
          { text: 'Freeze all transactions originating from US zip codes with high elderly population', correct: false, rationale: 'Overbroad and discriminatory toward legitimate diaspora remittances.' },
          { text: 'Document the pickup and report the pattern only after multiple transactions', correct: false, rationale: 'By the time a pattern is clear, the victim may have lost tens of thousands.', leadsTo: 'SC004-S2C' },
        ],
      },
      {
        id: 'SC004-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1087',
        heading: 'Consequence — structured over months, undetected',
        narrative: 'No flag was raised. Over 14 months, Miss Delores sends 47 separate wires totaling US$340,000 — each deliberately kept under US$3,000 to stay below structuring thresholds. The crew rotates pickup recipients across Ocho Rios, Mobay, and Kingston branches. Miss Delores\'s son Omar eventually finds her bank statements and calls authorities.',
        signals: [
          { severity: 'high', text: '47 transactions across 14 months from the same elderly sender to a rotating cluster of Jamaican recipients' },
          { severity: 'high', text: 'Classic structuring: every amount just under the US$3,000 reporting threshold' },
          { severity: 'medium', text: 'No recipient shares a surname or family tie with the sender' },
        ],
        question: 'Given the damage is already done, what is the right next step for the Jamaican FI?',
        options: [
          { text: 'File SAR on every affected pickup recipient, coordinate with US FinCEN and JCF/MOCA, reach the US sender via a verified alternative channel (family, US bank)', correct: true, rationale: 'The victim is a vulnerable diaspora senior. Acting fast across jurisdictions limits further loss and seeds the broader investigation.' },
          { text: 'Suspend the local recipients\' accounts and wait', correct: false, rationale: 'Delays the crew but doesn\'t engage the underlying scheme. They\'ll switch to fresh mules within hours.' },
          { text: 'Wait for the victim to file a formal complaint', correct: false, rationale: 'Only ~15% of elder-fraud victims ever report (US DOJ figures). Many never will, due to shame or cognitive decline.' },
          { text: 'Refund the victim\'s wires unilaterally', correct: false, rationale: 'Banks cannot reverse completed WU pickups unilaterally. And refunding criminal proceeds would itself raise AML flags.' },
        ],
      },
      {
        id: 'SC004-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1038',
        heading: 'Execution — victim\'s US debit card weaponised',
        narrative: 'Deep into year two, the crew convinces Miss Delores to share her US debit card number and PIN — "so PCH can deposit the prize directly." They use her card to buy a Mercedes-Benz GLS from a Yokohama, Japan dealer (US$87,000) and ship it to Kingston in Donovan\'s cousin\'s name.',
        signals: [
          { severity: 'high',   text: 'Single transaction US$87,000 on a card whose historical monthly volume is under US$2,000' },
          { severity: 'high',   text: 'Foreign merchant in a country the cardholder has never travelled to' },
          { severity: 'medium', text: 'Delivery address resolves to a Jamaican residence unconnected to the cardholder' },
        ],
        question: 'Where does the Jamaican bank still have leverage here — even though the card issuer is a US institution?',
        options: [
          { text: 'Coordinate with Jamaica Customs at Kingston port: high-value imports (vehicles, luxury goods) shipped to individuals with no declared source-of-funds warrant mandatory supervised inspection and beneficial-owner disclosure', correct: true, rationale: 'The asset enters Jamaican jurisdiction at port. Customs + AML coordination freezes the asset before it\'s re-sold and funds are laundered further.' },
          { text: 'Wait for the US card issuer to block it', correct: false, rationale: 'Most card issuers don\'t flag Japan luxury-vehicle transactions as fraud, especially if the PIN was used correctly. The Jamaican side is the last chance.' },
          { text: 'Allow the vehicle in — the fraud happened in the US', correct: false, rationale: 'Jamaican FIs cannot ignore receiving-end laundering under POCA. This is exactly the domestic leg.' },
          { text: 'Refer the matter to the car dealer in Japan', correct: false, rationale: 'The Japanese dealer was paid legitimately. Pursuing them is a diplomatic cul-de-sac.' },
        ],
      },
      {
        id: 'SC004-S4',
        order: 4,
        type: 'primary',
        techniqueId: 'F1044',
        heading: 'Monetization — cash cashout and property laundering',
        narrative: 'Cash pickups from WU are structured into deposits across 9 Jamaican bank accounts held by crew members and family. Proceeds fund a Kingston "investment property" purchased outright for JMD$28M cash, a small bar in Irish Town, and a crypto wallet on a local peer-to-peer exchange (F1047 path). Donovan drives a new Audi Q7 to his grandmother\'s funeral.',
        signals: [
          { severity: 'high',   text: 'Multiple JMD$1.3M-range cash deposits across same-day branch visits by connected individuals' },
          { severity: 'high',   text: 'Source-of-funds documentation missing for a cash real-estate purchase above JMD$20M' },
          { severity: 'medium', text: 'Graph analytics show connections between depositors via shared phone, email, addresses' },
        ],
        question: 'What single capability catches the monetization stage most reliably?',
        options: [
          { text: 'Cross-account graph analytics linking depositors by shared attributes, with transaction monitoring that flags structuring + source-of-funds gaps on property purchases above the regulatory reporting threshold', correct: true, rationale: 'The crew\'s operational security collapses at monetization because they need to move a lot of money through identifiable nodes. Graph analytics exposes the cluster.' },
          { text: 'Raise the cash deposit reporting threshold', correct: false, rationale: 'Makes structuring easier for criminals, harder to detect.' },
          { text: 'Require receipts for all cash deposits over JMD$1M', correct: false, rationale: 'Receipts are trivially forged; this is low-friction for criminals and high-friction for legitimate customers.' },
          { text: 'Refuse to process any cash-based property purchase', correct: false, rationale: 'Overreach that ignores legitimate returnees buying homes with diaspora savings.' },
        ],
      },
    ],
  },

  // ============================================================================
  // SC005 — SMISHING ATO HEIST (the NCB $47.5M pattern)
  // ============================================================================
  {
    id: 'SC005',
    title: 'Smishing Bank Heist — 16 accounts, JMD$47M in 90 minutes',
    severity: 'high',
    summary: 'An organised syndicate spoofs NCB SMS alerts, harvests credentials from 180 customers in a single weekend, targets the 16 with the highest balances, and drains JMD$47.5 million to 23 beneficiary accounts before Monday morning. Based on the real Apr-Jun 2022 NCB smishing case, 14+ charged by MOCA through 2025.',
    estimatedLoss: 47_500_000,
    roles: ['analyst', 'soc', 'executive'],
    stages: [
      {
        id: 'SC005-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1098',
        heading: 'Resource Development — registering the lookalike',
        narrative: 'Seventy-two hours before go-live, the crew registers "ncb-verify[.]com" and "ncbonline-secure[.]info" through a privacy-protected registrar. They provision an SMS gateway that spoofs NCB\'s 876 short-code and clone the bank\'s online banking page pixel-for-pixel.',
        signals: [
          { severity: 'medium', text: 'Lookalike domain registered within 72 hours of campaign launch' },
          { severity: 'medium', text: 'SMS gateway traffic impersonating a known bank short-code' },
          { severity: 'high',   text: 'Banking-phishing kit signatures detected on clearnet threat-intel feeds' },
        ],
        question: 'What proactive control catches this infrastructure before it\'s used on customers?',
        options: [
          { text: 'Continuous lookalike-domain monitoring against your institution\'s brand, paired with automated takedown workflows and threat-intel sharing with peer Jamaican banks via JBA', correct: true, rationale: 'Attacker infrastructure is traceable before it goes live. Domain monitoring + peer sharing cuts the window from days to hours.' },
          { text: 'Block all SMS from unknown shortcodes at the carrier level', correct: false, rationale: 'Jamaican carriers don\'t provide bank-level SMS filtering. Practically impossible without regulatory mandate.' },
          { text: 'Post a customer warning on the bank website', correct: false, rationale: 'Reactive and damages trust. Customers remember the scare, not the protection.' },
          { text: 'Wait for customer complaints to tip you off', correct: false, rationale: 'By the time complaints come in, the drain is already complete — as the real 2022 case showed.' },
        ],
      },
      {
        id: 'SC005-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1018',
        heading: 'Initial Access — the smishing wave',
        narrative: '"NCB Alert: Suspicious login from Panama. If this wasn\'t you, verify at ncbonline-secure[.]info/v to prevent account freeze." Sent to 12,400 numbers on Saturday morning. Click rate: 14%. 180 customers enter credentials. The crew ranks them by balance and identifies 16 targets.',
        signals: [
          { severity: 'high',   text: 'Spike in password-reset requests from novel IP addresses within a 30-minute window' },
          { severity: 'high',   text: 'Geolocation mismatch — customer logins appear from countries with no travel history' },
          { severity: 'medium', text: 'Session starts within 60 seconds of password reset email confirmation' },
        ],
        question: 'Which control blocks this at Initial Access?',
        options: [
          { text: 'Adaptive MFA requiring step-up via push notification or FIDO2 passkey on password reset + new-device login — NOT SMS OTP', correct: true, rationale: 'The smishing page asks the victim to read out the OTP. Any phone-based second factor falls. Device-bound passkey or app-push is the defence.' },
          { text: 'Require longer passwords', correct: false, rationale: 'The attacker already has the password. Length is irrelevant once it\'s harvested.' },
          { text: 'SMS OTP for all password resets', correct: false, rationale: 'The victim reads the SMS code back to the phishing page. SMS OTP is defeated by the same vector that stole the password.', leadsTo: 'SC005-S2C' },
          { text: 'Add a security question about mother\'s maiden name', correct: false, rationale: 'Harvestable from Facebook, data breaches, obituaries. Not a meaningful factor.' },
        ],
      },
      {
        id: 'SC005-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1038',
        heading: 'Consequence — JMD$47.5M drained in 90 minutes',
        narrative: 'The bank\'s only step-up was SMS OTP. The crew\'s phishing page said "enter the 6-digit code we just sent" and each victim obliged. Within 90 minutes of the smishing wave, JMD$47.5M moves from 16 accounts to 23 beneficiary accounts across four Jamaican banks. ATM withdrawals begin within 20 minutes of each transfer.',
        signals: [
          { severity: 'high', text: '23 rapid beneficiary-additions, each followed by a transfer within 15 minutes' },
          { severity: 'high', text: 'ATM withdrawals begin 20 minutes after each beneficiary transfer, in geographies distant from the real customer' },
          { severity: 'high', text: 'Bank-initiated verification calls to affected customers all go unanswered (it\'s Saturday)' },
        ],
        question: 'With the heist in progress, what stops the bleeding fastest?',
        options: [
          { text: 'Real-time transfer-velocity monitoring with an auto-freeze rule matching the signature: multiple beneficiary-adds followed by transfers within minutes, especially on weekends', correct: true, rationale: 'This is the only control that operates at machine speed. Humans can\'t call 16 customers and make decisions in the 90-minute window.' },
          { text: 'Manually phone each affected customer', correct: false, rationale: '16 customers, most phones unanswered on Saturday, by the time you reach them the funds are withdrawn.' },
          { text: 'Freeze the entire transfer system', correct: false, rationale: 'Kills legitimate Saturday business (salary deposits, diaspora remittances).' },
          { text: 'File reversals after the fact', correct: false, rationale: 'Once cash is withdrawn, BOJ data shows recovery under 5%.' },
        ],
      },
      {
        id: 'SC005-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1044',
        heading: 'Monetization — the 23-mule ATM circuit',
        narrative: 'Each of the 23 beneficiary accounts is a money mule — recruited on WhatsApp or via "account rental" ads. Each mule has a strict play: maximum ATM withdrawal per transaction, hit 4-6 different machines across Kingston and Portmore, hand cash to the crew lead within 2 hours. The accounts go dark; the mules face charges later under POCA.',
        signals: [
          { severity: 'high',   text: 'Newly-funded accounts (age < 90 days) making maximum-limit ATM withdrawals' },
          { severity: 'high',   text: 'Circuit patterns — same card used at geographically-linked ATMs in chronological order matching a driving route' },
          { severity: 'medium', text: 'Withdrawal velocity greater than 3× standard deviation above the account\'s historical baseline' },
        ],
        question: 'What closes the final gap at monetization?',
        options: [
          { text: 'ATM velocity alerting keyed to max-limit circuits, with automatic card disablement after pattern match, plus JBA-level intelligence sharing so mule identities circulate across Jamaican FIs', correct: true, rationale: 'Mules use multiple banks; cross-bank detection is essential. FID\'s March 2026 bust showed most mules had accounts at 3+ institutions.' },
          { text: 'Lower the default ATM daily limit for all customers', correct: false, rationale: 'Hurts legitimate customers; crew adapts by using more mules.' },
          { text: 'Disable ATM use entirely during an incident', correct: false, rationale: 'Overreach that cripples retail banking service.' },
          { text: 'Refer it all to the JCF afterward', correct: false, rationale: 'Post-hoc is the worst leverage point. The Jamaican FIs need to act in minutes, not days.' },
        ],
      },
    ],
  },

  // ============================================================================
  // SC006 — SIM SWAP WITH TELCO INSIDER (the JMD$61M ring)
  // ============================================================================
  {
    id: 'SC006',
    title: 'SIM Swap with Telco Insider — JMD$61M over five years',
    severity: 'high',
    summary: 'A crew recruits two customer-service reps at a major Jamaican telco to perform fraudulent SIM swaps on demand. Over five years they drain JMD$61M from 42 online-banking customers before a joint FID/C-TOC investigation lands convictions. Based on the real 2021 Jamaican SIM-swap / money-laundering case (3 convicted, WIC News, 2025).',
    estimatedLoss: 61_000_000,
    roles: ['analyst', 'soc', 'executive'],
    stages: [
      {
        id: 'SC006-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1067',
        heading: 'Reconnaissance — targeting the wealth signal',
        narrative: 'Crew scans public Instagram and LinkedIn for high-net-worth Jamaicans. Markers: luxury vehicle photos, boutique business tags, Kingston professional-office check-ins, wealth-obvious "born day" parties. Cross-references with leaked data-broker records to obtain phone numbers and identify mobile carriers.',
        signals: [
          { severity: 'low',    text: 'Subject\'s public social media shows repeated wealth signals' },
          { severity: 'low',    text: 'Subject\'s mobile number appears in one or more breach databases' },
          { severity: 'medium', text: 'Subject\'s mobile carrier identifiable — determining which insider the crew will recruit' },
        ],
        question: 'What reduces victim surface at the recon stage?',
        options: [
          { text: 'Offer high-net-worth customers an optional private-number service + social-media hygiene briefing during annual relationship reviews', correct: true, rationale: 'Customer education targeted at the highest-risk cohort, without restricting anyone\'s social media, is a proportional response.' },
          { text: 'Freeze accounts of customers with public LinkedIn profiles', correct: false, rationale: 'Absurd overreach — LinkedIn is professionally necessary.' },
          { text: 'Require all retail customers to remove social media presences', correct: false, rationale: 'Not enforceable and not the bank\'s business.' },
          { text: 'Wait until after the SIM swap happens', correct: false, rationale: 'At that point you\'re in recovery mode, not prevention.' },
        ],
      },
      {
        id: 'SC006-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1072',
        heading: 'Resource Development — recruiting the insider',
        narrative: 'Crew targets BPO-floor CSRs at a major telco. Starts friendly via WhatsApp — shares memes, builds rapport over weeks. Then offers JMD$50,000 per successful SIM swap. Two CSRs agree. They process swaps for targets the crew provides, outside their normal queue, deliberately in batches to muddy the audit trail.',
        signals: [
          { severity: 'high',   text: 'CSR performs SIM-port actions outside their assigned regional zone' },
          { severity: 'high',   text: 'Same CSR processes multiple unrelated SIM ports within a single shift, for customers with no pattern' },
          { severity: 'medium', text: 'CSR\'s personal WhatsApp usage spikes specifically on days when swaps occur' },
        ],
        question: 'What control structure catches the insider?',
        options: [
          { text: 'Bank-telco partnership: telco publishes SIM-swap audit trail to participating banks; banks require step-up verification on any account whose linked number was ported in the past 48 hours', correct: true, rationale: 'This is the model adopted in South Africa post-2019 and dropped SIM-swap fraud 70%. It requires regulatory facilitation but is the only durable solution.' },
          { text: 'Longer CSR training programs', correct: false, rationale: 'Training doesn\'t address the monetary incentive. JMD$50K per swap is ~1.5 months of CSR salary.' },
          { text: 'More aggressive hiring screening', correct: false, rationale: 'The real insiders were clean hires who were recruited after starting work. Pre-employment screening is a fantasy control.', leadsTo: 'SC006-S2C' },
          { text: 'Raise CSR pay across the board', correct: false, rationale: 'Raising pay is good policy but does not compete with the crew\'s premium — and doesn\'t detect existing insiders.' },
        ],
      },
      {
        id: 'SC006-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1072',
        heading: 'Consequence — six months of undetected insider operation',
        narrative: 'With no monitoring of CSR port velocity or geography, the two insiders process 50+ swaps over six months. JMD$61M drained from 42 accounts. Only when a victim disputes a deposit does the thread unravel. The joint FID / C-TOC / MOCA investigation takes 14 months to chart the network.',
        signals: [
          { severity: 'high',   text: '50+ SIM swaps by a single CSR ID, each correlated with password-reset events at one of three banks' },
          { severity: 'high',   text: 'Identical pattern across every victim: port → password reset → wire within 10 minutes' },
          { severity: 'medium', text: 'Victim deposit-dispute cases all show the same 24-48 hour recovery delay' },
        ],
        question: 'Given you\'re now firefighting, what bounds the damage?',
        options: [
          { text: 'Work with the telco to identify every swap processed by the two compromised CSRs; freeze every affected account pending step-up verification; file SARs in parallel; deploy the pattern-signature as a real-time detection rule for ongoing activity', correct: true, rationale: 'Parallel containment is the only way — pursuing each case serially lets the crew keep operating while you investigate.' },
          { text: 'Wait for each victim to report individually', correct: false, rationale: '60%+ of Jamaican fraud is never reported (STATIN 2023). You\'d recover almost none.' },
          { text: 'Issue a public press release about the breach', correct: false, rationale: 'Warns the crew, who will flee and destroy evidence before arrests.' },
          { text: 'Reimburse all affected customers and investigate later', correct: false, rationale: 'Right instinct on customer care but reimbursement-first incentivizes further fraud reporting without evidence.' },
        ],
      },
      {
        id: 'SC006-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1018.001',
        heading: 'Initial Access + Execution — SIM swap to drained account in 8 minutes',
        narrative: 'The moment the SIM port completes, the crew navigates to the target\'s online-banking login, clicks "forgot password," captures the OTP sent to the newly-swapped SIM, sets a new password, adds themselves as a beneficiary (often using a fabricated name), and initiates a JMD$2M transfer. All within 8 minutes.',
        signals: [
          { severity: 'high', text: 'Password reset → beneficiary add → transfer, all within a 10-minute window' },
          { severity: 'high', text: 'Login from a device fingerprint never seen on this account' },
          { severity: 'high', text: 'Transfer destination is a beneficiary added seconds earlier, not previously used' },
        ],
        question: 'What single technical control most directly defeats this kill chain?',
        options: [
          { text: 'Device binding: online banking tied to a trusted device via FIDO2/passkey. New device triggers in-branch re-verification — SMS OTP alone cannot unlock the account.', correct: true, rationale: 'This completely breaks the SIM-swap kill chain. The attacker has the SIM but not the trusted device.' },
          { text: 'Longer SMS OTP codes (8 digits vs 6)', correct: false, rationale: 'The attacker intercepts the whole OTP either way. Length is cosmetic.' },
          { text: 'Require the customer\'s date of birth as a second factor', correct: false, rationale: 'In every breached Jamaican database. Not a factor.' },
          { text: 'Email-based OTP instead of SMS', correct: false, rationale: 'If the attacker has the phone, they often have the email (same breach, same recovery mechanism). Just shifts the vector.' },
        ],
      },
      {
        id: 'SC006-S4',
        order: 4,
        type: 'primary',
        techniqueId: 'F1047',
        heading: 'Monetization — crypto and structured cash',
        narrative: 'Drained funds split: 40% to local peer-to-peer crypto exchanges (USDT via LocalBitcoins / Paxful-equivalent), 60% to structured ATM withdrawals across Kingston and Spanish Town by a network of mules. Crew uses multiple wallets to fragment the crypto trail.',
        signals: [
          { severity: 'high',   text: 'Outbound transfer to a crypto exchange within minutes of account drain' },
          { severity: 'high',   text: 'Structured cash withdrawals, multiple under-JMD$500K in same-day sequence' },
          { severity: 'medium', text: 'Crypto exchange KYC on the receiving wallet links to a known cashout cluster' },
        ],
        question: 'At monetization, what does a mature FI do?',
        options: [
          { text: 'Monitor outbound crypto-exchange counterparties; maintain an industry block-list of known cashout wallets via Egmont Group / FATF sharing; flag and delay any transfer to a new crypto exchange beneficiary', correct: true, rationale: 'Crypto cashout is the single hardest vector to recover from. Industry sharing of bad-wallet intelligence is the only scaled defence.' },
          { text: 'Freeze all outbound crypto-exchange transactions', correct: false, rationale: 'Regulatorily contested and cuts off legitimate customers. Jamaica has no crypto ban.' },
          { text: 'Report to BOJ within 30 days', correct: false, rationale: 'Too slow. Funds already converted and moved on-chain.' },
          { text: 'Require customer phone verification for any crypto transfer', correct: false, rationale: 'The phone is exactly what\'s compromised. Self-defeating.' },
        ],
      },
    ],
  },

  // ============================================================================
  // SC007 — MONEY MULE / ACCOUNT RENTAL (FID March 2026 bust pattern)
  // ============================================================================
  {
    id: 'SC007',
    title: 'Account Rental — the money mule pipeline',
    severity: 'medium',
    summary: 'A crew recruits 22-year-old Allison from Clarendon on Instagram with a promise of JMD$80,000 for 30 days of "account rental." She opens accounts at NCB, JNCB, and Scotia in her real name. Over 3 months the accounts receive JMD$18M in proceeds from upstream phishing and lottery scams. She withdraws cash for the crew; she\'s the one who gets charged. Based on FID March 2026 bust (Johnson, Bentley, Brevett) under the Proceeds of Crime Act.',
    estimatedLoss: 18_000_000,
    roles: ['analyst', 'teller'],
    stages: [
      {
        id: 'SC007-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1067',
        heading: 'Resource Development — recruiting the mule on WhatsApp',
        narrative: '"Hey gyal — want easy money? Rent me your bank account for one month. I just send you some transfers, you withdraw and give me cash. You keep JMD$80K for your trouble. Clean, no risk." Allison, 22, rural Clarendon, unemployed since COVID, agrees. She opens accounts at three banks within a 10-day window using her real ID.',
        signals: [
          { severity: 'low',    text: '22-year-old customer opens accounts at three different banks within 10 days' },
          { severity: 'low',    text: 'Customer\'s stated occupation and declared income don\'t match multi-bank-account pattern' },
          { severity: 'medium', text: 'Same mobile number or email used across multiple new account openings at the bank' },
        ],
        question: 'What onboarding practice catches this before the mule account goes live?',
        options: [
          { text: 'Cross-bank KYC intelligence — a JBA-sponsored consortium sharing anomaly flags like "three-banks-in-ten-days" — with BOJ regulatory blessing for the data sharing', correct: true, rationale: 'No single bank sees the three-bank pattern. Collective detection is the only way, and it\'s exactly what industry consortia were built for.' },
          { text: 'Reject all 18-25 year-old account applications', correct: false, rationale: 'Discriminatory, commercially self-destructive, and most young customers are legitimate.' },
          { text: 'Require formal employment verification for every new account', correct: false, rationale: 'Excludes the many legitimate self-employed / informal-sector customers in Jamaica — estimated 40% of the workforce.' },
          { text: 'Wait for the first suspicious transaction to surface', correct: false, rationale: 'Reactive. By then the mule infrastructure is live across three banks.' },
        ],
      },
      {
        id: 'SC007-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1008',
        heading: 'Positioning — handing over the keys',
        narrative: 'Allison gives the crew her online-banking credentials, debit card, and PIN. They change the e-delivery notification settings so transaction alerts go to their email (a Gmail throwaway), not hers. They add their own device to her mobile banking.',
        signals: [
          { severity: 'high',   text: 'E-delivery notification address changed to a free-email domain within 10 days of account opening' },
          { severity: 'high',   text: 'Mobile banking device fingerprint changes within 48 hours of account opening' },
          { severity: 'medium', text: 'First three transactions are all incoming transfers from unrelated parties — not salary, not family' },
        ],
        question: 'Which detection is best tuned to this pattern?',
        options: [
          { text: 'Auto-freeze new accounts whose e-delivery address is changed within the first 30 days, pending in-branch identity re-verification', correct: true, rationale: 'Genuine customers rarely change e-delivery in the first 30 days. Mules almost always do. High-precision signal.' },
          { text: 'Ban all email-address changes on accounts', correct: false, rationale: 'False positives for legitimate customers who change jobs, providers, etc.' },
          { text: 'Require an in-branch visit for every single address change', correct: false, rationale: 'High friction for all customers, low precision for mules. The issue is specifically the first 30 days.', leadsTo: 'SC007-S2C' },
          { text: 'SMS alert the customer when e-delivery changes', correct: false, rationale: 'The mule IS the customer in this case. SMS reaches them fine; they just ignore it or collaborate.' },
        ],
      },
      {
        id: 'SC007-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1087',
        heading: 'Consequence — three months of untracked mule activity',
        narrative: 'Allison\'s three accounts receive JMD$18M over 90 days from 37 unrelated senders — many are elderly US diaspora victims of lottery scams or phishing. Cash withdrawn within four hours of each credit. Allison is paid JMD$240K total. FID traces her via a US-side SAR six months later. She\'s charged under POCA. The crew organiser remains at large.',
        signals: [
          { severity: 'high', text: '37 incoming transfers from unrelated senders within 90 days to a 3-month-old account' },
          { severity: 'high', text: 'Incoming-to-outgoing ratio near 1.0 — near-zero residual balance ever' },
          { severity: 'high', text: 'ATM withdrawals occur within 4 hours of every incoming credit' },
        ],
        question: 'When the pattern is finally visible, what\'s the right response?',
        options: [
          { text: 'Freeze the accounts, file SAR, coordinate with FID — and interview the mule. They\'re often unwitting or coerced and can identify the crew organiser.', correct: true, rationale: 'The mule is usually the weakest link in the crew\'s security. Treating them as both suspect and witness doubles your intelligence yield.' },
          { text: 'Simply close the accounts and let the mule walk', correct: false, rationale: 'The mule opens fresh accounts elsewhere the next week. Nothing changes.' },
          { text: 'Pursue the incoming senders (they must be co-conspirators)', correct: false, rationale: 'Those are typically victims, not conspirators. You\'d be re-victimising the elderly US phish-victims.' },
          { text: 'Wait for law enforcement to ask for information', correct: false, rationale: 'FIs have independent SAR obligations under BOJ/POCA. Passive posture is non-compliant.' },
        ],
      },
      {
        id: 'SC007-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1087',
        heading: 'Execution & Monetization — structured cash to the crew',
        narrative: 'The crew instructs Allison: "Never withdraw more than JMD$450K in one go. Go to three different ATMs. Meet me behind the KFC in May Pen at 6pm." Cash flows to the crew organiser, then washes through a small mini-mart and two used-car purchases.',
        signals: [
          { severity: 'high',   text: 'Consistent just-under-threshold withdrawal pattern (classic structuring)' },
          { severity: 'high',   text: 'Same retail business repeatedly receives structured cash deposits from multiple apparent-mule accounts' },
          { severity: 'medium', text: 'Vehicle registration records show the same buyer across multiple informal-dealer acquisitions' },
        ],
        question: 'What bank capability closes the loop at this stage?',
        options: [
          { text: 'Graph analytics linking accounts by shared attributes: devices, emails, withdrawal ATMs, deposit-receiving businesses, common recipients. The crew organiser appears as the cluster hub.', correct: true, rationale: 'Mules are disposable. The crew organiser is the persistent node. Graph analytics surfaces the persistent node no matter how many mules rotate.' },
          { text: 'Flag every cash deposit over JMD$100K', correct: false, rationale: 'Overwhelming false positive rate; would cripple small business banking.' },
          { text: 'Cap all cash withdrawals at JMD$100K per day', correct: false, rationale: 'Affects legitimate customers; crews adapt by using more mules.' },
          { text: 'Audit quarterly', correct: false, rationale: 'Too slow. The mule cycle is 30-90 days; quarterly review is post-mortem.' },
        ],
      },
    ],
  },

  // ============================================================================
  // SC008 — ATM SKIMMING IN MONTEGO BAY TOURIST ZONE
  // ============================================================================
  {
    id: 'SC008',
    title: 'ATM Skimming — Sam Sharpe Square tourist zone',
    severity: 'medium',
    summary: 'A crew installs a card-skimmer and pinhole camera on a high-traffic ATM near Sam Sharpe Square in Montego Bay. Over three days they harvest 412 card-PIN pairs — mix of Jamaican residents and tourists. Cards are cloned and drained at ATMs across Portland and St. Ann. Bank loss: JMD$12M in fraud, card reissuance, and chargebacks.',
    estimatedLoss: 12_000_000,
    roles: ['analyst', 'teller', 'soc'],
    stages: [
      {
        id: 'SC008-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1042',
        heading: 'Resource Development — casing and installing',
        narrative: 'Crew scouts Sam Sharpe Square for two weeks. They pick a high-volume ATM with infrequent service visits and no dedicated camera. Install a card-slot overlay that reads the magnetic stripe, and a pinhole camera in the ATM\'s ceiling light fixture that captures PIN entry. Crew checks the device every evening via short-range Bluetooth retrieval.',
        signals: [
          { severity: 'medium', text: 'Unusual ATM access pattern between regularly-scheduled bank maintenance visits' },
          { severity: 'low',    text: 'CCTV (where it exists) shows individuals loitering near ATM for specifically 10-minute intervals' },
          { severity: 'medium', text: 'First-time Bluetooth signal detected in sustained proximity to ATM' },
        ],
        question: 'What proactive control catches skimmer installation before the harvest?',
        options: [
          { text: 'Tamper-detection sensors on ATM card slots + periodic Bluetooth scans + anti-skimming slot hardware, paired with mandatory visual-integrity checks after every service visit', correct: true, rationale: 'Layered physical + electronic detection is the proven approach — European banks dropped skimming losses 95% via this bundle.' },
          { text: 'Daily physical inspection by staff', correct: false, rationale: 'Labor-intensive, and attacker inspections are themselves short enough to evade regular checks.' },
          { text: 'Disable tourist-area ATMs outside banking hours', correct: false, rationale: 'Damages tourist service; tourists generate the highest ATM fee revenue.' },
          { text: 'Accept skimming losses as a cost of doing business', correct: false, rationale: 'Losses compound, and regulatory exposure grows. Especially poor posture post-2024 BOJ cyber-risk guidance.' },
        ],
      },
      {
        id: 'SC008-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1082',
        heading: 'Positioning — the harvest',
        narrative: 'Over three days, 412 card-PIN pairs captured. Crew retrieves data nightly via Bluetooth. On the morning of day four they move the physical skimmer to a different ATM six blocks away — to avoid pattern detection. First cloned-card fraud complaints hit the bank 48 hours later.',
        signals: [
          { severity: 'high',   text: 'Customer complaints about unusual charges clustered around a single common ATM in the past 72 hours' },
          { severity: 'high',   text: 'Graph analysis: fraud victims share a common ATM used in the 7 days prior' },
          { severity: 'medium', text: 'Tourist-card fraud dispute volume spikes by more than 3x typical seasonal baseline' },
        ],
        question: 'What detection pinpoints the compromised ATM fastest?',
        options: [
          { text: 'Graph analytics linking fraud victims by shared ATM use in the previous 7 days. The compromised ATM appears as the common node in minutes, not weeks.', correct: true, rationale: 'The bank already has the data (ATM location per transaction, fraud dispute per customer). Graph queries surface the cluster immediately.' },
          { text: 'Wait for formal customer complaints to pile up', correct: false, rationale: 'Weeks of delay; by then the skimmer has moved on.' },
          { text: 'Have the ATM service provider audit every machine manually', correct: false, rationale: 'Too slow and requires staffing the service provider can\'t meet.', leadsTo: 'SC008-S2C' },
          { text: 'Review CCTV at every ATM in Mobay', correct: false, rationale: 'Cost-prohibitive and CCTV coverage is inconsistent across locations.' },
        ],
      },
      {
        id: 'SC008-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1044',
        heading: 'Consequence — 19 days undetected',
        narrative: 'Bank discovered the compromised ATM 19 days after initial installation. By then, the crew has milked all 412 cards. 60+ victims are US/Canadian tourists — their home banks absorb the loss, generating interchange disputes. Jamaican bank loss: JMD$12M in replacement card costs, fraud chargebacks, reputational response, and BOJ reporting.',
        signals: [
          { severity: 'high',   text: 'Cluster of fraud disputes all traced to the same root ATM location' },
          { severity: 'high',   text: 'Withdrawal patterns on cloned cards show deliberate geographic dispersion (Portland, St. Ann, St. Catherine)' },
          { severity: 'medium', text: 'Tourist complaints concentrate in Nov-Mar peak season' },
        ],
        question: 'What\'s the right customer-facing response now?',
        options: [
          { text: 'Proactively contact every customer who used that ATM in the detection window, apply zero-liability policy, expedite card replacement, notify FID and publish an industry advisory via JBA', correct: true, rationale: 'Proactive customer contact is both the right thing to do and the regulator-approved stance. Passive handling invites BOJ censure.' },
          { text: 'Handle customer complaints individually as they arrive', correct: false, rationale: 'Slow, frustrating for customers, and erodes trust further.' },
          { text: 'Issue a vague blanket apology and hope for the best', correct: false, rationale: 'Regulatory exposure — BOJ requires specific disclosure to affected customers.' },
          { text: 'Quietly refund without public acknowledgement', correct: false, rationale: 'BOJ has explicit disclosure obligations. Quiet refunds don\'t meet them.' },
        ],
      },
      {
        id: 'SC008-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1044.001',
        heading: 'Monetization — cloning and dispersed ATM hits',
        narrative: 'Crew encodes the 412 stolen tracks onto blank plastic, uses the captured PINs. Withdraws cash at ATMs in distant parishes — Portland, Ocho Rios, Kingston — deliberately not Montego Bay. Average haul: JMD$30K per card (higher for tourist cards with higher daily limits).',
        signals: [
          { severity: 'high',   text: 'Card use in geography inconsistent with the cardholder\'s phone location at that moment' },
          { severity: 'high',   text: 'Back-to-back ATM hits in chronologically-plausible driving-distance patterns' },
          { severity: 'medium', text: 'Withdrawal occurs immediately after the card\'s track encoding timestamp' },
        ],
        question: 'What real-time control defeats monetization?',
        options: [
          { text: 'Real-time card-phone geolocation match: the cardholder\'s phone is in Mobay, the card is being used in Ocho Rios at 3am — decline in-flight and alert', correct: true, rationale: 'This is the gold-standard control. Visa/Mastercard offer it as a service; cards with this protection see skimming losses drop more than 80%.' },
          { text: 'Block all ATM withdrawals after 11pm', correct: false, rationale: 'Hurts legitimate late-night users, especially shift workers and hospitality staff.' },
          { text: 'Require double-PIN entry on every ATM withdrawal', correct: false, rationale: 'Same compromised PIN still works twice. High customer friction, zero security gain.' },
          { text: 'Cap daily withdrawal to JMD$10K', correct: false, rationale: 'Crew just uses more cards; net fraud is unchanged while legitimate customers are harmed.' },
        ],
      },
    ],
  },

  // ============================================================================
  // SC009 — CHEQUE WASHING / MOBILE DEPOSIT FRAUD
  // ============================================================================
  {
    id: 'SC009',
    title: 'Cheque Washing — mail theft to mobile deposit',
    severity: 'medium',
    summary: 'A crew intercepts corporate vendor-payment envelopes in Stony Hill communal mailboxes, washes the payee name with nail-polish remover, rewrites a mule\'s name, and deposits via mobile banking. Funds clear T+1; cash withdrawn before the issuer reconciles and disputes. Reflects the emerging pattern flagged in BOJ\'s 2024-2025 internet-banking fraud reporting.',
    estimatedLoss: 3_200_000,
    roles: ['analyst', 'teller'],
    stages: [
      {
        id: 'SC009-S1',
        order: 1,
        type: 'primary',
        techniqueId: 'F1074',
        heading: 'Reconnaissance — mail theft at communal mailboxes',
        narrative: 'Crew targets mid-size apartment complexes in Stony Hill and Red Hills where communal mailboxes are unattended during work hours. They pick envelopes that look like corporate vendor payments — pre-printed return addresses from companies, windowed envelopes. Operation is small-scale: one or two mailboxes per week.',
        signals: [
          { severity: 'medium', text: 'Post office reports rising theft complaints in a specific postal district' },
          { severity: 'medium', text: 'Corporate customers reporting cheques mailed but never received by intended recipient' },
          { severity: 'low',    text: 'Cluster of mail-theft complaints on social media in the same neighbourhood' },
        ],
        question: 'How does the bank reduce exposure to this upstream vector?',
        options: [
          { text: 'Migrate corporate clients from cheques to ACH/RTGS for vendor payments. For clients on legacy cheque systems, offer positive-pay: bank matches issued-cheque list to presented cheques before clearing.', correct: true, rationale: 'Eliminating the paper cheque vector is the only durable solution. Positive-pay is a mature, cheap control where the vendor relationship still needs cheque payment.' },
          { text: 'Switch all corporate clients to certified cheques', correct: false, rationale: 'More expensive and still physically stealable. Certification doesn\'t protect the payee field.' },
          { text: 'Insist on registered post for every cheque mailing', correct: false, rationale: 'Cost-prohibitive for high-volume payers and doesn\'t stop theft at the delivery address.' },
          { text: 'Accept cheque fraud as a cost of business', correct: false, rationale: 'BOJ supervisory posture post-2024 explicitly expects institutions to migrate off vulnerable instruments.' },
        ],
      },
      {
        id: 'SC009-S2',
        order: 2,
        type: 'primary',
        techniqueId: 'F1050',
        heading: 'Resource Development — washing and altering',
        narrative: 'Crew uses cotton swabs soaked in acetone (nail-polish remover) to lift the ink from the payee line. After the paper dries, they write in a mule\'s name. For higher-value cheques they photograph, reprint, and forge a signature. The amount line is left untouched to avoid scrutiny.',
        signals: [
          { severity: 'high',   text: 'Chemical residue visible on cheque surface under reflective scan at teller station' },
          { severity: 'medium', text: 'Payee name mismatches the issuer\'s vendor list (positive-pay discrepancy)' },
          { severity: 'medium', text: 'Ink inconsistency — different pen pressure or colour between payee field and amount field' },
        ],
        question: 'At the teller or mobile-deposit ingestion point, what is the bank\'s best check?',
        options: [
          { text: 'Positive-pay image-matching: compare presented cheque against the issuer\'s declared issued-cheque file before clearing. Discrepancy = hold for review.', correct: true, rationale: 'This is the textbook control for this exact attack. Adopted industry-wide in the US; Jamaican rollouts are BOJ-encouraged but uneven.' },
          { text: 'Have tellers visually inspect every cheque', correct: false, rationale: 'Volume too high; humans miss chemical alterations reliably in any controlled test.', leadsTo: 'SC009-S2C' },
          { text: 'Delay every cheque deposit for 10 days', correct: false, rationale: 'High customer friction, and doesn\'t address the altered-payee issue at all.' },
          { text: 'Wait for the issuer to dispute the cleared cheque', correct: false, rationale: 'Funds already cleared and withdrawn. Dispute takes weeks; recovery is rare.' },
        ],
      },
      {
        id: 'SC009-S2C',
        order: 2.5,
        type: 'consequence',
        techniqueId: 'F1050',
        heading: 'Consequence — cleared, withdrawn, disputed weeks later',
        narrative: 'Bank cleared the washed cheque routinely. Funds available T+1. Mule withdrew cash same day. Two weeks later the corporate issuer reconciles accounts, notices the real vendor wasn\'t paid, files a dispute. Bank is on the hook for JMD$3.2M per BOJ liability guidance (paper cheque forgery is the depositary bank\'s risk).',
        signals: [
          { severity: 'high',   text: 'Corporate vendor formally complains about missed payment to the issuing company' },
          { severity: 'high',   text: 'Issuing company reviews the cheque image and detects the alteration' },
          { severity: 'medium', text: 'Mule\'s account history shows the same deposit-then-rapid-withdrawal pattern on two or more prior cheques' },
        ],
        question: 'What\'s the right operational response now?',
        options: [
          { text: 'Accept liability per BOJ guidance, pursue the mule via FID/JCF, file SAR, roll out positive-pay to all corporate clients above a set volume threshold within the quarter', correct: true, rationale: 'Own the liability (regulatory expectation), chase the downstream criminal, and fix the systemic control gap. All three at once.' },
          { text: 'Dispute the issuer\'s claim', correct: false, rationale: 'Liability for altered-payee fraud falls on the depositary bank under BOJ guidance. Disputing is both wrong and reputationally damaging.' },
          { text: 'Partial refund only', correct: false, rationale: 'Regulatory risk. BOJ doesn\'t support partial-refund approaches on clear-cut altered-cheque fraud.' },
          { text: 'Refer to the bank\'s insurance and otherwise do nothing', correct: false, rationale: 'Insurance may pay out but only after confirming the bank\'s process failed. Doing nothing guarantees a repeat.' },
        ],
      },
      {
        id: 'SC009-S3',
        order: 3,
        type: 'primary',
        techniqueId: 'F1033.002',
        heading: 'Execution — when mobile deposit makes it faster',
        narrative: 'For sub-JMD$200K cheques, the crew skips the teller entirely. They photograph the washed cheque via the mule\'s mobile-banking app. Funds clear T+1. Cash withdrawn via ATM before the bank\'s systems flag any alteration or duplicate-presentation issue.',
        signals: [
          { severity: 'high',   text: 'Mobile-deposit cheque image shows watermark inconsistencies or detectable chemical-alteration residue' },
          { severity: 'high',   text: 'Same cheque image submitted across multiple banks\' mobile-deposit endpoints (the crew tries several)' },
          { severity: 'medium', text: 'First mobile deposit on a newly-opened account substantially exceeds typical new-account baseline' },
        ],
        question: 'What defeats mobile-deposit washing fraud specifically?',
        options: [
          { text: 'AI image-analysis on cheque photos checking for chemical-alteration signatures and ink inconsistencies + cross-bank duplicate-detection consortium so the same cheque image can\'t be deposited at multiple institutions', correct: true, rationale: 'The technical vector is digital image analysis; the operational vector is industry sharing. Need both.' },
          { text: 'Disable mobile deposit entirely', correct: false, rationale: 'Punishes all customers disproportionately, and modern customer expectation makes this commercially infeasible.' },
          { text: 'Hold every mobile deposit 10 days', correct: false, rationale: 'Customer friction is severe, and partially effective at best — still 10 days is eventually T+10 cleared.' },
          { text: 'Limit mobile deposits to JMD$50K', correct: false, rationale: 'Crew just uses smaller cheques more often. Net fraud unchanged.' },
        ],
      },
    ],
  },

]
