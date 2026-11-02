import type { LineInput } from '../../api/types'

/** Guests' cart and wishlist live in the browser until sign-in merges them into the account. */
const CART_KEY = 'senpai.cart'
const WISH_KEY = 'senpai.wishlist'

/** The most of one item per order (backend limit). */
export const MAX_QTY = 10

function read<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return valid(value) ? value : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked: the cart lasts until reload.
  }
}

const isLine = (l: unknown): l is LineInput =>
  typeof l === 'object' && l !== null && Number.isInteger((l as LineInput).productId) && Number.isInteger((l as LineInput).quantity)

export function readGuestCart(): LineInput[] {
  const lines = read('senpai.cart', (v): v is unknown[] => Array.isArray(v)) ?? []
  return lines
    .filter(isLine)
    .map((l) => ({ productId: l.productId, optionId: l.optionId ?? null, quantity: Math.max(1, Math.min(MAX_QTY, l.quantity)) }))
}

export function writeGuestCart(lines: LineInput[]) {
  write(CART_KEY, lines.length ? lines : null)
}

export function readGuestWishlist(): number[] {
  return (read(WISH_KEY, (v): v is unknown[] => Array.isArray(v)) ?? []).filter((id): id is number => Number.isInteger(id))
}

export function writeGuestWishlist(ids: number[]) {
  write(WISH_KEY, ids.length ? ids : null)
}

export const sameLine = (a: Pick<LineInput, 'productId' | 'optionId'>, b: Pick<LineInput, 'productId' | 'optionId'>) =>
  a.productId === b.productId && (a.optionId ?? null) === (b.optionId ?? null)

/** Adds `quantity` to a line (or a new line), capped at the per-item limit. */
export function addLine(lines: LineInput[], line: LineInput): LineInput[] {
  const existing = lines.find((l) => sameLine(l, line))
  if (!existing) return [...lines, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }]
  return lines.map((l) => (l === existing ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity) } : l))
}

/** Sets a line's quantity; 0 removes it. */
export function setLine(lines: LineInput[], line: LineInput): LineInput[] {
  if (line.quantity <= 0) return lines.filter((l) => !sameLine(l, line))
  if (!lines.some((l) => sameLine(l, line))) return [...lines, line]
  return lines.map((l) => (sameLine(l, line) ? { ...l, quantity: Math.min(MAX_QTY, line.quantity) } : l))
}
