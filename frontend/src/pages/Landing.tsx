import { ArrowRight, BookOpen, Ear, PenLine, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Disclaimer } from '../components/ui'
import { useAuth, homeFor } from '../lib/auth'

const STEPS = [
  { icon: <BookOpen className="h-5 w-5" />, title: 'Reading', body: 'The child reads letters, words and short sentences aloud. You mark each one, the way a teacher normally would.' },
  { icon: <PenLine className="h-5 w-5" />, title: 'Writing', body: 'A short dictation. Lexora compares every letter and spots patterns like swapped b and d, or missing letters.' },
  { icon: <Ear className="h-5 w-5" />, title: 'Speaking', body: 'A short passage read into the microphone. Lexora listens on your own computer and notes how smoothly it went.' },
  { icon: <Sparkles className="h-5 w-5" />, title: 'Practice', body: 'Word, spelling, reading and story activities built from that child’s own mistakes — with progress over time.' },
]

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/how-it-works" className="btn-ghost">How it works</Link>
          {user ? <Link to={homeFor(user.role)} className="btn-primary">Open dashboard</Link> : <Link to="/login" className="btn-primary">Sign in</Link>}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 md:grid-cols-2 md:items-center md:pt-16">
        <div>
          <p className="badge bg-teal-100 text-teal-700">Screening aid · not a diagnostic tool</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Notice reading patterns early. <span className="text-teal-700">Practise what matters.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-navy-500">
            Ten minutes with a child tells you how they read, write and speak English. Lexora explains what it
            noticed in plain words, and turns it into practice made for that child. Built for Indian classrooms.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary btn-lg">Try the demo <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/how-it-works" className="btn-secondary btn-lg">How it works</Link>
          </div>
        </div>
        <div className="card relative overflow-hidden p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sun-100" aria-hidden />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-lavender-100" aria-hidden />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Screening indicator · example</p>
            <p className="mt-2 text-2xl font-bold">Some literacy signals observed</p>
            <p className="text-sm text-navy-500">may warrant closer observation</p>
            <ul className="mt-5 space-y-3 text-sm">
              {[['Reading level vs. class peers', 0.48, '#4fa3a5'], ['Spelling error rate', 0.31, '#8e7cc3'], ['Letter reversals / transpositions', 0.22, '#8e7cc3'], ['Reading rate below class reference', 0.14, '#f2c14e']].map(([l, v, c]) => (
                <li key={l as string}>
                  <div className="flex justify-between font-semibold"><span>{l as string}</span><span className="text-navy-500">{Math.round((v as number) * 100)}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-cream-200"><div className="h-2 rounded-full" style={{ width: `${(v as number) * 100}%`, background: c as string }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-navy-500">You see exactly what led to the summary, with the real numbers. No score claims to diagnose anything.</p>
          </div>
        </div>
      </section>

      <section className="bg-cream-50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold md:text-3xl">Ten minutes, three short activities</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.title} className="card p-5">
                <div className="mb-3 inline-flex rounded-xl bg-lavender-100 p-2.5 text-lavender-600">{s.icon}</div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-navy-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-start">
          <div>
            <div className="inline-flex rounded-xl bg-teal-100 p-2.5 text-teal-700"><ShieldCheck className="h-5 w-5" /></div>
            <h2 className="mt-3 text-2xl font-bold">Honest by design</h2>
            <p className="mt-2 text-navy-500">Lexora only reports what it actually observed in the session, and shows you the numbers behind every line. It never claims to diagnose anything, and it never pretends to be more certain than it is.</p>
          </div>
          <Disclaimer />
        </div>
      </section>

      <footer className="border-t border-cream-200 py-8 text-center text-sm text-navy-500">
        Lexora · BCA Semester 5 NLP project · runs locally, no paid services required
      </footer>
    </div>
  )
}
