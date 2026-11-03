import { useState } from 'react'
import type { Category } from '../../api/types'
import { useTitle } from '../../lib/useTitle'
import { CATEGORY_ART } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { EarlyAccessDialog } from '../home/EarlyAccess'

/** A category announced before it has products: what is coming and an early-access signup. */
export function ComingSoon({ category }: { category: Category }) {
  useTitle(category.name)
  const [open, setOpen] = useState(false)
  return (
    <section className="hero" style={{ minHeight: 560 }} aria-labelledby="soon-title">
      {category.label && (
        <span className="sign" style={{ top: 32, right: 24, fontSize: 72 }} aria-hidden="true">
          {category.label}
        </span>
      )}
      <div className="page" style={{ position: 'relative', display: 'grid', gap: 24, paddingTop: 48, paddingBottom: 56 }}>
        <div style={{ width: 'min(260px, 60%)', aspectRatio: '4 / 5', opacity: 0.8 }}>
          <ProductArt spec={CATEGORY_ART[category.slug] ?? CATEGORY_ART.apparel} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
          <span className="drop-pill">
            <b />
            Coming soon
          </span>
          <h1 id="soon-title" className="display" style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}>
            {category.name}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 17 }}>{category.blurb ?? 'A new drop is on the way.'} Be the first to know when it opens.</p>
          <button className="btn" style={{ alignSelf: 'flex-start', minWidth: 220 }} onClick={() => setOpen(true)}>
            Get first access
          </button>
        </div>
      </div>
      {open && <EarlyAccessDialog category={category} onClose={() => setOpen(false)} />}
    </section>
  )
}
