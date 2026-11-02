import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import type { DeliveryOptions, ProductDetail, ProductOption } from '../../api/types'
import { releaseMonth } from '../../lib/dates'
import { tk } from '../../lib/money'
import { methodsSentence } from '../../lib/payments'
import { stockLine } from '../../lib/stock'
import { Icon } from '../../ui/Icon'
import { Stepper } from '../../ui/Stepper'
import { useToast } from '../../ui/Toast'
import { useCart } from '../cart/CartProvider'
import { MAX_QTY } from '../cart/guestStorage'

interface Props {
  product: ProductDetail
  option: ProductOption | null
  onOption: (option: ProductOption) => void
  delivery: DeliveryOptions | undefined
  /** Scrolls to a section below (size guide, delivery). */
  jump: (id: string) => void
}

/** Right column of the product page: what it is, price, vital facts, options, quantity and the buy buttons. */
export function BuyBox({ product: p, option, onOption, delivery, jump }: Props) {
  const cart = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const addButton = useRef<HTMLButtonElement>(null)
  const [stickyShown, setStickyShown] = useState(false)

  const unit = option ?? p
  const price = option?.price ?? p.price
  const stock = stockLine({ ...unit, preorderRelease: p.preorderRelease })
  const preorder = p.stockState === 'PREORDER'
  const canBuy = unit.stockState !== 'SOLD_OUT'
  const maxQty = unit.stockState === 'LOW_STOCK' && unit.stockLeft ? Math.min(unit.stockLeft, MAX_QTY) : MAX_QTY
  const save = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0
  const soldOutOptions = p.options.filter((o) => o.stockState === 'SOLD_OUT').map((o) => o.value)
  const wished = cart.wishlist.has(p.id)

  // A new option may have less stock than the chosen quantity.
  const shownQty = Math.min(qty, maxQty)

  async function add(thenCheckout = false) {
    setBusy(true)
    try {
      await cart.add({ productId: p.id, optionId: option?.id ?? null, quantity: shownQty })
      if (thenCheckout) navigate('/checkout')
      else toast(`Added to cart: ${p.name}`, ['View cart', '/cart'])
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function wish() {
    try {
      const on = await cart.toggleWish(p.id)
      toast(on ? 'Saved to your wishlist' : 'Removed from wishlist', on ? ['View', '/account/wishlist'] : null)
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  // The mobile buy bar appears once the add button scrolls out of view.
  useEffect(() => {
    const el = addButton.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((entries) => setStickyShown(!entries[0].isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [canBuy])

  const addLabel = preorder ? 'Reserve it' : 'Add to cart'
  return (
    <div className="buy">
      <div style={{ display: 'grid', gap: 8 }}>
        {p.maker && <p className="maker">{p.maker}</p>}
        <h1>{p.name}</h1>
        {p.summary && <p className="summary">{p.summary}</p>}
      </div>
      <div className="price-row">
        <span className="price">{tk(price)}</span>
        {save > 0 && (
          <>
            <span className="was">{tk(p.compareAtPrice)}</span>
            <span className="pill pink">Save {tk(save)}</span>
          </>
        )}
        <span className="note">
          Price includes VAT. <span className={`card-stock ${stock.tone}`}>{stock.text}</span>
        </span>
      </div>
      {p.facts.length > 0 && (
        <div className="facts">
          {p.facts.slice(0, 4).map((f) => (
            <div key={f.label}>
              <span>{f.label}</span>
              <strong>{f.value}</strong>
            </div>
          ))}
        </div>
      )}
      {p.options.length > 0 && (
        <div className="opt">
          <div className="opt-head">
            <strong>
              {p.optionName ?? 'Option'}: <span className="chosen">{option?.value ?? ''}</span>
            </strong>
            {p.sized && (
              <button type="button" className="link" onClick={() => jump('sec-size')}>
                Size guide
              </button>
            )}
          </div>
          <div className="chips" role="group" aria-label={p.optionName ?? 'Option'}>
            {p.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={o.swatch ? 'chip swatch' : 'chip'}
                aria-pressed={option?.id === o.id}
                disabled={o.stockState === 'SOLD_OUT'}
                aria-label={o.swatch ? o.value : undefined}
                title={o.swatch ? o.value : undefined}
                onClick={() => onOption(o)}
              >
                {o.swatch ? <i style={{ background: o.swatch }} /> : `${o.value}${o.priceDelta ? ` +${tk(o.priceDelta)}` : ''}`}
              </button>
            ))}
          </div>
          {soldOutOptions.length > 0 && canBuy && (
            <p className="muted" style={{ fontSize: 14 }}>
              {soldOutOptions.join(', ')} {soldOutOptions.length === 1 ? 'is' : 'are'} sold out.
            </p>
          )}
        </div>
      )}
      {canBuy ? (
        <div className="buy-actions">
          <Stepper value={shownQty} max={maxQty} label="Quantity" onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} />
          <button className="btn lg" type="button" ref={addButton} disabled={busy} onClick={() => add()}>
            <Icon name="cart" />
            {addLabel}
          </button>
          {!preorder && (
            <button className="btn alt lg" type="button" disabled={busy} onClick={() => add(true)}>
              Buy now
            </button>
          )}
        </div>
      ) : (
        <div className="panel" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong>Sold out</strong>
          <p className="muted">Save it to your wishlist to find it again when it is back.</p>
          {!wished && (
            <button className="btn alt" type="button" onClick={wish}>
              Save to wishlist
            </button>
          )}
        </div>
      )}
      <div className="wish-row">
        <button className="link" type="button" onClick={wish}>
          {wished ? 'Saved to wishlist' : 'Save to wishlist'}
        </button>
        <button className="link" type="button" onClick={() => jump('sec-delivery')}>
          Delivery and returns
        </button>
      </div>
      <div className="ship">
        {preorder ? (
          <div>
            <Icon name="box" />
            <span>
              <strong>Pre-order:</strong> arrives {releaseMonth(p.preorderRelease) || 'soon'}. We ship it as soon as it lands.
            </span>
          </div>
        ) : delivery ? (
          <div>
            <Icon name="truck" />
            <span>
              <strong>Delivery in {delivery.insideEstimate}</strong> inside Dhaka ({tk(delivery.insideFee)}), {delivery.outsideEstimate}{' '}
              elsewhere ({tk(delivery.outsideFee)}). Free over {tk(delivery.freeDeliveryThreshold)}.
            </span>
          </div>
        ) : null}
        <div>
          <Icon name="cash" />
          <span>{payLine(delivery)}</span>
        </div>
        <div>
          <Icon name="return" />
          <span>
            <strong>7-day returns</strong> if the box is unopened, or any time if it arrives damaged.
          </span>
        </div>
      </div>
      {canBuy && (
        <div className={stickyShown ? 'sticky-buy show' : 'sticky-buy'} aria-hidden={!stickyShown}>
          <div className="nm">
            <strong>{p.name}</strong>
            <span className="price">{tk(price)}</span>
          </div>
          <button className="btn" type="button" tabIndex={stickyShown ? 0 : -1} disabled={busy} onClick={() => add()}>
            {preorder ? 'Reserve' : 'Add to cart'}
          </button>
        </div>
      )}
    </div>
  )
}

function payLine(delivery: DeliveryOptions | undefined) {
  const methods = delivery?.paymentMethods ?? ['COD']
  const [first, ...rest] = methodsSentence(methods).split(/, | or /)
  const others = methodsSentence(methods).slice(first.length)
  return (
    <>
      <strong>{first}</strong>
      {rest.length ? others : ''}.
    </>
  )
}
