import { useSearchParams } from 'react-router-dom'
import type { Period } from '../../api/types'
import { periodFor } from './insightsFormat'

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** The period in the URL (`?from=&to=`), else the last 30 days. Shared by the dashboard and the product table. */
export function usePeriod(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const period = ISO.test(from) && ISO.test(to) ? { from, to } : periodFor(30)
  const set = (p: Period) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('from', p.from)
        next.set('to', p.to)
        return next
      },
      { replace: true },
    )
  return [period, set]
}
