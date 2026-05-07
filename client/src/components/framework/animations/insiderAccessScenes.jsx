/**
 * insiderAccessScenes.jsx — v25.7.0.19
 *
 * Scene data for Insider Access Abuse (F1072) under Initial Access
 * (TA0001). Uses MultiActorSequenceAnimation engine.
 *
 * Composite case grounded in:
 * - Jamaica J$61M SIM-swap conviction case (October 2025, WIC News
 *   reporting): two telco CSRs convicted as accomplices in the SIM-
 *   swap operation. Confirms the Caribbean banking environment has
 *   active insider-driven attack patterns. Animation reframes the
 *   pattern with a BANK insider rather than telco insider, since
 *   F1072 specifically addresses authorized banking-system access.
 * - Bank of Jamaica 2024-2025 internet-banking fraud reporting: the
 *   public reporting notes insider-driven incidents account for a
 *   small fraction of incident counts but a disproportionate
 *   fraction of fraud value (high value per case). Exact figures
 *   are not in public reporting; the pattern is.
 * - SC006 in caribbean-scenarios.js (the existing F1072 reference)
 *   covers the recruited-insider-by-external-crew framing. This
 *   animation covers the standalone-insider framing — same F-code,
 *   complementary scenario.
 *
 * Scenario character: Mr. Devon Walters, JNCB Personal Banker at
 * the Half-Way Tree branch, age 38, 6 years tenure. Trusted by
 * colleagues, has authorized read access to customer accounts for
 * service operations. Targets Mrs. Janelle Chambers, a 67-year-old
 * retired civil servant whose pension goes to JNCB and who never
 * logs in online — perfect victim profile for an insider attack
 * because the customer cannot detect the unauthorized access from
 * the customer side.
 *
 * Distinct character role from Allison Brown (mule SC007), Marcia
 * Edwards (Structuring vendor F1087), Trevor Bennett (Structurer
 * F1087), Beverly Williams (Phishing F1081), Devon Henry (Vishing
 * F1088 — distinct first-name reuse handled by middle context),
 * Tanya Ricketts (SIM Swap T1451), Andre Lewis (Password Reset
 * F1018.001), Pat Henriques (MFA Fatigue T1621), Marcus Walters
 * (3DS Bypass F1076 deferred — also surname reuse handled by
 * scenario context).
 *
 * NOTE on character naming: this animation uses "Devon Walters" —
 * "Devon" first appears in the F1088 Vishing animation (Devon Henry).
 * The reuse is intentional to model that Caribbean fraud scenarios
 * involve real local naming patterns; the surname disambiguates and
 * the scenario context (Personal Banker vs JNCB business customer)
 * makes the role distinction immediate. If renaming is preferred,
 * a future minor release can swap to a unique first name.
 *
 * Pedagogical insight (locked v25.7.0.19):
 *   Authorized access is the most dangerous attack surface because
 *   the bank's own audit logs treat the insider's actions as
 *   legitimate. Phishing, vishing, MFA fatigue, password-reset, and
 *   SIM-swap all leave forensic signatures the bank can detect.
 *   An insider operating within their authorized scope leaves audit
 *   logs that look like every other employee transaction.
 *
 *   The only controls that catch insider abuse are organizational
 *   and engineering, not customer-side: behavioral analytics on
 *   access patterns (Devon's customer-record-access count is 4x
 *   his branch average for accounts he isn't assigned to);
 *   peer-comparison anomaly detection (his transaction value per
 *   shift is in the 99th percentile across the branch); segregation
 *   of duties (no single employee should be able to initiate AND
 *   approve customer-account modifications above a threshold);
 *   four-eyes principle on high-stakes operations (a J$3M transfer
 *   approval should require two independent employee logins, not
 *   one).
 *
 *   Operational pedagogy for tellers and branch managers: when a
 *   customer disputes transactions and the audit log shows the
 *   transactions were initiated by a branch employee on a branch
 *   terminal — do not assume "if the bank did it, it must be
 *   authorized." Run the access-pattern analysis: did the assigned
 *   banker initiate, or did a different employee with no business
 *   reason to touch this account? Cross-reference against the
 *   branch's segregation-of-duties matrix.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered.
 *   The naive control "thorough background checks during hiring"
 *   is surfaced and countered: background checks catch known-bad
 *   actors at the door; they do nothing about employees who were
 *   genuinely good when hired but later face financial pressure,
 *   coercion, or recruitment by external crews. Continuous
 *   monitoring of behavior patterns is the only durable control.
 */


/* ─── Actors: 4-actor multi-actor sequence ────────────────────── */
export const INSIDER_ACTORS = [
  {
    id: 'insider',
    name: 'Mr. Devon Walters',
    role: 'JNCB Personal Banker · Half-Way Tree · 6 yrs',
    initialState: 'active',
  },
  {
    id: 'janelle',
    name: 'Mrs. Janelle Chambers',
    role: 'JNCB customer · retired civil servant · age 67 · never logs in online',
    initialState: 'unaware',
  },
  {
    id: 'jncb',
    name: 'JNCB Jamaica',
    role: 'Bank · branch terminals + audit logs + Internal Audit',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'External cash-out',
    role: 'Recipient accounts · cousin · personal credit cards',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const INSIDER_CONTROLS = [
  {
    id: 'ctrl-access-pattern-analytics',
    label: 'Behavioral analytics on employee access patterns',
    meta: 'Continuous monitoring of which employees access which customer records, with peer-comparison anomaly detection. Flags Devon at week 2 because his per-week customer-record-access count is 4x the branch average for accounts where he is NOT the assigned banker. The pattern is invisible to point-in-time review (any single access looks legitimate); it is visible only in aggregate. Catches the technique before the J$3.2M is fully drained.',
    naive: false,
    revealsAtStages: [3, 4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'access-pattern anomalies',
  },
  {
    id: 'ctrl-segregation-of-duties',
    label: 'Segregation of duties + four-eyes principle on high-stakes ops',
    meta: 'Bank-side rule: no single employee can initiate AND approve a customer-account modification above J$500K. Devon would be able to initiate the J$3.2M structured drain, but each transfer above J$500K would require an independent supervisor login to approve. The supervisor sees the transaction details (recipient, customer profile) and can refuse if the pattern looks wrong. Defeats the standalone-insider attack; partially defeats recruited-insider-pair (depends on whether both insiders are in the same branch).',
    naive: false,
    revealsAtStages: [4, 5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'high-stakes transactions',
  },
  {
    id: 'ctrl-customer-callback-on-large-tx',
    label: 'Mandatory customer callback on transfers > J$1M',
    meta: 'For any outbound transfer above J$1M from a personal account, the bank initiates a callback to the customer\'s registered phone to verify authorization. Janelle does not use online banking, but she does answer her phone — the callback would reach her, she would say "I did not authorize this," and the transfer would be reversed. Defeats both insider abuse and external attacks that rely on the customer not being notified. Requires customers to be reachable; older customers without smartphones are particularly well-served by phone callbacks.',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'large-transfer authorizations',
  },
  {
    id: 'ctrl-naive-background-checks',
    label: 'Thorough background checks during hiring',
    meta: 'Pre-employment background checks (police record, prior employment verification, credit check). Doesn\'t work as a primary control for three reasons: (a) Devon was a clean hire 6 years ago — no police record, no prior fraud, glowing references. The background check at hire said exactly what it should have said. (b) People change. Financial pressure (a sick parent, a gambling problem, a divorce) can turn a previously-clean employee into a fraud risk overnight. (c) Background checks are point-in-time; insider abuse is a continuous risk. Real defense is continuous monitoring of behavior patterns, not pre-employment screening alone.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Treats insider risk as a hiring problem. Devon was clean at hire; he is not clean now. The control that catches him is behavioral analytics on his current actions, not paperwork from 6 years ago. Caribbean banks that overinvest in pre-employment screening relative to continuous monitoring inherit the false confidence that "we hired good people, so we are safe."',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const INSIDER_SIGNALS = [
  {
    id: 'sig-access-frequency-anomaly',
    label: 'Devon accesses 4x branch-average non-assigned-customer records',
    description: 'Branch baseline: a Personal Banker accesses ~12 customer records per week for customers they are not the assigned banker for (legitimate cross-coverage when colleagues are out, customer service when assigned banker is unavailable). Devon accesses 47 such records in week 1, 52 in week 2 — roughly 4x the peer mean. Each individual access is justifiable in isolation ("customer called, I helped"); the aggregate pattern is the signal. Behavioral analytics catches this; point-in-time review does not.',
    revealedBy: 'ctrl-access-pattern-analytics',
  },
  {
    id: 'sig-target-victim-profile',
    label: 'Devon\'s targets share a profile: high-balance, no online banking',
    description: 'Of the 47 non-assigned customer records Devon accessed in week 1, 38 were retired customers age 60+ with high balances (>J$1M) and no online banking activity in the past 12 months. The selection bias is statistically significant. A legitimate Personal Banker servicing cross-coverage requests would see a population mix matching the branch demographics overall, not heavily skewed to "customers who would not notice if their account changed." This signal requires correlation across multiple data sources (customer demographics + access logs); not visible in any single audit report.',
    revealedBy: 'ctrl-access-pattern-analytics',
  },
  {
    id: 'sig-no-supervisor-approval',
    label: 'High-stakes transactions completed without supervisor approval',
    description: 'JNCB has a stated policy that customer-account modifications above J$500K require supervisor approval (a separate employee login confirming the operation). The policy exists. The system enforcement does not — Devon\'s branch terminal allows him to complete transactions of any amount under his own login. Policy without enforcement is not a control; it is a hope. Many Caribbean banks have similar policy-versus-system gaps because the original branch terminal software was built before segregation-of-duties was a regulatory expectation, and retrofitting two-employee approval flows requires UI rework that has been deferred for years.',
    revealedBy: 'ctrl-segregation-of-duties',
  },
  {
    id: 'sig-no-customer-callback',
    label: 'No callback to Janelle on the J$3.2M cumulative transfer',
    description: 'Janelle\'s registered phone (a flip phone, no SMS or smartphone app) is in the bank\'s records. JNCB\'s callback policy applies to transfers above J$1M. Devon structured the drain into 7 transfers below J$500K each across 4 weeks specifically to stay below the supervisor-approval threshold AND below the customer-callback threshold. The callback never fires because no individual transaction crosses the J$1M ceiling. Ceiling-based controls are easily defeated by structuring; cumulative-period controls (>J$1M from one account in a 30-day period) would catch this exact pattern.',
    revealedBy: 'ctrl-customer-callback-on-large-tx',
  },
  {
    id: 'sig-recipient-relationship',
    label: 'Recipient account belongs to Devon\'s cousin',
    description: 'Two of the seven transfer destinations resolve to a JNCB account owned by Devon\'s maternal cousin. Internal Audit cross-references the recipient\'s "next of kin" field on file (declared during account opening) and finds the family connection. Standalone, this is presumptive — bank employees do legitimately have family who are also bank customers. Combined with the access-pattern anomaly, the target-victim profile signal, and the structured-transfer pattern, it is conclusive. Eight months later Devon is convicted; the J$3.2M is partially recovered (J$1.4M) from the recipient accounts before the rest is dispersed.',
    revealedBy: 'ctrl-customer-callback-on-large-tx',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const INSIDER_STAGES = [
  /* Stage 1 — Target identification */
  {
    id: 'in-stage-1',
    label: 'Target identification',
    title: 'Routine review surfaces Janelle\'s account',
    caption: 'Day 0 of the operation. Devon is at his desk on a slow Tuesday afternoon, working through a routine balance-review report his branch manager sends weekly. The report lists customers with balances above J$1M who have had no online banking activity in the past 12 months — JNCB uses it for proactive customer outreach (calling these customers to offer financial advisory services). For Devon, the report is a target list. Mrs. Janelle Chambers, age 67, balance J$3.2M in a 3-year fixed deposit, last logged in to online banking December 2021 (4+ years ago). She is the perfect victim profile: high balance, no digital channel, retirement income makes balance changes less noticeable.',
    durationMs: 7000,
    messages: [
      { id: 'in-m1-1', fromActor: 'jncb', toActor: 'insider', kind: 'system', label: 'Weekly review report · 47 customers · for outreach',
        audio: { text: 'Weekly review. Forty-seven dormant high-balance customers.', profile: 'narrator' } },
      { id: 'in-m1-2', fromActor: 'insider', toActor: 'insider', kind: 'system', label: 'Mrs. Chambers · J$3.2M · no online banking 4+ yrs · ideal target',
        audio: { text: 'Janelle Chambers. Three point two million. Perfect target.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Access reconnaissance */
  {
    id: 'in-stage-2',
    label: 'Access reconnaissance',
    title: 'Devon pulls Janelle\'s full account profile',
    caption: 'Devon opens Janelle\'s customer record from his branch terminal — a routine action that any Personal Banker can perform on any customer of the branch (the system does not restrict by assigned-banker relationship). He reviews her account history, contact details, registered phone (a flip phone, no SMS app, no smartphone), next-of-kin information, and signature card. He notes that her assigned banker is a different employee (Mrs. Patterson, who sees Janelle in person twice a year for her fixed-deposit rollover). He also notes that JNCB does not enforce two-employee approval on account modifications under J$500K — he can do everything within his own login as long as he stays under that ceiling per transaction.',
    durationMs: 7000,
    messages: [
      { id: 'in-m2-1', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: 'Open customer record · Mrs. Chambers · routine action' },
      { id: 'in-m2-2', fromActor: 'jncb', toActor: 'insider', kind: 'http', label: 'Full profile returned · contact, signature, account history' },
      { id: 'in-m2-3', fromActor: 'insider', toActor: 'insider', kind: 'system', label: 'Notes: flip phone · assigned banker is Mrs. Patterson · J$500K threshold',
        audio: { text: 'Flip phone. Different assigned banker. Five hundred thousand threshold.', profile: 'fraudster' } },
    ],
    actorStateChanges: { 'jncb': 'active' },
    revealedSignalIds: [],
  },

  /* Stage 3 — The structured drain begins */
  {
    id: 'in-stage-3',
    label: 'Drain begins',
    title: 'Week 1 — first transfer of J$420K',
    caption: 'Devon initiates the first transfer from Janelle\'s account: J$420K to a recipient account he has labeled "JNCB Maintenance Services Account" in the transaction notes. The recipient is actually his cousin\'s personal JNCB account (no relationship Devon must declare under JNCB\'s conflict-of-interest policy because the cousin is two degrees removed). The transfer clears immediately under Devon\'s login — no supervisor approval required because J$420K is under the J$500K threshold. JNCB\'s audit log shows: transaction initiated by employee D. WALTERS, customer J. CHAMBERS, amount J$420,000, timestamp Tuesday 3:47 PM, recipient account redacted in summary view (full details visible only on click-through). This audit log entry looks identical to legitimate teller-assisted operations Devon performs dozens of times per week.',
    durationMs: 8000,
    messages: [
      { id: 'in-m3-1', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: 'Transfer J$420K · Janelle\'s account → cousin\'s account', suspicious: true,
        audio: { text: 'Four hundred twenty thousand. Under the threshold. No approval needed.', profile: 'fraudster' } },
      { id: 'in-m3-2', fromActor: 'jncb', toActor: 'mule', kind: 'http', label: 'J$420K credited · cousin account · cleared 3:47 PM Tuesday' },
      { id: 'in-m3-3', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Audit log · indistinguishable from legitimate teller op', suspicious: true },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: ['sig-access-frequency-anomaly'],
  },

  /* Stage 4 — Pattern emerges */
  {
    id: 'in-stage-4',
    label: 'Pattern emerges',
    title: 'Weeks 2-3 — six more transfers, total J$2.8M',
    caption: 'Over the next 17 days Devon initiates six more transfers from Janelle\'s account: J$380K, J$450K, J$310K, J$490K, J$470K, J$280K. All under the J$500K supervisor-approval threshold. All from his own login. All to two recipient accounts (the cousin\'s account and a personal credit card belonging to Devon\'s sister-in-law). Cumulative drain: J$2.8M from Janelle\'s account in 3 weeks. Branch baseline: a Personal Banker performs ~12 high-value transactions per week. Devon performs 19, 22, 18 — peer-comparison flags this as the 91st percentile. JNCB\'s behavioral analytics system, if active, would flag the pattern at week 2. JNCB does not have the system active in this scenario; the risk-officer team purchased the software 18 months ago and has not yet completed the integration.',
    durationMs: 9000,
    messages: [
      { id: 'in-m4-1', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: 'Transfer J$380K · cousin · Wed week 2', suspicious: true },
      { id: 'in-m4-2', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: 'Transfer J$450K · sister-in-law · Mon week 2', suspicious: true },
      { id: 'in-m4-3', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: '4 more transfers across week 2-3 · cumulative J$2.8M', suspicious: true,
        audio: { text: 'Two point eight million in three weeks. No alerts. Behavioral analytics offline.', profile: 'narrator' } },
    ],
    revealedSignalIds: ['sig-target-victim-profile', 'sig-no-supervisor-approval'],
  },

  /* Stage 5 — The final transfer */
  {
    id: 'in-stage-5',
    label: 'Final drain',
    title: 'Week 4 — J$400K cleans out the account',
    caption: 'Week 4. Devon initiates the seventh and final transfer: J$400K, leaving Janelle\'s account with the J$8K minimum balance to keep it open and avoid the dormant-account-closure flag that would auto-trigger an outreach call to her. Total drain: J$3.2M across 7 transfers in 28 days. Each transfer below J$500K (no supervisor approval). Each transfer below J$1M (no mandatory customer callback). The structured drain pattern is precisely calibrated to JNCB\'s ceiling-based controls. Janelle\'s account looks normal in the bank\'s standard reports — a small balance, infrequent activity, exactly what a 67-year-old retiree\'s account "should" look like. Devon goes home Friday night J$3.2M ahead.',
    durationMs: 8000,
    messages: [
      { id: 'in-m5-1', fromActor: 'insider', toActor: 'jncb', kind: 'http', label: 'Transfer J$400K · final · leaves J$8K minimum', suspicious: true,
        audio: { text: 'Four hundred thousand. Leaves the minimum. Account looks normal.', profile: 'fraudster' } },
      { id: 'in-m5-2', fromActor: 'jncb', toActor: 'janelle', kind: 'sms', label: '(no callback fired — no transaction crossed J$1M)', tooltip: 'Ceiling-based control defeated by structuring', suspicious: true },
    ],
    revealedSignalIds: ['sig-no-customer-callback'],
  },

  /* Stage 6 — Internal Audit catches it */
  {
    id: 'in-stage-6',
    label: 'Internal Audit',
    title: 'Quarterly review surfaces the access-pattern anomaly',
    caption: 'Two months later. JNCB Internal Audit runs its quarterly access-pattern review across all branches. The review compares each employee\'s customer-record-access count against the branch peer mean for accounts they are not the assigned banker for. Devon\'s ratio is 4.1x — well into the "investigate" zone. Internal Audit pulls his recent transaction history. Seven transfers from Mrs. J. Chambers\'s account, all just under the supervisor-approval threshold, all to two recipient accounts. Cross-references the recipients: one is Devon\'s maternal cousin (declared next-of-kin field on the cousin\'s account), one is Devon\'s sister-in-law\'s personal credit card (resolved via the credit card\'s billing-address match to Devon\'s sister-in-law\'s declared address on her own JNCB account). Internal Audit escalates to the Chief Risk Officer. JNCB freezes Devon\'s access at 11:47 AM Wednesday.',
    durationMs: 10000,
    messages: [
      { id: 'in-m6-1', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Quarterly access-pattern review · Devon flagged · 4.1x peer mean',
        audio: { text: 'Quarterly review. Devon Walters. Four times peer average.', profile: 'investigator' } },
      { id: 'in-m6-2', fromActor: 'jncb', toActor: 'jncb', kind: 'system', label: 'Cross-reference recipients · cousin · sister-in-law' },
      { id: 'in-m6-3', fromActor: 'jncb', toActor: 'insider', kind: 'system', label: 'Access frozen · 11:47 AM Wednesday', suspicious: true },
    ],
    revealedSignalIds: ['sig-recipient-relationship'],
  },

  /* Stage 7 — Discovery and aftermath */
  {
    id: 'in-stage-7',
    label: 'Aftermath',
    title: 'Janelle finds out at her fixed-deposit rollover meeting',
    caption: 'Three months after the drain, Janelle visits the Half-Way Tree branch for her annual fixed-deposit rollover meeting with Mrs. Patterson, her assigned banker. Mrs. Patterson opens her account: balance J$8,000. Mrs. Patterson assumes a system error, calls IT — and Internal Audit calls back to explain the situation. Janelle is told that a JNCB employee (Devon Walters, no longer with the bank) drained her account through unauthorized transfers two months prior. JNCB recovers J$1.4M from the recipient accounts before the rest is dispersed. Janelle is reimbursed the full J$3.2M under JNCB\'s employee-fraud customer-protection policy. Devon is convicted in 2026 and sentenced to 4 years. The case prompts JNCB to accelerate the behavioral-analytics integration that had been deferred for 18 months.',
    durationMs: 16000,
    messages: [
      { id: 'in-m7-1', fromActor: 'janelle', toActor: 'jncb', kind: 'callback', label: '"My fixed deposit was J$3.2M. Why is the balance J$8K?"', tooltip: 'Annual rollover meeting · 3 months after drain',
        audio: { text: 'My fixed deposit was three point two million. Why is the balance eight thousand?', profile: 'victim' } },
      { id: 'in-m7-2', fromActor: 'jncb', toActor: 'janelle', kind: 'callback', label: '"A JNCB employee drained the account. We are reimbursing you."',
        audio: { text: 'A JNCB employee drained the account. We are reimbursing you in full.', profile: 'investigator' } },
      { id: 'in-m7-3', fromActor: 'janelle', toActor: 'jncb', kind: 'callback', label: '"Why did no one tell me when it was happening?"',
        audio: { text: 'Why did no one tell me when it was happening?', profile: 'victim' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'Janelle is reimbursed because JNCB\'s employee-fraud policy covers her loss. Other Caribbean banks have similar policies; not all do, and reimbursement is not guaranteed when the customer is unaware for months. The institutional fix is engineering, not policy: behavioral analytics on access patterns must be deployed and active (not "purchased and integration deferred"); segregation of duties must be enforced by system, not policy; cumulative-period transfer controls must replace ceiling-based controls (structuring defeats ceilings, not cumulative periods); and customer callbacks should be on cumulative-period thresholds, not per-transaction thresholds. Insider access abuse is the most expensive technique per incident in Caribbean banking precisely because the controls that catch it require ongoing engineering investment, not pre-employment paperwork. Banks that defer the engineering work inherit the loss exposure.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const INSIDER_META = {
  techId: 'F1072',
  techName: 'Insider Access Abuse',
  tacticId: 'TA0001',
  tacticName: 'Initial Access',
  scenario: 'SC-devon-walters-jncb-insider',
  scenarioContext: 'Mr. Devon Walters, JNCB Personal Banker at Half-Way Tree branch, age 38, 6 years tenure. Trusted by colleagues, has authorized read access to customer accounts for service operations. Targets Mrs. Janelle Chambers, a 67-year-old retired civil servant whose pension goes to JNCB and who never logs in online — perfect victim profile because the customer cannot detect unauthorized access from the customer side. Drains J$3.2M across 7 structured transfers in 28 days, each transfer calibrated below the J$500K supervisor-approval threshold AND below the J$1M customer-callback threshold. Caught by quarterly Internal Audit access-pattern review at the 4.1x-peer-mean access frequency. Composite case grounded in Jamaica J$61M SIM-swap conviction (October 2025, two telco CSRs convicted as accomplices) reframed for the bank-insider standalone framing F1072 specifically addresses, plus BOJ 2024-2025 internet-banking fraud reporting on the disproportionate-value-per-incident pattern of insider abuse. Distinct character role from Allison Brown (mule SC007), Marcia Edwards (Structuring vendor F1087), Trevor Bennett (Structurer F1087), Beverly Williams (Phishing F1081), Devon Henry (Vishing F1088 — first name reuse intentional, role disambiguates), Tanya Ricketts (SIM Swap T1451), Andre Lewis (Password Reset F1018.001), Pat Henriques (MFA Fatigue T1621), and Marcus Walters (3DS Bypass F1076 deferred — surname reuse intentional, role disambiguates).',
  totalDurationMs: 65000,
  stageCount: 7,
}


export default {
  meta: INSIDER_META,
  engine: 'multi-actor-sequence',
  stages: INSIDER_STAGES,
  controls: INSIDER_CONTROLS,
  signals: INSIDER_SIGNALS,
  actors: INSIDER_ACTORS,
}
