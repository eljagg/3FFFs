# F3 Animation Triage Record

Per the animation triage rule (OBS-028, locked methodology v25.7.0.10+),
every F3 technique is classified into one of three buckets BEFORE any
animation work is authored:

- **ANIMATE** — temporal AND state-change matters AND the gap teaches
- **STATIC DIAGRAM** — shape matters, timing doesn't (future bespoke viz)
- **TEXT ONLY** — closer to a definition than a process; description + cross-references suffice

This file records the triage decisions as they are made, so the
rationale for each ANIMATE choice is captured rather than relying on
ad-hoc memory across releases.

Per the pair-codes-with-names convention (OBS-029, locked v25.7.0.10+,
refined v25.7.0.11.1), every code in this file appears with its human
name on first mention — **human name first, F-code in brackets after**.
Bare codes appear only on subsequent same-section mentions where the
full form has just been used.

---

## Animations shipped

| Technique | Tactic | Release | Why ANIMATE |
|---|---|---|---|
| **IVR Discovery (F1073)** | Reconnaissance (TA0043) | v25.7.0.9 [first animation + ProcessAnimation framework] | Step-by-step probe; attacker's notepad evolves stage-by-stage; defender alerts counter stays at 0 (the gap = the lesson) |
| **Gather Victim Information (F1067)** | Reconnaissance (TA0043) | v25.7.0.10 [F1067 animation + engine refactor for scene-driven zone rendering] | The animation specifically shows the OSINT-profiling sub-pattern: sequential aggregation across 5 sources; attacker's dossier grows; target awareness stays NONE (gap = aggregation creates risk no single source represents) |
| **Structuring (F1087)** | Monetization (FA0002) | v25.7.0.11 [TimelineThresholdAnimation engine + dual-character non-linear case-review visualization] · v25.7.0.11.1 [F-code resolution + tactic correction] | The animation specifically shows the sub-threshold structuring sub-pattern (deposits hugging the J$1M POCA Section 101A threshold from below). Case-review pedagogy: trainee plays AML analyst comparing two NCB Jamaica accounts. Mrs. Marcia Edwards (Mandeville market vendor, legitimate cash-heavy small business) vs. Trevor Bennett (3-month-old account, threshold-hugging deposits, channel-fragmented, undocumented source). The pattern only exists across time, channels, and customer baseline — not in any single transaction. POCA Section 101A J$1M threshold framework, FID/goAML reporting workflow. |

---

## Planned (next 1-3 releases)

| Technique | Tactic | Planned release | Why ANIMATE | Notes |
|---|---|---|---|---|
| **Mule pipeline cross-bank funds flow (F-code TBD — resolve from live framework when authoring)** | Monetization (FA0002) | TBD | Funds flowing across multiple bank nodes | DIFFERENT SHAPE — network/graph, animated flow between nodes |
| **Account Manipulation: Change E-Delivery / Notification Settings (F1008.001) (the silent alarm move)** | Positioning (FA0001) | TBD | Silent-alarm moment: alerts redirect to attacker email; victim doesn't know | Borderline — possibly STATIC DIAGRAM instead. Decide closer to authoring. NOTE: lives under Positioning (FA0001) in the live framework, not Defense Evasion (TA0005) as earlier project notes had it. |
| **3DS Bypass (F1076)** | Defense Evasion (TA0005) | DEFERRED — revisit later with multi-perspective post-incident investigation framing | The original real-time-attacker-walkthrough framing was triaged out as too operationally detailed; the multi-perspective post-incident investigator framing preserves the defender lesson with less attacker uplift. Code on internal shelf is reusable when reauthored. NOTE: F-code is F1076, NOT F1097 as earlier project notes had it. F1097 is "Use Virtual cards", a different technique entirely. |

---

## Triage decisions for techniques NOT animated

⚠ **NOTE (v25.7.0.11.1):** The detailed per-tactic sections below were
authored from research-cache F-codes BEFORE the live framework was
queried in v25.7.0.11.1. Some F-codes here may not match what's
actually in the live framework, and the naming convention follows the
older F-code-first format. A future release will audit every entry
against the live framework (per the curl output captured during
v25.7.0.11.1) and apply the corrected pair-codes-with-names convention
(human name first, F-code in brackets after). Until that audit
release, treat the entries below as conceptual classifications rather
than verified F-code references.

This is a partial first-pass triage. Filled in across releases as we author content.

### Reconnaissance (TA0043)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1071 Search victim website** | STATIC DIAGRAM | Shape matters (what info is on a typical bank website); timing doesn't |
| **F1072 Phishing for information** | STATIC DIAGRAM | The phish-message-to-credential flow is temporal but lesson is in message content |
| **F1098 Closed-source intelligence** | TEXT ONLY | "Buying data from criminal markets" — definitional, no process to animate |

### Resource Development (TA0042)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1583 Acquire infrastructure** | TEXT ONLY | Definitional ("set up VOIP, register domains, buy SIM cards") |
| **F1585 Establish accounts** | STATIC DIAGRAM | Shape matters (mule / drop / intermediary account types) |
| **F1586 Compromise accounts** | STATIC DIAGRAM | Takeover process IS temporal but mostly covered by other techniques |
| **F1588 Obtain capabilities** | TEXT ONLY | Definitional ("buy tools / kits / services") |

### Initial Access (TA0001)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1078 Valid Accounts** | STATIC DIAGRAM | Shape matters (compromised credential → access path); not really temporal |
| **F1190 Exploit public-facing app** | ANIMATE (TBD release, lower priority) | Request/response flow IS process-shaped; lower priority than monetization animations |
| **F1566 Phishing** | STATIC DIAGRAM | The phish itself is well-understood; static example sufficient |
| **F1199 Trusted Relationship** | TEXT ONLY | Definitional ("abuse a partner's access") |

### Defense Evasion (TA0005)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1008 Account Manipulation (parent)** | TEXT ONLY | Parent of sub-techniques — the parent itself isn't a process |
| **F1008.002 Change phone number** | STATIC DIAGRAM | Same shape as F1008.001 Change e-delivery settings — would be near-duplicate animation |
| **F1064 Device Fingerprint Spoofing** | STATIC DIAGRAM | Shape matters (which fingerprint values get spoofed) but not really temporal |
| **F1063 Delete Relevant Emails** | TEXT ONLY | Single action, not a process |

### Positioning (FA0001) (F3-unique tactic, not in MITRE ATT&CK)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| (most positioning techniques) | TEXT ONLY at technique level | Tactic-level viz (PositioningTwoViews + PositioningTimeline, both shipped pre-v25.7.0.9) already does the heavy lifting at the tactic level. Per-technique animations would duplicate without adding pedagogical value. |

### Execution (TA0002)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1059 Command-line execution** | TEXT ONLY | Atypical fit for fraud context — more cyber than fraud |
| **F1204 User Execution** | STATIC DIAGRAM | Customer clicks malicious link → trojan installs. Static example is sufficient. |
| **F1486 Data Encrypted for Impact** | ANIMATE (low priority) | Encryption sweep IS temporal but more cyber than fraud — lower priority than monetization animations |

### Monetization (FA0002) (F3-unique tactic, not in MITRE ATT&CK)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| Card-not-present fraud (F-code TBD) | STATIC DIAGRAM | Shape matters (what data the attacker needs) but not temporal |
| Wire transfer fraud (F-code TBD) | STATIC DIAGRAM | Same shape rationale |

---

## Estimated final scale

Based on the first-pass triage:

- **ANIMATE candidates (definite + planned):** ~7-10 techniques
- **ANIMATE candidates (marginal — case-by-case):** ~3-5 more
- **Realistic final count: ~10-15 animations**, not 114.

This file gets updated each release with the new ANIMATE decisions and
their rationale. Older entries stay — the triage history IS the
documentation.

---

## Locked observations referenced in this file

For self-contained reading, the locked observations referenced above:

- **four-lens block (OBS-018)** — every release includes a Teller / Analyst / SOC / Executive lens block in deploy notes
- **one pedagogical insight per release (OBS-027)** — every release identifies the specific pedagogical lever it enables
- **animation triage rule (OBS-028)** — default is TEXT ONLY; ANIMATE earned only when temporal AND state-change AND gap teaches
- **pair-codes-with-names (OBS-029, refined v25.7.0.11.1)** — every code paired with human name on first mention; **human name first, F-code in brackets after** (e.g., "IVR Discovery (F1073)")

---

## Tactic codes reference

For readers unfamiliar with the F3 framework structure:

- **TA0043** Reconnaissance
- **TA0042** Resource Development
- **TA0001** Initial Access
- **TA0005** Defense Evasion
- **FA0001** Positioning (F3-unique, not in MITRE ATT&CK)
- **TA0002** Execution
- **FA0002** Monetization (F3-unique, not in MITRE ATT&CK)

## Scenario codes reference

- **SC007** — Allison Brown money mule recruitment scenario (Caribbean banking; threads through all current animations as the recurring character)
- **SC008** — ATM Skimming scenario (beats not yet authored as of v25.7.0.10)
- **SC011** — Romance Scam scenario (beats not yet authored as of v25.7.0.10)
- **SC013** — Wire Fraud scenario (beats not yet authored as of v25.7.0.10)
