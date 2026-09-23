import { ClipboardList, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ART, Sparkle } from '../../components/decor'
import { BandBadge, DemoBadge, EmptyState, ErrorBox, PageHeader, Spinner, Stat } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Child, Health } from '../../lib/types'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[] | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(() => { try { return localStorage.getItem('lexora.tour') !== 'done' } catch { return true } })
  const isDemoTeacher = user?.email.endsWith('@lexora.demo')
  const load = () => api.children().then(setChildren).catch((e) => setError(e.message))
  useEffect(() => { load(); api.health().then(setHealth).catch(() => null) }, [])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!children) return <Spinner />
  const screened = children.filter((c) => c.sessions_completed > 0)
  const attention = children.filter((c) => c.latest_band && c.latest_band !== 'few_signals')

  return (
    <div>
      <PageHeader eyebrow="Teacher" title={`Hello, ${user?.full_name.split(' ')[0]}`} subtitle="Screen, understand and support each child's literacy — one coherent flow."
        actions={<><Link to="/teacher/children?new=1" className="btn-secondary"><Plus className="h-4 w-4" />Add child</Link><Link to="/teacher/screening/new" className="btn-primary"><ClipboardList className="h-4 w-4" />New screening</Link></>} />

      {isDemoTeacher && showTour && children.length > 0 && (
        <div className="panel-dashed relative mb-6 rounded-[20px] p-6">
          <button className="absolute right-4 top-3.5 text-sm font-bold text-ink-500 hover:text-ink-900" aria-label="Dismiss walkthrough" onClick={() => { setShowTour(false); try { localStorage.setItem('lexora.tour', 'done') } catch { /* ignore */ } }}>✕</button>
          <p className="eyebrow mb-4">Demo walkthrough</p>
          <ol className="grid gap-3.5 text-[13px] font-medium leading-[1.6] text-ink-600 md:grid-cols-3">
            <li className="rounded-[14px] bg-cream-200 p-4"><span className="font-bold text-ink-900">1 · See a finished result.</span> Open <Link className="text-teal-700 underline" to={`/teacher/children/${children[0].id}`}>{children[0].first_name}</Link> — two generated screenings, a report, practice and a progress trend.</li>
            <li className="rounded-[14px] bg-cream-200 p-4"><span className="font-bold text-ink-900">2 · Run one live.</span> <Link className="text-teal-700 underline" to="/teacher/screening/new">Start a screening</Link> for {children[1]?.first_name ?? 'a child'}: mark a few reading items, then “Fill with demo answers” → “Finish and analyse”.</li>
            <li className="rounded-[14px] bg-cream-200 p-4"><span className="font-bold text-ink-900">3 · Switch roles.</span> Sign out and use the <strong>child</strong> demo login to complete a practice activity, or the <strong>parent</strong> login to see the family view.</li>
          </ol>
          <p className="mt-3.5 text-xs font-medium text-ink-500">Everything for the demo children is generated demo content and labelled as such.</p>
        </div>
      )}
      <div className="relative mb-6 grid h-[158px] place-items-center overflow-hidden rounded-3xl bg-mint-100 shadow-[0_0_0_7px_#fff,0_10px_28px_rgb(74_65_57_/_0.13)]" aria-hidden>
        <Sparkle className="left-6 top-5" size={18} />
        <Sparkle className="bottom-5 right-7" size={14} delay={1.4} />
        <img src={ART.classroom} alt="" className="absolute inset-0 h-full w-full rounded-[inherit] object-cover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Children" value={children.length} hint={`${screened.length} screened`} />
        <Stat label="May warrant observation" value={attention.length} hint="some or multiple signals in latest screening" />
        <Stat label="Speech engine" value={health ? (health.whisper.state === 'unavailable' ? 'Demo fallback' : 'Whisper (local)') : '…'} hint={health ? `${health.whisper.state}${health.whisper.model ? ` · ${health.whisper.model}` : ''}` : undefined} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-[22px] font-bold text-ink-900">Your children</h2>
        <Link to="/teacher/children" className="text-xs font-bold uppercase tracking-[0.12em] text-terra-500 hover:text-terra-600">View all</Link>
      </div>
      {children.length === 0 ? (
        <div className="mt-3"><EmptyState icon={<Users className="h-6 w-6" />} title="No children yet" body="Add a child profile to start a screening." action={<Link to="/teacher/children?new=1" className="btn-primary">Add a child</Link>} /></div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {children.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link to={`/teacher/children/${c.id}`} className="card flex items-center gap-4 p-[18px] transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="avatar-hatch grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full font-display text-[19px] font-bold text-terra-500">{c.first_name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="truncate text-base font-bold text-ink-900">{c.first_name}</p>{c.is_demo && <DemoBadge small />}</div>
                  <p className="mt-0.5 text-xs font-medium text-ink-500">Age {c.age} · Class {c.class_grade} · {c.sessions_completed} screening{c.sessions_completed === 1 ? '' : 's'}</p>
                </div>
                <BandBadge band={c.latest_band} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
