/**
 * v25.7.0.5 — Add scenario beats for the F3 Framework storyboard.
 *
 * Adds :Beat nodes connected to existing :Scenario nodes via :HAS_BEAT.
 * Also writes storyboard-summary fields (headline, subtitle, meta, stats)
 * directly onto the scenario node — these don't conflict with the
 * existing `summary` field used by the Quiz/Play scenario cards.
 *
 * Idempotent: re-running this migration MERGEs on (scenario.id, beat.id)
 * so existing beats are updated rather than duplicated.
 *
 * OBS-021 followed: MERGE → ON CREATE SET → ON MATCH SET → SET.
 *
 * Usage:
 *   node server/src/seed/add-scenario-beats.js
 *
 * The migration is also wired into the standard run.js entrypoint so
 * `npm run seed` picks it up. See run.js for the call order.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { SCENARIO_BEATS, STORYBOARD_SUMMARIES } from './data/scenario-beats.js'

async function main() {
  await verifyConnection()
  console.log('\n📖  v25.7.0.5 — Adding scenario beats for the storyboard view (additive, preserves existing data)...\n')

  // Sanity check: count what's currently there so user can see before/after
  const beforeCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('📊  Before migration:')
  beforeCounts.forEach(r => console.log(`    ${String(r.label).padEnd(14)} ${r.count}`))
  console.log('')

  let beatCount = 0
  let phaseCount = 0
  let summaryCount = 0

  // Beats themselves
  for (const [scenarioId, entries] of Object.entries(SCENARIO_BEATS)) {
    // Verify scenario exists before attaching beats
    const scenarioExists = await runQuery(
      `MATCH (s:Scenario { id: $id }) RETURN s.id AS id LIMIT 1`,
      { id: scenarioId }
    )
    if (scenarioExists.length === 0) {
      console.warn(`   ⚠ Scenario ${scenarioId} not found in DB — skipping its beats`)
      continue
    }

    let order = 0
    for (const entry of entries) {
      order += 1

      if (entry.phase) {
        // Phase marker
        await runQuery(
          `
          MATCH (s:Scenario { id: $scenarioId })
          MERGE (p:BeatPhase { id: $phaseId })
            ON CREATE SET p.createdAt = datetime()
          SET p.scenarioId = $scenarioId,
              p.label      = $label,
              p.order      = $order,
              p.updatedAt  = datetime()
          MERGE (s)-[r:HAS_BEAT { order: $order }]->(p)
          `,
          {
            scenarioId,
            phaseId: entry.id,
            label:   entry.phase,
            order,
          }
        )
        phaseCount += 1
      } else {
        // Beat — full content
        await runQuery(
          `
          MATCH (s:Scenario { id: $scenarioId })
          MERGE (b:Beat { id: $beatId })
            ON CREATE SET b.createdAt = datetime()
          SET b.scenarioId      = $scenarioId,
              b.day             = $day,
              b.actor           = $actor,
              b.kind            = $kind,
              b.techId          = $techId,
              b.techName        = $techName,
              b.techSeverity    = $techSeverity,
              b.techDescription = $techDescription,
              b.headline        = $headline,
              b.narrative       = $narrative,
              b.whatNow         = $whatNow,
              b.order           = $order,
              b.updatedAt       = datetime()
          MERGE (s)-[r:HAS_BEAT { order: $order }]->(b)
          `,
          {
            scenarioId,
            beatId:          entry.id,
            day:             entry.day ?? null,
            actor:           entry.actor ?? null,
            kind:            entry.kind ?? null,
            techId:          entry.techId ?? null,
            techName:        entry.techName ?? null,
            techSeverity:    entry.techSeverity ?? null,
            techDescription: entry.techDescription ?? null,
            headline:        entry.headline ?? null,
            narrative:       entry.narrative ?? null,
            whatNow:         entry.whatNow ?? null,
            order,
          }
        )
        beatCount += 1
      }
    }

    console.log(`   ✓ ${scenarioId}: ${entries.length} entries (beats + phases) attached`)
  }

  // Storyboard summaries — written directly onto the scenario node
  for (const [scenarioId, summary] of Object.entries(STORYBOARD_SUMMARIES)) {
    await runQuery(
      `
      MATCH (s:Scenario { id: $id })
      SET s.storyboardHeadline  = $headline,
          s.storyboardSubtitle  = $subtitle,
          s.storyboardMetaJson  = $metaJson,
          s.storyboardStatsJson = $statsJson,
          s.updatedAt           = datetime()
      RETURN s.id AS id
      `,
      {
        id:        scenarioId,
        headline:  summary.headline,
        subtitle:  summary.subtitle,
        metaJson:  JSON.stringify(summary.meta || {}),
        statsJson: JSON.stringify(summary.stats || []),
      }
    )
    summaryCount += 1
  }

  console.log('')
  console.log(`✅  Added ${beatCount} beats, ${phaseCount} phase markers, ${summaryCount} summaries`)

  // Preservation check (OBS-025) — verify edge count matches expectation
  const expectedEdges = beatCount + phaseCount
  const edgeCheck = await runQuery(
    `MATCH ()-[r:HAS_BEAT]->() RETURN count(r) AS n`
  )
  const actualEdges = edgeCheck[0]?.n ?? 0
  if (actualEdges < expectedEdges) {
    throw new Error(
      `Preservation check FAILED: expected ≥${expectedEdges} HAS_BEAT edges, found ${actualEdges}`
    )
  }
  console.log(`   ✓ Preservation check passed: ${actualEdges} HAS_BEAT edges`)

  // After-counts
  const afterCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('\n📊  After migration:')
  afterCounts.forEach(r => console.log(`    ${String(r.label).padEnd(14)} ${r.count}`))

  console.log('\n🎉  Migration complete')
  await closeDriver()
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})

