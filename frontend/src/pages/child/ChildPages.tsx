import { BookOpen, PlayCircle, Sparkles, Star, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PracticeList, PracticePlayer } from '../../components/Practice'
import ProgressView from '../../components/ProgressView'
import ScreeningRunner from '../../components/ScreeningRunner'
import { ErrorBox, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Activity, Child, SessionSummary } from '../../lib/types'

/** Child accounts see exactly one child: themselves. */
function useMe() {
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api.children().then(async (cs) => {
      if (!cs.length) { setError('No child profile is linked to this login.'); return }
      setChild(cs[0])
      setSessions(await api.childSessions(cs[0].id))
    }).catch((e) => setError(e.message))
  }, [])
  return { child, sessions, error }
}

export function ChildHome() {
  const { user } = useAuth()
  const { child, sessions, error } = useMe()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  if (error) return <ErrorBox message={error} />
  if (!child || !sessions) return <Spinner />
  const inProgress = sessions.find((s) => s.status === 'in_progress')

  const start = async () => {
    setBusy(true)
    try { const s = await api.createScreening(child.id); nav(`/child/screening/${s.id}`) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card relative overflow-hidden bg-navy-900 p-8 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sun-500/30" aria-hidden />
        <div className="absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-teal-500/30" aria-hidden />
        <p className="text-sm font-bold text-white/70">Hi {user?.full_name}!</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">Ready to read today?</h1>
        <p className="mt-2 max-w-md text-white/80">Pick a practice activity, or do a reading check-in with your teacher.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link to="/child/practice" className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-100 text-teal-700"><Sparkles className="h-7 w-7" /></div>
          <div><p className="text-lg font-bold">Practice</p><p className="text-sm text-navy-500">Words, spelling, reading and stories made for you.</p></div>
        </Link>
        <Link to="/child/progress" className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sun-100 text-sun-700"><TrendingUp className="h-7 w-7" /></div>
          <div><p className="text-lg font-bold">My progress</p><p className="text-sm text-navy-500">See your stars and how far you have come.</p></div>
        </Link>
        <div className="card flex items-center gap-4 p-5 sm:col-span-2">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender-100 text-lavender-600"><BookOpen className="h-7 w-7" /></div>
          <div className="flex-1"><p className="text-lg font-bold">Reading check-in</p><p className="text-sm text-navy-500">{inProgress ? 'You have a check-in in progress.' : 'Read letters, words and a short passage out loud. Best done with your teacher.'}</p></div>
          {inProgress ? <Link to={`/child/screening/${inProgress.id}`} className="btn-sun"><PlayCircle className="h-4 w-4" />Continue</Link> : <button className="btn-secondary" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start'}</button>}
        </div>
      </div>
    </div>
  )
}

export function ChildScreeningEntry() {
  const { child, sessions, error } = useMe()
  if (error) return <ErrorBox message={error} />
  if (!child || !sessions) return <Spinner />
  const inProgress = sessions.find((s) => s.status === 'in_progress')
  return inProgress ? <Navigate to={`/child/screening/${inProgress.id}`} replace /> : <Navigate to="/child/home" replace />
}

export function ChildScreening() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Reading check-in</h1>
      <ScreeningRunner sessionId={Number(id)} mode="child" />
    </div>
  )
}

export function ChildPractice() {
  const { child, error } = useMe()
  if (error) return <ErrorBox message={error} />
  if (!child) return <Spinner />
  return (
    <div>
      <div className="mb-5 flex items-center gap-3"><Star className="h-7 w-7 fill-sun-500 text-sun-500" /><h1 className="text-2xl font-bold">Your practice</h1></div>
      <PracticeList childId={child.id} canGenerate={false} openHref={(a) => `/child/practice/${a.id}`} />
    </div>
  )
}

export function ChildActivity() {
  const { id } = useParams()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.activity(Number(id)).then(setActivity).catch((e) => setError(e.message)) }, [id])
  if (error) return <ErrorBox message={error} />
  if (!activity) return <Spinner />
  return <PracticePlayer activity={activity} backHref="/child/practice" />
}

export function ChildProgress() {
  const { child, error } = useMe()
  if (error) return <ErrorBox message={error} />
  if (!child) return <Spinner />
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">My progress</h1>
      <ProgressView childId={child.id} childMode />
    </div>
  )
}
