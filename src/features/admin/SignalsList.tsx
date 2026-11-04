import { Link } from 'react-router-dom'
import type { Period, Signal } from '../../api/types'
import { SIGNAL_LABELS } from './insightsFormat'

/** The ranked "do this" list. Product signals open that product in the product table. */
export function SignalsList({ signals, period }: { signals: Signal[]; period: Period }) {
  if (signals.length === 0) {
    return <p className="muted" style={{ fontSize: 14 }}>Nothing needs attention in this period.</p>
  }
  return (
    <ul className="adm-signals">
      {signals.map((s, i) => (
        <li key={`${s.type}-${s.productId ?? s.term ?? s.categorySlug}-${i}`}>
          <span className={s.type === 'SEARCH_GAP' || s.type === 'COMING_SOON_DEMAND' ? 'tag cyan' : 'tag warn'}>
            {SIGNAL_LABELS[s.type]}
          </span>
          <div>
            <strong>{s.title}</strong>
            <p>
              {s.productSlug ? (
                <Link className="link" to={`/admin/products?from=${period.from}&to=${period.to}&highlight=${encodeURIComponent(s.productSlug)}`}>
                  {s.reason}
                </Link>
              ) : (
                s.reason
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
