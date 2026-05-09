/**
 * cardDumpCaptureScenes.jsx — v25.7.0.30
 *
 * Scene data for Card Dump Capture (F1042) — third Phase 2
 * Positioning (FA0001) animation. Uses MultiActorSequenceAnimation
 * engine.
 *
 * F1042 is the breach side of the card-data supply chain. Where
 * F1043 Card Testing (v25.7.0.28, Anthony Spencer · Sagicor)
 * shows what happens AFTER stolen card numbers reach the
 * fraudster — validation-by-small-charge to separate live from
 * dead cards before resale or fraud — F1042 shows where those
 * card numbers come from. The "1,847-card lot from January 2026
 * retailer breach" referenced in the F1043 scenario originates
 * here.
 *
 * The pedagogical bridge between F1042 → F1043 → Execution is
 * the entire teaching arc of the card-data supply chain. F1042
 * is the merchant-side compromise: a small Caribbean e-commerce
 * retailer running an outdated commerce platform with a known
 * vulnerability gets a Magecart-style web skimmer planted in
 * the checkout flow. For the next 47 days every checkout silently
 * exfiltrates card data to attacker C2. The merchant's normal
 * operations continue undisturbed; the merchant has no detection
 * channel for what is happening, because the website renders
 * normally, the orders process normally, the customer experience
 * is unchanged. The data is being stolen at the layer between
 * "card entered into form" and "card sent to payment processor."
 *
 * F1042 fits the Positioning tactic because it is preparation:
 * the captured card data is not monetized at capture time, it is
 * accumulated and sold downstream. The breach itself extracts
 * no value; it produces the inputs for later F1043 testing and
 * eventual Execution. The merchant is positioning the attacker's
 * future fraud capacity, unwittingly, by acting as an unsupervised
 * card-data collection point.
 *
 * Composite case grounded in:
 * - Caribbean e-commerce breach reporting (publicly disclosed JM,
 *   TT, BB retailer compromises 2022-2025) following the Magecart
 *   pattern: web-skimmer JavaScript injected into checkout pages,
 *   data exfiltrated to attacker-controlled domains, breach
 *   detected weeks-to-months later when card brands trace back
 *   fraud reports to a common point of compromise (CPP)
 * - Visa, Mastercard, and Aite-Novarica reporting on Caribbean
 *   acquirer-side breach patterns, particularly e-commerce
 *   merchants running legacy WooCommerce / Magento / OpenCart
 *   with outdated checkout-flow plugins
 * - PCI Council documentation on the gap between PCI-DSS scope
 *   (which merchants who store card data must comply with) and
 *   merchants who pretend not to store card data while their
 *   vulnerable platforms accumulate it through plugin behaviour
 * - Card brand "common point of compromise" investigation
 *   methodology — the forensic technique of clustering fraud
 *   reports back to merchants where every defrauded card
 *   transacted, identifying the breached merchant from
 *   downstream fraud patterns weeks after the breach itself
 *
 * Scenario character: Mr. Damian Roberts, age 42, owner of
 * IslandShop — a Bridgetown, Barbados e-commerce retailer
 * (electronics + fashion + home goods) that he has run for
 * 8 years. Republic Bank Barbados business banking customer.
 * Runs WooCommerce on a self-managed VPS with a payment
 * integration plugin he installed 4 years ago and has never
 * updated. Stores card-on-file for repeat customers (against
 * PCI guidance) via the plugin's "remember card" feature.
 * Total customer card-on-file records at scenario open: ~3,200,
 * including approximately 1,847 cards from the period of the
 * upcoming breach.
 *
 * Republic Bank Barbados is the second Republic Bank scenario
 * in the corpus (after Tariq Mohammed · Republic Bank Trinidad
 * F1007.002 v25.7.0.29.1) — extending the institution's
 * regional footprint coverage beyond the Trinidad scenario.
 * First Bridgetown / Barbadian-set scenario in animations.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell, Karen Ferguson,
 * Anthony Spencer, Renee Patterson, Tariq Mohammed, Marlon
 * Grant). First-name and surname both new to the roster.
 *
 * Pedagogical insight (locked v25.7.0.30):
 *   The merchant is the entry point to the customer's bank
 *   account. Customers cannot audit a merchant's PCI compliance
 *   before checking out; issuer banks cannot audit every merchant
 *   their customers transact at; the merchant themselves often
 *   has no operational visibility into their own checkout
 *   flow's runtime behaviour. The defence does not live with
 *   the customer (who has no leverage), nor with the issuer
 *   (who sees only post-fraud signals after the dump has
 *   already been resold), but with the merchant ecosystem:
 *   tokenization at the payment processor (merchant never
 *   touches the card number), hosted payment forms (the
 *   checkout iframe runs on the processor's domain, not the
 *   merchant's), and Subresource Integrity / Content Security
 *   Policy on checkout pages (which would have prevented the
 *   web-skimmer injection in this scenario). The diagnostic
 *   protocol for analysts triaging F1042-pattern losses is
 *   common-point-of-compromise analysis: cluster fraud
 *   reports by merchant, identify the merchant where every
 *   defrauded card transacted, refer to card brand. The
 *   institutional fix is acquirer-mandated tokenization and
 *   hosted payment forms for all e-commerce merchants below
 *   a sophistication threshold.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const CARD_DUMP_ACTORS = [
  {
    id: 'adversary',
    name: 'Adversary crew',
    role: 'Magecart-style web-skimmer operator · scans Caribbean e-commerce for vulnerable platforms · runs C2 collection infrastructure',
    initialState: 'active',
  },
  {
    id: 'damian',
    name: 'Mr. Damian Roberts',
    role: 'IslandShop owner · Bridgetown BB · 8-year merchant · WooCommerce + outdated payment plugin · ~3,200 card-on-file records',
    initialState: 'unaware',
  },
  {
    id: 'islandshop',
    name: 'IslandShop checkout',
    role: 'WooCommerce checkout flow · payment integration plugin v3.2.1 (current: v3.8.4) · known XSS-via-plugin-options vulnerability',
    initialState: 'silent',
  },
  {
    id: 'cardbrands',
    name: 'Card brands + issuers',
    role: 'Visa / Mastercard fraud-monitoring · issuer banks (Sagicor, Republic, NCB, JNCB, etc.) · downstream fraud detection',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const CARD_DUMP_CONTROLS = [
  {
    id: 'ctrl-tokenization-at-processor',
    label: 'Tokenization at payment processor — merchant never sees the card number',
    meta: 'Acquirer-mandated: merchant\'s checkout integration uses payment-processor-issued tokens, never raw card numbers. The card data goes from the customer\'s browser directly to the processor (via a hosted payment form or processor-supplied JavaScript) and the merchant\'s servers receive only an opaque token usable for that single transaction or, with explicit customer consent, future transactions. Defeats F1042 entirely because the merchant has no card data to be skimmed — the web-skimmer running on IslandShop\'s checkout page captures only tokens that are useless to the adversary. Implementation cost: merchant must migrate from "raw card POST to plugin" to "tokenized form supplied by processor." Most major Caribbean acquirers (FAC, FCIB Merchant Services, RBC Merchant Services) offer hosted payment pages and tokenization; the gap is enforcement against legacy merchant integrations that pre-date the offering. The single highest-leverage control against F1042.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'merchant integration patterns',
  },
  {
    id: 'ctrl-csp-sri-on-checkout',
    label: 'Content Security Policy + Subresource Integrity on checkout pages',
    meta: 'Merchant-side: the checkout page sets a strict Content Security Policy (CSP) that whitelists permitted script sources, and uses Subresource Integrity (SRI) hashes on every external script tag. The CSP would have blocked the adversary\'s injected skimmer script from loading from an attacker-controlled domain. The SRI hash mismatch on tampered local scripts would have prevented the injected skimmer from executing. Implementation cost: a few hours of header configuration plus build-pipeline integration to generate SRI hashes. Industry-standard since 2018; routine at PCI-Level-1 merchants; absent at most Caribbean small-merchant deployments. Catches F1042 at Stage 4 by preventing the skimmer from running at all.',
    naive: false,
    revealsAtStages: [4],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'web-skimmer injection attempts',
  },
  {
    id: 'ctrl-cpp-clustering-by-card-brand',
    label: 'Card-brand common-point-of-compromise analysis on aggregated fraud reports',
    meta: 'Card brand side (Visa, Mastercard): aggregated fraud reports from issuer banks are clustered by transaction history. When N+ defrauded cards share a common merchant where every card transacted in a defined window, that merchant is flagged as a likely common point of compromise (CPP). The card brand opens an investigation, notifies the merchant\'s acquirer, and triggers PCI forensic review. Catches F1042 at Stage 7 — typically 4-12 weeks after the breach itself, after significant downstream fraud has already occurred — but is the canonical detection mechanism for breaches that were never detected by the merchant. Implementation cost: routine; Visa CPP and Mastercard MFRA processes have run since the early 2010s. The signal is only as good as the issuer-side fraud reporting that feeds it. Closes the discovery loop but does not prevent the breach window itself.',
    naive: false,
    revealsAtStages: [7, 8],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'breached merchants identified post-fraud',
  },
]


/* ─── Detection signals ──────────────────────────────────────── */
export const CARD_DUMP_SIGNALS = [
  {
    id: 'sig-outdated-payment-plugin',
    label: 'WooCommerce payment-integration plugin v3.2.1 in production · current release v3.8.4 · known XSS-via-options CVE',
    description: 'IslandShop\'s payment plugin has not been updated since installation 4 years ago. The intervening releases include three security advisories, one of which (CVE-2024-XXXXX-class) describes an XSS vulnerability in the plugin\'s administrative options page that allows an unauthenticated attacker to inject arbitrary JavaScript into the plugin\'s rendered checkout flow. Damian has never logged in to update the plugin; the WordPress admin shows the update notice on every login but he treats it as routine UI noise. The tokenization control would have made the entire vulnerability irrelevant — the merchant would have no card data to skim regardless of plugin compromise. The CSP/SRI control would have blocked the attacker-injected JavaScript from executing at all.',
    revealedBy: 'ctrl-tokenization-at-processor',
  },
  {
    id: 'sig-checkout-page-loading-external-script',
    label: 'Checkout page loads JavaScript from islandshop-analytics.com (attacker domain registered 11 days before breach)',
    description: 'After the plugin compromise, the checkout page renders an additional script tag pointing at an attacker-controlled domain made to look like a legitimate analytics service. The domain was registered 11 days before the breach, has no inbound links anywhere on the public web, and serves a single payload — a card-data exfiltration script that hooks the checkout form\'s submit handler. The CSP control would have blocked the script from loading because the attacker domain would not be on the whitelist. The SRI control would have flagged the script tag as missing an integrity hash.',
    revealedBy: 'ctrl-csp-sri-on-checkout',
  },
  {
    id: 'sig-no-runtime-monitoring',
    label: 'No runtime monitoring of checkout page DOM or network requests',
    description: 'Damian\'s operational visibility into IslandShop\'s checkout consists of: order count per day, revenue per day, abandonment rate. He has no monitoring of the page DOM (which would show the injected script tag), no monitoring of outbound network requests (which would show card data exfiltrating to islandshop-analytics.com), no integrity monitoring of the checkout JavaScript bundle. The merchant-side detection channel for runtime checkout compromise is, in practice, "we get notified by the card brand months after the breach." The CSP and SRI controls close this gap by failing-secure at script-load time.',
    revealedBy: 'ctrl-csp-sri-on-checkout',
  },
  {
    id: 'sig-cpp-clustering-detects-breach',
    label: 'Visa CPP analysis identifies IslandShop as common point of compromise across 1,847 fraud reports',
    description: 'Eleven weeks after the breach starts, Visa\'s CPP investigation team — running clustering analysis on aggregated fraud reports submitted by issuers (Sagicor, Republic Bank, NCB, FCIB, others) — identifies IslandShop as the merchant where 1,847 of the recently-defrauded cards transacted in a common 47-day window. Visa opens a Level 1 forensic investigation, notifies IslandShop\'s acquirer, mandates PCI forensic review and breach disclosure to affected cardholders. By this point Anthony Spencer\'s card (F1043 v25.7.0.28 scenario) has been tested and resold; the breach itself has been over for two weeks. The CPP control closes the discovery loop but does not recover the funds nor prevent the breach.',
    revealedBy: 'ctrl-cpp-clustering-by-card-brand',
  },
  {
    id: 'sig-acquirer-mandated-tokenization-not-enforced',
    label: 'Acquirer offers hosted payment + tokenization · IslandShop integration pre-dates the offering · never migrated',
    description: 'IslandShop\'s acquirer (FCIB Merchant Services Barbados) has offered hosted payment pages and processor-side tokenization since 2019. Migration from legacy "merchant-hosted card form" integrations is recommended but not mandatory — merchants who installed before 2019 (Damian: 2018) can continue running raw-card-POST integrations indefinitely. The institutional gap is enforcement: making tokenization mandatory for all e-commerce merchants below a sophistication threshold. The tokenization control closes the gap at the architectural level rather than at the per-merchant detection level.',
    revealedBy: 'ctrl-tokenization-at-processor',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const CARD_DUMP_STAGES = [
  /* Stage 1 — Reconnaissance · Caribbean e-commerce scan */
  {
    id: 'cd-stage-1',
    label: 'Reconnaissance',
    title: 'Adversary scans Caribbean e-commerce for vulnerable platforms',
    caption: 'Six weeks before the scenario opens. The adversary crew runs an automated scan against Caribbean-region IP ranges and DNS records for e-commerce sites. They are looking specifically for WooCommerce installations (high market share among small Caribbean merchants), running known-vulnerable payment-integration plugins, with checkout pages that lack Content Security Policy headers. The scan returns 312 candidate sites across JM, TT, BB, BS, and the Eastern Caribbean. IslandShop ranks 47th on the candidate list — Damian\'s site has good organic traffic (suggesting good fraud throughput per breach), runs the vulnerable plugin v3.2.1, and has no CSP headers. The crew prioritizes IslandShop based on traffic-per-card-on-file estimate and queues it for compromise.',
    durationMs: 8000,
    messages: [
      { id: 'cd-m1-1', fromActor: 'adversary', toActor: 'islandshop', kind: 'http',
        label: 'Automated scan · WooCommerce + plugin v3.2.1 + no CSP detected',
        audio: { text: 'Caribbean e-commerce scan. Three hundred twelve candidates identified.', profile: 'narrator' } },
      { id: 'cd-m1-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'IslandShop ranked 47th · good traffic-per-card-on-file · queued for compromise',
        audio: { text: 'IslandShop queued. Good throughput. Queued for compromise.', profile: 'fraudster' } },
      { id: 'cd-m1-3', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'Running IslandShop normally · no awareness of scan · no detection capability for it' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Initial access · plugin XSS exploited */
  {
    id: 'cd-stage-2',
    label: 'Initial access',
    title: 'Plugin XSS vulnerability exploited · attacker-controlled JS staged in plugin options',
    caption: 'The adversary exploits the known XSS-via-options vulnerability in plugin v3.2.1. The attack vector: the plugin\'s admin-options page renders user-supplied configuration values without escaping, including a "custom analytics tracking ID" field that the plugin then injects into the rendered checkout page as part of its tracking integration. The adversary does not need admin access — the vulnerability is in how the checkout page renders the field, not in the admin authentication. They submit a crafted request that places attacker-controlled JavaScript into the plugin\'s stored options, where it sits until the next checkout page render. Damian\'s WordPress dashboard shows no alert; the plugin\'s admin interface displays the tracking ID field as a normal string; nothing visible has changed.',
    durationMs: 9500,
    messages: [
      { id: 'cd-m2-1', fromActor: 'adversary', toActor: 'islandshop', kind: 'http',
        label: 'POST /wp-admin/admin-ajax.php · crafted plugin-options payload · XSS persisted', suspicious: true,
        audio: { text: 'Plugin XSS exploited. Attacker JavaScript staged in plugin options.', profile: 'fraudster' } },
      { id: 'cd-m2-2', fromActor: 'islandshop', toActor: 'islandshop', kind: 'system',
        label: 'Plugin options updated · no admin notification · no integrity check on stored config' },
      { id: 'cd-m2-3', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'Logged into WordPress dashboard yesterday · plugin update notice ignored as routine' },
    ],
    actorStateChanges: { 'islandshop': 'compromised' },
    revealedSignalIds: ['sig-outdated-payment-plugin'],
  },

  /* Stage 3 — Skimmer activates on checkout */
  {
    id: 'cd-stage-3',
    label: 'Skimmer live',
    title: 'Web-skimmer renders into checkout · loads from islandshop-analytics.com',
    caption: 'The next customer hits IslandShop\'s checkout page. The plugin renders the checkout flow including the staged XSS payload, which loads additional JavaScript from islandshop-analytics.com — an attacker-controlled domain registered 11 days earlier with no inbound links anywhere on the public web. The injected script hooks the checkout form\'s submit handler. Every card number, expiration date, CVV, and cardholder name entered into the form is captured and exfiltrated to attacker C2 over a normal-looking HTTPS request, before the form\'s legitimate submit fires and the order completes normally. The customer\'s browser shows no anomaly. The order processes successfully. The merchant\'s order-management system records the order normally. From every observable signal Damian has access to, IslandShop is operating normally.',
    durationMs: 10500,
    messages: [
      { id: 'cd-m3-1', fromActor: 'damian', toActor: 'islandshop', kind: 'system',
        label: 'Customer arrives at checkout · enters card details · order processes normally' },
      { id: 'cd-m3-2', fromActor: 'islandshop', toActor: 'adversary', kind: 'http',
        label: 'Skimmer captures card data · exfiltrates to islandshop-analytics.com over HTTPS', suspicious: true,
        audio: { text: 'Card data captured at form submit. Exfiltrates to attacker C two.', profile: 'narrator' } },
      { id: 'cd-m3-3', fromActor: 'islandshop', toActor: 'cardbrands', kind: 'transfer',
        label: 'Order completes normally · payment processed · merchant unaware of dual exfil' },
    ],
    actorStateChanges: { 'adversary': 'collecting' },
    revealedSignalIds: ['sig-checkout-page-loading-external-script'],
  },

  /* Stage 4 — Capture window · 47 days of accumulation */
  {
    id: 'cd-stage-4',
    label: 'Capture window',
    title: 'Days 1 → 47 — silent accumulation of ~1,847 cards',
    caption: 'For 47 days the skimmer runs continuously. Every checkout transaction\'s card data is captured and exfiltrated to attacker C2. Damian operates IslandShop normally. The site renders normally. Orders process normally. Revenue patterns look normal. Customer complaints are at the usual baseline. Damian has no monitoring of the checkout page\'s runtime DOM, no monitoring of outbound network requests from his customers\' browsers, no integrity monitoring of the checkout JavaScript bundle. The merchant-side detection channel for runtime checkout compromise is functionally absent. By Day 47, approximately 1,847 unique cards have been exfiltrated, including cards issued by Sagicor, Republic Bank, NCB, FCIB, JNCB, and approximately a dozen smaller Caribbean issuers. The pedagogical move: the silence at this stage IS the technique. The compromise is operating perfectly precisely because it is invisible.',
    durationMs: 11000,
    messages: [
      { id: 'cd-m4-1', fromActor: 'islandshop', toActor: 'adversary', kind: 'http',
        label: 'Day 12 · 387 cards captured · exfil cadence steady',
        audio: { text: 'Day twelve. Three hundred eighty-seven cards. Steady cadence.', profile: 'narrator' } },
      { id: 'cd-m4-2', fromActor: 'islandshop', toActor: 'adversary', kind: 'http',
        label: 'Day 28 · 1,094 cards captured · skimmer integrity intact', suspicious: true },
      { id: 'cd-m4-3', fromActor: 'islandshop', toActor: 'adversary', kind: 'http',
        label: 'Day 47 · 1,847 cards captured · adversary signals exit',
        audio: { text: 'Day forty-seven. Eighteen hundred forty-seven cards. Adversary exits.', profile: 'narrator' } },
      { id: 'cd-m4-4', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'Operating normally · revenue patterns normal · no anomaly visible to merchant',
        audio: { text: 'Damian operates normally. No anomaly visible.', profile: 'victimMale' } },
    ],
    revealedSignalIds: ['sig-no-runtime-monitoring', 'sig-acquirer-mandated-tokenization-not-enforced'],
  },

  /* Stage 5 — Adversary exits · packages dump */
  {
    id: 'cd-stage-5',
    label: 'Exit + package',
    title: 'Day 47 — adversary removes skimmer · packages 1,847-card dump',
    caption: 'On Day 47 the adversary executes the planned exit. They reverse the plugin-options XSS injection, removing the skimmer JavaScript from IslandShop\'s checkout flow. The site reverts to its pre-compromise state. The 1,847-card dump is normalized into a structured format (BIN range, expiration, CVV, cardholder name, and the originating merchant tagged as IslandShop for the buyer\'s downstream attribution) and packaged for sale on a stolen-card marketplace. The adversary lists it as "Caribbean Visa premium fresh · BB/JM/TT issuers · 47-day window · IslandShop CPP-grade" — the marketplace category established earlier in the supply chain (referenced in the F1043 cardTestingScenes scenarioContext as the listing format).',
    durationMs: 8500,
    messages: [
      { id: 'cd-m5-1', fromActor: 'adversary', toActor: 'islandshop', kind: 'http',
        label: 'Skimmer reversed · plugin-options reverted · checkout returns to pre-compromise state' },
      { id: 'cd-m5-2', fromActor: 'adversary', toActor: 'adversary', kind: 'system',
        label: 'Dump normalized · packaged · listed on marketplace as "Caribbean Visa premium fresh · IslandShop CPP-grade"',
        audio: { text: 'Eighteen hundred forty-seven cards listed. Caribbean Visa premium fresh.', profile: 'fraudster' } },
      { id: 'cd-m5-3', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'Day 48 · IslandShop continuing operations · no awareness of breach completion' },
    ],
    actorStateChanges: { 'adversary': 'completed', 'islandshop': 'restored' },
    revealedSignalIds: [],
  },

  /* Stage 6 — Downstream cycle begins */
  {
    id: 'cd-stage-6',
    label: 'Downstream cycle',
    title: 'Days 48 → 75 — F1043 testing + early Execution fraud against captured cards',
    caption: 'In the four weeks following the dump\'s release, the cards from the IslandShop breach enter the downstream cycle described in F1043 Card Testing (v25.7.0.28). Anthony Spencer\'s card (F1043 scenario) is among them. The fraudster crew that purchases the dump runs validation testing — small-charge probes at low-friction merchants — to separate live cards from dead ones. Approximately 612 cards survive testing as confirmed-live; the rest are dead (already-cancelled, already-burned, or below the testing-merchant\'s acceptance threshold). The 612 validated cards are resold up the supply chain for full-fraud use. Each card subsequently appears in fraud reports filed by its issuer to Visa and Mastercard. The reports flow into the card brands\' aggregated fraud-monitoring databases.',
    durationMs: 10500,
    messages: [
      { id: 'cd-m6-1', fromActor: 'adversary', toActor: 'cardbrands', kind: 'transfer',
        label: 'Dump downstream · F1043 testing cycle · Anthony Spencer card among validated 612' },
      { id: 'cd-m6-2', fromActor: 'cardbrands', toActor: 'cardbrands', kind: 'system',
        label: 'Issuer fraud reports flowing into Visa/MC aggregated monitoring · pattern accumulating',
        audio: { text: 'Issuer fraud reports flowing into card brand monitoring.', profile: 'narrator' } },
      { id: 'cd-m6-3', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'IslandShop operating normally · no acquirer notification yet' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 7 — Card brand CPP analysis identifies IslandShop */
  {
    id: 'cd-stage-7',
    label: 'CPP detection',
    title: 'Day 78 — Visa common-point-of-compromise clustering identifies IslandShop',
    caption: 'Eleven weeks after the breach started — four weeks after it ended — Visa\'s common-point-of-compromise investigation team runs aggregated clustering analysis. The defining pattern: a substantial fraction of recently-defrauded Caribbean-issued cards transacted at IslandShop within a defined 47-day window in the months prior to the fraud. The CPP signature is unambiguous; the merchant is flagged. Visa opens a Level 1 forensic investigation, notifies IslandShop\'s acquirer (FCIB Merchant Services Barbados), and triggers the PCI forensic-review and breach-disclosure process. The acquirer notifies Damian by formal letter that IslandShop is implicated as the common point of compromise for a suspected breach affecting 1,847 cards.',
    durationMs: 11000,
    messages: [
      { id: 'cd-m7-1', fromActor: 'cardbrands', toActor: 'cardbrands', kind: 'system',
        label: 'CPP clustering identifies IslandShop · 1,847 cards in common 47-day window',
        audio: { text: 'Visa CPP analysis. IslandShop identified. Eighteen hundred forty-seven cards.', profile: 'investigator' } },
      { id: 'cd-m7-2', fromActor: 'cardbrands', toActor: 'damian', kind: 'notification',
        label: 'Acquirer notification: PCI forensic review mandated · breach disclosure required' },
      { id: 'cd-m7-3', fromActor: 'damian', toActor: 'damian', kind: 'system',
        label: 'Damian receives acquirer letter · first awareness of breach · 78 days late',
        audio: { text: 'Damian first learns of the breach seventy-eight days late.', profile: 'victimMale' } },
    ],
    actorStateChanges: { 'damian': 'discovering', 'cardbrands': 'investigating' },
    revealedSignalIds: ['sig-cpp-clustering-detects-breach'],
  },

  /* Stage 8 — Final · forensic close-out · supply-chain insight */
  {
    id: 'cd-stage-8',
    label: 'Forensic close-out',
    title: 'Day 90+ — PCI forensic review · root cause confirmed · institutional fix scoped',
    caption: 'PCI Qualified Forensic Investigator review confirms root cause: outdated WooCommerce payment-integration plugin v3.2.1, XSS vulnerability exploited to inject web skimmer, 47-day capture window, 1,847 cards exfiltrated. IslandShop is mandated to migrate to acquirer-hosted tokenized checkout (eliminating raw card data on the merchant side), implement Content Security Policy and Subresource Integrity on remaining customer-facing pages, and contribute to a remediation fund covering issuer reissuance costs. Damian\'s business survives but takes substantial financial and reputational damage. Anthony Spencer (F1043 scenario) and 1,846 other cardholders had their cards reissued; many had downstream fraud on their cards in the intervening months that they spent contesting with their issuers. The institutional question that closes the supply-chain arc — F1042 → F1043 → Execution — is whether acquirer-mandated tokenization should be enforced at the small-merchant tier without waiting for the next breach to motivate it.',
    durationMs: 12000,
    messages: [
      { id: 'cd-m8-1', fromActor: 'cardbrands', toActor: 'cardbrands', kind: 'system',
        label: 'PCI QFI review · root cause confirmed · plugin XSS + web skimmer + no CSP/SRI',
        audio: { text: 'PCI forensic review. Root cause confirmed. Plugin XSS, web skimmer, no CSP.', profile: 'investigator' } },
      { id: 'cd-m8-2', fromActor: 'damian', toActor: 'islandshop', kind: 'http',
        label: 'Migrate to acquirer-hosted tokenized checkout · CSP + SRI added · plugin removed',
        audio: { text: 'IslandShop migrates to tokenized checkout. Skimmer attack surface eliminated.', profile: 'victimMale' } },
      { id: 'cd-m8-3', fromActor: 'cardbrands', toActor: 'damian', kind: 'callback',
        label: 'Remediation fund contribution · issuer reissuance costs · breach disclosure to 1,847 cardholders' },
      { id: 'cd-m8-4', fromActor: 'cardbrands', toActor: 'cardbrands', kind: 'system',
        label: 'Institutional question: should acquirer-mandated tokenization be enforced at small-merchant tier?',
        audio: { text: 'Institutional question. Should acquirer-mandated tokenization be enforced at small-merchant tier?', profile: 'investigator' } },
    ],
    actorStateChanges: { 'damian': 'remediated', 'islandshop': 'restored' },
    revealedSignalIds: [],
    finalHeadline: 'The merchant is the entry point to the customer\'s bank account. Damian Roberts ran IslandShop in the way that small Caribbean retailers commonly run e-commerce: an off-the-shelf platform, an installed payment-integration plugin, no operational visibility into the checkout page\'s runtime behaviour, no scheduled security review of the plugin\'s update cadence. IslandShop\'s customers had no leverage against this — none of them could audit IslandShop\'s plugin version, none of them could inspect the checkout page\'s injected JavaScript, none of them had any reason to suspect that entering their card into IslandShop\'s checkout was different from entering it into Amazon\'s. The customers\' issuers (Sagicor, Republic Bank, NCB, FCIB, JNCB, others) saw the breach only through the post-fraud signal — months after the dump had been packaged, sold, tested, and used. The defence does not live with the customer (no leverage), nor primarily with the issuer (only post-fraud visibility). It lives with the merchant ecosystem: tokenization at the payment processor (so the merchant never touches the card number), hosted payment forms (so the checkout iframe runs on the processor\'s domain rather than the merchant\'s), and Content Security Policy + Subresource Integrity on checkout pages (which would have prevented the web-skimmer injection in IslandShop\'s case at the script-load layer). The diagnostic protocol for analysts triaging F1042-pattern losses is common-point-of-compromise clustering: when a substantial fraction of newly-defrauded cards share a common merchant in their transaction history, that merchant is the breach. The institutional question for executives reviewing this case is whether acquirer-mandated tokenization should be enforced at the small-merchant tier preventatively — before the next breach demonstrates the need — given that Caribbean retail e-commerce continues to grow and that the IslandShop case shape is replicable at every small-merchant deployment running a legacy raw-card-POST integration. The supply chain F1042 → F1043 → Execution closes here. The next animation tier covers Execution and Monetization techniques, where the validated cards from F1043 are converted to recovered or unrecoverable losses depending on issuer-side controls.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const CARD_DUMP_META = {
  techId: 'F1042',
  techName: 'Card Dump Capture',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'SC-damian-islandshop-card-dump',
  scenarioContext: 'Mr. Damian Roberts, age 42, owner of IslandShop — a Bridgetown, Barbados e-commerce retailer (electronics + fashion + home goods) that he has run for 8 years. Republic Bank Barbados business banking customer. Runs WooCommerce on a self-managed VPS with a payment-integration plugin (v3.2.1) installed 4 years ago and never updated; current release v3.8.4 patches a known XSS-via-options vulnerability that the adversary exploits in this scenario. The plugin\'s "remember card" feature stores card-on-file for repeat customers (against PCI guidance), accumulating ~3,200 customer card records over the years including approximately 1,847 cards from the 47-day breach window covered by the scenario. The adversary, a Magecart-style web-skimmer crew, scans Caribbean e-commerce for vulnerable platforms, identifies IslandShop as a high-throughput-per-card-on-file target, exploits the plugin XSS to inject a card-data exfiltration script into the checkout flow, runs the skimmer for 47 days capturing ~1,847 cards, then removes the skimmer cleanly and packages the dump for marketplace listing as "Caribbean Visa premium fresh · BB/JM/TT issuers · IslandShop CPP-grade." The downstream cycle (F1043 v25.7.0.28 Anthony Spencer scenario) tests the cards and Anthony\'s card (Sagicor Visa) is among the 612 validated as live. Eleven weeks after the breach starts, Visa\'s common-point-of-compromise clustering analysis identifies IslandShop as the merchant where 1,847 recently-defrauded cards transacted in a common 47-day window. The acquirer (FCIB Merchant Services Barbados) notifies Damian — his first awareness of the breach — and mandates PCI forensic review and breach disclosure to affected cardholders. Composite case grounded in publicly disclosed Caribbean retailer breach reporting (JM, TT, BB 2022-2025) following the Magecart pattern, Visa/Mastercard/Aite-Novarica reporting on Caribbean acquirer-side breach patterns, PCI Council documentation on the merchant-side detection gap, and card-brand CPP investigation methodology. Republic Bank Barbados is the second Republic Bank scenario in animations (after Tariq Mohammed · Republic Bank Trinidad F1007.002); first Bridgetown / Barbadian-set scenario.',
  totalDurationMs: 81000,
  stageCount: 8,
}


export default {
  meta: CARD_DUMP_META,
  engine: 'multi-actor-sequence',
  stages: CARD_DUMP_STAGES,
  controls: CARD_DUMP_CONTROLS,
  signals: CARD_DUMP_SIGNALS,
  actors: CARD_DUMP_ACTORS,
}
