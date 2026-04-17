import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { requireRole, getUser } from '../lib/auth.js'

const router = Router()

/**
 * GET /api/team/progress
 * Managers: see their team's progress
 * Admins: see everyone's progress
 */
router.get('/progress', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const u = getUser(req)
    const isAdmin = u.roles.includes('admin')

    const rows = await runQuery(
      isAdmin
        ? `
          MATCH (user:User)
          OPTIONAL MATCH (user)-[c:COMPLETED]->(sc:Scenario)
          OPTIONAL MATCH (user)-[a:ANSWERED]->(q:Quiz)
          WITH user, count(DISTINCT sc) AS scenariosCompleted,
               count(DISTINCT q) AS quizzesAnswered,
               sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers
          RETURN user.id AS id, user.email AS email, user.name AS name,
                 user.roles AS roles, user.lastSeenAt AS lastSeenAt,
                 scenariosCompleted, quizzesAnswered, correctAnswers
          ORDER BY user.lastSeenAt DESC
        `
        : `
          MATCH (manager:User {id: $managerId})-[:MANAGES]->(user:User)
          OPTIONAL MATCH (user)-[c:COMPLETED]->(sc:Scenario)
          OPTIONAL MATCH (user)-[a:ANSWERED]->(q:Quiz)
          WITH user, count(DISTINCT sc) AS scenariosCompleted,
               count(DISTINCT q) AS quizzesAnswered,
               sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers
          RETURN user.id AS id, user.email AS email, user.name AS name,
                 user.roles AS roles, user.lastSeenAt AS lastSeenAt,
                 scenariosCompleted, quizzesAnswered, correctAnswers
          ORDER BY user.lastSeenAt DESC
        `,
      { managerId: u.id }
    )
    res.json({ team: rows })
  } catch (e) { next(e) }
})

export default router
