/**
 * add-concept-framework-summaries.js — v25.4.2 migration (ISS-008)
 *
 * Goal: enrich the [:APPEARS_IN_FRAMEWORK] edges with per-framework summary
 * content, so the ConceptSidebar can render a different, framework-specific
 * explanation for each pill.
 *
 * Per Sequence A1 (approved): we ship AASE-side summaries first. CBEST, TIBER,
 * and iCAST edges get a placeholder noting "v25.6 — content pending freshness
 * pass." The graph schema is fully in place; only the non-AASE content is
 * deferred.
 *
 * Strategy:
 *   1. For every AASE edge, copy the existing Concept.summary onto the edge
 *      as edge.summary. This is the AASE-flavored definition that's been on
 *      the node since v25.0; the change is purely structural (summary moves
 *      from node-fallback to edge-primary).
 *   2. For every non-AASE edge, set edge.summary to null + edge.pending=true.
 *      The UI distinguishes pending vs populated and renders the placeholder.
 *
 * Idempotent: rerunning sets the same edge properties. Safe.
 *
 * Hard preservation check:
 *   - Concept.summary node property is NEVER overwritten (still the fallback)
 *   - Concept.examples is NEVER touched
 *   - APPEARS_IN_FRAMEWORK edge count must equal pre-snapshot count
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.4.2: enriching APPEARS_IN_FRAMEWORK edges with per-framework summaries...\n')

  // Pre-snapshot
  const before = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
    RETURN count(r) AS edgeCount,
           count(DISTINCT k) AS conceptCount,
           count(DISTINCT f) AS frameworkCount
  `)
  const preEdges = before[0].edgeCount
  const preConcepts = before[0].conceptCount
  const preFrameworks = before[0].frameworkCount
  console.log(`📊  Pre-snapshot: ${preEdges} edges across ${preConcepts} concepts × ${preFrameworks} frameworks\n`)

  if (preEdges === 0) {
    console.error('❌  No APPEARS_IN_FRAMEWORK edges found. Run migrate:frameworks first.')
    await closeDriver()
    process.exit(1)
  }

  // Step 1: AASE-side summaries — copy from Concept.summary onto the edge
  // The Concept.summary content is already AASE-flavored (it was authored
  // from the AASE PDF in v25.0), so this is a structural move not a
  // content rewrite.
  console.log('💡  Step 1: AASE-side edge summaries...')
  const aaseUpdate = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework {id: 'AASE'})
    SET r.summary = k.summary,
        r.pending = false,
        r.vintage = '2018',  // AASE PDF was published Nov 2018 v1.0
        r.updatedAt = timestamp()
    RETURN count(r) AS updated
  `)
  console.log(`    ${aaseUpdate[0].updated} AASE edges updated\n`)

  // Step 2: non-AASE edges — mark pending so the UI can render the placeholder
  console.log('💡  Step 2: non-AASE edges marked pending (CBEST/TIBER-EU/iCAST)...')
  const nonAaseUpdate = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
    WHERE f.id <> 'AASE'
    SET r.summary = null,
        r.pending = true,
        r.vintage = null,
        r.updatedAt = timestamp()
    RETURN count(r) AS updated
  `)
  console.log(`    ${nonAaseUpdate[0].updated} non-AASE edges marked pending\n`)

  // Hard preservation check
  const after = await runQuery(`
    MATCH (k:Concept)-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
    RETURN count(r) AS edgeCount,
           count(DISTINCT k) AS conceptCount,
           count(DISTINCT f) AS frameworkCount
  `)
  const postEdges = after[0].edgeCount
  const postConcepts = after[0].conceptCount
  const postFrameworks = after[0].frameworkCount

  if (postEdges !== preEdges || postConcepts !== preConcepts || postFrameworks !== preFrameworks) {
    console.error(`\n❌  Preservation check FAILED:`)
    console.error(`    edges:      ${preEdges} → ${postEdges}`)
    console.error(`    concepts:   ${preConcepts} → ${postConcepts}`)
    console.error(`    frameworks: ${preFrameworks} → ${postFrameworks}`)
    process.exit(1)
  }

  console.log(`🔒  Preservation: ${postEdges} edges (unchanged), ${postConcepts} concepts (unchanged), ${postFrameworks} frameworks (unchanged)\n`)

  // Verification: pick one concept and show the result
  const sample = await runQuery(`
    MATCH (k:Concept {id: 'CONCEPT-CRITICAL-FUNCTION'})-[r:APPEARS_IN_FRAMEWORK]->(f:Framework)
    RETURN f.id AS framework, r.pending AS pending, r.vintage AS vintage,
           CASE WHEN r.summary IS NULL THEN '(null — pending)'
                ELSE substring(r.summary, 0, 80) + '…' END AS summaryPreview
    ORDER BY f.id
  `)
  console.log('📊  Sample (Critical Function concept):')
  sample.forEach(s => {
    console.log(`    ${s.framework.padEnd(8)}  pending: ${s.pending}, vintage: ${s.vintage || '—'}`)
    console.log(`              ${s.summaryPreview}`)
  })

  console.log(`\n✅  Done. ConceptSidebar can now render per-framework summaries.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
