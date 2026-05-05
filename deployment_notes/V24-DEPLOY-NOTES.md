# v24 Deployment Notes

**Feature:** Scenario interactivity overhaul, part 1 of 3 — confidence rating,
inline tutor, what-if preview, and live stage map hover.

This is the first of three planned interactivity releases:
- **v24 (this release):** engine changes — pure code, no content authoring.
- **v25 (next):** signal triage as a pre-decision step + progressive narrative reveal.
- **v26 (after):** "victim's view" perspective toggle with parallel narratives.

## What's in this zip

```
client/
  src/
    components/
      scenario/
        ConfidenceSlider.jsx   ← NEW   1-5 confidence + post-decision feedback
        InlineTutor.jsx        ← NEW   Slide-over Claude with stage context
        WhatIfPreview.jsx      ← NEW   Consequence preview after correct answer
    lib/
      api.js                   ← UPDATED — tutorChat passes stageContext
    pages/
      Scenario.jsx             ← UPDATED — wires all four new behaviors

server/
  src/
    routes/
      tutor.js                 ← UPDATED — accepts stageContext, builds richer system prompt
```

No new server endpoints, no new env vars, no schema migration. The graph
records the existing `ATTEMPTED_STAGE` edge on submit; confidence is sent in
the request body and the existing `submitStage` handler ignores extra fields
(non-breaking). If you want confidence persisted to the graph in a future
release, we'll add a property to the edge — for now, calibration is a
client-side metric inside the active scenario session.

## Deploy steps

```bash
cd /workspaces/3FFFs
unzip -o 3fffs-v24.zip
rm 3fffs-v24.zip
git add -A
git status            # ← confirm no zip file, no stray files
git commit -m "v24: scenario interactivity overhaul, part 1 (confidence + inline tutor + what-if + stage map)"
git push origin main
```

Railway auto-deploys client + server. No env vars to add. No migration.

## What to test after deploy

1. **Sign in, open any scenario** (e.g. SC004 Lottery Scam).
2. **Stage 1**: confirm the new confidence slider appears between the question
   and the answer options. Try clicking an option without picking confidence —
   the option buttons should look dimmed and not respond. Pick a confidence
   level, then answer. Expect:
   - Confidence locks (you can't change it post-answer)
   - A calibration feedback box appears under the rationales
3. **If you answered correctly** and one of the wrong options had a `leadsTo`,
   the "What if you had chosen differently?" panel should appear below.
   Expand it; the consequence stage's narrative + signals should display inline.
4. **Click "Ask the Tutor"** in the bottom-right of the stage panel. A slide-
   over from the right opens. The header should show the current stage heading.
   Click one of the three suggested starter questions. Claude should respond
   referring to the specific scenario you're in (not a generic answer).
5. **Hover any of the numbered circles** in the timeline at the top. A dark
   tooltip should fade in below showing the stage tactic + heading.
6. **Complete the scenario.** The completion panel should now also show a
   calibration score (out of 100) for the run.

## Rollback

If something breaks, revert the merge commit and Railway redeploys the
previous build. None of the new components touch the graph schema.

## Why this set of changes was chosen

These four items share two properties:
- **Pure client logic** (plus one small server prompt addition) — no DB
  migration, no new endpoints, no auth changes. Lowest possible deployment risk.
- **Multiplies value of existing content** — confidence and what-if both
  use scenario data already in the seed; inline tutor reuses the existing
  /api/tutor endpoint with richer context.

Items deferred to v25/v26 (signal triage, progressive narrative, victim's view)
each require either content authoring or a small schema add and are best
shipped after v24 has been validated in production.
