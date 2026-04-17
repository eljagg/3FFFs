import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import RolePicker from './pages/RolePicker.jsx'
import Home from './pages/Home.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Scenario from './pages/Scenario.jsx'
import Framework from './pages/Framework.jsx'
import Matrix from './pages/Matrix.jsx'
import Quiz from './pages/Quiz.jsx'
import Tutor from './pages/Tutor.jsx'
import { useUser } from './lib/user.jsx'

export default function App() {
  const { role } = useUser()
  if (!role) return <RolePicker />

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"                index     element={<Home />} />
          <Route path="/scenarios"                 element={<Scenarios />} />
          <Route path="/scenarios/:id"             element={<Scenario />} />
          <Route path="/matrix"                    element={<Matrix />} />
          <Route path="/framework"                 element={<Framework />} />
          <Route path="/quiz"                      element={<Quiz />} />
          <Route path="/tutor"                     element={<Tutor />} />
          <Route path="*"                          element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
