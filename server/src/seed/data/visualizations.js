/**
 * visualizations.js — v25.7.0.2 seed data (ISS-023)
 *
 * Registry of visualization instances. Each entry is a binding between a
 * visualization KIND (which maps to a React component on the client) and an
 * ENTITY in the graph (Tactic, Technique, Concept, Stage, FrameworkPhase…).
 *
 * The visualization code itself ships with the client. This file declares
 * which visualizations exist, what they render against, what config they
 * use, and which roles they target.
 *
 * Why this shape (and what it deliberately is NOT):
 *
 *   - It is NOT a CMS for visualizations. We do not store SVG, HTML, or
 *     rendering logic in Neo4j. Doing so would mean every visual edit is
 *     a database migration, and every new chart kind is unparseable until
 *     the client gets corresponding code anyway. That trade is worse than
 *     the perceived flexibility.
 *
 *   - It IS a thin registry. Three things per entry: kind (which component
 *     to render), config (presentation choices for that component), and
 *     attachment (which graph entity this viz visualizes). The role array
 *     is the OBS-018 four-lens declaration — the renderer hides the viz
 *     for roles not listed.
 *
 *   - The config blob has a soft size cap of ~2 KB. If config grows past
 *     that, the right move is almost always to push structural data back
 *     into the graph (as nodes and edges) rather than encode it in JSON.
 *     Config is for presentation choices, not for graph data.
 *
 * Extending this file: add a new entry, run `npm run migrate:visualizations`,
 * point a UI surface at the relevant attached-entity endpoint. No client
 * change needed unless you're introducing a new KIND, in which case you
 * also build the corresponding component and register it in the renderer.
 *
 * v25.7.0.2 spike scope: ONE visualization, attached to TA0043
 * (Reconnaissance), kind = kill_chain_grid, audience = analyst/soc/executive.
 * Tellers explicitly NOT in the audience for this first viz — the teller
 * interaction will land in v25.7.1 once we have data on whether the pattern
 * works for the other three roles. OBS-018 documents this as the discipline.
 */

/**
 * RECONNAISSANCE KILL-CHAIN — content model decision (Option A from planning)
 *
 * F3's Reconnaissance tactic (TA0043) currently has only two indexed
 * techniques (F1067 Gather Victim Information, F1073 IVR Discovery). That's
 * not enough nodes to render a meaningful kill-chain visualization from
 * pure F3 graph data.
 *
 * Rather than pollute the F3 graph with techniques that aren't part of
 * F3's curated subset, this visualization is authored as a TEACHING
 * ABSTRACTION — explicitly framed as illustrative of how reconnaissance
 * generally works in financial-sector intrusions. The technique IDs cited
 * in node labels (T1593, T1589, T1110, etc.) are real MITRE ATT&CK IDs so
 * a curious user can drill out to attack.mitre.org.
 *
 * The framing is reinforced in the viz subtitle and in a small marker
 * at the bottom of the panel: "Illustrative — the F3 techniques formally
 * indexed for this tactic appear below."
 *
 * If, in v25.7.x, we decide to seed the missing reconnaissance techniques
 * into F3 and render this kill-chain from real graph data, the data shape
 * here is already aligned with that path — the config matches what a
 * graph-fed version would produce.
 */
const RECON_KILL_CHAIN_CONFIG = {
  // Three columns left-to-right; each node belongs to one phase by index
  phases: [
    { id: 'passive',  label: 'Passive Harvest' },
    { id: 'active',   label: 'Active Validation' },
    { id: 'pivot',    label: 'Pivot & Target' },
  ],

  nodes: [
    // Phase 0 — Passive Harvest
    { id: 'social',     phase: 0, label: 'Social Media Scrape',     mitre: 'T1593',
      description: 'Harvesting public profiles, employment history, and customer relationships from LinkedIn, obituaries, and corporate announcements.' },
    { id: 'records',    phase: 0, label: 'Public Records (TRN)',    mitre: 'T1589',
      description: 'Gathering identity documents, business registrations, and other publicly filed material that can be replayed in identity-verification calls.' },
    { id: 'brokers',    phase: 0, label: 'Data Broker Lists',        mitre: 'T1592',
      description: 'Purchasing leaked or aggregated credential and account-detail bundles from criminal marketplaces.' },

    // Phase 1 — Active Validation
    { id: 'phishing',   phase: 1, label: 'Spearphishing for Info',   mitre: 'T1598',
      description: 'Targeted emails using harvested context to elicit credentials, security answers, or confirmation of account details.' },
    { id: 'scanning',   phase: 1, label: 'Infrastructure Scanning',  mitre: 'T1595',
      description: 'Probing customer-facing portals, VPN endpoints, and authentication APIs for known-vulnerable software or weak controls.' },
    { id: 'enumeration',phase: 1, label: 'Account Enumeration',      mitre: 'T1589',
      description: 'Testing harvested email addresses against login portals to confirm which are valid before staging credential attacks.' },

    // Phase 2 — Pivot & Target
    { id: 'stuffing',   phase: 2, label: 'Credential Stuffing',      mitre: 'T1110',
      description: 'Automated login attempts against confirmed accounts using credential bundles — productive against any account where the customer reused a leaked password.' },
    { id: 'identity',   phase: 2, label: 'Account Takeover',         mitre: 'T1078',
      description: 'Full takeover of a customer account using validated credentials, often combined with SIM swap or social-engineered MFA bypass.' },
    { id: 'wire',       phase: 2, label: 'Wire / Transfer Fraud',    mitre: 'T1565',
      description: 'Exfiltration of funds through wire transfers, mule networks, or rapid-cashout instruments while the legitimate customer is unaware.' },
  ],

  // Source -> targets. Drives both the highlight-on-select behaviour and
  // (in a future v25.7.x release) the visible edge rendering.
  edges: [
    { from: 'social',      to: 'phishing' },
    { from: 'social',      to: 'enumeration' },
    { from: 'records',     to: 'phishing' },
    { from: 'records',     to: 'identity' },
    { from: 'brokers',     to: 'enumeration' },
    { from: 'brokers',     to: 'stuffing' },
    { from: 'phishing',    to: 'identity' },
    { from: 'phishing',    to: 'wire' },
    { from: 'scanning',    to: 'stuffing' },
    { from: 'scanning',    to: 'wire' },
    { from: 'enumeration', to: 'stuffing' },
    { from: 'enumeration', to: 'identity' },
  ],

  // Defenses are the falsifiability hook — each one explicitly claims to
  // mitigate one or more nodes. Toggle on, those nodes go grey + shielded.
  // The user can SEE the kill-chain breaking under their input. That is the
  // pedagogical commitment we made: every viz must have an analogous hook.
  defenses: [
    { id: 'mfa',          label: 'Multi-Factor Auth (MFA)',
      mitigates: ['stuffing', 'identity'],
      hint: 'Hardware keys and app-based authenticators break credential-replay paths even when the password is known.' },
    { id: 'hygiene',      label: 'Social-Media Hygiene Programme',
      mitigates: ['social', 'phishing'],
      hint: 'Reducing the public footprint of high-net-worth customers and executive staff removes the raw material spearphishing depends on.' },
    { id: 'segmentation', label: 'Network / Process Segmentation',
      mitigates: ['scanning', 'wire'],
      hint: 'Internal segmentation prevents successful scanning from translating into transfer authority — even a compromised endpoint cannot reach the wire system.' },
    { id: 'monitoring',   label: 'Lookalike-Domain Monitoring',
      mitigates: ['phishing', 'enumeration'],
      hint: 'Surveilling registrar feeds for typo-squatted bank domains catches the infrastructure phase before phishing email reaches anyone.' },
  ],

  // Marker that renders at the bottom of the viz panel
  illustrativeNote: 'Illustrative — adversary lifecycle for reconnaissance. The F3 techniques formally indexed for this tactic appear below.',
}

export const VISUALIZATIONS = [
  {
    id:        'VIZ-RECON-KILLCHAIN',
    kind:      'kill_chain_grid',
    title:     'Reconnaissance kill chain',
    subtitle:  'Click any node to trace the attack path. Toggle defenses to break it.',
    // Roles that should see this viz. v25.7.0.2: tellers excluded — a
    // teller-tuned interaction lands in v25.7.1.
    roles:     ['analyst', 'soc', 'executive'],
    order:     1,
    config:    RECON_KILL_CHAIN_CONFIG,

    // Which graph entity this viz attaches to. The seed migration will
    // create a (:Visualization)-[:VISUALIZES]->(<entityType>{id}) edge.
    attachedTo: { type: 'Tactic', id: 'TA0043' },
  },
]
