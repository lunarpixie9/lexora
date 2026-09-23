import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { BAND_CLASS, BAND_SHORT } from '../lib/format'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-600" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-teal-500" aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex items-start gap-3 bg-coral-100 p-5 text-sm" role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-coral-500" aria-hidden />
      <div className="flex-1">
        <p className="font-display font-bold text-ink-900">Something went wrong</p>
        <p className="font-medium text-ink-700">{message}</p>
      </div>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel-dashed flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 rounded-2xl bg-cream-200 p-4 text-terra-500">{icon}</div>}
      <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-ink-600">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink-900 md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[560px] text-[15px] font-medium leading-relaxed text-ink-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  )
}

export function BandBadge({ band, className = '' }: { band: string | null | undefined; className?: string }) {
  if (!band) return <span className={`badge bg-cream-300 text-ink-700 ${className}`}>Not screened</span>
  return <span className={`badge ${BAND_CLASS[band] ?? 'bg-cream-300 text-ink-700'} ${className}`}>{BAND_SHORT[band] ?? band}</span>
}

export function DemoBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`badge bg-sun-100 text-sun-700 ${small ? '' : 'px-3.5 py-1.5'}`} title="Generated demo content, not real child data">
      Demo data
    </span>
  )
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`panel-dashed ${compact ? 'p-3.5 text-xs' : 'px-5 py-4 text-[13px]'} font-medium leading-[1.7] text-ink-600`}>
      <p>
        <strong className="text-ink-700">Lexora is an educational screening aid and is not a diagnostic tool.</strong>{' '}
        Results indicate patterns that may warrant further observation or professional assessment. They are not a
        medical diagnosis.
      </p>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</p>
      <p className="mb-1 mt-2 font-display text-2xl font-bold leading-tight text-ink-900">{value}</p>
      {hint && <p className="text-xs font-medium text-ink-500">{hint}</p>}
    </div>
  )
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card-lg p-6 md:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function ProgressBar({ value, color = 'bg-teal-500', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-cream-300 ${className}`} aria-hidden>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}

/** Shown while audio is being analysed; explains a long wait (the first recording loads the speech models). */
export function ListeningStatus({ label = 'Listening…' }: { label?: string }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setSlow(true), 8000); return () => window.clearTimeout(t) }, [])
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-ink-600" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-teal-500" aria-hidden />
      <span className="text-sm font-bold">{label}</span>
      {slow && <span className="max-w-xs text-center text-xs font-medium">Still working — the first recording also loads the speech models, which can take a minute.</span>}
    </div>
  )
}
