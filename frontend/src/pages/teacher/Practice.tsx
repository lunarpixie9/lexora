import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { KIND_META, PracticeList, SourceBadge } from '../../components/Practice'
import { ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { SKILL_LABEL } from '../../lib/format'
import type { Activity, Child } from '../../lib/types'

/** Teacher/parent view of a child's practice: list, generate, and preview an activity's content. */
export default function PracticePage() {
  const { id } = useParams()
  const childId = Number(id)
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const base = user?.role === 'parent' ? '/parent' : '/teacher'
  const [child, setChild] = useState<Child | null>(null)
  const [preview, setPreview] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activityId = params.get('activity')
  const sessionId = params.get('session')

  useEffect(() => { api.child(childId).then(setChild).catch((e) => setError(e.message)) }, [childId])
  useEffect(() => {
    if (!activityId) return
    api.activity(Number(activityId)).then(setPreview).catch((e) => setError(e.message))
  }, [activityId])
  const shown = activityId ? preview : null

  if (error) return <ErrorBox message={error} />
  if (!child) return <Spinner />

  return (
    <div>
      <PageHeader eyebrow="Personalised practice" title={`Practice for ${child.first_name}`}
        subtitle="Activities are generated from the child's observed error profile. Children complete them from their own login; you can preview everything here."
        actions={<Link to={`${base === '/parent' ? '/parent/child' : '/teacher/children'}/${childId}`} className="btn-ghost">Back to {child.first_name}</Link>} />

      {shown ? (
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${KIND_META[shown.kind].tint}`}>{KIND_META[shown.kind].icon}</div>
              <div><h2 className="text-xl font-bold">{shown.title}</h2><p className="text-sm text-ink-600">{shown.content.instructions}</p></div>
            </div>
            <div className="flex items-center gap-2"><SourceBadge source={shown.source} /><button className="btn-ghost" onClick={() => setParams({})}>Close preview</button></div>
          </div>
          <p className="mt-3 text-xs text-ink-600">Targets: {shown.target_skills.map((s) => SKILL_LABEL[s] ?? s).join(' · ')} · {shown.attempt_count} attempt{shown.attempt_count === 1 ? '' : 's'}{shown.best_score !== null && ` · best ${Math.round(shown.best_score * 100)}%`}</p>
          <div className="mt-5 grid gap-2 text-sm md:grid-cols-2">
            {shown.content.word_choice.map((w, i) => <div key={i} className="rounded-xl bg-cream-100 p-3"><span className="font-bold">{w.answer}</span> <span className="text-ink-600">options: {w.options.join(', ')}</span></div>)}
            {shown.content.spelling.map((w, i) => <div key={i} className="rounded-xl bg-cream-100 p-3"><span className="font-bold">{w.word}</span> <span className="text-ink-600">{w.hint}</span></div>)}
            {shown.content.reading.map((r, i) => <div key={i} className="rounded-xl bg-cream-100 p-3 font-display text-lg">{r.sentence}</div>)}
            {shown.content.story_text && <div className="rounded-xl bg-cream-100 p-3 font-display text-lg leading-relaxed md:col-span-2">{shown.content.story_text}</div>}
            {shown.content.questions.map((q, i) => <div key={i} className="rounded-xl bg-cream-100 p-3"><span className="font-bold">{q.question}</span> <span className="text-ink-600">→ {q.answer} (options: {q.options.join(', ')})</span></div>)}
          </div>
        </div>
      ) : (
        <PracticeList childId={childId} canGenerate={true} sessionId={sessionId ? Number(sessionId) : undefined} openHref={(a) => `${base}/practice/${childId}?activity=${a.id}`} />
      )}
    </div>
  )
}
