import { PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ART, Medallion, Sparkle, Wave } from '../../components/decor'
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
    <div className="-mx-5 -mt-9 md:-mx-7 md:-mt-11">
      {/* Sky hero, full-bleed under the header */}
      <section className="band-sky relative px-5 pb-24 pt-14 text-center md:px-7">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-700">Hi {user?.full_name.split(' ')[0]}!</p>
        <h1 className="mt-4 font-display text-[34px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] text-terra-500 md:text-[52px]">
          Ready to read<br /><span className="font-bold italic normal-case">today?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[460px] text-base font-semibold leading-relaxed text-slate-900 md:text-[17px]">
          Pick a practice adventure, or do a reading check-in with your teacher.
        </p>
        <div className="relative mt-6 flex h-6 justify-center gap-4">
          <Sparkle className="static" size={20} />
          <Sparkle className="static" size={20} delay={1} />
          <Sparkle className="static" size={20} delay={2} />
        </div>
        <Wave fill="#FDF9F2" />
      </section>

      <section className="mx-auto max-w-[1000px] px-5 pb-16 pt-12 md:px-7">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <Link to="/child/practice" className="group text-center">
            <Medallion src={ART.welcome} size={180} className="mx-auto transition group-hover:-translate-y-1" />
            <p className="mb-1.5 mt-5 text-[15px] font-bold uppercase tracking-[0.14em] text-ink-900">Practice</p>
            <p className="mx-auto max-w-[250px] text-sm font-medium leading-relaxed text-ink-600">Words, spelling, reading and stories made for you.</p>
          </Link>

          <Link to="/child/progress" className="group text-center">
            <Medallion src={ART.progress} size={180} className="mx-auto transition group-hover:-translate-y-1" />
            <p className="mb-1.5 mt-5 text-[15px] font-bold uppercase tracking-[0.14em] text-ink-900">My progress</p>
            <p className="mx-auto max-w-[250px] text-sm font-medium leading-relaxed text-ink-600">See your stars and how far you have come.</p>
          </Link>

          <div className="text-center">
            {inProgress
              ? <Link to={`/child/screening/${inProgress.id}`} className="group block">
                  <Medallion src={ART.checkIn} size={180} className="mx-auto transition group-hover:-translate-y-1" />
                </Link>
              : <button onClick={start} disabled={busy} className="group block w-full disabled:opacity-60">
                  <Medallion src={ART.checkIn} size={180} className="mx-auto transition group-hover:-translate-y-1" />
                </button>}
            <p className="mb-1.5 mt-5 text-[15px] font-bold uppercase tracking-[0.14em] text-ink-900">Reading check-in</p>
            <p className="mx-auto max-w-[250px] text-sm font-medium leading-relaxed text-ink-600">
              {inProgress ? 'You have a check-in in progress.' : 'Read letters, words and a short passage out loud. Best done with your teacher.'}
            </p>
            <div className="mt-4">
              {inProgress
                ? <Link to={`/child/screening/${inProgress.id}`} className="btn-sun btn-sm"><PlayCircle className="h-4 w-4" />Continue</Link>
                : <button className="btn-teal btn-sm" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start'}</button>}
            </div>
          </div>
        </div>
      </section>
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
      <h1 className="mb-5 font-display text-[26px] font-bold text-ink-900">Reading check-in</h1>
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
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Your practice</p>
        <h1 className="font-display text-[26px] font-bold text-ink-900 md:text-[34px]">Add joy to your learning</h1>
        <p className="mt-2 text-[15px] font-medium text-ink-600">Choose an adventure below — each one is built from what the last check-in noticed.</p>
        <span className="chip mt-4">✨ add joy &amp; whimsy ✨</span>
      </div>
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
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Stars &amp; streaks</p>
        <h1 className="font-display text-[26px] font-bold text-ink-900 md:text-[34px]">My progress</h1>
      </div>
      <ProgressView childId={child.id} childMode />
    </div>
  )
}
