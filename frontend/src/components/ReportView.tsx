import { BookOpen, Check, Ear, PenLine, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BAND_SHORT, LEVEL_LABEL, PATTERN_LABEL, SKILL_LABEL, fmtDate, fmtDateTime, pct, phones } from '../lib/format'
import type { Report, WordError } from '../lib/types'
import { ContributionBars, IndicatorDial } from './charts'
import { DemoBadge, Disclaimer, Section } from './ui'

function WordErrors({ errors }: { errors: WordError[] }) {
  if (!errors.length) return <span className="text-teal-700">no errors</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {errors.map((w, i) => (
        <li key={i} className="rounded-lg bg-cream-100 px-2 py-1 text-xs" title={w.patterns.map((p) => PATTERN_LABEL[p] ?? p).join(', ')}>
          <span className="font-bold">{w.expected ?? '∅'}</span> → <span className={w.actual ? 'text-coral-500' : 'text-navy-500'}>{w.actual ?? 'omitted'}</span>
        </li>
      ))}
    </ul>
  )
}

/** Transcript with low-confidence words flagged so a teacher knows where to listen. */
function ConfidentTranscript({ text, words }: { text: string; words?: { text: string; confidence: number }[] }) {
  if (!words || words.length === 0) return <>{text || <em>nothing recognised</em>}</>
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className={w.confidence < 0.6 ? 'rounded bg-sun-100 px-0.5 underline decoration-sun-700 decoration-dotted' : ''}
          title={w.confidence < 0.6 ? `Whisper was unsure (${Math.round(w.confidence * 100)}%)` : undefined}>{w.text}{' '}</span>
      ))}
    </>
  )
}

export default function ReportView({ report, practiceHref, onRemark, onCorrectTranscript }: {
  report: Report
  practiceHref?: string
  /** Teacher-only: override a reading item's mark; the session is re-scored by the server. */
  onRemark?: (taskId: number, correct: boolean) => Promise<void>
  /** Teacher-only: replace Whisper's transcript with what the child actually said. */
  onCorrectTranscript?: (taskId: number, transcript: string) => Promise<void>
}) {
  const { indicator, reading, writing, speech, error_profile } = report
  const [remarking, setRemarking] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const isDemo = indicator.session_mode === 'demo'
  const patterns = Object.entries(writing.pattern_counts ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="card grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <IndicatorDial score={indicator.score} bandLabel={indicator.band_label} band={indicator.band} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Screening indicator</p>
            {isDemo && <DemoBadge small />}
          </div>
          <h2 className="mt-1 text-2xl font-bold">{report.child.first_name} · age {report.child.age} · class {report.child.class_grade}</h2>
          <p className="text-sm text-navy-500">Screened {fmtDateTime(report.generated_at)} · {indicator.version}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {report.narrative.map((line, i) => <li key={i} className={i === 0 ? 'font-bold' : ''}>{line}</li>)}
          </ul>
          {report.previous && (
            <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-sm">
              <span className="font-bold">Since the previous screening ({fmtDate(report.previous.date)}):</span>{' '}
              indicator {Math.round(report.previous.score * 100)} → {Math.round(indicator.score * 100)}
              {report.previous.score_change < -0.005 ? ' (fewer signals)' : report.previous.score_change > 0.005 ? ' (more signals)' : ' (no change)'}
              {' · '}{BAND_SHORT[report.previous.band] ?? report.previous.band} → {BAND_SHORT[indicator.band] ?? indicator.band}
              {report.previous.reading_level !== reading.level && reading.level && ` · reading level ${LEVEL_LABEL[report.previous.reading_level] ?? report.previous.reading_level} → ${LEVEL_LABEL[reading.level] ?? reading.level}`}
            </p>
          )}
        </div>
      </div>

      <Disclaimer />

      {/* Contributions */}
      <Section title="What contributed to the indicator" aside={<span className="text-xs text-navy-500">exact additive shares, in points of 100</span>}>
        {report.features.length ? <ContributionBars signals={report.features} /> : <p className="text-sm text-navy-500">No signals available.</p>}
        <p className="mt-3 text-xs text-navy-500">Each bar is weight × signal strength. Signals whose task was not completed are excluded and the remaining weights renormalised. These are observed patterns, not diagnostic categories.</p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reading */}
        <Section title="Reading ladder" aside={<BookOpen className="h-5 w-5 text-teal-700" />}>
          {reading.level ? (
            <>
              <p className="text-sm">Estimated level <strong>{LEVEL_LABEL[reading.level] ?? reading.level}</strong>; typical for class {reading.class_grade} in ASER data: <strong>{LEVEL_LABEL[reading.expected_level_for_class ?? ''] ?? reading.expected_level_for_class}</strong>.</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {(['CL', 'SL', 'W', 'S'] as const).map((l) => {
                  const acc = reading[`accuracy_${l}` as keyof typeof reading] as number | null | undefined
                  return (
                    <div key={l} className="rounded-xl bg-cream-100 px-3 py-2">
                      <dt className="text-xs text-navy-500">{{ CL: 'Capital letters', SL: 'Small letters', W: 'Words', S: 'Sentences' }[l]}</dt>
                      <dd className="font-bold">{acc === null || acc === undefined ? 'not reached' : pct(acc)}</dd>
                    </div>
                  )
                })}
              </dl>
              {reading.shap && reading.shap.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-bold text-navy-700">Why this level? (SHAP)</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {reading.shap.slice(0, 6).map((s) => (
                      <li key={s.feature} className="flex justify-between gap-2"><span>{s.label} = {s.value}</span><span className={s.shap > 0 ? 'text-teal-700' : 'text-coral-500'}>{s.shap > 0 ? '+' : ''}{s.shap.toFixed(2)}</span></li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-navy-500">Positive values pushed the model towards the estimated level; negative values away from it. Engine: {reading.engine}.</p>
                </details>
              )}
              {reading.items && reading.items.some((i) => i.correct === false) && (
                <p className="mt-3 text-xs text-navy-500">Missed: {reading.items.filter((i) => i.correct === false).map((i) => i.prompt).join(', ')}</p>
              )}
              {onRemark && reading.items && reading.items.length > 0 && (
                <details className="no-print mt-3 text-sm">
                  <summary className="cursor-pointer font-bold text-navy-700">Review each item (teacher)</summary>
                  <p className="mt-1 text-xs text-navy-500">Items judged by Whisper or demo answers are advisory. Correct any mark; the indicator is recalculated.</p>
                  <ul className="mt-2 space-y-1">
                    {reading.items.map((it) => (
                      <li key={it.task_id ?? it.prompt} className="flex items-center justify-between gap-2 rounded-lg bg-cream-100 px-2 py-1.5 text-xs">
                        <span className="min-w-0 flex-1">
                          <span className="font-display text-base font-bold">{it.prompt}</span>
                          <span className="ml-2 text-navy-500">{it.engine === 'examiner' ? 'examiner' : it.engine ?? '—'}{it.transcript ? ` · heard “${it.transcript}”` : ''}{!['CL', 'SL'].includes(it.level) && it.pronunciation_flagged === true && ' · sounds differ'}{!['CL', 'SL'].includes(it.level) && it.pronunciation_flagged === false && ' · sounds match'}</span>
                        </span>
                        <span className={`badge ${it.correct ? 'bg-teal-100 text-teal-700' : it.correct === false ? 'bg-coral-100 text-coral-500' : 'bg-cream-200'}`}>{it.correct ? 'correct' : it.correct === false ? 'incorrect' : 'unjudged'}</span>
                        {it.task_id !== undefined && (
                          <span className="flex gap-1">
                            <button type="button" aria-label="Mark correct" disabled={remarking !== null || it.correct === true} className="btn-ghost p-1"
                              onClick={async () => { setRemarking(it.task_id!); try { await onRemark(it.task_id!, true) } finally { setRemarking(null) } }}><Check className="h-4 w-4" /></button>
                            <button type="button" aria-label="Mark incorrect" disabled={remarking !== null || it.correct === false} className="btn-ghost p-1"
                              onClick={async () => { setRemarking(it.task_id!); try { await onRemark(it.task_id!, false) } finally { setRemarking(null) } }}><X className="h-4 w-4" /></button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : <p className="text-sm text-navy-500">Reading tasks were not completed.</p>}
        </Section>

        {/* Writing */}
        <Section title="Writing" aside={<PenLine className="h-5 w-5 text-lavender-600" />}>
          {writing.total_words ? (
            <>
              <p className="text-sm"><strong>{writing.correct_words}</strong> of <strong>{writing.total_words}</strong> dictated words correct ({pct(writing.accuracy)}).</p>
              {patterns.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {patterns.map(([k, v]) => <li key={k} className="flex justify-between gap-2"><span>{PATTERN_LABEL[k] ?? k}</span><span className="font-bold">{v}</span></li>)}
                </ul>
              )}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-bold text-navy-700">Each dictated item</summary>
                <ul className="mt-2 space-y-2">
                  {writing.items?.map((it, i) => (
                    <li key={i} className="rounded-xl bg-cream-100 p-2 text-xs">
                      <p><span className="font-bold">{it.prompt}</span> → {it.answer || <em>blank</em>}</p>
                      <div className="mt-1"><WordErrors errors={it.word_errors} /></div>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : <p className="text-sm text-navy-500">Writing tasks were not completed.</p>}
        </Section>

        {/* Speech */}
        <Section title="Speech" aside={<Ear className="h-5 w-5 text-sun-700" />}>
          {speech.expected_words ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-cream-100 px-3 py-2"><dt className="text-xs text-navy-500">Word mismatch</dt><dd className="font-bold">{pct(speech.word_error_rate)}</dd></div>
                <div className="rounded-xl bg-cream-100 px-3 py-2"><dt className="text-xs text-navy-500">Reading rate</dt><dd className="font-bold">{speech.words_per_minute ? `${Math.round(speech.words_per_minute)} wpm` : '—'}</dd></div>
                <div className="rounded-xl bg-cream-100 px-3 py-2"><dt className="text-xs text-navy-500">Class reference</dt><dd className="font-bold">{speech.wpm_reference ? `${Math.round(speech.wpm_reference)} wpm` : '—'}</dd></div>
                <div className="rounded-xl bg-cream-100 px-3 py-2"><dt className="text-xs text-navy-500">Long pauses</dt><dd className="font-bold">{speech.long_pauses ?? '—'}</dd></div>
              </dl>
              {speech.pronunciation?.scored && (
                <div className="mt-3 rounded-xl border border-cream-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">Pronunciation</p>
                    <span className="text-xs text-navy-500">{pct(speech.pronunciation.phoneme_error_rate)} sound mismatch</span>
                  </div>
                  {speech.pronunciation.flagged_words && speech.pronunciation.flagged_words.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {speech.pronunciation.words?.filter((w) => w.flagged).map((w, i) => (
                        <li key={i} className="rounded-lg bg-sun-100 px-2 py-1 text-xs" title={`expected /${phones(w.expected)}/, heard /${phones(w.heard) || '—'}/`}>
                          <span className="font-bold">{w.word}</span> <span className="text-navy-500">heard as /{phones(w.heard) || '…'}/</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-xs text-teal-700">Every word's sounds matched its dictionary pronunciation.</p>}
                  <p className="mt-2 text-xs text-navy-500">Independent phoneme listener ({speech.pronunciation.engine}) with no language model, so it cannot “repair” a mispronounced word the way Whisper does. Indian-English variants (v/w, t/th, d/dh) are not counted as errors.</p>
                </div>
              )}
              <p className="mt-3 text-xs text-navy-500">Transcribed by <strong>{speech.engine}</strong>{speech.engine === 'demo' && ' — demo transcriber, not real speech recognition'}.</p>
              <details className="mt-2 text-sm" open={editing}>
                <summary className="cursor-pointer font-bold text-navy-700">Passage and transcript</summary>
                <p className="mt-2 rounded-xl bg-cream-100 p-2 text-xs"><span className="font-bold">Passage:</span> {speech.prompt}</p>
                <p className="mt-1 rounded-xl bg-cream-100 p-2 text-xs"><span className="font-bold">Heard:</span> <ConfidentTranscript text={speech.transcript ?? ''} words={speech.words} /></p>
                {speech.words && speech.words.some((w) => w.confidence < 0.6) && <p className="mt-1 text-xs text-navy-500">Highlighted words are ones the recogniser was unsure about.</p>}
                {speech.whisper_transcript !== undefined && <p className="mt-1 text-xs text-navy-500">Whisper originally heard: “{speech.whisper_transcript}”</p>}
                {speech.word_errors && <div className="mt-2"><WordErrors errors={speech.word_errors} /></div>}
                {onCorrectTranscript && speech.task_id !== undefined && (
                  <div className="no-print mt-3">
                    {!editing ? (
                      <button type="button" className="btn-secondary" onClick={() => { setDraft(speech.transcript ?? ''); setEditing(true) }}>Correct what the child said</button>
                    ) : (
                      <form onSubmit={async (e) => { e.preventDefault(); if (!draft.trim()) return; setSaving(true); try { await onCorrectTranscript(speech.task_id!, draft.trim()); setEditing(false) } finally { setSaving(false) } }}>
                        <label className="label" htmlFor="transcript-fix">What the child actually said</label>
                        <textarea id="transcript-fix" className="input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
                        <p className="mt-1 text-xs text-navy-500">Whisper both mishears accented speech and quietly “repairs” mispronunciations (e.g. hearing “shirt” for a mispronounced word). Write it as spoken; mismatch features and the indicator are recalculated, the original stays on record.</p>
                        <div className="mt-2 flex gap-2"><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save correction'}</button><button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
                      </form>
                    )}
                  </div>
                )}
              </details>
            </>
          ) : <p className="text-sm text-navy-500">Speech task was not completed.</p>}
        </Section>
      </div>

      {/* Practice recommendations */}
      <Section title="Suggested practice focus" aside={<Sparkles className="h-5 w-5 text-teal-700" />}>
        <div className="flex flex-wrap gap-2">
          {error_profile.target_skills.map((s) => <span key={s} className="badge bg-teal-100 px-3 py-1 text-sm text-teal-700">{SKILL_LABEL[s] ?? s}</span>)}
        </div>
        {(error_profile.words_missed.length > 0 || error_profile.letters_missed.length > 0) && (
          <p className="mt-3 text-sm text-navy-500">Items to revisit: {[...error_profile.letters_missed, ...error_profile.words_missed].join(', ')}</p>
        )}
        {practiceHref && <Link to={practiceHref} className="btn-teal mt-4">Generate personalised practice</Link>}
      </Section>

      <div className="text-xs text-navy-500">
        <p className="font-bold">Data sources behind this report</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">{report.data_sources.map((d) => <li key={d}>{d}</li>)}</ul>
        <p className="mt-2">Model: {report.model_version}</p>
      </div>
    </div>
  )
}
