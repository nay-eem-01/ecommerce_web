import type { InsightTotals } from '../../api/types'
import { tk } from '../../lib/money'
import { changePct, pct } from './insightsFormat'

interface Tile {
  label: string
  value: string
  current: number
  previous: number
  /** For cancellations a fall is the good news. */
  goodWhenDown?: boolean
  sub?: string
}

function Delta({ tile, days }: { tile: Tile; days: number }) {
  const change = changePct(tile.current, tile.previous)
  if (change === null) return <span className="d">{tile.sub ?? `Nothing in the ${days} days before`}</span>
  const good = tile.goodWhenDown ? change < 0 : change > 0
  const cls = change === 0 ? 'd' : good ? 'd up' : 'd down'
  const arrow = change > 0 ? '▲' : change < 0 ? '▼' : ''
  return (
    <span className={cls}>
      {arrow} {Math.abs(change)}% vs the {days} days before{tile.sub ? ` · ${tile.sub}` : ''}
    </span>
  )
}

/** The headline numbers, each against the previous period of the same length. */
export function KpiTiles({ current, previous, days }: { current: InsightTotals; previous: InsightTotals; days: number }) {
  const tiles: Tile[] = [
    { label: 'Revenue', value: tk(current.revenue), current: current.revenue, previous: previous.revenue, sub: 'without delivery' },
    { label: 'Orders', value: String(current.orders), current: current.orders, previous: previous.orders },
    { label: 'Average order', value: current.averageOrder === null ? '–' : tk(current.averageOrder),
      current: current.averageOrder ?? 0, previous: previous.averageOrder ?? 0 },
    { label: 'Units sold', value: String(current.units), current: current.units, previous: previous.units },
    { label: 'Cancelled', value: pct(current.cancelRate), current: current.cancelRate, previous: previous.cancelRate,
      goodWhenDown: true, sub: `${current.cancelled} orders` },
    { label: 'New buyers', value: String(current.newBuyers), current: current.newBuyers, previous: previous.newBuyers,
      sub: `${current.returningBuyers} came back` },
    { label: 'Product views', value: String(current.views), current: current.views, previous: previous.views },
    { label: 'Searches', value: String(current.searches), current: current.searches, previous: previous.searches,
      sub: `${current.zeroResultSearches} found nothing` },
  ]
  return (
    <ul className="adm-tiles" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {tiles.map((t) => (
        <li key={t.label} className="panel adm-tile">
          <span className="eyebrow">{t.label}</span>
          <span className="v">{t.value}</span>
          <Delta tile={t} days={days} />
        </li>
      ))}
    </ul>
  )
}
