import express from 'express'
import cors from 'cors'
import { verifyConnection } from './lib/neo4j.js'
import { requireAuth, syncUser, getUser } from './lib/auth.js'
import framework from './routes/framework.js'
import scenarios from './routes/scenarios.js'
import quiz from './routes/quiz.js'
import progress from './routes/progress.js'
import tutor from './routes/tutor.js'
import team from './routes/team.js'
import games from './routes/games.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', async (_req, res) => {
  try { await verifyConnection(); res.json({ ok: true, neo4j: true }) }
  catch { res.status(503).json({ ok: false, neo4j: false }) }
})

app.use('/api/framework', framework)
app.use('/api', requireAuth, syncUser)
app.get('/api/me', (req, res) => res.json({ user: getUser(req) }))
app.use('/api/scenarios', scenarios)
app.use('/api/quiz', quiz)
app.use('/api/progress', progress)
app.use('/api/tutor', tutor)
app.use('/api/team', team)
app.use('/api/games', games)

// Honest error handler — reports the real error so we can debug
app.use((err, req, res, _next) => {
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  console.error(`[${req.method} ${req.path}]`, err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { path: req.path }),
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🚀  API listening on http://localhost:${PORT}`))
