import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { LEVEL_LABEL, fmtDate, pct } from '../lib/format'
import type { Progress } from '../lib/types'
import { PracticeBars, ScoreTrend } from './charts'
import { BandBadge, EmptyState, ErrorBox, ProgressBar, Section, Spinner, Stat } from './ui'
import { TrendingUp } from 'lucide-react'

export default function ProgressView({ childId, childMode = false }: { childId: number; childMode?: boolean }) {
  const [data, setData] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = () => api.progress(childId).then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [childId])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!data) return <Spinner />
  const last = data.screenings.at(-1)
  const skills = Object.entries(data.skills)

  if (!data.screenings.length && !data.practice.length) {
    return <EmptyState icon={<TrendingUp className="h-6 w-6" />} title={childMode ? 'Nothing here yet' : 'No progress recorded yet'} body={childMode ? 'Finish a screening or a practice activity and your progress will appear here.' : 'Complete a screening or practice activity to start tracking progress.'} />
  }

  return (
    <div className="space-y-6">
      {!childMode && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Screenings" value={data.screenings.length} hint={last ? `latest ${fmtDate(last.date)}` : undefined} />
          <Stat label="Latest indicator" value={last ? <BandBadge band={last.band} className="text-sm" /> : '—'} hint={last ? `${Math.round(last.score * 100)} / 100` : undefined} />
          <Stat label="Reading level" value={last ? LEVEL_LABEL[last.reading_level] ?? last.reading_level : '—'} hint={last ? `typical for class: ${LEVEL_LABEL[last.expected_level] ?? last.expected_level}` : undefined} />
        </div>
      )}

      {data.screenings.length > 0 && (
        <Section title={childMode ? 'My screenings' : 'Screening indicator over time'}>
          {data.screenings.length > 1 ? <ScoreTrend screenings={data.screenings} /> : (
            <p className="text-sm text-navy-500">One screening so far ({fmtDate(data.screenings[0].date)}, indicator {Math.round(data.screenings[0].score * 100)}/100). A second screening will show a trend.</p>
          )}
          {!childMode && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-navy-500"><tr><th className="py-1 pr-3">Date</th><th className="pr-3">Indicator</th><th className="pr-3">Reading level</th><th className="pr-3">Reading acc.</th><th className="pr-3">Spelling acc.</th><th>Rate</th></tr></thead>
                <tbody>
                  {data.screenings.map((s) => (
                    <tr key={s.session_id} className="border-t border-cream-200">
                      <td className="py-2 pr-3">{fmtDate(s.date)}{s.mode === 'demo' && <span className="ml-1 text-xs text-sun-700">demo</span>}</td>
                      <td className="pr-3"><BandBadge band={s.band} /> <span className="text-navy-500">{Math.round(s.score * 100)}</span></td>
                      <td className="pr-3">{LEVEL_LABEL[s.reading_level] ?? s.reading_level}</td>
                      <td className="pr-3">{pct(s.reading_accuracy)}</td>
                      <td className="pr-3">{pct(s.spelling_accuracy)}</td>
                      <td>{s.words_per_minute ? `${Math.round(s.words_per_minute)} wpm` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {data.practice.length > 0 && (
        <Section title={childMode ? 'My practice' : 'Practice attempts'}>
          <PracticeBars practice={data.practice} />
        </Section>
      )}

      {skills.length > 0 && (
        <Section title={childMode ? 'Skills I am building' : 'Skills practised'}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {skills.map(([k, s]) => (
              <li key={k} className="rounded-xl bg-cream-100 p-3">
                <div className="flex justify-between text-sm"><span className="font-bold">{s.label}</span><span className="text-navy-500">{s.attempts} {s.attempts === 1 ? 'attempt' : 'attempts'}</span></div>
                <ProgressBar value={s.latest} className="mt-2" color="bg-lavender-600" />
                <p className="mt-1 text-xs text-navy-500">latest {pct(s.latest)} · average {pct(s.average)}{s.trend !== 0 && ` · ${s.trend > 0 ? '▲' : '▼'} ${Math.abs(Math.round(s.trend * 100))} pts since first`}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
