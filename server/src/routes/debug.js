import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser, requireRole } from '../lib/auth.js'

const router = Router()

// TEMP: admin gate removed during progress-saving debugging.
// Re-enable with: router.use(requireRole('admin'))

/**
 * GET /api/debug/graph-state
 * Returns a summary of what's in the Neo4j graph — scenarios, stages, relationships,
 * and the current user's saved progress. Read-only; safe to call repeatedly.
 */
router.get('/graph-state', async (req, res, next) => {
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
        MATCH (u:User {id: $userId})
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

    res.json({
      me: { id: me.id, email: me.email, name: me.name, roles: me.roles },
      counts,
      scenarios,
      myProgress: myProgress[0] || null,
      myAttempts,
      recentUsers: users,
    })
  } catch (e) {
    console.error('[debug/graph-state]', e)
    next(e)
  }
})

/**
 * POST /api/debug/reset-my-progress
 * Nuclear option: deletes all progress relationships for the current user
 * (but keeps the user node). Useful for re-testing scenarios from scratch.
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
