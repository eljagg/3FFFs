import { useEffect, useRef, useState } from 'react'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'
import { useUser } from '../lib/user.jsx'

const SUGGESTIONS = [
  'What is F3 and how is it different from ATT&CK?',
  'Explain the Positioning tactic with a real example',
  'How should my team think about Monetization controls?',
  'What are the signs of a synthetic identity bust-out?',
  'Walk me through defending against Business Email Compromise',
]

export default function Tutor() {
  const { role } = useUser()
  const [enabled, setEnabled] = useState(null)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi — I'm your F3 tutor. Ask me anything about fraud tactics, controls, scenarios, or how to apply F3 at your institution." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.tutorStatus().then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const { reply } = await api.tutorSend(next, role)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    chat: {
      display: 'flex', flexDirection: 'column',
      minHeight: 500, maxHeight: '70vh',
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    },
    msgs: {
      flex: 1, overflowY: 'auto',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 18,
    },
    row: { display: 'flex', gap: 14 },
    rowUser: { flexDirection: 'row-reverse' },
    avatar: (isUser) => ({
      width: 32, height: 32, borderRadius: '50%',
      background: isUser ? 'var(--ink)' : 'var(--accent)',
      color: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 13, fontWeight: 500,
    }),
    bubble: (isUser) => ({
      maxWidth: '75%',
      padding: '10px 16px',
      borderRadius: 'var(--radius-lg)',
      fontSize: 14.5, lineHeight: 1.6,
      background: isUser ? 'var(--ink)' : 'var(--paper)',
      color: isUser ? 'var(--paper-hi)' : 'var(--ink)',
      border: isUser ? 'none' : '1px solid var(--rule)',
      whiteSpace: 'pre-wrap',
    }),
    suggestions: {
      padding: '0 24px 16px', display: 'flex', gap: 8, flexWrap: 'wrap',
    },
    suggestion: {
      fontSize: 12,
      padding: '6px 12px',
      background: 'var(--paper)',
      border: '1px solid var(--rule)',
      borderRadius: 999,
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      transition: 'all var(--dur) ease',
    },
    inputBar: {
      borderTop: '1px solid var(--rule)',
      padding: 14,
      display: 'flex', gap: 10,
      background: 'var(--paper)',
    },
    input: {
      flex: 1, padding: '10px 14px',
      fontSize: 14,
      background: 'var(--paper-hi)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)',
      outline: 'none',
      fontFamily: 'var(--font-body)',
    },
    send: {
      padding: '10px 18px',
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 'var(--radius)',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
    },
    disabledBox: {
      background: 'var(--warning-bg)',
      color: 'var(--warning)',
      padding: '16px 20px',
      borderRadius: 'var(--radius)',
      fontSize: 14, lineHeight: 1.6,
    },
  }

  return (
    <Page
      eyebrow="AI tutor"
      title="Ask anything about F3."
      lede="Answers are grounded in the F3 knowledge graph, tailored to your role. Use for concepts, real-world examples, or walkthroughs."
    >
      {enabled === false && (
        <div style={styles.disabledBox}>
          <strong>Tutor is not configured.</strong> Add <code>ANTHROPIC_API_KEY</code> to your <code>.env</code> file and restart the server to enable the AI tutor.
        </div>
      )}

      {enabled !== false && (
        <div style={styles.chat}>
          <div style={styles.msgs}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              return (
                <div key={i} style={{ ...styles.row, ...(isUser ? styles.rowUser : {}) }} className="fade-up">
                  <div style={styles.avatar(isUser)}>{isUser ? 'You' : 'F3'}</div>
                  <div style={styles.bubble(isUser)}>{m.content}</div>
                </div>
              )
            })}
            {loading && (
              <div style={styles.row}>
                <div style={styles.avatar(false)}>F3</div>
                <div style={{ ...styles.bubble(false), fontStyle: 'italic', color: 'var(--ink-faint)' }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={styles.suggestion}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ink)'
                    e.currentTarget.style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--rule)'
                    e.currentTarget.style.color = 'var(--ink-soft)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send() }}
            style={styles.inputBar}
          >
            <input
              type="text"
              placeholder={enabled === null ? 'Checking tutor status…' : 'Ask a question…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={styles.input}
              disabled={loading || !enabled}
            />
            <button type="submit" disabled={loading || !enabled || !input.trim()} style={styles.send}>
              Send
            </button>
          </form>
        </div>
      )}
    </Page>
  )
}
