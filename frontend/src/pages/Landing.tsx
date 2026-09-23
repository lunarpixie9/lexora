import { Link } from 'react-router-dom'
import { ART, Medallion, Sparkle, Wave } from '../components/decor'
import { PublicHeader, SiteFooter } from '../components/Layout'
import { useAuth, homeFor } from '../lib/auth'

const STEPS = [
  {
    n: 1, art: ART.reading, title: 'Reading ladder',
    body: 'Letters, words and sentences from the real ASER reading assessment, marked the way ASER examiners mark them.',
  },
  {
    n: 2, art: ART.writing, title: 'Writing & speech',
    body: 'Dictation compared letter by letter, and a passage read aloud transcribed on this computer for rate, pauses and mismatches.',
  },
  {
    n: 3, art: ART.insights, title: 'Clear insights',
    body: 'Teachers and parents get an explainable report — not just a score, but exactly what was flagged and why — plus practice built from it.',
  },
]

const SCIENCE = [
  {
    title: 'Text analysis',
    points: ['Mirror-letter reversal (b/d, p/q)', 'Sound-alike spelling (sed → said)', 'Letter transposition (form → from)', 'Omissions, additions, vowel confusion'],
  },
  {
    title: 'Speech & fluency',
    points: ['Words per minute vs. class reference', 'Long-pause frequency and duration', 'A phoneme listener with no language model', 'Indian-English variants not counted as errors'],
  },
  {
    title: 'Explainable by design',
    points: ['Additive feature scoring, not a black box', 'SHAP breakdown for the reading level', 'Incomplete tasks excluded, weights renormalised', 'Teachers can re-mark any item and re-score'],
  },
]

const EXAMPLE = [
  { label: 'Reading level vs. class peers', v: 48, c: '#4E9BAD' },
  { label: 'Spelling error rate', v: 31, c: '#A8531C' },
  { label: 'Letter reversals / transpositions', v: 22, c: '#A8531C' },
  { label: 'Reading rate below class reference', v: 14, c: '#D8A24A' },
]

export default function Landing() {
  const { user } = useAuth()
  const start = user ? homeFor(user.role) : '/login'

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <PublicHeader />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="band-sky relative overflow-hidden px-5 pb-16 pt-14 text-center md:px-7 md:pt-[76px]">
          <div className="animate-rise mx-auto max-w-[960px]">
            <span className="chip chip-on-sky">✦ screening aid, not a diagnosis ✦</span>
            <h1 className="mt-6 font-display text-[40px] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] text-terra-500 text-balance sm:text-[52px] md:text-[68px]">
              Notice reading<br />patterns{' '}
              <span className="font-bold italic normal-case tracking-[-0.01em]">early</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[17px] font-semibold leading-[1.6] text-slate-900 md:text-[19px]">
              Lexora watches how a child reads, writes and speaks — then explains exactly what it noticed and turns it
              into practice.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3.5">
              <Link to={start} className="btn-primary btn-lg shadow-pill">Try the demo</Link>
              <Link to="/how-it-works" className="btn-lg rounded-full border-none bg-white font-bold uppercase tracking-[0.13em] text-terra-500 transition hover:bg-cream-100">
                How it works
              </Link>
            </div>

            <div className="animate-float mx-auto mt-12 max-w-[520px]">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[28px] bg-mint-100 shadow-[0_0_0_10px_rgb(255_255_255_/_0.6),0_20px_44px_rgb(52_58_66_/_0.2)]">
                <Sparkle className="left-5 top-4" size={20} />
                <Sparkle className="bottom-5 right-6" size={15} delay={1.2} />
                <Sparkle className="right-7 top-6" size={12} delay={2} />
                <img src={ART.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>
          </div>

          {/* Example indicator, tucked into the wave */}
          <div className="relative z-10 mx-auto mt-14 max-w-[520px] rounded-t-[22px] bg-cream-100 px-6 pb-8 pt-6 text-left shadow-[0_-6px_30px_rgb(52_58_66_/_0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A08B6E]">Screening indicator · example</p>
            <p className="mt-2.5 font-display text-[22px] font-bold leading-tight text-ink-900 sm:text-[26px]">Some literacy signals observed</p>
            <p className="mb-4 text-sm font-medium text-ink-600">may warrant closer observation</p>
            <div className="flex flex-col gap-3">
              {EXAMPLE.map((e) => (
                <div key={e.label}>
                  <div className="flex justify-between text-[13px] font-semibold text-[#5E554C]">
                    <span>{e.label}</span><span className="text-ink-500">{e.v}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-cream-300">
                    <div className="h-2 rounded-full" style={{ width: `${e.v}%`, background: e.c }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium leading-relaxed text-ink-500">
              Every contribution is exact and explainable. No probability of a diagnosis is shown, because none is claimed.
            </p>
          </div>
          <Wave fill="#FDF9F2" />
        </section>

        {/* ── Three steps ────────────────────────────────── */}
        <section className="paper-dots px-5 pb-20 pt-8 text-center md:px-7">
          <span className="chip mb-4 border-sand-500">✨ three simple steps ✨</span>
          <h2 className="font-display text-[28px] font-bold leading-tight text-ink-900 md:text-[38px]">How Lexora Works</h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-base font-medium leading-relaxed text-ink-600">
            One coherent flow: a short session, an explainable indicator, personalised practice.
          </p>
          <div className="mx-auto mt-14 grid max-w-[1080px] gap-10 sm:grid-cols-2 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="relative mx-auto w-[186px]">
                  <Medallion src={s.art} size={186} />
                  <span className="absolute -top-1.5 left-1/2 grid h-[34px] w-[34px] -translate-x-1/2 place-items-center rounded-full bg-terra-500 font-display text-sm font-bold text-white">{s.n}</span>
                </div>
                <h3 className="mb-2 mt-6 font-display text-[19px] font-bold leading-snug text-ink-900">{s.title}</h3>
                <p className="mx-auto max-w-[280px] text-sm font-medium leading-[1.65] text-ink-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The science ────────────────────────────────── */}
        <section className="band-sand relative px-5 py-24 md:px-7">
          <Wave fill="#FDF9F2" flip />
          <h2 className="text-center font-display text-[26px] font-bold leading-tight text-ink-900 md:text-[34px]">The Science Behind Lexora</h2>
          <div className="mx-auto mt-11 grid max-w-[1080px] gap-6 sm:grid-cols-2 md:grid-cols-3">
            {SCIENCE.map((c) => (
              <div key={c.title} className="card p-7">
                <h3 className="mb-3.5 font-display text-lg font-bold leading-snug text-ink-900">{c.title}</h3>
                {c.points.map((p) => (
                  <p key={p} className="mb-2.5 text-sm font-medium leading-relaxed text-ink-600 last:mb-0">· {p}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/how-it-works/evidence" className="btn-outline">See the evidence</Link>
          </div>
          <Wave fill="#FDF9F2" />
        </section>

        {/* ── Disclaimer ─────────────────────────────────── */}
        <section className="bg-cream-100 px-5 py-16 text-center md:px-7">
          <div className="panel-dashed mx-auto max-w-[720px] rounded-[20px] px-9 py-10">
            <h2 className="mb-3.5 font-display text-[22px] font-bold leading-snug text-ink-900 md:text-[26px]">A screening aid, not a diagnosis</h2>
            <p className="mb-6 text-[15px] font-medium leading-[1.7] text-ink-600">
              <strong className="text-ink-700">Lexora is an educational screening aid and is not a diagnostic tool.</strong>{' '}
              Results indicate patterns that may warrant further observation or professional assessment. They are not a
              medical diagnosis.
            </p>
            <Link to="/how-it-works" className="btn-outline">Learn more about our approach</Link>
          </div>
        </section>

        {/* ── Closing CTA ────────────────────────────────── */}
        <section className="band-sky relative px-5 pb-28 pt-20 text-center md:px-7">
          <h2 className="font-display text-[30px] font-bold leading-tight text-slate-900 md:text-[40px]">Ready to begin?</h2>
          <p className="mb-7 mt-3.5 text-base font-semibold leading-relaxed text-slate-900">
            A session takes about ten minutes. Demo logins for teacher, parent and child.
          </p>
          <Link to={start} className="btn-lg rounded-full border-none bg-white font-bold uppercase tracking-[0.13em] text-terra-500 shadow-[0_10px_26px_rgb(52_58_66_/_0.16)] transition hover:bg-cream-100">
            Open the demo
          </Link>
          <Wave fill="#343A42" />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
