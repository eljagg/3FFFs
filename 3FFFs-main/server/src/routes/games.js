import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'
import { ALL_SIGNALS, RECORD_SIGNAL_SCORE } from '../lib/graph-queries.js'

const router = Router()

/**
 * GET /api/games/signals
 * Returns a pool of fraud signals, each paired with its correct tactic.
 * The frontend shuffles and shows a randomized subset each round.
 */
router.get('/signals', async (_req, res, next) => {
  try {
    const rows = await runQuery(ALL_SIGNALS)

    // Flatten: each signal on each stage becomes its own entry
    const signals = []
    const seen = new Set()
    for (const r of rows) {
      const arr = safeParse(r.signalsJson)
      for (const sig of arr) {
        // Dedupe by signal text — same text may appear in multiple scenarios
        if (!sig?.text || seen.has(sig.text)) continue
        seen.add(sig.text)
        signals.push({
          id: `sig_${seen.size}`,
          text: sig.text,
          severity: sig.severity || 'medium',
          correctTacticId: r.tacticId,
          correctTacticName: r.tacticName,
          source: {
            scenarioId: r.scenarioId,
            scenarioTitle: r.scenarioTitle,
            techniqueId: r.techniqueId,
            techniqueName: r.techniqueName,
          },
        })
      }
    }

    res.json({ signals, count: signals.length })
  } catch (e) { next(e) }
})

/**
 * POST /api/games/signals/score
 * Records the player's score for the round; returns their best.
 */
router.post('/signals/score', async (req, res, next) => {
  try {
    const user = getUser(req)
    const score = Math.max(0, Math.min(99999, Number(req.body?.score) || 0))
    const rows = await runQuery(RECORD_SIGNAL_SCORE, { userId: user.id, score })
    res.json({ best: rows[0]?.best ?? score, plays: rows[0]?.plays ?? 1 })
  } catch (e) { next(e) }
})

/**
 * GET /api/games/signals/leaderboard
 * Returns the top 10 scores across all users (for bragging rights).
 */
router.get('/signals/leaderboard', async (_req, res, next) => {
  try {
    const rows = await runQuery(`
      MATCH (u:User)
      WHERE u.signalSortBest IS NOT NULL
      RETURN u.email AS email, u.name AS name,
             u.signalSortBest AS best,
             u.signalSortPlayCount AS plays
      ORDER BY best DESC
      LIMIT 10
    `)
    res.json({ leaderboard: rows })
  } catch (e) { next(e) }
})

function safeParse(v) {
  if (!v) return []
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return [] }
}

export default router
