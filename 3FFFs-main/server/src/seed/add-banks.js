/**
 * add-banks.js — v25.7.0 multi-tenant foundation (ISS-019a / ISS-021)
 *
 * Creates:
 *   - 4 :Bank nodes (Barita, JNCB, Scotiabank-JM, CIBC-Caribbean)
 *   - :MEMBER_OF edges from each existing :User to their Bank
 *     (back-filled by matching User.domain → Bank.domains)
 *
 * Idempotent-aware preservation pattern (canonical, OBS-019-clean from start).
 * Fresh seed: +4 Bank nodes. Re-run: 0 deltas.
 *
 * MEMBER_OF edges fluctuate with user count (every authenticated user gets
 * one); the migration back-fills any existing users whose User.domain
 * matches a Bank.domains entry. Going forward, syncUser (auth.js) creates
 * the edge on every login. Users with unmappable domains (or no domain)
 * are left without a MEMBER_OF edge — they get a default-theme, no-bank
 * experience until an admin assigns them manually.
 *
 * Vintage marker: 'v25.7.0 multi-tenant foundation'
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { BANKS } from './data/banks.js'

async function main() {
  await verifyConnection()
  console.log('\n🏦  v25.7.0: seeding Bank nodes + auto-mapping users (ISS-019a / ISS-021)...\n')

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

  const banksPre = await runQuery(`MATCH (b:Bank) RETURN count(b) AS c`)
  const banksExisted = banksPre[0].c > 0
  if (banksExisted) {
    console.log(`ℹ️  Bank nodes already exist (${banksPre[0].c}); re-running idempotently to refresh properties.\n`)
  }

  // -------------------------------------------------------------------------
  // Constraint
  // -------------------------------------------------------------------------
  console.log('🔧  Step 1: ensure :Bank uniqueness constraint...')
  await runQuery(
    `CREATE CONSTRAINT bank_id IF NOT EXISTS FOR (n:Bank) REQUIRE n.id IS UNIQUE`
  )
  console.log('    constraint ensured\n')

  // -------------------------------------------------------------------------
  // Step 2: MERGE Bank nodes
  // -------------------------------------------------------------------------
  console.log('🏦  Step 2: Bank nodes...')
  let banksEnsured = 0
  for (const bank of BANKS) {
    await runQuery(
      `MERGE (b:Bank {id: $id})
       SET b.name         = $name,
           b.displayName  = $displayName,
           b.domains      = $domains,
           b.region       = $region,
           b.primaryColor = $primaryColor,
           b.accentColor  = $accentColor,
           b.logoUrl      = $logoUrl,
           b.seededAt     = $seededAt,
           b.updatedAt    = timestamp()`,
      bank
    )
    banksEnsured++
    console.log(`    ✚ ${bank.id.padEnd(28)} ${bank.displayName} (${bank.domains.join(', ')})`)
  }
  console.log(`    ${banksEnsured} Bank nodes ensured\n`)

  // -------------------------------------------------------------------------
  // Step 3: Back-fill :MEMBER_OF edges for existing users
  //   Match User.domain to any Bank.domains entry. Users without a mappable
  //   domain are left without an edge (default-theme experience).
  // -------------------------------------------------------------------------
  console.log('🔗  Step 3: back-fill MEMBER_OF edges from User.domain → Bank.domains...')
  const linkResult = await runQuery(
    `MATCH (u:User) WHERE u.domain IS NOT NULL
     MATCH (b:Bank) WHERE u.domain IN b.domains
     MERGE (u)-[r:MEMBER_OF]->(b)
     ON CREATE SET r.linkedAt = timestamp(), r.method = 'auto-domain'
     RETURN count(r) AS linked, count(DISTINCT u) AS users, count(DISTINCT b) AS banks`
  )
  const linkSummary = linkResult[0] || { linked: 0, users: 0, banks: 0 }
  console.log(`    ${linkSummary.linked} MEMBER_OF edges (${linkSummary.users} users → ${linkSummary.banks} banks)`)

  // Surface unmappable users
  const orphans = await runQuery(
    `MATCH (u:User)
     WHERE u.domain IS NULL
        OR NOT EXISTS { MATCH (u)-[:MEMBER_OF]->(:Bank) }
     RETURN u.id AS id, u.email AS email, u.domain AS domain
     ORDER BY u.email`
  )
  if (orphans.length > 0) {
    console.log(`    ⚠️  ${orphans.length} user(s) with no MEMBER_OF edge:`)
    for (const o of orphans) {
      console.log(`         - ${o.email || o.id} (domain: ${o.domain || 'null'})`)
    }
    console.log('       (admin can assign manually via /admin/users in v25.7.x)')
  }
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

  // Fresh seed: +4 Bank nodes (or whatever BANKS.length is). Re-run: 0.
  const expectedDeltas = banksExisted
    ? { Bank: 0 }
    : { Bank: BANKS.length }

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
      console.error(`    ❌  ${label}: ${before} → ${after} (unexpected change; should be untouched)`)
      preservationOK = false
    }
  }
  // No new labels other than Bank
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
  if (banksExisted) {
    console.log(`    (idempotent re-run; properties refreshed, no count changes expected, none observed)`)
  } else {
    console.log(`    Bank                 +${BANKS.length} (now ${postCounts.Bank || 0})`)
  }
  console.log('')

  // -------------------------------------------------------------------------
  // Verification
  // -------------------------------------------------------------------------
  const verify = await runQuery(`
    MATCH (b:Bank)
    OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(b)
    WITH b, count(u) AS memberCount
    RETURN b.id AS id, b.displayName AS displayName, b.region AS region,
           b.domains AS domains, memberCount
    ORDER BY b.id
  `)
  console.log('🔬  Verification — Bank nodes + memberships:')
  for (const v of verify) {
    console.log(`    ${v.id.padEnd(28)} ${v.displayName.padEnd(20)} ${v.region.padEnd(12)} ${(v.domains || []).join(',').padEnd(24)} ${v.memberCount} member${v.memberCount === 1 ? '' : 's'}`)
  }
  console.log('')

  console.log('✅  Bank nodes + MEMBER_OF edges seeded (v25.7.0).')
  console.log('    Next: v25.7.1 — Comments at user/scenario/stage level.\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
