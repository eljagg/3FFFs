/**
 * add-aase-scenario.js — v25.1 migration: SC010 scenario for the analyst tier.
 *
 * Prerequisites:
 *   - v25.0 migration (add-frameworks.js) MUST have run first.
 *     This script creates :TESTS_CONCEPT and :IN_AASE_PHASE edges from
 *     SC010 stages to Concept and FrameworkPhase nodes seeded by v25.0.
 *     If v25.0 hasn't run, those MERGE-on-MATCH joins will silently no-op
 *     and the stages will exist without their AASE links.
 *
 * Idempotent — safe to re-run. MERGE on stable IDs throughout.
 * Preserves all existing data (the preservation check at the end is a hard
 * assertion; if any pre-existing count drifts, the migration exits with code 1).
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { AASE_SCENARIO } from './data/aase-scenario.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.1: Adding SC010 (Commissioning Your First AASE) scenario...\n')

  // Sanity check that v25.0 ran — if there's no AASE Framework node, the
  // stage→concept edges will silently fail to create.
  const v250Check = await runQuery(`MATCH (f:Framework {id: 'AASE'}) RETURN count(f) AS c`)
  if (v250Check[0].c === 0) {
    console.error('❌  v25.0 (add-frameworks) has not been run. SC010 needs the AASE Framework node and Concept/Phase seeds.')
    console.error('    Run:   npm run migrate:frameworks')
    console.error('    Then:  npm run migrate:aase-scenario')
    await closeDriver()
    process.exit(1)
  }

  // Pre-migration preservation snapshot
  const pre = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
    frameworks:  (await runQuery(`MATCH (f:Framework) RETURN count(f) AS c`))[0].c,
    concepts:    (await runQuery(`MATCH (c:Concept) RETURN count(c) AS c`))[0].c,
  }
  console.log('📊  Pre-migration preservation snapshot:')
  Object.entries(pre).forEach(([k, v]) => console.log(`    ${k.padEnd(12)} ${v}`))
  console.log('')

  const sc = AASE_SCENARIO

  // -------------------------------------------------------------------------
  // Step 1: Scenario node (MERGE — idempotent on re-run)
  // -------------------------------------------------------------------------
  console.log('📦  Step 1: Scenario node...')
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
  console.log(`    ✚ ${sc.id}  ${sc.title}\n`)

  // -------------------------------------------------------------------------
  // Step 2: Stage nodes + HAS_STAGE relationships
  // -------------------------------------------------------------------------
  console.log('🪜  Step 2: Stage nodes (primary + consequence) and HAS_STAGE edges...')
  let stagesProcessed = 0
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
    stagesProcessed++
  }
  console.log(`    ${stagesProcessed} stages ensured.\n`)

  // -------------------------------------------------------------------------
  // Step 3: TESTS_CONCEPT and IN_AASE_PHASE edges (the wedge)
  // -------------------------------------------------------------------------
  console.log('🔗  Step 3: AASE concept and phase links (the new wiring)...')
  let conceptLinks = 0
  let phaseLinks = 0
  for (const stage of sc.stages) {
    if (stage.aaseConcept) {
      const result = await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (c:Concept {id: $conceptId})
         MERGE (st)-[r:TESTS_CONCEPT]->(c)
         RETURN r`,
        { stageId: stage.id, conceptId: stage.aaseConcept }
      )
      if (result.length) conceptLinks++
    }
    if (stage.aasePhase) {
      const result = await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (p:FrameworkPhase {id: $phaseId})
         MERGE (st)-[r:IN_AASE_PHASE]->(p)
         RETURN r`,
        { stageId: stage.id, phaseId: stage.aasePhase }
      )
      if (result.length) phaseLinks++
    }
  }
  console.log(`    ${conceptLinks} TESTS_CONCEPT edges, ${phaseLinks} IN_AASE_PHASE edges.\n`)

  // -------------------------------------------------------------------------
  // Step 4: LEADS_TO branch edges (consequence stages)
  // -------------------------------------------------------------------------
  console.log('🌿  Step 4: LEADS_TO branch edges to consequence stages...')
  let branches = 0
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
        branches++
      }
    }
  }
  console.log(`    ${branches} branch edges ensured.\n`)

  // -------------------------------------------------------------------------
  // Final counts and preservation check
  // -------------------------------------------------------------------------
  const sc010Counts = {
    sc010_stages: (await runQuery(
      `MATCH (sc:Scenario {id: 'SC010'})-[:HAS_STAGE]->(st:Stage)
       RETURN count(st) AS c`))[0].c,
    sc010_concept_links: (await runQuery(
      `MATCH (sc:Scenario {id: 'SC010'})-[:HAS_STAGE]->(st:Stage)-[:TESTS_CONCEPT]->(c:Concept)
       RETURN count(*) AS c`))[0].c,
    sc010_phase_links: (await runQuery(
      `MATCH (sc:Scenario {id: 'SC010'})-[:HAS_STAGE]->(st:Stage)-[:IN_AASE_PHASE]->(p:FrameworkPhase)
       RETURN count(*) AS c`))[0].c,
    sc010_branch_edges: (await runQuery(
      `MATCH (sc:Scenario {id: 'SC010'})-[:HAS_STAGE]->(st:Stage)-[:LEADS_TO]->()
       RETURN count(*) AS c`))[0].c,
  }
  console.log('📊  SC010 graph state:')
  Object.entries(sc010Counts).forEach(([k, v]) => console.log(`    ${k.padEnd(22)} ${v}`))
  console.log('')

  const post = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
    frameworks:  (await runQuery(`MATCH (f:Framework) RETURN count(f) AS c`))[0].c,
    concepts:    (await runQuery(`MATCH (c:Concept) RETURN count(c) AS c`))[0].c,
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

  console.log('\n🎉  v25.1 migration complete. SC010 ready to play.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  console.error('    The migration is idempotent — re-running is safe.')
  process.exit(1)
})
