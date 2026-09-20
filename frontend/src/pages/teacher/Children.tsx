import { KeyRound, Plus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BandBadge, DemoBadge, EmptyState, ErrorBox, PageHeader, Spinner } from '../../components/ui'
import { api, ApiError } from '../../lib/api'
import type { Child } from '../../lib/types'

const CONSENT = 'A parent or guardian has agreed that this child may take part in Lexora’s educational literacy screening and practice. Results are screening observations, not a diagnosis.'

export default function Children() {
  const [params, setParams] = useSearchParams()
  const [children, setChildren] = useState<Child[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(params.get('new') === '1')
  const [created, setCreated] = useState<{ child: Child; child_login: { email: string; pin: string } } | null>(null)
  const load = () => api.children().then(setChildren).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader eyebrow="Teacher" title="Children" subtitle="Profiles you screen and support. Parents you link can follow progress; children get a PIN login for practice."
        actions={<button className="btn-primary" onClick={() => { setShowForm(!showForm); setParams({}) }}>{showForm ? <><X className="h-4 w-4" />Close</> : <><Plus className="h-4 w-4" />Add child</>}</button>} />

      {created && (
        <div className="card mb-6 border-teal-300 bg-teal-100/40 p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-teal-700" />
            <div className="text-sm">
              <p className="font-bold">{created.child.first_name}’s login — shown once, please note it down</p>
              <p className="mt-1">Email <code className="rounded bg-white px-1.5 py-0.5">{created.child_login.email}</code> · PIN <code className="rounded bg-white px-1.5 py-0.5 font-bold">{created.child_login.pin}</code></p>
            </div>
            <button className="btn-ghost ml-auto p-1" onClick={() => setCreated(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {showForm && <ChildForm onDone={(res) => { setCreated(res); setShowForm(false); load() }} />}

      {error ? <ErrorBox message={error} onRetry={load} /> : !children ? <Spinner /> : children.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No children yet" body="Add a child to begin." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-left text-xs uppercase tracking-wider text-navy-500">
              <tr><th className="px-4 py-3">Child</th><th className="px-4 py-3">Age / class</th><th className="px-4 py-3">Language</th><th className="px-4 py-3">Screenings</th><th className="px-4 py-3">Latest indicator</th><th className="px-4 py-3">Login</th></tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id} className="border-t border-cream-200 hover:bg-cream-50">
                  <td className="px-4 py-3"><Link to={`/teacher/children/${c.id}`} className="font-bold text-navy-900 hover:text-teal-700">{c.first_name}</Link>{c.is_demo && <span className="ml-2"><DemoBadge small /></span>}</td>
                  <td className="px-4 py-3">{c.age} · class {c.class_grade}</td>
                  <td className="px-4 py-3">{c.home_language}</td>
                  <td className="px-4 py-3">{c.sessions_completed}</td>
                  <td className="px-4 py-3"><BandBadge band={c.latest_band} /></td>
                  <td className="px-4 py-3 text-xs text-navy-500">{c.child_login_email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ChildForm({ onDone, initial, childId }: { onDone: (res: { child: Child; child_login: { email: string; pin: string } }) => void; initial?: Child; childId?: number }) {
  const [form, setForm] = useState({ first_name: initial?.first_name ?? '', age: initial?.age ?? 7, class_grade: initial?.class_grade ?? 2, home_language: initial?.home_language ?? 'Hindi', notes: initial?.notes ?? '', parent_email: '', consent: !!initial })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upd = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const payload = { first_name: form.first_name, age: Number(form.age), class_grade: Number(form.class_grade), home_language: form.home_language, notes: form.notes, parent_email: form.parent_email || null, consent_statement: form.consent ? CONSENT : null }
      if (childId) { const child = await api.updateChild(childId, payload); onDone({ child, child_login: { email: '', pin: '' } }) }
      else onDone(await api.createChild(payload))
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save') }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="card mb-6 grid gap-4 p-5 md:grid-cols-2">
      <div><label className="label" htmlFor="fn">First name</label><input id="fn" className="input" required value={form.first_name} onChange={(e) => upd('first_name', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="age">Age</label><input id="age" className="input" type="number" min={4} max={16} required value={form.age} onChange={(e) => upd('age', e.target.value)} /></div>
        <div><label className="label" htmlFor="cls">Class</label><select id="cls" className="input" value={form.class_grade} onChange={(e) => upd('class_grade', e.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="lang">Home language</label><select id="lang" className="input" value={form.home_language} onChange={(e) => upd('home_language', e.target.value)}>{['Hindi', 'Marathi', 'Telugu', 'Tamil', 'Kannada', 'Bengali', 'Gujarati', 'Punjabi', 'Malayalam', 'Odia', 'English', 'Other'].map((l) => <option key={l}>{l}</option>)}</select></div>
      <div><label className="label" htmlFor="pe">Parent email (optional — must already have a parent account)</label><input id="pe" className="input" type="email" placeholder="parent@lexora.demo" value={form.parent_email} onChange={(e) => upd('parent_email', e.target.value)} /></div>
      <div className="md:col-span-2"><label className="label" htmlFor="notes">Notes</label><textarea id="notes" className="input" rows={2} value={form.notes} onChange={(e) => upd('notes', e.target.value)} /></div>
      {!childId && (
        <label className="flex items-start gap-3 text-sm md:col-span-2">
          <input type="checkbox" className="mt-1 h-4 w-4" required checked={form.consent} onChange={(e) => upd('consent', e.target.checked)} />
          <span>{CONSENT}</span>
        </label>
      )}
      {error && <p className="text-sm font-semibold text-coral-500 md:col-span-2" role="alert">{error}</p>}
      <div className="md:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : childId ? 'Save changes' : 'Create child profile'}</button></div>
    </form>
  )
}
