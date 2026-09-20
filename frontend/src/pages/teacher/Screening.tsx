import { ClipboardList } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ScreeningRunner from '../../components/ScreeningRunner'
import { BandBadge, DemoBadge, EmptyState, ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import type { Child } from '../../lib/types'

export function NewScreening() {
  const nav = useNavigate()
  const [children, setChildren] = useState<Child[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  useEffect(() => { api.children().then(setChildren).catch((e) => setError(e.message)) }, [])

  const start = async (id: number) => {
    setBusy(id)
    try { const s = await api.createScreening(id); nav(`/teacher/screening/${s.id}`) }
    catch (e) { setError((e as Error).message); setBusy(null) }
  }

  return (
    <div>
      <PageHeader eyebrow="Screening" title="Start a new screening" subtitle="About 10 minutes: an ASER-style reading ladder (letters → words → sentences), a short dictation and one passage read aloud." />
      {error ? <ErrorBox message={error} /> : !children ? <Spinner /> : children.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Add a child first" action={<Link to="/teacher/children?new=1" className="btn-primary">Add child</Link>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {children.map((c) => (
            <li key={c.id} className="card flex items-center gap-4 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender-100 font-display text-xl font-bold text-lavender-600">{c.first_name[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="font-bold">{c.first_name}</p>{c.is_demo && <DemoBadge small />}</div>
                <p className="text-xs text-navy-500">Age {c.age} · Class {c.class_grade} · <BandBadge band={c.latest_band} /></p>
              </div>
              <button className="btn-primary" disabled={busy !== null} onClick={() => start(c.id)}>{busy === c.id ? 'Starting…' : 'Start'}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="card mt-6 p-5 text-sm text-navy-500">
        <p className="font-bold text-navy-900">How the reading ladder is scored</p>
        <p className="mt-1">You mark each item as the ASER examiner would. A level is passed with 4 of 5 items; once a level is failed the higher levels are skipped, exactly as in ASER. You can also record the child — local Whisper gives an advisory judgement, but your mark always wins (on real ASER clips Whisper agrees with examiners 67–80% of the time, least for single letters).</p>
      </div>
    </div>
  )
}

export function RunScreening() {
  const { id } = useParams()
  return (
    <div>
      <PageHeader eyebrow="Screening in progress" title="Guided screening" subtitle="Sit with the child. Read the instruction under each task." />
      <ScreeningRunner sessionId={Number(id)} mode="teacher" />
    </div>
  )
}
