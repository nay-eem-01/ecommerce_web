import { Link } from 'react-router-dom'
import { useDeliveryOptions, useQuote } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import type { CartLine, QuoteLine } from '../../api/types'
import { releaseMonth } from '../../lib/dates'
import { tk } from '../../lib/money'
import { methodsSentence } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { PageLoading } from '../../layout/AppLayout'
import { Icon } from '../../ui/Icon'
import { Stepper } from '../../ui/Stepper'
import { useToast } from '../../ui/Toast'
import { ProductImage } from '../catalog/ProductImage'
import { useCart } from './CartProvider'
import { MAX_QTY } from './guestStorage'
import { useDropStaleLines } from './useStaleLines'

export function CartPage() {
  useTitle('Your cart')
  const cart = useCart()
  const delivery = useDeliveryOptions()
  const quote = useQuote(cart.lines, 'Dhaka')
  useDropStaleLines(quote.error, cart.lines)
  const unavailable = (cart.serverLines ?? []).filter((l) => !l.available)

  if (!cart.ready) return <PageLoading />

  if (!cart.lines.length && !unavailable.length) {
    return (
      <div className="wrap">
        <h1 className="page-title" style={{ paddingTop: 24 }}>
          Your cart
        </h1>
        <div className="empty panel">
          <h2 className="h3">Your cart is empty</h2>
          <p className="muted">Start with this week’s new arrivals.</p>
          <Link className="btn" to="/shop">
            Browse products
          </Link>
        </div>
        <div style={{ height: 64 }} />
      </div>
    )
  }

  const q = quote.data
  const threshold = q?.freeDeliveryThreshold ?? delivery.data?.freeDeliveryThreshold ?? 0
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span>Cart</span>
      </nav>
      <h1 className="page-title">
        Your cart{' '}
        <span className="muted" style={{ fontSize: '.5em' }}>
          {cart.count} item{cart.count === 1 ? '' : 's'}
        </span>
      </h1>
      <div className="cart-layout">
        <section aria-label="Items">
          {q
            ? q.lines.map((line) => <Line key={`${line.productId}-${line.optionId}`} line={line} />)
            : quote.error
              ? null
              : <p className="muted">Pricing your cart…</p>}
          {unavailable.map((line) => (
            <UnavailableLine key={line.itemId} line={line} />
          ))}
        </section>
        <aside className="panel summary-box" aria-label="Order summary">
          <h2 className="h3">Summary</h2>
          {quote.error && !q ? (
            <p role="alert">{errorMessage(quote.error)}</p>
          ) : q ? (
            <>
              <div className="free-bar">
                {q.amountToFreeDelivery > 0 ? (
                  <span>
                    Add <strong>{tk(q.amountToFreeDelivery)}</strong> more for free delivery
                  </span>
                ) : (
                  <span>
                    <strong>Free delivery</strong> unlocked
                  </span>
                )}
                <div className="bar">
                  <i style={{ transform: `scaleX(${threshold ? Math.min(1, q.subtotal / threshold) : 1})` }} />
                </div>
              </div>
              <div className="sum-row">
                <span>Subtotal</span>
                <span>{tk(q.subtotal)}</span>
              </div>
              <div className="sum-row">
                <span>Delivery, inside Dhaka</span>
                <span>{q.deliveryFee ? tk(q.deliveryFee) : 'Free'}</span>
              </div>
              {delivery.data && q.deliveryFee > 0 && (
                <p className="muted" style={{ fontSize: 14 }}>
                  Outside Dhaka is {tk(delivery.data.outsideFee)}. You pick the address at checkout.
                </p>
              )}
              <div className="sum-row total">
                <span>Total</span>
                <span>{tk(q.total)}</span>
              </div>
              {!q.allInStock && (
                <p className="err" style={{ color: 'var(--bad)', fontSize: 14, display: 'flex', gap: 6 }}>
                  <Icon name="alert" />
                  Lower the quantity of the items marked above before checking out.
                </p>
              )}
              <Link className="btn lg block" to="/checkout" aria-disabled={!q.allInStock} onClick={(e) => !q.allInStock && e.preventDefault()}>
                Go to checkout
              </Link>
            </>
          ) : (
            <p className="muted">Pricing…</p>
          )}
          <div className="trust">
            <div>
              <Icon name="cash" />
              <span>Pay cash to the rider{delivery.data && delivery.data.paymentMethods.length > 1 ? `, or pay by ${methodsSentence(delivery.data.paymentMethods.filter((m) => m !== 'COD'))}` : ''}</span>
            </div>
            <div>
              <Icon name="shield" />
              <span>Open the parcel and check it before you pay</span>
            </div>
            <div>
              <Icon name="return" />
              <span>7-day returns on unopened items</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Line({ line }: { line: QuoteLine }) {
  const cart = useCart()
  const toast = useToast()
  const to = `/p/${line.slug}`
  const key = { productId: line.productId, optionId: line.optionId }

  async function run(action: () => Promise<unknown>, message?: string, link?: [string, string]) {
    try {
      await action()
      if (message) toast(message, link)
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  const status = line.preorder
    ? `Pre-order, arrives ${releaseMonth(line.preorderRelease) || 'soon'}`
    : line.stockState === 'LOW_STOCK'
      ? 'Only a few left'
      : 'In stock'
  return (
    <div className="line-item">
      <Link className="slot" to={to} aria-label={line.name}>
        <ProductImage slug={line.slug} url={line.thumbnailUrl} width={160} />
      </Link>
      <div style={{ minWidth: 0 }}>
        <Link className="nm" to={to}>
          {line.name}
        </Link>
        {line.optionLabel && <p className="var">{line.optionLabel}</p>}
        <p className="var">{status}</p>
        {!line.enoughStock && (
          <p className="var" style={{ color: 'var(--bad)' }}>
            {line.stockState === 'SOLD_OUT' ? 'Sold out now. Remove it to check out.' : 'Not enough left for this quantity. Lower it to check out.'}
          </p>
        )}
        <div className="ctl">
          <Stepper
            value={line.quantity}
            max={MAX_QTY}
            label={`Quantity for ${line.name}`}
            onChange={(n) => run(() => cart.setQuantity({ ...key, quantity: n }))}
          />
          <button className="link" type="button" onClick={() => run(() => cart.setQuantity({ ...key, quantity: 0 }), `Removed ${line.name}`)}>
            Remove
          </button>
          <button
            className="link"
            type="button"
            onClick={() =>
              run(
                async () => {
                  if (!cart.wishlist.has(line.productId)) await cart.toggleWish(line.productId)
                  await cart.setQuantity({ ...key, quantity: 0 })
                },
                'Moved to your wishlist',
                ['View', '/account/wishlist'],
              )
            }
          >
            Save for later
          </button>
        </div>
      </div>
      <div className="right">
        <span className="price">{tk(line.lineTotal)}</span>
        {line.quantity > 1 && <span className="each">{tk(line.unitPrice)} each</span>}
      </div>
    </div>
  )
}

/** A member's line whose product was archived: excluded from the total, removable. */
function UnavailableLine({ line }: { line: CartLine }) {
  const cart = useCart()
  return (
    <div className="line-item">
      <span className="slot" aria-hidden="true">
        <ProductImage slug={line.slug} url={line.thumbnailUrl} width={160} />
      </span>
      <div style={{ minWidth: 0 }}>
        <span className="nm">{line.name}</span>
        <p className="var" style={{ color: 'var(--warn)' }}>
          No longer available. It is not in your total.
        </p>
        <div className="ctl">
          <button className="link" type="button" onClick={() => cart.removeItem(line.itemId)}>
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
