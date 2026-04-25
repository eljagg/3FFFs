import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'
import { TUTOR_CONTEXT } from '../lib/graph-queries.js'

const router = Router()

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

async function buildSystemPrompt(user, jobFunction, stageContext) {
  const base = `You are the AI Tutor for 3fffs, a training platform grounded in the MITRE Fight Fraud Framework™ (F3), released by MITRE CTID in April 2026.

Your job: help a financial-institution staff member build intuition about cyber-enabled fraud, using the F3 framework as your shared language.

F3 has 7 tactics: Reconnaissance (TA0043), Resource Development (TA0042), Initial Access (TA0001), Defense Evasion (TA0005), Positioning (FA0001, F3-unique), Execution (TA0002), and Monetization (FA0002, F3-unique).

Style:
- Warm, expert, direct — not a salesperson, not a textbook
- Short paragraphs, plain language
- When citing a technique, use its real ID (e.g., F1081 Phishing, F1047 Cashout: Conversion to Cryptocurrency)
- When it makes sense, recommend a specific scenario by name (don't just say "take a scenario")
- Never fabricate technique IDs or names; if unsure, say so

You have access to the learner's actual graph state below. USE IT. Reference their progress, gaps, and recommended next steps when helpful. Don't recite the data — weave it naturally into your answer.`

  // Stage context, when the user is asking from inside a scenario
  let stageBlock = ''
  if (stageContext) {
    stageBlock = `

## The user is asking from INSIDE a scenario stage

They are mid-scenario right now. Their question is about THIS specific stage. Ground every answer in this context — do not redirect them to a different scenario unless asked.

**Scenario:** ${stageContext.scenarioTitle || '(unknown)'}
${stageContext.scenarioSummary ? `**Summary:** ${stageContext.scenarioSummary}` : ''}

**Current stage:** ${stageContext.stageHeading || '(unknown)'}
${stageContext.tacticName ? `**Tactic:** ${stageContext.tacticName}` : ''}
${stageContext.techniqueId ? `**Technique:** ${stageContext.techniqueId} — ${stageContext.techniqueName || ''}` : ''}

${stageContext.stageNarrative ? `**What is happening:**
${stageContext.stageNarrative}` : ''}

${stageContext.stageQuestion ? `**The question they were asked:**
${stageContext.stageQuestion}` : ''}

When you answer, refer to the scenario specifics ("this Lottery Scam case", "the SIM Swap with Telco Insider you are working through") rather than abstract terms. The user is engaged with a concrete situation; meet them there.`
  }

  if (!user?.id) return base + stageBlock + '\n\nNote: learner context is not available for this session.'

  let graphContext = ''
  try {
    const rows = await runQuery(TUTOR_CONTEXT, { userId: user.id })
    const ctx = rows[0]
    if (ctx) {
      const coverage = ctx.tacticCoverage || []
      const biggestGap = coverage
        .filter(t => t.totalTechniques > 0)
        .sort((a, b) => (a.coveredTechniques / a.totalTechniques) - (b.coveredTechniques / b.totalTechniques))[0]
      const available = ctx.availableScenarios || []

      const quizAccuracy = ctx.quizzesAnswered > 0
        ? Math.round((ctx.correctAnswers / ctx.quizzesAnswered) * 100)
        : null

      graphContext = `

## Your learner's current graph state

**Identity:**
- Name: ${user.name || user.email || 'unknown'}
- Role: ${(user.roles || []).join(', ') || 'trainee'}
- Job function: ${jobFunction || 'not yet chosen'}

**Progress:**
- Scenarios completed: ${ctx.scenariosCompleted}
- Quiz questions answered: ${ctx.quizzesAnswered}${quizAccuracy !== null ? ` (${quizAccuracy}% correct)` : ''}

**Coverage by tactic:**
${coverage.map(t => {
  const pct = t.totalTechniques > 0 ? Math.round((t.coveredTechniques / t.totalTechniques) * 100) : 0
  return `- ${t.name} (${t.id}${t.uniqueToF3 ? ', F3-unique' : ''}): ${t.coveredTechniques}/${t.totalTechniques} techniques (${pct}%)`
}).join('\n')}

${biggestGap ? `**Biggest gap:** ${biggestGap.name} (${biggestGap.coveredTechniques}/${biggestGap.totalTechniques} covered). Consider steering the conversation toward this tactic when appropriate.` : ''}

**Scenarios the learner has NOT completed yet:**
${available.length ? available.map(s => `- "${s.title}" (id: ${s.id}, severity: ${s.severity})`).join('\n') : '- (none — all completed)'}

When recommending a scenario, refer to it by title. Don't overwhelm — suggest one at a time.`
    }
  } catch (err) {
    console.error('Tutor context query failed:', err.message)
    graphContext = '\n\n(Graph context unavailable — answer generally using F3 knowledge.)'
  }

  return base + stageBlock + graphContext
}

router.post('/', async (req, res, next) => {
  try {
    if (!anthropic) {
      return res.status(503).json({ error: 'AI Tutor not configured (ANTHROPIC_API_KEY missing)' })
    }

    const user = getUser(req)
    const { message, history = [], role: jobFunction, stageContext } = req.body || {}
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' })
    }

    const system = await buildSystemPrompt(user, jobFunction, stageContext)
    const messages = [
      ...history
        .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system,
      messages,
    })

    const reply = response.content?.[0]?.text || ''
    res.json({ reply })
  } catch (e) {
    console.error('Tutor error:', e)
    next(e)
  }
})

export default router
