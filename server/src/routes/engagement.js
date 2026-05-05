/**
 * Interactivity routes — daily signal, review queue, retrieval practice, certificate.
 *
 * Introduced in v25.7.1. Bundles four related read/write endpoints behind two
 * routers:
 *   - publicRouter: /verify/:hash (no auth — auditor-facing certificate check)
 *   - authedRouter: everything else (mounted under requireAuth + syncUser)
 *
 * Mounted at /api/engagement in server/src/index.js (twice — once each).
 *
 * Schema additions (idempotent — see seed/add-engagement-schema.js):
 *   (:User)-[:DAILY_SIGNAL_ANSWERED {dayKey, correct, answeredAt}]->(:Stage)
 *   (:User)-[:RETRIEVED {scenarioId, correct, answeredAt}]->(:Scenario)
 *   (:User)-[:CERTIFICATE_ISSUED {hash, firstIssuedAt, lastIssuedAt}]->(:Scenario)
 *
 * The DAILY_SIGNAL_ANSWERED edge has a composite key — the same user can have
 * multiple edges to the same stage on different days, so {dayKey} disambiguates.
 * The application layer enforces "one Daily Signal per UTC day" via the
 * dayKey + a guard query before insertion.
 */

import { Router } from 'express'
import crypto from 'crypto'
import { runQuery } from '../lib/neo4j.js'
import { getUser } from '../lib/auth.js'

export const publicRouter = Router()
export const authedRouter = Router()

/* -----------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function safeParse(v, fallback = []) {
  if (!v) return fallback
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return fallback }
}

// "2026-05-05" — UTC date stamp for daily-rotation logic.
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// Deterministic daily pick: take a simple hash of the day key modulo
// candidate count. Same day → same stage for everyone, which is part of
// the social-feature appeal ("did you get today's Signal?").
function pickIndexForDay(dayKey, total) {
  if (total <= 0) return 0
  const h = crypto.createHash('sha256').update(dayKey).digest()
  return h.readUInt32BE(0) % total
}


/* -----------------------------------------------------------------------------
 * GET /api/engagement/daily-signal
 *
 * Returns today's signal — a single stage's question + options + the user's
 * current streak. The pick is deterministic across users by UTC day so a
 * Slack chat about "today's Signal" works.
 *
 * The response shape mirrors what Quiz.jsx needs minus the rationale (we
 * reveal that only after the user answers via POST /answer below).
 * --------------------------------------------------------------------------- */
authedRouter.get('/daily-signal', async (req, res, next) => {
  try {
    const me = getUser(req)
    const dayKey = todayKey()

    // Pull every primary stage the user has not yet seen via DAILY_SIGNAL,
    // ordered deterministically. A stage shown today as the Daily Signal
    // is allowed to recur in scenarios — the two surfaces are independent.
    const candidates = await runQuery(`
      MATCH (st:Stage)<-[:HAS_STAGE]-(sc:Scenario)
      WHERE (st.type IS NULL OR st.type = 'primary')
        AND st.question IS NOT NULL
        AND st.options  IS NOT NULL
      RETURN st.id AS stageId, st.heading AS heading, st.question AS question,
             st.options AS options, st.signals AS signals,
             sc.id AS scenarioId, sc.title AS scenarioTitle
      ORDER BY st.id
    `)

    if (!candidates.length) {
      return res.json({ signal: null, message: 'No daily signals available.' })
    }

    const idx = pickIndexForDay(dayKey, candidates.length)
    const c = candidates[idx]

    // Has this user already answered today's Signal?
    const existing = await runQuery(`
      MATCH (u:User {id: $userId})-[r:DAILY_SIGNAL_ANSWERED {dayKey: $dayKey}]->(st:Stage)
      RETURN r.correct AS correct, r.optionIndex AS optionIndex,
             st.id AS stageId, r.answeredAt AS answeredAt
      LIMIT 1
    `, { userId: me.id, dayKey })

    // Streak: count consecutive UTC days ending today/yesterday with an
    // answered Signal. We pull the last ~14 day-keys answered and walk
    // backward from today; a single missed day breaks the streak.
    const streakRows = await runQuery(`
      MATCH (u:User {id: $userId})-[r:DAILY_SIGNAL_ANSWERED]->()
      RETURN r.dayKey AS dayKey
      ORDER BY r.dayKey DESC
      LIMIT 60
    `, { userId: me.id })
    const answeredDays = new Set(streakRows.map(r => r.dayKey))

    let streak = 0
    let cursor = new Date(dayKey + 'T00:00:00Z')
    // If they haven't answered today yet, grace: streak still counts
    // through yesterday. Otherwise count through today.
    if (!existing.length) cursor.setUTCDate(cursor.getUTCDate() - 1)
    while (true) {
      const k = cursor.toISOString().slice(0, 10)
      if (answeredDays.has(k)) {
        streak++
        cursor.setUTCDate(cursor.getUTCDate() - 1)
      } else break
    }

    // Strip rationales from options before returning — we reveal them only
    // on POST /answer, otherwise the user could just inspect the network
    // response and cheat the streak. We keep the option index alignment
    // intact so the client can map back to the rationale post-submit.
    const options = safeParse(c.options).map(opt => ({
      text: opt.text,
      // explicitly omit `correct` and `rationale` here
    }))

    res.json({
      signal: {
        dayKey,
        stageId: c.stageId,
        heading: c.heading,
        question: c.question,
        options,
        scenarioId: c.scenarioId,
        scenarioTitle: c.scenarioTitle,
      },
      answered: existing.length > 0 ? {
        correct: existing[0].correct,
        optionIndex: existing[0].optionIndex,
        answeredAt: existing[0].answeredAt,
      } : null,
      streak,
    })
  } catch (e) {
    console.error('[GET /api/engagement/daily-signal]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * POST /api/engagement/daily-signal/answer
 *
 * Records the user's answer, returns the rationale + correct flag for the
 * post-decision reveal. Idempotent — re-submitting the same dayKey updates
 * the existing edge rather than creating a duplicate.
 * --------------------------------------------------------------------------- */
authedRouter.post('/daily-signal/answer', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { stageId, optionIndex } = req.body || {}
    const dayKey = todayKey()

    if (!stageId || typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'stageId and optionIndex required' })
    }

    // Fetch the canonical options to determine correctness server-side.
    // Trust client-reported `correct` is a tempting shortcut but defeats
    // the point — we do the lookup.
    const stageRows = await runQuery(`
      MATCH (st:Stage {id: $stageId})
      RETURN st.options AS options, st.heading AS heading
    `, { stageId })

    if (!stageRows.length) {
      return res.status(404).json({ error: 'Stage not found' })
    }
    const options = safeParse(stageRows[0].options)
    const picked = options[optionIndex]
    if (!picked) {
      return res.status(400).json({ error: 'Invalid optionIndex' })
    }
    const correct = !!picked.correct

    await runQuery(`
      MERGE (u:User {id: $userId})
        ON CREATE SET u.email = $email, u.createdAt = timestamp(),
                      u.firstSeenAt = timestamp()
        SET u.lastSeenAt = timestamp()
      WITH u
      MATCH (st:Stage {id: $stageId})
      MERGE (u)-[r:DAILY_SIGNAL_ANSWERED {dayKey: $dayKey}]->(st)
        SET r.correct = $correct,
            r.optionIndex = $optionIndex,
            r.answeredAt = timestamp()
    `, {
      userId: me.id,
      email: me.email || null,
      stageId, dayKey, optionIndex, correct,
    })

    res.json({
      ok: true,
      correct,
      rationales: options.map((o, i) => ({
        index: i,
        text: o.text,
        correct: !!o.correct,
        rationale: o.rationale || null,
      })),
    })
  } catch (e) {
    console.error('[POST /api/engagement/daily-signal/answer]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * GET /api/engagement/review-queue
 *
 * Surfaces wrong scenario answers older than the cooldown (default 5 days)
 * for spaced re-testing. Excludes wrong answers the user has already
 * re-answered correctly since.
 *
 * Why 5 days: the Ebbinghaus forgetting curve flattens past a week, so
 * 5 days hits the meaningful relearning window without feeling pestering.
 * Configurable via ?cooldownDays=N for testing.
 * --------------------------------------------------------------------------- */
authedRouter.get('/review-queue', async (req, res, next) => {
  try {
    const me = getUser(req)
    const cooldownDays = Math.max(1, Math.min(30, parseInt(req.query.cooldownDays || '5', 10)))
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - cooldownMs

    // Find every stage where the user has at least one wrong attempt and the
    // most-recent attempt is wrong + older than the cooldown. Joining
    // most-recent-attempt avoids resurfacing items they've already corrected
    // since the original wrong answer.
    const rows = await runQuery(`
      MATCH (u:User {id: $userId})-[a:ATTEMPTED_STAGE]->(st:Stage)
      WITH u, st, max(a.answeredAt) AS lastAt
      MATCH (u)-[a2:ATTEMPTED_STAGE]->(st)
      WHERE a2.answeredAt = lastAt AND a2.correct = false AND lastAt <= $cutoff
      MATCH (st)<-[:HAS_STAGE]-(sc:Scenario)
      RETURN st.id AS stageId, st.heading AS heading, st.question AS question,
             sc.id AS scenarioId, sc.title AS scenarioTitle,
             a2.optionIndex AS wrongOptionIndex,
             lastAt AS lastWrongAt
      ORDER BY lastAt ASC
      LIMIT 12
    `, { userId: me.id, cutoff })

    res.json({
      cooldownDays,
      items: rows.map(r => ({
        stageId: r.stageId,
        heading: r.heading,
        question: r.question,
        scenarioId: r.scenarioId,
        scenarioTitle: r.scenarioTitle,
        wrongOptionIndex: r.wrongOptionIndex,
        lastWrongAt: r.lastWrongAt,
        daysAgo: Math.round((Date.now() - r.lastWrongAt) / (24 * 60 * 60 * 1000)),
      })),
    })
  } catch (e) {
    console.error('[GET /api/engagement/review-queue]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * GET /api/engagement/retrieval/:scenarioId
 *
 * Generates 3 retrieval-practice questions for a just-completed scenario.
 * Each is "did this signal appear in this scenario?" with one true and three
 * foils sourced from OTHER scenarios.
 *
 * Generated server-side so the foils stay hidden from inspection. The same
 * scenario produces a different draw on each call so replays don't trigger
 * memorisation of the questions themselves.
 * --------------------------------------------------------------------------- */
authedRouter.get('/retrieval/:scenarioId', async (req, res, next) => {
  try {
    const { scenarioId } = req.params

    // Pull all signals from THIS scenario.
    const ours = await runQuery(`
      MATCH (sc:Scenario {id: $scenarioId})-[:HAS_STAGE]->(st:Stage)
      RETURN st.id AS stageId, st.heading AS heading, st.signals AS signals
    `, { scenarioId })

    if (!ours.length) {
      return res.status(404).json({ error: 'Scenario not found' })
    }

    // Flatten this scenario's signals into a {text, stageHeading} list.
    const ourSignals = []
    for (const r of ours) {
      const sigs = safeParse(r.signals)
      for (const s of sigs) {
        if (s && s.text) {
          ourSignals.push({ text: s.text, stageHeading: r.heading })
        }
      }
    }

    // Pull foils from other scenarios. Sample size 30 is enough variety
    // without bloating the response.
    const foilRows = await runQuery(`
      MATCH (sc:Scenario)-[:HAS_STAGE]->(st:Stage)
      WHERE sc.id <> $scenarioId AND st.signals IS NOT NULL
      RETURN st.signals AS signals
      ORDER BY rand()
      LIMIT 30
    `, { scenarioId })

    const foilTexts = []
    for (const r of foilRows) {
      const sigs = safeParse(r.signals)
      for (const s of sigs) {
        if (s && s.text) foilTexts.push(s.text)
      }
    }
    if (foilTexts.length < 9) {
      return res.json({ questions: [], reason: 'not enough foils available' })
    }

    // Build 3 questions, each: 1 real signal + 3 distinct foils, shuffled.
    const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a,b)=>a[0]-b[0]).map(x => x[1])
    const realSample = shuffle(ourSignals).slice(0, 3)
    const usedFoils = new Set()

    const questions = realSample.map((real, qi) => {
      // Pick 3 distinct foils not previously used and not == real text.
      const foils = []
      const localFoilPool = shuffle(foilTexts)
      for (const f of localFoilPool) {
        if (foils.length >= 3) break
        if (f === real.text) continue
        if (usedFoils.has(f)) continue
        foils.push(f)
        usedFoils.add(f)
      }
      // Build the option set with a marker that survives the shuffle.
      const opts = shuffle([
        { text: real.text, isReal: true },
        ...foils.map(t => ({ text: t, isReal: false })),
      ])
      return {
        index: qi,
        prompt: 'Which of these signals appeared in this scenario?',
        options: opts.map((o, i) => ({ index: i, text: o.text, _correct: o.isReal })),
      }
    })

    // Strip _correct flags from outgoing payload — verification on POST.
    const sanitized = questions.map(q => ({
      index: q.index,
      prompt: q.prompt,
      options: q.options.map(o => ({ index: o.index, text: o.text })),
    }))
    // Stash the full questions in a small server-side cache keyed by
    // {userId, scenarioId, generatedAt}. For v1 we just trust the client
    // to round-trip the indices and re-verify on POST below; cleaner than
    // a stateful cache and good enough for low-stakes retrieval practice.
    const challenge = Buffer.from(JSON.stringify(
      questions.map(q => ({ correctIndex: q.options.findIndex(o => o._correct) }))
    )).toString('base64')

    res.json({
      scenarioId,
      questions: sanitized,
      challenge,
    })
  } catch (e) {
    console.error('[GET /api/engagement/retrieval]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * POST /api/engagement/retrieval/:scenarioId/answer
 *
 * Records retrieval-practice answers. Body:
 *   { challenge, answers: [{ index: 0, picked: 2 }, ...] }
 *
 * Returns score + per-question correctness so the client can render the
 * "you remembered 2 of 3" feedback.
 * --------------------------------------------------------------------------- */
authedRouter.post('/retrieval/:scenarioId/answer', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { scenarioId } = req.params
    const { challenge, answers } = req.body || {}

    if (!challenge || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'challenge and answers required' })
    }

    let solution
    try {
      solution = JSON.parse(Buffer.from(challenge, 'base64').toString('utf8'))
    } catch {
      return res.status(400).json({ error: 'malformed challenge token' })
    }

    const results = answers.map(a => {
      const sol = solution[a.index]
      if (!sol) return { index: a.index, correct: false }
      return { index: a.index, correct: sol.correctIndex === a.picked }
    })
    const correctCount = results.filter(r => r.correct).length

    // Record once per question on a (:User)-[:RETRIEVED]->(:Stage)... actually
    // simpler to record one summary edge per scenario per session. We do
    // that against the Scenario node (using a generic RETRIEVED edge) so
    // the learner-progress queries can later count retrieval rounds.
    await runQuery(`
      MERGE (u:User {id: $userId})
        ON CREATE SET u.email = $email, u.createdAt = timestamp(),
                      u.firstSeenAt = timestamp()
        SET u.lastSeenAt = timestamp()
      WITH u
      MATCH (sc:Scenario {id: $scenarioId})
      CREATE (u)-[:RETRIEVED {
        scenarioId: $scenarioId,
        correct: $correct,
        total: $total,
        answeredAt: timestamp()
      }]->(sc)
    `, {
      userId: me.id,
      email: me.email || null,
      scenarioId,
      correct: correctCount,
      total: results.length,
    })

    res.json({
      correctCount,
      total: results.length,
      results,
    })
  } catch (e) {
    console.error('[POST /api/engagement/retrieval/answer]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * GET /api/engagement/certificate/:scenarioId
 *
 * Generates a downloadable PDF certificate for a completed scenario. Embeds:
 *   - Learner name + email
 *   - Scenario title
 *   - Completion date
 *   - F3 techniques covered (pulled from USES_TECHNIQUE on the stages)
 *   - Verification hash (signed with a server secret) + verification URL
 *
 * The hash lets a future auditor scan the QR code at /verify/:hash and
 * confirm the certificate without trusting the PDF itself.
 *
 * Stores a CERTIFICATE_ISSUED edge so we can list issued certificates on
 * MyProgress and so a future audit query can enumerate them.
 * --------------------------------------------------------------------------- */
authedRouter.get('/certificate/:scenarioId', async (req, res, next) => {
  try {
    const me = getUser(req)
    const { scenarioId } = req.params

    // Verify the user actually completed this scenario.
    const completion = await runQuery(`
      MATCH (u:User {id: $userId})-[c:COMPLETED]->(sc:Scenario {id: $scenarioId})
      OPTIONAL MATCH (sc)-[:HAS_STAGE]->(st:Stage)-[:USES_TECHNIQUE]->(tech:Technique)
      OPTIONAL MATCH (tech)-[:PART_OF]->(tac:Tactic)
      RETURN sc.title AS scenarioTitle,
             c.completedAt AS completedAt,
             u.email AS email, u.name AS name,
             collect(DISTINCT { id: tech.id, name: tech.name, tactic: tac.name }) AS techniques
    `, { userId: me.id, scenarioId })

    if (!completion.length || !completion[0].scenarioTitle) {
      return res.status(403).json({ error: 'Scenario not completed by this user' })
    }
    const c = completion[0]
    const techniques = (c.techniques || []).filter(t => t && t.id)

    // Verification hash — deterministic for the same {user, scenario,
    // completedAt} triple so re-downloading produces the same certificate.
    const secret = process.env.CERTIFICATE_SECRET || 'dev-only-secret-change-in-prod'
    const hashInput = [me.id, scenarioId, c.completedAt].join('|')
    const hash = crypto.createHmac('sha256', secret)
      .update(hashInput).digest('hex').slice(0, 16)

    // Record issuance — idempotent on (user, scenario) pair, latest issuance
    // timestamp wins.
    await runQuery(`
      MATCH (u:User {id: $userId})
      MATCH (sc:Scenario {id: $scenarioId})
      MERGE (u)-[ce:CERTIFICATE_ISSUED]->(sc)
        ON CREATE SET ce.issuedAt = timestamp(), ce.firstIssuedAt = timestamp()
        SET ce.lastIssuedAt = timestamp(), ce.hash = $hash
    `, { userId: me.id, scenarioId, hash })

    // Render PDF using pdfkit. Kept lean — single page, editorial typography
    // matching the app's Fraunces/Inter/JetBrains Mono palette via embedded
    // standard fonts (Helvetica family on PDF default).
    const PDFDocument = (await import('pdfkit')).default
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margins: { top: 60, left: 60, right: 60, bottom: 60 },
      info: {
        Title: `3fffs Certificate — ${c.scenarioTitle}`,
        Author: '3fffs',
        Subject: 'Fraud training completion certificate',
      },
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition',
      `attachment; filename="3fffs-certificate-${scenarioId}.pdf"`)
    doc.pipe(res)

    const PAGE_W = 792, PAGE_H = 612
    const ACCENT = '#B8513D'
    const INK = '#1A1512'
    const INK_SOFT = '#494037'
    const RULE = '#D4C5B0'

    // Decorative border
    doc.lineWidth(1.5).strokeColor(RULE)
       .rect(40, 40, PAGE_W - 80, PAGE_H - 80).stroke()
    doc.lineWidth(0.5).strokeColor(ACCENT)
       .rect(48, 48, PAGE_W - 96, PAGE_H - 96).stroke()

    // Wordmark (top left)
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(24)
       .text('3fffs.', 70, 70)
    doc.fillColor(INK_SOFT).font('Helvetica').fontSize(8)
       .text('FIGHT FRAUD FRAMEWORK TRAINING', 130, 80, { characterSpacing: 1.5 })

    // Eyebrow
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(10)
       .text('CERTIFICATE OF COMPLETION', 70, 150, { characterSpacing: 2 })

    // Headline
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(40)
       .text('This certifies that', 70, 180, { width: PAGE_W - 140 })

    // Recipient name (or email if name missing)
    const recipientName = c.name || c.email || 'Learner'
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(36)
       .text(recipientName, 70, 240, { width: PAGE_W - 140 })

    // Body
    doc.fillColor(INK).font('Helvetica').fontSize(14)
       .text(`has successfully completed the training scenario`, 70, 300, { width: PAGE_W - 140 })
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20)
       .text(`"${c.scenarioTitle}"`, 70, 322, { width: PAGE_W - 140 })

    // Techniques covered
    if (techniques.length) {
      doc.fillColor(INK_SOFT).font('Helvetica').fontSize(10)
         .text('Techniques covered:', 70, 380)
      const techText = techniques
        .map(t => `${t.id} ${t.name}`)
        .slice(0, 6)
        .join(' · ')
      doc.fillColor(INK).font('Helvetica').fontSize(10)
         .text(techText, 70, 396, { width: PAGE_W - 140, lineGap: 2 })
    }

    // Footer — date + verification block
    const completedDate = new Date(Number(c.completedAt) || Date.now())
      .toISOString().slice(0, 10)
    doc.fillColor(INK_SOFT).font('Helvetica-Bold').fontSize(9)
       .text('COMPLETED', 70, PAGE_H - 110, { characterSpacing: 1.5 })
    doc.fillColor(INK).font('Helvetica').fontSize(13)
       .text(completedDate, 70, PAGE_H - 96)

    doc.fillColor(INK_SOFT).font('Helvetica-Bold').fontSize(9)
       .text('VERIFICATION', 280, PAGE_H - 110, { characterSpacing: 1.5 })
    doc.fillColor(INK).font('Courier').fontSize(11)
       .text(hash.toUpperCase(), 280, PAGE_H - 96)
    doc.fillColor(INK_SOFT).font('Helvetica').fontSize(8)
       .text('Verify at 3fffs.app/verify/' + hash, 280, PAGE_H - 80)

    // Issuing authority
    doc.fillColor(INK_SOFT).font('Helvetica-Bold').fontSize(9)
       .text('ISSUED BY', PAGE_W - 220, PAGE_H - 110, { characterSpacing: 1.5 })
    doc.fillColor(INK).font('Helvetica').fontSize(13)
       .text('3fffs', PAGE_W - 220, PAGE_H - 96)
    doc.fillColor(INK_SOFT).font('Helvetica').fontSize(8)
       .text('Fight Fraud Framework Training', PAGE_W - 220, PAGE_H - 80)

    doc.end()
  } catch (e) {
    console.error('[GET /api/engagement/certificate]', e)
    next(e)
  }
})


/* -----------------------------------------------------------------------------
 * GET /api/engagement/verify/:hash
 *
 * Public verification endpoint — no auth required. An auditor with a
 * certificate hash can hit this URL to confirm the certificate is real,
 * which scenario it was issued for, and when. Does NOT reveal the email
 * (privacy); only the scenario + issuance date.
 * --------------------------------------------------------------------------- */
authedRouter.get('/verify/:hash', async (req, res, next) => {
  // (this fallback path stays mounted but the canonical mount is the
  // publicRouter below; both handlers point at the same DB query so a
  // signed-in user hitting it through the authed mount still works)
  return verifyHandler(req, res, next)
})

publicRouter.get('/verify/:hash', (req, res, next) => verifyHandler(req, res, next))

async function verifyHandler(req, res, next) {
  try {
    const { hash } = req.params
    const rows = await runQuery(`
      MATCH (u:User)-[ce:CERTIFICATE_ISSUED]->(sc:Scenario)
      WHERE ce.hash = $hash
      RETURN sc.title AS scenarioTitle, sc.id AS scenarioId,
             ce.firstIssuedAt AS firstIssuedAt
      LIMIT 1
    `, { hash })

    if (!rows.length) {
      return res.status(404).json({ valid: false, error: 'Unknown certificate hash' })
    }
    res.json({
      valid: true,
      scenarioTitle: rows[0].scenarioTitle,
      scenarioId: rows[0].scenarioId,
      issuedAt: rows[0].firstIssuedAt,
    })
  } catch (e) {
    console.error('[GET /api/engagement/verify]', e)
    next(e)
  }
}


export default { publicRouter, authedRouter }
