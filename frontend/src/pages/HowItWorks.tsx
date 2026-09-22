import { ArrowLeft, BookOpen, Check, Ear, FlaskConical, Mic, PenLine, Sparkles, TrendingUp, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Disclaimer, Section } from '../components/ui'
import { useAuth } from '../lib/auth'

/**
 * The page a teacher or parent reads. Plain language only: what Lexora is for,
 * what a session looks like, what the result means and what it cannot do.
 * The datasets, models and validation figures live on /evidence for reviewers.
 */

const STEPS: { icon: ReactNode; title: string; time: string; body: string }[] = [
  {
    icon: <BookOpen className="h-5 w-5" />, title: 'Reading', time: 'about 5 minutes',
    body: 'The child reads letters, then words, then short sentences — the same ladder used in large school reading surveys in India. You tap “read correctly” or “not correct” after each one, exactly as a teacher normally would.',
  },
  {
    icon: <PenLine className="h-5 w-5" />, title: 'Writing', time: 'about 2 minutes',
    body: 'You say a few words and one sentence aloud (or tap “Hear it”), and the child types what they hear. Lexora compares every letter to spot patterns like swapped b/d, missing letters or sound-alike spellings.',
  },
  {
    icon: <Ear className="h-5 w-5" />, title: 'Reading aloud', time: 'about 2 minutes',
    body: 'The child reads a short passage into the microphone. Lexora listens on this computer — nothing is sent to any company — and notes how smoothly it was read and which sounds came out differently.',
  },
]

const BANDS = [
  { label: 'Few signals', cls: 'bg-teal-100 text-teal-700', body: 'Very little stood out in this session. Carry on as usual.' },
  { label: 'Some signals', cls: 'bg-sun-100 text-sun-700', body: 'A few things are worth watching. Use the practice activities and try another session in a few weeks.' },
  { label: 'Multiple signals', cls: 'bg-coral-100 text-coral-500', body: 'Several things stood out together. Worth a closer look by you, the parents, and — if it continues — someone trained in reading support.' },
]

const FAQ = [
  ['How long does it take?', 'About ten minutes, sitting next to the child. You can stop and come back later; the session waits for you.'],
  ['Does the child need to be good with computers?', 'No. You hold the device for the reading part. The child only types short words and taps a big microphone button.'],
  ['What if the computer mishears the child?', 'It happens, especially with accents. Your marking always wins, and on the report you can correct what the computer heard — the result updates straight away.'],
  ['Are recordings kept?', 'Recordings stay on this computer with the session. Practice recordings are listened to once for feedback and then deleted. Nothing is uploaded to an outside service.'],
  ['Do I need internet?', 'No, not for a screening. The listening and the analysis run on this computer.'],
  ['Can parents see the results?', 'Yes, if you link a parent account to the child. Parents see the report, progress and practice — not other children.'],
]

export default function HowItWorks() {
  const { user } = useAuth()

  const body = (
    <div className="space-y-6">
      <div className="card p-6 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">What Lexora is for</h2>
        <p className="mt-3 max-w-3xl text-navy-700">
          Some children find reading and writing harder than their classmates, and it can take years for anyone to
          notice. Lexora gives a teacher or parent a short, structured way to look — about ten minutes with the child —
          and then explains, in plain words, what it noticed and what to practise next.
        </p>
        <p className="mt-3 max-w-3xl text-navy-700">
          It is a <strong>second pair of eyes</strong>, not a test result and not a medical opinion. Everything it
          reports is something you could have seen yourself if you had time to watch closely and write it all down.
        </p>
      </div>

      <Section title="What happens in a session">
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-cream-100 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-teal-700">{s.icon}</span>
                <div>
                  <p className="font-bold">{i + 1}. {s.title}</p>
                  <p className="text-xs text-navy-500">{s.time}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-navy-700">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-navy-500">
          The letters, words and sentences are the real ones used in a large reading survey of Indian schoolchildren,
          so what the child is asked to read is familiar and age-appropriate.
        </p>
      </Section>

      <Section title="What you get at the end">
        <p className="text-sm text-navy-700">
          A one-page report you can print or share with parents. It has three parts:
        </p>
        <ul className="mt-3 space-y-3 text-sm">
          <li className="rounded-xl bg-cream-100 p-3">
            <p className="font-bold">A summary line</p>
            <p className="text-navy-700">How many things stood out in this session, written as a sentence — for example
              “Some literacy signals observed — may warrant closer observation”.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {BANDS.map((b) => (
                <div key={b.label} className="rounded-xl bg-white p-3">
                  <span className={`badge ${b.cls}`}>{b.label}</span>
                  <p className="mt-2 text-xs text-navy-700">{b.body}</p>
                </div>
              ))}
            </div>
          </li>
          <li className="rounded-xl bg-cream-100 p-3">
            <p className="font-bold">Why it said that</p>
            <p className="text-navy-700">Every observation that contributed, with the actual numbers behind it — how
              many words were read correctly, which letters were swapped, how fast the passage was read. Nothing is
              hidden, and you can disagree: correct any mark and the summary updates.</p>
          </li>
          <li className="rounded-xl bg-cream-100 p-3">
            <p className="font-bold">What to practise</p>
            <p className="text-navy-700">Four short activities built from that child's own mistakes — the words they
              missed, the letters they confused. The child can do them on their own login.</p>
          </li>
        </ul>
      </Section>

      <Section title="How to use it">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-bold"><BookOpen className="h-4 w-4 text-teal-700" />If you are a teacher</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-navy-700">
              <li>Add the child (name, age, class). You get a login and PIN for them.</li>
              <li>Start a screening and sit with the child for about ten minutes.</li>
              <li>Open the report. Correct anything you disagree with.</li>
              <li>Tap “Generate personalised practice”.</li>
              <li>Screen again in a few weeks to see the change.</li>
            </ol>
          </div>
          <div>
            <p className="flex items-center gap-2 font-bold"><TrendingUp className="h-4 w-4 text-lavender-600" />If you are a parent</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-navy-700">
              <li>Ask the teacher to link your email to your child.</li>
              <li>Open your child to see the report and progress over time.</li>
              <li>Sit with them for a practice activity now and then — ten minutes is plenty.</li>
            </ol>
          </div>
          <div>
            <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-sun-700" />If you are a child</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-navy-700">
              <li>Sign in with the email and PIN your teacher gave you.</li>
              <li>Tap <strong>Practice</strong> and pick an activity.</li>
              <li>Read out loud when you see the microphone — it will tell you how you did.</li>
              <li>Check <strong>My progress</strong> for your stars.</li>
            </ol>
          </div>
        </div>
      </Section>

      <Section title="Getting a good session" aside={<Mic className="h-5 w-5 text-teal-700" />}>
        <ul className="grid gap-2 text-sm text-navy-700 md:grid-cols-2">
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />A quiet room, and the microphone close to the child — this matters more than anything else for accurate listening.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />Tell the child it is not a test and there are no marks. Nervous children read worse than they can.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />Let them finish an item before you mark it, and do not correct them mid-word.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />If a child is tired or upset, stop. You can pick the session up later.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />One session is a snapshot. A second one a few weeks later says much more.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />No microphone, or just showing someone the app? Use “Fill with demo answers”.</li>
        </ul>
      </Section>

      <Section title="What Lexora does not do" aside={<X className="h-5 w-5 text-coral-500" />}>
        <ul className="space-y-2 text-sm text-navy-700">
          <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" /><span><strong>It does not diagnose dyslexia</strong>, or anything else. Only a qualified professional can assess a child. Lexora reports what it observed in one short session.</span></li>
          <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" /><span><strong>It does not replace your judgement.</strong> You know the child; if the report disagrees with what you see, trust yourself and correct it.</span></li>
          <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" /><span><strong>It does not rank or compare children.</strong> Results belong to one child and the adults linked to them.</span></li>
          <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" /><span><strong>It is not a reading lesson.</strong> The practice activities support teaching; they do not take its place.</span></li>
        </ul>
      </Section>

      <Section title="Common questions">
        <dl className="grid gap-4 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="text-sm font-bold">{q}</dt>
              <dd className="mt-1 text-sm text-navy-700">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Disclaimer />

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-navy-500" />
          <div>
            <p className="font-bold">Reviewing this project?</p>
            <p className="text-sm text-navy-500">The datasets, models and validation results are set out separately.</p>
          </div>
        </div>
        <Link to={user ? '/evidence' : '/how-it-works/evidence'} className="btn-secondary">See the evidence</Link>
      </div>
    </div>
  )

  if (user) {
    return (
      <div>
        <div className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700">Guide</p>
          <h1 className="text-3xl font-bold">How Lexora works</h1>
          <p className="mt-1 text-navy-500">A ten-minute look at how a child reads, writes and speaks — and what to do next.</p>
        </div>
        {body}
      </div>
    )
  }
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Logo /><Link to="/login" className="btn-primary">Sign in</Link></header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-navy-700"><ArrowLeft className="h-4 w-4" />Home</Link>
        <h1 className="mb-2 text-3xl font-bold">How Lexora works</h1>
        <p className="mb-6 max-w-2xl text-navy-500">A ten-minute look at how a child reads, writes and speaks — and what to do next.</p>
        {body}
      </main>
    </div>
  )
}
