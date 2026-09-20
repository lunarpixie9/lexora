import { Heart, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
      <PageHeader eyebrow="Parent" title={`Welcome, ${user?.full_name.split(' ')[0]}`} subtitle="Follow your child's screening observations, progress and practice." />
      {children.length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No child linked yet" body="Ask your child's teacher to link this email address to their profile." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {children.map((c) => (
            <li key={c.id}>
              <Link to={`/parent/child/${c.id}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sun-100 font-display text-2xl font-bold text-sun-700">{c.first_name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><p className="text-lg font-bold">{c.first_name}</p>{c.is_demo && <DemoBadge small />}</div>
                  <p className="text-sm text-navy-500">Age {c.age} · Class {c.class_grade} · {c.sessions_completed} screening{c.sessions_completed === 1 ? '' : 's'}</p>
                  <div className="mt-2"><BandBadge band={c.latest_band} /></div>
                </div>
                <TrendingUp className="h-5 w-5 text-navy-500" />
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
