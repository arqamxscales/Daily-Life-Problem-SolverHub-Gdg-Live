import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AppMain from './AppMain'
import { getCurrentSession, onAuthChange, signInWithEmail, signInWithGoogle, signUpWithEmail } from './lib/supabase'

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const location = useLocation()
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

function AuthPage({ session }: { session: Session | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [status, setStatus] = useState('Use email/password or Google to continue.')
  const navigate = useNavigate()

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, session])

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setStatus('Enter email and password.')
      return
    }

    setLoading(true)
    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password)

    setStatus(result.ok ? (isSignUp ? 'Account created. Please verify email if required.' : 'Sign-in successful.') : 'Authentication failed.')
    setLoading(false)
  }

  async function handleGoogleAuth() {
    setLoading(true)
    const result = await signInWithGoogle()
    if (!result.ok) {
      setStatus('Google sign-in failed. Check Supabase OAuth config.')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <h1 className="text-2xl font-bold">Sign in to continue</h1>
        <p className="text-sm text-slate-300">Protected routes require authentication.</p>
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsSignUp(false)} className="rounded-lg bg-slate-800 px-3 py-1 text-xs">Sign in</button>
            <button type="button" onClick={() => setIsSignUp(true)} className="rounded-lg bg-slate-800 px-3 py-1 text-xs">Sign up</button>
          </div>
          <button disabled={loading} className="w-full rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold hover:bg-indigo-400" type="submit">
            {isSignUp ? 'Create account' : 'Sign in with email'}
          </button>
        </form>
        <button disabled={loading} onClick={handleGoogleAuth} className="w-full rounded-xl border border-white/15 px-3 py-2 text-sm">
          Continue with Google
        </button>
        <p className="text-xs text-slate-300">{status}</p>
      </section>
    </main>
  )
}

function LandingPage() {
  return <Navigate to="/dashboard" replace />
}

export default function RouterApp() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    async function bootstrap() {
      const current = await getCurrentSession()
      setSession(current)
    }

    void bootstrap()

    const unsubscribe = onAuthChange((next) => {
      setSession(next)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage session={session} />} />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute session={session}>
            <AppMain />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
