import type { StockState } from '../api/types'
import { releaseMonth } from './dates'

interface Stocked {
  stockState: StockState
  stockLeft: number | null
  preorderRelease?: string | null
}

/** The card's stock line and its colour class, as the prototype words them. */
export function stockLine(p: Stocked): { text: string; tone: 'ok' | 'low' | 'pre' } {
  switch (p.stockState) {
    case 'PREORDER': {
      const month = releaseMonth(p.preorderRelease)
      return { text: month ? `Pre-order, arrives ${month}` : 'Pre-order', tone: 'pre' }
    }
    case 'SOLD_OUT':
      return { text: 'Sold out', tone: 'low' }
    case 'LOW_STOCK':
      return { text: p.stockLeft ? `Only ${p.stockLeft} left` : 'Only a few left', tone: 'low' }
    default:
      return { text: 'In stock', tone: 'ok' }
  }
}

export function canBuy(p: { stockState: StockState }): boolean {
  return p.stockState !== 'SOLD_OUT'
}
