/**
 * Scenario beats — the day-by-day storyboard data for the F3 Framework
 * scenario storyboard view (Design C, ported from the v25.7.0.4.x prototypes).
 *
 * Beats are an ORTHOGONAL view of a scenario from the existing `stages`
 * (which are quiz/decision-tree-shaped). Stages teach by branching choice
 * ("which control catches this"). Beats teach by narrative timeline ("here's
 * what happened, day by day, technique by technique"). Both are valid; both
 * coexist; the storyboard view consumes beats only.
 *
 * Schema:
 *   id          — stable ID, format `<scenarioId>-B<index>` (e.g. SC007-B3)
 *   day         — integer day-offset from scenario start (Day 0 = first beat)
 *   actor       — who is acting:
 *                   'attacker' | 'victim' | 'detection'
 *                 'detection' is a counterfactual beat (what WOULD have
 *                 caught this if the relevant control had been active).
 *   kind        — visual treatment:
 *                   'attacker-action' | 'victim-event' | 'detection' | 'climax'
 *                 'climax' is reserved for the highest-impact beat in the
 *                 timeline — visually emphasized so trainees see the moment
 *                 the attack lands.
 *   techId      — F3 technique ID this beat enacts (optional — narrative
 *                 beats with no technique have no techId)
 *   techName    — denormalized name for rendering without join lookups
 *   techSeverity — 'high' | 'medium' (denormalized from technique node)
 *   headline    — one-line beat title
 *   narrative   — multi-sentence story-prose paragraph
 *   whatNow     — pedagogical box: what this beat MEANS in this scenario,
 *                 specifically (optional)
 *   techDescription — denormalized formal F3 description (optional —
 *                     populated for beats with techIds, omitted otherwise)
 *   phase       — phase boundary marker; if set, this entry is a phase
 *                 separator, not a beat. All other fields ignored.
 *
 * Pedagogical insight (per OBS-027):
 *   The storyboard exists to bind technique IDs to scenario beats so that
 *   recognizing the technique in production triggers the scenario memory.
 *   "F1008.001 silences alerts" is a definition. "Day 8 — crew swaps
 *   Allison's email to a throwaway Gmail; from this moment, every alert
 *   the bank sends goes to the crew not her" is a memory hook.
 */

export const SCENARIO_BEATS = {

  /* ────────────────────────────────────────────────────────────────────
   * SC007 — Account Rental: the money mule pipeline
   * ────────────────────────────────────────────────────────────────────
   * Allison Brown opens a Scotia JM account. Within 14 days a money-mule
   * crew has fully positioned to operate it. Without enhanced detection,
   * the bank only learns about it after cashout.
   *
   * Source: same scenario as the existing SC007 stages (Allison from
   * Clarendon, FID March 2026 bust). Beats compress the narrative to a
   * single 14-day arc tracking the technique-by-technique positioning,
   * matching the bank-CRM data already encoded in the Two Views viz.
   *
   * Cross-references with POSITIONING_TWO_VIEWS_CONFIG.examples[0] which
   * has the SAME 14-day timeline expressed as bank-CRM rows. Beats and
   * activity-rows are 1:1 on the days that matter:
   *   - D0 open-account, D0 first-deposit  → victim-event beats
   *   - D1 device-added                    → attacker beat (F1008.005)
   *   - D8 e-delivery-changed              → attacker beat (F1008.001)
   *   - D11 incoming $1840                 → attacker beat (F1008.002)
   *   - D12 incoming $2200                 → attacker beat (F1008.002)
   *   - D14 incoming $4500                 → climax beat (F1008.002)
   *   - D8-counterfactual                  → detection beat
   * ──────────────────────────────────────────────────────────────────── */
  'SC007': [

    // ── Phase: Positioning ──────────────────────────────────────────
    { id: 'SC007-PHASE-1', phase: 'POSITIONING — disguise + persistence' },

    {
      id: 'SC007-B1',
      day: 0,
      actor: 'victim',
      kind: 'victim-event',
      headline: 'Allison opens an account at the Half-Way Tree branch',
      narrative: "Genuine, in-person KYC. Real ID, real address, real phone. Bank record shows nothing wrong — and from the bank's perspective for the next 14 days, nothing IS wrong on Allison's side. She's a real customer. She just doesn't know her account has been rented.",
    },

    {
      id: 'SC007-B2',
      day: 0,
      actor: 'victim',
      kind: 'victim-event',
      headline: '$50 first deposit · cash · in branch',
      narrative: 'Looks like a normal new-account starter deposit. Will be the only legitimate transaction in the account during the Positioning phase.',
    },

    {
      id: 'SC007-B3',
      day: 1,
      actor: 'attacker',
      kind: 'attacker-action',
      techId: 'F1008.005',
      techName: 'Adding Call Receiving Device',
      techSeverity: 'high',
      techDescription: 'Adversaries may add devices under their control to victim accounts to intercept phone calls and notifications intended for the legitimate account holder.',
      headline: 'Crew enrolls their device on her mobile banking',
      narrative: 'iPhone 14, iOS 17.4. The CRM logs this as "Mobile Banking Device · Added D1" — completely routine. What it actually means: the crew now intercepts every push notification, every OTP, every alert the bank sends. From the bank\'s POV, Allison\'s phone IS the crew\'s phone.',
      whatNow: 'A device added <48h after open is the single strongest positioning signal in this scenario. If a Device velocity alert was active, this is where it would fire.',
    },

    {
      id: 'SC007-B4',
      day: 8,
      actor: 'attacker',
      kind: 'attacker-action',
      techId: 'F1008.001',
      techName: 'Change E-Delivery / Notification Settings',
      techSeverity: 'high',
      techDescription: 'Adversaries change email or SMS notification settings to prevent the legitimate account holder from detecting suspicious activity. Often the FIRST positioning move because it silences the alarms.',
      headline: 'Crew swaps her e-delivery email to a throwaway',
      narrative: 'Real email allison.brown@scotia.com.jm replaced with a.brown.kgn@gmail.com. Free email, never used before. Bank CRM logs this as "E-delivery email updated D8" — mundane. What it actually means: any statement, any high-value-transaction alert, any breach notification now goes to the crew, not to Allison.',
      whatNow: 'This is the second strongest positioning signal — and the one Auto-freeze on early e-delivery change is designed to catch. If active, this is where the account would freeze.',
    },

    // ── Phase: Execution ────────────────────────────────────────────
    { id: 'SC007-PHASE-2', phase: 'EXECUTION — the mule pipeline goes live' },

    {
      id: 'SC007-B5',
      day: 11,
      actor: 'attacker',
      kind: 'attacker-action',
      techId: 'F1008.002',
      techName: 'Additional Bank Accounts (incoming)',
      techSeverity: 'high',
      techDescription: 'Adversaries add new bank account details — both as senders and receivers — to compromised accounts to redirect funds. The first incoming transfer establishes the pattern; subsequent ones confirm operational control.',
      headline: 'First incoming transfer · $1,840 from external · J.M.',
      narrative: "Looks like a normal incoming wire — but it's from another mule the crew already operates. Allison doesn't have a job. She has no one paying her $1,840. From the bank's POV: cleared transfer, no flag.",
      whatNow: 'An Incoming-only pattern anomaly rule (no salary deposits in 30 days, multiple unrelated incoming transfers) would tag this as the first leg of a 3-transfer pattern.',
    },

    {
      id: 'SC007-B6',
      day: 12,
      actor: 'attacker',
      kind: 'attacker-action',
      techId: 'F1008.002',
      techName: 'Additional Bank Accounts (incoming)',
      techSeverity: 'high',
      techDescription: 'Adversaries add new bank account details — both as senders and receivers — to compromised accounts to redirect funds.',
      headline: 'Second incoming transfer · $2,200 from external · K.W.',
      narrative: 'Different sender, same crew. Confirms account is operational under their control — they\'re running pipeline tests before scaling up.',
    },

    {
      id: 'SC007-B7',
      day: 14,
      actor: 'attacker',
      kind: 'climax',
      techId: 'F1008.002',
      techName: 'Additional Bank Accounts (incoming)',
      techSeverity: 'high',
      techDescription: 'Adversaries add new bank account details — both as senders and receivers — to compromised accounts to redirect funds.',
      headline: 'Third incoming transfer · $4,500 from external · D.H.',
      narrative: 'Pattern complete: 3 incoming transfers, no salary, no family senders, all within 4 days. Mule live. Pipeline ready for production cashout — the next transfer in sequence will be outgoing, to the crew\'s real terminal.',
      whatNow: 'This is execution day. Without detection in Days 1–8, the bank learns about the rental retroactively, after the cashout, when Allison\'s real notifications surface and she calls the branch.',
    },

    // ── Phase: Counterfactual ───────────────────────────────────────
    { id: 'SC007-PHASE-3', phase: 'COUNTERFACTUAL — what detection would do' },

    {
      id: 'SC007-B8',
      day: 8,
      actor: 'detection',
      kind: 'detection',
      headline: 'IF Auto-freeze on early e-delivery change was active',
      narrative: 'Account would freeze on Day 8 the moment the throwaway Gmail was registered. The crew would lose access. Allison would be contacted in-branch. The pipeline never goes live. Estimated saved: USD 8K loss + customer trust + the crew has to recruit and onboard a new mule (3-4 week setback).',
      whatNow: 'This single rule, deployed correctly, breaks the Account Rental kill chain. Trade-off: false-positive rate on legitimate email changes. Tunable via cooling-off period (only freeze if email change happens <14 days after open).',
    },
  ],

  /* ────────────────────────────────────────────────────────────────────
   * SC008 — ATM Skimming (stub for v25.7.0.6)
   * ──────────────────────────────────────────────────────────────────── */
  // Beats not yet authored — will be populated in v25.7.0.6 from the
  // existing SC008 stages + Caribbean ATM-skim retros sourced via
  // advisor recruitment.

  /* ────────────────────────────────────────────────────────────────────
   * SC011 — Romance Scam (stub for v25.7.0.7)
   * ──────────────────────────────────────────────────────────────────── */

  /* ────────────────────────────────────────────────────────────────────
   * SC013 — Wire Fraud (stub for v25.7.0.8)
   * ──────────────────────────────────────────────────────────────────── */
}

/**
 * Stub scenarios — referenced by the storyboard picker so users can see
 * what's coming, but with no beats yet. Disabled in the picker UI.
 *
 * The display content (id, name, plannedRelease) is what shows in the
 * disabled picker tab. Once the beats are authored for that scenario,
 * its entry moves out of STUBS and into SCENARIO_BEATS keyed by ID.
 */
export const STORYBOARD_STUBS = [
  { id: 'SC008', name: 'ATM Skimming',  plannedRelease: 'v25.7.0.6' },
  { id: 'SC011', name: 'Romance Scam',  plannedRelease: 'v25.7.0.7' },
  { id: 'SC013', name: 'Wire Fraud',    plannedRelease: 'v25.7.0.8' },
]

/**
 * Scenario summary metadata used by the storyboard summary card.
 * Lives separately from the existing scenario `summary` field so the
 * storyboard can have its own front-matter without disrupting the
 * existing scenario record.
 *
 * stats.emphasis values: 'good' (green), 'danger' (red-ish), undefined.
 */
export const STORYBOARD_SUMMARIES = {
  'SC007': {
    headline: 'Account Rental — the money mule pipeline',
    subtitle: "Allison opens a Scotia JM account in her own name. Within 2 weeks, a money-mule crew has fully positioned to operate it. By Day 14, the account is running pre-execution test transfers. Without enhanced detection, the bank only learns about it after the cashout — by then the funds are gone.",
    meta: { jurisdiction: 'JM', frequency: 'High', losses: 'USD 8K avg' },
    stats: [
      { label: 'Days from open to cashout', value: '14' },
      { label: 'Techniques used',           value: '3' },
      { label: 'Hidden signals',            value: '5' },
      { label: 'Detection window',          value: 'Days 1–8', emphasis: 'good' },
    ],
  },
}
