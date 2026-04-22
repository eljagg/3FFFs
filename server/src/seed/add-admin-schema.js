/**
 * add-admin-schema.js — additive schema migration for v23 admin + invites
 *
 * Creates the Invite node uniqueness constraint and a supporting index. Does
 * NOT touch any existing data — safe to run against production. Mirrors the
 * idempotent additive MERGE pattern from add-caribbean.js and add-quizzes.js.
 *
 * Run it once:   node src/seed/add-admin-schema.js
 *
 * Contrast with run.js which does `MATCH (n) DETACH DELETE n` before seeding
 * and nukes user progress. This script only creates schema objects; if they
 * already exist (CREATE ... IF NOT EXISTS), it's a no-op.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

async function main() {
  await verifyConnection()
  console.log('\n🔧  v23 admin schema migration (additive, preserves existing data)...\n')

  const beforeCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('📊  Before migration:')
  beforeCounts.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))
  console.log('')

  // Uniqueness constraint on Invite.id — prevents dupes if a retried request
  // reuses a UUID. Also implicitly creates an index.
  await runQuery(
    `CREATE CONSTRAINT invite_id IF NOT EXISTS
     FOR (i:Invite) REQUIRE i.id IS UNIQUE`
  )
  console.log('🔒  Applied constraint: invite_id UNIQUE')

  // Email is NOT unique (same person can be re-invited after revoke or
  // expiry — we keep the audit trail). But we query by email constantly
  // in /api/auth/check-invite, so add a plain index for lookup speed.
  await runQuery(
    `CREATE INDEX invite_email IF NOT EXISTS
     FOR (i:Invite) ON (i.email)`
  )
  console.log('🔎  Applied index: invite_email (non-unique)')

  // Show current invite state (likely zero on first run)
  const invites = await runQuery(`
    MATCH (i:Invite)
    RETURN count(i) AS total,
           sum(CASE WHEN i.revokedAt IS NOT NULL THEN 1 ELSE 0 END) AS revoked,
           sum(CASE WHEN i.expiresAt IS NOT NULL AND i.expiresAt <= timestamp() THEN 1 ELSE 0 END) AS expired,
           sum(CASE WHEN i.consumedAt IS NOT NULL THEN 1 ELSE 0 END) AS consumed
  `)
  const row = invites[0] || { total: 0, revoked: 0, expired: 0, consumed: 0 }

  console.log('')
  console.log('✅  Migration summary:')
  console.log(`    Invite nodes:              ${row.total}`)
  console.log(`      revoked:                 ${row.revoked}`)
  console.log(`      expired:                 ${row.expired}`)
  console.log(`      consumed (logged in):    ${row.consumed}`)

  const afterCounts = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('')
  console.log('📊  After migration:')
  afterCounts.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))

  // Preservation check — nothing should have changed for user data
  const users = await runQuery(`MATCH (u:User) RETURN count(u) AS c`)
  const completed = await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`)
  const attempts = await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`)
  const answered = await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`)

  console.log('')
  console.log('🔒  Preservation check (should all be unchanged):')
  console.log(`    User nodes:        ${users[0].c}`)
  console.log(`    COMPLETED edges:   ${completed[0].c}`)
  console.log(`    ATTEMPTED_STAGE:   ${attempts[0].c}`)
  console.log(`    ANSWERED edges:    ${answered[0].c}`)

  console.log('\n🎉  Admin schema migration complete!\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
