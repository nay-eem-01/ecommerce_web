const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2027-01" (pre-order release from the API) -> "January 2027". */
export function releaseMonth(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return ''
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : ''
}

/** An ISO instant -> "18 Oct 2026" in Bangladesh time. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // Asia/Dhaka is UTC+6 all year (no daylight saving), so this needs no time zone data.
  const local = new Date(date.getTime() + 6 * 3600_000)
  return `${local.getUTCDate()} ${SHORT[local.getUTCMonth()]} ${local.getUTCFullYear()}`
}

/** An ISO instant -> "18 Oct 2026, 3:05 pm" in Bangladesh time. */
export function dateTime(iso: string | null | undefined): string {
  const day = shortDate(iso)
  if (!day || !iso) return ''
  const local = new Date(new Date(iso).getTime() + 6 * 3600_000)
  const h = local.getUTCHours()
  const m = String(local.getUTCMinutes()).padStart(2, '0')
  return `${day}, ${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`
}
