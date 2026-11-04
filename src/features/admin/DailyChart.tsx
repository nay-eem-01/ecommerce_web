import { useState } from 'react'
import type { DailySales } from '../../api/types'
import { tk } from '../../lib/money'
import { dayLabel } from './insightsFormat'

const W = 720
const H = 180
const PAD_TOP = 8
const PAD_BOTTOM = 22
const GAP = 2

/**
 * Revenue per day as bars (one series, so no legend: the heading names it). Hover or focus a day for its revenue
 * and orders; the table below the chart carries the same numbers for screen readers.
 */
export function DailyChart({ daily }: { daily: DailySales[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...daily.map((d) => d.revenue), 1)
  const slot = W / daily.length
  const bar = Math.max(slot - GAP, 1)
  const plot = H - PAD_TOP - PAD_BOTTOM
  const shown = active === null ? null : daily[active]
  return (
    <div>
      <p className="muted" style={{ fontSize: 13, minHeight: 20 }} aria-live="polite">
        {shown ? `${dayLabel(shown.day)}: ${tk(shown.revenue)} from ${shown.orders} ${shown.orders === 1 ? 'order' : 'orders'}` : `Highest day ${tk(max)}`}
      </p>
      <div onMouseLeave={() => setActive(null)}>
      <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue per day">
        <line x1={0} x2={W} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} stroke="var(--line-2)" strokeWidth={1} />
        {daily.map((d, i) => {
          const h = d.revenue > 0 ? Math.max((d.revenue / max) * plot, 2) : 0
          const x = i * slot + GAP / 2
          return (
            <g key={d.day} onMouseEnter={() => setActive(i)}>
              {/* the hit area is the whole day column, larger than the bar */}
              <rect x={i * slot} y={0} width={slot} height={H - PAD_BOTTOM} fill="transparent" />
              {h > 0 && (
                <path
                  d={roundedTop(x, H - PAD_BOTTOM - h, bar, h, Math.min(4, bar / 2))}
                  fill="var(--pink)"
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              )}
            </g>
          )
        })}
        <text x={0} y={H - 6}>{dayLabel(daily[0].day)}</text>
        <text x={W} y={H - 6} textAnchor="end">{dayLabel(daily[daily.length - 1].day)}</text>
      </svg>
      </div>
      <details style={{ fontSize: 13 }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>Show as a table</summary>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Day</th><th className="num">Orders</th><th className="num">Revenue</th></tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day}><td>{dayLabel(d.day)}</td><td className="num">{d.orders}</td><td className="num">{tk(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/** A bar with rounded top corners and a square foot on the baseline. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}
