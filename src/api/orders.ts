import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Order, OrderSummary, Page, PaymentAction, Schemas, Tracking } from './types'

/**
 * Places the order. `idempotencyKey` is one UUID per checkout attempt: a retry after a network error sends the same
 * key and gets the same order back instead of a second one.
 */
export function placeOrder(request: Schemas['PlaceOrderRequest'], idempotencyKey: string) {
  return api<Order>('/api/orders', { method: 'POST', body: request, headers: { 'Idempotency-Key': idempotencyKey } })
}

/** Guest tracking by order number and the phone it was placed with (no address in the answer). */
export function trackOrder(orderNumber: string, phone: string) {
  return api<Tracking>('/api/orders/track', { method: 'POST', body: { orderNumber, phone } })
}

/** A new payment attempt for an unpaid online order; redirect to `url`. */
export function retryPayment(orderNumber: string, phone: string) {
  return api<PaymentAction>('/api/orders/pay', { method: 'POST', body: { orderNumber, phone } })
}

export function useMyOrder(orderNumber: string, enabled = true) {
  return useQuery({
    queryKey: ['orders', 'me', orderNumber],
    queryFn: () => api<Order>(`/api/orders/me/${encodeURIComponent(orderNumber)}`),
    enabled,
  })
}

export function useMyOrders(enabled = true) {
  return useQuery({
    queryKey: ['orders', 'me', 'list'],
    queryFn: () => api<Page<OrderSummary>>('/api/orders/me', { params: { pageSize: 20 } }),
    enabled,
  })
}

export function useCancelOrder(orderNumber: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<Order>(`/api/orders/me/${encodeURIComponent(orderNumber)}/cancel`, { method: 'POST' }),
    onSuccess: (order) => {
      queryClient.setQueryData(['orders', 'me', orderNumber], order)
      return queryClient.invalidateQueries({ queryKey: ['orders', 'me', 'list'] })
    },
  })
}
