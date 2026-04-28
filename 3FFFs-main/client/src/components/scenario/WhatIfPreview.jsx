import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* -------------------------------------------------------------------------
   WhatIfPreview — shown AFTER a user answers a stage CORRECTLY, when one of
   the wrong options leads to a consequence stage.

   Today, consequence stages only fire if the user picks the wrong answer.
   That means the (often most-instructive) consequence branches only get
   seen when something goes wrong — i.e., users who answer well never see
   the cautionary tale at all.

   This component lets the user opt-in: "What would have happened if you'd
   picked X instead?" — they tap, see the consequence stage's narrative
   and signals inline, then continue. Zero new content needed; this multiplies
   the value of consequence stages already in the seed data.
------------------------------------------------------------------------- */

export default function WhatIfPreview({ stage, allStages }) {
  const [openIdx, setOpenIdx] = useState(null)

  if (!stage?.options?.length) return null

  // Find wrong options that lead to a consequence stage we can preview
  const branches = stage.options
    .map((opt, idx) => ({ opt, idx }))
    .filter(({ opt }) => !opt.correct && opt.leadsTo && allStages[opt.leadsTo])

  if (branches.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      style={{
        marginTop: 22,
        padding: '16px 20px',
        background: 'var(--paper-dim)',
        border: '1px dashed var(--warning)',
        borderRadius: 'var(--radius-lg)',
      }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--warning)', marginBottom: 6, fontWeight: 600,
      }}>
        What if you had chosen differently?
      </div>
      <div style={{
        fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 12,
      }}>
        You answered correctly — but in a real incident, your colleague might pick the wrong option. See how the attack would have unfolded:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {branches.map(({ opt, idx }) => {
          const consequence = allStages[opt.leadsTo]
          const isOpen = openIdx === idx
          return (
            <div key={idx}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 14px',
                  background: isOpen ? 'var(--paper-hi)' : 'transparent',
                  border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  transition: 'background var(--dur) ease',
                }}>
                <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, flex: 1 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--warning)',
                    marginRight: 8, letterSpacing: '0.06em',
                  }}>If "{opt.text.length > 60 ? opt.text.slice(0, 60) + '…' : opt.text}"</span>
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-faint)',
                    minWidth: 12,
                  }}>
                  →
                </motion.span>
              </button>

              <AnimatePresence>
                {isOpen && consequence && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}>
                    <div style={{
                      padding: '14px 16px', marginTop: 6,
                      background: 'var(--danger-bg)',
                      borderLeft: '3px solid var(--danger)',
                      borderRadius: 'var(--radius)',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--danger)', fontWeight: 600,
                        marginBottom: 6,
                      }}>
                        Consequence branch
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
                        marginBottom: 8, lineHeight: 1.3, color: 'var(--ink)',
                      }}>
                        {consequence.stage?.heading}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 10 }}>
                        {consequence.stage?.narrative}
                      </div>

                      {consequence.stage?.signals?.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                            textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 6,
                          }}>What teams would see</div>
                          <ul style={{
                            margin: 0, padding: 0, listStyle: 'none',
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}>
                            {consequence.stage.signals.map((sig, i) => {
                              const sigColor = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }[sig.severity] || 'var(--ink-faint)'
                              return (
                                <li key={i} style={{
                                  fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5,
                                  display: 'flex', gap: 10, alignItems: 'baseline',
                                }}>
                                  <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: 9, color: sigColor,
                                    minWidth: 48, textTransform: 'uppercase', letterSpacing: '0.08em',
                                  }}>{sig.severity}</span>
                                  <span>{sig.text}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}

                      <div style={{
                        marginTop: 10,
                        fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic',
                      }}>
                        This is the path your scenario would have taken if you had chosen this option.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
