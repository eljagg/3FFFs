/**
 * add-quizzes.js — additive quiz migration
 *
 * Loads QUIZZES from quizzes.js and MERGEs them into the live graph without
 * touching existing User nodes, COMPLETED edges, ATTEMPTED_STAGE history,
 * or ANSWERED edges.
 *
 * Why this migration exists: the original quizzes.js used placeholder tactic
 * IDs (T001, T005, etc.) that didn't match the real F3 tactic IDs in the
 * seeded Excel (TA0043, FA0001, etc.). The seed loader's MATCH clause
 * silently failed for every quiz, so zero Quiz nodes ever made it into the
 * graph — and the Quiz page always came back with "No questions."
 *
 * This script fixes the data and populates the graph idempotently. Safe to
 * re-run: MERGE doesn't duplicate, SET refreshes content on re-run so you
 * can edit quizzes.js and re-run this to update.
 *
 * Run it once:   node src/seed/add-quizzes.js
 */

import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { QUIZZES } from './quizzes.js'

async function main() {
  await verifyConnection()
  console.log('\n🧠  Adding quiz questions to the graph (additive, preserves existing data)...\n')

  const before = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('📊  Before migration:')
  before.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))
  console.log('')

  let created = 0
  let updated = 0
  let linked = 0
  let tacticMissing = 0

  for (const q of QUIZZES) {
    // Verify the target tactic exists. If it doesn't, log and skip — better
    // than silently failing like the original seed did.
    const tacticCheck = await runQuery(
      `MATCH (tac:Tactic {id: $tacticId}) RETURN tac.id AS id`,
      { tacticId: q.tacticId }
    )
    if (tacticCheck.length === 0) {
      console.log(`⚠  ${q.id} references unknown tactic ${q.tacticId} — skipping`)
      tacticMissing++
      continue
    }

    // Check whether this Quiz node already exists
    const exists = await runQuery(
      `MATCH (q:Quiz {id: $id}) RETURN q.id AS id`,
      { id: q.id }
    )

    if (exists.length === 0) {
      await runQuery(
        `CREATE (quiz:Quiz {
           id: $id,
           question: $question,
           difficulty: $difficulty,
           roles: $roles,
           options: $options
         })`,
        {
          id: q.id,
          question: q.question,
          difficulty: q.difficulty,
          roles: q.roles,
          options: JSON.stringify(q.options),
        }
      )
      created++
      console.log(`✚  ${q.id} (${q.tacticId} · ${q.difficulty}): ${q.question.slice(0, 70)}${q.question.length > 70 ? '…' : ''}`)
    } else {
      await runQuery(
        `MATCH (quiz:Quiz {id: $id})
         SET quiz.question = $question,
             quiz.difficulty = $difficulty,
             quiz.roles = $roles,
             quiz.options = $options`,
        {
          id: q.id,
          question: q.question,
          difficulty: q.difficulty,
          roles: q.roles,
          options: JSON.stringify(q.options),
        }
      )
      updated++
      console.log(`↻  ${q.id} updated (already existed)`)
    }

    // MERGE the TESTS relationship (idempotent)
    await runQuery(
      `MATCH (quiz:Quiz {id: $id})
       MATCH (tac:Tactic {id: $tacticId})
       MERGE (quiz)-[r:TESTS]->(tac)
       RETURN r`,
      { id: q.id, tacticId: q.tacticId }
    )
    linked++
  }

  console.log('')
  console.log('✅  Migration summary:')
  console.log(`    Quiz nodes created:       ${created}`)
  console.log(`    Quiz nodes updated:       ${updated}`)
  console.log(`    TESTS edges processed:    ${linked}`)
  if (tacticMissing > 0) {
    console.log(`    Skipped (unknown tactic): ${tacticMissing}`)
  }

  const after = await runQuery(`
    MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY label
  `)
  console.log('')
  console.log('📊  After migration:')
  after.forEach(r => console.log(`    ${String(r.label).padEnd(12)} ${r.count}`))

  // Preservation check — nothing should have changed for user data
  const users = await runQuery(`MATCH (u:User) RETURN count(u) AS c`)
  const completed = await runQuery(`MATCH ()-[r:COMPLETED]->() RETURN count(r) AS c`)
  const attempts = await runQuery(`MATCH ()-[r:ATTEMPTED_STAGE]->() RETURN count(r) AS c`)
  const answered = await runQuery(`MATCH ()-[r:ANSWERED]->() RETURN count(r) AS c`)

  console.log('')
  console.log('🔒  Preservation check (should all be unchanged vs. before):')
  console.log(`    User nodes:        ${users[0].c}`)
  console.log(`    COMPLETED edges:   ${completed[0].c}`)
  console.log(`    ATTEMPTED_STAGE:   ${attempts[0].c}`)
  console.log(`    ANSWERED edges:    ${answered[0].c}`)

  // Show quizzes per tactic so coverage is visible
  const coverage = await runQuery(`
    MATCH (q:Quiz)-[:TESTS]->(tac:Tactic)
    RETURN tac.id AS id, tac.name AS name, count(q) AS quizzes
    ORDER BY tac.order
  `)
  console.log('')
  console.log('📚  Quiz coverage by tactic:')
  coverage.forEach(r => console.log(`    ${String(r.id).padEnd(8)} ${String(r.name).padEnd(22)} ${r.quizzes} question${r.quizzes === 1 ? '' : 's'}`))

  console.log('\n🎉  Quiz migration complete!\n')
  await closeDriver()
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
