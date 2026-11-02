import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import type { OrderSummary } from '../../api/types'
import { shortDate } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useToast } from '../../ui/Toast'
import { useCart } from '../cart/CartProvider'
import { ProductImage } from '../catalog/ProductImage'
import { STATUS_LABEL, TrackBar } from '../orders/OrderTimeline'

/** The prototype's order card: number, date, total, status, progress bar, items and actions. */
export function OrderCard({ order: o }: { order: OrderSummary }) {
  const cart = useCart()
  const toast = useToast()
  const ended = o.status === 'CANCELLED' || o.status === 'RETURNED'

  async function buyAgain() {
    try {
      for (const item of o.items) await cart.add({ productId: item.productId, optionId: item.optionId, quantity: item.quantity })
      toast('Added to your cart', ['View cart', '/cart'])
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  return (
    <article className="panel order" aria-label={`Order ${o.orderNumber}`}>
      <div className="order-top">
        <span className="id">{o.orderNumber}</span>
        <span className="meta">{shortDate(o.placedAt)}</span>
        <span className="meta">
          {tk(o.total)}, {METHOD_NAMES[o.paymentMethod]}
        </span>
        <span className={`pill ${o.status === 'DELIVERED' ? 'ok' : ended ? 'warn' : 'pre'}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      {!ended && <TrackBar status={o.status} />}
      <div className="order-items">
        {o.items.map((item) => (
          <div className="mini" key={`${item.productId}-${item.optionId}`}>
            <Link className="slot" to={`/p/${item.slug}`} aria-label={item.name}>
              <ProductImage slug={item.slug} url={item.thumbnailUrl} width={112} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <Link to={`/p/${item.slug}`} style={{ textDecoration: 'none' }}>
                {item.name}
              </Link>
              {item.optionLabel && <div className="v">{item.optionLabel}</div>}
            </div>
            <span className="muted">×{item.quantity}</span>
          </div>
        ))}
      </div>
      <div className="order-actions">
        <button className="btn" type="button" onClick={buyAgain}>
          Buy again
        </button>
        <Link className="btn alt" to={`/orders/${o.orderNumber}`}>
          {o.status === 'DELIVERED' ? 'Write a review' : o.status === 'PLACED' ? 'Track or cancel' : 'Track'}
        </Link>
      </div>
    </article>
  )
}
