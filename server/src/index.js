import express from 'express'
import cors from 'cors'
import { verifyConnection, runQuery } from './lib/neo4j.js'
import { requireAuth, syncUser, getUser } from './lib/auth.js'
import framework from './routes/framework.js'
import frameworks from './routes/frameworks.js'
import authCheck from './routes/auth-check.js'
import scenarios from './routes/scenarios.js'
import quiz from './routes/quiz.js'
import progress from './routes/progress.js'
import tutor from './routes/tutor.js'
import team from './routes/team.js'
import games from './routes/games.js'
import badges from './routes/badges.js'
import admin from './routes/admin.js'

const app = express()
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', async (_req, res) => {
  try { await verifyConnection(); res.json({ ok: true, neo4j: true }) }
  catch { res.status(503).json({ ok: false, neo4j: false }) }
})

// ----------------------------------------------------------------------------
// PUBLIC routes — mounted BEFORE the requireAuth wall.
// /api/framework  — public framework encyclopedia (no auth needed)
// /api/auth       — shared-secret endpoints called by the Auth0 post-login
//                   Action (e.g. /api/auth/check-invite). These authenticate
//                   via an `x-invite-secret` header, not a JWT.
// ----------------------------------------------------------------------------
app.use('/api/framework', framework)
app.use('/api/frameworks', frameworks)
app.use('/api/auth', authCheck)

// ----------------------------------------------------------------------------
// AUTH wall. Everything below requires a valid Auth0 access token AND
// syncs the user into Neo4j as a :User node on every request.
// ----------------------------------------------------------------------------
app.use('/api', requireAuth, syncUser)
app.get('/api/me', (req, res) => res.json({ user: getUser(req) }))
app.use('/api/scenarios', scenarios)
app.use('/api/quiz', quiz)
app.use('/api/progress', progress)
app.use('/api/tutor', tutor)
app.use('/api/team', team)
app.use('/api/games', games)
app.use('/api/badges', badges)
app.use('/api/admin', admin)

// ============================================================================
// DEBUG ROUTES — INLINED to bypass any build caching issues that were keeping
// /api/debug/* and /api/progress/debug-state unregistered. These route handlers
// live directly in index.js so they cannot be missed when Express starts up.
// ============================================================================

/**
 * GET /api/debug-state
 *
 * Returns a full snapshot of the current user, their progress, and the graph.
 * Used by the Debug page to diagnose "progress not saving" issues.
 */
app.get('/api/debug-state', async (req, res) => {
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
  } catch (err) {
    console.error('[GET /api/debug-state]', err)
    res.status(500).json({ error: err.message || 'Debug query failed' })
  }
})

/**
 * POST /api/debug-reset
 *
 * Removes all progress relationships for the current user. Leaves the User
 * node itself and the scenarios/techniques intact.
 */
app.post('/api/debug-reset', async (req, res) => {
  try {
    const me = getUser(req)
    await runQuery(`
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[r1:COMPLETED]->()
      OPTIONAL MATCH (u)-[r2:ATTEMPTED_STAGE]->()
      OPTIONAL MATCH (u)-[r3:ANSWERED]->()
      DELETE r1, r2, r3
    `, { userId: me.id })
    res.json({ ok: true, message: 'Your progress relationships were reset.' })
  } catch (err) {
    console.error('[POST /api/debug-reset]', err)
    res.status(500).json({ error: err.message || 'Reset failed' })
  }
})

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
