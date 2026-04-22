import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RolePicker from './pages/RolePicker.jsx'
import Home from './pages/Home.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Scenario from './pages/Scenario.jsx'
import Framework from './pages/Framework.jsx'
import Matrix from './pages/Matrix.jsx'
import Explorer from './pages/Explorer.jsx'
import Coverage from './pages/Coverage.jsx'
import Quiz from './pages/Quiz.jsx'
import Tutor from './pages/Tutor.jsx'
import Team from './pages/Team.jsx'
import SignalSort from './pages/SignalSort.jsx'
import Debug from './pages/Debug.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import { useUser } from './lib/user.jsx'
import { useAuth0 } from '@auth0/auth0-react'

const NAMESPACE = 'https://3fffs.app'

function AdminRoute({ children }) {
  const { user } = useAuth0()
  const roles = user?.[`${NAMESPACE}/roles`] || []
  if (!roles.includes('admin')) return <Navigate to="/" replace />
  return children
}

function ManagerRoute({ children }) {
  const { user } = useAuth0()
  const roles = user?.[`${NAMESPACE}/roles`] || []
  if (!roles.includes('manager') && !roles.includes('admin')) return <Navigate to="/" replace />
  return children
}

// Wraps a page with an error boundary so crashes show a readable error
// instead of a blank screen.
function Safe({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

export default function App() {
  const { role } = useUser()
  if (!role) return <RolePicker />

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"             index     element={<Safe><Home /></Safe>} />
          <Route path="/scenarios"              element={<Safe><Scenarios /></Safe>} />
          <Route path="/scenarios/:id"          element={<Safe><Scenario /></Safe>} />
          <Route path="/coverage"               element={<Safe><Coverage /></Safe>} />
          <Route path="/matrix"                 element={<Safe><Matrix /></Safe>} />
          <Route path="/explorer"               element={<Safe><Explorer /></Safe>} />
          <Route path="/play"                   element={<Safe><SignalSort /></Safe>} />
          <Route path="/framework"              element={<Safe><Framework /></Safe>} />
          <Route path="/quiz"                   element={<Safe><Quiz /></Safe>} />
          <Route path="/tutor"                  element={<Safe><Tutor /></Safe>} />
          <Route path="/team"                   element={<ManagerRoute><Safe><Team /></Safe></ManagerRoute>} />
          <Route path="/admin/users"            element={<AdminRoute><Safe><AdminUsers /></Safe></AdminRoute>} />
          <Route path="/debug"                  element={<Safe><Debug /></Safe>} />
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
