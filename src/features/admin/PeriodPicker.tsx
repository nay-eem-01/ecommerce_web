import type { Period } from '../../api/types'
import { periodDays, periodFor } from './insightsFormat'

const PRESETS = [7, 30, 90] as const

/** Last 7 / 30 / 90 days, or any range up to 366 days (the backend's limit). */
export function PeriodPicker({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const today = periodFor(1).to
  const isPreset = (d: number) => period.to === today && periodDays(period) === d
  return (
    <div className="adm-filters" role="group" aria-label="Period">
      {PRESETS.map((d) => (
        <button key={d} type="button" className={isPreset(d) ? 'chip on' : 'chip'} aria-pressed={isPreset(d)}
          onClick={() => onChange(periodFor(d))}>
          {d} days
        </button>
      ))}
      <label className="vh" htmlFor="period-from">From</label>
      <input id="period-from" className="input" type="date" value={period.from} max={period.to}
        onChange={(e) => e.target.value && onChange({ ...period, from: e.target.value })} />
      <span aria-hidden="true">–</span>
      <label className="vh" htmlFor="period-to">To</label>
      <input id="period-to" className="input" type="date" value={period.to} min={period.from} max={today}
        onChange={(e) => e.target.value && onChange({ ...period, to: e.target.value })} />
    </div>
  )
}
