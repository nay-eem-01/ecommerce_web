import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import { useCancelOrder, useMyOrder } from '../../api/orders'
import type { Order, OrderItem } from '../../api/types'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { PageLoading } from '../../layout/AppLayout'
import { useToast } from '../../ui/Toast'
import { useSession } from '../auth/session'
import { useCart } from '../cart/CartProvider'
import { ProductImage } from '../catalog/ProductImage'
import { RetryButton } from '../checkout/PaymentResultPage'
import { NotFoundPage } from '../errors/NotFoundPage'
import { OrderTimeline, STATUS_LABEL } from './OrderTimeline'

const PAYMENT_LABEL: Record<Order['paymentStatus'], string> = {
  PENDING: 'Not paid yet',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  CANCELLED: 'Payment cancelled',
  EXPIRED: 'Payment expired',
  REFUNDED: 'Refunded',
}

/** One order in full (the order email links here). Signed-in shoppers only; guests are sent to tracking. */
export function OrderPage() {
  const { orderNumber = '' } = useParams()
  const { status } = useSession()
  useTitle(`Order ${orderNumber}`)
  const order = useMyOrder(orderNumber, status === 'signed-in')

  if (status === 'restoring') return <PageLoading />
  if (status !== 'signed-in') {
    return (
      <div className="page">
        <div className="auth">
          <h1 className="display page-h1" style={{ padding: 0 }}>
            Order {orderNumber}
          </h1>
          <div className="panel">
            <p>Sign in with the number you ordered with to see this order, or track it with the order number and phone.</p>
            <Link className="btn block" to={`/sign-in?back=${encodeURIComponent(`/orders/${orderNumber}`)}`}>
              Sign in
            </Link>
            <Link className="btn ghost block" to={`/track?order=${encodeURIComponent(orderNumber)}`}>
              Track without signing in
            </Link>
          </div>
        </div>
      </div>
    )
  }
  if (order.isPending) return <PageLoading />
  if (order.error) return (order.error as { status?: number }).status === 404 ? <NotFoundPage /> : <p className="page">{errorMessage(order.error)}</p>
  return <OrderDetail order={order.data} />
}

function OrderDetail({ order: o }: { order: Order }) {
  const cancel = useCancelOrder(o.orderNumber)
  const cart = useCart()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const online = o.paymentMethod !== 'COD'
  const canPay = online && o.status === 'PLACED' && ['PENDING', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(o.paymentStatus)

  async function buyAgain() {
    try {
      for (const item of o.items) await cart.add({ productId: item.productId, optionId: item.optionId, quantity: item.quantity })
      toast('Added to your cart', ['View cart', '/cart'])
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  return (
    <div className="page" style={{ paddingTop: 24, paddingBottom: 64, display: 'grid', gap: 24, maxWidth: 880 }}>
      <nav className="meta crumbs" aria-label="Breadcrumb" style={{ padding: 0 }}>
        <Link to="/account">My orders</Link>
        <span aria-hidden="true">/</span>
        <span>{o.orderNumber}</span>
      </nav>
      <div className="order-top">
        <h1 className="display page-h1" style={{ padding: 0 }}>
          Order {o.orderNumber}
        </h1>
        <span className={`tag ${o.status === 'DELIVERED' ? 'ok' : o.status === 'CANCELLED' ? 'warn' : 'pre'}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      <p className="muted">
        Placed {dateTime(o.placedAt)}. {METHOD_NAMES[o.paymentMethod]}: {PAYMENT_LABEL[o.paymentStatus]}.
      </p>
      <div className="panel" style={{ padding: 24 }}>
        <OrderTimeline
          status={o.status}
          timeline={o.timeline}
          deliveryEstimate={o.deliveryEstimate}
          area={o.area || o.district}
          paymentMethod={o.paymentMethod}
          paid={o.paymentStatus === 'PAID'}
          amountDue={o.amountDueOnDelivery}
        />
      </div>
      <section className="panel order" aria-label="Items">
        <div className="order-items">
          {o.items.map((item) => (
            <Item key={`${item.productId}-${item.optionId}`} item={item} delivered={o.status === 'DELIVERED'} />
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div className="sum-row">
            <span>Subtotal</span>
            <span>{tk(o.subtotal)}</span>
          </div>
          <div className="sum-row">
            <span>Delivery to {o.district}</span>
            <span>{o.deliveryFee ? tk(o.deliveryFee) : 'Free'}</span>
          </div>
          <div className="sum-row total">
            <span>Total</span>
            <span>{tk(o.total)}</span>
          </div>
          {o.amountDueOnDelivery > 0 && (
            <p className="muted" style={{ fontSize: 14 }}>
              Have {tk(o.amountDueOnDelivery)} ready for the rider.
            </p>
          )}
        </div>
      </section>
      <section className="panel addr" aria-label="Delivery address">
        <strong>{o.fullName}</strong>
        <span>{o.addressLine}</span>
        <span>
          {o.area}, {o.district}
        </span>
        <span className="muted">+88 {o.phone}</span>
        {o.note && <span className="muted">Note: {o.note}</span>}
      </section>
      <div className="order-actions">
        {canPay && <RetryButton orderNumber={o.orderNumber} phone={o.phone} label="Pay now" />}
        <button className="btn ghost" type="button" onClick={buyAgain}>
          Buy again
        </button>
        {o.canCancel &&
          (confirming ? (
            <>
              <button
                className="btn ghost"
                type="button"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(undefined, {
                    onSuccess: () => toast('Order cancelled'),
                    onError: (e) => toast(errorMessage(e)),
                    onSettled: () => setConfirming(false),
                  })
                }
              >
                {cancel.isPending ? 'Cancelling…' : 'Yes, cancel this order'}
              </button>
              <button className="btn ghost" type="button" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button className="btn ghost" type="button" onClick={() => setConfirming(true)}>
              Cancel order
            </button>
          ))}
      </div>
      {o.canCancel && online && o.paymentStatus === 'PAID' && confirming && (
        <p className="muted">Cancelling a paid order refunds it to the same {METHOD_NAMES[o.paymentMethod]} account.</p>
      )}
    </div>
  )
}

function Item({ item, delivered }: { item: OrderItem; delivered: boolean }) {
  return (
    <div className="mini">
      <Link className="slot" to={`/p/${item.slug}`} aria-label={item.name}>
        <ProductImage slug={item.slug} url={item.thumbnailUrl} />
      </Link>
      <div style={{ minWidth: 0 }}>
        <Link to={`/p/${item.slug}`} style={{ textDecoration: 'none' }}>
          {item.name}
        </Link>
        {item.optionLabel && <div className="v">{item.optionLabel}</div>}
        {delivered && (
          <Link className="link" style={{ fontSize: 14 }} to={`/p/${item.slug}#sec-reviews`}>
            Write a review
          </Link>
        )}
      </div>
      <span className="muted">
        ×{item.quantity} · {tk(item.lineTotal)}
      </span>
    </div>
  )
}
