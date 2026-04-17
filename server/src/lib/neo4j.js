import neo4j from 'neo4j-driver'

const uri = process.env.NEO4J_URI
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD

if (!uri || !password) {
  console.error('❌ NEO4J_URI and NEO4J_PASSWORD must be set in .env')
  process.exit(1)
}

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  maxConnectionPoolSize: 20,
  connectionAcquisitionTimeout: 10_000,
  disableLosslessIntegers: true,
})

export async function verifyConnection() {
  const session = driver.session()
  try {
    await session.run('RETURN 1 AS ok')
    console.log(`✅ Connected to Neo4j: ${uri}`)
  } catch (err) {
    console.error(`❌ Neo4j connection failed: ${err.message}`)
    throw err
  } finally {
    await session.close()
  }
}

export async function runQuery(cypher, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(cypher, params)
    return result.records.map((r) => r.toObject())
  } finally {
    await session.close()
  }
}

export async function closeDriver() {
  await driver.close()
}
