import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AppMain from './AppMain'
import { getCurrentSession, onAuthChange, signInDemo } from './lib/supabase'

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const location = useLocation()
  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

function AuthPage({ session }: { session: Session | null }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Beta product. Use the demo login to continue.')
  const navigate = useNavigate()

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, session])

  async function handleDemoLogin() {
    setLoading(true)
    const result = await signInDemo()
    setStatus(result.ok ? 'Demo login successful. Welcome to the beta.' : 'Demo login failed.')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <p className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
          Beta product
        </p>
        <h1 className="text-2xl font-bold">Enter the demo experience</h1>
        <p className="text-sm text-slate-300">This beta version uses demo login only. No Google or email sign-in is enabled right now.</p>
        <button disabled={loading} onClick={handleDemoLogin} className="w-full rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold hover:bg-indigo-400">
          {loading ? 'Opening demo...' : 'Demo login'}
        </button>
        <p className="text-xs text-slate-300">{status}</p>
      </section>
    </main>
  )
}

function LandingPage() {
  return <Navigate to="/auth" replace />
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
