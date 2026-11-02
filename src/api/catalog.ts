import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Category, Page, ProductSummary } from './types'

export function useCategories() {
  // Categories change rarely; one fetch per visit is plenty.
  return useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories'), staleTime: 10 * 60_000 })
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
  return api<Page<ProductSummary>>('/api/products', { params: params(query, pageNo), signal })
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
