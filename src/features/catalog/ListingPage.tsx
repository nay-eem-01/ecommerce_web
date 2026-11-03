import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCategories, useCharacters, useFacets, useProductList, useProducts, type ProductQuery } from '../../api/catalog'
import { errorMessage } from '../../api/errors'
import type { Facets } from '../../api/types'
import { useTitle } from '../../lib/useTitle'
import { useHighlightCategory } from '../../layout/highlight'
import { Icon } from '../../ui/icons'
import { artFor } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { NotFoundPage } from '../errors/NotFoundPage'
import { ComingSoon } from './ComingSoon'
import { SORTS, activeCount, readFilters, toggleTag, writeFilters, type ListingFilters } from './listingQuery'
import { CardSkeletons, ProductCard } from './ProductCard'

type Mode = 'all' | 'category' | 'character' | 'sets' | 'preorders'

const GRID_KEY = 'senpai.grid'
function readGrid(): 'two' | 'one' {
  try {
    return localStorage.getItem(GRID_KEY) === 'one' ? 'one' : 'two'
  } catch {
    return 'two'
  }
}

/**
 * Every product list: New (all), a category, a character, sets and pre-orders. Phone: character chips, a sticky bar
 * with "Filter and sort" (a bottom sheet) and a one/two-up toggle. Desktop: a filter bar with dropdowns and a
 * three/four-up toggle. A set card sits after the first row.
 */
export function ListingPage({ mode = 'category' }: { mode?: Mode }) {
  const { category, character } = useParams()
  const [params, setParams] = useSearchParams()
  const categories = useCategories()
  const characters = useCharacters()
  const filters = readFilters(params)
  const [sheet, setSheet] = useState(false)
  const [grid, setGrid] = useState<'two' | 'one'>(readGrid)
  const [cols, setCols] = useState<3 | 4>(4)

  const current = categories.data?.find((c) => c.slug === category)
  const currentChar = characters.data?.find((c) => c.slug === character)
  useHighlightCategory(mode === 'category' ? category : null)

  const charFilter = mode === 'character' ? character : (filters.character ?? undefined)
  const query: ProductQuery = {
    category: mode === 'category' ? category : undefined,
    character: charFilter,
    set: mode === 'sets' ? true : undefined,
    preorder: mode === 'preorders' ? true : undefined,
    tags: filters.tags,
    inStock: filters.inStock,
    minPrice: filters.min,
    maxPrice: filters.max,
    sort: filters.sort,
    pageSize: 24,
  }
  const comingSoon = mode === 'category' && current?.comingSoon
  const list = useProductList(query, !comingSoon)
  const facets = useFacets(mode === 'category' ? category : undefined, charFilter)
  const setOffer = useProducts({ set: true, pageSize: 1 }, mode !== 'sets' && !comingSoon)

  const title =
    mode === 'all' ? 'New in' : mode === 'sets' ? 'Sets' : mode === 'preorders' ? 'Pre-orders' : mode === 'character' ? (currentChar?.name ?? '') : (current?.name ?? '')
  const label = mode === 'character' ? currentChar?.label : current?.label
  const blurb =
    mode === 'all'
      ? 'Everything in the shop, newest first.'
      : mode === 'sets'
        ? 'Pieces made to go together, for less than buying them apart.'
        : mode === 'preorders'
          ? 'Reserve now; we ship the month it lands.'
          : mode === 'character'
            ? currentChar?.blurb
            : current?.blurb
  useTitle(title || null)

  if (mode === 'category' && categories.data && !current) return <NotFoundPage />
  if (mode === 'character' && characters.data && !currentChar) return <NotFoundPage />
  if (comingSoon && current) return <ComingSoon category={current} />

  function update(next: Partial<ListingFilters>) {
    setParams(writeFilters({ ...filters, ...next }), { replace: true })
  }
  const clearAll = () => setParams(writeFilters({ tags: [], character: null, inStock: false, min: null, max: null, sort: filters.sort }), { replace: true })
  function chooseGrid(g: 'two' | 'one') {
    setGrid(g)
    try {
      localStorage.setItem(GRID_KEY, g)
    } catch {
      // Not remembered; the toggle still works.
    }
  }

  const products = list.data?.pages.flatMap((p) => p.content) ?? []
  const total = list.data?.pages[0]?.totalElements ?? 0
  const set = setOffer.data?.content[0]
  const showChips = mode === 'category' || mode === 'all'
  const gridClass = `pgrid${grid === 'one' ? ' one' : ''}${cols === 3 ? ' three' : ''}`
  const countLabel = list.isPending ? 'Loading…' : `${total} item${total === 1 ? '' : 's'}`
  const first = products.slice(0, cols)
  const rest = products.slice(cols)

  return (
    <div>
      <section className="page listing-head">
        <div>
          <p className="meta">
            <Link to="/">Home</Link> / {title}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1 className="display listing-title">
              {title}{' '}
              {label && <span style={{ color: 'var(--pink)', fontSize: '0.64em', textShadow: '0 0 12px var(--glow)' }}>{label}</span>}
            </h1>
            <span className="meta ph-only">{countLabel}</span>
          </div>
        </div>
        {blurb && <p className="listing-blurb">{blurb}</p>}
      </section>

      {showChips && (characters.data?.length ?? 0) > 0 && (
        <div className="chips ph-only" role="group" aria-label="Character">
          <button className={!filters.character ? 'chip on' : 'chip'} aria-pressed={!filters.character} onClick={() => update({ character: null })}>
            All
          </button>
          {(characters.data ?? []).map((c) => (
            <button key={c.slug} className={filters.character === c.slug ? 'chip on' : 'chip'} aria-pressed={filters.character === c.slug} onClick={() => update({ character: filters.character === c.slug ? null : c.slug })}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="tbar ph-only">
        <button className="tbtn" onClick={() => setSheet(true)}>
          <Icon name="filter" small />
          Filter and sort{activeCount(filters) ? ` (${activeCount(filters)})` : ''}
        </button>
        <span className="meta">{countLabel}</span>
        <div className="seg" role="group" aria-label="Grid">
          <button aria-pressed={grid === 'two'} aria-label="Two per row" onClick={() => chooseGrid('two')}>
            <Icon name="grid2" small />
          </button>
          <button aria-pressed={grid === 'one'} aria-label="One per row" onClick={() => chooseGrid('one')}>
            <Icon name="grid1" small />
          </button>
        </div>
      </div>

      <DesktopFilterBar
        filters={filters}
        facets={facets.data}
        characters={showChips ? (characters.data ?? []) : []}
        countLabel={countLabel}
        cols={cols}
        onCols={setCols}
        onChange={update}
        onClear={clearAll}
      />

      <section className="page" style={{ paddingTop: 16, paddingBottom: 8 }} aria-label="Products">
        {list.error ? (
          <div className="empty panel" role="alert">
            <h2 className="display" style={{ fontSize: 20 }}>Products did not load</h2>
            <p style={{ color: 'var(--muted)' }}>{errorMessage(list.error)}</p>
          </div>
        ) : list.isPending ? (
          <CardSkeletons count={8} className={gridClass} />
        ) : products.length ? (
          <div className={gridClass}>
            {first.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {set && products.length > cols && (
              <Link className="panel listing-set" to={`/p/${set.slug}`}>
                <div className="listing-set-art">
                  <div style={{ position: 'absolute', inset: 6 }}>
                    <ProductArt spec={artFor(set)} label={set.name} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p className="eyebrow pink">Pair it</p>
                  <p className="listing-set-title">{set.name}</p>
                  {set.compareAtPrice && set.compareAtPrice > set.price && (
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Save ৳{(set.compareAtPrice - set.price).toLocaleString('en-IN')} when you take both. One parcel, one delivery fee.</p>
                  )}
                  <span className="ulink" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    See the set
                  </span>
                </div>
              </Link>
            )}
            {rest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="empty panel">
            <h2 className="display" style={{ fontSize: 20 }}>Nothing matches these filters</h2>
            <p style={{ color: 'var(--muted)' }}>Try a wider price range or remove a filter.</p>
            <button className="btn ghost" onClick={clearAll}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      {products.length > 0 && (
        <section style={{ padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p className="meta">
            Showing {products.length} of {total}
          </p>
          <div className="bar" style={{ width: 180 }}>
            <i style={{ width: `${Math.round((products.length / Math.max(1, total)) * 100)}%`, background: 'var(--text)' }} />
          </div>
          {list.hasNextPage && (
            <button className="btn ghost" style={{ minWidth: 240 }} disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
              {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </section>
      )}

      {sheet && (
        <FilterSheet
          filters={filters}
          facets={facets.data}
          total={total}
          onChange={update}
          onClear={clearAll}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  )
}

interface FilterProps {
  filters: ListingFilters
  facets: Facets | undefined
  onChange: (next: Partial<ListingFilters>) => void
  onClear: () => void
}

/** Phone: the design's bottom sheet with sort, the facet groups as chips, price and in-stock. */
function FilterSheet({ filters, facets, total, onChange, onClear, onClose }: FilterProps & { total: number; onClose: () => void }) {
  return (
    <>
      <button className="scrim-fill" aria-label="Close filters" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Filter and sort">
        <div className="grip" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="display" style={{ fontSize: 22 }}>
            Filter and sort
          </h2>
          <button className="ibtn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="eyebrow">Sort</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SORTS.map(([value, label]) => (
              <button key={value} className={filters.sort === value ? 'chip on' : 'chip'} aria-pressed={filters.sort === value} onClick={() => onChange({ sort: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {(facets?.groups ?? []).map((g) => (
          <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="eyebrow">{g.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {g.values.map((v) => {
                const tag = `${g.name}:${v.value}`
                const on = filters.tags.includes(tag)
                return (
                  <button key={tag} className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => onChange({ tags: toggleTag(filters.tags, tag) })}>
                    {v.value}
                    <span style={{ color: on ? undefined : 'var(--muted)', marginLeft: 6 }}>{v.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <PriceFields filters={filters} onChange={onChange} />
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span style={{ fontWeight: 700 }}>In stock only</span>
          <input type="checkbox" checked={filters.inStock} onChange={(e) => onChange({ inStock: e.target.checked })} style={{ width: 22, height: 22, accentColor: 'var(--pink)' }} />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClear}>
            Clear
          </button>
          <button className="btn" style={{ flex: 2 }} onClick={onClose}>
            Show {total} result{total === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </>
  )
}

/** Min and max price, applied on blur or Enter (keeps typing local until then). */
function PriceFields({ filters, onChange }: Pick<FilterProps, 'filters' | 'onChange'>) {
  const [min, setMin] = useState(filters.min === null ? '' : String(filters.min))
  const [max, setMax] = useState(filters.max === null ? '' : String(filters.max))
  const num = (v: string) => (v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null)
  const commit = () => onChange({ min: num(min), max: num(max) })
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="eyebrow">Price, taka</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="input" aria-label="Minimum price" placeholder="Min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} onBlur={commit} onKeyDown={onKey} style={{ minHeight: 44 }} />
        <span className="meta">to</span>
        <input className="input" aria-label="Maximum price" placeholder="Max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} onBlur={commit} onKeyDown={onKey} style={{ minHeight: 44 }} />
      </div>
    </div>
  )
}

/** Desktop: filters across the top so products keep the full width (design: Desktop · Category). */
function DesktopFilterBar({
  filters, facets, characters, countLabel, cols, onCols, onChange, onClear,
}: FilterProps & { characters: Array<{ slug: string; name: string }>; countLabel: string; cols: 3 | 4; onCols: (c: 3 | 4) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (name: string) => setOpen((o) => (o === name ? null : name))
  const charName = characters.find((c) => c.slug === filters.character)?.name
  const sortName = SORTS.find(([v]) => v === filters.sort)?.[1]
  return (
    <div className="hdr d-only" style={{ top: 72, zIndex: 4 }}>
      <div className="page" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {characters.length > 0 && (
            <Dropdown label={charName ? `Character · ${charName}` : 'Character'} active={!!charName} open={open === 'char'} onToggle={() => toggle('char')}>
              {characters.map((c) => (
                <label key={c.slug} className="check-row">
                  <input type="radio" name="char" checked={filters.character === c.slug} onChange={() => onChange({ character: c.slug })} />
                  {c.name}
                </label>
              ))}
              <button className="link" style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', padding: 0 }} onClick={() => onChange({ character: null })}>
                Any character
              </button>
            </Dropdown>
          )}
          {(facets?.groups ?? []).map((g) => {
            const picked = filters.tags.filter((t) => t.startsWith(`${g.name}:`)).map((t) => t.slice(g.name.length + 1))
            return (
              <Dropdown key={g.name} label={picked.length ? `${g.name} · ${picked.join(', ')}` : g.name} active={picked.length > 0} open={open === g.name} onToggle={() => toggle(g.name)}>
                {g.values.map((v) => {
                  const tag = `${g.name}:${v.value}`
                  return (
                    <label key={tag} className="check-row">
                      <input type="checkbox" checked={filters.tags.includes(tag)} onChange={() => onChange({ tags: toggleTag(filters.tags, tag) })} />
                      {v.value}
                      <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{v.count}</span>
                    </label>
                  )
                })}
              </Dropdown>
            )
          })}
          <Dropdown label={filters.min !== null || filters.max !== null ? `Price · ${filters.min ?? 0} to ${filters.max ?? 'any'}` : 'Price'} active={filters.min !== null || filters.max !== null} open={open === 'price'} onToggle={() => toggle('price')}>
            <PriceFields filters={filters} onChange={onChange} />
          </Dropdown>
          <button className={filters.inStock ? 'tbtn active' : 'tbtn'} aria-pressed={filters.inStock} onClick={() => onChange({ inStock: !filters.inStock })}>
            In stock
          </button>
          {activeCount(filters) > 0 && (
            <button className="link" style={{ border: 0, background: 'transparent', fontSize: 13 }} onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="meta">{countLabel}</span>
          <Dropdown label={`Sort: ${sortName}`} open={open === 'sort'} onToggle={() => toggle('sort')} align="right">
            {SORTS.map(([value, label]) => (
              <label key={value} className="check-row">
                <input type="radio" name="sort" checked={filters.sort === value} onChange={() => { onChange({ sort: value }); setOpen(null) }} />
                {label}
              </label>
            ))}
          </Dropdown>
          <div className="seg" role="group" aria-label="Grid density">
            <button aria-pressed={cols === 3} aria-label="Three per row" onClick={() => onCols(3)} style={{ width: 48, fontSize: 12, fontWeight: 800 }}>
              3
            </button>
            <button aria-pressed={cols === 4} aria-label="Four per row" onClick={() => onCols(4)} style={{ width: 48, fontSize: 12, fontWeight: 800 }}>
              4
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dropdown({ label, active, open, onToggle, align, children }: { label: string; active?: boolean; open: boolean; onToggle: () => void; align?: 'right'; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <button className={active ? 'tbtn active' : 'tbtn'} aria-expanded={open} onClick={onToggle}>
        {label} <Icon name="chevron" small />
      </button>
      {open && (
        <div className="menu-panel" style={align === 'right' ? { left: 'auto', right: 0 } : undefined}>
          {children}
        </div>
      )}
    </div>
  )
}
