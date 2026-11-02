import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import type { ProductSummary } from '../../api/types'
import { tk } from '../../lib/money'
import { stockLine } from '../../lib/stock'
import { highlightParts } from '../../lib/text'
import { Icon } from '../../ui/Icon'
import { useToast } from '../../ui/Toast'
import { useCart } from '../cart/CartProvider'
import { ProductImage } from './ProductImage'

/** The prototype's product card: picture, flag, name, spec, stock line, price and a quick action. */
export function ProductCard({ product: p, highlight }: { product: ProductSummary; highlight?: string }) {
  const stock = stockLine(p)
  const parts = highlight ? highlightParts(p.name, highlight) : null
  const to = `/p/${p.slug}`
  const save = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0
  const cart = useCart()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const wished = cart.wishlist.has(p.id)
  // One tap adds products without options; the others need a choice on the product page.
  const quickAdd = !p.hasOptions && (p.stockState === 'IN_STOCK' || p.stockState === 'LOW_STOCK')

  async function act(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const wish = () =>
    act(async () => {
      const on = await cart.toggleWish(p.id)
      toast(on ? 'Saved to your wishlist' : 'Removed from wishlist', on ? ['View', '/account/wishlist'] : null)
    })
  const add = () =>
    act(async () => {
      await cart.add({ productId: p.id, optionId: null, quantity: 1 })
      toast(`Added to cart: ${p.name}`, ['View cart', '/cart'])
    })

  return (
    <article className="card">
      {save > 0 ? (
        <span className="pill pink card-flag">Save {tk(save)}</span>
      ) : p.stockState === 'PREORDER' ? (
        <span className="pill pre card-flag">Pre-order</span>
      ) : null}
      <button className="heart" type="button" aria-pressed={wished} aria-label={`Save ${p.name} to wishlist`} disabled={busy} onClick={wish}>
        <Icon name="heart" />
      </button>
      <div className="slot card-img">
        <ProductImage slug={p.slug} categorySlug={p.categorySlug} url={p.thumbnailUrl} alt={p.name} />
      </div>
      <Link className="card-name" to={to}>
        {parts ? (
          <>
            {parts[0]}
            <mark>{parts[1]}</mark>
            {parts[2]}
          </>
        ) : (
          p.name
        )}
      </Link>
      {p.specLine && <p className="card-spec">{p.specLine}</p>}
      <span className={`card-stock ${stock.tone}`}>{stock.text}</span>
      <div className="card-row">
        <span className="price">{tk(p.price)}</span>
        {quickAdd ? (
          <button className="quick" type="button" aria-label={`Add ${p.name} to cart`} disabled={busy} onClick={add}>
            <Icon name="cart" />
            <span>Add</span>
          </button>
        ) : (
          <Link className="quick" to={to}>
            {p.stockState === 'PREORDER' ? 'Reserve' : p.stockState === 'SOLD_OUT' ? 'View' : 'Choose'}
          </Link>
        )}
      </div>
    </article>
  )
}

/** Placeholder cards while a grid loads. */
export function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div className="card" key={i}>
          <div className="card-img skel" />
          <div className="skel" style={{ height: 20, width: '80%' }} />
          <div className="skel" style={{ height: 16, width: '50%' }} />
        </div>
      ))}
    </div>
  )
}
