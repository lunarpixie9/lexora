import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Disclaimer } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { homeFor, useAuth } from '../lib/auth'

export default function Login() {
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'teacher' | 'parent'>('teacher')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState<{ password?: string; accounts?: { role: string; email: string }[] } | null>(null)

  useEffect(() => { api.demoAccounts().then((d) => d.enabled && setDemo(d)).catch(() => setDemo(null)) }, [])

  if (user) return <Navigate to={loc.state?.from || homeFor(user.role)} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const u = mode === 'login' ? await login(email, password) : await register({ email, password, full_name: fullName, role })
      nav(loc.state?.from || homeFor(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in')
    } finally { setBusy(false) }
  }

  const quick = async (em: string) => {
    if (!demo?.password) return
    setBusy(true); setError(null)
    try { const u = await login(em, demo.password); nav(homeFor(u.role), { replace: true }) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not sign in') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-navy-900 p-10 text-white md:flex">
        <Logo light />
        <div>
          <h1 className="text-4xl font-bold leading-tight">Observe. Explain. Practise.</h1>
          <p className="mt-4 max-w-md text-lg text-white/70">Lexora turns a short reading, writing and speaking session into an explainable screening indicator and personalised practice.</p>
        </div>
        <p className="text-sm text-white/50">Screening aid — not a diagnostic tool.</p>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 md:px-14">
        <div className="md:hidden"><Logo /></div>
        <h2 className="mt-8 text-2xl font-bold md:mt-0">{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
        <p className="mt-1 text-sm text-navy-500">{mode === 'login' ? 'Teachers, parents and children each have their own view.' : 'Teachers create child profiles; parents follow progress.'}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <>
              <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <div>
                <span className="label">I am a</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['teacher', 'parent'] as const).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold capitalize ${role === r ? 'border-navy-900 bg-navy-900 text-white' : 'border-cream-300 bg-white'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="label" htmlFor="pw">{mode === 'login' ? 'Password or PIN' : 'Password (min 6 characters)'}</label><input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 6 : 1} /></div>
          {error && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-500" role="alert">{error}</p>}
          <button className="btn-primary w-full btn-lg" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="mt-3 text-sm font-bold text-teal-700" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}>
          {mode === 'login' ? 'New here? Create a teacher or parent account' : 'Already have an account? Sign in'}
        </button>

        {demo?.accounts && (
          <div className="mt-8 rounded-2xl border border-sun-300 bg-sun-100/60 p-4">
            <p className="text-sm font-bold">Demo accounts</p>
            <p className="text-xs text-navy-500">One click to explore each role. Demo children and their results are generated demo content.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {demo.accounts.map((a) => (
                <button key={a.email} disabled={busy} onClick={() => quick(a.email)} className="rounded-xl bg-white px-3 py-2 text-left text-sm shadow-card hover:bg-cream-50">
                  <span className="block font-bold capitalize">{a.role}</span>
                  <span className="block truncate text-xs text-navy-500">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6"><Disclaimer compact /></div>
        <p className="mt-6 text-sm"><Link to="/" className="font-bold text-navy-700">← Back to home</Link></p>
      </div>
    </div>
  )
}
