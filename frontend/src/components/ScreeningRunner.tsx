import { Check, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { LADDER_LABEL } from '../lib/format'
import type { ScreeningSession, Task } from '../lib/types'
import { RecorderControl, SpeakButton, useRecorder } from './Recorder'
import { Disclaimer, ErrorBox, ListeningStatus, ProgressBar, Spinner } from './ui'

type Mode = 'teacher' | 'child'

const KIND_INTRO: Record<Task['kind'], { title: string; child: string; teacher: string }> = {
  reading: { title: 'Reading', child: 'Read what you see out loud, then tap the microphone to stop.', teacher: 'Ask the child to read the item aloud, then mark it — exactly as in the ASER assessment.' },
  writing: { title: 'Writing', child: 'Listen, then type what you hear.', teacher: 'Say the word or sentence aloud (or use “Hear it”), then let the child type it.' },
  speech: { title: 'Speaking', child: 'Read the whole passage out loud.', teacher: 'Record the child reading the passage. Whisper transcribes it locally.' },
}

interface PendingUpload { taskId: number; blob: Blob; filename: string; duration: number; error?: string }

/** Server responses can arrive out of order while uploads run in the background;
 *  a task that is already answered/skipped locally must never revert to pending. */
function mergeSession(prev: ScreeningSession | null, next: ScreeningSession): ScreeningSession {
  if (!prev || prev.id !== next.id) return next
  const tasks = next.tasks.map((t) => {
    const old = prev.tasks.find((o) => o.id === t.id)
    return old && old.status !== 'pending' && t.status === 'pending' ? old : t
  })
  const progress = {
    total: tasks.length,
    answered: tasks.filter((t) => t.status === 'answered').length,
    skipped: tasks.filter((t) => t.status === 'skipped').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
  }
  return { ...next, tasks, progress, mode: prev.mode === 'demo' ? 'demo' : next.mode }
}

export default function ScreeningRunner({ sessionId, mode }: { sessionId: number; mode: Mode }) {
  const nav = useNavigate()
  const [session, setSessionRaw] = useState<ScreeningSession | null>(null)
  const setSession = useCallback((next: ScreeningSession) => setSessionRaw((prev) => mergeSession(prev, next)), [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  // Child-mode reading items are uploaded in the background so the child is never
  // left staring at a spinner while Whisper runs (~5 s per clip on CPU).
  const [pending, setPending] = useState<PendingUpload[]>([])
  const uploading = useRef(false)

  const load = useCallback(() => api.screening(sessionId).then(setSession).catch((e) => setError(e.message)), [sessionId, setSession])
  useEffect(() => { load() }, [load])

  const current = useMemo(() => {
    if (!session) return null
    const inFlight = new Set(pending.map((p) => p.taskId))
    return session.tasks.find((t) => t.status === 'pending' && !inFlight.has(t.id)) ?? null
  }, [session, pending])
  const done = session ? session.progress.answered + session.progress.skipped : 0
  const total = session?.progress.total ?? 1

  // Sequential background uploader: one at a time, in order; failures stay in the queue for retry.
  useEffect(() => {
    const next = pending.find((p) => !p.error)
    if (!next || uploading.current) return
    uploading.current = true
    api.submitAudio(sessionId, next.taskId, next.blob, next.filename, next.duration)
      .then((s) => { setSession(s); setPending((q) => q.filter((p) => p.taskId !== next.taskId)) })
      .catch((e) => setPending((q) => q.map((p) => p.taskId === next.taskId ? { ...p, error: e instanceof ApiError ? e.message : 'Upload failed' } : p)))
      .finally(() => { uploading.current = false; setPending((q) => [...q]) })
  }, [pending, sessionId, setSession])

  const run = async (label: string, fn: () => Promise<ScreeningSession>) => {
    setBusy(label); setError(null)
    try { setSession(await fn()) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Request failed') }
    finally { setBusy(null) }
  }

  const finish = async () => {
    setBusy('Analysing the whole screening…'); setError(null)
    try {
      const report = await api.complete(sessionId)
      if (mode === 'teacher') nav(`/teacher/reports/${report.session_id}`)
      else setFinished(true)
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not complete') }
    finally { setBusy(null) }
  }

  if (error && !session) return <ErrorBox message={error} onRetry={load} />
  if (!session) return <Spinner label="Loading screening…" />

  if (finished) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-teal-500" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold">All done, {session.child_name}!</h2>
        <p className="mt-2 text-navy-500">Great effort. Your teacher can see how it went. Ready for some practice?</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-teal btn-lg" onClick={() => nav('/child/practice')}><Sparkles className="h-4 w-4" />Go to practice</button>
          <button className="btn-secondary btn-lg" onClick={() => nav('/child/home')}>Home</button>
        </div>
      </div>
    )
  }

  if (session.status === 'completed') {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-bold">This screening is complete</h2>
        {mode === 'teacher' && <button className="btn-primary mt-4" onClick={() => nav(`/teacher/reports/${session.id}`)}>Open report</button>}
      </div>
    )
  }

  const failed = pending.filter((p) => p.error)
  const inFlight = pending.length - failed.length
  const canFinish = pending.length === 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between text-sm font-bold text-navy-500">
        <span>{session.child_name} {session.mode === 'demo' && <span className="badge ml-1 bg-sun-100 text-sun-700">demo answers</span>}</span>
        <span aria-live="polite">{done} / {total}{inFlight > 0 && <span className="ml-2 font-semibold text-teal-700"><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />listening to {inFlight}</span>}</span>
      </div>
      <ProgressBar value={done / total} className="mb-6" />

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {failed.length > 0 && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-coral-500/30 bg-coral-100/50 p-4 text-sm" role="alert">
          <p><strong>{failed.length} recording{failed.length > 1 ? 's' : ''} could not be analysed.</strong> {failed[0].error}</p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setPending((q) => q.map((p) => ({ ...p, error: undefined })))}><RefreshCw className="h-4 w-4" />Retry</button>
            <button className="btn-ghost" onClick={() => setPending((q) => q.filter((p) => !p.error))}>Skip them</button>
          </div>
        </div>
      )}

      {current ? (
        <TaskCard key={current.id} task={current} mode={mode} busy={busy} session={session}
          onText={(txt) => run('Checking spelling…', () => api.submitText(session.id, current.id, txt))}
          onAudio={(blob, name, dur) => {
            if (mode === 'child' && current.kind === 'reading') {
              setPending((q) => [...q, { taskId: current.id, blob, filename: name, duration: dur }])
            } else {
              run('Listening…', () => api.submitAudio(session.id, current.id, blob, name, dur))
            }
          }}
          onMark={(correct, mistakes, dur) => run('Saving…', () => api.markItem(session.id, current.id, { correct, mistakes, duration_seconds: dur }))}
        />
      ) : (
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">{canFinish ? 'Every task is answered' : 'Nearly there…'}</h2>
          <p className="mt-1 text-navy-500">
            {!canFinish && `Still listening to ${inFlight} recording${inFlight > 1 ? 's' : ''}. `}
            {session.progress.skipped > 0 && `${session.progress.skipped} reading items were skipped because the ladder stopped early, as in ASER. `}
            {canFinish && (mode === 'teacher' ? 'Analyse the session to produce the screening indicator.' : 'Tap finish to see how you did.')}
          </p>
          <button className="btn-primary btn-lg mt-6" onClick={finish} disabled={!!busy || !canFinish}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{busy}</> : !canFinish ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Waiting for recordings</> : 'Finish and analyse'}
          </button>
        </div>
      )}

      {mode === 'teacher' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-cream-300 p-4 text-sm">
          <p className="text-navy-500">Presenting without a child or microphone? Fill the remaining tasks with clearly-labelled demo answers.</p>
          <div className="flex gap-2">
            <button className="btn-sun" disabled={!!busy || !current} onClick={() => run('Filling demo answers…', () => api.demoFill(session.id))}>Fill with demo answers</button>
            {done > 0 && current && <button className="btn-secondary" disabled={!!busy || !canFinish} onClick={finish}>Finish early</button>}
          </div>
        </div>
      )}
      <div className="mt-6"><Disclaimer compact /></div>
    </div>
  )
}

function TaskCard({ task, mode, busy, session, onText, onAudio, onMark }: {
  task: Task; mode: Mode; busy: string | null; session: ScreeningSession
  onText: (t: string) => void
  onAudio: (b: Blob, name: string, duration: number) => void
  onMark: (correct: boolean, mistakes: number, duration: number) => void
}) {
  const rec = useRecorder()
  const [text, setText] = useState('')
  const [reveal, setReveal] = useState(mode === 'teacher')
  const [mistakes, setMistakes] = useState(1)
  const shownAt = useRef(Date.now())
  const intro = KIND_INTRO[task.kind]
  const levelLabel = LADDER_LABEL[task.item_level] ?? task.item_level
  const idxInKind = session.tasks.filter((t) => t.kind === task.kind && t.order_index <= task.order_index).length
  const totalInKind = session.tasks.filter((t) => t.kind === task.kind && t.status !== 'skipped').length
  const elapsed = () => (Date.now() - shownAt.current) / 1000

  // child reading: hand the recording off as soon as it exists (queued in the background)
  useEffect(() => {
    if (mode === 'child' && task.kind === 'reading' && rec.result) onAudio(rec.result.blob, rec.result.filename, rec.result.duration)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.result])

  const isLetter = task.item_level === 'CL' || task.item_level === 'SL'
  const promptClass = isLetter ? 'text-8xl md:text-9xl' : task.item_level === 'W' ? 'text-6xl md:text-7xl' : task.kind === 'speech' ? 'text-2xl md:text-3xl leading-relaxed' : 'text-3xl md:text-4xl'

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-cream-200 bg-cream-50 px-5 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{intro.title} · {levelLabel}</p>
          <p className="text-sm text-navy-500">{mode === 'child' ? intro.child : intro.teacher}</p>
        </div>
        <span className="badge bg-lavender-100 text-lavender-600">{idxInKind} of {totalInKind}</span>
      </div>

      <div className="px-5 py-8 md:px-8">
        {task.kind === 'writing' ? (
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <SpeakButton text={task.prompt_text} className="btn-lg" />
              {mode === 'teacher' && (
                <button type="button" className="btn-ghost" onClick={() => setReveal(!reveal)}>{reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{reveal ? 'Hide from child' : 'Show to examiner'}</button>
              )}
            </div>
            {reveal && mode === 'teacher' && <p className="mt-4 rounded-xl bg-cream-100 px-4 py-2 font-display text-2xl">{task.prompt_text}</p>}
            <form className="mx-auto mt-6 max-w-md" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onText(text.trim()) }}>
              <label className="label text-left" htmlFor="answer">Type what you heard</label>
              <input id="answer" className="input text-center font-display text-2xl" autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
                value={text} onChange={(e) => setText(e.target.value)} disabled={!!busy} />
              <button className="btn-primary btn-lg mt-4 w-full" disabled={!!busy || !text.trim()}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{busy}</> : <>Next <Check className="h-4 w-4" /></>}</button>
            </form>
          </div>
        ) : (
          <>
            <p className={`text-center font-display font-bold text-navy-900 ${promptClass}`} lang="en">{task.prompt_text}</p>
            <p className="mt-2 text-center text-xs text-navy-500">Item from the {task.prompt_source} assessment</p>

            {task.kind === 'reading' && mode === 'teacher' ? (
              <div className="mt-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="btn-teal btn-lg" disabled={!!busy} onClick={() => onMark(true, 0, elapsed())}><Check className="h-5 w-5" />Read correctly</button>
                  <button className="btn-secondary btn-lg" disabled={!!busy} onClick={() => onMark(false, isLetter ? 1 : mistakes, elapsed())}><X className="h-5 w-5" />Not correct</button>
                </div>
                {!isLetter && (
                  <fieldset className="mt-3 flex items-center justify-center gap-2 text-sm text-navy-500">
                    <legend className="sr-only">Number of mistakes if not correct</legend>
                    <span>If not correct, mistakes:</span>
                    {[1, 2, 3, 4].map((n) => (
                      <button type="button" key={n} onClick={() => setMistakes(n)} aria-pressed={mistakes === n}
                        className={`h-8 w-8 rounded-lg text-sm font-bold ${mistakes === n ? 'bg-navy-900 text-white' : 'bg-cream-100 hover:bg-cream-200'}`}>{n === 4 ? '4+' : n}</button>
                    ))}
                  </fieldset>
                )}
                <details className="mt-4 text-sm text-navy-500">
                  <summary className="cursor-pointer font-bold">Optionally record the child (Whisper judges too)</summary>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    <RecorderControl rec={rec} />
                    {rec.result && <button className="btn-primary" disabled={!!busy} onClick={() => onAudio(rec.result!.blob, rec.result!.filename, rec.result!.duration)}>Upload &amp; let Whisper judge</button>}
                  </div>
                </details>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-4">
                {busy ? (
                  <ListeningStatus label={busy} />
                ) : (
                  <>
                    <RecorderControl rec={rec} big label="Record" />
                    {task.kind === 'speech' && rec.result && (
                      <button className="btn-primary btn-lg" onClick={() => onAudio(rec.result!.blob, rec.result!.filename, rec.result!.duration)}>Send recording</button>
                    )}
                    {mode === 'teacher' && task.kind === 'speech' && (
                      <p className="max-w-md text-center text-xs text-navy-500">If Whisper is unavailable on this machine the server falls back to a clearly-labelled demo transcriber.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
