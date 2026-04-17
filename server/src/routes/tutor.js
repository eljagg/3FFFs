import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

const apiKey = process.env.ANTHROPIC_API_KEY
const anthropic = apiKey ? new Anthropic({ apiKey }) : null

const BASE_SYSTEM = `You are an expert AI tutor on the MITRE Fight Fraud Framework (F3), helping staff at financial institutions understand and apply F3 to spot and respond to cyber-enabled fraud.

Key facts:
- F3 was released April 9, 2026 by MITRE's Center for Threat-Informed Defense (CTID).
- It covers 7 tactics: Reconnaissance, Resource Development, Initial Access, Defense Evasion, Positioning, Execution, Monetization.
- Positioning and Monetization are unique to F3 and do not appear in MITRE ATT&CK.
- F3 is a behavior-based model built from real-world fraud incidents.
- US banking fraud losses reached $13.7B in 2024.

Style:
- Answer in 3–6 sentences unless the user asks for more depth.
- Be concrete. Use examples. Avoid unexplained jargon.
- If the user asks something outside the F3 / fraud / financial crime domain, politely redirect.
- Never invent F3 content. If asked something specific and you are not sure, say you are not sure and recommend they check the live framework at ctid.mitre.org/fraud.`

router.get('/status', (req, res) => {
  res.json({ enabled: !!anthropic })
})

router.post('/', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({
      error: 'AI tutor is not configured. Add ANTHROPIC_API_KEY to your .env and restart the server.',
    })
  }

  try {
    const { messages, role } = req.body
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages array required' })
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''

    const graphContext = await runQuery(
      `
      MATCH (t:Tactic)
      WHERE toLower($q) CONTAINS toLower(t.name)
      RETURN t.name AS name, t.summary AS summary, t.executiveTakeaway AS takeaway, t.uniqueToF3 AS uniqueToF3
      `,
      { q: lastUser }
    )

    let grounded = BASE_SYSTEM
    if (role) grounded += `\n\nThe user's role is: ${role}. Tailor examples and depth accordingly.`
    if (graphContext.length) {
      grounded += `\n\nRelevant F3 tactics from the knowledge graph:\n` +
        graphContext.map((g) =>
          `- ${g.name}${g.uniqueToF3 ? ' (unique to F3)' : ''}: ${g.summary} Executive takeaway: ${g.takeaway}`
        ).join('\n')
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: grounded,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = response.content.find((c) => c.type === 'text')?.text || ''
    res.json({ reply })
  } catch (err) {
    console.error('Tutor error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
