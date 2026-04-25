import { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api.js'

// These are "job functions" — what kind of work the user does.
// They're distinct from Auth0 roles (trainee/manager/admin) which control permissions.
// Job function controls content: which scenarios and quizzes are relevant to them.
export const ROLES = [
  { id: 'teller',    label: 'Frontline / teller',  blurb: 'Customer-facing staff who see fraud first' },
  { id: 'analyst',   label: 'Fraud analyst',       blurb: 'Investigators who work cases end-to-end' },
  { id: 'soc',       label: 'SOC / cyber team',    blurb: 'Security operations and incident response' },
  { id: 'executive', label: 'Risk manager / exec', blurb: 'Strategy, controls, board reporting' },
]

const UserContext = createContext(null)

export function UserProvider({ children }) {
  // role: the user's chosen job-function role. localStorage-cached for fast
  // hydration, but v25.3.1 also persists to server (User.role + roleHistory).
  const [role, setRole] = useState(() => localStorage.getItem('3fffs_role') || null)

  // v25.3.1: simulateRole is admin-only. When set, the Scenarios page (and
  // future role-aware pages) should use this instead of `role` for filtering.
  // Persisted in sessionStorage (not localStorage) so it doesn't carry across
  // browser restarts — admins shouldn't be permanently stuck simulating.
  const [simulateRole, setSimulateRoleState] = useState(() => {
    try { return sessionStorage.getItem('3fffs_simulate_role') || null } catch { return null }
  })

  useEffect(() => {
    if (role) localStorage.setItem('3fffs_role', role)
    else localStorage.removeItem('3fffs_role')
  }, [role])

  useEffect(() => {
    try {
      if (simulateRole) sessionStorage.setItem('3fffs_simulate_role', simulateRole)
      else sessionStorage.removeItem('3fffs_simulate_role')
    } catch {}
  }, [simulateRole])

  // chooseRole: persists to BOTH localStorage (for fast subsequent hydration)
  // and server (User.role + roleHistory audit trail). Server call is fire-
  // and-forget — UI doesn't block on it. If the server call fails, the next
  // page load still has the role from localStorage.
  function chooseRole(newRole) {
    setRole(newRole)
    api.setMyRole(newRole).catch(err => {
      console.warn('Failed to persist role to server:', err.message)
    })
  }

  function clearRole() {
    setRole(null)
    api.setMyRole(null).catch(() => {})
  }

  function setSimulateRole(r) {
    setSimulateRoleState(r)
  }

  function clearSimulateRole() {
    setSimulateRoleState(null)
  }

  return (
    <UserContext.Provider value={{
      role,
      simulateRole,
      // effectiveRole: what role the rest of the app should treat the user as.
      // simulateRole takes precedence (admin testing); falls back to actual role.
      effectiveRole: simulateRole || role,
      chooseRole,
      clearRole,
      setSimulateRole,
      clearSimulateRole,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
