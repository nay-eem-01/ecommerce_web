import { Link, useLocation } from 'react-router-dom'
import { useProducts } from '../../api/catalog'
import type { Order, OrderStatus } from '../../api/types'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { useSession } from '../auth/session'
import { ProductCard } from '../catalog/ProductCard'
import { ProductImage } from '../catalog/ProductImage'
import { NotFoundPage } from '../errors/NotFoundPage'
import { lastOrder } from './lastOrder'

/** "Order placed. Thank you." with the order number, what happens next, what to have ready and the school kit. */
export function DonePage() {
  const location = useLocation()
  const order = (location.state as { order?: Order } | null)?.order ?? lastOrder()
  if (!order) return <NotFoundPage />
  return <Confirmation order={order} />
}

const STEPS: Array<[OrderStatus, string]> = [
  ['PLACED', 'Order placed'],
  ['PACKED', 'Packed'],
  ['SHIPPED', 'With the rider'],
  ['DELIVERED', 'Delivered'],
]

/** Each step's state and its line under the name: the time it happened, "Next", or "Coming up". */
export function progressSteps(order: Pick<Order, 'status' | 'timeline' | 'deliveryEstimate'>) {
  const reached = STEPS.findIndex(([s]) => s === order.status)
  const done = reached < 0 ? 0 : reached
  return STEPS.map(([status, label], i) => {
    const at = order.timeline.find((t) => t.status === status)?.at
    const state = i <= done ? 'done' : i === done + 1 ? 'next' : 'later'
    const sub = state === 'done' ? dateTime(at) : status === 'DELIVERED' ? `In ${order.deliveryEstimate}` : state === 'next' ? 'Next' : 'Coming up'
    return { status, label, state, sub }
  })
}

export function Confirmation({ order, heading }: { order: Order; heading?: string }) {
  useTitle('Order placed')
  const { status } = useSession()
  const member = status === 'signed-in'
  const first = order.fullName.trim().split(/\s+/)[0]
  const paid = order.paymentStatus === 'PAID'
  const steps = progressSteps(order)
  const kit = useProducts({ category: 'bags', sort: 'newest', pageSize: 4 })
  const bought = new Set(order.items.map((i) => i.productId))
  const cross = (kit.data?.content ?? []).filter((p) => !bought.has(p.id))
  const track = member ? `/orders/${order.orderNumber}` : `/track?order=${encodeURIComponent(order.orderNumber)}`
  const due = order.amountDueOnDelivery

  const ready =
    due > 0 ? (
      <div className="done-ready">
        <div>
          <p className="eyebrow pink">Have this ready</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {order.paymentMethod === 'COD' ? 'Cash to the rider, after you check it' : 'Due to the rider on delivery'}
          </p>
        </div>
        <span className="display done-due">{tk(due)}</span>
      </div>
    ) : (
      <div className="done-ready">
        <div>
          <p className="eyebrow pink">{paid ? 'Paid' : 'Nothing to pay the rider'}</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{paid ? `By ${METHOD_NAMES[order.paymentMethod]}` : 'You confirm the payment online.'}</p>
        </div>
        <span className="display done-due">{tk(order.total)}</span>
      </div>
    )

  const account = !member && (
    <div className="done-account">
      <div>
        <p style={{ fontWeight: 700 }}>Save your details for next time</p>
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>One code by SMS, no password. Your address and this order are saved.</p>
      </div>
      <Link className="link ph-only" style={{ fontSize: 14 }} to={`/sign-in?phone=${encodeURIComponent(order.phone)}`}>
        Create an account with +88 {order.phone}
      </Link>
      <Link className="btn ghost d-only" to={`/sign-in?phone=${encodeURIComponent(order.phone)}`}>
        Create an account
      </Link>
    </div>
  )

  return (
    <div className="done">
      <section className="hero done-hero">
        <span className="sign" aria-hidden="true">
          ありがとう
        </span>
        <div className="page done-hero-copy">
          <div className="done-tick">
            <Icon name="check" />
          </div>
          <h1 className="display">{heading ?? `Order placed. Thank you, ${first}.`}</h1>
          <p style={{ color: 'var(--text-2)' }}>
            Order <b style={{ color: 'var(--text)' }}>{order.orderNumber}</b>.{' '}
            {order.email ? `We emailed the details to ${order.email}.` : `Keep this number to track it with +88 ${order.phone}.`}
          </p>
        </div>
      </section>

      <section className="page done-grid">
        <div className="panel done-next">
          <p className="eyebrow d-only">What happens next</p>
          <ol className="done-steps" aria-label="Order progress">
            {steps.map((s) => (
              <li key={s.status} className={s.state}>
                <i aria-hidden="true">{s.state === 'done' && <Icon name="check" small />}</i>
                <div>
                  <p style={{ fontWeight: 700 }}>
                    {s.status === 'DELIVERED' && order.area ? (
                      <>
                        Delivered<span className="ph-only-inline"> to {order.area}</span>
                      </>
                    ) : (
                      s.label
                    )}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>{s.sub}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="ph-only">{ready}</div>
          <div className="done-actions">
            <Link className="btn" to={track}>
              Track order
            </Link>
            <Link className="btn ghost" to="/shop">
              Keep shopping
            </Link>
          </div>
          <div className="d-only">{account}</div>
        </div>

        <aside className="panel done-aside d-only" aria-label="Order details">
          {ready}
          {order.items.map((i) => (
            <div className="line co-mini" key={`${i.productId}-${i.optionId}`}>
              <div className="thumb">
                <div className="art">
                  <ProductImage slug={i.slug} url={i.thumbnailUrl} />
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{i.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{[i.optionLabel?.replace(/^[^:]+:\s*/, ''), `×${i.quantity}`].filter(Boolean).join(' · ')}</p>
              </div>
              <span className="price" style={{ fontSize: 14 }}>
                {tk(i.lineTotal)}
              </span>
            </div>
          ))}
          <div className="row">
            <span>Delivery to {order.district}</span>
            <span>{order.deliveryFee ? tk(order.deliveryFee) : 'Free'}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{tk(order.total)}</span>
          </div>
          <div className="done-address">
            <b style={{ color: 'var(--text)' }}>Delivering to</b>
            <span>{order.addressLine}</span>
            <span>
              {order.area}, {order.district}
            </span>
          </div>
        </aside>
      </section>

      {account && <section className="page ph-only" style={{ paddingTop: 8 }}>{account}</section>}

      {cross.length > 0 && (
        <section className="page pd-also done-kit">
          <div className="sec-head">
            <h2>Complete the school kit</h2>
            <Link className="ulink d-only" to="/shop/bags">
              School bags
            </Link>
          </div>
          <div className="pd-also-row">
            {cross.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
