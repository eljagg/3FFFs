/**
 * add-cbest-phases.js — v25.6.1 CBEST FrameworkPhase migration (ISS-013)
 *
 * Adds:
 *   - 20 :FrameworkPhase nodes (5 top-level phases + 15 sub-stages)
 *     for the CBEST framework, sourced from BoE Implementation Guide
 *     (2024 ed., PRA, CC-BY 4.0)
 *   - HAS_PHASE edges from (Framework {id:'CBEST'}) to each top-level phase
 *   - HAS_SUBPHASE edges from each top-level phase to its sub-stages
 *     (kept on top of the flat parentId pattern for cleaner queries)
 *   - IN_FRAMEWORK_PHASE edges from existing SC013/SC014 stages to their
 *     specific sub-stage nodes (per SC013_STAGE_PHASE_MAP and
 *     SC014_STAGE_PHASE_MAP in cbest-phases.js)
 *
 * Idempotent-aware preservation pattern from the start (canonical from
 * add-sc014.js / v25.6.0.1 backport). On fresh seed: +20 FrameworkPhase
 * nodes. On re-run: 0 deltas. No other label should change either way.
 *
 * Vintage marker: 'CBEST 2024 BoE Implementation Guide (v25.6.1)'
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import {
  CBEST_PHASES,
  SC013_STAGE_PHASE_MAP,
  SC014_STAGE_PHASE_MAP,
} from './data/cbest-phases.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.6.1: seeding CBEST FrameworkPhase taxonomy (ISS-013)...\n')

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

  // -------------------------------------------------------------------------
  // Detect prior CBEST phase state for idempotent-aware preservation
  // -------------------------------------------------------------------------
  const cbestPhasesPre = await runQuery(
    `MATCH (p:FrameworkPhase) WHERE p.id STARTS WITH 'CBEST-PHASE' OR p.id = 'CBEST-POST-THEMATIC'
     RETURN count(p) AS c`
  )
  const cbestPhasesExisted = cbestPhasesPre[0].c > 0
  if (cbestPhasesExisted) {
    console.log(`ℹ️  CBEST phases already exist (${cbestPhasesPre[0].c}); re-running idempotently to refresh properties.\n`)
  }

  // -------------------------------------------------------------------------
  // Step 1: ensure CBEST framework exists (sanity)
  // -------------------------------------------------------------------------
  const cbestFw = await runQuery(`MATCH (f:Framework {id: 'CBEST'}) RETURN count(f) AS c`)
  if (cbestFw[0].c === 0) {
    console.error('❌  CBEST Framework node not found. Run migrate:frameworks first.')
    await closeDriver()
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // Step 2: MERGE FrameworkPhase nodes (top-level + sub-stages)
  //   Properties stored as JSON strings where the structure is
  //   complex (deliverables, roleContent) — Neo4j does not support
  //   nested object properties on nodes. Server-side endpoint parses
  //   them back to JSON before returning to client.
  // -------------------------------------------------------------------------
  console.log('🧩  Step 1: FrameworkPhase nodes (5 top-level + 15 sub-stages)...')
  let nodesEnsured = 0
  for (const phase of CBEST_PHASES) {
    await runQuery(
      `MERGE (p:FrameworkPhase {id: $id})
       SET p.framework      = $framework,
           p.level          = $level,
           p.parentId       = $parentId,
           p.order          = $order,
           p.name           = $name,
           p.code           = $code,
           p.durationLabel  = $durationLabel,
           p.summary        = $summary,
           p.boeReference   = $boeReference,
           p.deliverables   = $deliverables,
           p.roleContent    = $roleContent`,
      {
        id: phase.id,
        framework: phase.framework,
        level: phase.level,
        parentId: phase.parentId,
        order: phase.order,
        name: phase.name,
        code: phase.code,
        durationLabel: phase.durationLabel,
        summary: phase.summary,
        boeReference: phase.boeReference,
        deliverables: JSON.stringify(phase.deliverables),
        roleContent: JSON.stringify(phase.roleContent),
      }
    )
    nodesEnsured++
  }
  console.log(`    ${nodesEnsured} FrameworkPhase nodes ensured`)

  // -------------------------------------------------------------------------
  // Step 3: HAS_PHASE edges from CBEST Framework to top-level phases
  // -------------------------------------------------------------------------
  console.log('🔗  Step 2: HAS_PHASE edges from CBEST Framework to top-level phases...')
  let hasPhaseEdges = 0
  for (const phase of CBEST_PHASES.filter(p => p.level === 'phase')) {
    await runQuery(
      `MATCH (f:Framework {id: 'CBEST'})
       MATCH (p:FrameworkPhase {id: $id})
       MERGE (f)-[r:HAS_PHASE]->(p)
       SET r.order = $order`,
      { id: phase.id, order: phase.order }
    )
    hasPhaseEdges++
  }
  console.log(`    ${hasPhaseEdges} HAS_PHASE edges ensured`)

  // -------------------------------------------------------------------------
  // Step 4: HAS_SUBPHASE edges from top-level phases to their sub-stages
  // -------------------------------------------------------------------------
  console.log('🔗  Step 3: HAS_SUBPHASE edges (parent → child)...')
  let hasSubphaseEdges = 0
  for (const phase of CBEST_PHASES.filter(p => p.level === 'sub-stage')) {
    await runQuery(
      `MATCH (parent:FrameworkPhase {id: $parentId})
       MATCH (child:FrameworkPhase {id: $childId})
       MERGE (parent)-[r:HAS_SUBPHASE]->(child)
       SET r.order = $order`,
      { parentId: phase.parentId, childId: phase.id, order: phase.order }
    )
    hasSubphaseEdges++
  }
  console.log(`    ${hasSubphaseEdges} HAS_SUBPHASE edges ensured`)

  // -------------------------------------------------------------------------
  // Step 5: IN_FRAMEWORK_PHASE edges from SC013 / SC014 stages to sub-stages
  // -------------------------------------------------------------------------
  console.log('🔗  Step 4: IN_FRAMEWORK_PHASE edges (Stage → FrameworkPhase)...')
  let inPhaseEdges = 0
  for (const [stageId, phaseId] of Object.entries(SC013_STAGE_PHASE_MAP)) {
    const result = await runQuery(
      `MATCH (st:Stage {id: $stageId})
       MATCH (p:FrameworkPhase {id: $phaseId})
       MERGE (st)-[r:IN_FRAMEWORK_PHASE]->(p)
       RETURN count(r) AS c`,
      { stageId, phaseId }
    )
    if (result[0]?.c > 0) inPhaseEdges++
  }
  for (const [stageId, phaseId] of Object.entries(SC014_STAGE_PHASE_MAP)) {
    const result = await runQuery(
      `MATCH (st:Stage {id: $stageId})
       MATCH (p:FrameworkPhase {id: $phaseId})
       MERGE (st)-[r:IN_FRAMEWORK_PHASE]->(p)
       RETURN count(r) AS c`,
      { stageId, phaseId }
    )
    if (result[0]?.c > 0) inPhaseEdges++
  }
  console.log(`    ${inPhaseEdges} IN_FRAMEWORK_PHASE edges ensured`)
  console.log('')

  // -------------------------------------------------------------------------
  // Hard preservation checks (idempotent-aware, canonical pattern)
  // -------------------------------------------------------------------------
  const postSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const postCounts = {}
  postSnapshot.forEach(r => { postCounts[r.label] = r.c })

  // On fresh seed: +20 FrameworkPhase nodes (5 phases + 15 sub-stages).
  // On re-run: 0 deltas everywhere.
  const expectedDeltas = cbestPhasesExisted
    ? { FrameworkPhase: 0 }
    : { FrameworkPhase: 20 }

  let preservationOK = true
  for (const [label, expectedDelta] of Object.entries(expectedDeltas)) {
    const before = preCounts[label] || 0
    const after = postCounts[label] || 0
    const actualDelta = after - before
    if (actualDelta !== expectedDelta) {
      console.error(`    ❌  ${label}: ${before} → ${after} (expected delta ${expectedDelta}, got ${actualDelta})`)
      preservationOK = false
    }
  }
  // No other label should change
  for (const [label, before] of Object.entries(preCounts)) {
    if (label in expectedDeltas) continue
    const after = postCounts[label] || 0
    if (after !== before) {
      console.error(`    ❌  ${label}: ${before} → ${after} (unexpected change; this label should be untouched)`)
      preservationOK = false
    }
  }
  // No new labels
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
  if (cbestPhasesExisted) {
    console.log(`    (idempotent re-run; no count changes expected, none observed)`)
  } else {
    for (const [label, delta] of Object.entries(expectedDeltas)) {
      if (delta > 0) {
        console.log(`    ${label.padEnd(20)} +${delta} (now ${postCounts[label] || 0})`)
      }
    }
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Verification — fetch CBEST phases and confirm structure
  // -------------------------------------------------------------------------
  const verify = await runQuery(`
    MATCH (p:FrameworkPhase)
    WHERE p.framework = 'CBEST'
    OPTIONAL MATCH (st:Stage)-[:IN_FRAMEWORK_PHASE]->(p)
    WITH p, collect(DISTINCT st.id) AS practicingStages
    RETURN p.id AS id, p.name AS name, p.code AS code,
           p.level AS level, p.parentId AS parentId,
           p.order AS order, practicingStages
    ORDER BY p.order, p.parentId, p.id
  `)

  console.log('🔬  Verification — CBEST FrameworkPhase taxonomy:')
  for (const p of verify) {
    const indent = p.level === 'sub-stage' ? '       ' : '    '
    const stageList = (p.practicingStages || []).filter(Boolean)
    const stageBadge = stageList.length > 0 ? `  ← ${stageList.join(', ')}` : ''
    console.log(`${indent}${p.id.padEnd(36)} ${(p.code || '').padEnd(12)} ${p.name}${stageBadge}`)
  }
  console.log('')

  console.log(`✅  CBEST FrameworkPhase taxonomy seeded (v25.6.1).`)
  console.log(`    Next: v25.6.2 will fill in CBEST per-framework concept summaries.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
