/**
 * cardTestingScenes.jsx — v25.7.0.28
 *
 * Scene data for Card Testing (F1043) — second Phase 2
 * Positioning (FA0001) animation. Uses MultiActorSequenceAnimation
 * engine.
 *
 * F1043 is the validation step in the card-data supply chain:
 * after stolen card numbers leave a breach (dump, skimmer, or
 * compromised processor), they must be tested for "freshness"
 * before being usable for full fraud. Bulk lots of stolen cards
 * have a high baseline kill rate — between issuer reissuance,
 * customer-initiated freezes, and prior testing-and-burn cycles,
 * a typical 1,800-card lot may have only 20-40% live cards by the
 * time it reaches the second-tier buyer. Card Testing is the
 * fraudster's quality-control phase: small charges (typically
 * $0.99 to $4.99) on low-friction merchants confirm which cards
 * still authorize, separating the live cards from the dead ones
 * before the cards get sold up the supply chain or used for
 * higher-value fraud.
 *
 * Card Testing fits the Positioning tactic because it is
 * preparation: no monetization happens during testing itself
 * (the fraudster loses money on the test charges and the merchant
 * fees), and the test merchant is typically not the eventual
 * fraud merchant. Card Testing tells the fraudster which subset
 * of the card lot is worth using — and which is worth selling
 * downstream as "Caribbean Visa premium fresh" (or equivalent
 * brand of bundled-and-validated stolen card data).
 *
 * Composite case grounded in:
 * - Caribbean retail breach patterns (TT, JM, BB e-commerce
 *   compromise reports 2023-2025) where mid-size retailers
 *   had unencrypted card-on-file data exfiltrated and
 *   subsequently appeared in stolen-card marketplace listings
 *   tagged by issuer and country
 * - Public industry reporting (Visa, Mastercard, Aite-Novarica,
 *   Recorded Future) on testing-bot infrastructure and the
 *   typical $0.99-$4.99 amount band, with merchants in the
 *   adult-content, digital-download, donation-platform, and
 *   small-SaaS categories disproportionately targeted because
 *   of low CVV-checking and weak chargeback handling
 * - FFIEC and PCI Council documentation of velocity-rule
 *   tuning patterns at issuer side, including the well-known
 *   gap that volume-based velocity rules tuned for higher-value
 *   transactions miss the sub-$1 testing band
 * - Caribbean banking norms: customers receive transaction
 *   alerts on most accounts but typically dismiss sub-$1
 *   charges as forgotten subscriptions or app-store auths,
 *   creating a dwell-time window that runs from the test
 *   transaction to the eventual full-fraud transaction
 *   (often 14-30 days)
 *
 * Scenario character: Mr. Anthony Spencer, age 36, graphic
 * designer in Spanish Town, JM. Sagicor Bank Visa cardholder
 * for 6 years (consumer card, J$250,000 limit). His card was
 * among 1,847 Sagicor-issued cards captured in a January 2026
 * compromise of an unrelated Caribbean e-commerce platform
 * where Anthony shops occasionally. The breach was disclosed
 * eight days ago; Sagicor has not yet completed its reissuance
 * cycle, so Anthony's old card number is still active. The
 * scenario picks up Day 7 post-breach disclosure, when the
 * fraudster crew that purchased the breach data on dark market
 * is beginning the validation phase.
 *
 * Sagicor is the fifth Caribbean institution represented in
 * animations (after NCB, JNCB, Scotiabank, and CIBC FirstCaribbean
 * in v25.7.0.27 Silent Alarm), continuing the locked methodology
 * of distributing scenarios across the actual Caribbean banking
 * footprint rather than concentrating on one institution.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell, Karen Ferguson).
 * First-name and surname both new to the roster.
 *
 * Pedagogical insight (locked v25.7.0.28):
 *   The $0.99 charge IS the fraud signal. Trainees and
 *   customers default-treat sub-$1 charges as noise — forgotten
 *   subscriptions, app-store re-auths, donation rounds. Card
 *   Testing weaponizes that default. The diagnostic protocol
 *   shifts from "watch for unauthorized large transactions" to
 *   "watch for the unauthorized small ones, because they
 *   precede the large ones by days or weeks." The cardholder's
 *   single most leveraged action is to dispute every
 *   unfamiliar small charge, regardless of amount. The
 *   institution's single most leveraged control is a
 *   cross-card velocity rule (N distinct cards from the same
 *   issuer hitting one merchant within M minutes), which is
 *   structurally different from the per-card-amount velocity
 *   rules that most issuers run.
 *
 * Why this technique meets OBS-028 ANIMATE criteria:
 *   1. Temporal sequence: yes — the testing bot fires 50 cards
 *      in 14 minutes, the velocity rule debate happens between
 *      Stages 3-4, the pivot to distributed merchants happens
 *      at Stage 5, the harvest-and-resell happens days later.
 *      Static diagram cannot communicate the per-minute card
 *      cadence that drives the velocity-rule design decision.
 *   2. State change matters: yes — Sagicor's bank-side state
 *      goes from 'silent' (no signal) → 'partial detection'
 *      (velocity rule fires for 23 of 50) → 'incomplete'
 *      (fraudster pivots distributed; rule no longer triggers).
 *      The pedagogical move is the gap between "rule fired"
 *      and "fraud caught."
 *   3. The gap teaches: yes — the counterfactual is the
 *      cross-card velocity rule, which would have caught the
 *      pattern in Stage 3 instead of in Stage 4 (and would
 *      have continued to catch in Stage 5 across distributed
 *      merchants because it keys on issuer + cards, not on
 *      merchant). The animation makes the gap between
 *      per-card and cross-card rules visible.
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered.
 *   The naive control "customers should review their statements
 *   monthly" is surfaced and explicitly countered: Card
 *   Testing happens at $0.99 amounts that customers are
 *   conditioned by app-store and subscription billing to
 *   ignore. By the time the test charge hits the customer's
 *   awareness in a monthly statement (if at all), the card
 *   has already been resold and used for $1,200 of full fraud
 *   somewhere else. The institutional fix lives in the
 *   issuer's velocity-rule design, not in the cardholder's
 *   statement-review hygiene.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const CARD_TESTING_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Owns 1,847-card lot from January 2026 retailer breach · running validation pass',
    initialState: 'active',
  },
  {
    id: 'anthony',
    name: 'Mr. Anthony Spencer',
    role: 'Sagicor Visa cardholder · graphic designer · Spanish Town · age 36',
    initialState: 'unaware',
  },
  {
    id: 'sagicor',
    name: 'Sagicor Bank',
    role: 'Issuer · authorization + velocity rules + transaction monitoring',
    initialState: 'silent',
  },
  {
    id: 'merchant',
    name: 'Test merchant funnel',
    role: 'Low-friction digital-download site · $0.99 unit price · then 7-merchant distribution',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const CARD_TESTING_CONTROLS = [
  {
    id: 'ctrl-cross-card-velocity',
    label: 'Cross-card velocity rule: N+ distinct cards from same issuer hitting one merchant in M minutes',
    meta: 'Issuer-side: detect when N+ distinct cards from the issuer\'s portfolio (e.g. 30+ cards) attempt authorization at the same merchant within a short window (e.g. 15 minutes), regardless of per-transaction amount. The rule keys on issuer-cards-vs-merchant rather than per-card-amount, which is the dimension testing bots cannot easily disguise without dramatically slowing throughput. Catches Card Testing in Stage 3 (the first wave hitting the digital-download merchant) before the fraudster has confirmation of which cards work. Defeats the Stage 5 pivot (distributed merchants, 1 card per 90 seconds) only if extended to a cross-merchant variant — same N cards across a small group of merchants in a wider window — which is the next-generation rule. Implementation cost: marginal (one additional rule in the existing fraud engine); false-positive rate is low because legitimate merchants do not see 30+ distinct cards from one issuer in 15 minutes outside of payday-spike windows that can be excluded. This is the single highest-leverage control against F1043.',
    naive: false,
    revealsAtStages: [3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'first-wave testing bursts',
  },
  {
    id: 'ctrl-authorization-amount-clustering',
    label: 'Anomaly score on authorization-amount distribution per merchant',
    meta: 'Issuer-side: profile each merchant\'s normal authorization-amount distribution (legitimate merchants typically show a wide spread; testing-target merchants show severe clustering at $0.99 / $1.00 / $1.99). Score each merchant nightly and flag those whose recent activity shows pathological clustering. Triggers a manual review and, on confirmation, freezes future authorizations at that merchant pending investigation. Catches the test merchant in Stage 2-3 by its profile signature, not by a specific transaction. Implementation cost: a nightly batch job and a fraud-ops review queue; needs about 30 days of merchant baseline data to be effective on new merchants. Does not catch the Stage 5 distributed pivot because the 7-merchant fan-out spreads activity across merchants thinly enough that no single merchant\'s clustering signature spikes — but it does catch the original concentrated wave, and it forces the fraudster to permanently abandon concentrated testing.',
    naive: false,
    revealsAtStages: [2, 3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'concentrated test waves',
  },
  {
    id: 'ctrl-micro-charge-customer-alerts',
    label: 'Cardholder-facing transaction alerts on every charge regardless of amount, with one-tap dispute',
    meta: 'Cardholder-facing: send a transaction alert (SMS, push, or both) for every authorization attempt regardless of dollar amount, with a prominent one-tap "Was this you? [No, dispute]" affordance. Catches Card Testing at the moment of the first test charge against any specific cardholder — Anthony, in Stage 6, gets the $0.99 alert at 11:47 PM. Effectiveness depends on cardholder action: Anthony in this scenario dismisses the alert as a forgotten subscription, which is the modal cardholder behavior for sub-$1 charges. The control catches structurally only if combined with cardholder education that "every unfamiliar small charge is a fraud signal, dispute it." That education does not currently exist in mainstream Caribbean cardholder onboarding, which is why this control is "decent" rather than "high leverage" despite its near-zero implementation cost. Industry-wide, this control raises the cost of Card Testing only marginally because most disputes do not arrive in time to interrupt the harvest cycle.',
    naive: false,
    revealsAtStages: [6],
    catchCount: 0,
    catchTotal: 1,
    catchUnit: 'cardholder dispute windows',
  },
  {
    id: 'ctrl-naive-monthly-statement-review',
    label: 'Cardholders should review their card statements monthly',
    meta: 'Treats Card Testing as a customer-vigilance problem solvable by good statement-review hygiene. The advice is structurally inadequate against F1043 for three converging reasons. (1) The test charge is $0.99, an amount cardholders are conditioned to ignore by years of legitimate sub-$1 transactions (app-store re-auths, donation rounds, subscription tier-downs). (2) The harvest-and-resell cycle in Stage 7 typically completes within 14 days, meaning Anthony\'s next monthly statement still shows a $0.99 charge that, if disputed, only confirms what the fraudster already harvested days ago. (3) The actual full fraud against Anthony\'s card happens at a different merchant 21 days later, by a different fraudster who bought his card from the harvester — and Anthony has by then mentally categorized the original $0.99 charge as resolved or forgotten. The naive control treats the cardholder as the last line of defense against a technique specifically engineered to operate below the cardholder\'s attention threshold. Real defense is issuer-side: cross-card velocity rules at the merchant aggregate.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Treats F1043 as a customer-hygiene problem. The technique\'s defining feature is that it operates at amounts below the cardholder\'s attention threshold and resells the validated cards before the cardholder\'s next statement arrives. Telling the cardholder to review statements harder does not address a technique structured to be invisible at the cardholder\'s detection layer. The institution chose the velocity-rule tuning that allows sub-$1 cross-card patterns to pass; the cardholder cannot fix the velocity rule.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const CARD_TESTING_SIGNALS = [
  {
    id: 'sig-cross-card-velocity-spike',
    label: '50 distinct Sagicor cards hit one digital-download merchant in 14 minutes',
    description: 'Sagicor\'s authorization log shows: between 22:11 and 22:25 on the testing night, 50 distinct Sagicor-issued Visa cards attempted authorization at the same low-friction digital-download merchant. No single one of those cards was an outlier on its own — each attempted a $0.99 charge from a residential IP within the cardholder\'s typical country footprint. The pattern is invisible at the per-card level and floodlit at the cross-card level. Cross-card velocity rule keyed on issuer + merchant + window length would have flagged this in real time at attempt #34 (Anthony\'s card, as it happens) and frozen further authorizations at that merchant until manual review. The 1,847-card lot validation would have stalled at 6.6% completion.',
    revealedBy: 'ctrl-cross-card-velocity',
  },
  {
    id: 'sig-merchant-authorization-clustering',
    label: 'Test merchant authorization distribution: 91% of attempts cluster at $0.99',
    description: 'Across the prior 30 days, the test merchant\'s authorization log shows 91% of all charge attempts at exactly $0.99, 4% at $1.00, 3% at $1.99, and 2% spread across all other amounts. Legitimate digital-download merchants show wide spreads (different products, different prices, occasional bundles); a 91% single-amount cluster is a testing-bot signature visible without reference to any specific cardholder. Authorization-amount distribution scoring would have flagged this merchant six days before the testing night and put a pre-authorized hold on Sagicor authorizations to that merchant pending review.',
    revealedBy: 'ctrl-authorization-amount-clustering',
  },
  {
    id: 'sig-anthony-alert-dismissed',
    label: 'Anthony\'s 11:47 PM SMS alert dismissed at 7:14 AM as forgotten subscription',
    description: 'Anthony\'s phone records the Sagicor SMS alert at 22:18:47 on the testing night: "Sagicor: $0.99 charged at DigitalDownloadStore.com." Anthony is asleep. He sees the alert at 7:14 AM the next morning, reads it, mentally categorizes it as "probably a subscription I forgot about," does not call Sagicor, does not check the card statement, archives the SMS. The alert was the customer-facing detection surface working exactly as designed; the cardholder\'s response was the modal sub-$1-alert response across the population. The control fails at the human-decision layer, not at the technical layer.',
    revealedBy: 'ctrl-micro-charge-customer-alerts',
  },
  {
    id: 'sig-twenty-one-day-resale-window',
    label: '21-day window between Anthony\'s test charge and the eventual full fraud on his card',
    description: 'Anthony\'s card cleared the test (Stage 6, $0.99 approved). The fraudster crew packaged Anthony\'s card alongside 611 other validated Sagicor cards and listed the bundle on a dark-market venue as "Caribbean Visa premium fresh" at $4.50 per card. The bundle sold within 36 hours to a different fraudster operating out of Eastern Europe. That fraudster used Anthony\'s card to make a $1,247 purchase at a US-based electronics retailer 21 days after the original test — a transaction that DID trigger Sagicor\'s standard velocity rules (high-amount, cross-border, new merchant) and was successfully blocked. Anthony lost nothing on the second transaction. Anthony lost the trust of his everyday card-usage habits in the second week of recovery, when he started double-checking every $0.99 charge — a behavioral cost that the institution cannot make whole.',
    revealedBy: 'ctrl-micro-charge-customer-alerts',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const CARD_TESTING_STAGES = [
  /* Stage 1 — The card haul */
  {
    id: 'ct-stage-1',
    label: 'The card haul',
    title: 'Day 7 post-breach — fraudster crew acquires the 1,847-card Sagicor lot',
    caption: 'A January 2026 breach of a regional Caribbean e-commerce platform exfiltrated approximately 14,400 unencrypted card-on-file records. The breach was disclosed eight days ago; affected issuers including Sagicor, NCB, JNCB, and Scotia are partway through their reissuance cycles. The breach data has been on a Russian-language dark-market venue for six days, sold in country-tagged and issuer-tagged lots. A fraudster crew operating out of Eastern Europe purchases the Sagicor-tagged subset — 1,847 cards — for $0.30 per card, total outlay $554. They have no way of knowing in advance how many of the 1,847 are still live. Industry baseline kill rate at this lag (Day 7 from breach disclosure) is approximately 60-70% — meaning 550 to 740 cards are expected to validate. The crew\'s next step is to find out which cards are in that subset. Validation through small test charges is the standard workflow.',
    durationMs: 9000,
    messages: [
      { id: 'ct-m1-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Purchase 1,847-card Sagicor lot · $0.30/card · total $554',
        audio: { text: 'Sagicor lot. Eighteen hundred forty seven cards. Five hundred fifty four dollars.', profile: 'fraudster' } },
      { id: 'ct-m1-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Decrypt + sort by issuer · split into 30-card validation batches' },
      { id: 'ct-m1-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Configure testing bot · target $0.99 charge amount · merchant: DigitalDownloadStore.com',
        audio: { text: 'Bot configured. Ninety nine cents. Digital download store.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — Pick the funnel */
  {
    id: 'ct-stage-2',
    label: 'Pick the funnel',
    title: 'Test merchant selected — DigitalDownloadStore.com · 91% of charges at exactly $0.99',
    caption: 'The fraudster selects DigitalDownloadStore.com as the test merchant. The choice is deliberate: the merchant accepts cards without billing-address verification (AVS off), does not require CVV match for stored-value items under $5, processes authorization in real time without batching, and has weak chargeback-handling that makes disputes operationally expensive but rarely successful. Across the prior 30 days the merchant\'s authorization log shows 91% of all charges at exactly $0.99 — a clustering pattern that is invisible at the per-cardholder level (Anthony has no way to know that DigitalDownloadStore.com is suspicious) but floodlit at the issuer aggregate level if anyone is looking. Sagicor\'s authorization-amount-distribution monitoring is not currently configured to flag this clustering. The merchant has been a known testing-bot funnel for at least 90 days within the industry threat-intelligence community without yet being added to Sagicor\'s declined-merchant list.',
    durationMs: 9500,
    messages: [
      { id: 'ct-m2-1', fromActor: 'fraudster', toActor: 'merchant', kind: 'http', label: 'Open testing session · DigitalDownloadStore.com · AVS off · CVV optional',
        audio: { text: 'Digital download store. AVS off. CVV optional.', profile: 'fraudster' } },
      { id: 'ct-m2-2', fromActor: 'merchant', toActor: 'merchant', kind: 'system', label: 'Merchant authorization profile · 91% at $0.99 · clustering signature' },
    ],
    actorStateChanges: { 'merchant': 'active' },
    revealedSignalIds: ['sig-merchant-authorization-clustering'],
  },

  /* Stage 3 — First wave */
  {
    id: 'ct-stage-3',
    label: 'First wave',
    title: '22:11 to 22:25 — 50 Sagicor cards tested at one merchant in 14 minutes',
    caption: 'The testing bot fires 50 cards in 14 minutes, one card every 16-17 seconds. Each card attempts a $0.99 authorization at DigitalDownloadStore.com. Sagicor\'s per-card authorization machinery sees each transaction as legitimate-looking on its own: residential IP within Jamaica, $0.99 charge at a known (if low-quality) merchant, no per-card velocity violation, no cross-border anomaly. Anthony\'s card is card #34 in the batch, attempted at 22:18:47. His card authorizes. Forty-nine of the other 49 cards attempt; 23 authorize, 27 decline (closed cards, replaced cards, customer-frozen cards). The bot logs the 23 successes and the 27 failures, moves on. Sagicor\'s fraud engine sees 50 distinct cards from its portfolio hitting one merchant in 14 minutes — but the volume-based velocity rule that runs is keyed on per-card-amount thresholds (above $50, above $200, etc.) and does not flag $0.99-band aggregate patterns. The cross-card velocity rule that would have caught this at attempt #34 is not currently deployed. The first wave clears.',
    durationMs: 12000,
    messages: [
      { id: 'ct-m3-1', fromActor: 'fraudster', toActor: 'merchant', kind: 'http', label: '22:11:00 · card #1 · $0.99 · authorized', suspicious: true },
      { id: 'ct-m3-2', fromActor: 'merchant', toActor: 'sagicor', kind: 'http', label: 'Authorization request · card #1 · $0.99 · DigitalDownloadStore' },
      { id: 'ct-m3-3', fromActor: 'sagicor', toActor: 'merchant', kind: 'http', label: 'Per-card velocity OK · approve · ($0.99 below all amount thresholds)' },
      { id: 'ct-m3-4', fromActor: 'fraudster', toActor: 'merchant', kind: 'http', label: '22:11 → 22:25 · 50 cards · 23 approve · 27 decline · Anthony\'s card #34 approves', suspicious: true,
        audio: { text: 'Fifty cards. Twenty three approve. Anthony approves.', profile: 'narrator' } },
      { id: 'ct-m3-5', fromActor: 'sagicor', toActor: 'sagicor', kind: 'system', label: 'Aggregate fraud-engine view · 50 distinct cards · 1 merchant · 14 min · NO RULE FIRES', suspicious: true,
        audio: { text: 'Fifty cards. One merchant. Fourteen minutes. No rule fires.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'sagicor': 'active' },
    revealedSignalIds: ['sig-cross-card-velocity-spike'],
  },

  /* Stage 4 — The detection that does not happen */
  {
    id: 'ct-stage-4',
    label: 'The detection that does not happen',
    title: '22:25 to 22:40 — fraudster pauses 15 minutes to confirm no issuer pushback',
    caption: 'After the first wave clears, the fraudster pauses 15 minutes to monitor for issuer pushback. The pause is operational discipline: if Sagicor\'s fraud team had detected the wave and frozen the merchant, subsequent attempts would soft-decline en masse, and the fraudster would know within minutes to pivot and abandon the merchant. No pushback comes. The 23 approvals stand; no chargebacks fire (those will come from cardholders weeks later, if at all); no Sagicor fraud-ops queue ticket opens; no Sagicor customer-care call comes in (the cardholder alerts have gone out to 50 phones, but most are asleep, and those who are awake will mostly ignore the $0.99 entries until morning if at all). The fraudster confirms operational space and prepares the next wave. The institutional gap revealed: between the first-wave detection that does not happen here and the eventual chargeback noise that will arrive across statements over the next 30 days, there is a multi-week window during which the validated cards will move through the resale market and be used for full fraud somewhere else. The detection that does not happen at 22:25 is the detection that would have prevented the rest of the supply chain.',
    durationMs: 9500,
    messages: [
      { id: 'ct-m4-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: '22:25 · pause 15 min · monitor for issuer pushback' },
      { id: 'ct-m4-2', fromActor: 'sagicor', toActor: 'sagicor', kind: 'system', label: '22:25-22:40 · no fraud-ops ticket · no merchant freeze · no rule retro-fires' },
      { id: 'ct-m4-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: '22:40 · no pushback · operational space confirmed · proceed to wave 2',
        audio: { text: 'No pushback. Operational space confirmed.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 5 — The pivot to distributed merchants */
  {
    id: 'ct-stage-5',
    label: 'The distributed pivot',
    title: '23:00 onward — 1,797 remaining cards · 7 merchants · 1 card per 90 seconds',
    caption: 'Even with the first-wave detection that did not happen, the fraudster maintains operational discipline by distributing the remaining 1,797 cards across seven different test merchants and slowing the pace to one card per 90 seconds per merchant. The choice is preemptive: against a hypothetical issuer that does deploy cross-card velocity rules, the distributed pattern fans the load thinly enough that no single merchant aggregate spikes above whatever threshold the rule uses. Each of the seven merchants now sees roughly 256 cards over the next ~6.5 hours, at one every 90 seconds — a per-merchant rate that looks like normal small-merchant traffic. The distributed phase yields 589 additional approvals. Combined with the 23 from the first wave, the validated cohort is 612 cards out of the original 1,847 — a 33.1% live rate, within the expected 30-40% band for Day 7 post-breach. The non-validating 1,235 cards are discarded. The 612 validated cards move into the resale-preparation queue.',
    durationMs: 11000,
    messages: [
      { id: 'ct-m5-1', fromActor: 'fraudster', toActor: 'merchant', kind: 'http', label: '23:00 · pivot to 7 distinct merchants · 1 card / 90 sec / merchant', suspicious: true,
        audio: { text: 'Seven merchants. Ninety seconds. Distributed.', profile: 'fraudster' } },
      { id: 'ct-m5-2', fromActor: 'merchant', toActor: 'sagicor', kind: 'http', label: '23:00 → 05:30 · 1,797 cards across 7 merchants · 589 approve' },
      { id: 'ct-m5-3', fromActor: 'sagicor', toActor: 'sagicor', kind: 'system', label: 'Per-merchant velocity OK at all 7 merchants · cross-merchant rule NOT deployed', suspicious: true,
        audio: { text: 'Per merchant: ok. Cross merchant: no rule.', profile: 'narrator' } },
      { id: 'ct-m5-4', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Final tally · 612 validated cards · 1,235 discarded · 33.1% live rate' },
    ],
    revealedSignalIds: [],
  },

  /* Stage 6 — Anthony's micro-charge */
  {
    id: 'ct-stage-6',
    label: 'Anthony\'s alert',
    title: '22:18:47 the night of testing → 7:14 AM next morning · the alert dismissed',
    caption: 'Anthony\'s phone records the Sagicor SMS at 22:18:47 the night of testing — moments after his card #34 authorized in the first wave. The SMS reads: "Sagicor: $0.99 charged at DigitalDownloadStore.com." Anthony is asleep at 22:18 — he has a 6:30 AM client meeting and went to bed at 21:45. He sees the alert at 7:14 AM the next morning while making coffee. He reads it carefully: a $0.99 charge at a digital-download merchant he does not recognize. He thinks for about four seconds. Three explanations come to mind: (1) a music app he used to subscribe to; (2) the kids\' game-app his nephew installed on his iPad last weekend; (3) one of those donation-rounding apps he turned on for a charity drive. He decides it is most likely the nephew\'s game, makes a mental note to check with his sister, archives the SMS, and goes to his client meeting. He does not call Sagicor. He does not check the card statement. He does not dispute the charge. The customer-facing detection surface fired exactly as designed; the customer\'s response was the modal sub-$1-alert response. The fraudster crew, watching for chargebacks and customer-initiated freezes, sees neither from Anthony\'s card. Anthony\'s card is confirmed valid, packaged into the resale bundle, and listed for sale 36 hours later.',
    durationMs: 12000,
    messages: [
      { id: 'ct-m6-1', fromActor: 'sagicor', toActor: 'anthony', kind: 'sms', label: '22:18:47 · "Sagicor: $0.99 charged at DigitalDownloadStore.com"',
        audio: { text: 'Sagicor: ninety nine cents at digital download store.', profile: 'narrator' } },
      { id: 'ct-m6-2', fromActor: 'anthony', toActor: 'anthony', kind: 'system', label: '7:14 AM · sees SMS · "probably the nephew\'s game · check with sister later"',
        audio: { text: 'Probably the nephew\'s game. Check with sister later.', profile: 'victimMale' } },
      { id: 'ct-m6-3', fromActor: 'anthony', toActor: 'anthony', kind: 'system', label: '7:15 AM · archives SMS · does not call Sagicor · no dispute filed' },
    ],
    revealedSignalIds: ['sig-anthony-alert-dismissed'],
  },

  /* Stage 7 — Cards graduate to dump market + 21-day window */
  {
    id: 'ct-stage-7',
    label: 'Cards to dump market',
    title: 'Day +2 to Day +21 · 612 cards listed at $4.50 each · Anthony\'s card used for $1,247 fraud at Day +28',
    caption: 'Day 2 after testing. The fraudster crew packages the 612 validated cards into a dark-market listing tagged "Caribbean Visa premium fresh — Sagicor JM — Q1 2026 breach origin — 33% pass rate confirmed." Listing price: $4.50 per card, total bundle value $2,754. Net profit on the validation pass: $2,754 minus $554 (lot purchase) minus the test-charge losses (612 × $0.99 to merchants) minus merchant fees on approved authorizations equals approximately $1,544. The economic structure is a low-margin, high-volume validation business: the fraudster crew takes a 280% return on their lot purchase by selling the validated subset to the next buyer. The bundle sells within 36 hours to an Eastern European fraudster who specializes in card-not-present retail fraud. Day 28 — three weeks after Anthony\'s test charge — that buyer uses Anthony\'s card for a $1,247 purchase at a US-based electronics retailer. THIS transaction triggers Sagicor\'s standard velocity rules (high amount, cross-border, new merchant) and is successfully blocked. Anthony loses nothing on the second transaction. The diagnostic frame for fraud-ops: when a card surfaces in a successful retail fraud attempt and the prior 30 days of the cardholder\'s history shows a single sub-$1 charge at a low-friction merchant the cardholder did not dispute, the case is Card Testing → Resale → Full Fraud — three distinct fraudsters in the supply chain, three distinct events, one stolen card. The institutional fix is the cross-card velocity rule at the testing layer, not the standard velocity rule at the full-fraud layer.',
    durationMs: 13000,
    messages: [
      { id: 'ct-m7-1', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Day +2 · 612 cards listed · "Caribbean Visa premium fresh" · $4.50/card',
        audio: { text: 'Six twelve cards. Four fifty each. Premium fresh.', profile: 'fraudster' } },
      { id: 'ct-m7-2', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Day +3.5 · bundle sells · net profit $1,544 · 280% return on lot' },
      { id: 'ct-m7-3', fromActor: 'fraudster', toActor: 'sagicor', kind: 'http', label: 'Day +28 · downstream buyer attempts $1,247 at US electronics retailer · Anthony\'s card', suspicious: true,
        audio: { text: 'Day twenty eight. Twelve forty seven. US retailer.', profile: 'narrator' } },
      { id: 'ct-m7-4', fromActor: 'sagicor', toActor: 'sagicor', kind: 'system', label: 'Standard velocity rules fire · high amount · cross-border · DECLINE',
        audio: { text: 'Standard rules fire. Decline.', profile: 'narrator' } },
      { id: 'ct-m7-5', fromActor: 'sagicor', toActor: 'anthony', kind: 'sms', label: 'Day +28 · "Sagicor: declined $1,247 at US retailer · was this you?"' },
      { id: 'ct-m7-6', fromActor: 'anthony', toActor: 'sagicor', kind: 'callback', label: 'Anthony calls Sagicor · cards reissued · audit reveals Day 0 $0.99 was the test',
        audio: { text: 'Card reissued. The ninety nine cents was the test.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'anthony': 'alerted' },
    revealedSignalIds: ['sig-twenty-one-day-resale-window'],
    finalHeadline: 'F1043 Card Testing — the $0.99 charge IS the fraud signal',
  },
]


/* ─── Meta ────────────────────────────────────────────────────── */
export const CARD_TESTING_META = {
  techId: 'F1043',
  techName: 'Card Testing',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  totalStages: CARD_TESTING_STAGES.length,
  pedagogicalInsight:
    'The $0.99 charge IS the fraud signal. Cardholders and per-card velocity rules both default to treating sub-$1 amounts as noise; Card Testing weaponizes that default. Detection requires shifting the diagnostic frame from per-card-amount thresholds to cross-card-merchant aggregates — the dimension testing bots cannot easily disguise without dramatically slowing throughput.',
}


/* ─── Default export — the full scene config ──────────────────── */
export default {
  meta: CARD_TESTING_META,
  engine: 'multi-actor-sequence',
  actors: CARD_TESTING_ACTORS,
  controls: CARD_TESTING_CONTROLS,
  signals: CARD_TESTING_SIGNALS,
  stages: CARD_TESTING_STAGES,
}
