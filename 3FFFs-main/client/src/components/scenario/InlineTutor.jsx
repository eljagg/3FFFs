import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api.js'

/* -------------------------------------------------------------------------
   InlineTutor — a slide-over panel that lets the user ask Claude about the
   stage they are currently on, without leaving the scenario.

   Why this matters: the standalone /tutor page works, but it forces the user
   to leave the scenario, type their question with no context, and lose their
   place. Embedding the tutor inline turns it from a "destination" into an
   "assistant" — the way the AI tutor was always meant to feel.

   Pre-loads the conversation with stage context (scenario title, stage
   heading, technique, narrative) so Claude already knows what we are
   talking about. Suggests three starter questions tuned to the current
   stage so the user can tap rather than type.
------------------------------------------------------------------------- */

export default function InlineTutor({ open, onClose, stageContext, role }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Reset when context changes (different stage opens)
  useEffect(() => {
    if (open) {
      setMessages([])
      setInput('')
      // Focus the input after the slide-in completes
      setTimeout(() => inputRef.current?.focus(), 320)
    }
  }, [open, stageContext?.stage?.id])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send(text) {
    if (!text.trim() || sending) return
    const userMsg = { role: 'user', content: text.trim() }
    const history = [...messages]
    setMessages([...history, userMsg])
    setInput('')
    setSending(true)

    try {
      const { reply } = await api.tutorChat({
        message: text.trim(),
        history,
        role,
        stageContext: stageContext ? {
          scenarioTitle: stageContext.scenario?.title,
          scenarioSummary: stageContext.scenario?.summary,
          stageHeading: stageContext.stage?.heading,
          stageNarrative: stageContext.stage?.narrative,
          stageQuestion: stageContext.stage?.question,
          techniqueId: stageContext.technique?.id,
          techniqueName: stageContext.technique?.name,
          tacticName: stageContext.tactic?.name,
        } : null,
      })
      setMessages([...history, userMsg, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages([...history, userMsg, {
        role: 'assistant',
        content: 'Could not reach the Tutor: ' + err.message + '. Try again in a moment.',
        error: true,
      }])
    } finally {
      setSending(false)
    }
  }

  // Stage-specific starter prompts
  const starters = stageContext ? [
    `Why is "${stageContext.technique?.name || 'this technique'}" the right framing for this stage?`,
    `What signals would I look for in real life to spot this earlier?`,
    `Is there a real Caribbean fraud case that matches this pattern?`,
  ] : [
    'How do I think about this stage?',
    'What controls would prevent this in real life?',
    'Quiz me on what I just answered.',
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 520,
              background: 'var(--paper)', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              borderLeft: '1px solid var(--rule)',
            }}
            role="dialog"
            aria-label="AI Tutor"
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--success)', boxShadow: '0 0 8px var(--success)',
                  }} />
                  AI Tutor · this stage
                </div>
                {stageContext && (
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500,
                    lineHeight: 1.3, color: 'var(--ink)',
                  }}>
                    {stageContext.stage?.heading || 'Ask about this stage'}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close tutor"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 6, color: 'var(--ink-faint)', fontSize: 22, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: 'auto', padding: '16px 24px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              {messages.length === 0 && (
                <div>
                  <div style={{
                    fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6,
                    marginBottom: 14,
                  }}>
                    Ask me anything about this stage — the technique, the signals, what you would do in real life. I have full context on where you are.
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--ink-faint)',
                    marginBottom: 8,
                  }}>Try asking</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {starters.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => send(s)}
                        style={{
                          padding: '12px 14px', textAlign: 'left',
                          background: 'var(--paper-hi)', border: '1px solid var(--rule)',
                          borderRadius: 'var(--radius)', cursor: 'pointer',
                          fontSize: 13, lineHeight: 1.45, color: 'var(--ink)',
                          transition: 'all var(--dur) ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '12px 14px',
                    background: m.role === 'user' ? 'var(--ink)' : 'var(--paper-hi)',
                    color: m.role === 'user' ? 'var(--paper)' : 'var(--ink)',
                    borderRadius: 'var(--radius-lg)',
                    border: m.role === 'assistant' ? '1px solid var(--rule)' : 'none',
                    fontSize: 13.5, lineHeight: 1.55,
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    whiteSpace: 'pre-wrap',
                    ...(m.error ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}),
                  }}>
                  {m.content}
                </motion.div>
              ))}

              {sending && (
                <div style={{
                  alignSelf: 'flex-start', padding: '12px 14px',
                  background: 'var(--paper-hi)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--rule)', display: 'flex', gap: 6,
                }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-faint)' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input) }}
              style={{
                padding: '14px 20px', borderTop: '1px solid var(--rule)',
                background: 'var(--paper-hi)',
                display: 'flex', gap: 8,
              }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about this stage…"
                disabled={sending}
                style={{
                  flex: 1, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
                  background: 'var(--paper)', color: 'var(--ink)',
                  border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                style={{
                  padding: '11px 18px', fontSize: 13, fontWeight: 500,
                  background: input.trim() && !sending ? 'var(--ink)' : 'var(--rule)',
                  color: input.trim() && !sending ? 'var(--paper)' : 'var(--ink-faint)',
                  border: 'none', borderRadius: 'var(--radius)',
                  cursor: input.trim() && !sending ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}>
                Send
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
