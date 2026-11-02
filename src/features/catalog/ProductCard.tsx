import { Link } from 'react-router-dom'
import type { ProductSummary } from '../../api/types'
import { tk } from '../../lib/money'
import { stockLine } from '../../lib/stock'
import { highlightParts } from '../../lib/text'
import { ProductImage } from './ProductImage'

/** The prototype's product card: picture, flag, name, spec, stock line, price and a quick action. */
export function ProductCard({ product: p, highlight }: { product: ProductSummary; highlight?: string }) {
  const stock = stockLine(p)
  const parts = highlight ? highlightParts(p.name, highlight) : null
  const to = `/p/${p.slug}`
  const save = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0
  return (
    <article className="card">
      {save > 0 ? (
        <span className="pill pink card-flag">Save {tk(save)}</span>
      ) : p.stockState === 'PREORDER' ? (
        <span className="pill pre card-flag">Pre-order</span>
      ) : null}
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
        <Link className="quick" to={to}>
          {p.stockState === 'PREORDER' ? 'Reserve' : p.stockState === 'SOLD_OUT' ? 'View' : p.hasOptions ? 'Choose' : 'View'}
        </Link>
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
