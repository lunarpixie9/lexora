import { ArrowLeft, Database, FlaskConical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Disclaimer, ErrorBox, Section, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { pct } from '../lib/format'

/* Shapes of the validation JSON produced by scripts/validation and lexora_ml. */
interface Validation {
  disclaimer: string
  reading_level_model: null | {
    version: string; n_sessions: number; n_test: number
    metrics: { holdout_accuracy: number; holdout_macro_f1: number; rule_based_baseline_accuracy_all_sessions: number }
    shap_mean_abs_by_feature: { feature: string; mean_abs_shap: number }[]
    class_norms: Record<string, { n: number; median_level: string }>
    sentence_wpm_reference_by_class: Record<string, { n: number; median_wpm: number }>
    caveat: string
  }
  nlp_misspellings: null | {
    note: string
    birkbeck_sample: MissRes; holbrook_missp: MissRes; holbrook_tagged_running_text: MissRes
  }
  speech_aser: null | {
    engine: string; clips: number; sampling: string
    per_level_agreement_with_examiner: Record<string, { n: number; agreement: number; precision_vs_examiner: number | null; recall_vs_examiner: number | null; empty_transcripts: number }>
    phoneme_layer?: { model: string | null; note: string; per_level: Record<string, { n: number; best_per_threshold: number; agreement_phoneme: number; agreement_whisper: number; agreement_either_passes: number; median_per_examiner_correct: number | null; median_per_examiner_incorrect: number | null }> }
    sentence_wpm_examiner_correct: { n: number; median: number | null }
    interpretation: string
  }
  speech_nnces_pilot: null | { files: number; engine: string; summary: Record<string, number | null>; note: string }
  rello_methodology: null | {
    n_desktop: number; positives_desktop: number; n_tablet: number; positives_tablet: number
    cv_5fold_desktop_mean: Record<string, number>; train_desktop_test_tablet: Record<string, number>
    shap_top_features_mean_abs: { feature: string; mean_abs_shap: number }[]
    transfer_note: string; interpretation: string
  }
}
interface MissRes { real_errors: number; detection_rate: number; pattern_coverage: number; phonetically_plausible_share: number; false_positives_on_correct_words: number; pattern_distribution: Record<string, number> }

const LEVEL = { CL: 'Capital letters', SL: 'Small letters', W: 'Words', S: 'Sentences' } as const

export default function Evidence() {
  const { user } = useAuth()
  const [v, setV] = useState<Validation | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.validation().then((d) => setV(d as unknown as Validation)).catch((e) => setError(e.message)) }, [])

  const body = (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="text-sm text-navy-500">Written for reviewers and examiners. If you are a teacher or parent,{' '}
          <Link to="/how-it-works" className="font-bold text-teal-700 underline">the plain-language guide</Link> is what you want.</p>
        <h2 className="mt-3 text-xl font-bold">Component validation ≠ clinical validation</h2>
        <p className="mt-2 text-sm text-navy-700">Each part of Lexora is checked against a real dataset that fits that part. Passing these checks shows the pipeline behaves sensibly on real data. It does <strong>not</strong> show that Lexora can identify dyslexia — no approved dataset provides dyslexia labels for Indian children’s English, and Lexora does not claim to.</p>
        <ol className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          {[
            ['1 · Observe', 'Reading ladder with ASER prompts, dictation, a passage read aloud.'],
            ['2 · Extract', 'Deterministic error patterns, Whisper transcript features, ASER-style ladder features.'],
            ['3 · Indicate', 'Reading level via an ASER-trained XGBoost model (SHAP-explained) + an additive, exact composite of observed signals.'],
            ['4 · Practise', 'Activities generated from the error profile; progress tracked over time.'],
          ].map(([t, b]) => <li key={t} className="rounded-xl bg-cream-100 p-3"><p className="font-bold">{t}</p><p className="mt-1 text-navy-500">{b}</p></li>)}
        </ol>
      </div>

      {error ? <ErrorBox message={error} /> : !v ? <Spinner label="Loading validation evidence…" /> : (
        <>
          {v.reading_level_model && (
            <Section title="Reading-level model — ASER (real Indian children, 4,908 sessions)">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Held-out accuracy" value={pct(v.reading_level_model.metrics.holdout_accuracy, 1)} hint={`${v.reading_level_model.n_test} test sessions`} />
                <Metric label="Macro-F1" value={v.reading_level_model.metrics.holdout_macro_f1.toFixed(3)} hint="5 examiner levels" />
                <Metric label="Rule-based baseline" value={pct(v.reading_level_model.metrics.rule_based_baseline_accuracy_all_sessions, 1)} hint="transparent ladder rule" />
              </div>
              <p className="mt-3 text-sm text-navy-700"><strong>Top SHAP features:</strong> {v.reading_level_model.shap_mean_abs_by_feature.slice(0, 5).map((s) => `${s.feature} (${s.mean_abs_shap})`).join(', ')}</p>
              <p className="mt-2 text-sm text-navy-700"><strong>Typical level by class (median, real data):</strong> {Object.entries(v.reading_level_model.class_norms).map(([c, n]) => `class ${c}: ${n.median_level}`).join(' · ')}</p>
              <p className="mt-2 text-sm text-navy-700"><strong>Reading-rate reference (correct sentences):</strong> {Object.entries(v.reading_level_model.sentence_wpm_reference_by_class).map(([c, n]) => `class ${c}: ${n.median_wpm} wpm`).join(' · ')}</p>
              <p className="mt-3 rounded-xl bg-sun-100/60 p-3 text-xs text-navy-700">{v.reading_level_model.caveat}</p>
            </Section>
          )}

          {v.nlp_misspellings && (
            <Section title="Spelling-error engine — Birkbeck & Holbrook corpora (real misspellings)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-navy-500"><tr><th className="py-1 pr-3">Corpus</th><th className="pr-3">Errors</th><th className="pr-3">Detected</th><th className="pr-3">Pattern assigned</th><th className="pr-3">Phonetically plausible</th><th>False positives</th></tr></thead>
                  <tbody>
                    {([['Birkbeck (sample)', v.nlp_misspellings.birkbeck_sample], ['Holbrook list (children)', v.nlp_misspellings.holbrook_missp], ['Holbrook running text', v.nlp_misspellings.holbrook_tagged_running_text]] as [string, MissRes][]).map(([n, r]) => (
                      <tr key={n} className="border-t border-cream-200"><td className="py-2 pr-3 font-bold">{n}</td><td className="pr-3">{r.real_errors.toLocaleString()}</td><td className="pr-3">{pct(r.detection_rate, 1)}</td><td className="pr-3">{pct(r.pattern_coverage, 1)}</td><td className="pr-3">{pct(r.phonetically_plausible_share, 1)}</td><td>{r.false_positives_on_correct_words}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-navy-500">{v.nlp_misspellings.note}</p>
            </Section>
          )}

          {v.speech_aser && (
            <Section title={`Speech pipeline — ${v.speech_aser.clips} real ASER clips, ${v.speech_aser.engine}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-navy-500"><tr><th className="py-1 pr-3">Level</th><th className="pr-3">Clips</th><th className="pr-3">Agreement with examiner</th><th className="pr-3">Precision</th><th className="pr-3">Recall</th><th>Empty transcripts</th></tr></thead>
                  <tbody>
                    {Object.entries(v.speech_aser.per_level_agreement_with_examiner).map(([l, r]) => (
                      <tr key={l} className="border-t border-cream-200"><td className="py-2 pr-3 font-bold">{LEVEL[l as keyof typeof LEVEL] ?? l}</td><td className="pr-3">{r.n}</td><td className="pr-3">{pct(r.agreement, 1)}</td><td className="pr-3">{r.precision_vs_examiner === null ? '—' : pct(r.precision_vs_examiner, 1)}</td><td className="pr-3">{r.recall_vs_examiner === null ? '—' : pct(r.recall_vs_examiner, 1)}</td><td>{r.empty_transcripts}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {v.speech_aser.phoneme_layer && Object.keys(v.speech_aser.phoneme_layer.per_level).length > 0 && (
                <>
                  <p className="mt-4 text-sm font-bold">Pronunciation layer on the same clips (phoneme recogniser, no language model)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-navy-500"><tr><th className="py-1 pr-3">Level</th><th className="pr-3">Agreement — Whisper</th><th className="pr-3">Agreement — phonemes</th><th className="pr-3">Either passes</th><th className="pr-3">Median mismatch, examiner-correct</th><th>examiner-incorrect</th></tr></thead>
                      <tbody>
                        {Object.entries(v.speech_aser.phoneme_layer.per_level).map(([l, r]) => (
                          <tr key={l} className="border-t border-cream-200"><td className="py-2 pr-3 font-bold">{LEVEL[l as keyof typeof LEVEL] ?? l}</td><td className="pr-3">{pct(r.agreement_whisper, 1)}</td><td className="pr-3">{pct(r.agreement_phoneme, 1)}</td><td className="pr-3">{pct(r.agreement_either_passes, 1)}</td><td className="pr-3">{pct(r.median_per_examiner_correct, 0)}</td><td>{pct(r.median_per_examiner_incorrect, 0)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-navy-500">{v.speech_aser.phoneme_layer.note} Lexora therefore counts an item Whisper rejected as correct when the sounds matched, and uses the phoneme layer to flag mispronounced words that Whisper would silently repair (measured on a real test recording: “he as a blue shit” → Whisper “he has a blue shirt”).</p>
                </>
              )}
              <p className="mt-3 text-sm text-navy-700">{v.speech_aser.interpretation}</p>
              <p className="mt-1 text-xs text-navy-500">{v.speech_aser.sampling}. Median rate of correctly read sentences in this sample: {v.speech_aser.sentence_wpm_examiner_correct.median} wpm.</p>
            </Section>
          )}

          {v.speech_nnces_pilot && (
            <Section title={`NNCES pilot — ${v.speech_nnces_pilot.files} Telugu-L1 children’s recordings (audio only)`}>
              <div className="grid gap-3 sm:grid-cols-4">
                {Object.entries(v.speech_nnces_pilot.summary).map(([k, val]) => <Metric key={k} label={k.replaceAll('_', ' ')} value={val === null ? '—' : String(val)} />)}
              </div>
              <p className="mt-3 text-xs text-navy-500">{v.speech_nnces_pilot.note}</p>
            </Section>
          )}

          {v.rello_methodology && (
            <Section title="Method check — XGBoost + SHAP on Rello et al. (Spanish, diagnosed labels)">
              <p className="text-sm text-navy-700">{v.rello_methodology.n_desktop.toLocaleString()} children ({v.rello_methodology.positives_desktop} with a dyslexia diagnosis), 5-fold stratified cross-validation:</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Metric label="ROC-AUC" value={v.rello_methodology.cv_5fold_desktop_mean.roc_auc.toFixed(3)} />
                <Metric label="Recall @0.5" value={pct(v.rello_methodology.cv_5fold_desktop_mean['recall@0.5'], 1)} />
                <Metric label="Recall @0.3" value={pct(v.rello_methodology.cv_5fold_desktop_mean['recall@0.3'], 1)} hint="recall-oriented threshold" />
                <Metric label="Tablet transfer AUC" value={v.rello_methodology.train_desktop_test_tablet.roc_auc.toFixed(3)} hint="different test version" />
              </div>
              <p className="mt-3 text-sm text-navy-700">{v.rello_methodology.interpretation}</p>
              <p className="mt-2 rounded-xl bg-sun-100/60 p-3 text-xs text-navy-700">{v.rello_methodology.transfer_note}</p>
            </Section>
          )}
        </>
      )}

      <Section title="Data sources" aside={<Database className="h-5 w-5 text-navy-500" />}>
        <ul className="space-y-2 text-sm">
          <li><strong>ASER (Pratham)</strong>, CC BY-NC-SA 4.0 — primary. Indian children reading English letters, words and sentences aloud, with prompt text and examiner correctness labels. Supplies Lexora’s reading items, the reading-level model, class norms and reading-rate references.</li>
          <li><strong>Birkbeck + Holbrook corpora</strong>, CC BY-NC-SA 3.0 — real misspellings (Holbrook: schoolchildren) used to validate the spelling-error engine.</li>
          <li><strong>NNCES corpus</strong> (Kaggle, CC0) — secondary pilot of 500 read-speech recordings by Telugu-L1 children. The uploaded corpus contains audio files only (no prompts or transcripts), so it supports prompt-free speech measures only.</li>
          <li><strong>Rello et al. 2020</strong> (Kaggle, CC BY 4.0) — Spanish gamified test with diagnosed labels; validates the XGBoost + SHAP method only. Not an Indian-English dataset and not a source of Lexora scores.</li>
        </ul>
      </Section>
      <Disclaimer />
    </div>
  )

  if (user) {
    return <div><div className="mb-6"><p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700">Evidence</p><h1 className="text-3xl font-bold">Datasets, models and validation</h1></div>{body}</div>
  }
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Logo /><Link to="/login" className="btn-primary">Sign in</Link></header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-navy-700"><ArrowLeft className="h-4 w-4" />Home</Link>
        <div className="mb-6 flex items-center gap-3"><FlaskConical className="h-8 w-8 text-teal-700" /><h1 className="text-3xl font-bold">Datasets, models and validation</h1></div>
        {body}
      </main>
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-xl bg-cream-100 p-3"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">{label}</p><p className="text-xl font-bold">{value}</p>{hint && <p className="text-xs text-navy-500">{hint}</p>}</div>
}
