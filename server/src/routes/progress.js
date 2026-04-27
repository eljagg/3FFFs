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

// ===========================================================================
// v25.7.0 (ISS-017): rich per-user progress endpoints
// ===========================================================================

/**
 * GET /api/progress/me/full
 *
 * Returns the FULL progress profile for the current user — Options A + B + C
 * combined per Call 1 sign-off:
 *   - completion ledger (per-scenario start/in-progress/completed status)
 *   - competency profile (per-concept mastery, per-framework totals)
 *   - aggregates (total stages attempted, correct rate, time on platform)
 */
router.get('/me/full', async (req, res, next) => {
  try {
    const me = getUser(req)
    const data = await fetchUserProgress(me.id)
    res.json({ progress: data, viewer: 'self' })
  } catch (e) { next(e) }
})

/**
 * GET /api/progress/user/:userId/full
 *
 * Same shape as /me/full but for a specific user. Authorisation:
 *   - admin: can view any user
 *   - manager: can view (a) any user in their Bank, OR (b) any direct report
 *     (per Call 6 — both scopes). Both is more permissive than either alone.
 *   - trainee: 403 unless requesting their own id, in which case redirect to /me/full
 */
router.get('/user/:userId/full', async (req, res, next) => {
  try {
    const me = getUser(req)
    const targetId = req.params.userId
    if (targetId === me.id) {
      const data = await fetchUserProgress(me.id)
      return res.json({ progress: data, viewer: 'self' })
    }

    const isAdmin   = me.roles.includes('admin')
    const isManager = me.roles.includes('manager')

    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: 'Trainees can only view their own progress' })
    }

    if (!isAdmin) {
      // Manager: must either be in same Bank OR be a direct manager of the target
      const auth = await runQuery(
        `MATCH (me:User {id: $meId})
         MATCH (target:User {id: $targetId})
         RETURN
           EXISTS {
             MATCH (me)-[:MEMBER_OF]->(b:Bank)<-[:MEMBER_OF]-(target)
           } AS sameBank,
           EXISTS {
             MATCH (me)-[:MANAGES]->(target)
           } AS isDirect,
           EXISTS {
             MATCH (target)-[:MEMBER_OF]->(:Bank)
           } AS targetHasBank`,
        { meId: me.id, targetId }
      )
      if (!auth.length) {
        return res.status(404).json({ error: 'User not found' })
      }
      if (!auth[0].sameBank && !auth[0].isDirect) {
        return res.status(403).json({
          error: 'Manager can only view users in their Bank or direct reports',
        })
      }
    }

    const data = await fetchUserProgress(targetId)
    res.json({
      progress: data,
      viewer: isAdmin ? 'admin' : 'manager',
    })
  } catch (e) { next(e) }
})

/**
 * Internal: fetch the FULL progress profile for one user. Three queries in
 * parallel (completion ledger, per-concept mastery, aggregates).
 */
async function fetchUserProgress(userId) {
  const [userRow, ledgerRows, conceptRows, frameworkRows, mitreRows, aggregateRow] = await Promise.all([
    // User identity + bank context
    runQuery(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(b:Bank)
       RETURN u.id AS id, u.email AS email, u.name AS name, u.roles AS roles,
              u.createdAt AS createdAt, u.lastSeenAt AS lastSeenAt,
              b { .id, .displayName, .region, .primaryColor, .accentColor } AS bank`,
      { userId }
    ),

    // Completion ledger — one row per scenario
    runQuery(
      `MATCH (sc:Scenario)
       OPTIONAL MATCH (u:User {id: $userId})-[c:COMPLETED]->(sc)
       OPTIONAL MATCH (u)-[a:ATTEMPTED_STAGE]->(st:Stage)<-[:HAS_STAGE]-(sc)
       WHERE st.type IS NULL OR st.type = 'primary'
       WITH sc, c, a, st
       WITH sc, c,
            count(DISTINCT a) AS totalAttempts,
            count(DISTINCT st) AS stagesAttempted,
            sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAttempts,
            avg(toFloat(a.confidence)) AS avgConfidence
       OPTIONAL MATCH (sc)-[:HAS_STAGE]->(allSt:Stage)
       WHERE allSt.type IS NULL OR allSt.type = 'primary'
       WITH sc, c, totalAttempts, stagesAttempted, correctAttempts, avgConfidence,
            count(DISTINCT allSt) AS totalStages
       RETURN sc.id AS id, sc.title AS title, sc.severity AS severity,
              sc.framework AS framework,
              CASE WHEN c IS NOT NULL THEN c.completedAt ELSE null END AS completedAt,
              c.lastAt AS lastAt,
              totalAttempts, stagesAttempted, totalStages, correctAttempts, avgConfidence,
              CASE
                WHEN c IS NOT NULL THEN 'completed'
                WHEN stagesAttempted > 0 THEN 'in-progress'
                ELSE 'not-started'
              END AS status
       ORDER BY sc.id`,
      { userId }
    ),

    // Concept mastery — correct rate per concept
    runQuery(
      `MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(st:Stage)-[:TESTS_CONCEPT]->(c:Concept)
       WHERE st.type IS NULL OR st.type = 'primary'
       WITH c,
            count(a) AS attempts,
            sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correct,
            avg(toFloat(a.confidence)) AS avgConfidence,
            max(a.answeredAt) AS lastAttemptAt
       RETURN c.id AS id, c.name AS name, c.universal AS universal,
              attempts, correct,
              toFloat(correct) / attempts AS correctRate,
              avgConfidence, lastAttemptAt
       ORDER BY correctRate DESC, c.name`,
      { userId }
    ),

    // Framework totals — competency aggregate per framework
    runQuery(
      `MATCH (f:Framework)
       OPTIONAL MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(st:Stage)<-[:HAS_STAGE]-(sc:Scenario)
       WHERE sc.framework = f.id AND (st.type IS NULL OR st.type = 'primary')
       WITH f,
            count(a) AS attempts,
            sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correct
       RETURN f.id AS id, f.name AS name, f.region AS region,
              attempts, correct
       ORDER BY f.id`,
      { userId }
    ),

    // MITRE technique exposure (for SOC users)
    runQuery(
      `MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(st:Stage)-[:USES_MITRE_TECHNIQUE]->(mt:MitreTechnique)
       WHERE st.type IS NULL OR st.type = 'primary'
       WITH mt, count(a) AS attempts, sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correct,
            max(a.answeredAt) AS lastAttemptAt
       RETURN mt.id AS id, mt.name AS name, attempts, correct, lastAttemptAt
       ORDER BY attempts DESC, mt.id
       LIMIT 30`,
      { userId }
    ),

    // Top-level aggregates
    runQuery(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[a:ATTEMPTED_STAGE]->()
       OPTIONAL MATCH (u)-[c:COMPLETED]->()
       OPTIONAL MATCH (u)-[q:ANSWERED]->()
       WITH u,
            count(DISTINCT a) AS totalAttempts,
            sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAttempts,
            avg(toFloat(a.confidence)) AS avgConfidence,
            count(DISTINCT c) AS scenariosCompleted,
            count(DISTINCT q) AS quizzesAnswered,
            sum(CASE WHEN q.correct THEN 1 ELSE 0 END) AS correctQuizzes,
            min(a.answeredAt) AS firstAttemptAt,
            max(a.answeredAt) AS lastAttemptAt
       RETURN totalAttempts, correctAttempts, avgConfidence,
              scenariosCompleted, quizzesAnswered, correctQuizzes,
              firstAttemptAt, lastAttemptAt`,
      { userId }
    ),
  ])

  if (!userRow.length) {
    return null
  }
  const u = userRow[0]
  const agg = aggregateRow[0] || {}

  return {
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      roles: u.roles || [],
      createdAt: toJsNumber(u.createdAt),
      lastSeenAt: toJsNumber(u.lastSeenAt),
      bank: u.bank && u.bank.id ? u.bank : null,
    },
    completionLedger: ledgerRows.map(r => ({
      id:               r.id,
      title:            r.title,
      severity:         r.severity,
      framework:        r.framework,
      status:           r.status,
      completedAt:      toJsNumber(r.completedAt),
      lastAt:           toJsNumber(r.lastAt),
      totalAttempts:    toJsNumber(r.totalAttempts) || 0,
      stagesAttempted:  toJsNumber(r.stagesAttempted) || 0,
      totalStages:      toJsNumber(r.totalStages) || 0,
      correctAttempts:  toJsNumber(r.correctAttempts) || 0,
      avgConfidence:    r.avgConfidence != null ? Number(r.avgConfidence) : null,
    })),
    conceptMastery: conceptRows.map(r => ({
      id:             r.id,
      name:           r.name,
      universal:      !!r.universal,
      attempts:       toJsNumber(r.attempts) || 0,
      correct:        toJsNumber(r.correct) || 0,
      correctRate:    r.correctRate != null ? Number(r.correctRate) : null,
      avgConfidence:  r.avgConfidence != null ? Number(r.avgConfidence) : null,
      lastAttemptAt:  toJsNumber(r.lastAttemptAt),
    })),
    frameworkProgress: frameworkRows.map(r => ({
      id:        r.id,
      name:      r.name,
      region:    r.region,
      attempts:  toJsNumber(r.attempts) || 0,
      correct:   toJsNumber(r.correct) || 0,
    })),
    mitreExposure: mitreRows.map(r => ({
      id:             r.id,
      name:           r.name,
      attempts:       toJsNumber(r.attempts) || 0,
      correct:        toJsNumber(r.correct) || 0,
      lastAttemptAt:  toJsNumber(r.lastAttemptAt),
    })),
    aggregates: {
      totalAttempts:      toJsNumber(agg.totalAttempts) || 0,
      correctAttempts:    toJsNumber(agg.correctAttempts) || 0,
      avgConfidence:      agg.avgConfidence != null ? Number(agg.avgConfidence) : null,
      scenariosCompleted: toJsNumber(agg.scenariosCompleted) || 0,
      quizzesAnswered:    toJsNumber(agg.quizzesAnswered) || 0,
      correctQuizzes:     toJsNumber(agg.correctQuizzes) || 0,
      firstAttemptAt:     toJsNumber(agg.firstAttemptAt),
      lastAttemptAt:      toJsNumber(agg.lastAttemptAt),
    },
  }
}

function toJsNumber(val) {
  if (val == null) return val
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber()
  return val
}

export default router
