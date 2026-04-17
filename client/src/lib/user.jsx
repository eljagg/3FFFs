import { createContext, useContext, useState, useEffect } from 'react'

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
  const [role, setRole] = useState(() => localStorage.getItem('3fffs_role') || null)

  useEffect(() => {
    if (role) localStorage.setItem('3fffs_role', role)
    else localStorage.removeItem('3fffs_role')
  }, [role])

  return (
    <UserContext.Provider value={{
      role,
      chooseRole: setRole,
      clearRole: () => setRole(null),
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
