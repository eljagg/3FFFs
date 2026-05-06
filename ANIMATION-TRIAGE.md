# F3 Animation Triage Record

Per OBS-028 (locked methodology, v25.7.0.10+), every F3 technique is
classified into one of three buckets BEFORE any animation work is
authored:

- **ANIMATE** — temporal AND state-change matters AND the gap teaches
- **STATIC DIAGRAM** — shape matters, timing doesn't (future bespoke viz)
- **TEXT ONLY** — closer to a definition than a process; description + cross-references suffice

This file records the triage decisions as they are made, so the
rationale for each ANIMATE choice is captured rather than relying on
ad-hoc memory across releases.

## Animations shipped

| Technique | Tactic | Release | Why ANIMATE |
|---|---|---|---|
| F1073 IVR Discovery | TA0043 Reconnaissance | v25.7.0.9 | Step-by-step probe; attacker's notepad evolves stage-by-stage; defender alerts counter stays at 0 (the gap = the lesson) |
| F1067 OSINT Profiling | TA0043 Reconnaissance | v25.7.0.10 | Sequential aggregation across 5 sources; attacker's dossier grows; target awareness stays NONE (gap = aggregation creates risk no single source represents) |

## Planned (next 1-3 releases)

| Technique | Tactic | Planned release | Why ANIMATE | Notes |
|---|---|---|---|---|
| F1097 3DS Bypass | FA0002 Monetization | v25.7.0.11 (likely) | MITM message-passing flow with timing pressure | DIFFERENT SHAPE than 3-zone — requires 4-actor sequence diagram. Tests engine evolution. |
| Sub-threshold structuring | TA0005 Defense Evasion | v25.7.0.12 (likely) | Transactions over time relative to a moving threshold line | DIFFERENT SHAPE again — timeline + threshold, not zones. Validates engine handles 3+ shape families. |
| Mule pipeline cross-bank funds flow | FA0002 Monetization | TBD | Funds flowing across multiple bank nodes | DIFFERENT SHAPE — network/graph |
| F1008.001 Change e-delivery | TA0005 Defense Evasion | TBD | Silent-alarm moment: alerts redirect to attacker email; victim doesn't know | Borderline — possibly STATIC instead. Decide closer to authoring. |

## Triage decisions for techniques NOT animated

This is a partial first-pass triage. Will be filled in across releases as we author content.

### TA0043 Reconnaissance

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| F1071 Search victim website | STATIC DIAGRAM | Shape matters (what info is on a typical bank website); timing doesn't |
| F1072 Phishing for information | STATIC DIAGRAM | The phish-message-to-credential flow is temporal but lesson is in message content |
| F1098 Closed-source intelligence | TEXT ONLY | "Buying data from criminal markets" — definitional |

### TA0042 Resource Development

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| F1583 Acquire infrastructure | TEXT ONLY | Definitional |
| F1585 Establish accounts | STATIC DIAGRAM | Shape matters (account types) |
| F1588 Obtain capabilities | TEXT ONLY | Definitional |

### TA0001 Initial Access

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| F1078 Valid Accounts | STATIC DIAGRAM | Shape matters (compromised credential → access); not really temporal |
| F1190 Exploit public-facing app | ANIMATE (TBD release) | Request/response flow IS process-shaped; lower priority than monetization animations |
| F1566 Phishing | STATIC DIAGRAM | The phish itself is well-understood; static example sufficient |
| F1199 Trusted Relationship | TEXT ONLY | Definitional |

### TA0005 Defense Evasion

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| F1008 Account Manipulation (parent) | TEXT ONLY | Parent of sub-techniques |
| F1008.002 Change phone | STATIC DIAGRAM | Same shape as .001 — would be near-duplicate animation |
| F1064 Device Fingerprint Spoofing | STATIC DIAGRAM | Shape matters (fingerprint values) but not temporal |
| F1063 Delete Relevant Emails | TEXT ONLY | Single action, not a process |

### FA0001 Positioning (F3-unique)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| (most positioning techniques) | TEXT ONLY at technique level | Tactic-level viz (PositioningTwoViews + PositioningTimeline) already does the heavy lifting |

### TA0002 Execution

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| F1059 Command-line execution | TEXT ONLY | Atypical fit for fraud context |
| F1204 User Execution | STATIC DIAGRAM | Customer clicks malicious link → trojan installs |
| F1486 Data Encrypted for Impact | ANIMATE (low priority) | Encryption sweep IS temporal but more cyber than fraud |

### FA0002 Monetization (F3-unique)

| Technique | Decision | Why not ANIMATE |
|---|---|---|
| Card-not-present fraud | STATIC DIAGRAM | Shape matters (data needed) but not temporal |
| Wire transfer fraud | STATIC DIAGRAM | Same |

## Estimated final scale

Based on the first-pass triage:

- ANIMATE candidates (definite + planned): ~7-10 techniques
- ANIMATE candidates (marginal): ~3-5 more
- **Realistic final count: ~10-15 animations**, not 114.

This file gets updated each release with the new ANIMATE decisions and
why. Older entries stay — the triage history IS the documentation.
