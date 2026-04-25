import { useState } from 'react'
import { motion } from 'framer-motion'

/* -------------------------------------------------------------------------
   ConfidenceSlider — collects a 1-5 confidence rating BEFORE the user
   commits to an answer.

   v25.1.1 fix: previous versions used --paper-hi for the slider background,
   which is the same tone the stage panel uses. The slider visually merged
   into the panel — no perceptible "card on a card" lift. Now the slider
   uses --paper-dim with a thicker accent left-stripe and a stronger inner
   shadow so it reads as a clearly distinct, elevated section regardless of
   what surface it sits on.

   Always-on visual identity (every mount):
     - 4px accent left-stripe (was 3px)
     - --paper-dim background (was --paper-hi which merged with the panel)
     - Bolder "How confident are you?" label
     - Subtle inset shadow on the inner edge for depth

   First-mount-per-session only (discovery treatment, unchanged from v24.2):
     - "NEW" pill
     - Soft accent glow that fades in/out

   Pedagogical purpose: forcing users to commit to a confidence level surfaces
   metacognitive blind spots ("I was certain and I was wrong"), which research
   shows is one of the strongest drivers of behavior change in adult learners.
------------------------------------------------------------------------- */

const LABELS = [
  '',
  'Pure guess',
  'Leaning',
  'Fairly sure',
  'Confident',
  'Certain',
]

// Module-level flag so the "NEW" pill and mount glow only show on the first
// confidence slider a user encounters in this browser session. Subsequent
// scenarios in the same session do not repeat the discovery treatment.
let SEEN_THIS_SESSION = false

export default function ConfidenceSlider({ value, onChange, locked, highlightWaitingForChoice }) {
  const dots = [1, 2, 3, 4, 5]

  // Decide once-per-mount whether THIS instance gets the discovery flourish.
  // If the user has already seen it this session, no NEW pill, no glow.
  const [showDiscovery] = useState(() => {
    if (SEEN_THIS_SESSION) return false
    SEEN_THIS_SESSION = true
    return true
  })

  // Once the user picks a value, drop the NEW pill — they have engaged with it.
  const showNewPill = showDiscovery && value === 0 && !locked

  return (
    <motion.div
      initial={showDiscovery ? {
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 rgba(244, 115, 83, 0)',
      } : false}
      animate={{
        ...(highlightWaitingForChoice ? {
          borderColor: ['var(--rule-strong)', 'var(--accent)', 'var(--rule-strong)'],
        } : {}),
        // Discovery glow fades in on mount, then fades out after ~1.4s.
        // Returning users (showDiscovery === false) skip this entirely.
        ...(showDiscovery ? {
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 rgba(244, 115, 83, 0)',
            'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 6px rgba(244, 115, 83, 0.18)',
            'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0 rgba(244, 115, 83, 0)',
          ],
        } : {}),
      }}
      transition={{
        ...(highlightWaitingForChoice ? {
          borderColor: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        } : {}),
        ...(showDiscovery ? {
          boxShadow: { duration: 1.6, ease: 'easeOut', delay: 0.2 },
        } : {}),
      }}
      style={{
        marginBottom: 18,
        padding: '16px 18px 16px 22px',
        // v25.1.1: --paper-dim sits BELOW the surrounding panel's --paper-hi,
        // so the slider reads as recessed (a panel-within-a-panel). Reads
        // correctly in light AND dark mode without depending on shadow alone.
        background: 'var(--paper-dim)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--rule-strong)',
        // v25.1.1: 4px stripe (was 3px) so the accent is unmistakable even
        // when the card sits flush against another --paper-hi surface.
        borderLeft: '4px solid var(--accent)',
        // Default inset highlight gives a hint of depth on both modes.
        // The animated boxShadow above will override during discovery glow.
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{
            // v25.1.1: bumped from 10px mono caps to 11px to match the
            // stage panel's other section labels ("YOUR DECISION",
            // "SIGNALS OBSERVED"). The slider now reads as a peer section
            // header, not a sub-label.
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.13em',
            textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 700,
          }}>
            How confident are you, before you answer?
          </div>
          {showNewPill && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontWeight: 700,
                padding: '2px 7px', borderRadius: 3,
                background: 'var(--accent)', color: '#fff',
                lineHeight: 1.2,
              }}
              aria-hidden="true"
            >New</motion.span>
          )}
        </div>
        {value > 0 && (
          <motion.div
            key={value}
            initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }}
            style={{
              fontSize: 13, fontWeight: 500,
              color: locked ? 'var(--ink-soft)' : 'var(--ink)',
            }}>
            {LABELS[value]}
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {dots.map(n => {
          const active = value >= n
          const isCurrentMax = value === n
          return (
            <motion.button
              key={n}
              onClick={() => !locked && onChange(n)}
              disabled={locked}
              whileHover={!locked ? { scale: 1.15 } : {}}
              whileTap={!locked ? { scale: 0.92 } : {}}
              animate={{
                backgroundColor: active ? 'var(--accent)' : 'var(--paper-hi)',
                borderColor: active ? 'var(--accent)' : 'var(--rule-strong)',
                scale: isCurrentMax ? 1.1 : 1,
              }}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                // v25.1.1: dot border 2px (was 1.5px) so unselected dots read
                // crisply against the now-darker --paper-dim card background.
                border: '2px solid', cursor: locked ? 'default' : 'pointer',
                padding: 0, fontFamily: 'var(--font-mono)', fontSize: 12,
                fontWeight: 600,
                color: active ? '#fff' : 'var(--ink-soft)',
                opacity: locked ? 0.85 : 1,
                transition: 'opacity var(--dur) ease',
              }}
              aria-label={`Confidence ${n}: ${LABELS[n]}`}
            >
              {n}
            </motion.button>
          )
        })}
        {value === 0 && !locked && (
          <span style={{
            marginLeft: 12, fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic',
          }}>
            Pick before you answer ↓
          </span>
        )}
      </div>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------
   ConfidenceFeedback — shown AFTER the answer is revealed.

   Pairs (confidence × correctness) into one of four learning moments:
     - Confident & correct: "Trust your judgment here"
     - Confident & wrong:    "This is the most valuable mistake — flag it"
     - Uncertain & correct:  "Good intuition; here's why it was right"
     - Uncertain & wrong:    "Not surprising — this is a knowledge gap"
------------------------------------------------------------------------- */
export function ConfidenceFeedback({ confidence, correct }) {
  if (!confidence || confidence < 1) return null

  const isHighConf = confidence >= 4
  const isLowConf = confidence <= 2

  let label, message, color
  if (correct && isHighConf) {
    color = 'var(--success)'
    label = 'Calibrated correctly'
    message = 'You were confident and you were right — trust this judgment in the field.'
  } else if (!correct && isHighConf) {
    color = 'var(--danger)'
    label = 'Calibration miss — worth noting'
    message = 'You were sure, but the right call was different. The metacognitive moment matters: flag this technique as one you should re-test.'
  } else if (correct && isLowConf) {
    color = 'var(--warning)'
    label = 'Right answer, low confidence'
    message = "You got it right but weren't sure why. Read the rationale carefully — building the explicit reasoning here will speed up future judgment."
  } else if (!correct && isLowConf) {
    color = 'var(--ink-soft)'
    label = 'Honest uncertainty'
    message = 'Knowing what you don\'t know is the start of learning. Take a beat with the rationale before continuing.'
  } else {
    // mid-confidence (3) — neutral framing
    color = correct ? 'var(--success)' : 'var(--warning)'
    label = correct ? 'Solid call' : 'Worth a closer look'
    message = correct
      ? 'You read the situation accurately. Notice the signals that drove your judgment — they are the ones to repeat.'
      : 'A common decision point. The rationale below explains what the more-experienced call would have been.'
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3, delay: 0.2 }}
      style={{
        marginTop: 14,
        padding: '12px 14px',
        borderLeft: `3px solid ${color}`,
        background: 'var(--paper-dim)',
        borderRadius: 'var(--radius)',
        fontSize: 13.5, lineHeight: 1.55,
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
        textTransform: 'uppercase', color, fontWeight: 700, marginBottom: 4,
      }}>{label}</div>
      <div style={{ color: 'var(--ink)' }}>{message}</div>
    </motion.div>
  )
}
