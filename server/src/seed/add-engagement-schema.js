/**
 * add-engagement-schema.js — idempotent schema additions for v25.7.1.
 *
 * Adds indexes that make the new engagement queries fast:
 *   - DAILY_SIGNAL_ANSWERED.dayKey — used in the streak query and the
 *     "have you answered today's Signal?" guard.
 *   - CERTIFICATE_ISSUED.hash — used in /api/engagement/verify/:hash for
 *     public certificate verification.
 *
 * RETRIEVED edges don't get an index because they're write-and-aggregate
 * (no point queries against them), and ATTEMPTED_STAGE.answeredAt is
 * already covered by existing schema constraints from earlier releases.
 *
 * Safe to re-run — Neo4j's CREATE ... IF NOT EXISTS makes these idempotent.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

async function main() {
  await verifyConnection()
  console.log('\n🔧  Adding engagement-layer schema (v25.7.1)...\n')

  const before = await runQuery(`SHOW INDEXES YIELD name RETURN count(*) AS count`)
  console.log(`📊  Indexes before: ${before[0]?.count ?? 0}`)

  // Index on DAILY_SIGNAL_ANSWERED.dayKey — speeds up the daily-signal
  // streak query and the "already answered today?" guard.
  await runQuery(`
    CREATE INDEX daily_signal_day_key IF NOT EXISTS
    FOR ()-[r:DAILY_SIGNAL_ANSWERED]-() ON (r.dayKey)
  `)
  console.log('✚  Index daily_signal_day_key (DAILY_SIGNAL_ANSWERED.dayKey)')

  // Index on CERTIFICATE_ISSUED.hash — used for public /verify/:hash.
  await runQuery(`
    CREATE INDEX certificate_hash IF NOT EXISTS
    FOR ()-[r:CERTIFICATE_ISSUED]-() ON (r.hash)
  `)
  console.log('✚  Index certificate_hash (CERTIFICATE_ISSUED.hash)')

  const after = await runQuery(`SHOW INDEXES YIELD name RETURN count(*) AS count`)
  console.log(`\n📊  Indexes after: ${after[0]?.count ?? 0}`)

  // Preservation check — none of these edges existed before, so the only
  // thing we're guarding against is accidental damage to existing edges.
  const preserved = await runQuery(`
    MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count
    ORDER BY type
  `)
  console.log('\n🔒  Edge counts after migration:')
  for (const row of preserved) {
    console.log(`    ${row.type.padEnd(28)} ${row.count}`)
  }

  console.log('\n🎉  Schema migration complete.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Schema migration failed:', err)
  process.exit(1)
})
