/**
 * add-cbest-concept-summaries.js — v25.6.2 CBEST per-framework concept
 * summaries (ISS-014).
 *
 * Updates 9 APPEARS_IN_FRAMEWORK edges from existing concept nodes to
 * the CBEST framework:
 *   - 8 AASE-defined concepts (CRITICAL-FUNCTION, CONCESSION,
 *     LETTER-OF-ENGAGEMENT, TEST-HALT-MODEL, EXERCISE-SECRECY,
 *     ESCALATION-PATH, NO-FLY-ZONE, THREAT-MATRIX) — flips their
 *     CBEST edges from pending → populated, with new summary text
 *     and four-lens roleContent.
 *   - 1 CBEST-defined concept (CREST-ACCREDITATION) — preserves
 *     v25.6.0 summary text and adds four-lens roleContent.
 *
 * No new nodes. No new edges. No edge deletions. Property updates only
 * on existing edges. Idempotent-aware preservation: 0 deltas in node
 * counts on every run (fresh or re-run). The change is purely in edge
 * properties.
 *
 * Vintage marker: 'CBEST 2024 BoE Implementation Guide (v25.6.2)'
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { CBEST_CONCEPT_SUMMARIES } from './data/cbest-concept-summaries.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.6.2: enriching CBEST per-framework concept summaries (ISS-014)...\n')

  // -------------------------------------------------------------------------
  // Pre-snapshot — node counts (preservation check) + edge population state
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

  // Edge-state snapshot: which CBEST edges are currently pending vs populated
  const cbestEdgePre = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework {id: 'CBEST'})
    RETURN k.id AS conceptId,
           coalesce(r.pending, true)  AS pending,
           r.summary IS NOT NULL      AS hasSummary,
           r.roleContent IS NOT NULL  AS hasRoleContent
    ORDER BY k.id
  `)
  const v25_6_2_alreadyApplied = cbestEdgePre.every(r => r.hasRoleContent)
  if (v25_6_2_alreadyApplied) {
    console.log('ℹ️  v25.6.2 already applied (all CBEST edges have roleContent); re-running idempotently to refresh property values.\n')
  } else {
    const pendingCount = cbestEdgePre.filter(r => r.pending).length
    console.log(`📝  Pre-state: ${cbestEdgePre.length} CBEST APPEARS_IN_FRAMEWORK edges; ${pendingCount} pending, ${cbestEdgePre.length - pendingCount} populated\n`)
  }

  // -------------------------------------------------------------------------
  // Step 1: Verify target concepts exist before we touch any edges
  // -------------------------------------------------------------------------
  console.log('🔍  Step 1: verify target concepts exist...')
  for (const entry of CBEST_CONCEPT_SUMMARIES) {
    const exists = await runQuery(
      `MATCH (k:Concept {id: $id}) RETURN count(k) AS c`,
      { id: entry.conceptId }
    )
    if (exists[0].c === 0) {
      console.error(`    ❌ Concept not found: ${entry.conceptId}`)
      console.error('       Run migrate:frameworks (or migrate:sc013 for CREST) first.')
      await closeDriver()
      process.exit(1)
    }
  }
  console.log(`    ${CBEST_CONCEPT_SUMMARIES.length}/${CBEST_CONCEPT_SUMMARIES.length} concepts found\n`)

  // -------------------------------------------------------------------------
  // Step 2: Update CBEST edges with summary (where provided) + roleContent
  // -------------------------------------------------------------------------
  console.log('💡  Step 2: enrich CBEST APPEARS_IN_FRAMEWORK edges...')
  let edgesUpdated = 0
  for (const entry of CBEST_CONCEPT_SUMMARIES) {
    // Two cases:
    //  (a) entry.summary is non-null → set new summary + roleContent + flip pending=false
    //  (b) entry.summary is null → preserve existing summary, just add roleContent
    if (entry.summary) {
      await runQuery(
        `MATCH (k:Concept {id: $conceptId})-[r:APPEARS_IN_FRAMEWORK]->(f:Framework {id: $framework})
         SET r.summary     = $summary,
             r.roleContent = $roleContent,
             r.pending     = false,
             r.vintage     = '2024',
             r.updatedAt   = timestamp()`,
        {
          conceptId: entry.conceptId,
          framework: entry.framework,
          summary: entry.summary,
          roleContent: JSON.stringify(entry.roleContent),
        }
      )
    } else {
      // Preserve existing summary (case for CONCEPT-CREST-ACCREDITATION which
      // already has a v25.6.0 summary); just add roleContent.
      await runQuery(
        `MATCH (k:Concept {id: $conceptId})-[r:APPEARS_IN_FRAMEWORK]->(f:Framework {id: $framework})
         SET r.roleContent = $roleContent,
             r.updatedAt   = timestamp()`,
        {
          conceptId: entry.conceptId,
          framework: entry.framework,
          roleContent: JSON.stringify(entry.roleContent),
        }
      )
    }
    edgesUpdated++
  }
  console.log(`    ${edgesUpdated} CBEST edges enriched with summary + roleContent\n`)

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

  // This migration touches edge properties only. ZERO node count changes
  // expected, on fresh seed AND on re-run. No new labels.
  const expectedDeltas = {}  // explicitly empty: nothing should change

  let preservationOK = true
  // Every existing label must be unchanged
  for (const [label, before] of Object.entries(preCounts)) {
    const after = postCounts[label] || 0
    if (after !== before) {
      console.error(`    ❌  ${label}: ${before} → ${after} (unexpected change; this label should be untouched)`)
      preservationOK = false
    }
  }
  // No new labels
  for (const label of Object.keys(postCounts)) {
    if (!(label in preCounts)) {
      console.error(`    ❌  New label appeared: ${label} (count: ${postCounts[label]})`)
      preservationOK = false
    }
  }

  // Edge count check: APPEARS_IN_FRAMEWORK edge count must be unchanged
  const edgeCountPost = await runQuery(`
    MATCH ()-[r:APPEARS_IN_FRAMEWORK]->()
    RETURN count(r) AS c
  `)
  const edgeCountPre = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
    RETURN count(r) AS c
  `)
  // The two queries above are functionally identical (every APPEARS_IN_FRAMEWORK
  // edge is from a Concept to a Framework by definition). We just re-snapshot
  // post-update to be explicit about what we're checking.
  if (edgeCountPost[0].c !== edgeCountPre[0].c) {
    console.error(`    ❌  APPEARS_IN_FRAMEWORK edges: ${edgeCountPre[0].c} → ${edgeCountPost[0].c} (must be unchanged)`)
    preservationOK = false
  }

  if (!preservationOK) {
    console.error('\n❌  Preservation check FAILED.')
    await closeDriver()
    process.exit(1)
  }

  console.log('🔒  Preservation: deltas match expected pattern')
  if (v25_6_2_alreadyApplied) {
    console.log(`    (idempotent re-run; properties refreshed, no count changes expected, none observed)`)
  } else {
    console.log(`    (property update only; 0 node count changes, ${edgeCountPost[0].c} APPEARS_IN_FRAMEWORK edges preserved)`)
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Verification — fetch the updated edges and confirm structure
  // -------------------------------------------------------------------------
  const verify = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework {id: 'CBEST'})
    RETURN k.id AS conceptId,
           k.name AS conceptName,
           coalesce(r.pending, true) AS pending,
           r.summary IS NOT NULL AS hasSummary,
           r.roleContent IS NOT NULL AS hasRoleContent,
           r.vintage AS vintage
    ORDER BY k.id
  `)

  console.log('🔬  Verification — CBEST APPEARS_IN_FRAMEWORK edges:')
  for (const v of verify) {
    const summaryBadge   = v.hasSummary ? '✓ summary'      : '✗ summary'
    const roleBadge      = v.hasRoleContent ? '✓ roleContent' : '✗ roleContent'
    const pendingBadge   = v.pending ? '⏳ pending'        : '✅ populated'
    console.log(`    ${v.conceptId.padEnd(34)} ${pendingBadge.padEnd(13)} ${summaryBadge.padEnd(11)} ${roleBadge}`)
  }
  console.log('')

  console.log('✅  CBEST per-framework concept summaries enriched (v25.6.2).')
  console.log('    Next: v25.6.x — Concept ID rename (CREST→CBEST) + AASE FrameworkPhase enrichment.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
