/**
 * add-sc013.js — v25.5.1 migration (ISS-009 SC013)
 *
 * Adds:
 *   - 1 :Scenario node (SC013, framework=CBEST)
 *   - 6 primary :Stage nodes (SC013-S1..S6)
 *   - 3 consequence :Stage nodes (SC013-S1-CONSEQUENCE, S3-CONSEQUENCE, S5-CONSEQUENCE)
 *   - HAS_STAGE edges from scenario to all stages
 *   - LEADS_TO edges from primary stages with consequence branches
 *   - 1 new :Concept node — CREST Accreditation (CBEST-specific)
 *   - APPEARS_IN_FRAMEWORK edges for the new concept (4 frameworks; CBEST
 *     populated, others pending per v25.4.2 pattern)
 *   - TESTS_CONCEPT edges from each stage to its primary concept (and to
 *     CONCEPT-CREST-ACCREDITATION for the procurement stages)
 *   - USES_MITRE_TECHNIQUE edges from stages 4 and 5 (and S5-CONSEQUENCE)
 *     to MITRE techniques T1566.004 and T1219 respectively — first
 *     user-facing consumer of the v25.5 MITRE foundation
 *
 * No CBEST FrameworkPhase wiring — CBEST phases are NOT seeded yet (v25.6
 * freshness pass). The scenario's framework property is sufficient for now.
 *
 * Idempotent: all MERGE-on-stable-IDs. Re-running sets the same properties.
 *
 * Hard preservation checks: existing User, Scenario (other than SC013),
 * Stage (other than SC013-*), Framework, Concept (other than the new
 * CREST one), MitreTechnique, MitreTactic counts must NOT change.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { CBEST_SCENARIO_SC013 } from './data/sc013.js'

// New concept introduced by SC013 — the only schema addition (other than
// the SC013 nodes themselves)
const CREST_CONCEPT = {
  id: 'CONCEPT-CREST-ACCREDITATION',
  name: 'CREST Accreditation',
  universal: false,  // CBEST-specific (TIBER-EU recognises CREST equivalents but uses different terminology)
  summary: 'A formal accreditation administered by CREST (the Council of Registered Ethical Security Testers) that qualifies penetration-testing and threat-intelligence service providers for CBEST and similar regulator-led intelligence-led red-team frameworks. CBEST requires both the Threat Intelligence and Penetration Testing providers to be CREST-accredited at the time of procurement; "in renewal" is not the same as "accredited" and is not accepted by the SCT. Accreditation has to be verified before contract signature, not after.',
  examples: [
    'Provider Alpha: CREST STAR accredited (Simulated Targeted Attack and Response) — qualified for CBEST',
    'Provider Beta: CREST STAR accredited but with banking-sector specialisation only',
    'Provider Gamma: CREST accreditation lapsed January, renewal in progress as of April — NOT qualified at procurement',
  ],
}

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.5.1: seeding SC013 — Commissioning a CBEST Assessment...\n')

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

  // SC013 must not already exist (or we re-set it). Get pre-state for safety.
  const sc013Pre = await runQuery(
    `MATCH (sc:Scenario {id: 'SC013'}) RETURN count(sc) AS c`
  )
  if (sc013Pre[0].c > 0) {
    console.log('ℹ️  SC013 already exists — re-running migration will refresh its properties.\n')
  }

  // -------------------------------------------------------------------------
  // Step 1: new CREST concept node + APPEARS_IN_FRAMEWORK edges
  //   (matches v25.4.2's per-framework summary structure)
  // -------------------------------------------------------------------------
  console.log('💡  Step 1: CREST Accreditation concept...')
  await runQuery(
    `MERGE (k:Concept {id: $id})
     SET k.name      = $name,
         k.summary   = $summary,
         k.examples  = $examples,
         k.universal = $universal`,
    {
      id: CREST_CONCEPT.id,
      name: CREST_CONCEPT.name,
      summary: CREST_CONCEPT.summary,
      examples: JSON.stringify(CREST_CONCEPT.examples),
      universal: CREST_CONCEPT.universal,
    }
  )
  // Link to all four frameworks. CBEST gets the populated summary; others
  // get pending=true so the v25.4.2 ConceptSidebar UI renders the placeholder
  // until v25.6 fills in non-CBEST framework-specific content.
  const frameworks = ['AASE', 'CBEST', 'TIBER-EU', 'iCAST']
  for (const fw of frameworks) {
    const isPopulated = (fw === 'CBEST')
    await runQuery(
      `MATCH (k:Concept {id: $conceptId})
       MATCH (f:Framework {id: $frameworkId})
       MERGE (k)-[r:APPEARS_IN_FRAMEWORK]->(f)
       SET r.summary    = $summary,
           r.pending    = $pending,
           r.vintage    = $vintage,
           r.updatedAt  = timestamp()`,
      {
        conceptId: CREST_CONCEPT.id,
        frameworkId: fw,
        summary: isPopulated ? CREST_CONCEPT.summary : null,
        pending: !isPopulated,
        vintage: isPopulated ? '2024' : null,  // CBEST 2.0 reference period
      }
    )
  }
  console.log(`    1 concept ensured, 4 APPEARS_IN_FRAMEWORK edges (CBEST populated, 3 pending)\n`)

  // -------------------------------------------------------------------------
  // Step 2: SC013 scenario node
  // -------------------------------------------------------------------------
  console.log(`📦  Seeding ${CBEST_SCENARIO_SC013.id}: ${CBEST_SCENARIO_SC013.title}`)
  await runQuery(
    `MERGE (sc:Scenario {id: $id})
     SET sc.title         = $title,
         sc.severity      = $severity,
         sc.summary       = $summary,
         sc.estimatedLoss = $estimatedLoss,
         sc.roles         = $roles,
         sc.framework     = $framework`,
    {
      id: CBEST_SCENARIO_SC013.id,
      title: CBEST_SCENARIO_SC013.title,
      severity: CBEST_SCENARIO_SC013.severity,
      summary: CBEST_SCENARIO_SC013.summary,
      estimatedLoss: CBEST_SCENARIO_SC013.estimatedLoss,
      roles: CBEST_SCENARIO_SC013.roles,
      framework: CBEST_SCENARIO_SC013.framework,
    }
  )

  // -------------------------------------------------------------------------
  // Step 3: stage nodes + HAS_STAGE + TESTS_CONCEPT + USES_MITRE_TECHNIQUE
  // -------------------------------------------------------------------------
  let stageCount = 0
  let conceptLinks = 0
  let cbestConceptLinks = 0
  let mitreLinks = 0

  for (const stage of CBEST_SCENARIO_SC013.stages) {
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
        scenarioId: CBEST_SCENARIO_SC013.id,
      }
    )
    stageCount++

    // TESTS_CONCEPT for the stage's primary aaseConcept (existing wedge from v25.1)
    if (stage.aaseConcept) {
      await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (c:Concept {id: $conceptId})
         MERGE (st)-[r:TESTS_CONCEPT]->(c)`,
        { stageId: stage.id, conceptId: stage.aaseConcept }
      )
      conceptLinks++
    }
    // TESTS_CONCEPT for cbestConcept (new field; same edge type, different concept)
    if (stage.cbestConcept) {
      await runQuery(
        `MATCH (st:Stage {id: $stageId})
         MATCH (c:Concept {id: $conceptId})
         MERGE (st)-[r:TESTS_CONCEPT]->(c)`,
        { stageId: stage.id, conceptId: stage.cbestConcept }
      )
      cbestConceptLinks++
    }
    // USES_MITRE_TECHNIQUE — v25.5 wedge — first user-facing consumer
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
  // Step 4: LEADS_TO edges for consequence branches (second pass)
  // -------------------------------------------------------------------------
  let branchEdges = 0
  for (const stage of CBEST_SCENARIO_SC013.stages) {
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

  console.log(`    stages=${stageCount} concept-links=${conceptLinks} cbest-concept-links=${cbestConceptLinks} mitre-links=${mitreLinks} branch-edges=${branchEdges}\n`)

  // -------------------------------------------------------------------------
  // Hard preservation checks
  // -------------------------------------------------------------------------
  const postSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const postCounts = {}
  postSnapshot.forEach(r => { postCounts[r.label] = r.c })

  // Expected deltas: Scenario +1 (if SC013 didn't exist), Stage +9, Concept +1.
  // Everything else must be unchanged.
  const expectedDeltas = {
    Scenario: sc013Pre[0].c === 0 ? 1 : 0,
    Stage: 9,  // 6 primary + 3 consequence (S1-CONS, S3-CONS, S5-CONS)
    Concept: 1,
  }

  let preservationOK = true
  for (const [label, before] of Object.entries(preCounts)) {
    const after = postCounts[label] || 0
    const expectedDelta = expectedDeltas[label] || 0
    const actualDelta = after - before
    if (actualDelta !== expectedDelta) {
      console.error(`    ❌  ${label}: ${before} → ${after} (expected delta ${expectedDelta}, got ${actualDelta})`)
      preservationOK = false
    }
  }
  if (!preservationOK) {
    console.error('\n❌  Preservation check FAILED.')
    await closeDriver()
    process.exit(1)
  }

  console.log('🔒  Preservation: deltas exactly as expected:')
  for (const [label, delta] of Object.entries(expectedDeltas)) {
    if (delta > 0) {
      console.log(`    ${label.padEnd(20)} +${delta} (now ${postCounts[label] || 0})`)
    }
  }
  console.log('')

  // Verification — fetch SC013 and check structure
  const verify = await runQuery(`
    MATCH (sc:Scenario {id: 'SC013'})-[:HAS_STAGE]->(st:Stage)
    OPTIONAL MATCH (st)-[:TESTS_CONCEPT]->(c:Concept)
    OPTIONAL MATCH (st)-[:USES_MITRE_TECHNIQUE]->(mt:MitreTechnique)
    WITH st, collect(DISTINCT c.id) AS concepts, collect(DISTINCT mt.id) AS mitreTechs
    RETURN st.id AS stageId, st.heading AS heading, st.type AS type,
           concepts, mitreTechs
    ORDER BY st.order
  `)
  console.log('🔬  Verification — SC013 stages and their wedges:')
  verify.forEach(v => {
    const concepts = (v.concepts || []).filter(Boolean)
    const techs = (v.mitreTechs || []).filter(Boolean)
    const concBadge = concepts.length > 0 ? `concepts: [${concepts.join(', ')}]` : ''
    const mitreBadge = techs.length > 0 ? `mitre: [${techs.join(', ')}]` : ''
    console.log(`    ${v.stageId.padEnd(28)} (${v.type})  ${concBadge}  ${mitreBadge}`)
  })

  console.log('')
  console.log(`✅  SC013 seeded.`)
  console.log(`    Next: v25.5.2 will add SC014 (defensive-tactical service-desk-compromise scenario).\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
