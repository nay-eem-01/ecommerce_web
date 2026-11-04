import type { Period, SignalType } from '../../api/types'

const DAY = 86_400_000

/** Today's date in Dhaka (UTC+6 all year) as an ISO date. */
export function dhakaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 6 * 3600_000).toISOString().slice(0, 10)
}

/** The last `days` shop days ending today. */
export function periodFor(days: number, now: Date = new Date()): Period {
  const to = dhakaToday(now)
  const from = new Date(Date.parse(to) - (days - 1) * DAY).toISOString().slice(0, 10)
  return { from, to }
}

/** Days in a period, both ends counted. */
export function periodDays({ from, to }: Period): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1
}

/** Percent change, rounded; null when there is nothing to compare with. */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** 0.0253 -> "2.5%"; null -> "–". */
export function pct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined) return '–'
  return `${(ratio * 100).toFixed(digits).replace(/\.0+$/, '')}%`
}

/** "2026-11-05" -> "5 Nov". */
export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  RESTOCK_SOON: 'Restock',
  WANTED_SOLD_OUT: 'Sold out, wanted',
  LOW_STOCK_HIGH_DEMAND: 'Low stock',
  LOOKED_NOT_BOUGHT: 'Not converting',
  SLOW_MOVER: 'Slow',
  SEARCH_GAP: 'Search gap',
  COMING_SOON_DEMAND: 'Coming soon',
}
