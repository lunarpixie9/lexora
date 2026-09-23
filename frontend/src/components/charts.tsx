import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { GROUP_COLOR, GROUP_LABEL, fmtDate, pct } from '../lib/format'
import type { Progress, Signal } from '../lib/types'

const GRID = '#F1E8D8'
const INK = '#4A4139'
const MUTED = '#A0958A'
const TERRA = '#A8531C'

/** Horizontal bars: exact additive contribution of every observed signal to the indicator. */
export function ContributionBars({ signals }: { signals: Signal[] }) {
  const data = [...signals].sort((a, b) => b.contribution - a.contribution).map((s) => ({ ...s, pctv: s.contribution * 100 }))
  const height = Math.max(160, data.length * 34 + 24)
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 'dataMax + 2']} />
            <YAxis type="category" dataKey="label" width={210} tick={{ fill: INK, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F7F0E4' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const s = payload[0].payload as Signal & { pctv: number }
              return (
                <div className="card px-3 py-2 text-xs">
                  <p className="font-bold">{s.label}</p>
                  <p className="text-ink-600">{s.raw_value}</p>
                  <p className="mt-1">Contribution {s.pctv.toFixed(1)} pts · weight {(s.weight * 100).toFixed(0)}% · signal {pct(s.value)}</p>
                  {s.note && <p className="mt-1 max-w-[240px] text-ink-600">{s.note}</p>}
                </div>
              )
            }} />
            <Bar dataKey="pctv" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fill: INK, fontSize: 11, formatter: (v: unknown) => `${Number(v).toFixed(1)}` }}>
              {data.map((d) => <Cell key={d.name} fill={GROUP_COLOR[d.group]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend />
    </div>
  )
}

export function Legend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-ink-700">
      {Object.keys(GROUP_COLOR).map((g) => (
        <li key={g} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />{GROUP_LABEL[g]}</li>
      ))}
    </ul>
  )
}

/** Indicator score over time, one line, band thresholds as recessive reference lines. */
export function ScoreTrend({ screenings }: { screenings: Progress['screenings'] }) {
  const data = screenings.map((s) => ({ date: fmtDate(s.date), score: Math.round(s.score * 100), band: s.band, level: s.reading_level, mode: s.mode }))
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -12, right: 16, top: 12, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 100]} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as (typeof data)[number]
            return <div className="card px-3 py-2 text-xs"><p className="font-bold">{d.date}{d.mode === 'demo' ? ' · demo' : ''}</p><p>Indicator {d.score} / 100</p><p className="text-ink-600">Reading level: {d.level}</p></div>
          }} />
          <Line type="monotone" dataKey="score" stroke={TERRA} strokeWidth={2} dot={{ r: 4, fill: TERRA, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-ink-600">Composite indicator (0–100). Lower means fewer observed signals. Bands: under 25 few · under 50 some · 50+ multiple.</p>
    </div>
  )
}

/** Practice scores per attempt, coloured by activity kind (fixed order, never cycled). */
const KIND_COLOR: Record<string, string> = { word_practice: '#0a9a9d', spelling: '#5f4aa8', reading: '#a8760f', story: '#a8531c' }
const KIND_LABEL: Record<string, string> = { word_practice: 'Word choice', spelling: 'Spelling', reading: 'Reading', story: 'Story' }

export function PracticeBars({ practice }: { practice: Progress['practice'] }) {
  const data = practice.map((p, i) => ({ i, name: `${i + 1}`, score: Math.round(p.score * 100), kind: p.kind, title: p.title, date: fmtDate(p.date) }))
  return (
    <div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 4 }} barCategoryGap={4}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F7F0E4' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof data)[number]
              return <div className="card px-3 py-2 text-xs"><p className="font-bold">{d.title}</p><p className="text-ink-600">{KIND_LABEL[d.kind]} · {d.date}</p><p>{d.score}% correct</p></div>
            }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.i} fill={KIND_COLOR[d.kind] ?? TERRA} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-ink-700">
        {Object.keys(KIND_COLOR).map((k) => <li key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]}</li>)}
      </ul>
    </div>
  )
}

/** The screening indicator, as a calm donut with the band written underneath. */
const BAND_DONUT: Record<string, { ring: string; bg: string; fg: string }> = {
  few_signals: { ring: '#4E9BAD', bg: '#E3F0F3', fg: '#2F7B8A' },
  some_signals: { ring: '#D8A24A', bg: '#F6E9D4', fg: '#8F6A3F' },
  multiple_signals: { ring: '#C0563A', bg: '#F5E0D6', fg: '#A8471F' },
  insufficient_data: { ring: '#A0958A', bg: '#F1EADC', fg: '#7A6A57' },
}

export function IndicatorDial({ score, bandLabel, band }: { score: number; bandLabel: string; band: string }) {
  const c = BAND_DONUT[band] ?? BAND_DONUT.insufficient_data
  const turn = Math.max(0.01, Math.min(1, score))
  return (
    <div className="grid place-items-center">
      <div className="grid h-[190px] w-[190px] place-items-center rounded-full"
        style={{ background: `conic-gradient(${c.ring} 0turn ${turn}turn, #EFE5D3 ${turn}turn 1turn)` }}
        role="img" aria-label={`Indicator ${Math.round(score * 100)} of 100: ${bandLabel}`}>
        <div className="grid h-[148px] w-[148px] place-items-center rounded-full bg-white text-center">
          <div>
            <p className="font-display text-[44px] font-bold leading-none text-ink-900">{Math.round(score * 100)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">of 100</p>
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-full px-[18px] py-2 text-center text-[13px] font-bold"
        style={{ background: c.bg, color: c.fg }}>{bandLabel}</p>
      <p className="mt-2 text-[11px] font-medium text-ink-500">lower = fewer signals</p>
    </div>
  )
}
