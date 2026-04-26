/**
 * add-mitre-foundation.js — v25.5 migration (ISS-009 foundation)
 *
 * Establishes the MITRE ATT&CK Enterprise schema in the graph:
 *   - :MitreTactic    — 14 tactics (TA0001..TA0043, including pre-attack
 *                       Reconnaissance + Resource Development for completeness)
 *   - :MitreTechnique — 128 techniques covering 12 attack-phase tactics,
 *                       filtered to banking/retail attack surface
 *   - :OF_TACTIC      — edge from MitreTechnique to MitreTactic(s)
 *   - :SUB_TECHNIQUE_OF — edge from sub-technique to its parent technique
 *
 * No edges from existing :Stage or :Scenario nodes are created here; that
 * happens in v25.5.1 (SC013) and v25.5.2 (SC014) when scenarios reference
 * MITRE techniques. The schema is in place, ready to consume.
 *
 * Constraints:
 *   - mitre_tactic_id and mitre_technique_id uniqueness constraints created
 *     if not already present
 *
 * Idempotency:
 *   - All operations use MERGE — re-running this migration sets the same
 *     properties without creating duplicates
 *
 * Hard preservation checks:
 *   - Existing User, Scenario, Stage, Concept, Framework, FrameworkPhase,
 *     Role, Deliverable, ThreatActor, Regulator node counts must NOT change
 *   - Existing relationship counts must NOT change
 *   - These are checked before and after the migration; mismatch aborts
 *
 * Vintage: ATT&CK v18.1 (March 2026). Update planned for v25.6.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { MITRE_TACTICS } from './data/mitre-tactics.js'
import { MITRE_TECHNIQUES, MITRE_VINTAGE } from './data/mitre-techniques.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.5: seeding MITRE ATT&CK Enterprise foundation...\n')
  console.log(`    Vintage: ${MITRE_VINTAGE}`)
  console.log(`    Tactics: ${MITRE_TACTICS.length}`)
  console.log(`    Techniques: ${MITRE_TECHNIQUES.length}\n`)

  // -------------------------------------------------------------------------
  // Pre-snapshot: capture existing node counts for preservation check
  // -------------------------------------------------------------------------
  const preSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const preCounts = {}
  preSnapshot.forEach(r => { preCounts[r.label] = r.c })
  console.log('📊  Pre-snapshot — node counts before migration:')
  for (const [label, count] of Object.entries(preCounts)) {
    console.log(`    ${label.padEnd(20)} ${count}`)
  }
  console.log('')

  const preRels = await runQuery(`
    MATCH ()-[r]->()
    WITH type(r) AS rt, count(r) AS c
    RETURN rt, c
    ORDER BY rt
  `)
  const preRelCounts = {}
  preRels.forEach(r => { preRelCounts[r.rt] = r.c })

  // -------------------------------------------------------------------------
  // Step 1: constraints
  // -------------------------------------------------------------------------
  console.log('💡  Step 1: schema constraints...')
  const constraints = [
    'CREATE CONSTRAINT mitre_tactic_id IF NOT EXISTS FOR (n:MitreTactic) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT mitre_technique_id IF NOT EXISTS FOR (n:MitreTechnique) REQUIRE n.id IS UNIQUE',
  ]
  for (const c of constraints) {
    await runQuery(c)
  }
  console.log('    constraints ensured\n')

  // -------------------------------------------------------------------------
  // Step 2: tactics
  // -------------------------------------------------------------------------
  console.log('💡  Step 2: MitreTactic nodes...')
  for (const t of MITRE_TACTICS) {
    await runQuery(
      `MERGE (ta:MitreTactic {id: $id})
       SET ta.shortName  = $shortName,
           ta.name       = $name,
           ta.order      = $order,
           ta.description = $description,
           ta.phase      = $phase,
           ta.vintage    = $vintage`,
      { ...t, vintage: MITRE_VINTAGE }
    )
  }
  console.log(`    ${MITRE_TACTICS.length} tactics ensured\n`)

  // -------------------------------------------------------------------------
  // Step 3: techniques
  // -------------------------------------------------------------------------
  console.log('💡  Step 3: MitreTechnique nodes...')
  for (const tech of MITRE_TECHNIQUES) {
    await runQuery(
      `MERGE (mt:MitreTechnique {id: $id})
       SET mt.name           = $name,
           mt.summary        = $summary,
           mt.url            = $url,
           mt.platforms      = $platforms,
           mt.tactics        = $tactics,
           mt.isSubTechnique = $isSubTechnique,
           mt.version        = $version,
           mt.vintage        = $vintage`,
      { ...tech, vintage: MITRE_VINTAGE }
    )
  }
  console.log(`    ${MITRE_TECHNIQUES.length} techniques ensured\n`)

  // -------------------------------------------------------------------------
  // Step 4: OF_TACTIC edges (technique → tactic, can be multiple per technique)
  // -------------------------------------------------------------------------
  console.log('💡  Step 4: OF_TACTIC edges...')
  let edgeCount = 0
  for (const tech of MITRE_TECHNIQUES) {
    for (const tacticName of tech.tactics) {
      // Look up tactic by name (the technique seed uses the friendly name)
      const tactic = MITRE_TACTICS.find(t => t.name === tacticName)
      if (!tactic) {
        console.warn(`    ⚠️  Technique ${tech.id} references unknown tactic: "${tacticName}"`)
        continue
      }
      await runQuery(
        `MATCH (mt:MitreTechnique {id: $techId})
         MATCH (ta:MitreTactic {id: $tacticId})
         MERGE (mt)-[:OF_TACTIC]->(ta)`,
        { techId: tech.id, tacticId: tactic.id }
      )
      edgeCount++
    }
  }
  console.log(`    ${edgeCount} OF_TACTIC edges ensured\n`)

  // -------------------------------------------------------------------------
  // Step 5: SUB_TECHNIQUE_OF edges (sub-technique → parent technique)
  // -------------------------------------------------------------------------
  console.log('💡  Step 5: SUB_TECHNIQUE_OF edges...')
  let subCount = 0
  let subWarn = 0
  for (const tech of MITRE_TECHNIQUES) {
    if (!tech.subTechniqueOf) continue
    // Verify parent is in the seed (it must be — we always seeded parents)
    const parent = MITRE_TECHNIQUES.find(t => t.id === tech.subTechniqueOf)
    if (!parent) {
      console.warn(`    ⚠️  Sub-technique ${tech.id} references parent ${tech.subTechniqueOf} not in seed`)
      subWarn++
      continue
    }
    await runQuery(
      `MATCH (sub:MitreTechnique {id: $subId})
       MATCH (parent:MitreTechnique {id: $parentId})
       MERGE (sub)-[:SUB_TECHNIQUE_OF]->(parent)`,
      { subId: tech.id, parentId: tech.subTechniqueOf }
    )
    subCount++
  }
  console.log(`    ${subCount} SUB_TECHNIQUE_OF edges ensured (${subWarn} skipped)\n`)

  // -------------------------------------------------------------------------
  // Hard preservation check: existing labels' counts must be unchanged
  // -------------------------------------------------------------------------
  const postSnapshot = await runQuery(`
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS c
    RETURN label, c
    ORDER BY label
  `)
  const postCounts = {}
  postSnapshot.forEach(r => { postCounts[r.label] = r.c })

  let preservationOK = true
  for (const [label, before] of Object.entries(preCounts)) {
    const after = postCounts[label] || 0
    if (after !== before) {
      console.error(`    ❌  ${label}: ${before} → ${after} (CHANGED!)`)
      preservationOK = false
    }
  }
  if (!preservationOK) {
    console.error('\n❌  Preservation check FAILED. Existing graph state was modified.')
    await closeDriver()
    process.exit(1)
  }

  console.log('🔒  Preservation: existing node counts unchanged across labels:')
  for (const label of Object.keys(preCounts)) {
    console.log(`    ${label.padEnd(20)} ${preCounts[label]} (preserved)`)
  }
  console.log('')

  // Existing relationships preservation
  const postRels = await runQuery(`
    MATCH ()-[r]->()
    WITH type(r) AS rt, count(r) AS c
    RETURN rt, c
    ORDER BY rt
  `)
  const postRelCounts = {}
  postRels.forEach(r => { postRelCounts[r.rt] = r.c })

  for (const [rt, before] of Object.entries(preRelCounts)) {
    const after = postRelCounts[rt] || 0
    if (after !== before) {
      console.error(`    ❌  Relationship ${rt}: ${before} → ${after} (CHANGED!)`)
      preservationOK = false
    }
  }
  if (!preservationOK) {
    await closeDriver()
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // New counts summary
  // -------------------------------------------------------------------------
  console.log('📊  New nodes/edges added by this migration:')
  console.log(`    MitreTactic         ${postCounts.MitreTactic || 0}`)
  console.log(`    MitreTechnique      ${postCounts.MitreTechnique || 0}`)
  console.log(`    OF_TACTIC           ${postRelCounts.OF_TACTIC || 0}`)
  console.log(`    SUB_TECHNIQUE_OF    ${postRelCounts.SUB_TECHNIQUE_OF || 0}`)
  console.log('')

  // Verification: pick a known technique and show its shape
  const verify = await runQuery(`
    MATCH (mt:MitreTechnique {id: 'T1566.004'})
    OPTIONAL MATCH (mt)-[:OF_TACTIC]->(ta:MitreTactic)
    OPTIONAL MATCH (mt)-[:SUB_TECHNIQUE_OF]->(parent:MitreTechnique)
    RETURN mt.name AS name, mt.summary AS summary, mt.platforms AS platforms,
           collect(DISTINCT ta.name) AS tactics,
           parent.id AS parentId, parent.name AS parentName
  `)
  if (verify.length > 0) {
    const v = verify[0]
    console.log('🔬  Verification (T1566.004):')
    console.log(`    name:     ${v.name}`)
    console.log(`    parent:   ${v.parentId} · ${v.parentName}`)
    console.log(`    tactics:  ${v.tactics.join(', ')}`)
    console.log(`    summary:  ${(v.summary || '').substring(0, 100)}...`)
    console.log('')
  }

  console.log(`✅  v25.5 MITRE foundation seeded. ${MITRE_TECHNIQUES.length} techniques + ${MITRE_TACTICS.length} tactics ready.`)
  console.log(`    Next: v25.5.1 SC013 + v25.5.2 SC014 will add USES_MITRE_TECHNIQUE edges from Stage nodes.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
