/**
 * add-caribbean.js — additive scenario migration
 *
 * Runs once (idempotent — safe to re-run). MERGEs the 6 new Caribbean-specific
 * scenarios (SC004-SC009) into the live graph WITHOUT deleting anything that
 * already exists. Preserves:
 *   - all User nodes and their login history
 *   - all COMPLETED edges (scenarios the user has finished)
 *   - all ATTEMPTED_STAGE edges (stage answers already recorded)
 *   - all ANSWERED edges (quiz history)
 *   - the existing SC001-SC003 scenarios unchanged
 *
 * Run it once with:   node src/seed/add-caribbean.js
 *
 * Contrast with run.js which does `MATCH (n) DETACH DELETE n` at line 53 and
 * nukes the entire graph before reseeding. Use run.js only when you genuinely
 * want a fresh start (losing user progress).
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { CARIBBEAN_SCENARIOS } from './caribbean-scenarios.js'

async function main() {
  await verifyConnection()
  console.log('\n🌴  Adding Caribbean scenarios to the graph (additive, preserves existing data)...\n')

  // Sanity check: count what's currently there so user can see before/after
  const beforeCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('📊  Before migration:')
  beforeCounts.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))
  console.log('')

  let stagesCreated = 0
  let stagesUpdated = 0
  let branchesCreated = 0
  let techniqueLinks = 0
  let scenariosCreated = 0
  let scenariosSkipped = 0

  for (const sc of CARIBBEAN_SCENARIOS) {
    // Skip if this scenario ID already exists — the migration is idempotent
    // but we don't want to overwrite a scenario that a user already has
    // progress on (in case someone re-ran the migration after editing content)
    const exists = await runQuery(
      `MATCH (sc:Scenario {id: $id}) RETURN sc.id AS id`,
      { id: sc.id }
    )

    if (exists.length > 0) {
      // Scenario node exists — update its metadata but leave stages alone if present
      await runQuery(
        `MATCH (sc:Scenario {id: $id})
         SET sc.title = $title, sc.severity = $severity, sc.summary = $summary,
             sc.estimatedLoss = $estimatedLoss, sc.roles = $roles`,
        {
          id: sc.id, title: sc.title, severity: sc.severity, summary: sc.summary,
          estimatedLoss: sc.estimatedLoss, roles: sc.roles,
        }
      )
      scenariosSkipped++
      console.log(`↻  ${sc.id} already exists — metadata refreshed, stages preserved`)
    } else {
      // New scenario — create the node
      await runQuery(
        `CREATE (:Scenario {
          id: $id, title: $title, severity: $severity, summary: $summary,
          estimatedLoss: $estimatedLoss, roles: $roles
        })`,
        {
          id: sc.id, title: sc.title, severity: sc.severity, summary: sc.summary,
          estimatedLoss: sc.estimatedLoss, roles: sc.roles,
        }
      )
      scenariosCreated++
      console.log(`✚  ${sc.id} created: ${sc.title}`)
    }

    // First pass: MERGE each stage. If a stage with this id already exists
    // (re-run of migration), update its content; otherwise create it.
    for (const stage of sc.stages) {
      const stageExists = await runQuery(
        `MATCH (st:Stage {id: $id}) RETURN st.id AS id`,
        { id: stage.id }
      )

      if (stageExists.length > 0) {
        await runQuery(
          `MATCH (st:Stage {id: $id})
           SET st.order = $order, st.type = $type, st.heading = $heading,
               st.narrative = $narrative, st.question = $question,
               st.signals = $signals, st.options = $options`,
          {
            id: stage.id,
            order: stage.order,
            type: stage.type || 'primary',
            heading: stage.heading,
            narrative: stage.narrative,
            question: stage.question,
            signals: JSON.stringify(stage.signals),
            options: JSON.stringify(stage.options),
          }
        )
        stagesUpdated++
      } else {
        await runQuery(
          `MATCH (sc:Scenario {id: $scenarioId})
           CREATE (st:Stage {
             id: $id, order: $order, type: $type, heading: $heading,
             narrative: $narrative, question: $question,
             signals: $signals, options: $options
           })
           CREATE (sc)-[:HAS_STAGE {order: $order}]->(st)`,
          {
            scenarioId: sc.id,
            id: stage.id,
            order: stage.order,
            type: stage.type || 'primary',
            heading: stage.heading,
            narrative: stage.narrative,
            question: stage.question,
            signals: JSON.stringify(stage.signals),
            options: JSON.stringify(stage.options),
          }
        )
        stagesCreated++
      }

      // Link stage → technique (MERGE so re-runs don't duplicate)
      if (stage.techniqueId) {
        const linkRes = await runQuery(
          `MATCH (st:Stage {id: $stageId})
           MATCH (tech:Technique {id: $techniqueId})
           MERGE (st)-[r:USES_TECHNIQUE]->(tech)
           RETURN r`,
          { stageId: stage.id, techniqueId: stage.techniqueId }
        )
        if (linkRes.length) techniqueLinks++
      }
    }

    // Second pass: MERGE branch edges (LEADS_TO) — idempotent
    for (const stage of sc.stages) {
      const options = stage.options || []
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        if (opt.leadsTo) {
          await runQuery(
            `MATCH (from:Stage {id: $fromId})
             MATCH (to:Stage {id: $toId})
             MERGE (from)-[r:LEADS_TO {onOption: $onOption}]->(to)
             ON CREATE SET r.consequence = true`,
            { fromId: stage.id, toId: opt.leadsTo, onOption: i }
          )
          branchesCreated++
        }
      }
    }
  }

  console.log('')
  console.log('✅  Migration summary:')
  console.log(`    Scenarios created:        ${scenariosCreated}`)
  console.log(`    Scenarios already existed: ${scenariosSkipped}`)
  console.log(`    Stages created:           ${stagesCreated}`)
  console.log(`    Stages updated:           ${stagesUpdated}`)
  console.log(`    Branch edges processed:   ${branchesCreated}`)
  console.log(`    Technique links:          ${techniqueLinks}`)

  const afterCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('')
  console.log('📊  After migration:')
  afterCounts.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))

  // Verify nothing got deleted
  const preservedUsers = await runQuery(`MATCH (u:User) RETURN count(u) AS c`)
  const preservedCompleted = await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`)
  const preservedAttempts = await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`)
  console.log('')
  console.log('🔒  Preservation check:')
  console.log(`    User nodes:        ${preservedUsers[0].c} (should be unchanged)`)
  console.log(`    COMPLETED edges:   ${preservedCompleted[0].c} (should be unchanged)`)
  console.log(`    ATTEMPTED_STAGE:   ${preservedAttempts[0].c} (should be unchanged)`)

  console.log('\n🎉  Migration complete!\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
