import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useProductInsights } from '../../api/admin'
import type { ProductInsight, ProductInsightSort } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { tk } from '../../lib/money'
import { useTitle } from '../../lib/useTitle'
import { pct, SIGNAL_LABELS } from './insightsFormat'
import { PeriodPicker } from './PeriodPicker'
import { StockEditor } from './StockEditor'
import { usePeriod } from './usePeriod'

const COLUMNS: Array<[ProductInsightSort | null, string, (p: ProductInsight) => string]> = [
  ['stock', 'Stock', (p) => (p.preorder ? `${p.stock} (pre-order)` : String(p.stock))],
  ['daysLeft', 'Days left', (p) => (p.daysLeft === null ? '–' : String(p.daysLeft))],
  ['views', 'Views', (p) => String(p.views)],
  ['conversion', 'Converts', (p) => pct(p.conversion)],
  ['units', 'Sold', (p) => String(p.units)],
  ['revenue', 'Revenue', (p) => tk(p.revenue)],
  ['wishlists', 'Saved', (p) => String(p.wishlists)],
  [null, 'In carts', (p) => (p.cartMembers ? `${p.cartUnits} by ${p.cartMembers}` : '0')],
]
const SORTS = new Set<string>(COLUMNS.map(([k]) => k).filter(Boolean) as string[])

/** Every active product with its sales, views, demand and stock, sortable, with a stock editor per row. */
export function ProductsPage() {
  useTitle('Products')
  const [period, setPeriod] = usePeriod()
  const [params, setParams] = useSearchParams()
  const sort = (SORTS.has(params.get('sort') ?? '') ? params.get('sort') : 'revenue') as ProductInsightSort
  const dir = params.get('dir') === 'asc' ? 'asc' : 'desc'
  const highlight = params.get('highlight')
  const { data, isPending, isError, error } = useProductInsights(period, sort, dir)
  const [editing, setEditing] = useState<number | null>(null)

  useEffect(() => {
    if (highlight && data) document.getElementById(`row-${highlight}`)?.scrollIntoView?.({ block: 'center' })
  }, [highlight, data])

  const sortBy = (key: ProductInsightSort) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('dir', key === sort && dir === 'desc' ? 'asc' : 'desc')
      next.set('sort', key)
      return next
    }, { replace: true })

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Products</h1>
        <PeriodPicker period={period} onChange={setPeriod} />
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Sales and views are for the period; saved and in-cart counts are signed-in shoppers today.
      </p>
      {isPending && <PageLoading />}
      {isError && <p className="err" role="alert">{error.message}</p>}
      {data && (
        <div className="panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                {COLUMNS.map(([key, label]) => (
                  <th key={label} scope="col" className="num" aria-sort={key === sort ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {key ? (
                      <button type="button" onClick={() => sortBy(key)}>
                        {label} {key === sort ? (dir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    ) : label}
                  </th>
                ))}
                <th scope="col">Signals</th>
                <th scope="col"><span className="vh">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 3} className="muted">No active products yet.</td></tr>
              )}
              {data.map((p) => (
                <Fragment key={p.id}>
                  <tr id={`row-${p.slug}`} className={p.slug === highlight ? 'hl' : undefined}>
                    <td style={{ whiteSpace: 'normal', minWidth: 180 }}>
                      <Link className="link" to={`/p/${p.slug}`} target="_blank" rel="noopener">{p.name}</Link>
                      <div className="muted" style={{ fontSize: 12 }}>{[p.category, p.character].filter(Boolean).join(' · ')}</div>
                    </td>
                    {COLUMNS.map(([, label, cell]) => <td key={label} className="num">{cell(p)}</td>)}
                    <td>
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.signals.map((s) => <span key={s} className="tag warn">{SIGNAL_LABELS[s]}</span>)}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="tbtn" aria-expanded={editing === p.id} aria-label={`Edit stock of ${p.name}`}
                        onClick={() => setEditing(editing === p.id ? null : p.id)}>
                        Edit stock
                      </button>
                    </td>
                  </tr>
                  {editing === p.id && (
                    <tr>
                      <td colSpan={COLUMNS.length + 3}>
                        <StockEditor productId={p.id} name={p.name} onDone={() => setEditing(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
