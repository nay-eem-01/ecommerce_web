import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import type { OrderSummary } from '../../api/types'
import { shortDate } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useToast } from '../../ui/Toast'
import { useBag } from '../cart/BagContext'
import { useCart } from '../cart/CartProvider'
import { ProductImage } from '../catalog/ProductImage'
import { STATUS_LABEL, TrackBar } from '../orders/OrderTimeline'

const TAG: Record<OrderSummary['status'], string> = {
  PLACED: 'Placed',
  PACKED: 'Packed',
  SHIPPED: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

/**
 * The design's order cards. An open order: cyan frame, status, four-step bar, thumbnails, what to have ready and
 * its details. A finished one: one row with Buy again and, once delivered, Write a review.
 */
export function OrderCard({ order: o }: { order: OrderSummary }) {
  const cart = useCart()
  const bag = useBag()
  const toast = useToast()
  const open = o.status === 'PLACED' || o.status === 'PACKED' || o.status === 'SHIPPED'
  const meta = `${shortDate(o.placedAt)} · ${METHOD_NAMES[o.paymentMethod]}`
  const first = o.items[0]

  async function buyAgain() {
    try {
      for (const item of o.items) await cart.add({ productId: item.productId, optionId: item.optionId, quantity: item.quantity })
      bag.open()
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  const tag = (
    <span className={open ? 'tag cyan' : 'tag'} style={open ? undefined : { color: o.status === 'DELIVERED' ? 'var(--ok)' : 'var(--warn)' }}>
      {TAG[o.status]}
    </span>
  )

  if (open) {
    return (
      <article className="panel ocard open" aria-label={`Order ${o.orderNumber}, ${STATUS_LABEL[o.status]}`}>
        <div className="ocard-top">
          <div>
            <p className="ocard-id">{o.orderNumber}</p>
            <p className="meta">
              {meta}
              <span className="d-only-inline"> · {tk(o.total)}</span>
            </p>
          </div>
          {tag}
        </div>
        <TrackBar status={o.status} />
        <div className="ocard-items">
          {o.items.map((item) => (
            <Link key={`${item.productId}-${item.optionId}`} className="ocard-thumb" to={`/p/${item.slug}`} aria-label={item.name}>
              <span>
                <ProductImage slug={item.slug} url={item.thumbnailUrl} />
              </span>
            </Link>
          ))}
          <div className="ocard-due d-only">
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{o.paymentMethod === 'COD' ? 'Have ready' : 'Total'}</p>
            <p className="price" style={{ fontSize: 22 }}>
              {tk(o.total)}
            </p>
          </div>
        </div>
        <div className="ocard-due-row ph-only">
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{o.paymentMethod === 'COD' ? 'Have ready' : 'Total'}</span>
          <span className="price" style={{ fontSize: 18 }}>
            {tk(o.total)}
          </span>
        </div>
        <div className="ocard-actions">
          <Link className="btn ghost" to={`/orders/${o.orderNumber}`}>
            Order details
          </Link>
          {o.status === 'PLACED' && (
            <Link className="btn ghost d-only" to={`/orders/${o.orderNumber}`}>
              Cancel order
            </Link>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="panel ocard" aria-label={`Order ${o.orderNumber}, ${STATUS_LABEL[o.status]}`}>
      <div className="ocard-top ph-only">
        <div>
          <p className="ocard-id">{o.orderNumber}</p>
          <p className="meta">{meta}</p>
        </div>
        {tag}
      </div>
      <div className="ocard-row">
        {first && (
          <Link className="ocard-thumb" to={`/p/${first.slug}`} aria-label={first.name}>
            <span>
              <ProductImage slug={first.slug} url={first.thumbnailUrl} />
            </span>
          </Link>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="ocard-id d-only">
            {o.orderNumber} <span style={{ marginLeft: 8 }}>{tag}</span>
          </p>
          <p className="meta d-only" style={{ marginTop: 4 }}>
            {meta} · {tk(o.total)}
          </p>
          {first && (
            <p style={{ fontSize: 14, fontWeight: 700 }}>
              {first.name}
              {o.items.length > 1 ? ` and ${o.items.length - 1} more` : ''}
            </p>
          )}
          <p className="ph-only" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {[first?.optionLabel?.replace(/^[^:]+:\s*/, ''), first ? `×${first.quantity}` : null, tk(o.total)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="ocard-actions">
          <button className="btn" type="button" onClick={buyAgain}>
            Buy again
          </button>
          {o.status === 'DELIVERED' && first ? (
            <Link className="btn ghost" to={`/p/${first.slug}#reviews`}>
              Write a review
            </Link>
          ) : (
            <Link className="btn ghost" to={`/orders/${o.orderNumber}`}>
              Details
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
