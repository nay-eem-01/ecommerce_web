import { api } from './client'
import type { Cart, LineInput, ProductSummary } from './types'

/** The signed-in shopper's cart, priced live. Guests keep theirs in the browser (features/cart/CartProvider). */
export function fetchCart() {
  return api<Cart>('/api/cart')
}

/** Sets a line's quantity (0 removes it). */
export function putCartLine(line: LineInput) {
  return api<Cart>('/api/cart/items', { method: 'PUT', body: line })
}

export function deleteCartLine(itemId: number) {
  return api<Cart>(`/api/cart/items/${itemId}`, { method: 'DELETE' })
}

export function clearServerCart() {
  return api<Cart>('/api/cart', { method: 'DELETE' })
}

/** After sign-in: adds the browser cart to the account's cart. */
export function mergeCart(items: LineInput[]) {
  return api<Cart>('/api/cart/merge', { method: 'POST', body: { items } })
}

export function fetchWishlistIds() {
  return api<number[]>('/api/wishlist/ids')
}

export function fetchWishlist() {
  return api<ProductSummary[]>('/api/wishlist')
}

export function saveToWishlist(productId: number) {
  return api<null>(`/api/wishlist/${productId}`, { method: 'PUT' })
}

export function removeFromWishlist(productId: number) {
  return api<null>(`/api/wishlist/${productId}`, { method: 'DELETE' })
}
