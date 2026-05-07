/**
 * StageCoachOverlay.jsx — v25.7.0.17
 *
 * Shared trainee-facing live callout that surfaces the active stage's
 * caption text as an overlay on the animation canvas. Helps trainees
 * understand what's happening at each stage without scrolling away
 * from the visual.
 *
 * Used by all three engines (ProcessAnimation,
 * TimelineThresholdAnimation, MultiActorSequenceAnimation).
 *
 * Design decisions (locked v25.7.0.17):
 * - Position: bottom of the animation canvas, semi-transparent dark
 *   background with light text. Slides up from below on stage change.
 * - Default state: ON for first-time visitors (mirrors lecture-capture
 *   closed-caption defaults; the whole point is trainee comprehension)
 * - Persistence: per-session via localStorage key '3ffs-coach-on'.
 *   Trainee picks preferred mode once across all animations.
 * - Source: reads stage.caption directly. No new content fields
 *   authored — the captions already cover the pedagogy. If the
 *   caption is too long, the right fix is to revise the caption.
 * - When OFF, returns null. Zero render cost when disabled.
 *
 * Pedagogical note: this is "live coach mode" — a teaching aid
 * trainees can toggle off when they want unaided-mode comprehension
 * checks. Distinct from the speaker-icon (🔊) cue (audio activeness
 * indicator) and from the post-animation final headline (summary).
 */

import { useState, useEffect, useCallback } from 'react'

const COACH_PREF_KEY = '3ffs-coach-on'

/**
 * useCoachToggle — persistent toggle hook
 *
 * Returns [isCoachOn, toggleCoach]. Reads initial state from
 * localStorage; defaults to true (ON) if no stored preference.
 * Persists every change to localStorage so the trainee's choice
 * carries across animations and page refreshes within the session.
 *
 * Defensive against private-browsing modes where localStorage
 * throws — falls back to in-memory state.
 */
export function useCoachToggle() {
  const [isCoachOn, setIsCoachOn] = useState(() => {
    try {
      const stored = window.localStorage.getItem(COACH_PREF_KEY)
      // Default to ON when no preference exists; respect 'false' explicitly
      return stored === null ? true : stored !== 'false'
    } catch (e) {
      return true  // localStorage unavailable (e.g. some incognito modes)
    }
  })

  const toggleCoach = useCallback(() => {
    setIsCoachOn(prev => {
      const next = !prev
      try {
        window.localStorage.setItem(COACH_PREF_KEY, next ? 'true' : 'false')
      } catch (e) { /* localStorage unavailable; in-memory only */ }
      return next
    })
  }, [])

  return [isCoachOn, toggleCoach]
}

/**
 * StageCoachOverlay — the visible callout
 *
 * Renders nothing when isOn=false or when text is empty.
 * Otherwise renders a fixed-position bar at the bottom of the
 * relative-positioned parent (engines wrap their canvas in a
 * relative container; this component sits inside that container).
 */
export function StageCoachOverlay({ isOn, text, stageLabel, stageIdx }) {
  // Re-mount on stage change for slide-up animation; key by stageIdx
  if (!isOn || !text) return null

  return (
    <div
      key={stageIdx}
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        background: 'rgba(15, 23, 42, 0.92)',  // slate-900 92%
        color: '#f1f5f9',                       // slate-100
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.45,
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
        animation: 'coach-slide-up 0.35s ease-out',
        pointerEvents: 'none',  // never blocks clicks on the canvas
        zIndex: 10,
        maxHeight: '40%',
        overflow: 'auto',
      }}
    >
      {stageLabel && (
        <div style={{
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: '#94a3b8',  // slate-400
          marginBottom: 4,
          fontWeight: 600,
        }}>
          Stage {stageIdx + 1} · {stageLabel}
        </div>
      )}
      <div>{text}</div>
      {/* Inline keyframes — keeps component self-contained */}
      <style>{`
        @keyframes coach-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/**
 * CoachToggleButton — the visible toggle in the playback bar
 *
 * Engines render this in their playback control row alongside the
 * mute toggle. Visual style mirrors the existing speedButton style
 * so it fits in.
 */
export function CoachToggleButton({ isOn, onToggle, baseStyle = {} }) {
  return (
    <button
      onClick={onToggle}
      title={isOn
        ? 'Coach mode on — click to hide stage captions during playback'
        : 'Coach mode off — click to show stage captions during playback'}
      style={{
        ...baseStyle,
        opacity: isOn ? 1 : 0.55,
        cursor: 'pointer',
      }}
      aria-pressed={isOn}
      aria-label={isOn ? 'Coach mode on' : 'Coach mode off'}
    >
      {/* Single emoji; state communicated via opacity + tooltip */}
      💬
    </button>
  )
}
