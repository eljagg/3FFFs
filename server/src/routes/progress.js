import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'
import { USER_COVERAGE, USER_PROGRESS_SUMMARY } from '../lib/graph-queries.js'

const router = Router()

// GET /api/progress  — summary for Home page
router.get('/', async (req, res, next) => {
  try {
    const user = getUser(req)
    const rows = await runQuery(USER_PROGRESS_SUMMARY, { userId: user.id })
    const r = rows[0] || {
      scenariosCompleted: 0, quizzesAnswered: 0, correctAnswers: 0,
      totalTechniques: 126, techniquesEncountered: 0,
    }
    res.json({ progress: r })
  } catch (e) { next(e) }
})

// GET /api/progress/coverage  — heatmap data across all 126 techniques
router.get('/coverage', async (req, res, next) => {
  try {
    const user = getUser(req)
    const rows = await runQuery(USER_COVERAGE, { userId: user.id })
    res.json({ coverage: rows })
  } catch (e) { next(e) }
})

export default router
