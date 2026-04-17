import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider } from './lib/user.jsx'
import { ThemeProvider } from './lib/theme.jsx'
import { AuthProvider, AuthGate } from './lib/auth.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <UserProvider>
            <App />
          </UserProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
