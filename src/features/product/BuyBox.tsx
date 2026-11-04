import { Link } from 'react-router-dom'
import type { DeliveryOptions, ProductDetail, ProductOption } from '../../api/types'
import { releaseMonth } from '../../lib/dates'
import { tk } from '../../lib/money'
import { stockLine } from '../../lib/stock'
import { Icon } from '../../ui/icons'
import { artFor } from '../art/art'
import { ProductArt } from '../art/ProductArt'

interface Props {
  product: ProductDetail
  option: ProductOption | null
  onOption: (option: ProductOption) => void
  qty: number
  maxQty: number
  onQty: (qty: number) => void
  busy: boolean
  onAdd: () => void
  wished: boolean
  onWish: () => void
  delivery: DeliveryOptions | undefined
  reviews: { average: number | null; count: number } | undefined
  /** Opens a section below (reviews, size guide) and scrolls to it. */
  onJump: (id: 'reviews' | 'size') => void
}

/** What it is, price and stock, the options, quantity and Add to bag, delivery notes, facts and the set offer. */
export function BuyBox({ product: p, option, onOption, qty, maxQty, onQty, busy, onAdd, wished, onWish, delivery, reviews, onJump }: Props) {
  const unit = option ?? p
  const price = option?.price ?? p.price
  const stock = stockLine({ ...unit, preorderRelease: p.preorderRelease })
  const preorder = p.stockState === 'PREORDER'
  const soldOut = unit.stockState === 'SOLD_OUT'
  const swatches = p.options.length > 0 && p.options.every((o) => o.swatch)
  const soldOutOptions = p.options.filter((o) => o.stockState === 'SOLD_OUT').map((o) => o.value)
  const eyebrow = [p.character?.name, p.category.name].filter(Boolean).join(' · ')
  const offer = p.sets[0]

  return (
    <div className="buy">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display pd-title">{p.name}</h1>
        <div className="pd-price-row">
          <span className="price">{tk(price)}</span>
          {p.compareAtPrice && p.compareAtPrice > p.price && <span className="was">{tk(p.compareAtPrice)}</span>}
          {stock.tone !== 'ok' && <span className={`pd-stock ${stock.tone}`}>{stock.text}</span>}
          <a
            href="#reviews"
            className="meta"
            style={{ marginLeft: 'auto', color: 'var(--text-2)' }}
            onClick={(e) => {
              e.preventDefault()
              onJump('reviews')
            }}
          >
            {reviews && reviews.count > 0 ? `★ ${(reviews.average ?? 0).toFixed(1)} · ${reviews.count} review${reviews.count === 1 ? '' : 's'}` : '★★★★★ Reviews'}
          </a>
        </div>
        {p.summary && <p className="d-only" style={{ color: 'var(--text-2)' }}>{p.summary}</p>}
      </div>

      {p.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ fontSize: 13 }}>
              <b>{p.optionName ?? 'Option'}:</b> <span style={{ color: 'var(--text-2)' }}>{option?.value ?? ''}</span>
            </p>
            {p.sized && (
              <button type="button" className="ulink" style={{ border: 0, borderBottom: '1px solid currentColor', background: 'transparent', padding: 0 }} onClick={() => onJump('size')}>
                Size guide
              </button>
            )}
          </div>
          {swatches ? (
            <div className="sw-row" role="group" aria-label={p.optionName ?? 'Colour'}>
              {p.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={option?.id === o.id ? 'sw on' : 'sw'}
                  aria-label={o.stockState === 'SOLD_OUT' ? `${o.value}, sold out` : o.value}
                  aria-pressed={option?.id === o.id}
                  disabled={o.stockState === 'SOLD_OUT'}
                  onClick={() => onOption(o)}
                >
                  <i style={{ background: o.swatch ?? undefined }} />
                </button>
              ))}
            </div>
          ) : (
            <div className="pd-chips" role="group" aria-label={p.optionName ?? 'Option'}>
              {p.options.map((o) => (
                <button key={o.id} type="button" className={option?.id === o.id ? 'chip on' : 'chip'} aria-pressed={option?.id === o.id} disabled={o.stockState === 'SOLD_OUT'} onClick={() => onOption(o)}>
                  {o.value}
                  {o.priceDelta ? ` +${tk(o.priceDelta)}` : ''}
                </button>
              ))}
            </div>
          )}
          {soldOutOptions.length > 0 && !soldOut && (
            <p className="meta" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {soldOutOptions.join(', ')} {soldOutOptions.length === 1 ? 'is' : 'are'} sold out.
            </p>
          )}
        </div>
      )}

      {soldOut ? (
        <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong>Sold out</strong>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Save it to your wishlist to find it again when it is back.</p>
          <button className="btn ghost" type="button" aria-pressed={wished} onClick={onWish}>
            {wished ? 'Saved to wishlist' : 'Save to wishlist'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" aria-label="One less" disabled={qty <= 1} onClick={() => onQty(qty - 1)}>
              −
            </button>
            <b aria-live="polite">{qty}</b>
            <button type="button" aria-label="One more" disabled={qty >= maxQty} onClick={() => onQty(qty + 1)}>
              +
            </button>
          </div>
          <button className="btn" type="button" style={{ flex: 1 }} disabled={busy} onClick={onAdd}>
            {preorder ? 'Reserve it' : 'Add to bag'}
          </button>
          <button className={wished ? 'ibtn pd-wish on' : 'ibtn pd-wish'} type="button" aria-label="Save to wishlist" aria-pressed={wished} onClick={onWish}>
            <Icon name="heart" />
          </button>
        </div>
      )}

      <div className="pd-notes" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {preorder ? (
          <p className="note">
            <Icon name="clock" />
            <span>
              <b style={{ color: 'var(--text)' }}>Pre-order: arrives {releaseMonth(p.preorderRelease) || 'soon'}.</b> We ship it as soon as it lands.
            </span>
          </p>
        ) : delivery ? (
          <p className="note">
            <Icon name="truck" />
            <span>
              <b style={{ color: 'var(--text)' }}>{delivery.insideEstimate} in Dhaka</b>, {tk(delivery.insideFee)}. {delivery.outsideEstimate} elsewhere,{' '}
              {tk(delivery.outsideFee)}. Free over {tk(delivery.freeDeliveryThreshold)}.
            </span>
          </p>
        ) : null}
        <p className="note">
          <Icon name="cash" />
          <span>
            <b style={{ color: 'var(--text)' }}>Cash on delivery.</b> Open the parcel and check it before you pay.
            {delivery?.paymentMethods.includes('BKASH') ? ' Or pay ahead with bKash.' : ''}
          </span>
        </p>
        <p className="note">
          <Icon name="return" />
          <span>
            <b style={{ color: 'var(--text)' }}>7-day returns</b> on unopened items.
          </span>
        </p>
      </div>

      {p.facts.length > 0 && (
        <div className="facts">
          {p.facts.slice(0, 4).map((f) => (
            <div key={f.label}>
              <span>{f.label}</span>
              <b>{f.value}</b>
            </div>
          ))}
        </div>
      )}

      {offer && (
        <Link className="panel pd-set" to={`/p/${offer.set.slug}`}>
          <div className="pd-set-img">
            <div style={{ position: 'absolute', inset: 4 }}>
              <ProductArt spec={artFor({ slug: offer.set.slug, characterSlug: offer.set.characterSlug, categorySlug: offer.set.categorySlug, set: true })} label={offer.set.name} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow pink">Complete the set</p>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{offer.set.name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {tk(offer.set.price)} {offer.set.compareAtPrice ? <span className="was">{tk(offer.set.compareAtPrice)}</span> : null}
              {offer.saving ? ` · save ${tk(offer.saving)}` : ''}
            </p>
          </div>
          <span className="ibtn" aria-hidden="true" style={{ border: '1px solid var(--line-2)' }}>
            <Icon name="plus" small />
          </span>
        </Link>
      )}

      {p.bundleItems.length > 0 && (
        <div className="panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="eyebrow pink">In this set</p>
          {p.bundleItems.map((b) => (
            <Link key={b.id} to={`/p/${b.slug}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
              <span>{b.name}</span>
              <span style={{ color: 'var(--text-2)' }}>{tk(b.price)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
