import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { GROUP_COLOR, GROUP_LABEL, fmtDate, pct } from '../lib/format'
import type { Progress, Signal } from '../lib/types'

const GRID = '#ece6da'
const INK = '#34415f'
const MUTED = '#7b8399'

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
            <Tooltip cursor={{ fill: '#f7f2e8' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const s = payload[0].payload as Signal & { pctv: number }
              return (
                <div className="card px-3 py-2 text-xs">
                  <p className="font-bold">{s.label}</p>
                  <p className="text-navy-500">{s.raw_value}</p>
                  <p className="mt-1">Contribution {s.pctv.toFixed(1)} pts · weight {(s.weight * 100).toFixed(0)}% · signal {pct(s.value)}</p>
                  {s.note && <p className="mt-1 max-w-[240px] text-navy-500">{s.note}</p>}
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
    <ul className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-navy-700">
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
            return <div className="card px-3 py-2 text-xs"><p className="font-bold">{d.date}{d.mode === 'demo' ? ' · demo' : ''}</p><p>Indicator {d.score} / 100</p><p className="text-navy-500">Reading level: {d.level}</p></div>
          }} />
          <Line type="monotone" dataKey="score" stroke="#1f2a44" strokeWidth={2} dot={{ r: 4, fill: '#1f2a44', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-navy-500">Composite indicator (0–100). Lower means fewer observed signals. Bands: under 25 few · under 50 some · 50+ multiple.</p>
    </div>
  )
}

/** Practice scores per attempt, coloured by activity kind (fixed order, never cycled). */
const KIND_COLOR: Record<string, string> = { word_practice: '#0a9a9d', spelling: '#5f4aa8', reading: '#a8760f', story: '#1f2a44' }
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
            <Tooltip cursor={{ fill: '#f7f2e8' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof data)[number]
              return <div className="card px-3 py-2 text-xs"><p className="font-bold">{d.title}</p><p className="text-navy-500">{KIND_LABEL[d.kind]} · {d.date}</p><p>{d.score}% correct</p></div>
            }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.i} fill={KIND_COLOR[d.kind] ?? '#1f2a44'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-navy-700">
        {Object.keys(KIND_COLOR).map((k) => <li key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]}</li>)}
      </ul>
    </div>
  )
}

/** Big, calm indicator dial: an arc from 0 to 1 with the band label underneath. */
export function IndicatorDial({ score, bandLabel, band }: { score: number; bandLabel: string; band: string }) {
  const r = 54, c = Math.PI * r // half circle length
  const color = band === 'few_signals' ? '#0a9a9d' : band === 'some_signals' ? '#a8760f' : band === 'multiple_signals' ? '#c95a3f' : '#7b8399'
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 80" className="w-56" role="img" aria-label={`Indicator ${Math.round(score * 100)} of 100: ${bandLabel}`}>
        <path d="M 16 70 A 54 54 0 0 1 124 70" fill="none" stroke="#ece6da" strokeWidth="12" strokeLinecap="round" />
        <path d="M 16 70 A 54 54 0 0 1 124 70" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${Math.max(0.01, score) * c} ${c}`} />
        <text x="70" y="62" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1f2a44" fontFamily="Fraunces, Georgia, serif">{Math.round(score * 100)}</text>
        <text x="70" y="76" textAnchor="middle" fontSize="8" fill="#7b8399" fontWeight="700">of 100 · lower = fewer signals</text>
      </svg>
      <p className="mt-1 text-center font-bold" style={{ color }}>{bandLabel}</p>
    </div>
  )
}
