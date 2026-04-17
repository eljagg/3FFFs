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
  MATCH (u:User {id: $userId})
  OPTIONAL MATCH (u)-[:COMPLETED]->(sc:Scenario)
  OPTIONAL MATCH (u)-[a:ANSWERED]->(q:Quiz)
  WITH u,
       count(DISTINCT sc) AS scenariosCompleted,
       count(DISTINCT q)  AS quizzesAnswered,
       sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS correctAnswers
  MATCH (t:Technique)-[:PART_OF]->(:Tactic)
  WITH u, scenariosCompleted, quizzesAnswered, correctAnswers,
       count(DISTINCT t) AS totalTechniques
  OPTIONAL MATCH (u)-[:COMPLETED]->(sc2:Scenario)-[:HAS_STAGE]->(:Stage)-[:USES_TECHNIQUE]->(coveredTech:Technique)
  RETURN scenariosCompleted,
         quizzesAnswered,
         correctAnswers,
         totalTechniques,
         count(DISTINCT coveredTech) AS techniquesEncountered
`
