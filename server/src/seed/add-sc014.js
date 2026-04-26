/**
 * add-sc014.js — v25.5.2 migration (ISS-009 SC014)
 *
 * Adds:
 *   - 1 :Scenario node (SC014, framework=CBEST, roles include 'soc')
 *   - 6 primary :Stage nodes (SC014-S1..S6)
 *   - 2 consequence :Stage nodes (SC014-S2-CONSEQUENCE, S6-CONSEQUENCE)
 *   - HAS_STAGE edges from scenario to all stages
 *   - LEADS_TO edges from primary stages with consequence branches
 *   - TESTS_CONCEPT edges (primarily Critical Function and Test/Halt Model)
 *   - USES_MITRE_TECHNIQUE edges — every stage in SC014 carries one;
 *     the MITRE wedge is the primary chip on this scenario type
 *
 * No new Concept nodes — SC014 reuses CONCEPT-CRITICAL-FUNCTION and
 * CONCEPT-TEST-HALT-MODEL exclusively.
 *
 * Idempotent: all MERGE-on-stable-IDs. Re-running sets the same properties
 * without creating duplicates.
 *
 * Hard preservation check, IDEMPOTENT-AWARE EDITION (lessons from the
 * v25.5.1 SC013 migration false-positive on re-run): the expected delta
 * is computed from the pre-state. If SC014 doesn't exist, expect +1
 * Scenario, +8 Stage. If SC014 exists already, expect 0 deltas in BOTH.
 * The preservation check accepts either state cleanly. This is the
 * pattern future scenario migrations will follow.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { CBEST_SCENARIO_SC014 } from './data/sc014.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.5.2: seeding SC014 — Inside the Service Desk Compromise...\n')

  // -------------------------------------------------------------------------
  // Pre-snapshot
  // -------------------------------------------------------------------------
  const preSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const preCounts = {}
  preSnapshot.forEach(r => { preCounts[r.label] = r.c })
  console.log('📊  Pre-snapshot (existing graph):')
  for (const [label, count] of Object.entries(preCounts)) {
    console.log(`    ${label.padEnd(20)} ${count}`)
  }
  console.log('')

  // Check whether SC014 + its stages already exist (drives the expected
  // delta calculation; v25.5.1 lesson — the check must be symmetric with
  // the idempotent migration shape)
  const sc014Pre = await runQuery(
    `MATCH (sc:Scenario {id: 'SC014'}) RETURN count(sc) AS c`
  )
  const sc014Existed = sc014Pre[0].c > 0

  const sc014StagesPre = await runQuery(
    `MATCH (st:Stage) WHERE st.id STARTS WITH 'SC014-' RETURN count(st) AS c`
  )
  const existingSc014Stages = sc014StagesPre[0].c

  if (sc014Existed) {
    console.log(`ℹ️  SC014 already exists (${existingSc014Stages} stages); re-running idempotently to refresh properties.\n`)
  } else {
    console.log(`ℹ️  SC014 new — will create scenario + ${CBEST_SCENARIO_SC014.stages.length} stages.\n`)
  }

  // -------------------------------------------------------------------------
  // Step 1: SC014 scenario node
  // -------------------------------------------------------------------------
  console.log(`📦  Seeding ${CBEST_SCENARIO_SC014.id}: ${CBEST_SCENARIO_SC014.title}`)
  await runQuery(
    `MERGE (sc:Scenario {id: $id})
     SET sc.title         = $title,
         sc.severity      = $severity,
         sc.summary       = $summary,
         sc.estimatedLoss = $estimatedLoss,
         sc.roles         = $roles,
         sc.framework     = $framework`,
    {
      id: CBEST_SCENARIO_SC014.id,
      title: CBEST_SCENARIO_SC014.title,
      severity: CBEST_SCENARIO_SC014.severity,
      summary: CBEST_SCENARIO_SC014.summary,
      estimatedLoss: CBEST_SCENARIO_SC014.estimatedLoss,
      roles: CBEST_SCENARIO_SC014.roles,
      framework: CBEST_SCENARIO_SC014.framework,
    }
  )

  // -------------------------------------------------------------------------
  // Step 2: stage nodes + HAS_STAGE + TESTS_CONCEPT + USES_MITRE_TECHNIQUE
  // -------------------------------------------------------------------------
  let stageCount = 0
  let conceptLinks = 0
  let mitreLinks = 0

  for (const stage of CBEST_SCENARIO_SC014.stages) {
    await runQuery(
      `MERGE (st:Stage {id: $id})
       SET st.order     = $order,
           st.type      = $type,
           st.heading   = $heading,
           st.narrative = $narrative,
           st.question  = $question,
           st.signals   = $signals,
           st.options   = $options
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
        scenarioId: CBEST_SCENARIO_SC014.id,
      }
    )
    stageCount++

    if (stage.aaseConcept) {
      await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (c:Concept {id: $conceptId})
         MERGE (st)-[r:TESTS_CONCEPT]->(c)`,
        { stageId: stage.id, conceptId: stage.aaseConcept }
      )
      conceptLinks++
    }
    if (stage.mitreTechnique) {
      await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (mt:MitreTechnique {id: $techniqueId})
         MERGE (st)-[r:USES_MITRE_TECHNIQUE]->(mt)`,
        { stageId: stage.id, techniqueId: stage.mitreTechnique }
      )
      mitreLinks++
    }
  }

  // -------------------------------------------------------------------------
  // Step 3: LEADS_TO edges for consequence branches
  // -------------------------------------------------------------------------
  let branchEdges = 0
  for (const stage of CBEST_SCENARIO_SC014.stages) {
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

  console.log(`    stages=${stageCount} concept-links=${conceptLinks} mitre-links=${mitreLinks} branch-edges=${branchEdges}\n`)

  // -------------------------------------------------------------------------
  // Hard preservation check — IDEMPOTENT-AWARE
  //
  // If SC014 didn't exist before: Scenario delta = +1, Stage delta = +8
  // If SC014 existed already: Scenario delta = 0, Stage delta = 0
  // (The migration is idempotent, so re-runs add nothing.)
  // No other label deltas allowed in either case.
  // -------------------------------------------------------------------------
  const postSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const postCounts = {}
  postSnapshot.forEach(r => { postCounts[r.label] = r.c })

  const stagesAdded = CBEST_SCENARIO_SC014.stages.length  // 8 in our case
  const expectedDeltas = sc014Existed
    ? { Scenario: 0, Stage: 0 }
    : { Scenario: 1, Stage: stagesAdded }

  let preservationOK = true
  // Check the labels we expect to change
  for (const [label, expectedDelta] of Object.entries(expectedDeltas)) {
    const before = preCounts[label] || 0
    const after = postCounts[label] || 0
    const actualDelta = after - before
    if (actualDelta !== expectedDelta) {
      console.error(`    ❌  ${label}: ${before} → ${after} (expected delta ${expectedDelta}, got ${actualDelta})`)
      preservationOK = false
    }
  }
  // Check that NO OTHER label changed unexpectedly
  for (const [label, before] of Object.entries(preCounts)) {
    if (label in expectedDeltas) continue  // already validated above
    const after = postCounts[label] || 0
    if (after !== before) {
      console.error(`    ❌  ${label}: ${before} → ${after} (unexpected change; this label should be untouched)`)
      preservationOK = false
    }
  }
  // Check that no NEW labels appeared
  for (const label of Object.keys(postCounts)) {
    if (!(label in preCounts) && !(label in expectedDeltas)) {
      console.error(`    ❌  New label appeared: ${label} (count: ${postCounts[label]})`)
      preservationOK = false
    }
  }

  if (!preservationOK) {
    console.error('\n❌  Preservation check FAILED.')
    await closeDriver()
    process.exit(1)
  }

  console.log('🔒  Preservation: deltas match expected pattern')
  if (sc014Existed) {
    console.log(`    (idempotent re-run; no count changes expected, none observed)`)
  } else {
    for (const [label, delta] of Object.entries(expectedDeltas)) {
      if (delta > 0) {
        console.log(`    ${label.padEnd(20)} +${delta} (now ${postCounts[label] || 0})`)
      }
    }
  }
  console.log('')

  // Verification — fetch SC014 and check structure
  const verify = await runQuery(`
    MATCH (sc:Scenario {id: 'SC014'})-[:HAS_STAGE]->(st:Stage)
    OPTIONAL MATCH (st)-[:TESTS_CONCEPT]->(c:Concept)
    OPTIONAL MATCH (st)-[:USES_MITRE_TECHNIQUE]->(mt:MitreTechnique)
    WITH st, collect(DISTINCT c.id) AS concepts, collect(DISTINCT mt.id) AS mitreTechs
    RETURN st.id AS stageId, st.heading AS heading, st.type AS type,
           concepts, mitreTechs
    ORDER BY st.order
  `)
  console.log('🔬  Verification — SC014 stages and their wedges:')
  verify.forEach(v => {
    const concepts = (v.concepts || []).filter(Boolean)
    const techs = (v.mitreTechs || []).filter(Boolean)
    const concBadge = concepts.length > 0 ? `concepts: [${concepts.join(', ')}]` : ''
    const mitreBadge = techs.length > 0 ? `mitre: [${techs.join(', ')}]` : ''
    console.log(`    ${v.stageId.padEnd(28)} (${v.type})  ${concBadge}  ${mitreBadge}`)
  })

  console.log('')
  console.log(`✅  SC014 seeded.`)
  console.log(`    Sequence A complete (v25.4.2 → v25.5.2). Next: v25.6 freshness pass.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
