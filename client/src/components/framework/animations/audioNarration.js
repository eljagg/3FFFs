/**
 * audioNarration.js — v25.7.0.15.4
 *
 * VERSION CHECK: After deploy, open browser console and look for
 * "[3FFFs audio v25.7.0.15.4 — Chrome keep-alive]" log on first
 * animation play. If you see "v25.7.0.15.3" or earlier, the new
 * code did not deploy.
 *
 *
 * Browser-native speech synthesis for animation dialogue. Adds
 * fraudster-voice / victim-voice / system-voice realism to the
 * stage-by-stage narration that drives the engines.
 *
 * Pedagogical rationale (locked v25.7.0.15):
 *   Tellers and customer-service staff at Caribbean banks hear actual
 *   fraudsters' voices when customers report incidents. They need to
 *   recognize the voice pattern (cadence, scripted authority language,
 *   specific phrases) as the fraud signature. Reading "Officer Reid
 *   says 'don't hang up — the bank may be compromised'" is one thing.
 *   Hearing it spoken in a confident calm authority-projecting voice
 *   is another. The training principle: don't shelter trainees from
 *   the actual sound of the fraud.
 *
 * Approach:
 *   - Uses the Web Speech API (window.speechSynthesis), which is built
 *     into every modern browser. Zero cost, zero external dependency,
 *     zero deployment complexity.
 *   - Each scene message can declare an `audio` field: { text, profile }
 *     where profile is one of: 'authority' | 'fraudster' | 'victim' |
 *     'system' | 'investigator'. The profile maps to pitch/rate values
 *     that distinguish the voices to the trainee's ear.
 *   - Engines call useNarration(...) which returns a stable interface
 *     (start/stop/setMuted). The hook handles voice selection (prefers
 *     English voices), browser quirks (Chrome's voice list arrives
 *     async), and cleanup on unmount.
 *
 * Future:
 *   - When pre-generated audio files are available (ElevenLabs, etc.),
 *     a message's audio field can include `src: '/audio/m6-2.mp3'`
 *     instead of (or in addition to) `text`. The hook plays the file
 *     via standard <audio> element when src is present, falls back to
 *     speechSynthesis when only text is present. Same toggleable mute
 *     control governs both. See README at end for migration path.
 */

import { useEffect, useMemo, useRef } from 'react'


/* ─── Voice profile config ─────────────────────────────────────── */
// Web Speech API exposes pitch (0-2, default 1) and rate (0.1-10, default 1).
// Voice selection is restricted to whatever the browser provides.
// We map profiles to pitch/rate combinations that are distinguishable.
const VOICE_PROFILES = {
  // Fraudster impersonating an official (Officer Reid, FID, NCB security).
  // Calm, slightly lower pitch, slightly slower than normal — projects authority.
  authority: { pitch: 0.9, rate: 0.92, voiceHint: 'male' },

  // Fraudster speaking as themselves (kit operator, internal recruitment).
  // Neutral, slightly faster — businesslike.
  fraudster: { pitch: 1.0, rate: 1.0, voiceHint: 'male' },

  // Customer characters (Beverly, Devon, Tanya). Normal pitch, normal rate.
  // Voice gender hint matches character — Beverly and Tanya female-voiced;
  // Devon male-voiced. Engine resolves at message render time.
  victim: { pitch: 1.05, rate: 0.98, voiceHint: 'female' },
  victimMale: { pitch: 0.95, rate: 0.98, voiceHint: 'male' },

  // Automated bank/telco systems (OTP SMS read aloud, IVR menu prompts).
  // Monotone, slightly faster, robotic feel.
  system: { pitch: 1.1, rate: 1.05, voiceHint: 'female' },

  // Investigators in callback dialogue (real bank fraud-ops, real telco
  // service agents). Professional, neutral.
  investigator: { pitch: 1.0, rate: 0.98, voiceHint: 'female' },

  // Generic narrator fallback if a message uses 'narrator' profile.
  narrator: { pitch: 1.0, rate: 0.95, voiceHint: 'any' },
}


/* ─── Voice selection ─────────────────────────────────────────── */
// Browser voice lists arrive asynchronously in some browsers (notably
// Chrome). This helper returns voices, waiting for them if needed.
function getVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length > 0) {
      resolve(voices)
      return
    }
    // Chrome populates the list async; subscribe to voiceschanged event.
    const handler = () => {
      const v = window.speechSynthesis.getVoices()
      if (v && v.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        resolve(v)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // Defensive timeout — if voices never arrive (rare), resolve with empty
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      resolve(window.speechSynthesis.getVoices() || [])
    }, 1500)
  })
}

// Pick the best voice for a given profile, given the browser's voice list.
// Prefers English voices ('en-US', 'en-GB'). Caribbean accents not natively
// available in Web Speech API on any browser as of v25.7.0.15 — closest
// are American English and British English. If gender-marked voices are
// available we use the voiceHint; otherwise any English voice will do.
function pickVoice(voices, profile) {
  if (!voices || voices.length === 0) return null
  const config = VOICE_PROFILES[profile] || VOICE_PROFILES.narrator

  // Tiers of preference, in order:
  // 1. English voice with the requested gender hint in its name
  // 2. Any English voice
  // 3. The default (system-picked)
  const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'))
  const candidates = englishVoices.length > 0 ? englishVoices : voices

  if (config.voiceHint && config.voiceHint !== 'any') {
    // Heuristic: voice names sometimes signal gender. e.g. "Microsoft Zira" (female),
    // "Microsoft David" (male), "Google US English Female", etc. Crude but works.
    const hintMatch = candidates.find(v => {
      const name = (v.name || '').toLowerCase()
      if (config.voiceHint === 'male') {
        return /\b(male|david|mark|alex|daniel|fred|tom|james|matthew)\b/.test(name)
      }
      if (config.voiceHint === 'female') {
        return /\b(female|zira|samantha|kate|moira|tessa|victoria|allison|susan|karen|joanna)\b/.test(name)
      }
      return false
    })
    if (hintMatch) return hintMatch
  }

  return candidates[0] || null
}


/* ─── Public hook ─────────────────────────────────────────────── */
/**
 * useNarration — speech-synthesis controller for animation engines.
 *
 * Returns a stable interface:
 *   speakMessage(audio, opts) — starts speaking. `audio` is the message's
 *     audio metadata { text, profile, src? }. opts.rate scales the rate
 *     (used for playback-speed multipliers).
 *   stopAll() — cancels any in-progress speech. Called on stage change,
 *     pause, restart, unmount.
 *   isSupported — boolean. False on browsers without speechSynthesis.
 *
 * Mute is handled OUTSIDE this hook by the parent engine — the engine
 * decides whether to call speakMessage at all. Keeps the mute logic
 * close to the toggle UI.
 */
export const AUDIO_NARRATION_VERSION = 'v25.7.0.15.4'

export function useNarration() {
  const voicesRef = useRef([])
  const currentUtteranceRef = useRef(null)
  const loggedRef = useRef(false)
  const isSupported = typeof window !== 'undefined' &&
                      typeof window.speechSynthesis !== 'undefined'

  // Load voices once on mount + log version once for deploy verification
  useEffect(() => {
    if (!isSupported) return
    if (!loggedRef.current) {
      loggedRef.current = true
      // eslint-disable-next-line no-console
      console.log('[3FFFs audio ' + AUDIO_NARRATION_VERSION + ' — Chrome keep-alive]')
    }
    let cancelled = false
    getVoices().then(voices => {
      if (!cancelled) voicesRef.current = voices
    })
    return () => {
      cancelled = true
      // Defensive: cancel any utterance if the consumer unmounts.
      try { window.speechSynthesis.cancel() } catch (e) { /* noop */ }
    }
  }, [isSupported])

  /* ─── Chrome speechSynthesis keep-alive — v25.7.0.15.4 ──────────────
     Chromium browsers (Chrome, Edge, Brave, Opera) have a documented
     bug where speechSynthesis pauses itself between utterances or
     after ~14 seconds of continuous speech, producing audible gaps
     and jitter. The standard fix is a low-frequency pause/resume
     ping that keeps the queue alive without affecting playback.

     References:
     - https://bugs.chromium.org/p/chromium/issues/detail?id=679043
     - https://bugs.chromium.org/p/chromium/issues/detail?id=372224

     This affects IVR Discovery audio more than OSINT because IVR
     stages have longer utterances (10-14 words) that hit the bug
     window; OSINT utterances (6-10 words) finish before the bug
     manifests. After v25.7.0.15.3 deployed, Omar reported IVR was
     "more jittery than OSINT" — that pattern matches this bug
     exactly.

     Note on Safari: this pattern is harmless on Safari (Safari's
     speechSynthesis doesn't have the same pause bug, and pause/
     resume on an idle queue is a no-op).
  ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isSupported) return
    const intervalId = setInterval(() => {
      try {
        // Only ping if speech is actually happening — avoids
        // spurious state changes on an idle queue
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      } catch (e) { /* noop — some browsers throw on pause/resume */ }
    }, 5000)
    return () => clearInterval(intervalId)
  }, [isSupported])

  const stopAll = useMemo(() => () => {
    if (!isSupported) return
    try {
      window.speechSynthesis.cancel()
      currentUtteranceRef.current = null
    } catch (e) {
      // Some browsers throw on cancel during unload — non-fatal.
    }
  }, [isSupported])

  const speakMessage = useMemo(() => (audio, opts = {}) => {
    if (!isSupported || !audio || !audio.text) return
    const profile = audio.profile || 'narrator'
    const config = VOICE_PROFILES[profile] || VOICE_PROFILES.narrator
    const speedMultiplier = opts.rate || 1

    // v25.7.0.15.2: do NOT cancel prior utterance. Let speechSynthesis
    // queue naturally so multiple messages within a stage play
    // sequentially. The caller is responsible for calling stopAll()
    // on stage change (engines do this in their effect cleanup) and
    // on unmount/mute. Cancelling on every speakMessage is what
    // caused mid-sentence cutoffs in v25.7.0.15.

    const utt = new SpeechSynthesisUtterance(audio.text)
    utt.pitch = config.pitch
    utt.rate = config.rate * speedMultiplier
    const voice = pickVoice(voicesRef.current, profile)
    if (voice) utt.voice = voice
    utt.lang = (voice && voice.lang) || 'en-US'

    // v25.7.0.15.2: optional onStart/onEnd hooks for the visual
    // speaker-icon cue. The browser fires these as the utterance
    // moves through the queue.
    if (opts.onStart) utt.onstart = opts.onStart
    if (opts.onEnd)   utt.onend   = opts.onEnd
    // onerror should also clear the cue so a failed utterance doesn't
    // leave the icon stuck on
    if (opts.onEnd) utt.onerror = opts.onEnd

    currentUtteranceRef.current = utt
    try {
      window.speechSynthesis.speak(utt)
    } catch (e) {
      // Very rare; some browsers throw if synthesis is mid-cancel.
      // Recovery: schedule on next tick.
      setTimeout(() => {
        try { window.speechSynthesis.speak(utt) } catch (_) { /* give up */ }
      }, 50)
    }
  }, [isSupported])

  return { speakMessage, stopAll, isSupported }
}


/* ─── Helpers exposed for engines ─────────────────────────────── */
// Default audio derived from a message's label, when scene data hasn't
// declared an explicit `audio` field. Engines can opt in to this fallback
// for messages that should be spoken without the scene author having to
// repeat the label as `audio.text`. Returns null for non-spoken kinds.
export function deriveAudioFromMessage(msg, defaults = {}) {
  if (!msg) return null
  if (msg.audio) return msg.audio   // explicit takes precedence
  // Auto-narration is conservative: only spoken when the message kind
  // suggests dialogue or a notification (sms/callback). System / http
  // messages are silent by default — those are network events, not
  // sounds the trainee would hear.
  const SPEAKABLE_KINDS = new Set(['sms', 'callback', 'voice'])
  if (!SPEAKABLE_KINDS.has(msg.kind)) return null
  return { text: msg.label, profile: defaults.profile || 'narrator' }
}


/*
 * Migration path to pre-generated audio (option B from v25.7.0.15 design):
 *
 *   When a paid TTS subscription is available (ElevenLabs / Play.ht / etc.),
 *   scenes can declare `audio: { src: '/audio/vishing/m6-2.mp3' }` instead
 *   of (or alongside) `text`. The engine renders an HTMLAudioElement and
 *   plays the file. Mute control governs both paths identically. The
 *   visual speaker-icon cue stays the same. No engine refactor required.
 *
 *   Generation workflow:
 *     1. Extract every audio.text across all scene files (script script).
 *     2. Generate audio per voice profile via ElevenLabs or similar.
 *     3. Drop into client/public/audio/<technique>/<msgId>.mp3.
 *     4. Update each scene's audio field to add src: '...' alongside text.
 *     5. Ship.
 *
 *   The text field stays as fallback if the audio file 404s — engines can
 *   detect playback failure and fall back to TTS automatically.
 */
