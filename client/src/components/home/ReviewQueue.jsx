import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'

/* -----------------------------------------------------------------------------
 * ReviewQueue — Home-page widget surfacing wrong scenario answers past cooldown
 *
 * Spaced-repetition without the academic ceremony. Pulls the user's last
 * 12 unresolved wrong-answer stages, renders compact cards, and links each
 * to the scenario at that specific stage so the user can re-attempt.
 *
 * The query is server-side at /api/engagement/review-queue. Default cooldown
 * is 5 days — items that became wrong less than 5 days ago don't appear yet.
 *
 * If there's nothing in the queue (perfect record, or fresh user with no
 * cooldowns elapsed), the widget renders a calm empty state rather than
 * showing nothing — empty-state framing is part of the value.
 * --------------------------------------------------------------------------- */

export default function ReviewQueue() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getReviewQueue()
      .then(setData)
      .catch(() => setData({ items: [], cooldownDays: 5 }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  const items = data?.items || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{ marginBottom: 40 }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 4, fontWeight: 600,
        }}>Review queue</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500,
            letterSpacing: '-0.01em',
          }}>
            {items.length === 0
              ? 'Nothing to review.'
              : `${items.length} ${items.length === 1 ? 'question' : 'questions'} to revisit`}
          </div>
          {items.length > 0 && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--ink-faint)',
            }}>
              Wrong answers older than {data.cooldownDays} days
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 10,
        }}>
          {items.map(item => <ReviewCard key={item.stageId} item={item} />)}
        </div>
      )}
    </motion.div>
  )
}

function ReviewCard({ item }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Link
        to={`/scenarios/${item.scenarioId}?reviewStage=${encodeURIComponent(item.stageId)}`}
        style={{
          display: 'block',
          padding: '14px 16px',
          background: 'var(--paper-hi)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-lg)',
          textDecoration: 'none',
          transition: 'border-color var(--dur)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)' }}
      >
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 6,
        }}>
          {item.scenarioTitle.length > 40
            ? item.scenarioTitle.slice(0, 38) + '…'
            : item.scenarioTitle}
          {' · '}
          <span style={{ color: 'var(--accent)' }}>{item.daysAgo}d ago</span>
        </div>
        <div style={{
          fontSize: 13, color: 'var(--ink)', lineHeight: 1.45,
          marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.question}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--accent)',
        }}>Try again →</div>
      </Link>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '24px 28px',
      background: 'var(--paper-hi)',
      border: '1px dashed var(--rule-strong)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--ink-soft)',
      fontSize: 13,
      lineHeight: 1.55,
    }}>
      No wrong answers waiting in your review queue. As you walk through scenarios,
      anything you get wrong will surface here a few days later for a second look.
      Spaced repetition is how knowledge sticks past Tuesday.
    </div>
  )
}
