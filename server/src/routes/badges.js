import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

const router = Router()

/**
 * Badge definitions. Each has:
 *   - id, name, description, tier, icon (for client rendering)
 *   - f3Unique: whether this celebrates F3's differentiators (FA0001/FA0002)
 *   - check(stats): returns true if the user has earned it
 *   - progress(stats): returns a { current, target, label } tuple for locked badges
 *     so we can show "2/3 techniques" progress hints
 *
 * Kept declaratively so adding new badges is a one-entry change. The server
 * does the computing; the client just renders (badge id → icon lookup).
 */
export const BADGE_DEFS = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Completed your first scenario.',
    tier: 'bronze',
    icon: 'target',
    check: s => s.scenariosCompleted >= 1,
    progress: s => ({ current: Math.min(s.scenariosCompleted, 1), target: 1, label: 'scenario' }),
  },
  {
    id: 'graduate',
    name: 'Graduate',
    description: 'Completed three scenarios.',
    tier: 'silver',
    icon: 'cap',
    check: s => s.scenariosCompleted >= 3,
    progress: s => ({ current: Math.min(s.scenariosCompleted, 3), target: 3, label: 'scenarios' }),
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Finished a scenario with every primary stage answered correctly on the first try.',
    tier: 'gold',
    icon: 'diamond',
    check: s => s.perfectScenarios >= 1,
    progress: s => ({ current: Math.min(s.perfectScenarios, 1), target: 1, label: 'perfect run' }),
  },
  {
    id: 'deep-diver',
    name: 'Deep Diver',
    description: 'Answered 10 or more scenario stage questions.',
    tier: 'bronze',
    icon: 'layers',
    check: s => s.totalAttempts >= 10,
    progress: s => ({ current: Math.min(s.totalAttempts, 10), target: 10, label: 'attempts' }),
  },
  {
    id: 'sharp-shooter',
    name: 'Sharp Shooter',
    description: 'Held 80% or better accuracy across 10+ scenario answers.',
    tier: 'silver',
    icon: 'crosshair',
    check: s => s.totalAttempts >= 10 && (s.correctAttempts / s.totalAttempts) >= 0.8,
    progress: s => {
      // Surface the actual blocker. If under 10 attempts, that's what's in the way
      // even if current accuracy is great — no point telling them "86/80%" when
      // they'd lose the badge if their next answer is wrong.
      if (s.totalAttempts < 10) {
        return { current: s.totalAttempts, target: 10, label: 'attempts (then 80%+ accuracy)' }
      }
      const acc = Math.round((s.correctAttempts / s.totalAttempts) * 100)
      return { current: acc, target: 80, label: '% accuracy' }
    },
  },
  {
    id: 'positioning-pro',
    name: 'Positioning Pro',
    description: 'Mastered three techniques in Positioning — F3\'s unique pre-exfiltration tactic.',
    tier: 'gold',
    icon: 'compass',
    f3Unique: true,
    check: s => s.fa0001Mastered >= 3,
    progress: s => ({ current: Math.min(s.fa0001Mastered, 3), target: 3, label: 'FA0001 techniques' }),
  },
  {
    id: 'monetization-hunter',
    name: 'Monetization Hunter',
    description: 'Mastered three techniques in Monetization — F3\'s unique cashout tactic.',
    tier: 'gold',
    icon: 'coin',
    f3Unique: true,
    check: s => s.fa0002Mastered >= 3,
    progress: s => ({ current: Math.min(s.fa0002Mastered, 3), target: 3, label: 'FA0002 techniques' }),
  },
  {
    id: 'signal-sharp',
    name: 'Signal Sharp',
    description: 'Scored 500 or more in Signal Sort.',
    tier: 'silver',
    icon: 'eye',
    check: s => s.signalSortBest >= 500,
    progress: s => ({ current: Math.min(s.signalSortBest, 500), target: 500, label: 'Signal Sort best' }),
  },
]

/**
 * GET /api/badges — returns all badges (earned + locked) and raw stats.
 *
 * Uses four small parallel queries rather than one mega-query:
 *   1. Scenario completion count + per-scenario "all correct" detection
 *   2. FA0001 (Positioning) + FA0002 (Monetization) mastery counts
 *   3. Total + correct stage attempts
 *   4. Signal Sort best score (stored as a user property)
 *
 * Each query is defensive — OPTIONAL MATCH everywhere, coalesce() to zero.
 * If the User node doesn't exist yet, you still get back a well-formed
 * response with zero stats and all badges locked.
 */
router.get('/', async (req, res, next) => {
  try {
    const user = getUser(req)
    const userId = user.id

    const [scenarioRow, masteryRow, attemptsRow, userRow] = await Promise.all([
      // (1) Scenario stats — how many completed + how many were fully correct
      runQuery(
        `OPTIONAL MATCH (u:User {id: $userId})
         OPTIONAL MATCH (u)-[:COMPLETED]->(sc:Scenario)
         WITH u, collect(DISTINCT sc) AS completed

         // Count scenarios where ALL primary stage attempts were correct
         UNWIND (CASE WHEN size(completed) = 0 THEN [null] ELSE completed END) AS scX
         OPTIONAL MATCH (scX)-[:HAS_STAGE]->(primary:Stage)
           WHERE primary.type IS NULL OR primary.type = 'primary'
         WITH u, completed, scX, collect(DISTINCT primary) AS primaryStages

         OPTIONAL MATCH (u)-[a:ATTEMPTED_STAGE]->(stA:Stage)
           WHERE stA IN primaryStages
         WITH completed, scX, primaryStages, collect(DISTINCT a.correct) AS correctFlags

         WITH size(completed) AS scenariosCompleted,
              CASE WHEN scX IS NOT NULL
                        AND size(primaryStages) > 0
                        AND size(correctFlags) = size(primaryStages)
                        AND all(c IN correctFlags WHERE c = true)
                   THEN 1 ELSE 0 END AS isPerfect
         RETURN scenariosCompleted, sum(isPerfect) AS perfectScenarios`,
        { userId }
      ),

      // (2) FA0001 / FA0002 mastery — distinct techniques covered via completed scenarios
      runQuery(
        `OPTIONAL MATCH (u:User {id: $userId})-[:COMPLETED]->(sc:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(tech:Technique)-[:PART_OF]->(tac:Tactic)
         WHERE tac.id IN ['FA0001', 'FA0002']
         RETURN tac.id AS tacticId, count(DISTINCT tech) AS mastered`,
        { userId }
      ),

      // (3) Stage-attempt totals (for Deep Diver + Sharp Shooter)
      runQuery(
        `OPTIONAL MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(:Stage)
         RETURN count(a) AS totalAttempts,
                sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAttempts`,
        { userId }
      ),

      // (4) Signal Sort best score (stored on the User node)
      runQuery(
        `OPTIONAL MATCH (u:User {id: $userId})
         RETURN coalesce(u.signalSortBest, 0) AS signalSortBest`,
        { userId }
      ),
    ])

    const s0 = scenarioRow[0] || {}
    const m = masteryRow || []
    const a0 = attemptsRow[0] || {}
    const u0 = userRow[0] || {}

    const fa0001Mastered = Number(m.find(r => r.tacticId === 'FA0001')?.mastered || 0)
    const fa0002Mastered = Number(m.find(r => r.tacticId === 'FA0002')?.mastered || 0)

    const stats = {
      scenariosCompleted: Number(s0.scenariosCompleted || 0),
      perfectScenarios:   Number(s0.perfectScenarios   || 0),
      fa0001Mastered,
      fa0002Mastered,
      totalAttempts:      Number(a0.totalAttempts      || 0),
      correctAttempts:    Number(a0.correctAttempts    || 0),
      signalSortBest:     Number(u0.signalSortBest     || 0),
    }

    const badges = BADGE_DEFS.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      tier: def.tier,
      icon: def.icon,
      f3Unique: !!def.f3Unique,
      earned: !!def.check(stats),
      progress: def.progress ? def.progress(stats) : null,
    }))

    const earnedCount = badges.filter(b => b.earned).length

    res.json({ badges, stats, earnedCount, totalBadges: badges.length })
  } catch (e) {
    console.error('[/api/badges]', e)
    next(e)
  }
})

export default router
