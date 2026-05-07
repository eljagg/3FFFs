# ELEVENLABS-PIVOT.md — deferred audio quality upgrade

**Status:** DEFERRED. Pick up when ElevenLabs subscription is feasible.

**Why deferred:** Five iterations of v25.7.0.15.x demonstrated that
browser-native speechSynthesis (Web Speech API) is insufficient for
the realism objective. Symptoms persisted across architectural fixes:
choppy speech, voice/visual sync drift, robotic delivery. The
underlying cause is the quality ceiling of bundled OS voices in
Chrome and Edge — not a fixable bug.

**Why this is the right pivot:**
1. ElevenLabs produces near-human voice quality at modern subscription
   tiers (~$22/month at the Creator tier as of 2026).
2. Pre-generated MP3 files have **known durations**. Engine can sync
   stage advance to file end. No more drift between voice rate and
   visual timing — the core sync issue can't manifest with files.
3. Caribbean accents are available on ElevenLabs voice library
   (Kingston/JM, Bahamian, Trinidadian) — finally addresses the
   accent gap that's existed since v25.7.0.15.
4. The 3FFFs animation engine architecture **already supports
   pre-generated audio**. Migration is content + thin engine extension,
   not a refactor.

---

## Architecture (already in place)

Scene metadata supports two audio shapes:

```js
// Browser TTS (current — muted by default v25.7.0.15.5+)
audio: { text: 'spoken line', profile: 'authority' }

// Pre-generated audio (target — when pivoting)
audio: { src: '/audio/vishing/stage-2-officer-reid.mp3', durationMs: 5800 }

// Both (graceful fallback)
audio: {
  src: '/audio/vishing/stage-2-officer-reid.mp3',
  durationMs: 5800,
  text: 'fallback TTS line',
  profile: 'authority'
}
```

The engine logic to support `src` is small: in
`audioNarration.js#speakMessage`, if `audio.src` is provided, create
an `Audio(src)` element and play it. Fall back to TTS only if `src`
load fails or is absent.

**The hard part is content production, not code.**

---

## Content inventory (what needs generating)

Total lines requiring audio across deployed animations as of v25.7.0.15.5:

| Animation | Lines | Voices needed |
|---|---|---|
| Vishing (F1088) | 16 | authority (Officer Reid), system (JNCB SMS), investigator (callback agent), victim-male (Devon) |
| SIM Card Swap (T1451) | 7 | fraudster, system (Scotia OTP), victim-female (Tanya), investigator (Digicel + Scotia agents) |
| Phishing (F1081) | 4 | system (NCB SMS), victim-female (Beverly), investigator (NCB rep) |
| IVR Discovery (F1073) | 4 | system (JNCB IVR voice) |
| OSINT (F1067) | 7 | narrator |
| **Total** | **38 lines** | **6 voice profiles** |

Each line is short (5-30 words). Total spoken duration ≈ 6 minutes
across all 38 lines. ElevenLabs API generation for 6 minutes of
audio at the Creator tier ≈ a small fraction of monthly quota.

---

## Step-by-step pivot plan (when picking up)

### Phase 1 — voice selection (15 minutes)
1. Sign in to ElevenLabs. Browse voice library.
2. Filter by: English, Caribbean accent, male/female matching the
   character's gender.
3. Audition candidates against one short sample line each.
4. Lock 6 voices, one per profile:
   - `authority` — male, calm, projected (Officer Reid)
   - `fraudster` — male, casual, conversational
   - `victim-male` — male, slightly anxious (Devon)
   - `victim-female` — female, anxious (Beverly, Tanya)
   - `system` — flat, automated-sounding (IVR + SMS read-back)
   - `narrator` — neutral observer (OSINT)
   - `investigator` — female-skewed professional (callback agents)
5. Save voice IDs to `voices.json` config.

### Phase 2 — content extraction (30 minutes)
Write a small Node script that reads scene files, extracts every
`audio: { text, profile }` block, and produces a manifest:

```json
[
  {
    "id": "vishing-stage-2-m2-2",
    "text": "Mister Henry. Officer Reid, Financial Investigations Division. Urgent activity on your JNCB account.",
    "profile": "authority",
    "outputPath": "client/public/audio/vishing/stage-2-officer-reid.mp3"
  },
  ...
]
```

### Phase 3 — batch generation (30 minutes API time + manual review)
Script calls ElevenLabs `/v1/text-to-speech/{voice_id}` for every
manifest entry. Saves MP3s. Tag each with metadata (source line,
profile, version). Manual quality review pass — flag any line that
needs re-take with adjusted prompt or stability/similarity settings.

### Phase 4 — engine extension (30 minutes)
Update `audioNarration.js#speakMessage` to play `audio.src` when
present:

```js
if (audio.src) {
  const el = new Audio(audio.src)
  el.playbackRate = speedMultiplier
  if (opts.onStart) el.onplay = opts.onStart
  if (opts.onEnd) el.onended = opts.onEnd
  el.play().catch(() => { /* fall back to TTS if file fails */ })
  return
}
// existing TTS path below...
```

### Phase 5 — scene metadata update (60 minutes)
Replace `audio: { text, profile }` with `audio: { src, durationMs }`
across all 38 lines. Use the manifest from Phase 2 as the source of
truth.

### Phase 6 — duration-driven stage timing (60 minutes)
For each stage with audio, compare `stage.durationMs` to the **actual
audio file duration** (read via `<audio>` element on load). Adjust
stage durations so visual finish ≈ audio finish ± 200ms. This
permanently fixes the sync drift problem because file durations are
fixed and known, unlike browser TTS.

### Phase 7 — flip mute default back to OFF (5 minutes)
With reliable audio quality, default unmuted is correct again.

**Total estimated effort: 3-4 hours of focused work.**

---

## Cost analysis

ElevenLabs pricing as of 2026 (verify when picking up):

- Free tier: 10,000 chars/month — insufficient (38 lines × ~100 chars avg = 3800 chars one-time, but no API access for batch generation)
- Starter: ~$5/month, 30,000 chars — borderline
- **Creator: ~$22/month, 100,000 chars + commercial license — recommended**
- Pro: ~$99/month — overkill for current scope

Recommended: subscribe to Creator for the month of pivot work. After
generation is complete and files are in repo, you can downgrade to
free or cancel — generated MP3s are yours under the commercial
license terms.

**One-time cost ≈ $22 + 3-4 hours of my time. Permanent fix.**

---

## What NOT to do when picking this up

- **Do not regenerate audio every release.** Files are static assets.
  Generate once, commit to repo (or to S3 if size becomes an issue),
  reference by URL forever after.
- **Do not skip voice locking.** Using whatever voice ElevenLabs
  defaults to on a given day produces inconsistent character
  voices across sessions.
- **Do not delete the TTS path.** Keep TTS as fallback when files
  fail to load (network errors, missing files, etc.). Defense in
  depth.
- **Do not regenerate to "improve" voices later.** Once trainees
  recognize Officer Reid's voice as "the vishing voice," changing
  it weakens the recognition pedagogy. Lock the voices for the life
  of the deployment.

---

## Open questions to resolve when picking up

1. **Caribbean accent availability:** does ElevenLabs Voice Library
   in the Creator tier include Jamaican/Bahamian/Trinidadian English?
   If not, are voices in the Voice Lab generation tier? Or do we
   accept "neutral British/American English-accented" as the
   v1 quality bar and revisit Caribbean voicing later?

2. **MP3 vs OGG:** Browser support is universal for both. MP3 is
   slightly larger, OGG is slightly smaller. Default to MP3 for
   widest compatibility (some Safari-on-iOS edge cases with OGG).

3. **Asset location:** repo-tracked files in `client/public/audio/`
   or S3-hosted? Repo-tracked is simpler; total size ~3MB across
   38 files is manageable. Recommend repo-tracked for v1.

4. **Versioning:** when a line is rewritten in a scene, the audio
   file must be regenerated. Consider a `npm run audio:check`
   script that diffs scene `text` against manifest and flags
   stale audio files.

---

## State at deferral

- v25.7.0.15.5 ships with audio MUTED BY DEFAULT
- Tooltip on the mute button explains: "browser TTS quality is limited"
- All 38 audio lines remain in scene metadata as `audio: { text, profile }`
  — they're ready for ElevenLabs migration without scene-author rework
- All architectural fixes from v25.7.0.15.1 through v25.7.0.15.4 are
  preserved (sequential queue, Chrome keep-alive, race fix). Audio
  works correctly when toggled on; it just sounds robotic.

When you're ready to pivot, this document is the spec. Open it,
follow Phase 1-7 in order, and audio quality is solved permanently.
