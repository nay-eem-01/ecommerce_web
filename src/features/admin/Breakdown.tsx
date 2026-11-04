import { useState } from 'react'
import { useBreakdown } from '../../api/admin'
import type { BreakdownBy, Period } from '../../api/types'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { pct } from './insightsFormat'

const TABS: Array<[BreakdownBy, string]> = [
  ['CATEGORY', 'Category'],
  ['CHARACTER', 'Character'],
  ['DISTRICT', 'District'],
  ['PAYMENT_METHOD', 'Payment'],
]

/** Where the revenue came from, one dimension at a time; bar length is the share of revenue. */
export function Breakdown({ period }: { period: Period }) {
  const [by, setBy] = useState<BreakdownBy>('CATEGORY')
  const { data, isError } = useBreakdown(period, by)
  const name = (n: string) => (by === 'PAYMENT_METHOD' ? (METHOD_NAMES[n as keyof typeof METHOD_NAMES] ?? n) : n)
  return (
    <section className="panel adm-card" aria-labelledby="bd-h">
      <h2 id="bd-h">Where sales came from</h2>
      <div className="adm-filters" role="group" aria-label="Break down by">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" className={by === key ? 'chip on' : 'chip'} aria-pressed={by === key} onClick={() => setBy(key)}>
            {label}
          </button>
        ))}
      </div>
      {isError && <p className="err">Could not load this breakdown.</p>}
      {data && data.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No sales in this period.</p>}
      {data && data.length > 0 && (
        <div className="adm-bars">
          {data.map((r) => (
            <div key={r.name} className="adm-bar">
              <span>{name(r.name)}</span>
              <span aria-hidden="true"><i style={{ width: `${Math.max(r.share * 100, 1)}%` }} /></span>
              <span>
                {tk(r.revenue)} <span className="muted">· {pct(r.share, 0)} · {r.units} sold</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
