export const TACTICS = [
  {
    id: 'T001',
    name: 'Reconnaissance',
    order: 1,
    uniqueToF3: false,
    summary: 'Attacker gathers information about targets — institutions, executives, vendors, or customers — before launching an attack.',
    executiveTakeaway: 'Most fraud begins with public information. Reducing your digital footprint and monitoring for lookalike domains pays outsized dividends.',
  },
  {
    id: 'T002',
    name: 'Resource Development',
    order: 2,
    uniqueToF3: false,
    summary: 'Attacker acquires or builds the assets needed to operate: synthetic identities, mule accounts, spoofed domains, phishing kits.',
    executiveTakeaway: 'Many resources take weeks to months to build. This creates a detection window — if you know what to look for.',
  },
  {
    id: 'T003',
    name: 'Initial Access',
    order: 3,
    uniqueToF3: false,
    summary: 'Attacker gains entry to an account, system, or communication channel — via phishing, credential stuffing, SIM swap, or social engineering.',
    executiveTakeaway: 'Phishing-resistant MFA (FIDO2) is the single highest-impact control at this stage. SMS OTP is no longer sufficient.',
  },
  {
    id: 'T004',
    name: 'Defense Evasion',
    order: 4,
    uniqueToF3: false,
    summary: 'Attacker takes steps to bypass detection and controls — SIM swapping to defeat SMS MFA, device spoofing, or mule-account layering.',
    executiveTakeaway: 'Treat every anomaly (new device, location change, SIM port) as a step-up authentication trigger, not just a flag.',
  },
  {
    id: 'T005',
    name: 'Positioning',
    order: 5,
    uniqueToF3: true,
    summary: 'Attacker prepares within the environment after gaining access — building credit history, cultivating trust, waiting for high-value moments.',
    executiveTakeaway: 'Unique to F3. Traditional point-in-time fraud scoring misses this entirely. Behavioral analytics across the account lifecycle are essential.',
  },
  {
    id: 'T006',
    name: 'Execution',
    order: 6,
    uniqueToF3: false,
    summary: 'The fraudulent action itself — wire initiation, credit line bust-out, unauthorized transaction, invoice redirection.',
    executiveTakeaway: 'Out-of-band verification (separate channel from the request) is the most effective last-mile control.',
  },
  {
    id: 'T007',
    name: 'Monetization',
    order: 7,
    uniqueToF3: true,
    summary: 'Attacker converts stolen assets into usable funds — via mule networks, crypto conversion, layering, or cash extraction.',
    executiveTakeaway: 'Unique to F3. The first 60 minutes after execution determine recovery rate. SWIFT gpi recall and interbank fraud coordination are critical capabilities.',
  },
]

export const TECHNIQUES = [
  { id: 'T001.001', tacticId: 'T001', name: 'Executive OSINT',                  description: 'Gathering information about executives and their relationships from public sources — LinkedIn, SEC filings, press releases.' },
  { id: 'T001.002', tacticId: 'T001', name: 'Vendor relationship mapping',      description: 'Identifying vendor relationships and invoice cycles to time fraudulent requests against expected payments.' },
  { id: 'T001.003', tacticId: 'T001', name: 'Dark web data acquisition',        description: 'Purchasing breached PII, credentials, or account credentials on dark web marketplaces.' },

  { id: 'T002.001', tacticId: 'T002', name: 'Lookalike domain registration',    description: 'Registering domains that visually resemble trusted institutions or vendors (e.g., rn vs m, 0 vs o).' },
  { id: 'T002.002', tacticId: 'T002', name: 'Synthetic identity creation',      description: 'Combining real SSNs (often from children or the deceased) with fabricated identity attributes to build new personas.' },
  { id: 'T002.003', tacticId: 'T002', name: 'Mule account network',             description: 'Recruiting or purchasing bank accounts to receive and layer fraudulent funds.' },

  { id: 'T003.001', tacticId: 'T003', name: 'Spear phishing',                   description: 'Targeted phishing using personal details to increase credibility, typically delivering credential-harvesting links or malware.' },
  { id: 'T003.002', tacticId: 'T003', name: 'Credential stuffing',              description: 'Automated testing of breached credentials across banking portals.' },
  { id: 'T003.003', tacticId: 'T003', name: 'SIM swap',                         description: 'Socially engineering a mobile carrier to port the victim\'s phone number to an attacker-controlled SIM.' },
  { id: 'T003.004', tacticId: 'T003', name: 'Voice phishing (vishing)',         description: 'Impersonating bank staff or executives over the phone to extract credentials or authorize transactions.' },

  { id: 'T004.001', tacticId: 'T004', name: 'MFA bypass via SIM swap',          description: 'Using a completed SIM swap to intercept SMS-based MFA codes and reset account credentials.' },
  { id: 'T004.002', tacticId: 'T004', name: 'Device fingerprint spoofing',      description: 'Mimicking a legitimate user\'s device characteristics to bypass fraud detection systems.' },
  { id: 'T004.003', tacticId: 'T004', name: 'Layered money movement',           description: 'Rapid splitting of funds across multiple accounts and jurisdictions to obscure trail.' },

  { id: 'T005.001', tacticId: 'T005', name: 'Credit history cultivation',       description: 'Making on-time payments on small accounts for 12–18 months to build creditworthiness before a bust-out.' },
  { id: 'T005.002', tacticId: 'T005', name: 'Romance and trust building',       description: 'Establishing a fake relationship with a victim over weeks or months before initiating fraudulent asks (pig butchering).' },
  { id: 'T005.003', tacticId: 'T005', name: 'Dormant account aging',            description: 'Leaving compromised accounts untouched to defeat behavioral anomaly detection before executing.' },

  { id: 'T006.001', tacticId: 'T006', name: 'Fraudulent wire request',          description: 'Instructing finance staff to initiate a wire transfer, typically via compromised executive email.' },
  { id: 'T006.002', tacticId: 'T006', name: 'Invoice redirection',              description: 'Altering vendor bank details on legitimate invoices to redirect payments to attacker accounts.' },
  { id: 'T006.003', tacticId: 'T006', name: 'Credit line bust-out',             description: 'Rapid simultaneous maxing of all credit lines on a synthetic identity before abandonment.' },
  { id: 'T006.004', tacticId: 'T006', name: 'Authorized push payment (APP)',    description: 'Manipulating the legitimate account holder into authorizing a transfer to the attacker.' },

  { id: 'T007.001', tacticId: 'T007', name: 'Crypto conversion',                description: 'Converting stolen fiat funds to cryptocurrency to move them outside regulated banking.' },
  { id: 'T007.002', tacticId: 'T007', name: 'Mule account layering',            description: 'Splitting funds across mule accounts to break the audit trail before final cash-out.' },
  { id: 'T007.003', tacticId: 'T007', name: 'Cash extraction',                  description: 'Final withdrawal of laundered funds via ATM networks or in-person cash pickups.' },
]
