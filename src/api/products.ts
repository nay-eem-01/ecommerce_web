import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { ProductDetail, ProductSummary, Review, ReviewPage, Schemas } from './types'

export function useProduct(slug: string) {
  return useQuery({ queryKey: ['product', slug], queryFn: () => api<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`) })
}

export function useRelated(slug: string) {
  return useQuery({
    queryKey: ['product', slug, 'related'],
    queryFn: () => api<ProductSummary[]>(`/api/products/${encodeURIComponent(slug)}/related`),
  })
}

/** The rating summary and reviews, newest first, five at a time. */
export function useReviews(slug: string) {
  return useInfiniteQuery({
    queryKey: ['product', slug, 'reviews'],
    queryFn: ({ pageParam }) =>
      api<ReviewPage>(`/api/products/${encodeURIComponent(slug)}/reviews`, { params: { pageNo: pageParam, pageSize: 5 } }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.reviews.last ? undefined : last.reviews.pageNo + 1),
  })
}

/** Only shoppers who received the product may review it; the backend says so in its message otherwise. */
export function useCreateReview(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: Schemas['ReviewRequest']) =>
      api<Review>(`/api/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body: request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product', slug, 'reviews'] }),
  })
}

export function useDeleteReview(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => api<null>(`/api/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product', slug, 'reviews'] }),
  })
}
