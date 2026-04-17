import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import RolePicker from './pages/RolePicker.jsx'
import Home from './pages/Home.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Scenario from './pages/Scenario.jsx'
import Framework from './pages/Framework.jsx'
import Matrix from './pages/Matrix.jsx'
import Coverage from './pages/Coverage.jsx'
import Quiz from './pages/Quiz.jsx'
import Tutor from './pages/Tutor.jsx'
import Team from './pages/Team.jsx'
import { useUser } from './lib/user.jsx'
import { useAuth0 } from '@auth0/auth0-react'

const NAMESPACE = 'https://3fffs.app'

function ManagerRoute({ children }) {
  const { user } = useAuth0()
  const roles = user?.[`${NAMESPACE}/roles`] || []
  if (!roles.includes('manager') && !roles.includes('admin')) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { role } = useUser()
  if (!role) return <RolePicker />

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"             index     element={<Home />} />
          <Route path="/scenarios"              element={<Scenarios />} />
          <Route path="/scenarios/:id"          element={<Scenario />} />
          <Route path="/coverage"               element={<Coverage />} />
          <Route path="/matrix"                 element={<Matrix />} />
          <Route path="/framework"              element={<Framework />} />
          <Route path="/quiz"                   element={<Quiz />} />
          <Route path="/tutor"                  element={<Tutor />} />
          <Route path="/team"                   element={<ManagerRoute><Team /></ManagerRoute>} />
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
