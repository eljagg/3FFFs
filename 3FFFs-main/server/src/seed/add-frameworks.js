/**
 * add-frameworks.js — v25.0 additive schema and content migration
 *
 * Extends the graph with the AASE/CBEST/TIBER-EU/iCAST framework ontology.
 * Runs idempotently — safe to re-run. Preserves all existing data:
 *   - User nodes and login history
 *   - Scenario / Stage / Tactic / Technique nodes from F3
 *   - All COMPLETED, ATTEMPTED_STAGE, ANSWERED edges
 *
 * What this migration adds:
 *   New labels: :Framework, :FrameworkPhase, :Role, :Deliverable, :Concept,
 *               :ThreatActor, :Regulator
 *   New constraints: uniqueness on .id for each new label
 *   New relationships: :HAS_PHASE, :PRODUCES_DELIVERABLE, :INVOLVES_ROLE,
 *                      :APPEARS_IN_PHASE, :MODELLED_IN_FRAMEWORK,
 *                      :AUTHORED, :RECOGNISED
 *
 * Run on Railway via:   railway run --service server node src/seed/add-frameworks.js
 * Run locally via:      cd server && node src/seed/add-frameworks.js
 *
 * Deliberately does NOT touch any existing F3 nodes or relationships. If
 * something goes wrong partway through, re-running picks up where it left off
 * because every CREATE is wrapped in MERGE.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import {
  AASE_FRAMEWORK,
  AASE_PHASES,
  AASE_ROLES,
  AASE_DELIVERABLES,
  AASE_CONCEPTS,
  AASE_THREAT_ACTORS,
} from './data/aase-content.js'
import {
  FRAMEWORK_SKELETONS,
  REGULATORS,
  FRAMEWORK_REGULATOR_LINKS,
} from './data/frameworks-skeleton.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.0: Adding AASE/CBEST/TIBER-EU/iCAST framework ontology...\n')

  // Snapshot of preservation-sensitive counts for the post-migration check
  const preBefore = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    scenarios:   (await runQuery(`MATCH (s:Scenario) RETURN count(s) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
  }

  console.log('📊  Pre-migration preservation snapshot:')
  Object.entries(preBefore).forEach(([k, v]) => console.log(`    ${k.padEnd(12)} ${v}`))
  console.log('')

  // -------------------------------------------------------------------------
  // Step 1: constraints (uniqueness on .id for each new label)
  // -------------------------------------------------------------------------
  console.log('🔐  Step 1: creating constraints (idempotent — IF NOT EXISTS)...')
  const constraints = [
    'CREATE CONSTRAINT framework_id IF NOT EXISTS FOR (n:Framework) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT framework_phase_id IF NOT EXISTS FOR (n:FrameworkPhase) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT role_id IF NOT EXISTS FOR (n:Role) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT deliverable_id IF NOT EXISTS FOR (n:Deliverable) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (n:Concept) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT threat_actor_id IF NOT EXISTS FOR (n:ThreatActor) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT regulator_id IF NOT EXISTS FOR (n:Regulator) REQUIRE n.id IS UNIQUE',
  ]
  for (const c of constraints) {
    await runQuery(c)
  }
  console.log(`    ${constraints.length} constraints ensured.\n`)

  // -------------------------------------------------------------------------
  // Step 2: Frameworks
  // -------------------------------------------------------------------------
  console.log('📦  Step 2: framework nodes...')
  const allFrameworks = [AASE_FRAMEWORK, ...FRAMEWORK_SKELETONS]
  for (const fw of allFrameworks) {
    await runQuery(
      `MERGE (f:Framework {id: $id})
       SET f.name = $name, f.alsoKnownAs = $alsoKnownAs,
           f.publishedBy = $publishedBy, f.publishedYear = $publishedYear,
           f.region = $region, f.description = $description,
           f.primaryGoal = $primaryGoal, f.oneLineSummary = $oneLineSummary,
           f.version = $version`,
      {
        id: fw.id,
        name: fw.name,
        alsoKnownAs: fw.alsoKnownAs || null,
        publishedBy: fw.publishedBy,
        publishedYear: fw.publishedYear,
        region: fw.region,
        description: fw.description,
        primaryGoal: fw.primaryGoal || null,
        oneLineSummary: fw.oneLineSummary || null,
        version: fw.version || null,
      }
    )
    console.log(`    ✚ ${fw.id}  ${fw.name}`)
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Step 3: AASE phases + relationship to AASE framework
  // -------------------------------------------------------------------------
  console.log('🔄  Step 3: AASE phases (4-phase lifecycle)...')
  for (const phase of AASE_PHASES) {
    await runQuery(
      `MERGE (p:FrameworkPhase {id: $id})
       SET p.order = $order, p.name = $name, p.summary = $summary,
           p.keyDecisions = $keyDecisions
       WITH p
       MATCH (f:Framework {id: 'AASE'})
       MERGE (f)-[:HAS_PHASE {order: $order}]->(p)`,
      {
        id: phase.id,
        order: phase.order,
        name: phase.name,
        summary: phase.summary,
        keyDecisions: JSON.stringify(phase.keyDecisions),
      }
    )
    console.log(`    ✚ Phase ${phase.order}: ${phase.name}`)
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Step 4: roles
  // -------------------------------------------------------------------------
  console.log('👥  Step 4: AASE roles...')
  for (const role of AASE_ROLES) {
    await runQuery(
      `MERGE (r:Role {id: $id})
       SET r.name = $name, r.summary = $summary,
           r.keyResponsibilities = $keyResponsibilities,
           r.secretAware = $secretAware`,
      {
        id: role.id,
        name: role.name,
        summary: role.summary,
        keyResponsibilities: JSON.stringify(role.keyResponsibilities),
        secretAware: role.secretAware,
      }
    )
  }
  console.log(`    ${AASE_ROLES.length} roles ensured.\n`)

  // -------------------------------------------------------------------------
  // Step 5: deliverables + relationships (produces, in-phase)
  // -------------------------------------------------------------------------
  console.log('📄  Step 5: deliverables and producer/phase links...')
  for (const d of AASE_DELIVERABLES) {
    await runQuery(
      `MERGE (d:Deliverable {id: $id})
       SET d.name = $name, d.contents = $contents`,
      {
        id: d.id, name: d.name, contents: JSON.stringify(d.contents),
      }
    )
    // d -[:PRODUCED_BY]-> role
    await runQuery(
      `MATCH (d:Deliverable {id: $deliverableId})
       MATCH (r:Role {id: $roleId})
       MERGE (d)-[:PRODUCED_BY]->(r)`,
      { deliverableId: d.id, roleId: d.producedBy }
    )
    // d -[:IN_PHASE]-> phase
    await runQuery(
      `MATCH (d:Deliverable {id: $deliverableId})
       MATCH (p:FrameworkPhase {id: $phaseId})
       MERGE (d)-[:IN_PHASE]->(p)`,
      { deliverableId: d.id, phaseId: d.phase }
    )
  }
  console.log(`    ${AASE_DELIVERABLES.length} deliverables linked.\n`)

  // -------------------------------------------------------------------------
  // Step 6: concepts + universal-in-framework relationships
  // -------------------------------------------------------------------------
  console.log('💡  Step 6: concepts (shared vocabulary)...')
  for (const c of AASE_CONCEPTS) {
    await runQuery(
      `MERGE (k:Concept {id: $id})
       SET k.name = $name, k.summary = $summary,
           k.examples = $examples, k.universal = $universal`,
      {
        id: c.id,
        name: c.name,
        summary: c.summary,
        examples: JSON.stringify(c.examples || []),
        universal: c.universal,
      }
    )
    // Link concept to AASE framework as APPEARS_IN
    await runQuery(
      `MATCH (k:Concept {id: $conceptId})
       MATCH (f:Framework {id: 'AASE'})
       MERGE (k)-[:APPEARS_IN_FRAMEWORK]->(f)`,
      { conceptId: c.id }
    )
    // For concepts marked universal, also link to the other three frameworks.
    // This is what the v25.5 cross-framework comparison query traverses.
    if (c.universal) {
      for (const fw of FRAMEWORK_SKELETONS) {
        await runQuery(
          `MATCH (k:Concept {id: $conceptId})
           MATCH (f:Framework {id: $frameworkId})
           MERGE (k)-[:APPEARS_IN_FRAMEWORK]->(f)`,
          { conceptId: c.id, frameworkId: fw.id }
        )
      }
    }
  }
  console.log(`    ${AASE_CONCEPTS.length} concepts ensured.\n`)

  // -------------------------------------------------------------------------
  // Step 7: threat actors (sample data from PDF page 39 threat matrix)
  // -------------------------------------------------------------------------
  console.log('🎯  Step 7: threat actors for the Threat Matrix widget...')
  for (const a of AASE_THREAT_ACTORS) {
    await runQuery(
      `MERGE (ta:ThreatActor {id: $id})
       SET ta.name = $name, ta.intent = $intent, ta.capability = $capability,
           ta.threatRating = $threatRating, ta.summary = $summary
       WITH ta
       MATCH (f:Framework {id: 'AASE'})
       MERGE (ta)-[:MODELLED_IN_FRAMEWORK]->(f)`,
      {
        id: a.id, name: a.name, intent: a.intent, capability: a.capability,
        threatRating: a.threatRating, summary: a.summary,
      }
    )
  }
  console.log(`    ${AASE_THREAT_ACTORS.length} threat actors ensured.\n`)

  // -------------------------------------------------------------------------
  // Step 8: regulators + framework relationships
  // -------------------------------------------------------------------------
  console.log('🏛️   Step 8: regulators and framework relationships...')
  for (const r of REGULATORS) {
    await runQuery(
      `MERGE (reg:Regulator {id: $id})
       SET reg.name = $name, reg.country = $country, reg.countryCode = $countryCode,
           reg.region = $region, reg.note = $note`,
      r
    )
  }

  for (const link of FRAMEWORK_REGULATOR_LINKS) {
    if (link.relationship === 'AUTHORED') {
      await runQuery(
        `MATCH (reg:Regulator {id: $regulatorId})
         MATCH (f:Framework {id: $frameworkId})
         MERGE (reg)-[:AUTHORED]->(f)`,
        link
      )
    } else if (link.relationship === 'RECOGNISED') {
      await runQuery(
        `MATCH (reg:Regulator {id: $regulatorId})
         MATCH (f:Framework {id: $frameworkId})
         MERGE (reg)-[:RECOGNISES]->(f)`,
        link
      )
    }
  }
  console.log(`    ${REGULATORS.length} regulators, ${FRAMEWORK_REGULATOR_LINKS.length} framework links.\n`)

  // -------------------------------------------------------------------------
  // Final counts and preservation check
  // -------------------------------------------------------------------------
  const after = {
    frameworks:    (await runQuery(`MATCH (n:Framework) RETURN count(n) AS c`))[0].c,
    phases:        (await runQuery(`MATCH (n:FrameworkPhase) RETURN count(n) AS c`))[0].c,
    roles:         (await runQuery(`MATCH (n:Role) RETURN count(n) AS c`))[0].c,
    deliverables:  (await runQuery(`MATCH (n:Deliverable) RETURN count(n) AS c`))[0].c,
    concepts:      (await runQuery(`MATCH (n:Concept) RETURN count(n) AS c`))[0].c,
    threatActors:  (await runQuery(`MATCH (n:ThreatActor) RETURN count(n) AS c`))[0].c,
    regulators:    (await runQuery(`MATCH (n:Regulator) RETURN count(n) AS c`))[0].c,
  }
  console.log('📊  Post-migration counts (new node types):')
  Object.entries(after).forEach(([k, v]) => console.log(`    ${k.padEnd(14)} ${v}`))
  console.log('')

  const preAfter = {
    users:       (await runQuery(`MATCH (u:User) RETURN count(u) AS c`))[0].c,
    completed:   (await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`))[0].c,
    attempts:    (await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`))[0].c,
    answered:    (await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`))[0].c,
    scenarios:   (await runQuery(`MATCH (s:Scenario) RETURN count(s) AS c`))[0].c,
    techniques:  (await runQuery(`MATCH (t:Technique) RETURN count(t) AS c`))[0].c,
  }
  console.log('🔒  Preservation check (these MUST equal the pre-migration values):')
  let preservationOk = true
  Object.entries(preBefore).forEach(([k, before]) => {
    const after = preAfter[k]
    const ok = before === after
    if (!ok) preservationOk = false
    console.log(`    ${k.padEnd(12)} before=${before}  after=${after}  ${ok ? '✓' : '✗ DRIFT'}`)
  })

  if (!preservationOk) {
    console.error('\n❌  Preservation check FAILED — pre-existing data has drifted.')
    console.error('    Investigate before treating this migration as complete.')
    await closeDriver()
    process.exit(1)
  }

  console.log('\n🎉  v25.0 migration complete. All pre-existing data intact.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  console.error('    The migration is idempotent — re-running is safe and will resume.')
  process.exit(1)
})
