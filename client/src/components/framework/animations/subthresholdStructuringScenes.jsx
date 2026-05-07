/**
 * subthresholdStructuringScenes.jsx — v25.7.0.11
 *
 * Scene data for the sub-threshold structuring technique animation.
 * First consumer of the TimelineThresholdAnimation engine.
 *
 * F-code: PLACEHOLDER (F1XXX) — to be resolved from live F3 framework
 * by Omar before deploy. Sub-threshold structuring lives in
 * TA0005 Defense Evasion in F3. Resolve by querying:
 *   GET /api/framework/tactics/TA0005/techniques-tree
 * and finding the structuring technique's actual F-code, then update
 * ANIMATION_MAP in TechniqueDetailSidebar.jsx.
 *
 * Pedagogical insight (locked):
 *   Structuring is invisible because no single transaction looks
 *   wrong. Every individual deposit is below the J$1M POCA Section
 *   101A threshold. Every individual deposit may match patterns of
 *   legitimate cash-heavy customers. The pattern only exists if you
 *   look ACROSS time, ACROSS channels, and AGAINST the customer's
 *   established behavioral baseline. A compliance analyst's actual
 *   job isn't transaction-by-transaction review — it's pattern
 *   recognition across time and across customer baselines.
 *
 * Caribbean grounding:
 *   - Both accounts at NCB Jamaica (apples-to-apples within one
 *     institution's monitoring system)
 *   - JMD currency throughout
 *   - Mrs. Marcia Edwards — Mandeville Market vendor, real Jamaican
 *     informal-economy banking pattern (small business through
 *     personal account, common across the region)
 *   - "Trevor Bennett" — structurer operating account in Half-Way Tree
 *   - Regulatory framework: POCA Section 101A (J$1M cash transaction
 *     limit), POCA (MLP) Regulations 2007 for TTR thresholds and
 *     timing, Financial Investigations Division (FID) as Designated
 *     Authority, goAML platform for filings
 *
 * Editorial principle (Omar's instruction, locked v25.7.0.11):
 *   Real-world training that prepares Caribbean bank staff for what
 *   they will actually face. Not sheltered, not theoretical. The
 *   patterns shown in this animation are the patterns documented in
 *   public Jamaica AML guidance, CFATF mutual evaluations, and
 *   Tookitaki/Abrigo compliance literature. Compliance staff need
 *   them to do their jobs.
 */

// import { motion } from 'framer-motion'  // not needed at scene-data level


/* ─────────────────────────────────────────────────────────────────────
   The two characters

   Marcia: legitimate cash-heavy small business. Pattern is RECOGNIZABLE
   as legitimate when you consider account history, channel preference,
   timing alignment with documented occupation, and source-of-funds
   documentation.

   Trevor: structuring pattern. Pattern is RECOGNIZABLE when you
   consider the threshold-hugging amounts, channel fragmentation,
   account-from-day-one absence of organic history, no documented
   source. ALSO — and this is the editorial point — Trevor's pattern
   isn't impossibly obvious. Real structurers are sometimes more
   sophisticated than this. The animation's job is to teach the
   recognition skill, not to imply all structurers will be this clean
   to spot.
   ───────────────────────────────────────────────────────────────────── */

// Mrs. Marcia Edwards — Mandeville Market vendor. 4-year customer.
// Cash-heavy because produce vending IS cash. Deposits cluster around
// market days (Tuesdays + Fridays) which means Wed/Sat banking. Amounts
// vary widely with sales volume. Mostly branch deposits because
// older customer who doesn't trust ATMs for cash. Tax-registered as a
// vendor, has provided receipts when bank asked.
const MARCIA_TXS = [
  // Week 1
  { id: 'm-w1-1', week: 1, day: 3, amountJMD: 312_000, channel: 'branch', source: 'documented', dayOfWeek: 'Wed' },
  { id: 'm-w1-2', week: 1, day: 6, amountJMD: 480_000, channel: 'branch', source: 'documented', dayOfWeek: 'Sat' },
  // Week 2
  { id: 'm-w2-1', week: 2, day: 3, amountJMD: 178_000, channel: 'branch', source: 'documented' },
  { id: 'm-w2-2', week: 2, day: 6, amountJMD: 520_000, channel: 'branch', source: 'documented' },
  // Week 3 — slow week (rain affected market)
  { id: 'm-w3-1', week: 3, day: 6, amountJMD: 145_000, channel: 'branch', source: 'documented' },
  // Week 4
  { id: 'm-w4-1', week: 4, day: 3, amountJMD: 285_000, channel: 'branch', source: 'documented' },
  { id: 'm-w4-2', week: 4, day: 6, amountJMD: 410_000, channel: 'mobile', source: 'documented' }, // occasional mobile
  // Week 5 — strong week
  { id: 'm-w5-1', week: 5, day: 3, amountJMD: 622_000, channel: 'branch', source: 'documented' },
  { id: 'm-w5-2', week: 5, day: 6, amountJMD: 715_000, channel: 'branch', source: 'documented' },
  // Week 6
  { id: 'm-w6-1', week: 6, day: 3, amountJMD: 198_000, channel: 'branch', source: 'documented' },
  { id: 'm-w6-2', week: 6, day: 6, amountJMD: 540_000, channel: 'branch', source: 'documented' },
  // Week 7
  { id: 'm-w7-1', week: 7, day: 3, amountJMD: 350_000, channel: 'branch', source: 'documented' },
  { id: 'm-w7-2', week: 7, day: 6, amountJMD: 425_000, channel: 'branch', source: 'documented' },
  // Week 8 — Easter week, big sales
  { id: 'm-w8-1', week: 8, day: 3, amountJMD: 720_000, channel: 'branch', source: 'documented' },
  { id: 'm-w8-2', week: 8, day: 6, amountJMD: 685_000, channel: 'branch', source: 'documented' },
  // Week 9 — quiet
  { id: 'm-w9-1', week: 9, day: 3, amountJMD: 122_000, channel: 'branch', source: 'documented' },
  { id: 'm-w9-2', week: 9, day: 6, amountJMD: 240_000, channel: 'branch', source: 'documented' },
  // Week 10
  { id: 'm-w10-1', week: 10, day: 3, amountJMD: 380_000, channel: 'branch', source: 'documented' },
  { id: 'm-w10-2', week: 10, day: 6, amountJMD: 590_000, channel: 'branch', source: 'documented' },
  // Week 11
  { id: 'm-w11-1', week: 11, day: 3, amountJMD: 215_000, channel: 'branch', source: 'documented' },
  { id: 'm-w11-2', week: 11, day: 6, amountJMD: 488_000, channel: 'branch', source: 'documented' },
  // Week 12
  { id: 'm-w12-1', week: 12, day: 3, amountJMD: 305_000, channel: 'branch', source: 'documented' },
  { id: 'm-w12-2', week: 12, day: 6, amountJMD: 445_000, channel: 'branch', source: 'documented' },
]

// "Trevor Bennett" — 3-month-old account. Sub-threshold deposits
// from week one onward. Amounts cluster J$700K-950K, hugging J$1M
// threshold from below. Channel mix deliberately fragmented across
// branch/ATM/mobile. Source-of-funds explanations vary, none have
// supporting documentation. No documented occupation. No legitimate
// cash-flow profile to anchor against.
const TREVOR_TXS = [
  // Week 1 (account opened)
  { id: 't-w1-1', week: 1, day: 1, amountJMD: 850_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w1-2', week: 1, day: 4, amountJMD: 920_000, channel: 'atm', source: 'undocumented' },
  // Week 2
  { id: 't-w2-1', week: 2, day: 1, amountJMD: 780_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w2-2', week: 2, day: 2, amountJMD: 875_000, channel: 'mobile', source: 'undocumented' },
  { id: 't-w2-3', week: 2, day: 3, amountJMD: 890_000, channel: 'atm', source: 'undocumented' },
  // Week 3
  { id: 't-w3-1', week: 3, day: 1, amountJMD: 920_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w3-2', week: 3, day: 3, amountJMD: 800_000, channel: 'mobile', source: 'undocumented' },
  // Week 4
  { id: 't-w4-1', week: 4, day: 1, amountJMD: 950_000, channel: 'atm', source: 'undocumented' },
  { id: 't-w4-2', week: 4, day: 2, amountJMD: 770_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w4-3', week: 4, day: 4, amountJMD: 890_000, channel: 'mobile', source: 'undocumented' },
  // Week 5
  { id: 't-w5-1', week: 5, day: 1, amountJMD: 825_000, channel: 'atm', source: 'undocumented' },
  { id: 't-w5-2', week: 5, day: 3, amountJMD: 940_000, channel: 'branch', source: 'partial' },
  // Week 6
  { id: 't-w6-1', week: 6, day: 1, amountJMD: 880_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w6-2', week: 6, day: 2, amountJMD: 910_000, channel: 'mobile', source: 'undocumented' },
  // Week 7
  { id: 't-w7-1', week: 7, day: 1, amountJMD: 765_000, channel: 'atm', source: 'undocumented' },
  { id: 't-w7-2', week: 7, day: 3, amountJMD: 935_000, channel: 'branch', source: 'partial' },
  // Week 8
  { id: 't-w8-1', week: 8, day: 1, amountJMD: 870_000, channel: 'mobile', source: 'undocumented' },
  { id: 't-w8-2', week: 8, day: 2, amountJMD: 895_000, channel: 'atm', source: 'undocumented' },
  { id: 't-w8-3', week: 8, day: 3, amountJMD: 820_000, channel: 'branch', source: 'undocumented' },
  // Week 9
  { id: 't-w9-1', week: 9, day: 1, amountJMD: 920_000, channel: 'atm', source: 'undocumented' },
  { id: 't-w9-2', week: 9, day: 4, amountJMD: 880_000, channel: 'mobile', source: 'undocumented' },
  // Week 10
  { id: 't-w10-1', week: 10, day: 1, amountJMD: 945_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w10-2', week: 10, day: 3, amountJMD: 855_000, channel: 'atm', source: 'undocumented' },
  // Week 11
  { id: 't-w11-1', week: 11, day: 1, amountJMD: 800_000, channel: 'mobile', source: 'undocumented' },
  { id: 't-w11-2', week: 11, day: 2, amountJMD: 925_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w11-3', week: 11, day: 3, amountJMD: 875_000, channel: 'atm', source: 'undocumented' },
  // Week 12
  { id: 't-w12-1', week: 12, day: 1, amountJMD: 890_000, channel: 'branch', source: 'undocumented' },
  { id: 't-w12-2', week: 12, day: 3, amountJMD: 940_000, channel: 'mobile', source: 'undocumented' },
]


export const STRUCTURING_CHARACTERS = [
  {
    id: 'marcia',
    name: 'Mrs. Marcia Edwards',
    descriptor: 'Mandeville market vendor · NCB customer 4 years',
    account: 'NCB Savings ··6741',
    flagReason: 'Multiple sub-threshold deposits this week',
    accountAgeWeeks: 208,  // ~4 years
    declaredOccupation: 'Self-employed produce vendor',
    declaredOccupationVerified: true,  // tax registration on file
    transactions: MARCIA_TXS,
    baselineSummary: '4-year history; deposits track Mandeville Market schedule; varied amounts reflect actual sales volume; mostly branch deposits; tax registration on file; provides receipts when asked',
  },
  {
    id: 'trevor',
    name: 'Trevor Bennett',
    descriptor: 'Half-Way Tree address · NCB customer 3 months',
    account: 'NCB Savings ··2089',
    flagReason: 'Multiple sub-threshold deposits this week',
    accountAgeWeeks: 12,
    declaredOccupation: '"Self-employed consultant" (no detail provided at onboarding)',
    declaredOccupationVerified: false,
    transactions: TREVOR_TXS,
    baselineSummary: '3-month-old account; sub-threshold deposit pattern from week 1; channel mix fragmented; no documented source for any deposit; declared occupation generic and unverified; no organic transaction history to reference',
  },
]


/* ─── Detection controls (4 real + 1 naive) ──────────────────────── */
export const STRUCTURING_CONTROLS = [
  {
    id: 'ctrl-aggregation',
    label: 'Aggregation across channels',
    meta: 'Detects when a customer\'s deposits across all channels (branch + ATM + mobile) sum above threshold over a rolling window. Catches the channel-fragmentation pattern.',
    naive: false,
    revealsAtStages: [3, 5],
    catchCount: 1,
    catchTotal: 2,
    catchUnit: 'patterns flagged',
  },
  {
    id: 'ctrl-baseline-deviation',
    label: 'Behavioral baseline deviation',
    meta: 'Compares current deposit pattern (frequency, amount distribution, channel mix) against customer\'s established baseline. Marcia has a 4-year baseline; Trevor has none.',
    naive: false,
    revealsAtStages: [2, 4, 5],
    catchCount: 1,
    catchTotal: 2,
    catchUnit: 'patterns flagged',
  },
  {
    id: 'ctrl-cdd-currency',
    label: 'CDD currency vs. transaction reality',
    meta: 'Compares Customer Due Diligence profile (declared occupation, expected transaction volumes) against actual activity. Marcia\'s vendor declaration matches; Trevor\'s "consultant" generic declaration does not match cash-only deposit pattern.',
    naive: false,
    revealsAtStages: [4, 5],
    catchCount: 1,
    catchTotal: 2,
    catchUnit: 'CDD mismatches',
  },
  {
    id: 'ctrl-peer-group',
    label: 'Peer-group analysis',
    meta: 'Compares customer against similar accounts (same age cohort, same declared profile). Trevor\'s pattern is anomalous even among other 3-month-old NCB accounts.',
    naive: false,
    revealsAtStages: [5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'peer-group anomalies',
  },
  {
    id: 'ctrl-naive-block-subthreshold',
    label: 'Block all sub-threshold cash deposits',
    meta: 'Doesn\'t work and isn\'t legal. Banks cannot refuse legitimate banking services. Most sub-threshold cash deposits are entirely legitimate (Mrs. Edwards\'s market sales, taxi operators, hairdressers, salaried workers cashing checks). The answer to detecting structuring is monitoring sophistication, not service denial — denying service to cash-economy customers harms the legitimate majority and doesn\'t catch the sophisticated minority.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'patterns',
    naiveCallout: 'Would block Mrs. Edwards\'s legitimate vendor deposits AND fail to catch sophisticated structurers who would adjust amounts above threshold or move to other institutions',
  },
]


/* ─── Hidden signals catalog ──────────────────────────────────────── */
export const STRUCTURING_SIGNALS = [
  {
    id: 'sig-no-baseline',
    label: 'No organic baseline',
    description: 'Trevor\'s account is 3 months old and shows the sub-threshold deposit pattern from week 1. No legitimate customer establishes that pattern from day one — organic small-business banking begins with smaller, varied deposits as the customer learns the relationship.',
    revealedBy: 'ctrl-baseline-deviation',
  },
  {
    id: 'sig-marcia-baseline-match',
    label: 'Marcia\'s pattern matches her 4-year baseline',
    description: 'Marcia\'s deposit amounts vary widely (J$120K-720K) and track Mandeville Market schedule. Her current activity is consistent with 4 years of seasonal variation. Baseline-deviation does NOT flag her — which is correct.',
    revealedBy: 'ctrl-baseline-deviation',
  },
  {
    id: 'sig-channel-fragmentation',
    label: 'Channel fragmentation across same customer',
    description: 'Trevor\'s deposits split deliberately across branch/ATM/mobile within the same week. This pattern fragments the audit trail per channel — each channel\'s monitoring sees an incomplete picture. Aggregation across channels reveals that his weekly cumulative deposits exceed J$2M consistently.',
    revealedBy: 'ctrl-aggregation',
  },
  {
    id: 'sig-cdd-occupation-mismatch',
    label: 'CDD occupation declaration vs. actual cash flow',
    description: 'Trevor declared "self-employed consultant" at account opening with no further detail. Consultants typically receive bank transfers or check payments, not large cash deposits multiple times per week. The CDD declaration and the actual transaction pattern do not reconcile.',
    revealedBy: 'ctrl-cdd-currency',
  },
  {
    id: 'sig-peer-group-anomaly',
    label: 'Anomalous within new-account peer group',
    description: 'Among other 3-month-old NCB accounts of similarly-declared "consultants," Trevor\'s sub-threshold cash deposit volume (J$2.4M+ weekly average) is in the 99th percentile. Peer-group analysis surfaces this without requiring any other signal.',
    revealedBy: 'ctrl-peer-group',
  },
]


/* ─── The 5 stages ────────────────────────────────────────────────── */
export const STRUCTURING_STAGES = [

  /* ─── Stage 1: Two cases flagged ──────────────────────────────── */
  {
    id: 'sf-stage-1',
    label: 'Two cases flagged',
    title: 'Compliance review queue · this morning',
    caption: "Two NCB accounts have been flagged for sub-threshold cash deposit activity this week. As the AML analyst, your job is to determine which (if either) requires a Suspicious Transaction Report under POCA. Both look similar at a transaction-by-transaction glance. Look deeper.",
    durationMs: 5000,
    viewMode: 'queue',
    revealedSignalIds: [],
  },

  /* ─── Stage 2: Time view ───────────────────────────────────── */
  {
    id: 'sf-stage-2',
    label: 'Time view',
    title: 'Deposits over 12 weeks — what do the patterns look like?',
    caption: "Plot every deposit on a time × amount grid. Threshold line at J$1M (POCA Section 101A). Marcia's deposits vary widely and track market days; Trevor's hug the threshold from below, twice per week, every week, from the day his account opened. The visual contrast: legitimate cash flow is varied and externally driven; structuring is uniformly close-to-threshold and self-driven.",
    durationMs: 9000,
    viewMode: 'time',
    revealedSignalIds: ['sig-no-baseline', 'sig-marcia-baseline-match'],
  },

  /* ─── Stage 3: Channel view ─────────────────────────────────── */
  {
    id: 'sf-stage-3',
    label: 'Channel view',
    title: 'Same data, recolored by deposit channel',
    caption: "Marcia uses branch teller for 90% of deposits — consistent with her demographic and her 4-year banking relationship. Trevor's deposits split deliberately across branch + ATM + mobile, often within the same week. Channel fragmentation is a signal: it suggests intent to avoid concentrating activity where any single channel's monitoring would aggregate it.",
    durationMs: 7000,
    viewMode: 'channel',
    revealedSignalIds: ['sig-channel-fragmentation'],
  },

  /* ─── Stage 4: Source-of-funds + account-history view ────── */
  {
    id: 'sf-stage-4',
    label: 'Source + history view',
    title: 'Customer Due Diligence: declared profile vs. actual activity',
    caption: "Marcia: tax registration as produce vendor, 4-year account history, deposit pattern tracks documented occupation. Trevor: declared 'self-employed consultant' at onboarding with no detail, 3-month account history, deposit pattern (multiple weekly cash deposits) does not match how consultants typically receive payment. The CDD mismatch is the strongest single signal.",
    durationMs: 7000,
    viewMode: 'source',
    revealedSignalIds: ['sig-no-baseline', 'sig-cdd-occupation-mismatch'],
  },

  /* ─── Stage 5: Decision + reporting framework ─────────────── */
  {
    id: 'sf-stage-5',
    label: 'Decision + reporting',
    title: 'The analyst\'s call · what POCA requires',
    caption: "Now the decision. Marcia: monitor, no SAR — pattern is consistent with documented baseline. Trevor: file Suspicious Transaction Report under POCA, recommend Enhanced Due Diligence, watch for the J$1M cumulative threshold to trigger Threshold Transaction Report. Filing within 15 days is required by POCA. Failure to report a justified suspicion is itself an offence.",
    durationMs: 8000,
    viewMode: 'decision',
    revealedSignalIds: ['sig-channel-fragmentation', 'sig-cdd-occupation-mismatch', 'sig-peer-group-anomaly'],
    decision: {
      perCharacter: [
        {
          characterId: 'marcia',
          verdict: 'monitor',
          verdictLabel: 'Monitor · no SAR',
          rationale: 'Pattern consistent with 4-year baseline. Documented occupation, channel preference, and amount variability all match legitimate cash-economy small business. Continue monitoring; no current basis for SAR.',
        },
        {
          characterId: 'trevor',
          verdict: 'sar',
          verdictLabel: 'Submit SAR',
          rationale: 'Multiple structuring indicators: threshold-hugging amounts, channel fragmentation, CDD mismatch (declared "consultant" vs. cash-only multi-weekly pattern), no documented source-of-funds, no organic account history. Reasonable suspicion under POCA; SAR within 15 days. Recommend EDD and watch for cumulative breach of J$1M Section 101A threshold.',
        },
      ],
      regulatoryNotes: [
        { label: 'POCA Section 101A', text: 'Cash transaction limit: J$1,000,000 (or equivalent) — above which only "permitted persons" may conduct transactions. Trevor\'s cumulative weekly deposits are designed to stay below; this is the structuring pattern.' },
        { label: 'POCA (MLP) 2007', text: 'Threshold Transaction Reports (TTRs) filed quarterly with FID for transactions at/above the prescribed threshold. Suspicious Transaction Reports (STRs/SARs) filed within 15 days of the suspicion arising.' },
        { label: 'FID role', text: 'The Financial Investigations Division is the Designated Authority. Reports submitted via the goAML platform. The FID analyzes and disseminates to JCF/MOCA where prosecution is warranted.' },
        { label: 'Failure to report', text: 'Failure to file a SAR where suspicion is reasonably held is itself an offence under POCA. Both the institution and the Nominated Officer can be liable.' },
      ],
    },
    finalHeadline: "The pattern wasn't visible in any single transaction. Trevor's account had been operating for 12 weeks; the structuring activity had been there from week 1; no individual deposit looked wrong. The pattern was visible only when you looked across time, across channels, and against what the customer SAID they were when they opened the account. That is the actual job.",
  },
]


/* ─── Animation metadata ──────────────────────────────────────────── */
export const STRUCTURING_META = {
  techId: 'F1XXX',  // PLACEHOLDER — Omar to resolve from live framework
  techName: 'Sub-threshold structuring',
  tacticId: 'TA0005',
  tacticName: 'Defense Evasion',
  scenario: 'SC-marcia-vs-trevor-structuring-case-review',
  scenarioContext: 'Two NCB Jamaica accounts flagged for compliance review. Trainee plays the AML analyst. The animation teaches the actual analyst job: pattern recognition across time, channels, and customer baseline. Mrs. Marcia Edwards (Mandeville market vendor, legitimate) and Trevor Bennett (Half-Way Tree, structurer) presented side-by-side. Distinct from Allison Brown (SC007 mule, complicit) and Marcus Walters (3DS Bypass victim, innocent) — Marcia is a legitimate Jamaican small-business depositor, Trevor is a structurer operating an account.',
  totalDurationMs: 36000,
  stageCount: 5,
}


export default {
  meta: STRUCTURING_META,
  engine: 'timeline-threshold',
  stages: STRUCTURING_STAGES,
  controls: STRUCTURING_CONTROLS,
  signals: STRUCTURING_SIGNALS,
  characters: STRUCTURING_CHARACTERS,
  thresholdAmount: 1_000_000,
  thresholdLabel: 'POCA Section 101A',
  currency: 'JMD',
  weekRange: { start: 1, end: 12 },
}
