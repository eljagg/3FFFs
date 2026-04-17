const BASE = import.meta.env.VITE_API_URL || ''

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    let msg
    try { msg = (await res.json()).error } catch { msg = res.statusText }
    throw new Error(msg || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  health:            ()                                => req('/health'),
  tutorStatus:       ()                                => req('/api/tutor/status'),
  tutorSend:         (messages, role)                  => req('/api/tutor', { method: 'POST', body: JSON.stringify({ messages, role }) }),
  getTactics:        ()                                => req('/api/framework/tactics'),
  getTechniques:     ()                                => req('/api/framework/techniques'),
  search:            (q)                               => req(`/api/framework/search?q=${encodeURIComponent(q)}`),
  getScenarios:      (role)                            => req(`/api/scenarios${role ? '?role=' + role : ''}`),
  getScenario:       (id)                              => req(`/api/scenarios/${id}`),
  getQuizzes:        ({ role, difficulty, tacticId })  => {
    const p = new URLSearchParams()
    if (role)       p.set('role', role)
    if (difficulty) p.set('difficulty', difficulty)
    if (tacticId)   p.set('tacticId', tacticId)
    const qs = p.toString()
    return req(`/api/quiz${qs ? '?' + qs : ''}`)
  },
  upsertUser:        (userId, role, displayName)       => req('/api/progress/user', { method: 'POST', body: JSON.stringify({ userId, role, displayName }) }),
  getProgress:       (userId)                          => req(`/api/progress/${userId}`),
  scenarioComplete:  (userId, scenarioId)              => req('/api/progress/scenario-complete', { method: 'POST', body: JSON.stringify({ userId, scenarioId }) }),
  quizAnswer:        (userId, quizId, optionIndex, correct) =>
    req('/api/progress/quiz-answer', { method: 'POST', body: JSON.stringify({ userId, quizId, optionIndex, correct }) }),
}
