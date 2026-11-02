import type { Order } from '../../api/types'

/**
 * The order just placed, kept for this tab only (sessionStorage) so the confirmation survives a reload and a guest
 * coming back from a payment page can be matched to their order (tracking needs the phone it was placed with).
 */
const KEY = 'senpai.lastOrder'

export function rememberOrder(order: Order) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    // Storage blocked: the confirmation still shows from navigation state.
  }
}

export function lastOrder(orderNumber?: string | null): Order | null {
  try {
    const order = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Order | null
    if (!order || typeof order.orderNumber !== 'string') return null
    return !orderNumber || order.orderNumber === orderNumber ? order : null
  } catch {
    return null
  }
}
