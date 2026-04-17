import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Page from '../components/Page.jsx'
import { api } from '../lib/api.js'

/* -------------------------------------------------------------------------
   Team Skills Graph — for managers and admins
   -------------------------------------------------------------------------
   Two visualizations of the team's F3 mastery:
     - Heatmap view:  techniques colored by how many team members mastered them
     - Matrix view:   team members as rows, tactic mastery % as columns

   Highlights the biggest team-wide coverage gap at the top.
------------------------------------------------------------------------- */

function fmtRelativeTime(ts) {
  if (!ts) return '—'
  const diffMs = Date.now() - Number(ts)
  const h = diffMs / 3_600_000
  if (h < 1)  return 'just now'
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function statusFor(row) {
  if (!row.lastSeenAt) return { label: 'Never',       color: 'var(--danger)' }
  const days = (Date.now() - Number(row.lastSeenAt)) / 86_400_000
  if (days > 30) return { label: 'Falling behind', color: 'var(--danger)' }
  if (days > 14) return { label: 'At risk',        color: 'var(--warning)' }
  if (days > 7)  return { label: 'Inactive',       color: 'var(--ink-faint)' }
  return         { label: 'Active',          color: 'var(--success)' }
}

export default function Team() {
  const [progress, setProgress] = useState([])
  const [coverage, setCoverage] = useState([])
  const [skills, setSkills]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [view, setView]         = useState('heatmap')  // 'heatmap' | 'matrix' | 'table'
  const [hoverCell, setHoverCell] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getTeamProgress(),
      api.getTeamCoverage().catch(() => ({ coverage: [] })),
      api.getTeamSkills().catch(() => ({ members: [] })),
    ])
      .then(([p, c, s]) => {
        setProgress(p.team || [])
        setCoverage(c.coverage || [])
        setSkills(s.members || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Summary stats (for header cards)
  const summary = useMemo(() => {
    return {
      total:           progress.length,
      active:          progress.filter(r => statusFor(r).label === 'Active').length,
      atRisk:          progress.filter(r => statusFor(r).label === 'At risk').length,
      fallingBehind:   progress.filter(r => {
        const l = statusFor(r).label
        return l === 'Falling behind' || l === 'Never'
      }).length,
    }
  }, [progress])

  // Group coverage by tactic for the heatmap
  const coverageByTactic = useMemo(() => {
    const map = {}
    for (const c of coverage) {
      if (!map[c.tacticId]) {
        map[c.tacticId] = {
          id: c.tacticId, name: c.tacticName, order: c.tacticOrder,
          uniqueToF3: c.uniqueToF3, techniques: [],
        }
      }
      map[c.tacticId].techniques.push(c)
    }
    return Object.values(map).sort((a, b) => a.order - b.order)
  }, [coverage])

  // Biggest gap calculation — which tactic has the lowest team coverage?
  const biggestGap = useMemo(() => {
    if (!coverageByTactic.length) return null
    const teamSize = coverage[0]?.teamSize ?? 0
    if (teamSize === 0) return null
    const tacticGaps = coverageByTactic.map(tac => {
      const totalMasterySlots = tac.techniques.length * teamSize
      const filled = tac.techniques.reduce((sum, t) => sum + (t.masteredCount || 0), 0)
      const pct = totalMasterySlots > 0 ? filled / totalMasterySlots : 0
      return { ...tac, teamSize, pct, filled, totalMasterySlots }
    }).sort((a, b) => a.pct - b.pct)
    return tacticGaps[0]
  }, [coverageByTactic, coverage])

  if (loading) return <Page eyebrow="Team" title="Loading team data…" />
  if (error)   return <Page eyebrow="Team" title="Couldn't load team data" lede={error} />

  return (
    <Page
      eyebrow="Team"
      title="How your team is doing."
      lede="See who's active, where your coverage gaps are, and who may need a nudge toward a specific tactic."
    >
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total trainees',    value: summary.total,          color: 'var(--ink)' },
          { label: 'Active this week',  value: summary.active,         color: 'var(--success)' },
          { label: 'At risk',           value: summary.atRisk,         color: 'var(--warning)' },
          { label: 'Falling behind',    value: summary.fallingBehind,  color: 'var(--danger)' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              padding: '20px 22px', background: 'var(--paper-hi)',
              border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)',
              borderLeft: `3px solid ${stat.color}`,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 500,
              lineHeight: 1, letterSpacing: '-0.02em', color: stat.color, marginBottom: 6,
            }}>{stat.value}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
            }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Gap spotlight */}
      {biggestGap && biggestGap.pct < 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '18px 24px', marginBottom: 28,
            background: biggestGap.uniqueToF3 ? 'var(--warning-bg)' : 'var(--paper-dim)',
            border: `1px solid ${biggestGap.uniqueToF3 ? 'var(--warning)' : 'var(--rule-strong)'}`,
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: biggestGap.uniqueToF3 ? 'var(--warning)' : 'var(--accent)',
          }}>Biggest team gap</div>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500,
              marginBottom: 4, letterSpacing: '-0.01em',
            }}>
              {biggestGap.name}
              {biggestGap.uniqueToF3 && <span style={{ marginLeft: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--warning)', letterSpacing: '0.08em' }}>F3-UNIQUE</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Team has mastered {biggestGap.filled} of {biggestGap.totalMasterySlots} mastery slots ({Math.round(biggestGap.pct * 100)}%).
              Consider assigning a scenario that covers this tactic.
            </div>
          </div>
        </motion.div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        {[
          { id: 'heatmap', label: 'Team heatmap' },
          { id: 'matrix',  label: 'Skills matrix' },
          { id: 'table',   label: 'Table view' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 500,
              border: 'none', background: 'transparent',
              color: view === v.id ? 'var(--ink)' : 'var(--ink-faint)',
              borderBottom: view === v.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color var(--dur)',
            }}
          >{v.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'heatmap' && (
          <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TeamHeatmap
              coverageByTactic={coverageByTactic}
              onHover={setHoverCell}
            />
            {hoverCell && <HoverCard cell={hoverCell} />}
          </motion.div>
        )}
        {view === 'matrix' && (
          <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SkillsMatrix members={skills} />
          </motion.div>
        )}
        {view === 'table' && (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TeamTable team={progress} />
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}

/* ======================================================================= */

function TeamHeatmap({ coverageByTactic, onHover }) {
  if (!coverageByTactic.length) {
    return <EmptyState message="No team coverage data yet. Trainees will appear here once they complete scenarios." />
  }

  const teamSize = coverageByTactic[0]?.techniques?.[0]?.teamSize ?? 0

  // Legend
  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)',
        }}>Team coverage:</span>
        <LegendPill color="var(--success)" label="All mastered" />
        <LegendPill color="var(--warning)" label="Some mastered" />
        <LegendPill color="var(--paper-dim)" label="None" textColor="var(--ink-faint)" />
        {teamSize > 0 && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--ink-faint)',
          }}>Team size: {teamSize}</span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${coverageByTactic.length}, minmax(140px, 1fr))`,
        gap: 6, overflowX: 'auto', paddingBottom: 8,
      }}>
        {coverageByTactic.map(tac => (
          <div key={tac.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140 }}>
            <div style={{
              padding: '8px 10px', textAlign: 'left',
              background: tac.uniqueToF3 ? 'var(--accent)' : 'var(--ink)',
              color: tac.uniqueToF3 ? '#fff' : 'var(--paper-hi)',
              borderRadius: 4, marginBottom: 6,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, lineHeight: 1.2,
              }}>{tac.name}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.08em', opacity: 0.75, marginTop: 2,
              }}>{tac.id}{tac.uniqueToF3 ? ' · F3' : ''}</div>
            </div>

            {tac.techniques.map(tech => {
              const mc = tech.masteredCount
              const ts = tech.teamSize
              const isSub = tech.techniqueId.includes('.')
              let bg, fg
              if (ts === 0 || mc === 0) { bg = 'var(--paper-dim)'; fg = 'var(--ink-faint)' }
              else if (mc === ts)        { bg = 'var(--success)';   fg = '#fff' }
              else {
                // partial — blend amber intensity
                const pct = mc / ts
                bg = pct >= 0.66 ? 'var(--success)' :
                     pct >= 0.33 ? 'var(--warning)' :
                                   'var(--warning-bg)'
                fg = pct >= 0.33 ? '#fff' : 'var(--warning)'
              }

              return (
                <motion.div
                  key={tech.techniqueId}
                  onMouseEnter={() => onHover({
                    techniqueId: tech.techniqueId, name: tech.techniqueName,
                    tacticName: tac.name, masteredBy: tech.masteredBy,
                    masteredCount: mc, teamSize: ts,
                  })}
                  onMouseLeave={() => onHover(null)}
                  whileHover={{ scale: 1.03, zIndex: 10 }}
                  style={{
                    padding: isSub ? '6px 10px 6px 16px' : '8px 10px',
                    background: bg, color: fg, fontSize: 11,
                    borderRadius: 3, border: '1px solid var(--rule)',
                    cursor: 'default', textAlign: 'left', lineHeight: 1.2,
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    letterSpacing: '0.04em', opacity: 0.75,
                  }}>{tech.techniqueId}</div>
                  <div style={{ fontWeight: 500, marginTop: 2 }}>{tech.techniqueName}</div>
                  {ts > 0 && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      marginTop: 3, opacity: 0.85,
                    }}>{mc}/{ts}</div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function HoverCard({ cell }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        maxWidth: 480, background: 'var(--ink)', color: 'var(--paper)',
        padding: '14px 20px', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)', zIndex: 100,
        fontSize: 13, lineHeight: 1.5,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.6, marginBottom: 4, letterSpacing: '0.04em' }}>
        {cell.techniqueId} · {cell.tacticName}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
        {cell.name}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: cell.masteredBy?.length ? 8 : 0 }}>
        {cell.masteredCount} of {cell.teamSize} team member{cell.teamSize !== 1 ? 's' : ''} mastered
      </div>
      {cell.masteredBy?.length > 0 && (
        <div style={{
          fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)',
          letterSpacing: '0.03em', marginTop: 4,
        }}>
          ✓ {cell.masteredBy.slice(0, 4).map(m => m.name).join(', ')}
          {cell.masteredBy.length > 4 ? ` (+${cell.masteredBy.length - 4} more)` : ''}
        </div>
      )}
    </motion.div>
  )
}

/* ======================================================================= */

function SkillsMatrix({ members }) {
  if (!members.length) {
    return <EmptyState message="No team members to display yet." />
  }

  // Gather all tactics from the first member
  const tactics = (members[0]?.skills || []).sort((a, b) => a.order - b.order)

  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `minmax(200px, 1.6fr) repeat(${tactics.length}, minmax(80px, 1fr))`,
        gap: 0, padding: '12px 18px',
        background: 'var(--paper-dim)', borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}>Member</div>
        {tactics.map(t => (
          <div key={t.tacticId} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--ink-faint)', textAlign: 'center',
            lineHeight: 1.2, padding: '0 4px',
          }}>
            {t.tacticName}
          </div>
        ))}
      </div>

      {members.map((m, i) => (
        <motion.div
          key={m.userId}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(200px, 1.6fr) repeat(${tactics.length}, minmax(80px, 1fr))`,
            gap: 0, padding: '14px 18px',
            borderBottom: i < members.length - 1 ? '1px solid var(--rule)' : 'none',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{m.userName}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{m.email}</div>
          </div>
          {tactics.map(t => {
            const skill = m.skills.find(s => s.tacticId === t.tacticId)
            const pct = Math.round((skill?.pct || 0) * 100)
            const bg = pct === 100 ? 'var(--success)'
                    : pct >= 50   ? 'var(--warning)'
                    : pct > 0     ? 'var(--warning-bg)'
                    :               'var(--paper-dim)'
            const fg = pct >= 50 ? '#fff' : 'var(--ink-faint)'
            return (
              <div key={t.tacticId} style={{
                padding: '8px 6px', textAlign: 'center',
                background: bg, color: fg,
                margin: '0 2px', borderRadius: 3,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
              }}>
                {pct}%
              </div>
            )
          })}
        </motion.div>
      ))}
    </div>
  )
}

/* ======================================================================= */

function TeamTable({ team }) {
  if (!team.length) {
    return <EmptyState message="No team members yet. Trainees will appear here after their first login." />
  }

  return (
    <div style={{
      background: 'var(--paper-hi)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr',
        gap: 16, padding: '14px 22px',
        background: 'var(--paper-dim)',
        borderBottom: '1px solid var(--rule)',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-faint)',
      }}>
        <div>User</div><div>Status</div><div>Scenarios</div>
        <div>Quizzes</div><div>Correct</div><div>Last seen</div>
      </div>
      {team.map((row, i) => {
        const status = statusFor(row)
        const correctRate = row.quizzesAnswered > 0
          ? Math.round((row.correctAnswers / row.quizzesAnswered) * 100) : null
        return (
          <motion.div
            key={row.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.05 + i * 0.03 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 1fr',
              gap: 16, padding: '16px 22px',
              borderBottom: i < team.length - 1 ? '1px solid var(--rule)' : 'none',
              alignItems: 'center', transition: 'background var(--dur)',
            }}
            whileHover={{ backgroundColor: 'var(--paper-dim)' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: 'var(--ink)' }}>
                {row.name || (row.email || '').split('@')[0]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{row.email}</div>
            </div>
            <div>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 4,
                border: '1px solid', borderColor: status.color, color: status.color,
              }}>{status.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>
              {row.scenariosCompleted || 0}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>
              {row.quizzesAnswered || 0}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: correctRate !== null ? 'var(--ink)' : 'var(--ink-faint)',
            }}>
              {correctRate !== null ? `${correctRate}%` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {fmtRelativeTime(row.lastSeenAt)}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function LegendPill({ color, label, textColor }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span style={{ width: 14, height: 14, background: color, borderRadius: 3, border: '1px solid var(--rule)' }} />
      <span style={{ color: textColor || 'var(--ink-soft)' }}>{label}</span>
    </span>
  )
}

function EmptyState({ message }) {
  return (
    <div style={{
      padding: 48, textAlign: 'center',
      background: 'var(--paper-hi)', border: '1px dashed var(--rule-strong)',
      borderRadius: 'var(--radius-lg)', color: 'var(--ink-faint)',
    }}>{message}</div>
  )
}
