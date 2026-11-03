import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDeliveryOptions } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import { useProduct, useRelated } from '../../api/products'
import type { DeliveryOptions, ProductDetail, ProductOption } from '../../api/types'
import { tk } from '../../lib/money'
import { SIZE_CHART } from '../../lib/sizes'
import { leadIn, paragraphs } from '../../lib/text'
import { useTitle } from '../../lib/useTitle'
import { useHighlightCategory } from '../../layout/highlight'
import { PageLoading } from '../../layout/AppLayout'
import { ProductCard } from '../catalog/ProductCard'
import { ProductImage } from '../catalog/ProductImage'
import { NotFoundPage } from '../errors/NotFoundPage'
import { BuyBox } from './BuyBox'
import { Reviews } from './Reviews'
import { specFor } from './viewer/standIn'
import { Viewer } from './viewer/Viewer'

export function ProductPage() {
  const { slug = '' } = useParams()
  const product = useProduct(slug)
  useTitle(product.data?.name)
  useHighlightCategory(product.data?.category.slug)

  if (product.isPending) return <PageLoading />
  if (product.error) {
    if ((product.error as { status?: number }).status === 404) return <NotFoundPage />
    return (
      <div className="wrap">
        <div className="empty" style={{ paddingBlock: 96 }} role="alert">
          <h1 className="page-title">This product did not load</h1>
          <p className="muted">{errorMessage(product.error)}</p>
        </div>
      </div>
    )
  }
  // Keyed by slug so a related product starts fresh (option, quantity, viewer angle).
  return <Product key={product.data.slug} product={product.data} />
}

/** The first option that can be bought, as the prototype preselects it. */
function firstAvailable(p: ProductDetail): ProductOption | null {
  return p.options.find((o) => o.stockState !== 'SOLD_OUT') ?? p.options[0] ?? null
}

function jumpTo(id: string) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
}

function Product({ product: p }: { product: ProductDetail }) {
  const [option, setOption] = useState<ProductOption | null>(() => firstAvailable(p))
  const delivery = useDeliveryOptions()
  const related = useRelated(p.slug)
  const location = useLocation()
  const spec = useMemo(() => specFor(p.slug, p.category.slug, option?.swatch), [p.slug, p.category.slug, option?.swatch])

  const sections: Array<[id: string, label: string]> = [
    ['sec-desc', 'Description'],
    ...(p.story ? [['sec-story', 'Story'] as [string, string]] : []),
    ['sec-specs', 'Specs and box'],
    ...(p.sized ? [['sec-size', 'Size guide'] as [string, string]] : []),
    ['sec-delivery', 'Delivery'],
    ['sec-reviews', 'Reviews'],
  ]
  const [active, setActive] = useState('sec-desc')

  // Highlight the tab of the section in the middle of the screen.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    )
    document.querySelectorAll('.pd-sec').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  // A link to /p/slug#sec-reviews (after signing in to review) lands on the section.
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
  }, [location.hash])

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop/${p.category.slug}`}>{p.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{p.name}</span>
      </nav>
      <div className="pdp">
        <Viewer name={p.name} frames={p.spinFrames} spec={spec} photos={p.photos} />
        <BuyBox product={p} option={option} onOption={setOption} delivery={delivery.data} jump={jumpTo} />
      </div>
      <nav className="pd-tabs" aria-label="Product sections">
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className={active === id ? 'on' : undefined}
            onClick={(e) => {
              e.preventDefault()
              jumpTo(id)
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <Section id="sec-desc" title="Description">
        <Prose text={p.description} />
      </Section>
      {p.story && (
        <Section id="sec-story" title="The story">
          <div className="story">
            <div className="prose">
              {paragraphs(p.story).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {p.storyQuote && <blockquote>“{p.storyQuote}”</blockquote>}
            </div>
            <div className="slot">
              {p.storyImage ? (
                <img src={p.storyImage.url} alt={p.storyImage.altText ?? ''} loading="lazy" />
              ) : (
                <ProductImage slug={p.slug} categorySlug={p.category.slug} />
              )}
            </div>
          </div>
        </Section>
      )}
      <Section id="sec-specs" title="Specs and what’s in the box">
        <div className="story">
          <table className="spec-table">
            <tbody>
              {p.facts.map((f) => (
                <tr key={f.label}>
                  <th scope="row">{f.label}</th>
                  <td>{f.value}</td>
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
            <div className="prose">
              <p>
                <strong>In the box</strong>
              </p>
              <ul>
                {p.boxItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>
      {p.sized && (
        <Section id="sec-size" title="Size guide">
          <div className="tbl-wrap">
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
          <p className="muted" style={{ marginTop: 12 }}>
            Measure over the clothes you will wear underneath. Between two sizes, take the larger one.
          </p>
        </Section>
      )}
      <Section id="sec-delivery" title="Delivery and returns">
        <DeliveryProse delivery={delivery.data} />
      </Section>
      <Section id="sec-reviews" title="Reviews">
        <Reviews slug={p.slug} />
      </Section>
      {related.data && related.data.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2 className="h2">Goes well with</h2>
          </div>
          <div className="grid">
            {related.data.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="pd-sec" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  )
}

/** Plain-text paragraphs; the first one's short "Who it is for:" lead-in is bold, as in the prototype. */
function Prose({ text }: { text: string | null }) {
  return (
    <div className="prose">
      {paragraphs(text).map((para, i) => {
        const [lead, rest] = i === 0 ? leadIn(para) : [null, para]
        return (
          <p key={i}>
            {lead && <strong>{lead}</strong>} {rest}
          </p>
        )
      })}
    </div>
  )
}

export function DeliveryProse({ delivery }: { delivery: DeliveryOptions | undefined }) {
  if (!delivery) return <p className="muted">Loading delivery charges…</p>
  const online = delivery.paymentMethods.filter((m) => m !== 'COD')
  return (
    <div className="prose">
      <p>
        <strong>Inside Dhaka:</strong> {delivery.insideEstimate}, {tk(delivery.insideFee)}. <strong>Outside Dhaka:</strong>{' '}
        {delivery.outsideEstimate}, {tk(delivery.outsideFee)}. Orders over {tk(delivery.freeDeliveryThreshold)} ship free.
      </p>
      <p>
        Pay the rider in cash{online.length ? ', or pay ahead online' : ''}. You can open the parcel and check the item before
        you pay.
      </p>
      <p>Return any unopened item within 7 days. If something arrives damaged, send us a photo and we replace it.</p>
    </div>
  )
}
