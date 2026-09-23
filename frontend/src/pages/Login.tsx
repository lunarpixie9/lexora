import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ART } from '../components/decor'
import { Logo, TopBar } from '../components/Layout'
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

  const roleBtn = (r: 'teacher' | 'parent') =>
    `rounded-xl border px-3 py-3.5 text-sm font-bold capitalize transition ${
      role === r ? 'border-terra-500 bg-terra-500 text-white' : 'border-cream-400 bg-white text-ink-900'}`

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <TopBar>
        <Logo />
        <Link to="/how-it-works" className="btn-ghost">How it works ✨</Link>
      </TopBar>

      <div className="grid flex-1 md:grid-cols-2">
        {/* Sky panel */}
        <div className="band-sky flex flex-col justify-center gap-7 px-7 py-14 md:px-12 md:py-16">
          <h1 className="font-display text-[34px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] text-terra-500 md:text-[46px]">
            Observe.<br />Explain.<br />
            <span className="font-bold italic normal-case">practise.</span>
          </h1>
          <p className="max-w-[420px] text-base font-semibold leading-[1.6] text-slate-900 md:text-[17px]">
            Lexora turns a short reading, writing and speaking session into an explainable screening indicator and
            personalised practice.
          </p>
          <div className="hidden md:block">
            <div className="relative grid h-[150px] w-[150px] place-items-center overflow-hidden rounded-full bg-mint-100 shadow-[0_0_0_8px_rgb(255_255_255_/_0.7)]" aria-hidden>
              <img src={ART.welcome} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
          <p className="text-[13px] font-semibold tracking-wide text-slate-700">Screening aid — not a diagnostic tool.</p>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center px-5 py-12 md:px-12">
          <div className="w-full max-w-[560px]">
            <h2 className="font-display text-[26px] font-bold leading-tight text-ink-900 md:text-[30px]">
              {mode === 'login' ? 'Sign in' : 'Create an account'}
            </h2>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ink-600">
              {mode === 'login'
                ? 'Teachers, parents and children each have their own view.'
                : 'Teachers create child profiles; parents follow progress.'}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="label" htmlFor="name">Full name</label>
                    <input id="name" className="input" placeholder="Asha Menon" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div>
                    <span className="label">I am a</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['teacher', 'parent'] as const).map((r) => (
                        <button type="button" key={r} onClick={() => setRole(r)} className={roleBtn(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" className="input" type="email" autoComplete="username" placeholder="teacher@lexora.demo" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="pw">{mode === 'login' ? 'Password or PIN' : 'Password (min 6 characters)'}</label>
                <input id="pw" className="input" type="password" autoComplete="current-password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 6 : 1} />
              </div>
              {error && <p className="rounded-xl bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700" role="alert">{error}</p>}
              <button className="btn-primary btn-lg w-full" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <button className="mt-4 text-left text-sm font-bold text-terra-500 hover:text-terra-600"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}>
              {mode === 'login' ? 'New here? Create a teacher or parent account' : 'Already have an account? Sign in'}
            </button>

            {demo?.accounts && (
              <div className="panel-dashed mt-8 rounded-[18px] p-6">
                <p className="font-display text-[15px] font-bold text-ink-900">Demo accounts</p>
                <p className="mb-4 mt-1.5 text-[13px] font-medium leading-relaxed text-ink-500">
                  One click per role. Demo children and their results are generated demo content.
                </p>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {demo.accounts.map((a) => (
                    <button key={a.email} disabled={busy} onClick={() => quick(a.email)}
                      className="rounded-xl bg-cream-200 p-3.5 text-left transition hover:bg-cream-300 disabled:opacity-50">
                      <span className="block text-sm font-bold capitalize text-ink-900">{a.role}</span>
                      <span className="mono mt-1 block truncate">{a.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="panel-dashed mt-5 rounded-xl p-4">
              <p className="text-xs font-medium leading-[1.6] text-ink-600">
                <strong className="text-ink-700">Lexora is an educational screening aid and is not a diagnostic tool.</strong>{' '}
                Results indicate patterns that may warrant further observation.
              </p>
            </div>

            <p className="mt-6"><Link to="/" className="text-sm font-bold text-terra-500 hover:text-terra-600">← Back to home</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
