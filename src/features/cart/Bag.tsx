import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuote } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import { useProduct, useRelated } from '../../api/products'
import type { CartLine, LineInput, ProductSummary, Quote, QuoteLine } from '../../api/types'
import { releaseMonth } from '../../lib/dates'
import { tk } from '../../lib/money'
import { Icon } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { ProductImage } from '../catalog/ProductImage'
import { useBag } from './BagContext'
import { useCart } from './CartProvider'
import { MAX_QTY } from './guestStorage'
import { useDropStaleLines } from './useStaleLines'

/** The bag as a drawer over any page: full screen on phone, a 460 px panel from the right on desktop. */
export function BagDrawer() {
  const bag = useBag()
  const { pathname } = useLocation()
  const closeButton = useRef<HTMLButtonElement>(null)
  const lastPath = useRef(pathname)

  // A link inside the bag (a product, checkout) closes it.
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname
      bag.close()
    }
  }, [pathname, bag])

  useEffect(() => {
    if (!bag.isOpen) return
    const before = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && bag.close()
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('keydown', key)
      document.body.style.overflow = overflow
      before?.focus?.()
    }
  }, [bag.isOpen, bag])

  if (!bag.isOpen) return null
  return (
    <div className="bag-layer">
      <button className="bag-scrim" type="button" tabIndex={-1} aria-label="Close bag" onClick={bag.close} />
      <div className="bag-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title">
        <BagPanel onClose={bag.close} closeRef={closeButton} />
      </div>
    </div>
  )
}

/** `/cart`: the same bag as a page, for links and the no-JavaScript-drawer case of a reload. */
export function CartPage() {
  return (
    <div className="bag-page">
      <BagPanel />
    </div>
  )
}

interface PanelProps {
  onClose?: () => void
  closeRef?: React.Ref<HTMLButtonElement>
}

function BagPanel({ onClose, closeRef }: PanelProps) {
  const cart = useCart()
  const quote = useQuote(cart.lines, 'Dhaka')
  useDropStaleLines(quote.error, cart.lines)
  const unavailable = (cart.serverLines ?? []).filter((l) => !l.available)
  const q = quote.data
  const empty = cart.ready && !cart.lines.length && !unavailable.length

  return (
    <>
      <div className="bag-head">
        <h1 className="display" id="bag-title">
          Your bag{' '}
          <span style={{ color: 'var(--muted)', fontSize: 15 }}>
            {cart.count} item{cart.count === 1 ? '' : 's'}
          </span>
        </h1>
        {onClose ? (
          <button className="ibtn" type="button" ref={closeRef} aria-label="Close bag" onClick={onClose}>
            <Icon name="close" />
          </button>
        ) : (
          <Link className="ibtn" to="/shop" aria-label="Close bag">
            <Icon name="close" />
          </Link>
        )}
      </div>

      {q && !empty && <FreeBar quote={q} />}

      <div className="bag-body">
        <section aria-label="Items">
          {empty ? (
            <div className="bag-empty">
              <p className="display" style={{ fontSize: 20 }}>
                Your bag is empty
              </p>
              <p style={{ color: 'var(--muted)' }}>Start with the back-to-school drop.</p>
              <Link className="btn" to="/shop" onClick={onClose}>
                Shop the drop
              </Link>
            </div>
          ) : q ? (
            q.lines.map((line) => <Line key={`${line.productId}-${line.optionId}`} line={line} onClose={onClose} />)
          ) : quote.error ? (
            <p role="alert" style={{ padding: '16px 0' }}>
              {errorMessage(quote.error)}
            </p>
          ) : cart.lines.length ? (
            <p style={{ padding: '16px 0', color: 'var(--muted)' }}>Pricing your bag…</p>
          ) : null}
          {unavailable.map((line) => (
            <UnavailableLine key={line.itemId} line={line} />
          ))}
        </section>
        {q && q.lines.length > 0 && <AddOn quote={q} />}
      </div>

      {q && !empty && (
        <div className="bag-foot">
          <div className="row">
            <span>Subtotal</span>
            <span>{tk(q.subtotal)}</span>
          </div>
          <div className="row">
            <span>Delivery</span>
            <span>{q.deliveryFee ? `${tk(q.deliveryFee)} in Dhaka` : 'Free'}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{tk(q.total)}</span>
          </div>
          {!q.allInStock && (
            <p role="alert" style={{ color: 'var(--bad)', fontSize: 13, display: 'flex', gap: 6 }}>
              <Icon name="alert" small />
              Lower the quantity of the items marked above to check out.
            </p>
          )}
          <Link
            className="btn block"
            style={{ marginTop: 6 }}
            to="/checkout"
            aria-disabled={!q.allInStock}
            onClick={(e) => {
              if (!q.allInStock) e.preventDefault()
              else onClose?.()
            }}
          >
            Checkout · {tk(q.total)}
          </Link>
          <p className="ph-only" style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            No account needed · Cash on delivery or bKash · 7-day returns
          </p>
          {onClose && (
            <button className="ulink d-only" type="button" style={{ alignSelf: 'center', marginTop: 4, border: 0, borderBottom: '1px solid currentColor', background: 'transparent' }} onClick={onClose}>
              Continue shopping
            </button>
          )}
        </div>
      )}
    </>
  )
}

function FreeBar({ quote: q }: { quote: Quote }) {
  const pct = q.freeDeliveryThreshold ? Math.min(100, (q.subtotal / q.freeDeliveryThreshold) * 100) : 100
  return (
    <div className="bag-free">
      {q.amountToFreeDelivery > 0 ? (
        <p style={{ fontSize: 14 }}>
          You are <b>{tk(q.amountToFreeDelivery)}</b> away from <b>free delivery</b>
        </p>
      ) : (
        <p style={{ fontSize: 14 }}>
          <b style={{ color: 'var(--ok)' }}>Free delivery unlocked.</b>
        </p>
      )}
      <div className="bar" role="progressbar" aria-label="Towards free delivery" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function useRun() {
  const toast = useToast()
  return async (action: () => Promise<unknown>, message?: string, link?: [string, string]) => {
    try {
      await action()
      if (message) toast(message, link)
    } catch (error) {
      toast(errorMessage(error))
    }
  }
}

function Line({ line, onClose }: { line: QuoteLine; onClose?: () => void }) {
  const cart = useCart()
  const run = useRun()
  const to = `/p/${line.slug}`
  const key = { productId: line.productId, optionId: line.optionId }
  const stock = !line.enoughStock
    ? { text: line.stockState === 'SOLD_OUT' ? 'Sold out now. Remove it to check out.' : 'Not enough left for this quantity.', color: 'var(--bad)' }
    : line.preorder
      ? { text: `Pre-order, arrives ${releaseMonth(line.preorderRelease) || 'soon'}`, color: 'var(--cyan)' }
      : line.stockState === 'LOW_STOCK'
        ? { text: 'Only a few left', color: 'var(--warn)' }
        : { text: 'In stock, ships today', color: 'var(--ok)' }
  const setQty = (n: number) => run(() => cart.setQuantity({ ...key, quantity: n }))

  return (
    <div className="line">
      <Link className="thumb" to={to} aria-label={line.name} onClick={onClose}>
        <div className="art">
          <ProductImage slug={line.slug} url={line.thumbnailUrl} />
        </div>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <Link to={to} style={{ fontSize: 14, fontWeight: 700 }} onClick={onClose}>
            {line.name}
          </Link>
          <span className="price" style={{ fontSize: 14 }}>
            {tk(line.lineTotal)}
          </span>
        </div>
        {line.optionLabel && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{line.optionLabel}</p>}
        <p style={{ fontSize: 12, color: stock.color }}>{stock.text}</p>
        <div className="bag-ctl">
          <div className="qty" role="group" aria-label={`Quantity for ${line.name}`}>
            <button type="button" aria-label="One less" disabled={line.quantity <= 1} onClick={() => setQty(line.quantity - 1)}>
              −
            </button>
            <b>{line.quantity}</b>
            <button type="button" aria-label="One more" disabled={line.quantity >= MAX_QTY} onClick={() => setQty(line.quantity + 1)}>
              +
            </button>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
            <button
              type="button"
              className="bag-link"
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
            <button type="button" className="bag-link" onClick={() => run(() => cart.setQuantity({ ...key, quantity: 0 }), `Removed ${line.name}`)}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A member's line whose product was archived: excluded from the total, removable. */
function UnavailableLine({ line }: { line: CartLine }) {
  const cart = useCart()
  return (
    <div className="line">
      <span className="thumb" aria-hidden="true">
        <span className="art">
          <ProductImage slug={line.slug} url={line.thumbnailUrl} />
        </span>
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{line.name}</span>
        <p style={{ fontSize: 12, color: 'var(--warn)' }}>No longer available. It is not in your total.</p>
        <button type="button" className="bag-link" style={{ alignSelf: 'flex-start' }} onClick={() => cart.removeItem(line.itemId)}>
          Remove
        </button>
      </div>
    </div>
  )
}

/**
 * One suggestion under the lines. If the first item is part of a set the bag does not hold, swap one of it for the
 * set (the set's price is what the shopper pays). Otherwise, while short of free delivery, the related product that
 * gets there for the least.
 */
function AddOn({ quote: q }: { quote: Quote }) {
  const cart = useCart()
  const run = useRun()
  const first = q.lines[0]
  const detail = useProduct(first.slug)
  const related = useRelated(first.slug)
  const inBag = new Set(q.lines.map((l) => l.productId))

  const offer = detail.data?.sets.find((s) => !inBag.has(s.set.id) && s.set.stockState !== 'SOLD_OUT')
  if (offer) {
    const swap = async () => {
      await cart.add({ productId: offer.set.id, optionId: null, quantity: 1 })
      await cart.setQuantity({ productId: first.productId, optionId: first.optionId, quantity: first.quantity - 1 })
    }
    return (
      <Suggestion
        eyebrow="Complete the set"
        product={offer.set}
        line={offer.saving ? `Swap for the set and save ${tk(offer.saving)}` : `Both for ${tk(offer.set.price)}`}
        pink
        onAdd={() => run(swap, `Swapped for ${offer.set.name}`)}
      />
    )
  }
  if (q.amountToFreeDelivery <= 0) return null
  const pick = pickForFreeDelivery(related.data ?? [], inBag, q.amountToFreeDelivery)
  if (!pick) return null
  const lineInput: LineInput = { productId: pick.id, optionId: pick.swatches[0]?.optionId ?? null, quantity: 1 }
  return <Suggestion eyebrow="Add to reach free delivery" product={pick} onAdd={() => run(() => cart.add(lineInput), `Added ${pick.name}`)} />
}

/** The cheapest buyable product that reaches the threshold, else the dearest one below it. */
export function pickForFreeDelivery(products: ProductSummary[], inBag: Set<number>, missing: number): ProductSummary | null {
  const buyable = products.filter((p) => !inBag.has(p.id) && p.stockState !== 'SOLD_OUT' && p.stockState !== 'PREORDER')
  const reaching = buyable.filter((p) => p.price >= missing).sort((a, b) => a.price - b.price)
  return reaching[0] ?? buyable.sort((a, b) => b.price - a.price)[0] ?? null
}

function Suggestion({ eyebrow, product: p, line, pink = false, onAdd }: { eyebrow: string; product: ProductSummary; line?: string; pink?: boolean; onAdd: () => void }) {
  return (
    <section className="bag-addon">
      <p className="eyebrow" style={{ marginBottom: 10 }}>
        {eyebrow}
      </p>
      <div className="panel bag-addon-card" style={pink ? { borderColor: 'var(--pink)' } : undefined}>
        <div className="bag-addon-img">
          <div style={{ position: 'absolute', inset: 4 }}>
            <ProductImage slug={p.slug} categorySlug={p.categorySlug} characterSlug={p.characterSlug} set={p.set} url={p.thumbnailUrl} />
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</p>
          {line ? <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{line}</p> : <p className="price" style={{ fontSize: 13 }}>{tk(p.price)}</p>}
        </div>
        <button className="tbtn" type="button" aria-label={`Add ${p.name}`} onClick={onAdd}>
          Add
        </button>
      </div>
    </section>
  )
}
