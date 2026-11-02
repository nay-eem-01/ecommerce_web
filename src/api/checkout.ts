import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { DeliveryOptions, LineInput, Quote } from './types'

/** Districts, fees, the free-delivery threshold, estimates and the enabled payment methods. Cached for the visit. */
export function useDeliveryOptions() {
  return useQuery({
    queryKey: ['delivery-options'],
    queryFn: () => api<DeliveryOptions>('/api/checkout/delivery-options'),
    staleTime: 30 * 60_000,
  })
}

/** The server's price for these lines: subtotal, delivery fee for the district, total, stock checks. */
export function fetchQuote(items: LineInput[], district?: string) {
  return api<Quote>('/api/checkout/quote', { method: 'POST', body: { items, district } })
}

/**
 * Quotes the cart whenever its lines or the district change; the previous quote stays on screen meanwhile. The
 * browser never adds prices up itself.
 */
export function useQuote(items: LineInput[], district?: string) {
  return useQuery({
    queryKey: ['quote', items, district ?? null],
    queryFn: () => fetchQuote(items, district),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}
