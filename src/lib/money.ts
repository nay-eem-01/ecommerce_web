/**
 * Taka as the prototype shows it: "৳ 6,800" (Indian digit grouping, no decimals). The API sends BDT with two
 * decimals as a number; totals are always the server's, this only formats them.
 */
export function tk(amount: number | null | undefined): string {
  const value = Math.round(Number(amount ?? 0))
  return '৳ ' + value.toLocaleString('en-IN')
}
