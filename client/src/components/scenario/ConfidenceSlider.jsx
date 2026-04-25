import { motion } from 'framer-motion'

/* -------------------------------------------------------------------------
   ConfidenceSlider — collects a 1-5 confidence rating BEFORE the user
   commits to an answer.

   v24.1: gains a `highlightWaitingForChoice` prop that paints a soft pulse
   on the dots when no choice has been made yet. Replaces the v24 pattern of
   dimming the option buttons (which made dark-mode text hard to read).

   Pedagogical purpose: forcing users to commit to a confidence level surfaces
   metacognitive blind spots ("I was certain and I was wrong"), which research
   shows is one of the strongest drivers of behavior change in adult learners.

   Visually a row of 5 dots that fill in as the user clicks. Required before
   the answer buttons become clickable; locked once an answer is chosen so we
   capture the genuine pre-decision belief, not a post-hoc rationalization.
------------------------------------------------------------------------- */

const LABELS = [
  '',
  'Pure guess',
  'Leaning',
  'Fairly sure',
  'Confident',
  'Certain',
]

export default function ConfidenceSlider({ value, onChange, locked, highlightWaitingForChoice }) {
  const dots = [1, 2, 3, 4, 5]

  return (
    <motion.div
      animate={highlightWaitingForChoice ? {
        borderColor: ['var(--rule-strong)', 'var(--accent)', 'var(--rule-strong)'],
      } : {}}
      transition={highlightWaitingForChoice ? {
        duration: 2.4, repeat: Infinity, ease: 'easeInOut',
      } : {}}
      style={{
        marginBottom: 18,
        padding: '14px 16px',
        background: 'var(--paper-dim)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--rule-strong)',
      }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600,
        }}>
          How confident are you, before you answer?
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
                width: 28, height: 28, borderRadius: '50%',
                border: '1.5px solid', cursor: locked ? 'default' : 'pointer',
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
