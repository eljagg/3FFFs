/**
 * Complex Cypher queries — kept here so route files stay readable.
 *
 * Schema assumed:
 *   (:User)-[:ANSWERED {correct}]->(:Quiz)-[:TESTS]->(:Tactic)
 *   (:User)-[:COMPLETED]->(:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(:Technique)-[:PART_OF]->(:Tactic)
 *   (:Technique)-[:SUBTECHNIQUE_OF]->(:Technique)
 */

/**
 * Returns the full attack path for a scenario:
 * Stages in order, each with its technique and that technique's tactic.
 * One query, ready for the visualizer.
 */
export const SCENARIO_PATH = `
  MATCH (sc:Scenario {id: $scenarioId})
  OPTIONAL MATCH (sc)-[hs:HAS_STAGE]->(st:Stage)
  OPTIONAL MATCH (st)-[:USES_TECHNIQUE]->(tech:Technique)
  OPTIONAL MATCH (tech)-[:PART_OF]->(tac:Tactic)
  WITH sc, st, tech, tac
  ORDER BY st.order
  RETURN sc { .* } AS scenario,
         collect({
           stage: st { .*, signals: st.signals, options: st.options },
           technique: tech { .id, .name, .description },
           tactic: tac { .id, .name, .order, .uniqueToF3 }
         }) AS path
`

/**
 * Returns every F3 technique in the graph, annotated with whether the
 * current user has encountered it (any scenario they've completed that
 * uses it) and whether they've mastered it (correct stage submission).
 *
 * Result shape: [{ id, name, tacticId, tacticName, status: 'mastered' | 'encountered' | 'unseen', scenarioCount }]
 */
export const USER_COVERAGE = `
  MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
  OPTIONAL MATCH (tech)<-[:USES_TECHNIQUE]-(st:Stage)<-[:HAS_STAGE]-(sc:Scenario)
  WITH tech, tac, collect(DISTINCT sc.id) AS scenarios
  OPTIONAL MATCH (u:User {id: $userId})-[c:COMPLETED]->(sc2:Scenario)
    WHERE sc2.id IN scenarios
  WITH tech, tac, scenarios, count(DISTINCT sc2) AS completedCount
  RETURN tech.id        AS id,
         tech.name      AS name,
         tac.id         AS tacticId,
         tac.name       AS tacticName,
         tac.order      AS tacticOrder,
         tac.uniqueToF3 AS uniqueToF3,
         size(scenarios) AS scenarioCount,
         scenarios       AS scenarioIds,
         CASE
           WHEN completedCount > 0 THEN 'mastered'
           WHEN size(scenarios) > 0 THEN 'available'
           ELSE 'unseen'
         END AS status
  ORDER BY tac.order, tech.id
`

/**
 * A user's total progress summary — for the Home page stat cards.
 */
export const USER_PROGRESS_SUMMARY = `
  // OPTIONAL MATCH so we still get a row back even if User doesn't exist yet
  OPTIONAL MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[:COMPLETED]->(sc:Scenario)
  OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
  WITH u,
       count(DISTINCT sc) AS scenariosCompleted,
       count(DISTINCT q)  AS quizzesAnswered,
       sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers
  OPTIONAL MATCH (t:Technique)-[:PART_OF]->(:Tactic)
  WITH u, scenariosCompleted, quizzesAnswered, correctAnswers,
       count(DISTINCT t) AS totalTechniques
  OPTIONAL MATCH (u)-[:COMPLETED]->(sc2:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(coveredTech:Technique)
  RETURN scenariosCompleted,
         quizzesAnswered,
         coalesce(correctAnswers, 0) AS correctAnswers,
         totalTechniques,
         count(DISTINCT coveredTech) AS techniquesEncountered
`

/**
 * Gathers all the "graph state" the AI Tutor needs to personalize responses.
 * Returns one object with progress, gaps, and recommendations — ready to
 * thread into the system prompt.
 */
export const TUTOR_CONTEXT = `
  MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[c:COMPLETED]->(sc:Scenario)
  WITH u, collect(DISTINCT sc.id) AS completedScenarioIds, count(DISTINCT sc) AS scenariosCompleted
  OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
  WITH u, completedScenarioIds, scenariosCompleted,
       count(DISTINCT q) AS quizzesAnswered,
       sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers

  // Per-tactic gap analysis: for each tactic, count techniques the user has
  // encountered (via a completed scenario) vs total in the tactic
  OPTIONAL MATCH (tac:Tactic)
  OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(tac)
  WITH u, completedScenarioIds, scenariosCompleted, quizzesAnswered, correctAnswers,
       tac, collect(DISTINCT tech.id) AS tacticTechIds

  OPTIONAL MATCH (u)-[:COMPLETED]->(scForTac:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(coveredTech:Technique)-[:PART_OF]->(tac)
  WITH u, completedScenarioIds, scenariosCompleted, quizzesAnswered, correctAnswers,
       tac, tacticTechIds,
       count(DISTINCT coveredTech) AS coveredInTactic

  WITH u, completedScenarioIds, scenariosCompleted, quizzesAnswered, correctAnswers,
       collect({
         id: tac.id,
         name: tac.name,
         uniqueToF3: tac.uniqueToF3,
         totalTechniques: size(tacticTechIds),
         coveredTechniques: coveredInTactic
       }) AS tacticCoverage

  // Available scenarios (excluding completed)
  MATCH (sc:Scenario)
  WHERE NOT sc.id IN completedScenarioIds
  WITH u, scenariosCompleted, quizzesAnswered, correctAnswers, tacticCoverage,
       collect({ id: sc.id, title: sc.title, severity: sc.severity }) AS availableScenarios

  RETURN scenariosCompleted,
         quizzesAnswered,
         correctAnswers,
         tacticCoverage,
         availableScenarios
`


/**
 * Context query for the AI Tutor. Returns everything Claude needs to know
 * about the learner in a single round trip:
 *   - scenario and quiz counts
 *   - per-tactic coverage (how many techniques they've touched per tactic)
 *   - which scenarios are still available to them
 *
 * Why a single query: the Tutor hits this every message, so roundtrips matter.
 */
export const TUTOR_CONTEXT = `
  MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[:COMPLETED]->(sc:Scenario)
  WITH u, collect(DISTINCT sc.id) AS completedIds,
       count(DISTINCT sc) AS scenariosCompleted
  OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
  WITH u, completedIds, scenariosCompleted,
       count(DISTINCT q) AS quizzesAnswered,
       sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers
  // Per-tactic coverage: count techniques user touched via completed scenarios
  CALL {
    WITH u, completedIds
    MATCH (t:Tactic)
    OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(t)
    WITH t, count(DISTINCT tech) AS totalTechniques
    OPTIONAL MATCH (sc2:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(covered:Technique)-[:PART_OF]->(t)
      WHERE sc2.id IN completedIds
    WITH t, totalTechniques, count(DISTINCT covered) AS coveredTechniques
    RETURN collect({
      id: t.id, name: t.name, order: t.order, uniqueToF3: t.uniqueToF3,
      totalTechniques: totalTechniques, coveredTechniques: coveredTechniques
    }) AS tacticCoverage
  }
  // Scenarios the user has NOT completed yet
  CALL {
    WITH u, completedIds
    MATCH (s:Scenario)
    WHERE NOT s.id IN completedIds
    RETURN collect({ id: s.id, title: s.title, severity: s.severity }) AS availableScenarios
  }
  RETURN scenariosCompleted, quizzesAnswered, correctAnswers,
         tacticCoverage, availableScenarios
`


/**
 * Pulls all signals from all scenarios, enriched with their correct tactic.
 * Used by the Signal Sorting game. Cached at request time because it's the
 * same for every user and content only changes when we re-seed.
 *
 * Note: signals are stored as JSON strings on Stage nodes. We parse them
 * in the route before returning.
 */
export const ALL_SIGNALS = `
  MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)-[:USES_TECHNIQUE]->(tech:Technique)-[:PART_OF]->(tac:Tactic)
  RETURN sc.id AS scenarioId, sc.title AS scenarioTitle,
         st.id AS stageId, st.signals AS signalsJson,
         tech.id AS techniqueId, tech.name AS techniqueName,
         tac.id AS tacticId, tac.name AS tacticName,
         tac.order AS tacticOrder, tac.uniqueToF3 AS uniqueToF3
  ORDER BY tac.order, sc.id, st.order
`

/**
 * Upserts a user's Signal-Sort high-score. Tied to the User node so
 * leaderboards and progress tracking work naturally in the graph.
 */
export const RECORD_SIGNAL_SCORE = `
  MATCH (u:User {id: $userId})
  WITH u
  SET u.signalSortBest      = CASE WHEN coalesce(u.signalSortBest, 0) >= $score THEN u.signalSortBest ELSE $score END,
      u.signalSortLast      = $score,
      u.signalSortPlayedAt  = timestamp(),
      u.signalSortPlayCount = coalesce(u.signalSortPlayCount, 0) + 1
  RETURN u.signalSortBest AS best, u.signalSortPlayCount AS plays
`


/**
 * Team coverage query — for the Manager Team Skills Graph.
 *
 * Returns, for each F3 technique, how many team members have mastered it
 * (via a completed scenario that uses it) and the list of each member's
 * status for that technique. Admins see all users; managers see their
 * managed users only (MANAGES relationship).
 *
 * If no MANAGES edges exist yet (early days), managers see an empty team
 * and admins see everyone. This lets the feature work immediately.
 */
export const TEAM_COVERAGE = `
  MATCH (me:User {id: $myId})
  WITH me, CASE WHEN $isAdmin THEN true ELSE false END AS isAdmin
  CALL {
    WITH me, isAdmin
    MATCH (u:User)
    WHERE (isAdmin OR (me)-[:MANAGES]->(u)) AND u.id <> me.id
    RETURN collect(u) AS team
  }
  MATCH (tech:Technique)-[:PART_OF]->(tac:Tactic)
  // For each technique, compute: how many team members mastered it
  WITH tech, tac, team,
       [u IN team WHERE EXISTS {
         MATCH (u)-[:COMPLETED]->(:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(tech)
       } | { id: u.id, name: coalesce(u.name, u.email), email: u.email }] AS mastered
  RETURN tech.id        AS techniqueId,
         tech.name      AS techniqueName,
         tac.id         AS tacticId,
         tac.name       AS tacticName,
         tac.order      AS tacticOrder,
         tac.uniqueToF3 AS uniqueToF3,
         size(team)     AS teamSize,
         size(mastered) AS masteredCount,
         [m IN mastered | m] AS masteredBy
  ORDER BY tac.order, tech.id
`

/**
 * Per-member skills matrix — rows = users, cols = tactics, cell = mastery %.
 */
export const TEAM_SKILLS_MATRIX = `
  MATCH (me:User {id: $myId})
  WITH me, CASE WHEN $isAdmin THEN true ELSE false END AS isAdmin
  MATCH (u:User)
  WHERE (isAdmin OR (me)-[:MANAGES]->(u)) AND u.id <> me.id
  MATCH (tac:Tactic)
  OPTIONAL MATCH (tech:Technique)-[:PART_OF]->(tac)
  WITH u, tac, count(DISTINCT tech) AS totalTechs
  OPTIONAL MATCH (u)-[:COMPLETED]->(:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(ct:Technique)-[:PART_OF]->(tac)
  WITH u, tac, totalTechs, count(DISTINCT ct) AS mastered
  RETURN u.id AS userId, coalesce(u.name, u.email) AS userName, u.email AS email,
         collect({
           tacticId: tac.id,
           tacticName: tac.name,
           order: tac.order,
           total: totalTechs,
           mastered: mastered,
           pct: CASE WHEN totalTechs > 0 THEN toFloat(mastered)/totalTechs ELSE 0 END
         }) AS skills
  ORDER BY u.lastSeenAt DESC
`
