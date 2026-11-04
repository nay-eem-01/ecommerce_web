import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import type { ProductSummary } from '../../api/types'
import { tk } from '../../lib/money'
import { highlightParts } from '../../lib/text'
import { Icon } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useBag } from '../cart/BagContext'
import { useCart } from '../cart/CartProvider'
import { ProductImage } from './ProductImage'

/** The one tag a card shows, most useful first (design: Set, Save, Pre-order, Only N left, New). */
export function cardTag(p: ProductSummary): { text: string; tone: 'pink' | 'cyan' | 'warn' } | null {
  const save = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0
  if (p.set) return { text: save ? `Set · save ${tk(save)}` : 'Set', tone: 'pink' }
  if (save) return { text: `Save ${tk(save)}`, tone: 'pink' }
  if (p.stockState === 'PREORDER') return { text: 'Pre-order', tone: 'cyan' }
  if (p.stockState === 'SOLD_OUT') return { text: 'Sold out', tone: 'warn' }
  if (p.stockState === 'LOW_STOCK' && p.stockLeft) return { text: `Only ${p.stockLeft} left`, tone: 'warn' }
  if (p.newArrival) return { text: 'New', tone: 'pink' }
  return null
}

interface Props {
  product: ProductSummary
  /** Marks this text in the name (search results). */
  highlight?: string
  /** Desktop hover panel to add without opening the product. */
  quickAdd?: boolean
}

/**
 * The design's image-first card: a large 4:5 picture with one tag and a heart, then the name, price and colour
 * dots. On desktop, hovering shows quick add (choose a colour, add to bag).
 */
export function ProductCard({ product: p, highlight, quickAdd = true }: Props) {
  const tag = cardTag(p)
  const to = `/p/${p.slug}`
  const parts = highlight ? highlightParts(p.name, highlight) : null
  const cart = useCart()
  const bag = useBag()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const buyable = p.stockState !== 'SOLD_OUT'
  const swatches = p.swatches.filter((s) => s.stockState !== 'SOLD_OUT')
  const [picked, setPicked] = useState<number | null>(swatches[0]?.optionId ?? null)
  const wished = cart.wishlist.has(p.id)
  const save = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : null
  // Quick add works when the only choice is a colour, or there is no choice.
  const canQuickAdd = quickAdd && buyable && (!p.hasOptions || swatches.length > 0)

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

  return (
    <div className="pcard">
      <div className="pimg">
        <Link to={to} aria-label={p.name} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
        <div className="art">
          <ProductImage slug={p.slug} categorySlug={p.categorySlug} characterSlug={p.characterSlug} set={p.set} url={p.thumbnailUrl} swatch={p.swatches[0]?.swatch} />
        </div>
        {tag && (
          <span className={`tag ${tag.tone}`} style={{ zIndex: 2 }}>
            {tag.text}
          </span>
        )}
        <span className="heart" style={{ zIndex: 2 }}>
          <button
            className="ibtn"
            aria-label={`Save ${p.name} to wishlist`}
            aria-pressed={wished}
            disabled={busy}
            onClick={() =>
              act(async () => {
                const on = await cart.toggleWish(p.id)
                toast(on ? 'Saved to your wishlist' : 'Removed from wishlist', on ? ['View', '/account/wishlist'] : null)
              })
            }
          >
            <Icon name="heart" small />
          </button>
        </span>
        {canQuickAdd && (
          <div className="quickadd">
            <p className="eyebrow">{swatches.length ? 'Quick add · choose a colour' : 'Quick add'}</p>
            {swatches.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }} role="group" aria-label={`Colour for ${p.name}`}>
                {swatches.map((s) => (
                  <button
                    key={s.optionId}
                    className={picked === s.optionId ? 'sw on' : 'sw'}
                    aria-label={s.value}
                    aria-pressed={picked === s.optionId}
                    style={{ width: 34, height: 34 }}
                    onClick={() => setPicked(s.optionId)}
                  >
                    <i style={{ background: s.swatch }} />
                  </button>
                ))}
              </div>
            )}
            <button
              className="btn"
              style={{ minHeight: 42 }}
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await cart.add({ productId: p.id, optionId: swatches.length ? picked : null, quantity: 1 })
                  bag.open()
                })
              }
            >
              Add to bag
            </button>
          </div>
        )}
      </div>
      <div className="pinfo">
        <Link className="pname" to={to}>
          {parts ? (
            <>
              {parts[0]}
              <mark style={{ background: 'transparent', color: 'var(--pink)' }}>{parts[1]}</mark>
              {parts[2]}
            </>
          ) : (
            p.name
          )}
        </Link>
        <div className="pline">
          <span className="pprice">
            {tk(p.price)} {save && <span className="was">{tk(save)}</span>}
          </span>
          {p.swatches.length > 0 && (
            <span className="dots" aria-label={`${p.swatches.length} colour${p.swatches.length === 1 ? '' : 's'}`}>
              {p.swatches.map((s) => (
                <i key={s.optionId} style={{ background: s.swatch }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Placeholder cards while a grid loads. */
export function CardSkeletons({ count = 4, className = 'pgrid' }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div className="pcard" key={i}>
          <div className="pimg skel" />
          <div className="skel" style={{ height: 14, width: '80%' }} />
          <div className="skel" style={{ height: 14, width: '40%' }} />
        </div>
      ))}
    </div>
  )
}
