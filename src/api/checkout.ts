import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { DeliveryOptions } from './types'

/** Districts, fees, the free-delivery threshold, estimates and the enabled payment methods. Cached for the visit. */
export function useDeliveryOptions() {
  return useQuery({
    queryKey: ['delivery-options'],
    queryFn: () => api<DeliveryOptions>('/api/checkout/delivery-options'),
    staleTime: 30 * 60_000,
  })
}
