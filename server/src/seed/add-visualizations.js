/**
 * add-visualizations.js — v25.7.0.2 migration (ISS-023)
 *
 * Adds:
 *   - :Visualization nodes (one per entry in VISUALIZATIONS seed array)
 *   - :VISUALIZES edges from each Visualization to its attached graph entity
 *     (Tactic / Technique / Concept / Stage / FrameworkPhase, depending on
 *     the seed entry — v25.7.0.2 ships only one, attached to TA0043)
 *   - Uniqueness constraint on Visualization.id
 *
 * Idempotent: MERGE on stable IDs. Re-running sets the same properties
 * without creating duplicates. Follows the idempotent-aware preservation
 * pattern from add-sc014.js — pre-snapshot, expected delta computed from
 * pre-state, post-snapshot reconciled.
 *
 * The :Visualization node carries a stringified config blob because Neo4j
 * does not support nested-object properties. The client parses it on
 * fetch. This is the same pattern used for stage.signals / stage.options
 * elsewhere in the codebase.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { VISUALIZATIONS } from './data/visualizations.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.7.0.2: seeding Visualization registry (ISS-023)...\n')

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

  // Count any pre-existing :Visualization nodes — drives the expected delta.
  // First-run: count is 0; expected delta is +VISUALIZATIONS.length.
  // Re-run: count is N; expected delta is 0.
  const vizPre = await runQuery(
    `MATCH (v:Visualization) RETURN count(v) AS c`
  )
  const vizExisted = vizPre[0].c

  if (vizExisted > 0) {
    console.log(`ℹ️  ${vizExisted} :Visualization node(s) already present; re-running idempotently to refresh properties.\n`)
  } else {
    console.log(`ℹ️  No existing :Visualization nodes — will create ${VISUALIZATIONS.length}.\n`)
  }

  // -------------------------------------------------------------------------
  // Step 1: uniqueness constraint
  // -------------------------------------------------------------------------
  await runQuery(
    `CREATE CONSTRAINT visualization_id IF NOT EXISTS
     FOR (v:Visualization) REQUIRE v.id IS UNIQUE`
  )
  console.log('🔒  Applied Visualization.id uniqueness constraint')

  // -------------------------------------------------------------------------
  // Step 2: visualization nodes + VISUALIZES edges
  // -------------------------------------------------------------------------
  let nodesProcessed = 0
  let edgesProcessed = 0
  const skippedAttachments = []

  for (const viz of VISUALIZATIONS) {
    // Validate required fields up-front so a bad seed entry fails fast.
    const required = ['id', 'kind', 'title', 'roles', 'config', 'attachedTo']
    for (const field of required) {
      if (!(field in viz)) {
        throw new Error(`Visualization seed entry is missing required field "${field}": ${JSON.stringify(viz).slice(0, 120)}`)
      }
    }
    if (!viz.attachedTo.type || !viz.attachedTo.id) {
      throw new Error(`Visualization ${viz.id} attachedTo must have {type, id}`)
    }

    // Soft cap on config size — surfaces when we drift toward storing
    // graph data in JSON instead of in nodes/edges.
    const configJson = JSON.stringify(viz.config)
    if (configJson.length > 8000) {
      console.warn(`    ⚠️  ${viz.id} config is ${configJson.length} chars — exceeds 2 KB soft cap (8 KB hard cap not yet hit). Consider whether structural data should move into the graph.`)
    }

    // Upsert the Visualization node
    await runQuery(
      `MERGE (v:Visualization {id: $id})
       ON CREATE SET v.createdAt = timestamp()
       SET v.kind      = $kind,
           v.title     = $title,
           v.subtitle  = $subtitle,
           v.roles     = $roles,
           v.order     = $order,
           v.config    = $config,
           v.updatedAt = timestamp()`,
      {
        id:       viz.id,
        kind:     viz.kind,
        title:    viz.title,
        subtitle: viz.subtitle || null,
        roles:    viz.roles,
        order:    viz.order || 1,
        config:   configJson,
      }
    )
    nodesProcessed++

    // Confirm the attached entity actually exists. If not, we still create
    // the Visualization node but skip the edge and surface a warning —
    // this lets us seed visualizations ahead of their attached entities
    // without erroring, but flags the orphan condition clearly.
    const attachCheck = await runQuery(
      `MATCH (n:${viz.attachedTo.type} {id: $id}) RETURN count(n) AS c`,
      { id: viz.attachedTo.id }
    )
    if (attachCheck[0].c === 0) {
      skippedAttachments.push(`${viz.id} -> ${viz.attachedTo.type}{id:'${viz.attachedTo.id}'} (entity not in graph)`)
      continue
    }

    // Create the VISUALIZES edge
    await runQuery(
      `MATCH (v:Visualization {id: $vizId})
       MATCH (n:${viz.attachedTo.type} {id: $entityId})
       MERGE (v)-[r:VISUALIZES]->(n)
       SET r.order = $order`,
      {
        vizId:    viz.id,
        entityId: viz.attachedTo.id,
        order:    viz.order || 1,
      }
    )
    edgesProcessed++
  }

  console.log(`    visualizations=${nodesProcessed}  edges=${edgesProcessed}`)
  if (skippedAttachments.length > 0) {
    console.log(`    ⚠️  ${skippedAttachments.length} visualization(s) created without attachment edges:`)
    skippedAttachments.forEach(s => console.log(`        ${s}`))
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Hard preservation check — IDEMPOTENT-AWARE
  //
  // First run: Visualization delta = +VISUALIZATIONS.length, no other deltas
  // Re-run:    Visualization delta = 0, no other deltas
  // -------------------------------------------------------------------------
  const postSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const postCounts = {}
  postSnapshot.forEach(r => { postCounts[r.label] = r.c })

  const expectedVizDelta = (vizExisted > 0)
    ? 0
    : VISUALIZATIONS.length
  const expectedDeltas = { Visualization: expectedVizDelta }

  let preservationOK = true

  // Validate the labels we expect to change
  for (const [label, expectedDelta] of Object.entries(expectedDeltas)) {
    const before = preCounts[label] || 0
    const after = postCounts[label] || 0
    const actualDelta = after - before
    if (actualDelta !== expectedDelta) {
      console.error(`    ❌  ${label}: ${before} → ${after} (expected delta ${expectedDelta}, got ${actualDelta})`)
      preservationOK = false
    }
  }

  // Validate that NO OTHER label changed unexpectedly
  for (const [label, before] of Object.entries(preCounts)) {
    if (label in expectedDeltas) continue
    const after = postCounts[label] || 0
    if (after !== before) {
      console.error(`    ❌  ${label}: ${before} → ${after} (unexpected change; this label should be untouched)`)
      preservationOK = false
    }
  }

  // Validate that no NEW labels appeared
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
  if (vizExisted > 0) {
    console.log(`    (idempotent re-run; no count changes expected, none observed)`)
  } else {
    console.log(`    Visualization        +${expectedVizDelta} (now ${postCounts.Visualization || 0})`)
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Verification — list every visualization and its attachment
  // -------------------------------------------------------------------------
  const verify = await runQuery(`
    MATCH (v:Visualization)
    OPTIONAL MATCH (v)-[:VISUALIZES]->(n)
    RETURN v.id AS id, v.kind AS kind, v.title AS title, v.roles AS roles,
           labels(n)[0] AS attachedType, n.id AS attachedId
    ORDER BY v.id
  `)
  console.log('🔬  Verification — Visualization registry:')
  verify.forEach(v => {
    const attach = v.attachedType
      ? `${v.attachedType}{${v.attachedId}}`
      : '(orphan — no attachment)'
    console.log(`    ${v.id.padEnd(28)} ${v.kind.padEnd(20)} → ${attach}`)
    console.log(`      roles=[${(v.roles || []).join(', ')}]  title="${v.title}"`)
  })

  console.log('')
  console.log(`✅  Visualization registry seeded.`)
  console.log(`    v25.7.0.2 spike: ${VISUALIZATIONS.length} viz registered. v25.7.1 will fan out to remaining tactics.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
