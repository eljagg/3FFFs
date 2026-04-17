import express from 'express'
import cors from 'cors'
import { verifyConnection, closeDriver } from './lib/neo4j.js'

import framework from './routes/framework.js'
import scenarios from './routes/scenarios.js'
import quiz      from './routes/quiz.js'
import progress  from './routes/progress.js'
import tutor     from './routes/tutor.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/', (req, res) => res.json({ service: '3fffs-api', version: '1.0.0', ok: true }))
app.get('/health', async (req, res) => {
  try {
    await verifyConnection()
    res.json({ ok: true, neo4j: true })
  } catch {
    res.status(503).json({ ok: false, neo4j: false })
  }
})

app.use('/api/framework', framework)
app.use('/api/scenarios', scenarios)
app.use('/api/quiz',      quiz)
app.use('/api/progress',  progress)
app.use('/api/tutor',     tutor)

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }))

async function start() {
  try {
    await verifyConnection()
  } catch (err) {
    console.error('\nFailed to start — check NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env\n')
    process.exit(1)
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀  API listening on http://localhost:${PORT}`)
  })

  const shutdown = async () => {
    console.log('\n⏹   Shutting down...')
    server.close()
    await closeDriver()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()
