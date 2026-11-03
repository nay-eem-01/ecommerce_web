import { keepPreviousData, useInfiniteQuery, useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Category, Character, Facets, Page, ProductSummary } from './types'

export function useCategories() {
  // Categories change rarely; one fetch per visit is plenty.
  return useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories'), staleTime: 10 * 60_000 })
}

export function useCharacters() {
  return useQuery({ queryKey: ['characters'], queryFn: () => api<Character[]>('/api/characters'), staleTime: 10 * 60_000 })
}

/** Filter groups (Capacity, Material, ...) with counts for a category or character. */
export function useFacets(category?: string, character?: string) {
  return useQuery({
    queryKey: ['facets', category ?? null, character ?? null],
    queryFn: () => api<Facets>('/api/products/facets', { params: { category, character } }),
    staleTime: 5 * 60_000,
  })
}

/** Early access to a coming-soon category: a phone and/or an email. */
export function useEarlyAccess() {
  return useMutation({
    mutationFn: (body: { categorySlug: string; phone?: string; email?: string }) =>
      api<null>('/api/early-access', { method: 'POST', body }),
  })
}

export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'name'

const SORTS: Record<ProductSort, { sortBy: string; ascOrDesc: 'asc' | 'desc' }> = {
  newest: { sortBy: 'creationDate', ascOrDesc: 'desc' },
  'price-asc': { sortBy: 'price', ascOrDesc: 'asc' },
  'price-desc': { sortBy: 'price', ascOrDesc: 'desc' },
  name: { sortBy: 'name', ascOrDesc: 'asc' },
}

export interface ProductQuery {
  category?: string
  character?: string
  /** "Capacity:750 ml" pairs; values of one group widen, groups narrow. */
  tags?: string[]
  set?: boolean
  q?: string
  inStock?: boolean
  preorder?: boolean
  minPrice?: number | null
  maxPrice?: number | null
  sort?: ProductSort
  pageSize?: number
}

function params(query: ProductQuery, pageNo: number) {
  const sort = SORTS[query.sort ?? 'newest']
  return {
    category: query.category,
    character: query.character,
    set: query.set,
    q: query.q?.trim() || undefined,
    inStock: query.inStock || undefined,
    preorder: query.preorder || undefined,
    minPrice: query.minPrice ?? undefined,
    maxPrice: query.maxPrice ?? undefined,
    pageNo,
    pageSize: query.pageSize ?? 48,
    ...sort,
  }
}

export function fetchProducts(query: ProductQuery, pageNo = 0, signal?: AbortSignal) {
  // Repeated tag=… values go on the URL as is; the client's params object holds single values.
  const tags = (query.tags ?? []).map((t) => `tag=${encodeURIComponent(t)}`).join('&')
  const path = '/api/products' + (tags ? `?${tags}` : '')
  return api<Page<ProductSummary>>(path, { params: params(query, pageNo), signal })
}

/** One page of products (home rows, trending). */
export function useProducts(query: ProductQuery, enabled = true) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: ({ signal }) => fetchProducts(query, 0, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** A listing with "Show more". */
export function useProductList(query: ProductQuery, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['products', 'list', query],
    queryFn: ({ pageParam, signal }) => fetchProducts(query, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNo + 1),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/**
 * Several categories at once: the API filters by one category, so this runs one query per category (up to 100 each)
 * and merges them in the chosen order. docs/BACKEND_REQUESTS.md 3 asks for a multi-category filter.
 */
export function useProductsInCategories(categories: string[], query: ProductQuery, enabled = true) {
  const results = useQueries({
    queries: categories.map((category) => ({
      queryKey: ['products', { ...query, category, pageSize: 100 }],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchProducts({ ...query, category, pageSize: 100 }, 0, signal),
      enabled,
    })),
  })
  const loading = results.some((r) => r.isPending)
  const error = results.find((r) => r.error)?.error ?? null
  const products = results.flatMap((r) => r.data?.content ?? [])
  return { products: sortProducts(products, query.sort ?? 'newest'), loading, error }
}

/** The client-side twin of the API's sort, for merged lists. Newest keeps the API's order per category. */
export function sortProducts(products: ProductSummary[], sort: ProductSort): ProductSummary[] {
  const list = products.slice()
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'newest') list.sort((a, b) => b.id - a.id)
  return list
}
