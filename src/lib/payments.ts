import type { PaymentMethod } from '../api/types'

export const METHOD_NAMES: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  CARD: 'Card',
}

/** "Cash on delivery, bKash, Nagad or card" from the enabled methods. */
export function methodsSentence(methods: PaymentMethod[]): string {
  const names = methods.map((m, i) => (i === 0 ? METHOD_NAMES[m] : m === 'CARD' ? 'card' : METHOD_NAMES[m]))
  if (names.length <= 1) return names[0] ?? 'Cash on delivery'
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}
