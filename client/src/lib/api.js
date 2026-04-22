const BASE = import.meta.env.VITE_API_URL || ''

let tokenGetter = null
export function setTokenGetter(fn) { tokenGetter = fn }

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (tokenGetter) {
    try {
      const token = await tokenGetter()
      if (token) headers.Authorization = `Bearer ${token}`
    } catch {}
  }
  const res = await fetch(BASE + path, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  me:              ()        => request('/api/me'),
  getTactics:      ()        => request('/api/framework/tactics'),
  getTechniques:   ()        => request('/api/framework/techniques'),
  searchFramework: (q)       => request(`/api/framework/search?q=${encodeURIComponent(q)}`),
  getFrameworkGraph: ()      => request('/api/framework/graph'),

  // Scenarios — unified naming. Both listScenarios and getScenarios work
  // (alias keeps older pages from breaking during iteration).
  listScenarios:   (role)    => request(`/api/scenarios${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  getScenarios:    (role)    => request(`/api/scenarios${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  getScenario:     (id)      => request(`/api/scenarios/${id}`),
  getScenarioPath: (id)      => request(`/api/scenarios/${id}/path`),
  submitStage:     (id, b)   => request(`/api/scenarios/${id}/submit`, { method: 'POST', body: JSON.stringify(b) }),
  completeScenario:(id)      => request(`/api/scenarios/${id}/complete`, { method: 'POST' }),
  chooseStageOption:(id, b) => request(`/api/scenarios/${id}/choose`, { method: 'POST', body: JSON.stringify(b) }),

  // Quiz — Quiz.jsx calls getQuizzes({role}) on load and quizAnswer(userId, quizId, optionIndex, correct) per answer.
  // (userId parameter is for compatibility — the server derives the user from the auth token.)
  getQuizzes:      ({ role } = {}) => request(`/api/quiz?role=${encodeURIComponent(role || '')}`),
  quizAnswer:      (_userId, quizId, optionIndex, correct) =>
    request('/api/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({ quizId, optionIndex, correct: !!correct }),
    }),

  getProgress:     ()        => request('/api/progress'),
  getCoverage:     ()        => request('/api/progress/coverage'),

  tutorChat:       (b)       => request('/api/tutor', { method: 'POST', body: JSON.stringify(b) }),

  getTeamProgress: ()        => request('/api/team/progress'),
  getTeamCoverage: ()        => request('/api/team/coverage'),
  getTeamSkills:   ()        => request('/api/team/skills'),

  // Admin-only diagnostics (endpoints moved under /api/progress/* because
  // /api/debug/* was returning HTTP 404 on Railway for reasons we could not isolate)
  debugGraphState:       ()   => request('/api/progress/debug-state'),
  debugResetMyProgress:  ()   => request('/api/progress/reset-my-progress', { method: 'POST' }),

  // Games
  getSignalPool:       () => request('/api/games/signals'),
  submitSignalScore:   (score) => request('/api/games/signals/score', { method: 'POST', body: JSON.stringify({ score }) }),
  getSignalLeaderboard:() => request('/api/games/signals/leaderboard'),

  // Achievements
  getBadges:       ()        => request('/api/badges'),

  // v23 — Admin users & invites (all gated by requireRole('admin') server-side)
  listUsers:    ()      => request('/api/admin/users'),
  listInvites:  ()      => request('/api/admin/invites'),
  createInvite: (body)  => request('/api/admin/invites', {
                             method: 'POST',
                             body: JSON.stringify(body),
                           }),
  revokeInvite: (id)    => request(`/api/admin/invites/${encodeURIComponent(id)}/revoke`, {
                             method: 'POST',
                           }),
  deleteInvite: (id)    => request(`/api/admin/invites/${encodeURIComponent(id)}`, {
                             method: 'DELETE',
                           }),
}
