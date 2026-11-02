import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCategories, useProductList, useProductsInCategories, type ProductQuery, type ProductSort } from '../../api/catalog'
import { errorMessage } from '../../api/errors'
import { Icon } from '../../ui/Icon'
import { NotFoundPage } from '../errors/NotFoundPage'
import { CardSkeletons, ProductCard } from './ProductCard'

const SORT_OPTIONS: Array<[ProductSort, string]> = [
  ['newest', 'Sort: newest'],
  ['price-asc', 'Price, low to high'],
  ['price-desc', 'Price, high to low'],
  ['name', 'Name, A to Z'],
]

/** Digits only, or null; the price fields take whole taka. */
function amount(value: string | null): number | null {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : null
}

/**
 * All products, one category, or pre-orders. Filters live in the URL (`cat`, `inStock`, `min`, `max`, `sort`), so a
 * filtered list can be shared and survives a reload.
 */
export function ListingPage({ preorders = false }: { preorders?: boolean }) {
  const { category } = useParams()
  const [params, setParams] = useSearchParams()
  const categories = useCategories()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const isAll = !category && !preorders
  const current = categories.data?.find((c) => c.slug === category)
  const picked = isAll ? (params.get('cat') ?? '').split(',').filter(Boolean) : []
  const inStock = params.get('inStock') === '1'
  const min = amount(params.get('min'))
  const max = amount(params.get('max'))
  const sort = (SORT_OPTIONS.find(([v]) => v === params.get('sort'))?.[0] ?? 'newest') as ProductSort

  const query: ProductQuery = { category, preorder: preorders || undefined, inStock, minPrice: min, maxPrice: max, sort }
  const many = picked.length > 1
  const single = useProductList({ ...query, category: category ?? picked[0] }, !many)
  const merged = useProductsInCategories(many ? picked : [], query, many)

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  function toggleCategory(slug: string, on: boolean) {
    const set = new Set(picked)
    if (on) set.add(slug)
    else set.delete(slug)
    update({ cat: [...set].join(',') || null })
  }

  const clearAll = () => setParams(new URLSearchParams(sort === 'newest' ? {} : { sort }), { replace: true })

  if (category && categories.data && !current) return <NotFoundPage />

  const title = preorders ? 'Pre-orders' : current?.name ?? (category ? '' : 'All products')
  const products = many ? merged.products : (single.data?.pages.flatMap((p) => p.content) ?? [])
  const total = many ? merged.products.length : (single.data?.pages[0]?.totalElements ?? 0)
  const loading = many ? merged.loading : single.isPending
  const error = many ? merged.error : single.error

  const chips: Array<[string, () => void]> = []
  for (const slug of picked) {
    const name = categories.data?.find((c) => c.slug === slug)?.name ?? slug
    chips.push([`${name} ×`, () => toggleCategory(slug, false)])
  }
  if (inStock) chips.push(['In stock only ×', () => update({ inStock: null })])
  if (min !== null || max !== null) chips.push([`${min ?? 0} to ${max ?? 'any'} taka ×`, () => update({ min: null, max: null })])

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>
      <div className="list-title">
        <h1>{title}</h1>
        {current?.blurb && <p className="muted">{current.blurb}</p>}
      </div>
      <div className="list-layout">
        <aside className={filtersOpen ? 'filters open' : 'filters'} id="filters" aria-label="Filters">
          {isAll && (
            <fieldset>
              <legend>Category</legend>
              {(categories.data ?? []).map((c) => (
                <label className="check" key={c.slug}>
                  <input type="checkbox" checked={picked.includes(c.slug)} onChange={(e) => toggleCategory(c.slug, e.target.checked)} />
                  {c.name}
                  <span className="n">{c.productCount}</span>
                </label>
              ))}
            </fieldset>
          )}
          <fieldset>
            <legend>Availability</legend>
            <label className="check">
              <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? '1' : null })} />
              In stock only
            </label>
          </fieldset>
          <fieldset>
            <legend>Price, taka</legend>
            <div className="range-row">
              <PriceField id="f-min" label="Minimum price" placeholder="Min" value={min} onCommit={(v) => update({ min: v })} />
              <span className="muted">to</span>
              <PriceField id="f-max" label="Maximum price" placeholder="Max" value={max} onCommit={(v) => update({ max: v })} />
            </div>
          </fieldset>
          <button className="link" type="button" onClick={clearAll}>
            Clear all filters
          </button>
        </aside>
        <section aria-label="Products">
          <div className="toolbar">
            <button
              className="btn alt filter-toggle"
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <Icon name="filter" />
              Filters
            </button>
            <span className="count">{loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}`}</span>
            <label className="vh" htmlFor="sort">
              Sort by
            </label>
            <select className="select" id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map(([label, remove]) => (
                <button key={label} type="button" onClick={remove}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {error ? (
            <div className="empty panel" role="alert">
              <h2 className="h3">Products did not load</h2>
              <p className="muted">{errorMessage(error)}</p>
            </div>
          ) : loading ? (
            <CardSkeletons count={8} />
          ) : products.length ? (
            <>
              <div className="grid">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {!many && single.hasNextPage && (
                <div style={{ display: 'grid', justifyItems: 'center', marginTop: 32 }}>
                  <button className="btn alt" type="button" disabled={single.isFetchingNextPage} onClick={() => single.fetchNextPage()}>
                    {single.isFetchingNextPage ? 'Loading…' : 'Show more products'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty panel">
              <h2 className="h3">Nothing matches these filters</h2>
              <p className="muted">Try a wider price range or remove a filter.</p>
              <button className="btn alt" type="button" onClick={clearAll}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** A price box that applies on change (blur or Enter), like the prototype; keeps typing local until then. */
function PriceField(props: { id: string; label: string; placeholder: string; value: number | null; onCommit: (v: string | null) => void }) {
  const [text, setText] = useState(props.value === null ? '' : String(props.value))
  const [seen, setSeen] = useState(props.value)
  if (seen !== props.value) {
    setSeen(props.value)
    setText(props.value === null ? '' : String(props.value))
  }
  const commit = () => props.onCommit(text.replace(/\D/g, '') || null)
  return (
    <>
      <label className="vh" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        inputMode="numeric"
        placeholder={props.placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
    </>
  )
}
