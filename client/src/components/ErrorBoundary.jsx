import { Component } from 'react'

/**
 * Catches React render crashes and displays an error instead of a blank screen.
 * Blank screens on navigation almost always = unhandled exception during render.
 * Wrap problem-prone pages in <ErrorBoundary> to surface what actually broke.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary caught]', error, info)
    this.setState({ error, info })
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children

    const err = this.state.error
    return (
      <div style={{ maxWidth: 700, margin: '80px auto', padding: '32px 36px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--danger)', marginBottom: 8,
        }}>Something went wrong on this page</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
          lineHeight: 1.2, letterSpacing: '-0.015em', marginBottom: 14,
        }}>
          A component crashed while rendering.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 20 }}>
          This is a bug in the app, not something you did. The details below
          help us debug it.
        </p>

        <div style={{
          background: 'var(--danger-bg)', border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 20,
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--danger)', lineHeight: 1.5,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          <strong>{err.name || 'Error'}:</strong> {err.message}
          {err.stack && (
            <div style={{ marginTop: 10, opacity: 0.8, fontSize: 11 }}>
              {err.stack.split('\n').slice(0, 5).join('\n')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={this.reset}
            style={{
              padding: '10px 18px', background: 'var(--ink)', color: 'var(--paper)',
              borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
            }}
          >Try again</button>
          <button
            onClick={() => { window.location.hash = '#/scenarios' }}
            style={{
              padding: '10px 18px', background: 'transparent', color: 'var(--ink)',
              border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)',
              cursor: 'pointer', fontSize: 13,
            }}
          >Back to scenarios</button>
        </div>
      </div>
    )
  }
}
