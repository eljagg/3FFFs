const BASE = import.meta.env.VITE_API_URL || ''

let tokenGetter = null
// v25.7.1.2: pendingResolvers is populated by request() calls that arrive
// before setTokenGetter() has been called. When the getter is finally wired,
// we resolve all of them so they can fire their requests with a valid
// Authorization header. Fixes a race where Home-page useEffects fired
// api.getProgress() / api.getDailySignal() / api.getReviewQueue() before
// AuthGate's wiring useEffect ran, producing 401s on first page load even
// though the user was authenticated.
let pendingResolvers = []
export function setTokenGetter(fn) {
  tokenGetter = fn
  // Drain any callers that were waiting on us
  const drain = pendingResolvers
  pendingResolvers = []
  for (const resolve of drain) resolve()
}

// Wait up to 3 seconds for setTokenGetter to be called. This is generous —
// AuthGate's wiring effect runs within milliseconds of isAuthenticated
// flipping true, so we're really waiting microseconds in practice. The
// timeout exists only as a fallback so a misconfigured Auth0 setup
// doesn't hang the UI forever — after 3s we just fire the request without
// a token and let the server's 401 propagate as before.
function waitForTokenGetter(timeoutMs = 3000) {
  if (tokenGetter) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const t = setTimeout(() => {
      if (settled) return
      settled = true
      const i = pendingResolvers.indexOf(resolve)
      if (i >= 0) pendingResolvers.splice(i, 1)
      resolve()
    }, timeoutMs)
    pendingResolvers.push(() => {
      if (settled) return
      settled = true
      clearTimeout(t)
      resolve()
    })
  })
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  // v25.7.1.2: wait for the token getter to be wired up before attaching auth.
  await waitForTokenGetter()
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
  // v25.3.1: persist job-function role to User node + roleHistory audit trail
  setMyRole:       (role)    => request('/api/me/role', { method: 'POST', body: JSON.stringify({ role }) }),
  getTactics:      ()        => request('/api/framework/tactics'),
  getTechniques:   ()        => request('/api/framework/techniques'),
  searchFramework: (q)       => request(`/api/framework/search?q=${encodeURIComponent(q)}`),
  getFrameworkGraph: ()      => request('/api/framework/graph'),

  // Scenarios — unified naming. Both listScenarios and getScenarios work
  // (alias keeps older pages from breaking during iteration).
  // v25.3.1: optional simulateRole param — admins use this to test what
  // each job-function role would see without leaving their admin session.
  listScenarios:   (role, simulateRole) => {
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (simulateRole) params.set('simulateRole', simulateRole)
    const qs = params.toString()
    return request(`/api/scenarios${qs ? `?${qs}` : ''}`)
  },
  getScenarios:    (role, simulateRole) => {
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (simulateRole) params.set('simulateRole', simulateRole)
    const qs = params.toString()
    return request(`/api/scenarios${qs ? `?${qs}` : ''}`)
  },
  getScenario:     (id)      => request(`/api/scenarios/${id}`),

  // v25.7.0.5: F3 Framework scenario storyboard (Design C). Public endpoints,
  // no auth required — same access pattern as getTactics().
  getStoryboardScenarios: ()   => request('/api/storyboard/scenarios'),
  getStoryboardScenario:  (id) => request(`/api/storyboard/scenarios/${encodeURIComponent(id)}`),

  // v25.7.0.8: techniques grid foundation. Three endpoints powering the
  // hierarchical, clickable techniques grid + its sidebar detail view.
  getTechniquesTree:    (tacticId) => request(`/api/framework/tactics/${encodeURIComponent(tacticId)}/techniques-tree`),
  getTechnique:         (techId)   => request(`/api/framework/techniques/${encodeURIComponent(techId)}`),
  getTechniqueCrossRefs:(techId)   => request(`/api/framework/techniques/${encodeURIComponent(techId)}/cross-refs`),

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

  // Tutor — accepts optional stageContext for inline-from-scenario asks
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

  // Admin users + invites (v23)
  adminListUsers:      ()        => request('/api/admin/users'),
  adminListInvites:    ()        => request('/api/admin/invites'),
  adminCreateInvite:   (body)    => request('/api/admin/invites',        { method: 'POST',   body: JSON.stringify(body) }),
  adminRevokeInvite:   (id)      => request(`/api/admin/invites/${id}`,  { method: 'DELETE' }),

  // Frameworks (v25.0+) — public endpoints, no auth required
  listFrameworks:      ()        => request('/api/frameworks'),
  getFramework:        (id)      => request(`/api/frameworks/${id}`),
  getFrameworkPhases:  (id)      => request(`/api/frameworks/${id}/phases`),
  getUniversalConcepts:()        => request('/api/frameworks/concepts/universal'),
  // Concept lookup is the v25.1 wedge — used by ConceptSidebar
  getConcept:          (id)      => request(`/api/frameworks/concepts/${id}`),
  // v25.4.2: where this concept is practiced (scenarios + stages)
  getConceptPracticedIn: (id)    => request(`/api/frameworks/concepts/${id}/practiced-in`),

  // v25.5: MITRE ATT&CK reference endpoints
  listMitreTactics:           ()        => request('/api/mitre/tactics'),
  listMitreTechniques:        (tactic)  => request(`/api/mitre/techniques${tactic ? `?tactic=${encodeURIComponent(tactic)}` : ''}`),
  getMitreTechnique:          (id)      => request(`/api/mitre/techniques/${encodeURIComponent(id)}`),
  getMitreTechniquePracticedIn: (id)    => request(`/api/mitre/techniques/${encodeURIComponent(id)}/practiced-in`),
  // v25.6.1: CBEST FrameworkPhase reference endpoints (ISS-013)
  getFrameworkPhase:           (id)     => request(`/api/framework-phases/${encodeURIComponent(id)}`),
  getFrameworkPhasePracticedIn: (id)    => request(`/api/framework-phases/${encodeURIComponent(id)}/practiced-in`),

  // v25.7.0: rich per-user progress (ISS-017) and Bank multi-tenant context (ISS-019a/019b/021)
  getMyProgressFull:           ()       => request('/api/progress/me/full'),
  getUserProgressFull:         (userId) => request(`/api/progress/user/${encodeURIComponent(userId)}/full`),
  getMyBank:                   ()       => request('/api/banks/me'),
  getMyBankMembers:            ()       => request('/api/banks/me/members'),
  assignManager: (managerId, reportId)  => request('/api/banks/me/manages', { method: 'POST', body: JSON.stringify({ managerId, reportId }) }),
  revokeManager: (managerId, reportId)  => request(`/api/banks/me/manages/${encodeURIComponent(reportId)}`, { method: 'DELETE', body: JSON.stringify({ managerId }) }),
  getThreatActors:     ()        => request('/api/frameworks/data/threat-actors'),
  recommendFrameworks: (regulatorId) => request(`/api/frameworks/data/recommend?regulator=${encodeURIComponent(regulatorId)}`),

  // v25.7.0.2 (ISS-023): Visualization registry
  // - listVisualizations: full registry, used by /admin/visualizations preview
  // - getVisualizationsFor: visualizations attached to a given graph entity
  //   (e.g. getVisualizationsFor('Tactic', 'TA0043'))
  // - emitVizEvent: telemetry — fire-and-forget, the renderer wraps this so
  //   each viz component doesn't have to know about the endpoint
  listVisualizations:    ()                    => request('/api/visualizations'),
  getVisualizationsFor:  (entityType, entityId) =>
    request(`/api/visualizations/for/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`),
  emitVizEvent:          (vizId, type)         =>
    request(`/api/visualizations/${encodeURIComponent(vizId)}/event`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  // v25.7.1 (ISS-024): Engagement-layer endpoints — Daily Signal habit loop,
  // wrong-answer Review Queue, post-scenario Retrieval Practice, and
  // downloadable Completion Certificates with public verification.
  //
  // Daily Signal:
  //   - getDailySignal: today's deterministically-picked stage + streak count
  //   - answerDailySignal: submit pick, returns rationales for all 4 options
  // Review Queue:
  //   - getReviewQueue: wrong-answer stages older than the cooldown
  // Retrieval Practice:
  //   - getRetrievalPractice: 3 generated "did this signal appear?" questions
  //   - answerRetrievalPractice: submit picks, returns per-question correctness
  // Certificate:
  //   - getCertificateUrl: returns the URL the browser can open/download from
  //     (the endpoint streams a PDF directly — no JSON wrapper)
  getDailySignal:        ()           => request('/api/engagement/daily-signal'),
  answerDailySignal:     (stageId, optionIndex) =>
    request('/api/engagement/daily-signal/answer', {
      method: 'POST',
      body: JSON.stringify({ stageId, optionIndex }),
    }),
  getReviewQueue:        ()           => request('/api/engagement/review-queue'),
  getRetrievalPractice:  (scenarioId) => request(`/api/engagement/retrieval/${encodeURIComponent(scenarioId)}`),
  answerRetrievalPractice: (scenarioId, challenge, answers) =>
    request(`/api/engagement/retrieval/${encodeURIComponent(scenarioId)}/answer`, {
      method: 'POST',
      body: JSON.stringify({ challenge, answers }),
    }),
  // The certificate endpoint streams a PDF, so we can't go through `request`
  // (which assumes JSON). Instead we fetch as a Blob with the auth header,
  // then trigger a browser download via a transient blob URL.
  downloadCertificate: async (scenarioId) => {
    const headers = {}
    // v25.7.1.2: same race-condition fix as in request()
    await waitForTokenGetter()
    if (tokenGetter) {
      try {
        const token = await tokenGetter()
        if (token) headers.Authorization = `Bearer ${token}`
      } catch {}
    }
    const res = await fetch(
      `${BASE}/api/engagement/certificate/${encodeURIComponent(scenarioId)}`,
      { headers }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `3fffs-certificate-${scenarioId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
