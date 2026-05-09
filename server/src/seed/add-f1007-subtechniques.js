/**
 * add-f1007-subtechniques.js — additive sub-technique migration
 *
 * v25.7.0.29 — surfaces three F1007 sub-techniques as first-class
 * F3 framework cards under Positioning (FA0001), each backed by
 * its own animation:
 *
 *   F1007.001 — Account Linking: Joint Signatory Add
 *               (Renee Patterson · NCB · call-centre social engineering)
 *   F1007.002 — Account Linking: Linked Profile Add
 *               (Tariq Mohammed · Republic Bank Trinidad · digital-channel native)
 *   F1007.003 — Account Linking: External Account Link
 *               (Marlon Grant · JN Bank · cross-bank link to Sagicor mule)
 *
 * Why this script exists:
 *   The v25.7.0.29 release adds three front-end animations for
 *   F1007 sub-techniques via ANIMATION_MAP in
 *   TechniqueDetailSidebar.jsx, but the sub-technique nodes are
 *   not present in the Neo4j graph. The framework grid is
 *   populated from /api/framework/tactics/:tacticId/techniques-tree,
 *   which queries Technique nodes by [:PART_OF] their Tactic and
 *   then groups by [:SUBTECHNIQUE_OF] their parent. With no
 *   sub-technique nodes, F1007 keeps showing as ATOMIC, the new
 *   animations are unreachable, and the trainee has nothing to click.
 *
 *   This script creates the three missing Technique nodes with
 *   the same shape as F1018.001 (existing sub-technique under
 *   Initial Access), so the framework grid surfaces F1007 with
 *   a "3 SUB" badge and the three sub-techniques as expandable
 *   children.
 *
 * What this migration does:
 *   1. Verifies F1007 (parent) and FA0001 (Positioning tactic) exist
 *   2. MERGEs three Technique nodes {id: 'F1007.001'/.002/.003}
 *   3. MERGEs :PART_OF relationships to Tactic FA0001
 *   4. MERGEs :SUBTECHNIQUE_OF relationships to parent F1007
 *   5. Sets `roles` per sub-technique reflecting the role audience
 *      for each case (all four roles for all three — F1007 is
 *      cross-functional: tellers handle disputes, analysts review
 *      audit trails, SOC sets call-centre KBA policy / external-link
 *      verification policy, executives approve the engineering work)
 *
 * What this migration does NOT do:
 *   - Does not delete or modify any existing Technique nodes
 *   - Does not modify F1007's existing description or roles
 *   - Does not create scenarios that reference these sub-techniques
 *     (the v25.7.0.29 animation files provide the trainee experience;
 *     explicit scenario nodes can be added later if SC013-style
 *     storyboards are wanted)
 *   - Does not touch any User, COMPLETED, ATTEMPTED_STAGE, or
 *     ANSWERED data
 *
 * Idempotent — safe to re-run.
 *
 * Run with:
 *   railway run --service server node src/seed/add-f1007-subtechniques.js
 * Or locally:
 *   cd server && node src/seed/add-f1007-subtechniques.js
 *
 * After running:
 *   - Refresh the F3 Framework page in the browser (hard refresh)
 *   - F1007 should appear with a "3 SUB" badge under Positioning
 *   - Expanding F1007 should show three sub-technique cards
 *   - Clicking each opens the corresponding animation
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'

const PARENT_TECHNIQUE_ID = 'F1007'
const TACTIC_ID = 'FA0001'

const SUBTECHNIQUES = [
  {
    id: 'F1007.001',
    name: 'Account Linking: Joint Signatory Add',
    description: 'Adversaries with valid account credentials may add themselves (or a co-conspirator under a controlled identity) as a joint signatory or authorized user on the victim\'s account, establishing persistent access that survives password resets because the joint relationship is a separate authentication path. In Caribbean retail banking, joint-account add is typically achieved via call-centre social engineering: the adversary calls the bank claiming to be the customer, passes knowledge-based authentication using OSINT-harvested data, and requests a joint signatory be added for "shared household expenses," "estate planning," or "convenience for an elderly relative." The bank\'s call-centre process treats the joint-add request as a customer-service operation rather than a security-sensitive change, often without requiring branch presence, written authorization, or independent verification of the proposed joint signatory. Once added, the joint signatory has independent online banking credentials, a separate device fingerprint, and full transactional authority. Detection is difficult because the joint-add itself appears legitimate; the only signal is the delta between "customer\'s known relationship graph" and "newly-added signatory" — a signal that requires the bank to model the customer\'s social graph, which most do not. Defense lives in call-centre process: require a 24-48 hour callback to the customer\'s registered phone number on file (not the inbound call\'s caller ID), require branch presence for joint-signatory adds above a threshold, and add a velocity rule on joint-add requests across the institution to flag rings.',
    roles: ['teller', 'analyst', 'soc', 'executive'],
  },
  {
    id: 'F1007.002',
    name: 'Account Linking: Linked Profile Add',
    description: 'Adversaries with valid account credentials may register a secondary profile, secondary device, or secondary biometric within the customer\'s digital banking surface — establishing a parallel authentication path that survives password resets because the secondary profile is a distinct credential set, not a derivative of the primary password. Modern retail banking platforms support multiple device registrations per customer (legitimate for customers who use both phone and tablet) and multiple biometric enrollments (legitimate for shared-family accounts), but the registration flows are typically gated only on the current session being authenticated, not on out-of-band verification of the new profile. An adversary who has compromised a session via SIM-swap, vishing-driven recovery flow, or push-MFA fatigue can navigate to "Profile → Linked Profiles → Add Secondary Profile" or equivalent, register their own device + biometric, and persist as long as that secondary profile remains on the account. Detection is particularly difficult because the customer\'s "Active Devices" list often does not surface secondary-profile devices the same way it surfaces primary-profile devices — a UX choice that makes the persistence invisible to the customer\'s normal hygiene. Defense lives in registration-flow design: require step-up authentication on secondary profile creation, send an SMS / email notification to the registered contacts on the primary profile, and surface secondary-profile devices in the Active Devices list with the same prominence as primary devices.',
    roles: ['teller', 'analyst', 'soc', 'executive'],
  },
  {
    id: 'F1007.003',
    name: 'Account Linking: External Account Link',
    description: 'Adversaries with valid account credentials may link the victim\'s account to an "external account" at a different institution that the adversary controls (typically a mule account at a peer bank, opened with valid KYC documents in a recruited mule\'s name). The external link itself is the persistence mechanism: it survives password resets, it provides an exfil channel, and in the Execution / Monetization phases it becomes the primary route by which funds leave the victim\'s account — structuring transfers below reporting thresholds to the linked external account where the mule then withdraws or onward-transfers. External-link verification flows in Caribbean retail banking typically use micro-deposits (the bank deposits two small amounts to the external account, the customer enters the amounts to confirm ownership), but the adversary controls the destination and completes verification in minutes. Detection is mechanical: a newly-added external link followed within 30 days by structuring-pattern transfers to that link is a high-confidence fraud signal. Defense combines slow-rolling the link activation (e.g. a 7-day cool-off before transfers > N are permitted to a newly-linked external account), monitoring the destination institution\'s mule-account profile (cross-institution intelligence sharing), and applying the same out-of-band verification pattern used for joint-signatory adds.',
    roles: ['teller', 'analyst', 'soc', 'executive'],
  },
]

async function main() {
  await verifyConnection()
  console.log('\n🛡️   v25.7.0.29: Adding F1007 sub-techniques (Account Linking) under Positioning...\n')

  // Sanity check: confirm Tactic FA0001 (Positioning) exists
  const tacticCheck = await runQuery(
    `MATCH (tac:Tactic {id: $tacticId}) RETURN tac.id AS id, tac.name AS name`,
    { tacticId: TACTIC_ID }
  )
  if (tacticCheck.length === 0) {
    console.error(`❌  Tactic ${TACTIC_ID} not found in graph. Aborting.`)
    console.error(`    The base F3 framework seed must be run before this migration.`)
    process.exit(1)
  }
  console.log(`✓   Tactic ${TACTIC_ID} (${tacticCheck[0].name}) confirmed in graph`)

  // Sanity check: confirm parent F1007 exists
  const parentCheck = await runQuery(
    `MATCH (t:Technique {id: $id}) RETURN t.id AS id, t.name AS name`,
    { id: PARENT_TECHNIQUE_ID }
  )
  if (parentCheck.length === 0) {
    console.error(`❌  Parent Technique ${PARENT_TECHNIQUE_ID} not found in graph. Aborting.`)
    console.error(`    The base F3 framework seed must be run before this migration.`)
    process.exit(1)
  }
  console.log(`✓   Parent Technique ${PARENT_TECHNIQUE_ID} ("${parentCheck[0].name}") confirmed in graph`)

  // Process each sub-technique
  for (const sub of SUBTECHNIQUES) {
    // Report whether this sub-technique already exists
    const existing = await runQuery(
      `MATCH (t:Technique {id: $id}) RETURN t.id AS id, t.name AS name`,
      { id: sub.id }
    )
    if (existing.length > 0) {
      console.log(`\nℹ️   Sub-technique ${sub.id} already exists ("${existing[0].name}"). Will MERGE — properties updated, relationships preserved.`)
    } else {
      console.log(`\nℹ️   Sub-technique ${sub.id} not present — will be created.`)
    }

    // MERGE the Technique node
    await runQuery(
      `MERGE (t:Technique {id: $id})
       SET t.name = $name,
           t.description = $description,
           t.roles = $roles`,
      {
        id: sub.id,
        name: sub.name,
        description: sub.description,
        roles: sub.roles,
      }
    )
    console.log(`✅  MERGEd Technique ${sub.id} ("${sub.name}")`)

    // MERGE :PART_OF Tactic FA0001
    await runQuery(
      `MATCH (t:Technique {id: $techId}), (tac:Tactic {id: $tacticId})
       MERGE (t)-[:PART_OF]->(tac)`,
      { techId: sub.id, tacticId: TACTIC_ID }
    )
    console.log(`✅  Linked ${sub.id} -[:PART_OF]-> ${TACTIC_ID}`)

    // MERGE :SUBTECHNIQUE_OF parent F1007
    await runQuery(
      `MATCH (sub:Technique {id: $subId}), (parent:Technique {id: $parentId})
       MERGE (sub)-[:SUBTECHNIQUE_OF]->(parent)`,
      { subId: sub.id, parentId: PARENT_TECHNIQUE_ID }
    )
    console.log(`✅  Linked ${sub.id} -[:SUBTECHNIQUE_OF]-> ${PARENT_TECHNIQUE_ID}`)
  }

  // Verification: query the graph the same way the techniques-tree API
  // does and confirm all three sub-techniques appear under F1007
  console.log('\n🔍  Verifying via techniques-tree query shape...\n')
  const verify = await runQuery(
    `MATCH (tech:Technique)-[:PART_OF]->(:Tactic {id: $tacticId})
     OPTIONAL MATCH (tech)-[:SUBTECHNIQUE_OF]->(parent:Technique)
     WHERE parent.id = $parentId OR tech.id = $parentId
     RETURN tech.id AS id, tech.name AS name, parent.id AS parentId
     ORDER BY tech.id`,
    { tacticId: TACTIC_ID, parentId: PARENT_TECHNIQUE_ID }
  )
  console.log(`Returned ${verify.length} row(s) for F1007 + sub-techniques:`)
  for (const row of verify) {
    const parentInfo = row.parentId ? ` (sub-technique of ${row.parentId})` : ' (parent)'
    console.log(`  - ${row.id}: ${row.name}${parentInfo}`)
  }

  const expectedIds = ['F1007', 'F1007.001', 'F1007.002', 'F1007.003']
  const actualIds = verify.map(r => r.id)
  const missing = expectedIds.filter(id => !actualIds.includes(id))
  if (missing.length > 0) {
    console.error(`\n❌  Verification failed: missing techniques: ${missing.join(', ')}`)
    await closeDriver()
    process.exit(1)
  }

  console.log('\n✅  All three F1007 sub-techniques present and correctly linked.')
  console.log('    Hard-refresh the F3 Framework page; F1007 will surface with a "3 SUB" badge.')
  await closeDriver()
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  closeDriver().finally(() => process.exit(1))
})
