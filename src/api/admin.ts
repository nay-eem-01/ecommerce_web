import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { ApiError } from './errors'
import type {
  BreakdownBy,
  BreakdownRow,
  Order,
  OrderAction,
  OrderStatus,
  OrderSummary,
  Overview,
  Page,
  Period,
  ProductDetail,
  ProductInsight,
  ProductStock,
  ProductInsightSort,
  Searches,
  Signal,
  TokenResponse,
} from './types'

/** Staff sign-in with email and password. */
export function useStaffSignIn() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<TokenResponse>('/api/auth/sign-in', { method: 'POST', body }),
  })
}

/** Sets a new password; the backend then signs out every device, this one included. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api<null>('/api/users/me/change-password', { method: 'POST', body }),
  })
}

// ---------- insights ----------

const insights = <T>(path: string, period: Period, params: Record<string, string> = {}) =>
  api<T>(`/api/admin/insights/${path}`, { params: { ...period, ...params } })

export function useOverview(period: Period) {
  return useQuery({ queryKey: ['admin', 'overview', period], queryFn: () => insights<Overview>('overview', period) })
}

export function useSignals(period: Period) {
  return useQuery({ queryKey: ['admin', 'signals', period], queryFn: () => insights<Signal[]>('signals', period) })
}

export function useBreakdown(period: Period, by: BreakdownBy) {
  return useQuery({
    queryKey: ['admin', 'breakdown', period, by],
    queryFn: () => insights<BreakdownRow[]>('breakdown', period, { by }),
    placeholderData: keepPreviousData,
  })
}

export function useSearches(period: Period) {
  return useQuery({ queryKey: ['admin', 'searches', period], queryFn: () => insights<Searches>('searches', period) })
}

export function useProductInsights(period: Period, sort: ProductInsightSort, dir: 'asc' | 'desc') {
  return useQuery({
    queryKey: ['admin', 'products', period, sort, dir],
    queryFn: () => insights<ProductInsight[]>('products', period, { sort, dir }),
    placeholderData: keepPreviousData,
  })
}

// ---------- products ----------

/** Exact stock of the product and each option, for the stock editor. */
export function useProductStock(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'stock', id],
    queryFn: () => api<ProductStock>(`/api/admin/products/${id}/stock`),
    enabled: id !== null,
  })
}

export function useUpdateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, optionId, stock }: { id: number; optionId: number | null; stock: number }) =>
      api<ProductDetail>(`/api/admin/products/${id}/stock`, { method: 'PATCH', body: { optionId, stock } }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stock', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'signals'] })
    },
  })
}

// ---------- orders ----------

export function useAdminOrders(status: OrderStatus | '', q: string, pageNo: number) {
  return useQuery({
    queryKey: ['admin', 'orders', status, q, pageNo],
    queryFn: () => api<Page<OrderSummary>>('/api/admin/orders', { params: { status, q, pageNo, pageSize: 20 } }),
    placeholderData: keepPreviousData,
  })
}

export function useAdminOrder(orderNumber: string) {
  return useQuery({
    queryKey: ['admin', 'order', orderNumber],
    queryFn: () => api<Order>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`),
  })
}

/** Where each move takes an order (mirrors the backend's state machine). */
const MOVES_TO: Record<OrderAction, OrderStatus> = {
  PACK: 'PACKED',
  SHIP: 'SHIPPED',
  DELIVER: 'DELIVERED',
  CANCEL: 'CANCELLED',
  RETURN: 'RETURNED',
}

/**
 * Moves an order. A retry whose first attempt went through (response lost, double submit) gets 409 from the state
 * machine; then the order is reloaded and, if it already has the status the move leads to, that counts as done.
 */
export function useOrderAction(orderNumber: string) {
  const queryClient = useQueryClient()
  const path = `/api/admin/orders/${encodeURIComponent(orderNumber)}`
  return useMutation({
    mutationFn: async (body: { action: OrderAction; note?: string }) => {
      try {
        return await api<Order>(`${path}/status`, { method: 'PATCH', body })
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error
        const current = await api<Order>(path)
        if (current.status === MOVES_TO[body.action]) return current
        queryClient.setQueryData(['admin', 'order', orderNumber], current)
        throw error
      }
    },
    onSuccess: (order) => {
      queryClient.setQueryData(['admin', 'order', orderNumber], order)
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
  })
}
