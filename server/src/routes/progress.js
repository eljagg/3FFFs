import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

router.post('/user', async (req, res) => {
  try {
    const { userId, role, displayName } = req.body
    if (!userId || !role) return res.status(400).json({ error: 'userId and role required' })

    await runQuery(
      `MERGE (u:User {id: $userId})
       SET u.role = $role, u.displayName = $displayName, u.updatedAt = timestamp()`,
      { userId, role, displayName: displayName || 'Trainee' }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/:userId', async (req, res) => {
  try {
    const rows = await runQuery(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[c:COMPLETED]->(sc:Scenario)
      WITH u, collect(DISTINCT sc.id) AS completedScenarios
      OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
      RETURN u, completedScenarios,
        count(DISTINCT q)                                     AS quizAttempts,
        sum(CASE WHEN a.correct THEN 1 ELSE 0 END)            AS quizCorrect
      `,
      { userId: req.params.userId }
    )

    if (!rows.length || !rows[0].u) {
      return res.json({
        userId: req.params.userId,
        role: null,
        completedScenarios: [],
        quizAttempts: 0,
        quizCorrect: 0,
        quizAccuracy: 0,
      })
    }

    const row = rows[0]
    const attempts = row.quizAttempts || 0
    res.json({
      userId: req.params.userId,
      role: row.u.properties.role,
      displayName: row.u.properties.displayName,
      completedScenarios: row.completedScenarios || [],
      quizAttempts: attempts,
      quizCorrect: row.quizCorrect || 0,
      quizAccuracy: attempts ? Math.round(((row.quizCorrect || 0) * 100) / attempts) : 0,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/scenario-complete', async (req, res) => {
  try {
    const { userId, scenarioId } = req.body
    if (!userId || !scenarioId) return res.status(400).json({ error: 'userId and scenarioId required' })

    await runQuery(
      `MERGE (u:User {id: $userId})
       WITH u
       MATCH (sc:Scenario {id: $scenarioId})
       MERGE (u)-[c:COMPLETED]->(sc)
       SET c.completedAt = timestamp()`,
      { userId, scenarioId }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/quiz-answer', async (req, res) => {
  try {
    const { userId, quizId, optionIndex, correct } = req.body
    if (!userId || !quizId || optionIndex === undefined) {
      return res.status(400).json({ error: 'userId, quizId, and optionIndex required' })
    }

    await runQuery(
      `MERGE (u:User {id: $userId})
       WITH u
       MATCH (q:Quiz {id: $quizId})
       CREATE (u)-[:ANSWERED {
         optionIndex: $optionIndex, correct: $correct, answeredAt: timestamp()
       }]->(q)`,
      { userId, quizId, optionIndex, correct: !!correct }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
