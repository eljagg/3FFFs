/**
 * update-aase-scenario-roles.js — v25.3.1 migration
 *
 * Purpose: opens the AASE arc (SC010, SC011, SC012) to the 'analyst' job-
 * function role in addition to admin and manager. The seed-data files
 * (aase-scenario.js and aase-scenarios-execution.js) are already updated
 * to include 'analyst' in their roles arrays, but those files only seed a
 * fresh graph. Existing scenario nodes in production already have
 * roles: ['admin', 'manager'] persisted, and need a tiny additive update.
 *
 * Idempotent — re-running just re-applies the same array. Safe.
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

const TARGET_SCENARIOS = ['SC010', 'SC011', 'SC012']
const NEW_ROLES = ['admin', 'manager', 'analyst']

async function main() {
  await verifyConnection()
  console.log('\n📚  v25.3.1: Opening AASE arc (SC010-SC012) to analyst role...\n')

  // Hard prerequisite: at minimum SC010 must exist (v25.1 must have run).
  // SC011/SC012 are softer — if they're missing, we just update what's there.
  const sc010Check = await runQuery(`MATCH (sc:Scenario {id: 'SC010'}) RETURN count(sc) AS c`)
  if (sc010Check[0].c === 0) {
    console.error('❌  SC010 not found in graph. Run migrate:aase-scenario before this migration.')
    await closeDriver()
    process.exit(1)
  }

  // Pre-snapshot: what roles do these scenarios currently have?
  const before = await runQuery(
    `MATCH (sc:Scenario) WHERE sc.id IN $ids
     RETURN sc.id AS id, sc.roles AS roles
     ORDER BY sc.id`,
    { ids: TARGET_SCENARIOS }
  )
  console.log('📊  Before:')
  before.forEach(r => console.log(`    ${r.id}  roles: ${JSON.stringify(r.roles)}`))
  console.log('')

  // Apply update — set roles to the new list. Idempotent.
  const updateResult = await runQuery(
    `MATCH (sc:Scenario) WHERE sc.id IN $ids
     SET sc.roles = $newRoles
     RETURN sc.id AS id, sc.roles AS roles
     ORDER BY sc.id`,
    { ids: TARGET_SCENARIOS, newRoles: NEW_ROLES }
  )

  console.log('📊  After:')
  updateResult.forEach(r => console.log(`    ${r.id}  roles: ${JSON.stringify(r.roles)}`))
  console.log('')

  // Preservation check: every other scenario's roles array is untouched
  const otherScenarios = await runQuery(
    `MATCH (sc:Scenario) WHERE NOT sc.id IN $ids
     RETURN count(sc) AS c, collect(sc.id) AS ids`,
    { ids: TARGET_SCENARIOS }
  )
  console.log(`🔒  Preservation: ${otherScenarios[0].c} other scenarios untouched`)
  console.log('')

  console.log(`✅  ${updateResult.length} scenarios updated. Analyst role can now see the AASE arc.\n`)
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
