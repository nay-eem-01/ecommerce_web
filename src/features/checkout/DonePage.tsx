import { Link, useLocation } from 'react-router-dom'
import type { Order } from '../../api/types'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/Icon'
import { useSession } from '../auth/session'
import { NotFoundPage } from '../errors/NotFoundPage'
import { OrderTimeline } from '../orders/OrderTimeline'
import { lastOrder } from './lastOrder'

/** "Order placed. Thank you." with the order number, where the details went and the timeline. */
export function DonePage() {
  const location = useLocation()
  const order = (location.state as { order?: Order } | null)?.order ?? lastOrder()
  if (!order) return <NotFoundPage />
  return <Confirmation order={order} />
}

export function Confirmation({ order, heading }: { order: Order; heading?: string }) {
  useTitle('Order placed')
  const { status } = useSession()
  const first = order.fullName.trim().split(/\s+/)[0]
  const paid = order.paymentStatus === 'PAID'
  return (
    <div className="wrap">
      <div className="done">
        <div className="tick">
          <Icon name="check" />
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 className="page-title" style={{ padding: 0 }}>
            {heading ?? `Order placed. Thank you, ${first}.`}
          </h1>
          <p className="muted" style={{ fontSize: 17 }}>
            Order <strong style={{ color: 'var(--text)' }}>{order.orderNumber}</strong>.{' '}
            {order.email
              ? `We emailed the details to ${order.email}.`
              : `Keep this number to track your order with +88 ${order.phone}.`}
          </p>
        </div>
        <div className="panel" style={{ padding: 24, display: 'grid', gap: 16 }}>
          <OrderTimeline
            status={order.status}
            timeline={order.timeline}
            deliveryEstimate={order.deliveryEstimate}
            area={order.area || order.district}
            paymentMethod={order.paymentMethod}
            paid={paid}
            amountDue={order.amountDueOnDelivery}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            className="btn"
            to={status === 'signed-in' ? `/orders/${order.orderNumber}` : `/track?order=${encodeURIComponent(order.orderNumber)}`}
          >
            Track this order
          </Link>
          <Link className="btn alt" to="/shop">
            Keep shopping
          </Link>
        </div>
        {status !== 'signed-in' && (
          <div className="panel" style={{ padding: 20, display: 'grid', gap: 10 }}>
            <strong>Save your details for next time?</strong>
            <p className="muted">Verify your number with a one-time code. No password needed.</p>
            <Link className="link" to={`/sign-in?phone=${encodeURIComponent(order.phone)}`}>
              Create an account with +88 {order.phone}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
