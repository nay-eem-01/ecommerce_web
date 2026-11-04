import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminOrders } from '../../api/admin'
import type { OrderStatus } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { STATUS_LABEL } from '../orders/OrderTimeline'

const STATUSES: OrderStatus[] = ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']

/** All orders, newest first, filtered by status or found by order number or phone. */
export function OrdersPage() {
  useTitle('Orders')
  const [params, setParams] = useSearchParams()
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? (params.get('status') as OrderStatus) : ''
  const q = params.get('q') ?? ''
  const pageNo = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const [text, setText] = useState(q)
  const { data, isPending, isError, error } = useAdminOrders(status, q, pageNo)

  const update = (changes: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    })

  const search = (e: FormEvent) => {
    e.preventDefault()
    update({ q: text.trim(), page: '' })
  }

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Orders</h1>
        <form className="adm-filters" onSubmit={search} role="search">
          <label className="vh" htmlFor="ord-status">Status</label>
          <select id="ord-status" className="input" value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
            <option value="">Every status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <label className="vh" htmlFor="ord-q">Order number or phone</label>
          <input id="ord-q" className="input" placeholder="Order number or phone" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="tbtn" type="submit">Search</button>
        </form>
      </div>
      {isPending && <PageLoading />}
      {isError && <p className="err" role="alert">{error.message}</p>}
      {data && (
        <div className="panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Order</th><th scope="col">Placed</th><th scope="col">Status</th><th scope="col">Payment</th>
                <th scope="col" className="num">Items</th><th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.content.length === 0 && <tr><td colSpan={6} className="muted">No orders match.</td></tr>}
              {data.content.map((o) => (
                <tr key={o.orderNumber}>
                  <td><Link className="link" to={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}>{o.orderNumber}</Link></td>
                  <td>{dateTime(o.placedAt)}</td>
                  <td>{STATUS_LABEL[o.status]}</td>
                  <td>{METHOD_NAMES[o.paymentMethod]}</td>
                  <td className="num">{o.itemCount}</td>
                  <td className="num">{tk(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <nav className="adm-filters" aria-label="Pages">
          <button className="tbtn" type="button" disabled={pageNo === 0} onClick={() => update({ page: String(pageNo - 1) })}>Newer</button>
          <span className="muted" style={{ fontSize: 13 }}>Page {pageNo + 1} of {data.totalPages}</span>
          <button className="tbtn" type="button" disabled={data.last} onClick={() => update({ page: String(pageNo + 1) })}>Older</button>
        </nav>
      )}
    </>
  )
}
