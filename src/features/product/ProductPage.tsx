import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDeliveryOptions } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import { useProduct, useRelated, useReviews } from '../../api/products'
import type { DeliveryOptions, ProductDetail, ProductOption } from '../../api/types'
import { tk } from '../../lib/money'
import { SIZE_CHART } from '../../lib/sizes'
import { leadIn, paragraphs } from '../../lib/text'
import { useTitle } from '../../lib/useTitle'
import { useHighlightCategory } from '../../layout/highlight'
import { PageLoading } from '../../layout/AppLayout'
import { Icon } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { artFor } from '../art/art'
import { useBag } from '../cart/BagContext'
import { useCart } from '../cart/CartProvider'
import { MAX_QTY } from '../cart/guestStorage'
import { ProductCard } from '../catalog/ProductCard'
import { ProductImage } from '../catalog/ProductImage'
import { NotFoundPage } from '../errors/NotFoundPage'
import { BuyBox } from './BuyBox'
import { Gallery } from './Gallery'
import { stillViews } from './gallery'
import { Reviews } from './Reviews'

export function ProductPage() {
  const { slug = '' } = useParams()
  const product = useProduct(slug)
  useTitle(product.data?.name)
  useHighlightCategory(product.data?.category.slug)

  if (product.isPending) return <PageLoading />
  if (product.error) {
    if ((product.error as { status?: number }).status === 404) return <NotFoundPage />
    return (
      <div className="page">
        <div className="empty" style={{ paddingBlock: 96 }} role="alert">
          <h1 className="display" style={{ fontSize: 24 }}>This product did not load</h1>
          <p style={{ color: 'var(--text-2)' }}>{errorMessage(product.error)}</p>
        </div>
      </div>
    )
  }
  // Keyed by slug so a related product starts fresh (option, quantity, open sections).
  return <Product key={product.data.slug} product={product.data} />
}

/** The first option that can be bought. */
function firstAvailable(p: ProductDetail): ProductOption | null {
  return p.options.find((o) => o.stockState !== 'SOLD_OUT') ?? p.options[0] ?? null
}

type Panel = 'desc' | 'story' | 'specs' | 'size' | 'delivery' | 'reviews'

function Product({ product: p }: { product: ProductDetail }) {
  const [option, setOption] = useState<ProductOption | null>(() => firstAvailable(p))
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  // Back from signing in to review (/p/slug#reviews) lands on the open reviews.
  const [open, setOpen] = useState<Set<Panel>>(() => new Set(location.hash === '#reviews' ? ['desc', 'reviews'] : ['desc']))
  const delivery = useDeliveryOptions()
  const related = useRelated(p.slug)
  const reviews = useReviews(p.slug)
  const cart = useCart()
  const bag = useBag()
  const toast = useToast()

  const unit = option ?? p
  const price = option?.price ?? p.price
  const maxQty = unit.stockState === 'LOW_STOCK' && unit.stockLeft ? Math.min(unit.stockLeft, MAX_QTY) : MAX_QTY
  const shownQty = Math.min(qty, maxQty)
  const soldOut = unit.stockState === 'SOLD_OUT'
  const preorder = p.stockState === 'PREORDER'
  const wished = cart.wishlist.has(p.id)
  const spec = useMemo(
    () => artFor({ slug: p.slug, categorySlug: p.category.slug, characterSlug: p.character?.slug, set: p.bundleItems.length > 0 }, option?.swatch),
    [p.slug, p.category.slug, p.character?.slug, p.bundleItems.length, option?.swatch],
  )
  const views = useMemo(() => stillViews(spec, p.photos, p.name), [spec, p.photos, p.name])

  const jump = (id: Panel) => {
    setOpen((s) => new Set(s).add(id))
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById(id)?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (location.hash === '#reviews') requestAnimationFrame(() => document.getElementById('reviews')?.scrollIntoView?.())
  }, [location.hash])

  async function add() {
    setBusy(true)
    try {
      await cart.add({ productId: p.id, optionId: option?.id ?? null, quantity: shownQty })
      bag.open()
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

  const toggle = (id: Panel) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const summary = reviews.data?.pages[0].summary
  const panel = (id: Panel, title: string, body: ReactNode) => (
    <Accordion key={id} id={id} title={title} open={open.has(id)} onToggle={() => toggle(id)}>
      {body}
    </Accordion>
  )

  return (
    <div className="pd">
      <div className="page d-only" style={{ paddingTop: 20 }}>
        <nav className="meta" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <Link to={`/shop/${p.category.slug}`}>{p.category.name}</Link> / <span aria-current="page">{p.name}</span>
        </nav>
      </div>

      <div className="page pd-main">
        <Gallery name={p.name} spec={spec} frames={p.spinFrames} views={views} />
        <aside className="pd-aside">
          <BuyBox
            product={p}
            option={option}
            onOption={setOption}
            qty={shownQty}
            maxQty={maxQty}
            onQty={(n) => setQty(Math.max(1, Math.min(maxQty, n)))}
            busy={busy}
            onAdd={add}
            wished={wished}
            onWish={wish}
            delivery={delivery.data}
            reviews={summary}
            onJump={jump}
          />
          <section aria-label="Details" className="pd-accs">
            {panel('desc', 'Description', <Prose text={p.description} />)}
            {(p.story || p.storyQuote) &&
              panel(
                'story',
                'The story',
                <>
                  {paragraphs(p.story).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  {p.storyQuote && <blockquote className="pd-quote">“{p.storyQuote}”</blockquote>}
                  {p.storyImage && (
                    <div className="pd-story-img">
                      <ProductImage slug={p.slug} categorySlug={p.category.slug} url={p.storyImage.url} alt={p.storyImage.altText ?? ''} />
                    </div>
                  )}
                </>,
              )}
            {panel('specs', 'Specs and what’s in the box', <Specs product={p} />)}
            {p.sized && panel('size', 'Size guide', <SizeGuide />)}
            {panel('delivery', 'Delivery and returns', <DeliveryProse delivery={delivery.data} />)}
            {panel('reviews', summary && summary.count > 0 ? `Reviews (${summary.count})` : 'Reviews', <Reviews slug={p.slug} />)}
          </section>
        </aside>
      </div>

      {related.data && related.data.length > 0 && (
        <section className="page pd-also">
          <div className="sec-head">
            <h2>You may also like</h2>
          </div>
          <div className="pd-also-row">
            {related.data.slice(0, 4).map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
      <div className="ph-only" style={{ height: 40 }} />

      {!soldOut && (
        <div className="stickybar ph-only">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {option ? `${p.name}, ${option.value}` : p.name}
            </p>
            <p className="price">{tk(price)}</p>
          </div>
          <button className="btn" type="button" style={{ minWidth: 150 }} disabled={busy} onClick={add}>
            {preorder ? 'Reserve it' : 'Add to bag'}
          </button>
        </div>
      )}
    </div>
  )
}

function Accordion({ id, title, open, onToggle, children }: { id: string; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="acc" id={id}>
      <h2 style={{ margin: 0, font: 'inherit' }}>
        <button className="acc-h" type="button" aria-expanded={open} aria-controls={`${id}-b`} onClick={onToggle}>
          {title}
          <Icon name={open ? 'minus' : 'plus'} small />
        </button>
      </h2>
      <div className="acc-b" id={`${id}-b`} hidden={!open}>
        {children}
      </div>
    </div>
  )
}

/** Plain-text paragraphs; the first one's short "Who it is for:" lead-in is bold. */
function Prose({ text }: { text: string | null }) {
  return (
    <>
      {paragraphs(text).map((para, i) => {
        const [lead, rest] = i === 0 ? leadIn(para) : [null, para]
        return (
          <p key={i}>
            {lead && <strong style={{ color: 'var(--text)' }}>{lead}</strong>} {rest}
          </p>
        )
      })}
    </>
  )
}

function Specs({ product: p }: { product: ProductDetail }) {
  return (
    <>
      <table className="spec-table">
        <tbody>
          {p.facts.map((f) => (
            <tr key={f.label}>
              <th scope="row">{f.label}</th>
              <td>{f.value}</td>
            </tr>
          ))}
          {p.tags.map((t) => (
            <tr key={`${t.group}:${t.value}`}>
              <th scope="row">{t.group}</th>
              <td>{t.value}</td>
            </tr>
          ))}
          {p.maker && (
            <tr>
              <th scope="row">Made by</th>
              <td>{p.maker}</td>
            </tr>
          )}
        </tbody>
      </table>
      {p.boxItems.length > 0 && (
        <p>
          <strong style={{ color: 'var(--text)' }}>In the box:</strong> {p.boxItems.join(', ')}.
        </p>
      )}
    </>
  )
}

function SizeGuide() {
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="size-table">
          <thead>
            <tr>
              <th scope="col">Size</th>
              <th scope="col">Chest, cm</th>
              <th scope="col">Waist, cm</th>
              <th scope="col">Height, cm</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Measure over the clothes you will wear underneath. Between two sizes, take the larger one.</p>
    </>
  )
}

export function DeliveryProse({ delivery }: { delivery: DeliveryOptions | undefined }) {
  if (!delivery) return <p>Loading delivery charges…</p>
  const online = delivery.paymentMethods.filter((m) => m !== 'COD')
  return (
    <>
      <p>
        Inside Dhaka {delivery.insideEstimate}, {tk(delivery.insideFee)}. Elsewhere {delivery.outsideEstimate}, {tk(delivery.outsideFee)}. Free over{' '}
        {tk(delivery.freeDeliveryThreshold)}.
      </p>
      <p>
        Pay the rider in cash{online.length ? ', or pay ahead online' : ''}. You can open the parcel and check the item before you pay.
      </p>
      <p>Return any unopened item within 7 days. If something arrives damaged, send us a photo and we replace it.</p>
    </>
  )
}
