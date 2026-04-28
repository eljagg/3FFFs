import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../lib/user.jsx'
import { api } from '../lib/api.js'

const STARTERS_NEW_USER = [
  "What's the difference between F3 and MITRE ATT&CK?",
  'Which scenario should I start with?',
  'What are the 7 F3 tactics, in plain English?',
  'Why does Positioning matter so much?',
]

const STARTERS_RETURNING = [
  'What should I focus on next?',
  'Where are my biggest coverage gaps?',
  "Explain Monetization techniques I haven't seen yet.",
  'Quiz me on something I struggled with.',
]

export default function Tutor() {
  const { role } = useUser()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [hasProgress, setHasProgress] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    api.getProgress()
      .then(r => setHasProgress((r.progress?.scenariosCompleted ?? 0) > 0 || (r.progress?.quizzesAnswered ?? 0) > 0))
      .catch(() => {})
  }, [])

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
      const { reply } = await api.tutorChat({ message: text.trim(), history, role })
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

  const starters = hasProgress ? STARTERS_RETURNING : STARTERS_NEW_USER

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto', padding: '32px 28px 28px',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 76px)',
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: 'var(--success)',
            boxShadow: '0 0 10px var(--success)',
          }} />
          AI Tutor - Claude, with F3 knowledge of you
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500,
          lineHeight: 1.15, letterSpacing: '-0.02em',
        }}>Ask me anything about fraud.</h1>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        background: 'var(--paper-hi)', border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)', padding: '22px 24px', marginBottom: 14,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '8px 4px' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 18, maxWidth: 620 }}>
              I know the MITRE F3 framework and I can see your progress in the graph.
              Ask about specific techniques, work through a problem from a recent case,
              or just say "what should I do next."
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10,
            }}>Try asking</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {starters.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06 }}
                  onClick={() => send(s)}
                  whileHover={{ y: -1, borderColor: 'var(--ink)' }}
                  style={{
                    padding: '8px 14px', fontSize: 13,
                    background: 'var(--paper-dim)', border: '1px solid var(--rule)',
                    borderRadius: 999, textAlign: 'left', cursor: 'pointer',
                    color: 'var(--ink-soft)', transition: 'border-color var(--dur)',
                  }}
                >{s}</motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        </AnimatePresence>

        {sending && <TypingIndicator />}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} style={{ display: 'flex', gap: 10 }}>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
          }}
          placeholder="Ask about an F3 technique, a scenario, or what to learn next..."
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '12px 14px', fontSize: 14,
            background: 'var(--paper-hi)', border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius-lg)', outline: 'none', color: 'var(--ink)',
            minHeight: 44, maxHeight: 160, lineHeight: 1.5, fontFamily: 'inherit',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--ink)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--rule-strong)' }}
        />
        <motion.button
          type="submit" disabled={!input.trim() || sending}
          whileHover={input.trim() && !sending ? { scale: 1.04 } : {}}
          whileTap={input.trim() && !sending ? { scale: 0.97 } : {}}
          style={{
            padding: '0 20px', fontSize: 13, fontWeight: 500,
            background: input.trim() && !sending ? 'var(--ink)' : 'var(--paper-dim)',
            color: input.trim() && !sending ? 'var(--paper)' : 'var(--ink-faint)',
            border: 'none', borderRadius: 'var(--radius-lg)',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            transition: 'all var(--dur)', minWidth: 80,
          }}
        >{sending ? '...' : 'Send'}</motion.button>
      </form>
      <div style={{
        marginTop: 8, fontSize: 11, color: 'var(--ink-faint)',
        textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
      }}>Enter to send | Shift+Enter for newline</div>
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
    >
      <div style={{
        maxWidth: '85%', padding: '12px 16px',
        background: isUser ? 'var(--ink)' : (msg.error ? 'var(--danger-bg)' : 'transparent'),
        color: isUser ? 'var(--paper)' : (msg.error ? 'var(--danger)' : 'var(--ink)'),
        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
        border: isUser ? 'none' : (msg.error ? '1px solid var(--danger)' : '1px solid var(--rule)'),
        fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
      <style>{'@keyframes bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4 } 40% { transform: translateY(-6px); opacity: 1 } }'}</style>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 6, height: 6,
          borderRadius: '50%', background: 'var(--ink-faint)',
          animation: 'bounce 1.2s ease-in-out ' + (i * 0.15) + 's infinite',
        }} />
      ))}
      <span style={{
        marginLeft: 6, fontSize: 12, color: 'var(--ink-faint)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
      }}>Thinking...</span>
    </motion.div>
  )
}
