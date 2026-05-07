# F3 Animation Triage Record

Per OBS-028 [animation triage rule, locked methodology v25.7.0.10+],
every F3 technique is classified into one of three buckets BEFORE any
animation work is authored:

- **ANIMATE** — temporal AND state-change matters AND the gap teaches
- **STATIC DIAGRAM** — shape matters, timing doesn't (future bespoke viz)
- **TEXT ONLY** — closer to a definition than a process; description + cross-references suffice

This file records the triage decisions as they are made, so the
rationale for each ANIMATE choice is captured rather than relying on
ad-hoc memory across releases.

Per OBS-029 [pair-codes-with-names, locked v25.7.0.10+], every code in
this file appears with its human name on first mention. Bare codes
appear only on subsequent same-section mentions where the full form
has just been used.

---

## Animations shipped

| Technique | Tactic | Release | Why ANIMATE |
|---|---|---|---|
| **F1073 IVR Discovery** | TA0043 Reconnaissance | v25.7.0.9 [first animation + ProcessAnimation framework] | Step-by-step probe; attacker's notepad evolves stage-by-stage; defender alerts counter stays at 0 (the gap = the lesson) |
| **F1067 OSINT Profiling** | TA0043 Reconnaissance | v25.7.0.10 [F1067 + engine refactor for scene-driven zone rendering] | Sequential aggregation across 5 sources; attacker's dossier grows; target awareness stays NONE (gap = aggregation creates risk no single source represents) |
| **Sub-threshold Structuring (F-code resolved by Omar from live framework — placeholder F1XXX in shipped code, see deploy notes)** | TA0005 Defense Evasion | v25.7.0.11 [TimelineThresholdAnimation engine + dual-character non-linear case-review visualization] | Case-review pedagogy: trainee plays AML analyst comparing two NCB Jamaica accounts. Mrs. Marcia Edwards (Mandeville market vendor, legitimate cash-heavy small business) vs. "Trevor Bennett" (3-month-old account, threshold-hugging deposits, channel-fragmented, undocumented source). The pattern only exists across time, channels, and customer baseline — not in any single transaction. Teaches actual analyst job. POCA Section 101A J$1M threshold framework, FID/goAML reporting workflow. |

---

## Planned (next 1-3 releases)

| Technique | Tactic | Planned release | Why ANIMATE | Notes |
|---|---|---|---|---|
| **Mule pipeline cross-bank funds flow (F-code TBD — resolve from live framework when authoring)** | FA0002 Monetization | TBD | Funds flowing across multiple bank nodes | DIFFERENT SHAPE — network/graph, animated flow between nodes |
| **F1008.001 Change e-delivery settings (the silent alarm move)** | TA0005 Defense Evasion | TBD | Silent-alarm moment: alerts redirect to attacker email; victim doesn't know | Borderline — possibly STATIC DIAGRAM instead. Decide closer to authoring. |
| **F1097 3DS Bypass** | FA0002 Monetization | DEFERRED — revisit later with multi-perspective post-incident investigation framing | The original real-time-attacker-walkthrough framing was triaged out as too operationally detailed; the multi-perspective post-incident investigator framing (per Omar's earlier suggestion) preserves the defender lesson with less attacker uplift. Code on internal shelf can be refactored when authored. | SequenceDiagramAnimation engine code is ready and reusable when this technique is reauthored with the better framing. |

---

## Triage decisions for techniques NOT animated

This is a partial first-pass triage. Filled in across releases as we author content.

### TA0043 Reconnaissance

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1071 Search victim website** | STATIC DIAGRAM | Shape matters (what info is on a typical bank website); timing doesn't |
| **F1072 Phishing for information** | STATIC DIAGRAM | The phish-message-to-credential flow is temporal but lesson is in message content |
| **F1098 Closed-source intelligence** | TEXT ONLY | "Buying data from criminal markets" — definitional, no process to animate |

### TA0042 Resource Development

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1583 Acquire infrastructure** | TEXT ONLY | Definitional ("set up VOIP, register domains, buy SIM cards") |
| **F1585 Establish accounts** | STATIC DIAGRAM | Shape matters (mule / drop / intermediary account types) |
| **F1586 Compromise accounts** | STATIC DIAGRAM | Takeover process IS temporal but mostly covered by other techniques |
| **F1588 Obtain capabilities** | TEXT ONLY | Definitional ("buy tools / kits / services") |

### TA0001 Initial Access

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1078 Valid Accounts** | STATIC DIAGRAM | Shape matters (compromised credential → access path); not really temporal |
| **F1190 Exploit public-facing app** | ANIMATE (TBD release, lower priority) | Request/response flow IS process-shaped; lower priority than monetization animations |
| **F1566 Phishing** | STATIC DIAGRAM | The phish itself is well-understood; static example sufficient |
| **F1199 Trusted Relationship** | TEXT ONLY | Definitional ("abuse a partner's access") |

### TA0005 Defense Evasion

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1008 Account Manipulation (parent)** | TEXT ONLY | Parent of sub-techniques — the parent itself isn't a process |
| **F1008.002 Change phone number** | STATIC DIAGRAM | Same shape as F1008.001 Change e-delivery settings — would be near-duplicate animation |
| **F1064 Device Fingerprint Spoofing** | STATIC DIAGRAM | Shape matters (which fingerprint values get spoofed) but not really temporal |
| **F1063 Delete Relevant Emails** | TEXT ONLY | Single action, not a process |

### FA0001 Positioning (F3-unique tactic, not in MITRE ATT&CK)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| (most positioning techniques) | TEXT ONLY at technique level | Tactic-level viz (PositioningTwoViews + PositioningTimeline, both shipped pre-v25.7.0.9) already does the heavy lifting at the tactic level. Per-technique animations would duplicate without adding pedagogical value. |

### TA0002 Execution

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| **F1059 Command-line execution** | TEXT ONLY | Atypical fit for fraud context — more cyber than fraud |
| **F1204 User Execution** | STATIC DIAGRAM | Customer clicks malicious link → trojan installs. Static example is sufficient. |
| **F1486 Data Encrypted for Impact** | ANIMATE (low priority) | Encryption sweep IS temporal but more cyber than fraud — lower priority than monetization animations |

### FA0002 Monetization (F3-unique tactic, not in MITRE ATT&CK)

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

- **OBS-018 four-lens block** — every release includes a Teller / Analyst / SOC / Executive lens block in deploy notes
- **OBS-027 one pedagogical insight per release** — every release identifies the specific pedagogical lever it enables
- **OBS-028 animation triage rule** — default is TEXT ONLY; ANIMATE earned only when temporal AND state-change AND gap teaches
- **OBS-029 pair-codes-with-names** — F-codes / TA-codes / SC-codes / OBS-codes / v-codes always paired with human names on first mention per turn or per section

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
