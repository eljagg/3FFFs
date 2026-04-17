import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { TACTICS, TECHNIQUES } from './framework.js'
import { SCENARIOS } from './scenarios.js'
import { QUIZZES } from './quizzes.js'

async function main() {
  await verifyConnection()
  console.log('\n🌱  Seeding F3 knowledge graph into Neo4j Aura...\n')

  await runQuery('MATCH (n) DETACH DELETE n')
  console.log('🗑   Cleared existing graph\n')

  await runQuery(`CREATE CONSTRAINT tactic_id    IF NOT EXISTS FOR (t:Tactic)    REQUIRE t.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT technique_id IF NOT EXISTS FOR (t:Technique) REQUIRE t.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT scenario_id  IF NOT EXISTS FOR (s:Scenario)  REQUIRE s.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT stage_id     IF NOT EXISTS FOR (s:Stage)     REQUIRE s.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT quiz_id      IF NOT EXISTS FOR (q:Quiz)      REQUIRE q.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT user_id      IF NOT EXISTS FOR (u:User)      REQUIRE u.id IS UNIQUE`)
  console.log('🔒  Applied uniqueness constraints')

  for (const t of TACTICS) {
    await runQuery(
      `CREATE (:Tactic {
        id: $id, name: $name, order: $order, uniqueToF3: $uniqueToF3,
        summary: $summary, executiveTakeaway: $executiveTakeaway
      })`,
      t
    )
  }
  console.log(`✅  Created ${TACTICS.length} Tactic nodes`)

  for (const tech of TECHNIQUES) {
    await runQuery(
      `MATCH (tac:Tactic {id: $tacticId})
       CREATE (t:Technique {id: $id, name: $name, description: $description})
       CREATE (t)-[:PART_OF]->(tac)`,
      tech
    )
  }
  console.log(`✅  Created ${TECHNIQUES.length} Technique nodes`)

  for (const sc of SCENARIOS) {
    await runQuery(
      `CREATE (:Scenario {
        id: $id, title: $title, severity: $severity, summary: $summary,
        estimatedLoss: $estimatedLoss, roles: $roles
      })`,
      { id: sc.id, title: sc.title, severity: sc.severity, summary: sc.summary,
        estimatedLoss: sc.estimatedLoss, roles: sc.roles }
    )

    for (const stage of sc.stages) {
      const stageId = `${sc.id}-S${stage.order}`
      await runQuery(
        `MATCH (sc:Scenario {id: $scenarioId})
         MATCH (tech:Technique {id: $techniqueId})
         CREATE (st:Stage {
           id: $stageId, order: $order, heading: $heading,
           narrative: $narrative, question: $question,
           signals: $signals, options: $options
         })
         CREATE (sc)-[:HAS_STAGE {order: $order}]->(st)
         CREATE (st)-[:USES_TECHNIQUE]->(tech)`,
        {
          scenarioId: sc.id,
          techniqueId: stage.techniqueId,
          stageId,
          order: stage.order,
          heading: stage.heading,
          narrative: stage.narrative,
          question: stage.question,
          signals: JSON.stringify(stage.signals),
          options: JSON.stringify(stage.options),
        }
      )
    }
    console.log(`✅  Seeded scenario: ${sc.title}`)
  }

  for (const q of QUIZZES) {
    await runQuery(
      `MATCH (tac:Tactic {id: $tacticId})
       CREATE (q:Quiz {
         id: $id, question: $question, difficulty: $difficulty,
         roles: $roles, options: $options
       })
       CREATE (q)-[:TESTS]->(tac)`,
      {
        id: q.id,
        tacticId: q.tacticId,
        question: q.question,
        difficulty: q.difficulty,
        roles: q.roles,
        options: JSON.stringify(q.options),
      }
    )
  }
  console.log(`✅  Created ${QUIZZES.length} Quiz nodes`)

  console.log('\n📊  Final graph summary:')
  const summary = await runQuery(`
    MATCH (n)
    RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY count DESC
  `)
  summary.forEach((r) => console.log(`    ${r.label.padEnd(12)} ${r.count} nodes`))

  const relSummary = await runQuery(`
    MATCH ()-[r]->()
    RETURN type(r) AS type, count(r) AS count
    ORDER BY count DESC
  `)
  console.log('\n    Relationships:')
  relSummary.forEach((r) => console.log(`    ${r.type.padEnd(16)} ${r.count}`))

  console.log('\n🎉  Seed complete!\n')
  await closeDriver()
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err)
  process.exit(1)
})
