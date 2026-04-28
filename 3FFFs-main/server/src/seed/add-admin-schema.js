/**
 * add-admin-schema.js — additive schema migration for admin user/invite management
 *
 * Adds two uniqueness constraints on the :Invite node label. Idempotent via
 * IF NOT EXISTS — safe to re-run. Does NOT touch any existing nodes or edges.
 *
 * Why it exists: v23 introduces admin-driven email invites for reviewers and
 * partners whose domains aren't on the hardcoded allowlist. The :Invite node
 * is new; Neo4j won't enforce uniqueness without explicit constraints, and
 * the admin router assumes uniqueness on both (email) and (id).
 *
 * Run once after deploying v23:
 *   node src/seed/add-admin-schema.js
 *
 * Expected output:
 *   ✅  Constraint created: invite_email_unique
 *   ✅  Constraint created: invite_id_unique
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

async function main() {
  await verifyConnection()
  console.log('\n🔧  Adding admin schema (additive, preserves existing data)...\n')

  // Snapshot before so we can prove we did not touch existing data
  const before = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('📊  Before migration:')
  before.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))
  console.log('')

  // Constraint 1: unique email on Invite.
  // Without this, two admins could race and produce duplicate invites
  // for the same email — the MERGE in /api/admin/invites would then
  // create two nodes and break uniqueness assumptions in check-invite.
  await runQuery(`
    CREATE CONSTRAINT invite_email_unique IF NOT EXISTS
    FOR (i:Invite) REQUIRE i.email IS UNIQUE
  `)
  console.log('✅  Constraint created (or already existed): invite_email_unique')

  // Constraint 2: unique id on Invite.
  // The admin DELETE endpoint matches on invite id; enforcing uniqueness
  // here protects against any manually-created duplicates in Aura.
  await runQuery(`
    CREATE CONSTRAINT invite_id_unique IF NOT EXISTS
    FOR (i:Invite) REQUIRE i.id IS UNIQUE
  `)
  console.log('✅  Constraint created (or already existed): invite_id_unique')

  // Show current constraints for visual confirmation
  const constraints = await runQuery(`SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties RETURN name, labelsOrTypes, properties ORDER BY name`)
  console.log('\n📐  Current constraints:')
  constraints.forEach(c => {
    console.log(`    ${String(c.name).padEnd(30)} ${JSON.stringify(c.labelsOrTypes)} ${JSON.stringify(c.properties)}`)
  })

  // Snapshot after
  const after = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('\n📊  After migration:')
  after.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))

  console.log('\n✨  Admin schema migration complete.\n')
  await closeDriver()
}

main().catch(e => {
  console.error('❌  Migration failed:', e.message)
  process.exit(1)
})
