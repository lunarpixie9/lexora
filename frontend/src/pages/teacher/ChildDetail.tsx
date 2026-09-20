import { ClipboardList, FileText, Pencil, PlayCircle, Sparkles, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PracticeList } from '../../components/Practice'
import ProgressView from '../../components/ProgressView'
import { BandBadge, DemoBadge, ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDateTime } from '../../lib/format'
import type { Child, SessionSummary } from '../../lib/types'
import { ChildForm } from './Children'

type Tab = 'overview' | 'screenings' | 'practice' | 'progress'

/** Shared by the teacher (editable, can screen) and the parent (read-only). */
export default function ChildDetail() {
  const { id } = useParams()
  const childId = Number(id)
  const { user } = useAuth()
  const nav = useNavigate()
  const isTeacher = user?.role === 'teacher'
  const base = isTeacher ? '/teacher' : '/parent'
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () => Promise.all([api.child(childId), api.childSessions(childId)]).then(([c, s]) => { setChild(c); setSessions(s) }).catch((e) => setError(e.message))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [childId])

  const discard = async (sessionId: number) => {
    if (!window.confirm('Discard this unfinished screening? Its answers and recordings will be deleted.')) return
    try { await api.discardScreening(sessionId); await load() } catch (e) { setError((e as Error).message) }
  }

  const startScreening = async () => {
    setBusy(true)
    try { const s = await api.createScreening(childId); nav(`/teacher/screening/${s.id}`) }
    catch (e) { setError((e as Error).message); setBusy(false) }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!child || !sessions) return <Spinner />
  const inProgress = sessions.find((s) => s.status === 'in_progress')
  const latest = sessions.find((s) => s.status === 'completed')

  const TABS: { id: Tab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'screenings', label: `Screenings (${sessions.length})` }, { id: 'practice', label: 'Practice' }, { id: 'progress', label: 'Progress' }]

  return (
    <div>
      <PageHeader eyebrow={isTeacher ? 'Child profile' : 'Your child'} title={child.first_name}
        subtitle={`Age ${child.age} · Class ${child.class_grade} · ${child.home_language} at home${child.notes ? ` · ${child.notes}` : ''}`}
        actions={isTeacher && (
          <>
            <button className="btn-ghost" onClick={() => setEdit(!edit)}><Pencil className="h-4 w-4" />Edit</button>
            {inProgress ? <Link to={`/teacher/screening/${inProgress.id}`} className="btn-sun"><PlayCircle className="h-4 w-4" />Resume screening</Link>
              : <button className="btn-primary" onClick={startScreening} disabled={busy}><ClipboardList className="h-4 w-4" />{busy ? 'Starting…' : 'Start screening'}</button>}
          </>
        )} />
      {child.is_demo && <div className="mb-4"><DemoBadge /> <span className="ml-2 text-sm text-navy-500">All results for this child are generated demo content.</span></div>}
      {edit && isTeacher && <ChildForm initial={child} childId={child.id} onDone={() => { setEdit(false); load() }} />}

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-cream-200 p-1">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.id ? 'bg-white shadow-card' : 'text-navy-500 hover:text-navy-900'}`}>{t.label}</button>)}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Latest indicator</p>
            <div className="mt-2"><BandBadge band={latest?.band} className="px-3 py-1 text-sm" /></div>
            <p className="mt-2 text-sm text-navy-500">{latest ? `${Math.round((latest.score ?? 0) * 100)} / 100 · ${fmtDateTime(latest.completed_at)}` : 'No completed screening yet.'}</p>
            {latest && <Link to={`${base}/reports/${latest.id}`} className="btn-secondary mt-4"><FileText className="h-4 w-4" />Open report</Link>}
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Practice</p>
            <p className="mt-2 text-sm text-navy-500">Personalised activities built from the error profile of the latest screening.</p>
            <button className="btn-secondary mt-4" onClick={() => setTab('practice')}><Sparkles className="h-4 w-4" />View practice</button>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Progress</p>
            <p className="mt-2 text-sm text-navy-500">Indicator over time, practice scores and skills.</p>
            <button className="btn-secondary mt-4" onClick={() => setTab('progress')}><TrendingUp className="h-4 w-4" />View progress</button>
          </div>
          {child.child_login_email && isTeacher && (
            <div className="card p-5 md:col-span-3 text-sm"><span className="font-bold">Child login:</span> <code className="rounded bg-cream-100 px-1.5 py-0.5">{child.child_login_email}</code> <span className="text-navy-500">(PIN shown when the profile was created{child.is_demo ? '; demo password for demo children' : ''})</span></div>
          )}
        </div>
      )}

      {tab === 'screenings' && (
        sessions.length === 0 ? <p className="text-sm text-navy-500">No screenings yet.</p> : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">Screening #{s.id} <span className="ml-2 text-xs font-semibold text-navy-500">{s.status === 'completed' ? 'completed' : 'in progress'}{s.mode === 'demo' && ' · demo answers'}</span></p>
                  <p className="text-xs text-navy-500">Started {fmtDateTime(s.started_at)}{s.completed_at && ` · completed ${fmtDateTime(s.completed_at)}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <BandBadge band={s.band} />
                  {s.status === 'completed' ? <Link to={`${base}/reports/${s.id}`} className="btn-secondary">Report</Link>
                    : isTeacher && <><Link to={`/teacher/screening/${s.id}`} className="btn-sun">Resume</Link><button className="btn-ghost" onClick={() => discard(s.id)} aria-label="Discard screening"><Trash2 className="h-4 w-4" /></button></>}
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'practice' && <PracticeList childId={childId} canGenerate={true} openHref={(a) => `${base}/practice/${childId}?activity=${a.id}`} />}
      {tab === 'progress' && <ProgressView childId={childId} />}
    </div>
  )
}
