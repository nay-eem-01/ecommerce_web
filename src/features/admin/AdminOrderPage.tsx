import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminOrder, useOrderAction } from '../../api/admin'
import { ApiError } from '../../api/errors'
import type { OrderAction, OrderStatus } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { STATUS_LABEL } from '../orders/OrderTimeline'

/** The moves the backend's state machine allows from each status; it still has the final say (409). */
export const ACTIONS: Record<OrderStatus, OrderAction[]> = {
  PLACED: ['PACK', 'CANCEL'],
  PACKED: ['SHIP', 'CANCEL'],
  SHIPPED: ['DELIVER', 'RETURN'],
  DELIVERED: ['RETURN'],
  CANCELLED: [],
  RETURNED: [],
}

const LABEL: Record<OrderAction, string> = {
  PACK: 'Mark packed',
  SHIP: 'Hand to rider',
  DELIVER: 'Mark delivered',
  CANCEL: 'Cancel order',
  RETURN: 'Mark returned',
}

/** These undo a sale (stock goes back, a paid online order is refunded), so they ask first. */
const CONFIRM: Partial<Record<OrderAction, string>> = {
  CANCEL: 'Cancel this order? Its stock goes back on sale and a paid online payment is refunded.',
  RETURN: 'Mark this order returned?',
}

export function AdminOrderPage() {
  const { orderNumber = '' } = useParams()
  useTitle(`Order ${orderNumber}`)
  const { data: o, isPending, isError, error } = useAdminOrder(orderNumber)
  const act = useOrderAction(orderNumber)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState<OrderAction | null>(null)

  if (isPending) return <PageLoading />
  if (isError || !o) {
    return (
      <div className="empty">
        <p>{error instanceof ApiError && error.status === 404 ? 'No order with that number.' : 'Could not load the order.'}</p>
        <Link className="link" to="/admin/orders">Back to orders</Link>
      </div>
    )
  }

  const run = (action: OrderAction) => {
    if (CONFIRM[action] && confirming !== action) {
      setConfirming(action)
      return
    }
    setConfirming(null)
    act.mutate({ action, note: note.trim() || undefined }, { onSuccess: () => setNote('') })
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <Link className="ulink" to="/admin/orders">Orders</Link>
          <h1 className="adm-h1" style={{ marginTop: 8 }}>{o.orderNumber}</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {dateTime(o.placedAt)} · {METHOD_NAMES[o.paymentMethod]} ({o.paymentStatus.toLowerCase()})
          </p>
        </div>
        <span className="tag cyan">{STATUS_LABEL[o.status]}</span>
      </div>

      <div className="adm-two">
        <section className="panel adm-card" aria-labelledby="items-h">
          <h2 id="items-h">Items</h2>
          <table className="adm-table">
            <tbody>
              {o.items.map((i) => (
                <tr key={`${i.productId}-${i.optionId}`}>
                  <td style={{ whiteSpace: 'normal' }}>{i.name}{i.optionLabel ? ` · ${i.optionLabel}` : ''}</td>
                  <td className="num">× {i.quantity}</td>
                  <td className="num">{tk(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row"><span>Subtotal</span><span>{tk(o.subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span>{tk(o.deliveryFee)}</span></div>
          <div className="row total"><span>Total</span><span>{tk(o.total)}</span></div>
          {o.amountDueOnDelivery > 0 && <div className="row"><span>To collect on delivery</span><span>{tk(o.amountDueOnDelivery)}</span></div>}
        </section>

        <section className="panel adm-card" aria-labelledby="ship-h">
          <h2 id="ship-h">Deliver to</h2>
          <p>{o.fullName}<br />{o.phone}{o.email ? <><br />{o.email}</> : null}</p>
          <p className="muted">{o.addressLine}, {o.area}, {o.district}</p>
          {o.note && <p className="muted">Rider note: {o.note}</p>}
        </section>
      </div>

      <section className="panel adm-card" aria-labelledby="act-h">
        <h2 id="act-h">Move the order</h2>
        {ACTIONS[o.status].length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>This order is {STATUS_LABEL[o.status].toLowerCase()}; nothing more to do.</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="act-note">Note for the history (optional)</label>
              <input id="act-note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {confirming && <p role="alert">{CONFIRM[confirming]}</p>}
            <div className="adm-actions">
              {ACTIONS[o.status].map((a) => (
                <button key={a} type="button" className={a === 'CANCEL' || a === 'RETURN' ? 'btn ghost' : 'btn'} disabled={act.isPending}
                  onClick={() => run(a)}>
                  {confirming === a ? `Yes, ${LABEL[a].toLowerCase()}` : LABEL[a]}
                </button>
              ))}
              {confirming && <button type="button" className="tbtn" onClick={() => setConfirming(null)}>Keep it</button>}
            </div>
          </>
        )}
        {act.error && <p className="err" role="alert">{act.error instanceof ApiError ? act.error.message : 'Could not update the order.'}</p>}
      </section>

      <section className="panel adm-card" aria-labelledby="hist-h">
        <h2 id="hist-h">History</h2>
        <ol className="adm-signals">
          {o.timeline.map((t, i) => (
            <li key={i}>
              <span className="tag">{STATUS_LABEL[t.status]}</span>
              <div>
                <strong>{dateTime(t.at)}</strong>
                {t.note && <p>{t.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
