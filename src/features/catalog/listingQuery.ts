import type { ProductSort } from '../../api/catalog'

export const SORTS: Array<[ProductSort, string]> = [
  ['newest', 'Newest'],
  ['price-asc', 'Price, low to high'],
  ['price-desc', 'Price, high to low'],
]

/** Filters in the URL so a filtered list can be shared and survives a reload. */
export interface ListingFilters {
  tags: string[]
  character: string | null
  inStock: boolean
  min: number | null
  max: number | null
  sort: ProductSort
}

const amount = (v: string | null) => {
  const digits = (v ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : null
}

export function readFilters(params: URLSearchParams): ListingFilters {
  const sort = params.get('sort')
  return {
    tags: params.getAll('tag').filter((t) => /^[^:]+:.+$/.test(t)),
    character: params.get('char'),
    inStock: params.get('inStock') === '1',
    min: amount(params.get('min')),
    max: amount(params.get('max')),
    sort: SORTS.some(([v]) => v === sort) ? (sort as ProductSort) : 'newest',
  }
}

export function writeFilters(f: ListingFilters): URLSearchParams {
  const p = new URLSearchParams()
  f.tags.forEach((t) => p.append('tag', t))
  if (f.character) p.set('char', f.character)
  if (f.inStock) p.set('inStock', '1')
  if (f.min !== null) p.set('min', String(f.min))
  if (f.max !== null) p.set('max', String(f.max))
  if (f.sort !== 'newest') p.set('sort', f.sort)
  return p
}

export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
}

/** How many filters are on (the badge on "Filter and sort"). */
export function activeCount(f: ListingFilters): number {
  return f.tags.length + (f.character ? 1 : 0) + (f.inStock ? 1 : 0) + (f.min !== null || f.max !== null ? 1 : 0)
}
