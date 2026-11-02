import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Category } from './types'

export function useCategories() {
  // Categories change rarely; one fetch per visit is plenty.
  return useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories'), staleTime: 10 * 60_000 })
}
