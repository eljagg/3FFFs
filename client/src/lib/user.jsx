import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const UserContext = createContext(null)

export const ROLES = [
  { id: 'teller',    label: 'Frontline / teller',    blurb: 'Customer-facing staff who see fraud first' },
  { id: 'analyst',   label: 'Fraud analyst',         blurb: 'Investigators who work cases end-to-end' },
  { id: 'soc',       label: 'SOC / cyber team',      blurb: 'Security operations and incident response' },
  { id: 'executive', label: 'Risk manager / exec',   blurb: 'Strategy, controls, board reporting' },
]

function getOrCreateUserId() {
  let id = localStorage.getItem('3fffs_uid')
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)
    localStorage.setItem('3fffs_uid', id)
  }
  return id
}

export function UserProvider({ children }) {
  const [userId]   = useState(getOrCreateUserId)
  const [role, setRole] = useState(() => localStorage.getItem('3fffs_role'))
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (role) api.upsertUser(userId, role, 'Trainee').catch(() => {})
  }, [userId, role])

  async function refreshProgress() {
    try {
      const p = await api.getProgress(userId)
      setProgress(p)
    } catch {}
  }

  useEffect(() => { refreshProgress() }, [userId, role])

  function chooseRole(newRole) {
    localStorage.setItem('3fffs_role', newRole)
    setRole(newRole)
  }

  function clearRole() {
    localStorage.removeItem('3fffs_role')
    setRole(null)
  }

  return (
    <UserContext.Provider value={{ userId, role, chooseRole, clearRole, progress, refreshProgress }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
