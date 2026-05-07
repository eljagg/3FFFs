/**
 * add-t1621-technique.js — additive technique migration
 *
 * v25.7.0.18.1 — surfaces T1621 (MFA Request Generation) as a
 * first-class F3 framework technique under Initial Access (TA0001).
 *
 * Why this script exists:
 *   The v25.7.0.18 release added a front-end animation for T1621 via
 *   ANIMATION_MAP in TechniqueDetailSidebar.jsx, but T1621 was not
 *   present as a Technique node in the Neo4j graph. The framework grid
 *   on the F3 page is populated from /api/framework/tactics/:tacticId/
 *   techniques-tree, which queries Technique nodes by [:PART_OF] their
 *   Tactic. With no Technique node, no grid card appears, and the user
 *   has nothing to click — the animation works but is unreachable.
 *
 *   This script creates the missing Technique node with the same shape
 *   as existing F3 techniques (id, name, description, roles, :PART_OF
 *   to TA0001), so the framework grid surfaces T1621 alongside
 *   F1018.001, F1056, F1072, F1081, etc.
 *
 * What this migration does:
 *   1. MERGEs a Technique node {id: 'T1621', ...} idempotently
 *   2. MERGEs a :PART_OF relationship to Tactic {id: 'TA0001'}
 *   3. Sets the `roles` property listing roles for which T1621 is
 *      primary (teller, analyst, soc, executive — all four, because
 *      MFA fatigue is a cross-functional concern: tellers handle
 *      disputes, analysts review audit logs, SOC sets MFA policy,
 *      executives approve the engineering work)
 *
 * What this migration does NOT do:
 *   - Does not delete or modify any existing Technique nodes
 *   - Does not create scenarios that reference T1621 (the v25.7.0.18
 *     animation provides the trainee experience; explicit scenarios
 *     can be added later if SC013/SC014-style storyboards are wanted
 *     for T1621)
 *   - Does not touch any User, COMPLETED, ATTEMPTED_STAGE, or
 *     ANSWERED data
 *
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   railway run --service server node src/seed/add-t1621-technique.js
 * Or locally:
 *   cd server && node src/seed/add-t1621-technique.js
 *
 * After running:
 *   - Refresh the F3 Framework page in the browser (hard refresh)
 *   - T1621 — MFA Request Generation should appear as an atomic card
 *     under the Initial Access tactic, alongside F1018.001 and F1072
 *   - Clicking it should open the v25.7.0.18 animation
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

const T1621_TECHNIQUE = {
  id: 'T1621',
  name: 'MFA Request Generation',
  description: 'Adversaries with valid account credentials but blocked by push-based multi-factor authentication may bombard the legitimate user with MFA approval requests until the user approves one — either to make the notifications stop, or while distracted. Also known as "MFA fatigue" or "MFA bombing." The bank\'s own push-MFA system is the attack vector, weaponized via attacker-controlled login spam. Effective against any push-MFA implementation that lacks rate limiting, account lockout on N rejections, number matching, or login-context display. Documented in Microsoft Threat Intelligence reporting (2022-2024); canonical published cases include the Uber September 2022 breach and the Cisco August 2022 breach. Defense is bank-side engineering: rate-limit MFA generation, auto-lock accounts after N denials, require number-matching MFA (Microsoft Authenticator pattern, 2023), and display login context (location, device, time) on push prompts. Customer vigilance cannot substitute for these controls because the attack design exploits human exhaustion and behavioral training does not raise the exhaustion ceiling.',
  tacticId: 'TA0001',  // Initial Access — F3 frames T1621 as an Initial Access technique because it's how the attacker completes initial access to the bank account; in MITRE Enterprise it's under Credential Access
  roles: ['teller', 'analyst', 'soc', 'executive'],  // primary for all four — cross-functional concern
}

async function main() {
  await verifyConnection()
  console.log('\n🛡️   v25.7.0.18.1: Adding T1621 (MFA Request Generation) as F3 framework technique...\n')

  // Sanity check: confirm TA0001 (Initial Access) exists in the graph
  const tacticCheck = await runQuery(
    `MATCH (tac:Tactic {id: $tacticId}) RETURN tac.id AS id, tac.name AS name`,
    { tacticId: T1621_TECHNIQUE.tacticId }
  )
  if (tacticCheck.length === 0) {
    console.error(`❌  Tactic ${T1621_TECHNIQUE.tacticId} not found in graph. Aborting.`)
    console.error(`    The base F3 framework seed must be run before this migration.`)
    process.exit(1)
  }
  console.log(`✓   Tactic ${T1621_TECHNIQUE.tacticId} (${tacticCheck[0].name}) confirmed in graph`)

  // Sanity check: report whether T1621 already exists
  const existing = await runQuery(
    `MATCH (t:Technique {id: $id}) RETURN t.id AS id, t.name AS name`,
    { id: T1621_TECHNIQUE.id }
  )
  if (existing.length > 0) {
    console.log(`ℹ️   Technique ${T1621_TECHNIQUE.id} already exists (name: "${existing[0].name}"). Will MERGE — properties will be updated, relationships preserved.`)
  } else {
    console.log(`ℹ️   Technique ${T1621_TECHNIQUE.id} not present — will be created.`)
  }

  // MERGE the Technique node (idempotent)
  await runQuery(
    `MERGE (t:Technique {id: $id})
     SET t.name = $name,
         t.description = $description,
         t.roles = $roles`,
    {
      id: T1621_TECHNIQUE.id,
      name: T1621_TECHNIQUE.name,
      description: T1621_TECHNIQUE.description,
      roles: T1621_TECHNIQUE.roles,
    }
  )
  console.log(`✅  MERGEd Technique ${T1621_TECHNIQUE.id} ("${T1621_TECHNIQUE.name}")`)

  // MERGE the :PART_OF relationship to the Tactic
  await runQuery(
    `MATCH (t:Technique {id: $techId}), (tac:Tactic {id: $tacticId})
     MERGE (t)-[:PART_OF]->(tac)`,
    {
      techId: T1621_TECHNIQUE.id,
      tacticId: T1621_TECHNIQUE.tacticId,
    }
  )
  console.log(`✅  Linked ${T1621_TECHNIQUE.id} -[:PART_OF]-> ${T1621_TECHNIQUE.tacticId}`)

  // Verification: query the graph the same way the API does and confirm
  // T1621 appears in the techniques-tree result
  const verify = await runQuery(
    `MATCH (tech:Technique)-[:PART_OF]->(:Tactic {id: $tacticId})
     WHERE tech.id = $techId
     RETURN tech.id AS id, tech.name AS name, tech.roles AS roles`,
    { techId: T1621_TECHNIQUE.id, tacticId: T1621_TECHNIQUE.tacticId }
  )
  if (verify.length === 1) {
    console.log(`\n✅  Verification passed: T1621 will appear in the F3 framework grid under TA0001 (Initial Access).`)
    console.log(`    Hard-refresh the browser on the Framework page to see the new card.`)
    console.log(`    Card name: "${verify[0].name}"`)
    console.log(`    Roles: ${(verify[0].roles || []).join(', ') || '(default: all roles)'}`)
  } else {
    console.error(`\n❌  Verification failed: T1621 did not return from the techniques-tree query.`)
    console.error(`    Manual inspection required.`)
    process.exit(1)
  }

  await closeDriver()
  console.log('\n🎉  v25.7.0.18.1 migration complete.\n')
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
