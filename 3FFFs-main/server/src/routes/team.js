import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { requireRole, getUser } from '../lib/auth.js'
import { TEAM_COVERAGE, TEAM_SKILLS_MATRIX } from '../lib/graph-queries.js'

const router = Router()

// Everyone in this router must be manager or admin
router.use(requireRole('manager', 'admin'))

// Existing endpoint — list of team members with their individual stats
router.get('/progress', async (req, res, next) => {
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

// New — team coverage per technique (for the heatmap view)
router.get('/coverage', async (req, res, next) => {
  try {
    const u = getUser(req)
    const isAdmin = u.roles.includes('admin')
    const rows = await runQuery(TEAM_COVERAGE, { myId: u.id, isAdmin })
    res.json({ coverage: rows })
  } catch (e) { next(e) }
})

// New — per-member skills matrix (for the rows-by-tactic view)
router.get('/skills', async (req, res, next) => {
  try {
    const u = getUser(req)
    const isAdmin = u.roles.includes('admin')
    const rows = await runQuery(TEAM_SKILLS_MATRIX, { myId: u.id, isAdmin })
    res.json({ members: rows })
  } catch (e) { next(e) }
})

export default router
