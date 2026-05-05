import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setTokenGetter } from './api.js'
import Login from '../pages/Login.jsx'
import WelcomeSplash from '../components/WelcomeSplash.jsx'

const domain   = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

/**
 * Wraps the whole app in Auth0Provider. Call this once at the top of main.jsx.
 */
export function AuthProvider({ children }) {
  if (!domain || !clientId) {
    console.warn('Auth0 env vars missing — auth disabled for local dev')
    return children
  }
  return (
    <Auth0ProviderWithNavigation>{children}</Auth0ProviderWithNavigation>
  )
}

function Auth0ProviderWithNavigation({ children }) {
  const onRedirectCallback = (appState) => {
    window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname)
  }
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: 'openid profile email',
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  )
}

/**
 * Gates the app. Shows Login when not authenticated; shows a brief welcome
 * splash on first login; otherwise renders children.
 */
export function AuthGate({ children }) {
  const { isLoading, isAuthenticated, getAccessTokenSilently, user, error } = useAuth0()
  const [showSplash, setShowSplash] = useState(false)

  // v25.7.1.2: Wire the token getter SYNCHRONOUSLY during render the moment
  // we know the user is authenticated. The useEffect below is kept as a
  // backstop, but the synchronous call here ensures that any child component
  // mounting on the SAME render commit (e.g. Home.jsx's useEffect calling
  // api.getProgress() / api.getDailySignal() / api.getReviewQueue()) finds
  // tokenGetter already wired up.
  //
  // Calling setTokenGetter during render is normally a code smell (mutating
  // module-level state outside an effect), but here it's idempotent — the
  // setter just stores a reference — and it pairs with the wait-and-drain
  // queue in api.js so even API calls that started BEFORE this point will
  // be unblocked when this runs.
  if (isAuthenticated) {
    setTokenGetter(() => getAccessTokenSilently())
  }

  // Backstop: also wire on every isAuthenticated transition. This is what
  // existed before v25.7.1.2; it's preserved for safety but should be a
  // no-op now that the synchronous wiring above runs first.
  useEffect(() => {
    if (isAuthenticated) setTokenGetter(() => getAccessTokenSilently())
  }, [isAuthenticated, getAccessTokenSilently])

  // Detect first login — show the welcome splash once
  useEffect(() => {
    if (isAuthenticated && user) {
      const key = `3fffs_welcomed_${user.sub}`
      if (!localStorage.getItem(key)) {
        setShowSplash(true)
        localStorage.setItem(key, '1')
      }
    }
  }, [isAuthenticated, user])

  // When Auth0 env is missing (dev), pass through
  if (!domain || !clientId) return children

  if (isLoading) {
    return <FullScreenLoader label="Signing you in…" />
  }

  if (error) {
    return <LoginErrorScreen error={error} />
  }

  if (!isAuthenticated) return <Login />

  return (
    <>
      {showSplash && <WelcomeSplash user={user} onDone={() => setShowSplash(false)} />}
      {children}
    </>
  )
}

function FullScreenLoader({ label }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 20, background: 'var(--paper)',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 28, height: 28,
        border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--ink-faint)',
      }}>{label}</div>
    </div>
  )
}

function LoginErrorScreen({ error }) {
  const { loginWithRedirect, logout } = useAuth0()
  const isAccessDenied = /not authorized|access_denied/i.test(error?.message || '')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40, background: 'var(--paper)',
    }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 18,
        }}>
          {isAccessDenied ? 'Access Restricted' : 'Sign-in Error'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 500,
          fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.02em',
          marginBottom: 16,
        }}>
          {isAccessDenied
            ? <>Your email domain isn't on the allowlist.</>
            : <>Something went wrong.</>}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 30 }}>
          {isAccessDenied
            ? 'This training platform is restricted to approved financial institutions. If you believe this is an error, please contact your training administrator.'
            : error?.message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            style={{
              padding: '11px 20px', background: 'var(--ink)', color: 'var(--paper)',
              borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 500,
              border: 'none', cursor: 'pointer',
            }}
          >Return to sign-in</button>
        </div>
      </div>
    </div>
  )
}
