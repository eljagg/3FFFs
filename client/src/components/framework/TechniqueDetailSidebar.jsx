import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'
// v25.7.0.9: process-animation engine + scene data per technique.
// v25.7.0.10: scene-driven zone rendering refactor.
// v25.7.0.11: third engine (TimelineThresholdAnimation) for case-review
//   shape. Routing via ENGINE_MAP keyed on scene config's `engine` field.
//   Default 'three-zone' preserves backward compat with existing animations.
// v25.7.0.11.1: F-code corrections after live-framework verification —
//   Structuring (F1087) under Monetization (FA0002), not the F1XXX
//   placeholder under Defense Evasion. OSINT Profiling animation
//   correctly attached to Gather Victim Information (F1067). Naming
//   convention per OBS-029 [pair-codes-with-names] refined: human name
//   first, F-code in brackets after.
// v25.7.0.12: fourth engine (MultiActorSequenceAnimation) for multi-
//   actor temporal flows. First consumer: Phishing (F1081) under
//   Initial Access (TA0001). Grounded in real NCB J$47.5M case.
// v25.7.0.13-14: Vishing (F1088) and SIM Card Swap (T1451) animations
//   on the same engine; SIM Swap extended to 5 actors (Insider lane).
// v25.7.0.14.1: auto-derived control-stage hint mapping (engine fix;
//   scene metadata `revealsAtStages` now derived from actual signal-to-
//   stage mapping rather than hand-maintained).
// v25.7.0.15: audio narration system across all three engines via the
//   browser's Web Speech API. Per-message audio fields on dialogue
//   messages (Phishing, Vishing, SIM Swap) and per-stage audio on
//   process/timeline animations (IVR Discovery). Mute toggle in
//   playback bar; default unmuted so trainees encounter the realism.
//   Pedagogical rationale: tellers and customer-service staff hear
//   actual fraudster voices when customers report incidents — they
//   need to recognize the voice pattern (cadence, scripted authority
//   language, specific phrases) as the fraud signature.
import ProcessAnimation from './animations/ProcessAnimation.jsx'
import TimelineThresholdAnimation from './animations/TimelineThresholdAnimation.jsx'
import MultiActorSequenceAnimation from './animations/MultiActorSequenceAnimation.jsx'
import ivrDiscoveryScenes from './animations/ivrDiscoveryScenes.jsx'
import osintProfilingScenes from './animations/osintProfilingScenes.jsx'
import subthresholdStructuringScenes from './animations/subthresholdStructuringScenes.jsx'
import phishingScenes from './animations/phishingScenes.jsx'
import vishingScenes from './animations/vishingScenes.jsx'
import simSwapScenes from './animations/simSwapScenes.jsx'
import passwordResetScenes from './animations/passwordResetScenes.jsx'
import mfaFatigueScenes from './animations/mfaFatigueScenes.jsx'
import insiderAccessScenes from './animations/insiderAccessScenes.jsx'
import accountTakeoverScenes from './animations/accountTakeoverScenes.jsx'
import mfaInterceptionScenes from './animations/mfaInterceptionScenes.jsx'
import silentAlarmScenes from './animations/silentAlarmScenes.jsx'
import cardTestingScenes from './animations/cardTestingScenes.jsx'

const ANIMATION_MAP = {
  'F1073': ivrDiscoveryScenes,                  // IVR Discovery (F1073) under Reconnaissance (TA0043) — v25.7.0.9
  'F1067': osintProfilingScenes,                // Gather Victim Information (F1067) under Reconnaissance (TA0043) — v25.7.0.10
  'F1087': subthresholdStructuringScenes,       // Structuring (F1087) under Monetization (FA0002) — v25.7.0.11
  'F1081': phishingScenes,                      // Phishing (F1081) under Initial Access (TA0001) — v25.7.0.12
                                                //   Grounded in NCB J$47.5M case (April-June 2022).
  'F1088': vishingScenes,                       // Vishing (F1088) under Initial Access (TA0001) — v25.7.0.13
                                                //   "FID Officer Reid" call to JNCB business customer Devon Henry.
  'T1451': simSwapScenes,                       // SIM Card Swap (T1451) under Initial Access (TA0001) — v25.7.0.14
                                                //   5-actor sequence with Insider lane. Grounded in J$61M Jamaica
                                                //   conviction (October 2025) where two of three convicted were
                                                //   telco customer service representatives. Tanya Ricketts
                                                //   (Scotia JM customer, Portmore) compromised entirely via
                                                //   insider CSR at Digicel — strong password did not protect her.
  'F1018.001': passwordResetScenes,             // Account Takeover: Password Reset (F1018.001) under Initial Access (TA0001) — v25.7.0.16
                                                //   Andre Lewis (JNCB Personal customer, Kingston, age 34, accountant).
                                                //   Composite case grounded in NCB Special Investigations public
                                                //   reporting (Dane Nicholson 2022) and Shelly-ann Watt Gammon
                                                //   silent-compromise case pattern (Jamaica Observer 2023). The
                                                //   silent attack vector — victim never contacted; OSINT → knowledge-
                                                //   based reset-flow abuse → fraudulent transfer; discovered when
                                                //   payroll deposits to a balance J$340K lower than expected.
  'T1621': mfaFatigueScenes,                    // MFA Request Generation (T1621) under Initial Access (TA0001) — v25.7.0.18
                                                //   Pat Henriques (JNCB Personal customer, Mandeville, teacher,
                                                //   age 47). Composite case grounded in documented MFA fatigue
                                                //   pattern (Microsoft Threat Intel; Uber Sep 2022; Cisco Aug 2022).
                                                //   The bank's own push-MFA system is the attack vector,
                                                //   weaponized via 28-push bombing campaign at 9:47 PM Sunday
                                                //   until customer taps Approve to stop the buzzing.
                                                //   T1621 framework grid surfacing via add-t1621-technique.js — v25.7.0.18.1
  'F1072': insiderAccessScenes,                 // Insider Access Abuse (F1072) under Initial Access (TA0001) — v25.7.0.19
                                                //   Devon Walters (JNCB Personal Banker, Half-Way Tree, 6yr tenure,
                                                //   age 38). Composite case grounded in J$61M SIM-swap conviction
                                                //   (Oct 2025, two telco CSRs convicted) reframed for bank-insider
                                                //   standalone framing F1072 specifically addresses, plus BOJ
                                                //   2024-2025 reporting on disproportionate-value-per-incident
                                                //   insider pattern. Targets dormant high-balance victim profile;
                                                //   structures J$3.2M drain across 28 days under both supervisor-
                                                //   approval and customer-callback thresholds; caught by quarterly
                                                //   Internal Audit access-pattern review at 4.1x peer mean.
  'F1018': accountTakeoverScenes,               // Account Takeover (F1018) parent canonical under Initial Access (TA0001) — v25.7.0.20
                                                //   Karelle Bryan (JNCB Fraud Operations senior analyst, 4yr tenure)
                                                //   triages three overnight ATO disputes — Andre Lewis (.001 Password
                                                //   Reset, reused from v25.7.0.16), Marcus Bryan (.002 Credential
                                                //   Stuffing, LinkedIn 2024 breach), Tashana Hall (.003 Session
                                                //   Cookie Theft, MBJ airport WiFi). Pedagogical job: teach DEFENDER
                                                //   perspective (variant diagnostic protocol, per-variant tracking,
                                                //   why variant resolution matters more than parent-category
                                                //   resolution).
  'T1111': mfaInterceptionScenes,               // MFA Interception (T1111) under Initial Access (TA0001) — v25.7.0.21
                                                //   Ricardo Powell (NCB business customer, Kingston pharma sales,
                                                //   age 41). Composite case grounded in Zimperium 2024 mobile
                                                //   banking trojan reporting (SharkBot Caribbean targeting), Group-IB
                                                //   2025 malware atlas, and BOJ 2024-2025 internet-banking fraud
                                                //   reporting. Side-loaded "free PDF reader" APK from WhatsApp link
                                                //   forwards SMS OTP to C2 in Bulgaria; attacker has correct
                                                //   credentials + correct OTP; login completes; J$1.4M out in
                                                //   4 minutes. Closes Phase 1 Initial Access animation set.
  'F1008.001': silentAlarmScenes,               // Account Manipulation: Change E-Delivery / Notification Settings (F1008.001) under Positioning (FA0001) — v25.7.0.27
                                                //   Karen Ferguson (CIBC FirstCaribbean small-business customer,
                                                //   Ocho Rios salon proprietor, age 44). Composite case grounded in
                                                //   BOJ 2024-2025 internet-banking fraud reporting (statement-
                                                //   quietly-rerouted pattern), FFIEC and FinCEN BEC investigation
                                                //   documentation, and Caribbean small-business banking norms
                                                //   (weekly SMS-digest as primary customer-side detection channel).
                                                //   Two-day-old phished credentials → Sunday 02:14 AM session →
                                                //   four notification-settings flipped to suppression in 78
                                                //   seconds → three-day Positioning gap → Wednesday J$3.6M out
                                                //   to mule chain. Customer doesn't notice for 9 days because
                                                //   every alert dispatched correctly to attacker-controlled
                                                //   inbox. Pedagogical insight: the silence is the signal.
                                                //   Opens Phase 2 Positioning animation set; first non-Phase-1
                                                //   animation; CIBC FirstCaribbean is the 4th institution
                                                //   represented (balancing prior NCB×3 / JNCB×4 / Scotia×1).
  'F1043': cardTestingScenes,                   // Card Testing (F1043) under Positioning (FA0001) — v25.7.0.28
                                                //   Anthony Spencer (Sagicor Visa cardholder, graphic designer,
                                                //   Spanish Town JM, age 36). Composite case grounded in Caribbean
                                                //   retail breach patterns (TT/JM/BB e-commerce 2023-2025), Visa /
                                                //   Mastercard / Aite-Novarica reporting on testing-bot
                                                //   infrastructure ($0.99-$4.99 amount band, low-friction merchant
                                                //   targeting), and FFIEC velocity-rule tuning gap documentation.
                                                //   Day 7 post-breach 1,847-card lot validation pass → 50 cards in
                                                //   14 min on one merchant → first-wave detection that does not
                                                //   happen → distributed pivot across 7 merchants → 33% live rate
                                                //   confirmed → 612 validated cards listed at $4.50 each → Anthony's
                                                //   card used for $1,247 fraud at Day +28 (blocked by standard
                                                //   velocity rules at the full-fraud layer, not at the testing
                                                //   layer where prevention was actually possible). Pedagogical
                                                //   insight: the $0.99 charge IS the fraud signal. Sagicor is the
                                                //   5th institution represented (after NCB×3, JNCB×4, Scotia×1,
                                                //   CIBC×1).
  // Phase 1 Initial Access — COMPLETE (v25.7.0.12 through v25.7.0.21):
  //   F1081 Phishing (v25.7.0.12), F1088 Vishing (v25.7.0.13),
  //   T1451 SIM Swap (v25.7.0.14), F1018.001 Password Reset (v25.7.0.16),
  //   T1621 MFA Fatigue (v25.7.0.18 + .18.1 grid surfacing),
  //   F1072 Insider Access (v25.7.0.19), F1018 ATO parent triage (v25.7.0.20),
  //   T1111 MFA Interception (v25.7.0.21).
  //
  // Phase 2 Positioning (FA0001) — IN PROGRESS:
  //   F1008.001 Silent Alarm (v25.7.0.27),
  //   F1043 Card Testing (v25.7.0.28, this release).
  //   Next: F1042 Card Dump Capture — closes the card-data
  //   supply-chain mini-arc.
}

const ENGINE_MAP = {
  'three-zone': ProcessAnimation,                       // IVR Discovery (F1073), Gather Victim Information (F1067)
  'timeline-threshold': TimelineThresholdAnimation,     // Structuring (F1087)
  'multi-actor-sequence': MultiActorSequenceAnimation,  // Phishing (F1081), future Vishing + SIM Swap
  // Future shapes added here as engines come online
}

/* ─────────────────────────────────────────────────────────────────────────
   TechniqueDetailSidebar — v25.7.0.8

   Slide-over panel showing full content for one F3 technique.

   Modeled on the existing MitreTechniqueSidebar (Scenario page) for
   visual + interaction consistency. Same backdrop + slide animation,
   same fetch-on-demand pattern, same cross-link section. Different
   data source: pulls from /api/framework/techniques and
   /api/framework/techniques/:id/cross-refs (v25.7.0.8 endpoints).

   Props:
     open        — boolean, sidebar visible/hidden
     techniqueId — F3 technique ID to load
     onClose     — callback when user dismisses

   Sections (top to bottom):
     - Header: technique ID + name + parent context (if sub-technique)
     - Description: full F3 description from MITRE Excel
     - Roles: which roles primarily act on / observe this technique
     - Mitigation: PLACEHOLDER for v25.7.0.8 — content authoring planned
                   for later releases (per-tactic role authoring arc)
     - Animation: PLACEHOLDER for v25.7.0.9+ — five high-value
                  techniques will get bespoke React/SVG animations
                  showing the technique's process (e.g. 3DS Bypass MITM
                  flow, Sub-threshold structuring threshold-relative
                  pattern, etc.)
     - Demonstrated in: scenarios + storyboard beats that reference
       this technique. Each is a clickable jump.
     - Sub-techniques: if this is a parent, list its children with
       click-to-load-this-sidebar-for-child behavior
     - Sibling sub-techniques: if this is a sub-technique, list
       siblings for lateral exploration

   Pedagogical insight (OBS-027):
     The flat grid lets a trainee READ a technique. This sidebar lets
     them EXPLORE it — see where it appears in scenarios, jump to a
     beat that demonstrates it, navigate to siblings for comparative
     learning. Definitions are dead; navigable networks are alive.
   ───────────────────────────────────────────────────────────────────── */

export default function TechniqueDetailSidebar({ open, techniqueId, onClose }) {
  const [technique, setTechnique] = useState(null)
  const [crossRefs, setCrossRefs] = useState({ scenarios: [], beats: [] })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || !techniqueId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setTechnique(null)
    setCrossRefs({ scenarios: [], beats: [] })

    Promise.all([
      api.getTechnique(techniqueId),
      api.getTechniqueCrossRefs(techniqueId).catch(() => ({ scenarios: [], beats: [] })),
    ])
      .then(([techRes, refsRes]) => {
        if (cancelled) return
        setTechnique(techRes.technique || null)
        setCrossRefs({
          scenarios: refsRes.scenarios || [],
          beats:     refsRes.beats     || [],
        })
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load technique')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, techniqueId])

  function handleScenarioJump(scenarioId) {
    onClose()
    setTimeout(() => navigate(`/scenarios/${scenarioId}`), 150)
  }

  function handleBeatJump(scenarioId) {
    onClose()
    // Beats are inside the storyboard view of a scenario. Jump to the
    // scenario page; the storyboard collapsible there can be expanded
    // by the user. (Deep-link to specific beat is a future enhancement.)
    setTimeout(() => navigate(`/scenarios/${scenarioId}`), 150)
  }

  // Internal navigation between techniques without closing the sidebar
  // (lets user click sibling/parent/child within the sidebar to explore
  // the network laterally)
  //
  // v25.7.0.20.2: paired with internalNavTick counter to force the
  // re-fetch effect to fire even when navigating to the same techId
  // a second time. Without the counter, React skips the state update
  // (same-value), the [internalTechId] effect doesn't fire, and the
  // navigation appears to do nothing. Symptom from v25.7.0.20.1: the
  // "F1018" link inside F1018.001's sidebar worked the first time
  // but not on repeat after closing and re-opening the sidebar.
  const [internalTechId, setInternalTechId] = useState(null)
  const [internalNavTick, setInternalNavTick] = useState(0)
  // When a navigation happens internally, swap techniqueId. Outer prop
  // changes still take effect via the useEffect dependency.
  const effectiveTechId = internalTechId || techniqueId

  // v25.7.0.9.2 + v25.7.0.9.3: collapsibility state.
  //
  // v25.7.0.9.2 made Description and Animation collapsible.
  // v25.7.0.9.3 extends to all content-heavy sections:
  //   description, mitigation, animation, crossrefs, subtechniques, siblings
  // (Roles stays always-visible — it's a chip row, no value in collapsing.)
  //
  // collapsedSections: Set of section IDs that are currently COLLAPSED.
  // Membership = collapsed; absence = expanded. Default state is empty
  // Set (everything expanded). State resets on technique change.
  //
  // Why Set instead of object-of-booleans: easier to add/remove section
  // IDs, easier to reason about ("is X collapsed? collapsedSections.has(X)").
  // Re-renders are still O(1) on toggle.
  //
  // animationPauseSignal: a counter that bumps every time the animation
  // section is collapsed. ProcessAnimation watches this prop and pauses
  // when it changes. Counter (vs. boolean) so re-collapsing re-pauses
  // even if user expanded → played → collapsed again.
  const [collapsedSections, setCollapsedSections] = useState(() => new Set())
  const [animationPauseSignal, setAnimationPauseSignal] = useState(0)

  function isExpanded(sectionId) {
    return !collapsedSections.has(sectionId)
  }

  function toggleSection(sectionId) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      const wasCollapsed = next.has(sectionId)
      if (wasCollapsed) {
        next.delete(sectionId) // expand
      } else {
        next.add(sectionId)    // collapse
        // Special case: if the animation section is collapsing, bump
        // the pause signal so the animation pauses
        if (sectionId === 'animation') {
          setAnimationPauseSignal(c => c + 1)
        }
      }
      return next
    })
  }

  // Re-fetch when internal nav happens
  // v25.7.0.20.2: dependency includes internalNavTick so re-navigating
  // to the same techId still triggers a re-fetch.
  useEffect(() => {
    if (!open || !internalTechId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setTechnique(null)
    setCrossRefs({ scenarios: [], beats: [] })
    Promise.all([
      api.getTechnique(internalTechId),
      api.getTechniqueCrossRefs(internalTechId).catch(() => ({ scenarios: [], beats: [] })),
    ])
      .then(([techRes, refsRes]) => {
        if (cancelled) return
        setTechnique(techRes.technique || null)
        setCrossRefs({
          scenarios: refsRes.scenarios || [],
          beats:     refsRes.beats     || [],
        })
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load technique')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, internalTechId, internalNavTick])

  // Reset internal nav when the parent prop changes (user opens sidebar
  // for a new technique from the grid)
  useEffect(() => {
    setInternalTechId(null)
    // v25.7.0.20.2: reset tick alongside internalTechId so subsequent
    // internal navs start fresh and aren't shifted by stale tick value
    setInternalNavTick(0)
    // v25.7.0.9.2 + v25.7.0.9.3: reset all collapse state — each new
    // technique starts fresh with every section expanded
    setCollapsedSections(new Set())
  }, [techniqueId])

  // v25.7.0.9.2 + v25.7.0.9.3: also reset collapse state when user
  // navigates laterally within the sidebar (sibling/parent/child link
  // click). Each navigation = fresh start.
  useEffect(() => {
    setCollapsedSections(new Set())
  }, [internalTechId])

  function navigateInternal(newId) {
    setInternalTechId(newId)
    // v25.7.0.20.2: bump tick so the re-fetch effect fires even when
    // newId equals the current internalTechId (same-value setState
    // is a React no-op; the tick guarantees the effect dependency
    // changes regardless).
    setInternalNavTick(t => t + 1)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              // v25.7.0.9.1: animation-equipped techniques get a much
              // wider panel — min(1400px, 95vw) — because the 3-zone
              // canvas + detection controls need real estate to avoid
              // scrolling. The backdrop-dim treatment + close X already
              // makes this effectively a focused modal.
              //
              // Non-animation techniques stay at 600px because text
              // content reads better in narrower columns (typographic
              // best practice: 60-80 chars per line). A 1400px-wide
              // column of placeholder text would be harder to read.
              width: '100%',
              maxWidth: technique && ANIMATION_MAP[technique.id]
                ? 'min(1400px, 95vw)'
                : 600,
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
              transition: 'max-width 200ms',
            }}
            role="dialog"
            aria-label={technique ? `Technique: ${technique.name}` : 'Technique'}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                  fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  <span>F3 Technique</span>
                  {technique?.id && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {technique.id}
                    </span>
                  )}
                  {technique?.tactic && (
                    <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
                      · {technique.tactic.id}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
                  lineHeight: 1.2, color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {loading ? 'Looking up…' : (technique?.name || 'Unknown technique')}
                </div>
                {technique?.parent && (
                  <button
                    onClick={() => navigateInternal(technique.parent.id)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--ink-soft)', marginTop: 6,
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    Sub-technique of{' '}
                    <strong style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      {technique.parent.id}
                    </strong>
                    {' '}· {technique.parent.name}
                  </button>
                )}
                {technique?.tactic && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11.5,
                    color: 'var(--ink-faint)', marginTop: 6,
                  }}>
                    Tactic: {technique.tactic.name}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', padding: 6, cursor: 'pointer',
                  color: 'var(--ink-faint)', fontSize: 20, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '24px 24px 40px',
            }}>
              {error && (
                <div style={{
                  padding: '14px 16px', marginBottom: 20,
                  background: 'rgba(184, 81, 61, 0.08)',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  color: 'var(--accent-hi, #d66e5a)',
                  fontSize: 13.5,
                }}>
                  {error}
                </div>
              )}

              {loading && !error && (
                <div style={{
                  padding: 40, textAlign: 'center',
                  color: 'var(--ink-faint)', fontStyle: 'italic',
                }}>
                  Loading technique detail…
                </div>
              )}

              {!loading && technique && (
                <>
                  {/* Description — v25.7.0.9.2: collapsible. Default
                      expanded; user can collapse once read.
                      v25.7.0.9.3: uses Set-based collapse state. */}
                  {technique.description && (
                    <Section
                      title="Description"
                      collapsible
                      expanded={isExpanded('description')}
                      onToggleExpand={() => toggleSection('description')}
                    >
                      <p style={proseStyle}>{technique.description}</p>
                    </Section>
                  )}

                  {/* Role relevance */}
                  <Section title="Roles primarily acting on this technique">
                    <RoleChips roles={technique.roles} />
                  </Section>

                  {/* Mitigation guidance — placeholder for v25.7.0.8.
                      v25.7.0.9.3: collapsible. */}
                  <Section
                    title="Mitigation guidance"
                    collapsible
                    expanded={isExpanded('mitigation')}
                    onToggleExpand={() => toggleSection('mitigation')}
                  >
                    <Placeholder>
                      Per-role mitigation guidance — what each role should
                      look for, ask, or do when this technique is suspected
                      — not yet authored for this technique. Content is
                      planned for the per-tactic role-authoring arc
                      (v25.7.0.10+).
                    </Placeholder>
                  </Section>

                  {/* v25.7.0.9: Animation — renders the appropriate
                      engine if scene data is registered for this
                      technique in ANIMATION_MAP. Otherwise falls back
                      to placeholder.

                      v25.7.0.9.2: collapsible. When collapsed, animation
                      auto-pauses (via externalPauseSignal counter) but
                      retains its current stage. User clicks Play to resume.

                      v25.7.0.9.3: uses Set-based collapse state; pause
                      side-effect handled inside toggleSection.

                      v25.7.0.11: ENGINE_MAP routes by scene config's
                      `engine` field. Default 'three-zone' preserves
                      backward compat with F1073 IVR Discovery and
                      F1067 OSINT Profiling (which don't declare an
                      engine field). Sub-threshold structuring scene
                      file declares engine: 'timeline-threshold' and
                      routes to TimelineThresholdAnimation. */}
                  <Section
                    title="How this technique works"
                    collapsible
                    expanded={isExpanded('animation')}
                    onToggleExpand={() => toggleSection('animation')}
                  >
                    {(() => {
                      const scenes = ANIMATION_MAP[technique.id]
                      if (!scenes) {
                        return (
                          <Placeholder>
                            Interactive animation showing the technique's
                            step-by-step process is planned for v25.7.0.9+.
                            Animations shipped: IVR Discovery (F1073)
                            under Reconnaissance (TA0043), v25.7.0.9;
                            Gather Victim Information (F1067) under
                            Reconnaissance (TA0043), v25.7.0.10;
                            Structuring (F1087) under Monetization
                            (FA0002), v25.7.0.11; Phishing (F1081)
                            under Initial Access (TA0001), v25.7.0.12;
                            Vishing (F1088) under Initial Access
                            (TA0001), v25.7.0.13; SIM Card Swap (T1451)
                            under Initial Access (TA0001), v25.7.0.14.
                            More animations to follow per
                            ANIMATION-TRIAGE.md.
                          </Placeholder>
                        )
                      }
                      const engineKey = scenes.engine || 'three-zone'
                      const Engine = ENGINE_MAP[engineKey]
                      if (!Engine) {
                        return (
                          <Placeholder>
                            Animation engine "{engineKey}" not registered.
                            Check ENGINE_MAP in TechniqueDetailSidebar.jsx.
                          </Placeholder>
                        )
                      }
                      return (
                        <Engine
                          scenes={scenes}
                          externalPauseSignal={animationPauseSignal}
                        />
                      )
                    })()}
                  </Section>

                  {/* Demonstrated in — scenarios. v25.7.0.9.3: collapsible. */}
                  {crossRefs.scenarios.length > 0 && (
                    <Section
                      title={`Demonstrated in ${crossRefs.scenarios.length} ${crossRefs.scenarios.length === 1 ? 'scenario' : 'scenarios'}`}
                      collapsible
                      expanded={isExpanded('scenarios')}
                      onToggleExpand={() => toggleSection('scenarios')}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {crossRefs.scenarios.map(s => (
                          <CrossRefRow
                            key={s.id}
                            id={s.id}
                            title={s.title}
                            severity={s.severity}
                            onClick={() => handleScenarioJump(s.id)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Demonstrated in — storyboard beats. v25.7.0.9.3: collapsible. */}
                  {crossRefs.beats.length > 0 && (
                    <Section
                      title={`Featured in ${crossRefs.beats.length} storyboard ${crossRefs.beats.length === 1 ? 'beat' : 'beats'}`}
                      collapsible
                      expanded={isExpanded('beats')}
                      onToggleExpand={() => toggleSection('beats')}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {crossRefs.beats.map(b => (
                          <BeatRow
                            key={b.beatId}
                            day={b.day}
                            scenarioId={b.scenarioId}
                            scenarioTitle={b.scenarioTitle}
                            headline={b.headline}
                            onClick={() => handleBeatJump(b.scenarioId)}
                          />
                        ))}
                      </div>
                    </Section>
                  )}

                  {crossRefs.scenarios.length === 0 && crossRefs.beats.length === 0 && (
                    <Section
                      title="Cross-references"
                      collapsible
                      expanded={isExpanded('crossrefs-empty')}
                      onToggleExpand={() => toggleSection('crossrefs-empty')}
                    >
                      <Placeholder>
                        This technique isn't currently demonstrated in any
                        authored scenario or storyboard beat. Scenario
                        authoring is ongoing — SC008/SC011/SC013 beats
                        planned for v25.7.0.13+.
                      </Placeholder>
                    </Section>
                  )}

                  {/* Sub-techniques (if parent). v25.7.0.9.3: collapsible. */}
                  {technique.children && technique.children.length > 0 && (
                    <Section
                      title={`${technique.children.length} sub-${technique.children.length === 1 ? 'technique' : 'techniques'}`}
                      collapsible
                      expanded={isExpanded('subtechniques')}
                      onToggleExpand={() => toggleSection('subtechniques')}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {technique.children.map(c => (
                          <button
                            key={c.id}
                            onClick={() => navigateInternal(c.id)}
                            style={lateralButtonStyle}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11.5,
                              color: 'var(--accent)', marginRight: 10, fontWeight: 600,
                            }}>
                              {c.id}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Siblings (if sub-technique). v25.7.0.9.3: collapsible. */}
                  {technique.siblings && technique.siblings.length > 0 && (
                    <Section
                      title="Sibling sub-techniques"
                      collapsible
                      expanded={isExpanded('siblings')}
                      onToggleExpand={() => toggleSection('siblings')}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {technique.siblings.map(s => (
                          <button
                            key={s.id}
                            onClick={() => navigateInternal(s.id)}
                            style={lateralButtonStyle}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-hi)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper-dim)' }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11.5,
                              color: 'var(--accent)', marginRight: 10, fontWeight: 600,
                            }}>
                              {s.id}
                            </span>
                            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─── Section wrapper ─────────────────────────────────────────────── */
/* ─── Section wrapper ─────────────────────────────────────────────
   v25.7.0.9.2: now supports optional collapsibility. Non-collapsible
   call sites (Roles, Mitigation, Cross-refs, Sub-techniques, Siblings)
   pass no `collapsible` prop — behavior unchanged. Description and
   "How this technique works" pass `collapsible` + controlled state
   so the sidebar can drive collapse/expand and pause animation when
   the animation section collapses.
   ──────────────────────────────────────────────────────────────── */
function Section({ title, children, collapsible, expanded, onToggleExpand }) {
  const headerCommonStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 11.5,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'var(--ink-faint)', fontWeight: 600,
    marginBottom: 10,
    paddingBottom: 6, borderBottom: '1px solid var(--rule)',
  }
  if (!collapsible) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={headerCommonStyle}>{title}</div>
        {children}
      </div>
    )
  }
  // Collapsible variant
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={onToggleExpand}
        style={{
          ...headerCommonStyle,
          width: '100%',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          paddingBottom: 6,
          // header text inherits from common style
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-faint)' }}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span style={{
          fontSize: 13,
          transition: 'transform 200ms',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
          marginLeft: 8,
        }}>→</span>
      </button>
      {expanded && children}
    </div>
  )
}

/* ─── Roles chip strip ────────────────────────────────────────────── */
const ROLE_LABELS = {
  teller: 'Teller',
  analyst: 'Analyst',
  soc: 'SOC',
  executive: 'Executive',
}
function RoleChips({ roles }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
        const active = (roles || []).includes(roleKey)
        return (
          <span
            key={roleKey}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '5px 10px',
              borderRadius: 4,
              fontWeight: 600,
              background: active ? 'rgba(184, 81, 61, 0.15)' : 'var(--paper-dim)',
              color: active ? 'var(--accent-hi, #d66e5a)' : 'var(--ink-faint)',
              border: '1px solid',
              borderColor: active ? 'rgba(214, 110, 90, 0.3)' : 'var(--rule)',
              opacity: active ? 1 : 0.6,
            }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

/* ─── Placeholder section ─────────────────────────────────────────── */
function Placeholder({ children }) {
  return (
    <div style={{
      fontStyle: 'italic',
      color: 'var(--ink-faint)',
      fontSize: 13.5,
      padding: '12px 14px',
      borderLeft: '2px dashed var(--rule-strong, #3a302a)',
      background: 'rgba(255,255,255,0.012)',
      borderRadius: '0 6px 6px 0',
      lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}

/* ─── Cross-reference row (scenario) ──────────────────────────────── */
function CrossRefRow({ id, title, severity, onClick }) {
  const sevColor =
    severity === 'high'   ? 'var(--danger, #a14040)' :
    severity === 'medium' ? 'var(--warning, #c79a3a)' :
                            'var(--success, #6b8e5a)'
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--paper-dim)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        font: 'inherit',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'var(--paper-hi)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)'
        e.currentTarget.style.background = 'var(--paper-dim)'
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
        color: 'var(--accent)', fontWeight: 600, flexShrink: 0, paddingTop: 1,
      }}>
        {id}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>
        {title}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: sevColor, fontWeight: 600,
        flexShrink: 0, padding: '2px 6px', border: `1px solid ${sevColor}`,
        borderRadius: 3,
      }}>
        {severity}
      </span>
    </button>
  )
}

/* ─── Beat row ────────────────────────────────────────────────────── */
function BeatRow({ day, scenarioId, scenarioTitle, headline, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--paper-dim)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        font: 'inherit',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.background = 'var(--paper-hi)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)'
        e.currentTarget.style.background = 'var(--paper-dim)'
      }}
    >
      <div style={{
        flexShrink: 0, paddingTop: 1, textAlign: 'center', minWidth: 36,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
          color: 'var(--ink)', lineHeight: 1,
        }}>
          D{day ?? '?'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 4 }}>
          {headline}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--ink-faint)', letterSpacing: '0.06em',
        }}>
          {scenarioId} · {scenarioTitle}
        </div>
      </div>
    </button>
  )
}

const proseStyle = {
  fontSize: 15,
  lineHeight: 1.65,
  color: 'var(--ink-soft)',
  margin: 0,
}

const lateralButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  background: 'var(--paper-dim)',
  border: '1px solid var(--rule)',
  borderRadius: 5,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'inherit',
  font: 'inherit',
  transition: 'background 150ms',
}
