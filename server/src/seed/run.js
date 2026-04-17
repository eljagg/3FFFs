/**
 * Authoritative F3 seed — reads directly from MITRE's published Excel export.
 *
 * Source: MITRE CTID Fight Fraud Framework (F3) v1
 * https://ctid.mitre.org/fraud
 *
 * To update when MITRE publishes a new version:
 *   1. Download the new f3-excel-v1.xlsx from ctid.mitre.org/fraud
 *   2. Replace server/src/seed/data/f3-excel-v1.xlsx
 *   3. Run `npm run seed`
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { runQuery, verifyConnection, closeDriver } from '../lib/neo4j.js'
import { SCENARIOS } from './scenarios.js'
import { QUIZZES } from './quizzes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EXCEL_PATH = join(__dirname, 'data', 'f3-excel-v1.xlsx')

function loadF3FromExcel() {
  const workbook = XLSX.read(readFileSync(EXCEL_PATH), { type: 'buffer' })

  const tacticsRaw = XLSX.utils.sheet_to_json(workbook.Sheets['Tactics'])
  const techniquesRaw = XLSX.utils.sheet_to_json(workbook.Sheets['Techniques'])

  const tacticOrder = {
    'TA0043': 1, 'TA0042': 2, 'TA0001': 3, 'TA0005': 4,
    'FA0001': 5, 'TA0002': 6, 'FA0002': 7,
  }

  const tactics = tacticsRaw.map((r) => ({
    id: r['Tactic ID'],
    name: r['Tactic Name'],
    description: (r['Tactic Description'] || '').trim(),
    order: tacticOrder[r['Tactic ID']] || 99,
    uniqueToF3: r['Tactic ID'].startsWith('FA'),
  })).sort((a, b) => a.order - b.order)

  const techniques = techniquesRaw.map((r) => ({
    id: r['Technique ID'],
    name: r['Technique'],
    description: (r['Description'] || '').trim(),
    tacticId: r['Tactic ID'],
    parentId: r['Technique ID'].includes('.') ? r['Technique ID'].split('.')[0] : null,
  }))

  return { tactics, techniques }
}

async function main() {
  await verifyConnection()
  console.log('\n🌱  Seeding authoritative F3 framework into Neo4j Aura...\n')

  const { tactics, techniques } = loadF3FromExcel()
  console.log(`📂  Loaded from MITRE Excel: ${tactics.length} tactics, ${techniques.length} technique mappings\n`)

  await runQuery('MATCH (n) DETACH DELETE n')
  console.log('🗑   Cleared existing graph')

  await runQuery(`CREATE CONSTRAINT tactic_id    IF NOT EXISTS FOR (t:Tactic)    REQUIRE t.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT technique_id IF NOT EXISTS FOR (t:Technique) REQUIRE t.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT scenario_id  IF NOT EXISTS FOR (s:Scenario)  REQUIRE s.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT stage_id     IF NOT EXISTS FOR (s:Stage)     REQUIRE s.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT quiz_id      IF NOT EXISTS FOR (q:Quiz)      REQUIRE q.id IS UNIQUE`)
  await runQuery(`CREATE CONSTRAINT user_id      IF NOT EXISTS FOR (u:User)      REQUIRE u.id IS UNIQUE`)
  console.log('🔒  Applied uniqueness constraints')

  for (const t of tactics) {
    await runQuery(
      `CREATE (:Tactic {
        id: $id, name: $name, description: $description,
        order: $order, uniqueToF3: $uniqueToF3
      })`,
      t
    )
  }
  console.log(`✅  Created ${tactics.length} Tactic nodes`)

  const uniqueTechIds = new Set()
  for (const tech of techniques) {
    if (uniqueTechIds.has(tech.id)) {
      await runQuery(
        `MATCH (t:Technique {id: $id}), (tac:Tactic {id: $tacticId})
         MERGE (t)-[:PART_OF]->(tac)`,
        { id: tech.id, tacticId: tech.tacticId }
      )
    } else {
      await runQuery(
        `MATCH (tac:Tactic {id: $tacticId})
         CREATE (t:Technique {id: $id, name: $name, description: $description})
         CREATE (t)-[:PART_OF]->(tac)`,
        tech
      )
      uniqueTechIds.add(tech.id)
    }
  }
  console.log(`✅  Created ${uniqueTechIds.size} Technique nodes`)

  let subRels = 0
  for (const tech of techniques) {
    if (tech.parentId) {
      const res = await runQuery(
        `MATCH (sub:Technique {id: $childId})
         MATCH (parent:Technique {id: $parentId})
         MERGE (sub)-[r:SUBTECHNIQUE_OF]->(parent)
         RETURN r`,
        { childId: tech.id, parentId: tech.parentId }
      )
      if (res.length) subRels++
    }
  }
  console.log(`✅  Linked ${subRels} sub-technique relationships`)

  for (const sc of SCENARIOS) {
    await runQuery(
      `CREATE (:Scenario {
        id: $id, title: $title, severity: $severity, summary: $summary,
        estimatedLoss: $estimatedLoss, roles: $roles
      })`,
      { id: sc.id, title: sc.title, severity: sc.severity, summary: sc.summary,
        estimatedLoss: sc.estimatedLoss, roles: sc.roles }
    )

    for (const stage of sc.stages) {
      const stageId = `${sc.id}-S${stage.order}`
      const r = await runQuery(
        `MATCH (sc:Scenario {id: $scenarioId})
         OPTIONAL MATCH (tech:Technique {id: $techniqueId})
         CREATE (st:Stage {
           id: $stageId, order: $order, heading: $heading,
           narrative: $narrative, question: $question,
           signals: $signals, options: $options
         })
         CREATE (sc)-[:HAS_STAGE {order: $order}]->(st)
         FOREACH (_ IN CASE WHEN tech IS NOT NULL THEN [1] ELSE [] END |
           CREATE (st)-[:USES_TECHNIQUE]->(tech)
         )
         RETURN tech IS NOT NULL AS linked`,
        {
          scenarioId: sc.id,
          techniqueId: stage.techniqueId,
          stageId,
          order: stage.order,
          heading: stage.heading,
          narrative: stage.narrative,
          question: stage.question,
          signals: JSON.stringify(stage.signals),
          options: JSON.stringify(stage.options),
        }
      )
      if (!r[0]?.linked) {
        console.warn(`  ⚠   stage ${stageId} references unknown technique ${stage.techniqueId}`)
      }
    }
    console.log(`✅  Seeded scenario: ${sc.title}`)
  }

  for (const q of QUIZZES) {
    await runQuery(
      `MATCH (tac:Tactic {id: $tacticId})
       CREATE (q:Quiz {
         id: $id, question: $question, difficulty: $difficulty,
         roles: $roles, options: $options
       })
       CREATE (q)-[:TESTS]->(tac)`,
      {
        id: q.id,
        tacticId: q.tacticId,
        question: q.question,
        difficulty: q.difficulty,
        roles: q.roles,
        options: JSON.stringify(q.options),
      }
    )
  }
  console.log(`✅  Created ${QUIZZES.length} Quiz nodes`)

  console.log('\n📊  Final graph summary:')
  const summary = await runQuery(`
    MATCH (n)
    RETURN labels(n)[0] AS label, count(n) AS count
    ORDER BY count DESC
  `)
  summary.forEach((r) => console.log(`    ${r.label.padEnd(12)} ${r.count} nodes`))

  const relSummary = await runQuery(`
    MATCH ()-[r]->()
    RETURN type(r) AS type, count(r) AS count
    ORDER BY count DESC
  `)
  console.log('\n    Relationships:')
  relSummary.forEach((r) => console.log(`    ${r.type.padEnd(22)} ${r.count}`))

  console.log('\n🎉  Seed complete!\n')
  await closeDriver()
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err)
  process.exit(1)
})
