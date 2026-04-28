/**
 * add-aase-execution-scenarios.js — v25.3 migration: SC011 and SC012 for the
 * analyst-tier AASE arc (Execution and Closure phases).
 *
 * Prerequisites:
 *   - v25.0 (add-frameworks.js) MUST have run first. SC011/SC012 stages link
 *     to Concept and FrameworkPhase nodes seeded by v25.0. If v25.0 hasn't
 *     run, the migration aborts with a clear error.
 *   - v25.1 (add-aase-scenario.js) is NOT a hard prerequisite — but if it
 *     hasn't run, SC011/SC012 will land alongside SC001-SC009 without
 *     SC010 in between, which is the wrong learning sequence. The migration
 *     warns but does not block.
 *
 * Idempotent — safe to re-run. Same MERGE-on-stable-IDs pattern as
 * add-aase-scenario.js, with hard preservation check at the end.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import {
  AASE_SCENARIO_SC011,
  AASE_SCENARIO_SC012,
} from './data/aase-scenarios-execution.js'

const SCENARIOS = [AASE_SCENARIO_SC011, AASE_SCENARIO_SC012]

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.3: Adding SC011 + SC012 (Execution + Closure phase scenarios)...\n')

  // Hard prerequisite check: v25.0 must have run
  const v250Check = await runQuery(`MATCH (f:Framework {id: 'AASE'}) RETURN count(f) AS c`)
  if (v250Check[0].c === 0) {
    console.error('❌  v25.0 (add-frameworks) has not been run. SC011/SC012 need the AASE Framework node and Concept/Phase seeds.')
    console.error('    Run:   npm run migrate:frameworks')
    console.error('    Then:  npm run migrate:aase-execution-scenarios')
    await closeDriver()
    process.exit(1)
  }

  // Soft warning if v25.1 hasn't run
  const v251Check = await runQuery(`MATCH (sc:Scenario {id: 'SC010'}) RETURN count(sc) AS c`)
  if (v251Check[0].c === 0) {
    console.warn('⚠️   SC010 not found in graph. SC011/SC012 will install but learners will see them')
    console.warn('    without the Planning-phase scenario that should precede them.')
    console.warn('    Recommend running migrate:aase-scenario before this migration.')
    console.warn('')
  }

  const pre = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
    frameworks:  (await runQuery(`MATCH (f:Framework) RETURN count(f) AS c`))[0].c,
    concepts:    (await runQuery(`MATCH (c:Concept) RETURN count(c) AS c`))[0].c,
    sc010:       (await runQuery(`MATCH (sc:Scenario {id: 'SC010'}) RETURN count(sc) AS c`))[0].c,
  }
  console.log('📊  Pre-migration preservation snapshot:')
  Object.entries(pre).forEach(([k, v]) => console.log(`    ${k.padEnd(12)} ${v}`))
  console.log('')

  // Seed each scenario in turn — same pattern as add-aase-scenario.js
  for (const sc of SCENARIOS) {
    console.log(`📦  Seeding ${sc.id}: ${sc.title}`)

    await runQuery(
      `MERGE (sc:Scenario {id: $id})
       SET sc.title = $title, sc.severity = $severity, sc.summary = $summary,
           sc.estimatedLoss = $estimatedLoss, sc.roles = $roles,
           sc.framework = $framework`,
      {
        id: sc.id,
        title: sc.title,
        severity: sc.severity,
        summary: sc.summary,
        estimatedLoss: sc.estimatedLoss,
        roles: sc.roles,
        framework: sc.framework,
      }
    )

    let stages = 0
    let conceptLinks = 0
    let phaseLinks = 0
    let branchEdges = 0

    for (const stage of sc.stages) {
      await runQuery(
        `MERGE (st:Stage {id: $id})
         SET st.order = $order, st.type = $type, st.heading = $heading,
             st.narrative = $narrative, st.question = $question,
             st.signals = $signals, st.options = $options
         WITH st
         MATCH (sc:Scenario {id: $scenarioId})
         MERGE (sc)-[r:HAS_STAGE]->(st)
         SET r.order = $order`,
        {
          id: stage.id,
          order: stage.order,
          type: stage.type || 'primary',
          heading: stage.heading,
          narrative: stage.narrative,
          question: stage.question,
          signals: JSON.stringify(stage.signals || []),
          options: JSON.stringify(stage.options || []),
          scenarioId: sc.id,
        }
      )
      stages++

      if (stage.aaseConcept) {
        await runQuery(
          `MATCH (st:Stage {id: $stageId})
           MATCH (c:Concept {id: $conceptId})
           MERGE (st)-[r:TESTS_CONCEPT]->(c)`,
          { stageId: stage.id, conceptId: stage.aaseConcept }
        )
        conceptLinks++
      }
      if (stage.aasePhase) {
        await runQuery(
          `MATCH (st:Stage {id: $stageId})
           MATCH (p:FrameworkPhase {id: $phaseId})
           MERGE (st)-[r:IN_AASE_PHASE]->(p)`,
          { stageId: stage.id, phaseId: stage.aasePhase }
        )
        phaseLinks++
      }
    }

    // Branch edges in a second pass
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
          branchEdges++
        }
      }
    }

    console.log(`    stages=${stages}  concept-links=${conceptLinks}  phase-links=${phaseLinks}  branches=${branchEdges}`)
  }
  console.log('')

  // Post-migration verification per scenario
  for (const sc of SCENARIOS) {
    const counts = {
      stages: (await runQuery(
        `MATCH (sc:Scenario {id: $id})-[:HAS_STAGE]->(st:Stage)
         RETURN count(st) AS c`, { id: sc.id }))[0].c,
      conceptLinks: (await runQuery(
        `MATCH (sc:Scenario {id: $id})-[:HAS_STAGE]->(st:Stage)-[:TESTS_CONCEPT]->(:Concept)
         RETURN count(*) AS c`, { id: sc.id }))[0].c,
      phaseLinks: (await runQuery(
        `MATCH (sc:Scenario {id: $id})-[:HAS_STAGE]->(st:Stage)-[:IN_AASE_PHASE]->(:FrameworkPhase)
         RETURN count(*) AS c`, { id: sc.id }))[0].c,
      branches: (await runQuery(
        `MATCH (sc:Scenario {id: $id})-[:HAS_STAGE]->(st:Stage)-[:LEADS_TO]->()
         RETURN count(*) AS c`, { id: sc.id }))[0].c,
    }
    console.log(`📊  ${sc.id} graph state: stages=${counts.stages}  concepts=${counts.conceptLinks}  phases=${counts.phaseLinks}  branches=${counts.branches}`)
  }
  console.log('')

  const post = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
    frameworks:  (await runQuery(`MATCH (f:Framework) RETURN count(f) AS c`))[0].c,
    concepts:    (await runQuery(`MATCH (c:Concept) RETURN count(c) AS c`))[0].c,
    sc010:       (await runQuery(`MATCH (sc:Scenario {id: 'SC010'}) RETURN count(sc) AS c`))[0].c,
  }
  console.log('🔒  Preservation check:')
  let ok = true
  Object.entries(pre).forEach(([k, before]) => {
    const after = post[k]
    const matched = before === after
    if (!matched) ok = false
    console.log(`    ${k.padEnd(12)} before=${before}  after=${after}  ${matched ? '✓' : '✗ DRIFT'}`)
  })

  if (!ok) {
    console.error('\n❌  Preservation check FAILED.')
    await closeDriver()
    process.exit(1)
  }

  console.log('\n🎉  v25.3 migration complete. SC011 + SC012 ready to play.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  console.error('    The migration is idempotent — re-running is safe.')
  process.exit(1)
})
