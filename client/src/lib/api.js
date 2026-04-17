const BASE = import.meta.env.VITE_API_URL || ''

// Token getter is set by AuthGate once the user is authenticated
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
  me:              ()    => request('/api/me'),
  getTactics:      ()    => request('/api/framework/tactics'),
  getTechniques:   ()    => request('/api/framework/techniques'),
  searchFramework: (q)   => request(`/api/framework/search?q=${encodeURIComponent(q)}`),
  listScenarios:   ()    => request('/api/scenarios'),
  getScenario:     (id)  => request(`/api/scenarios/${id}`),
  submitStage:     (id, b) => request(`/api/scenarios/${id}/submit`, { method: 'POST', body: JSON.stringify(b) }),
  completeScenario:(id)  => request(`/api/scenarios/${id}/complete`, { method: 'POST' }),
  getQuiz:         (role)=> request(`/api/quiz?role=${encodeURIComponent(role || '')}`),
  submitQuiz:      (b)   => request('/api/quiz/answer', { method: 'POST', body: JSON.stringify(b) }),
  getProgress:     ()    => request('/api/progress'),
  tutorChat:       (b)   => request('/api/tutor', { method: 'POST', body: JSON.stringify(b) }),
  getTeamProgress: ()    => request('/api/team/progress'),
}
