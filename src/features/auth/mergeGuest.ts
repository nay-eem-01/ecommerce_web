import { mergeCart, saveToWishlist } from '../../api/cart'
import { clearGuestStorage } from '../cart/CartProvider'
import { readGuestCart, readGuestWishlist } from '../cart/guestStorage'

/**
 * After sign-in: the browser cart goes to `/api/cart/merge` once, saved hearts are added to the account's wishlist,
 * then the browser copies are cleared. A failure keeps the browser copies, so nothing is lost; it is retried at the
 * next sign-in.
 */
export async function mergeGuestIntoAccount(): Promise<void> {
  const lines = readGuestCart()
  const wishes = readGuestWishlist()
  if (lines.length) await mergeCart(lines)
  for (const id of wishes) await saveToWishlist(id).catch(() => undefined)
  clearGuestStorage()
}
