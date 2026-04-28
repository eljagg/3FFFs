import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

const router = Router()

/**
 * GET /api/quiz — returns quiz questions, optionally filtered by role,
 * difficulty, or a specific tactic.
 */
router.get('/', async (req, res) => {
  try {
    const { role, difficulty, tacticId } = req.query

    const whereClauses = []
    if (role)       whereClauses.push('$role IN q.roles')
    if (difficulty) whereClauses.push('q.difficulty = $difficulty')
    if (tacticId)   whereClauses.push('tac.id = $tacticId')
    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''

    const rows = await runQuery(
      `
      MATCH (q:Quiz)-[:TESTS]->(tac:Tactic)
      ${where}
      RETURN q, tac.name AS tacticName, tac.id AS tacticId
      ORDER BY q.id
      `,
      { role, difficulty, tacticId }
    )

    const questions = rows.map((r) => ({
      ...r.q.properties,
      options: JSON.parse(r.q.properties.options),
      tacticName: r.tacticName,
      tacticId: r.tacticId,
    }))
    res.json({ questions })
  } catch (err) {
    console.error('[GET /api/quiz]', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/quiz/answer
 *
 * Records a user's answer to a quiz question. Creates an ANSWERED edge
 * between the User and the Quiz in Neo4j, storing the chosen option and
 * whether it was correct. Idempotent — re-answering the same quiz updates
 * the existing edge rather than duplicating.
 *
 * This endpoint was missing before v20 — the client already called
 * /api/quiz/answer but the server had no handler, so every quiz answer
 * silently 404'd. That's why quizzesAnswered stayed at 0 in Debug output.
 *
 * Authoritative user ID comes from the JWT (via getUser), not the client
 * body — a user should only be able to record their own answers.
 */
router.post('/answer', async (req, res, next) => {
  try {
    const user = getUser(req)
    const { quizId, optionIndex, correct } = req.body || {}

    if (!quizId || typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'quizId and optionIndex required' })
    }

    // MERGE user to guarantee the node exists (same pattern used by /submit
    // and /complete — defensive against any race with syncUser middleware).
    await runQuery(
      `MERGE (u:User {id: $userId})
         ON CREATE SET u.email = $email, u.name = $name, u.createdAt = timestamp()
         SET u.lastSeenAt = timestamp()
       WITH u
       MATCH (q:Quiz {id: $quizId})
       MERGE (u)-[a:ANSWERED]->(q)
         SET a.optionIndex = $optionIndex,
             a.correct     = $correct,
             a.answeredAt  = timestamp()`,
      {
        userId: user.id,
        email: user.email || null,
        name: user.name || null,
        quizId,
        optionIndex,
        correct: !!correct,
      }
    )
    res.json({ ok: true, saved: true })
  } catch (err) {
    console.error('[POST /api/quiz/answer]', err)
    next(err)
  }
})

export default router
