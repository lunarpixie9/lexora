import { Heart, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ART } from '../../components/decor'
import ProgressView from '../../components/ProgressView'
import { BandBadge, DemoBadge, Disclaimer, EmptyState, ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Child } from '../../lib/types'

export function ParentDashboard() {
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = () => api.children().then(setChildren).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!children) return <Spinner />
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="eyebrow mb-1.5">Parent</p>
          <h1 className="font-display text-[26px] font-bold leading-tight text-ink-900 md:text-[34px]">Welcome, {user?.full_name.split(' ')[0]}</h1>
          <p className="mt-2 max-w-[580px] text-[15px] font-medium leading-relaxed text-ink-600">
            Follow your child's screening observations, progress and practice.
          </p>
        </div>
        <div className="medallion-sm hidden h-32 w-32 shrink-0 sm:grid" aria-hidden>
          <img src={ART.family} alt="" />
        </div>
      </div>
      {children.length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No child linked yet" body="Ask your child's teacher to link this email address to their profile." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {children.map((c) => (
            <li key={c.id}>
              <Link to={`/parent/child/${c.id}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="avatar-hatch grid h-14 w-14 shrink-0 place-items-center rounded-full font-display text-2xl font-bold text-terra-500">{c.first_name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="text-lg font-bold text-ink-900">{c.first_name}</p>{c.is_demo && <DemoBadge small />}</div>
                  <p className="text-sm font-medium text-ink-500">Age {c.age} · Class {c.class_grade} · {c.sessions_completed} screening{c.sessions_completed === 1 ? '' : 's'}</p>
                  <div className="mt-2"><BandBadge band={c.latest_band} /></div>
                </div>
                <TrendingUp className="h-5 w-5 shrink-0 text-terra-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8"><Disclaimer /></div>
    </div>
  )
}

export function ParentProgress() {
  const { id } = useParams()
  const [child, setChild] = useState<Child | null>(null)
  useEffect(() => { api.child(Number(id)).then(setChild).catch(() => null) }, [id])
  return (
    <div>
      <PageHeader eyebrow="Progress" title={child ? `${child.first_name}’s progress` : 'Progress'} actions={<Link to={`/parent/child/${id}`} className="btn-ghost">Back</Link>} />
      <ProgressView childId={Number(id)} />
    </div>
  )
}
