import { useEffect, useRef } from 'react'
import { fetchQuote } from '../../api/checkout'
import { ApiError } from '../../api/errors'
import type { LineInput } from '../../api/types'
import { useToast } from '../../ui/Toast'
import { useCart } from './CartProvider'

/**
 * A guest cart can hold a product that was archived since it was added; the quote then answers 404 for the whole
 * cart. This quotes the lines one by one, drops the ones the shop no longer sells and says so.
 * (Members' carts mark such lines `available: false` on the server instead.)
 */
export function useDropStaleLines(quoteError: unknown, lines: LineInput[]) {
  const cart = useCart()
  const toast = useToast()
  const running = useRef(false)

  useEffect(() => {
    if (cart.serverLines || running.current) return
    if (!(quoteError instanceof ApiError) || quoteError.status !== 404) return
    running.current = true
    Promise.all(
      lines.map((line) =>
        fetchQuote([line]).then(
          () => null,
          (e: unknown) => (e instanceof ApiError && e.status === 404 ? line : null),
        ),
      ),
    )
      .then(async (stale) => {
        const gone = stale.filter((l): l is LineInput => l !== null)
        for (const line of gone) await cart.setQuantity({ ...line, quantity: 0 })
        if (gone.length) toast(`Removed ${gone.length} item${gone.length === 1 ? '' : 's'} we no longer sell`)
      })
      .finally(() => {
        running.current = false
      })
  }, [quoteError, lines, cart, toast])
}
