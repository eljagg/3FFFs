/**
 * routes/storyboard.js — v25.7.0.5
 *
 * Endpoints for the F3 Framework scenario storyboard view (Design C).
 *
 *   GET /api/storyboard/scenarios
 *        Lightweight scenario picker data — id, name, hasBeats flag,
 *        plannedRelease (for stubs). Used to render the picker tabs.
 *
 *   GET /api/storyboard/scenarios/:scenarioId
 *        Full scenario data: storyboard summary metadata + ordered beats
 *        (including phase markers). Used to render the timeline and
 *        summary card when the user picks a scenario.
 *
 * Both endpoints are PUBLIC (no auth) — same access pattern as
 * /api/framework, /api/visualizations, /api/mitre. The storyboard is
 * reference content, not user-specific.
 *
 * Stub scenarios (SC008, SC011, SC013 as of v25.7.0.5) appear in the
 * scenario list with hasBeats=false so the picker can render them as
 * disabled tabs with their planned-release tag.
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'

const router = Router()

// Stubs — scenarios present in the picker but not yet authored.
// Mirrors STORYBOARD_STUBS in seed/data/scenario-beats.js. Hardcoded
// here to avoid requiring a graph round-trip just to render disabled
// tabs. When a stub graduates to authored, remove its entry here.
const STUBS = [
  { id: 'SC008', name: 'ATM Skimming',  plannedRelease: 'v25.7.0.6' },
  { id: 'SC011', name: 'Romance Scam',  plannedRelease: 'v25.7.0.7' },
  { id: 'SC013', name: 'Wire Fraud',    plannedRelease: 'v25.7.0.8' },
]

function safeParse(json, fallback) {
  if (!json) return fallback
  try { return JSON.parse(json) } catch { return fallback }
}

// ─────────────────────────────────────────────────────────────────────────
// GET /api/storyboard/scenarios — picker data
// ─────────────────────────────────────────────────────────────────────────
router.get('/scenarios', async (_req, res, next) => {
  try {
    // Authored scenarios — those that have at least one HAS_BEAT edge
    const rows = await runQuery(`
      MATCH (s:Scenario)-[:HAS_BEAT]->()
      WITH DISTINCT s
      RETURN s.id AS id,
             coalesce(s.storyboardHeadline, s.title) AS name,
             coalesce(s.severity, 'medium') AS severity
      ORDER BY s.id
    `)

    const authored = rows.map(r => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      hasBeats: true,
    }))

    // Stubs are in addition to authored — but suppress any stub whose
    // ID has been authored (graceful when an SC graduates without
    // updating the STUBS const above)
    const authoredIds = new Set(authored.map(s => s.id))
    const stubs = STUBS
      .filter(s => !authoredIds.has(s.id))
      .map(s => ({ ...s, hasBeats: false }))

    res.json({ scenarios: [...authored, ...stubs] })
  } catch (e) { next(e) }
})

// ─────────────────────────────────────────────────────────────────────────
// GET /api/storyboard/scenarios/:scenarioId — full scenario data
// ─────────────────────────────────────────────────────────────────────────
router.get('/scenarios/:scenarioId', async (req, res, next) => {
  try {
    const { scenarioId } = req.params

    // Defensive: scenarioId format check (SC + 3-digit). Prevents a hostile
    // path segment like "SC007 OR 1=1" from running through the MATCH.
    if (!/^SC\d{3}$/i.test(scenarioId)) {
      return res.status(400).json({ error: 'Invalid scenario id format' })
    }

    // Fetch scenario summary + beats in a single query
    // The OPTIONAL MATCH with separate node labels (Beat | BeatPhase) is
    // why the storyboard fetches both via a UNION-style pattern: each
    // entry has the relationship's `order` so we can sort by it client-side.
    const summary = await runQuery(
      `MATCH (s:Scenario { id: $id })
       RETURN s.id              AS id,
              coalesce(s.storyboardHeadline, s.title) AS headline,
              s.storyboardSubtitle  AS subtitle,
              s.storyboardMetaJson  AS metaJson,
              s.storyboardStatsJson AS statsJson,
              s.severity            AS severity`,
      { id: scenarioId.toUpperCase() }
    )

    if (summary.length === 0) {
      return res.status(404).json({ error: `Scenario ${scenarioId} not found` })
    }

    const s = summary[0]

    // Beats — full content
    const beats = await runQuery(
      `MATCH (s:Scenario { id: $id })-[r:HAS_BEAT]->(b:Beat)
       RETURN r.order          AS order,
              b.id              AS id,
              b.day             AS day,
              b.actor           AS actor,
              b.kind            AS kind,
              b.techId          AS techId,
              b.techName        AS techName,
              b.techSeverity    AS techSeverity,
              b.techDescription AS techDescription,
              b.headline        AS headline,
              b.narrative       AS narrative,
              b.whatNow         AS whatNow
       ORDER BY r.order`,
      { id: scenarioId.toUpperCase() }
    )

    // Phase markers
    const phases = await runQuery(
      `MATCH (s:Scenario { id: $id })-[r:HAS_BEAT]->(p:BeatPhase)
       RETURN r.order AS order,
              p.id    AS id,
              p.label AS phase
       ORDER BY r.order`,
      { id: scenarioId.toUpperCase() }
    )

    // Merge beats + phases by order, then sort. Both have the same
    // `order` property on the relationship; we tag each entry with a
    // discriminator so the client can render beats vs phase markers
    // distinctly.
    const merged = [
      ...beats.map(b => ({ ...b, _kind: 'beat' })),
      ...phases.map(p => ({ ...p, _kind: 'phase' })),
    ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    // Reshape into the format the client component expects: entries
    // with either { phase, id } for separators or full beat fields.
    const entries = merged.map(m => {
      if (m._kind === 'phase') {
        return { id: m.id, phase: m.phase }
      }
      return {
        id:              m.id,
        day:             m.day,
        actor:           m.actor,
        kind:            m.kind,
        techId:          m.techId || undefined,
        techName:        m.techName || undefined,
        techSeverity:    m.techSeverity || undefined,
        techDescription: m.techDescription || undefined,
        headline:        m.headline,
        narrative:       m.narrative,
        whatNow:         m.whatNow || undefined,
      }
    })

    res.json({
      scenario: {
        id:       s.id,
        headline: s.headline,
        subtitle: s.subtitle,
        meta:     safeParse(s.metaJson, {}),
        stats:    safeParse(s.statsJson, []),
        severity: s.severity,
      },
      entries,
    })
  } catch (e) { next(e) }
})

export default router
