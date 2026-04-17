import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

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
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
