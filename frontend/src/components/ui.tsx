import { AlertCircle, Info, Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { BAND_CLASS, BAND_SHORT } from '../lib/format'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-navy-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex items-start gap-3 border-coral-500/30 bg-coral-100/50 p-4 text-sm" role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral-500" aria-hidden />
      <div className="flex-1">
        <p className="font-bold text-navy-900">Something went wrong</p>
        <p className="text-navy-700">{message}</p>
      </div>
      {onRetry && <button className="btn-secondary" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 rounded-2xl bg-lavender-100 p-4 text-lavender-600">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-navy-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-navy-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function BandBadge({ band, className = '' }: { band: string | null | undefined; className?: string }) {
  if (!band) return <span className={`badge bg-cream-200 text-navy-500 ${className}`}>Not screened</span>
  return <span className={`badge ${BAND_CLASS[band] ?? 'bg-cream-200'} ${className}`}>{BAND_SHORT[band] ?? band}</span>
}

export function DemoBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`badge bg-sun-100 text-sun-700 ${small ? '' : 'px-3 py-1 text-sm'}`} title="Generated demo content, not real child data">
      Demo data
    </span>
  )
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-lavender-200 bg-lavender-100/60 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'} text-navy-700`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-lavender-600" aria-hidden />
      <p>
        <strong>Lexora is an educational screening aid and is not a diagnostic tool.</strong> Results indicate
        patterns that may warrant further observation or professional assessment. They are not a medical diagnosis.
      </p>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-navy-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-navy-500">{hint}</p>}
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function ProgressBar({ value, color = 'bg-teal-500', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-cream-200 ${className}`} aria-hidden>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}

/** Shown while audio is being analysed; explains a long wait (the first recording loads the speech models). */
export function ListeningStatus({ label = 'Listening…' }: { label?: string }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setSlow(true), 8000); return () => window.clearTimeout(t) }, [])
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-navy-500" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-teal-500" aria-hidden />
      <span className="text-sm font-bold">{label}</span>
      {slow && <span className="max-w-xs text-center text-xs">Still working — the first recording also loads the speech models, which can take a minute.</span>}
    </div>
  )
}
