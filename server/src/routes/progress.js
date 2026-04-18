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

/**
 * GET /api/progress/debug-state
 * Diagnostic endpoint moved here from /api/debug/graph-state because the latter
 * was returning 404 for reasons we could not diagnose (Railway edge routing quirk).
 * Returns a summary of what is in Neo4j and the current user's saved progress.
 */
router.get('/debug-state', async (req, res, next) => {
  try {
    const me = getUser(req)

    const [counts, scenarios, myProgress, myAttempts, users] = await Promise.all([
      runQuery(`
        MATCH (n)
        RETURN labels(n)[0] AS label, count(n) AS count
        ORDER BY label
      `),
      runQuery(`
        MATCH (s:Scenario)
        OPTIONAL MATCH (s)-[:HAS_STAGE]->(st:Stage)
        WITH s, st ORDER BY st.order
        RETURN s.id AS id, s.title AS title,
               collect({
                 stageId: st.id,
                 order: st.order,
                 type: st.type,
                 heading: st.heading
               }) AS stages
        ORDER BY s.id
      `),
      runQuery(`
        OPTIONAL MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[c:COMPLETED]->(sc:Scenario)
        RETURN u.id AS userId, u.email AS email, u.name AS name,
               u.firstSeenAt AS firstSeenAt, u.lastSeenAt AS lastSeenAt,
               collect({
                 scenarioId: sc.id, title: sc.title,
                 completedAt: c.completedAt, lastAt: c.lastAt
               }) AS completedScenarios
      `, { userId: me.id }),
      runQuery(`
        MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(st:Stage)
        RETURN st.id AS stageId, st.heading AS heading,
               a.optionIndex AS optionIndex, a.correct AS correct,
               a.answeredAt AS answeredAt
        ORDER BY a.answeredAt DESC
        LIMIT 50
      `, { userId: me.id }),
      runQuery(`
        MATCH (u:User)
        RETURN u.id AS id, u.email AS email, u.name AS name,
               u.firstSeenAt AS firstSeenAt, u.lastSeenAt AS lastSeenAt,
               u.roles AS roles
        ORDER BY u.lastSeenAt DESC
        LIMIT 20
      `),
    ])

    const progressRow = myProgress[0]
    const userNodeExists = progressRow && progressRow.userId

    res.json({
      me: { id: me.id, email: me.email, name: me.name, roles: me.roles },
      counts,
      scenarios,
      myProgress: userNodeExists ? progressRow : null,
      myAttempts,
      recentUsers: users,
    })
  } catch (e) {
    console.error('[progress/debug-state]', e)
    next(e)
  }
})

/**
 * POST /api/progress/reset-my-progress
 * Deletes all progress relationships for the current user.
 */
router.post('/reset-my-progress', async (req, res, next) => {
  try {
    const me = getUser(req)
    await runQuery(`
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[r1:COMPLETED]->()
      OPTIONAL MATCH (u)-[r2:ATTEMPTED_STAGE]->()
      OPTIONAL MATCH (u)-[r3:ANSWERED]->()
      DELETE r1, r2, r3
    `, { userId: me.id })
    res.json({ ok: true, message: 'Your progress was reset.' })
  } catch (e) { next(e) }
})

export default router
