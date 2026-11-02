import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearServerCart, deleteCartLine, fetchCart, fetchWishlistIds, putCartLine, removeFromWishlist, saveToWishlist } from '../../api/cart'
import type { Cart, CartLine, LineInput } from '../../api/types'
import { useSession } from '../auth/session'
import { MAX_QTY, addLine, readGuestCart, readGuestWishlist, sameLine, setLine, writeGuestCart, writeGuestWishlist } from './guestStorage'

interface CartApi {
  /** The lines to quote and check out (members: only available ones). */
  lines: LineInput[]
  /** Members: the server's lines with item ids and availability; null for guests. */
  serverLines: CartLine[] | null
  count: number
  ready: boolean
  add: (line: LineInput) => Promise<void>
  setQuantity: (line: LineInput) => Promise<void>
  clear: () => Promise<void>
  /** Members: removes a server line by id (works for archived products, which can no longer be priced). */
  removeItem: (itemId: number) => Promise<void>
  wishlist: Set<number>
  /** Saves or removes; resolves to true when the product is now saved. */
  toggleWish: (productId: number) => Promise<boolean>
}

const CartContext = createContext<CartApi | null>(null)

/**
 * One cart and wishlist for the whole app, wherever they live: in the browser for guests, on the server for members
 * (`/api/cart`, `/api/wishlist`). Totals are never computed here; the cart page and checkout show the quote.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const member = status === 'signed-in'
  const queryClient = useQueryClient()
  const [guestLines, setGuestLines] = useState<LineInput[]>(readGuestCart)
  const [guestWish, setGuestWish] = useState<number[]>(readGuestWishlist)
  // Signing in merges and clears the browser copies; signing out shows whatever the browser holds now.
  const [wasMember, setWasMember] = useState(member)
  if (wasMember !== member) {
    setWasMember(member)
    setGuestLines(readGuestCart())
    setGuestWish(readGuestWishlist())
  }

  const cart = useQuery({ queryKey: ['cart'], queryFn: fetchCart, enabled: member })
  const wishIds = useQuery({ queryKey: ['wishlist', 'ids'], queryFn: fetchWishlistIds, enabled: member })

  const setServerCart = useCallback((next: Cart) => queryClient.setQueryData(['cart'], next), [queryClient])

  const updateGuest = useCallback((next: LineInput[]) => {
    setGuestLines(next)
    writeGuestCart(next)
  }, [])

  const add = useCallback(
    async (line: LineInput) => {
      if (!member) {
        updateGuest(addLine(readGuestCart(), line))
        return
      }
      const current = queryClient.getQueryData<Cart>(['cart']) ?? (await queryClient.fetchQuery({ queryKey: ['cart'], queryFn: fetchCart }))
      const existing = (current?.items ?? []).find((l) => sameLine(l, line))
      const quantity = Math.min(MAX_QTY, (existing?.quantity ?? 0) + line.quantity)
      setServerCart(await putCartLine({ ...line, quantity }))
    },
    [member, queryClient, setServerCart, updateGuest],
  )

  const setQuantity = useCallback(
    async (line: LineInput) => {
      if (!member) {
        updateGuest(setLine(readGuestCart(), line))
        return
      }
      setServerCart(await putCartLine({ ...line, quantity: Math.max(0, Math.min(MAX_QTY, line.quantity)) }))
    },
    [member, setServerCart, updateGuest],
  )

  const clear = useCallback(async () => {
    if (!member) {
      updateGuest([])
      return
    }
    setServerCart(await clearServerCart())
  }, [member, setServerCart, updateGuest])

  const removeItem = useCallback(
    async (itemId: number) => {
      setServerCart(await deleteCartLine(itemId))
    },
    [setServerCart],
  )

  const toggleWish = useCallback(
    async (productId: number) => {
      if (!member) {
        const ids = readGuestWishlist()
        const on = !ids.includes(productId)
        const next = on ? [...ids, productId] : ids.filter((id) => id !== productId)
        setGuestWish(next)
        writeGuestWishlist(next)
        return on
      }
      const ids = queryClient.getQueryData<number[]>(['wishlist', 'ids']) ?? []
      const on = !ids.includes(productId)
      if (on) await saveToWishlist(productId)
      else await removeFromWishlist(productId)
      queryClient.setQueryData<number[]>(['wishlist', 'ids'], on ? [...ids, productId] : ids.filter((id) => id !== productId))
      await queryClient.invalidateQueries({ queryKey: ['wishlist', 'list'] })
      return on
    },
    [member, queryClient],
  )

  const value = useMemo<CartApi>(() => {
    const serverLines = member ? (cart.data?.items ?? []) : null
    const lines = serverLines
      ? serverLines.filter((l) => l.available).map((l) => ({ productId: l.productId, optionId: l.optionId, quantity: l.quantity }))
      : guestLines
    return {
      lines,
      serverLines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      ready: !member || cart.isSuccess,
      add,
      setQuantity,
      clear,
      removeItem,
      wishlist: new Set(member ? (wishIds.data ?? []) : guestWish),
      toggleWish,
    }
  }, [member, cart.data, cart.isSuccess, guestLines, wishIds.data, guestWish, add, setQuantity, clear, removeItem, toggleWish])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart(): CartApi {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside CartProvider')
  return cart
}

/** Forget the browser cart and wishlist (after they were merged into the account). */
export function clearGuestStorage() {
  writeGuestCart([])
  writeGuestWishlist([])
}
