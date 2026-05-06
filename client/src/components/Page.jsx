export default function Page({ eyebrow, title, lede, children }) {
  const styles = {
    // v25.7.0.4.3: outer container handles overflow-x containment so
    // full-bleed visualizations (which use calc(50% - 50vw) to escape
    // the max-width centering) don't trigger a horizontal scrollbar
    // from the browser's scrollbar-inclusive 100vw math.
    outer: {
      overflowX: 'hidden',
      width: '100%',
    },
    wrap: { maxWidth: 1100, margin: '0 auto', padding: '40px 28px 80px' },
    eyebrow: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.14em',
      color: 'var(--accent)',
      marginBottom: 12,
    },
    title: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(30px, 4.5vw, 46px)',
      fontWeight: 500,
      lineHeight: 1.05,
      letterSpacing: '-0.02em',
      marginBottom: 14,
      maxWidth: 820,
    },
    lede: {
      fontSize: 17,
      color: 'var(--ink-soft)',
      maxWidth: 680,
      lineHeight: 1.6,
      marginBottom: 40,
    },
  }

  return (
    <div style={styles.outer}>
      <div style={styles.wrap}>
        {eyebrow && <div style={styles.eyebrow} className="fade-up">{eyebrow}</div>}
        {title && <h1 style={styles.title} className="fade-up-1">{title}</h1>}
        {lede && <p style={styles.lede} className="fade-up-2">{lede}</p>}
        <div className="fade-up-3">{children}</div>
      </div>
    </div>
  )
}
