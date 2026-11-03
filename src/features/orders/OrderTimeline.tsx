import type { OrderStatus, PaymentMethod, TimelineEntry } from '../../api/types'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { Icon } from '../../ui/icons'

const STEPS: Array<[OrderStatus, string]> = [
  ['PLACED', 'Order placed'],
  ['PACKED', 'Packed'],
  ['SHIPPED', 'With the rider'],
  ['DELIVERED', 'Delivered'],
]

interface Props {
  status: OrderStatus
  timeline: TimelineEntry[]
  deliveryEstimate: string
  /** "Delivered to Dhanmondi"; omitted for guest tracking, which has no address. */
  area?: string
  paymentMethod: PaymentMethod
  paid?: boolean
  amountDue?: number
}

/** The order's progress as the design's step list, driven by its real history (vertical on phone, bars on desktop). */
export function OrderTimeline({ status, timeline, deliveryEstimate, area, paymentMethod, paid, amountDue }: Props) {
  const at = (s: OrderStatus) => timeline.find((t) => t.status === s)?.at
  if (status === 'CANCELLED' || status === 'RETURNED') {
    const entry = timeline.find((t) => t.status === status)
    return (
      <ol className="done-steps ended" aria-label="Order progress">
        <li className="done">
          <i aria-hidden="true">
            <Icon name="check" small />
          </i>
          <div>
            <p style={{ fontWeight: 700 }}>Order placed</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{dateTime(at('PLACED'))}</p>
          </div>
        </li>
        <li className="stop">
          <i aria-hidden="true" />
          <div>
            <p style={{ fontWeight: 700 }}>{status === 'CANCELLED' ? 'Cancelled' : 'Returned'}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {dateTime(entry?.at)}
              {entry?.note ? `. ${entry.note}` : ''}
            </p>
          </div>
        </li>
      </ol>
    )
  }
  const reached = STEPS.findIndex(([s]) => s === status)
  return (
    <ol className="done-steps" aria-label="Order progress">
      {STEPS.map(([s, label], i) => {
        const done = i <= reached
        const next = i === reached + 1
        let detail: string
        if (done) detail = dateTime(at(s)) || 'Done'
        else if (s === 'DELIVERED')
          detail = `In ${deliveryEstimate}. ${paid ? `Paid by ${METHOD_NAMES[paymentMethod]}.` : amountDue ? `Have ${tk(amountDue)} ready.` : ''}`.trim()
        else detail = next ? 'Next' : 'Coming up'
        return (
          <li key={s} className={done ? 'done' : next ? 'next' : 'later'}>
            <i aria-hidden="true">{done && <Icon name="check" small />}</i>
            <div>
              <p style={{ fontWeight: 700 }}>{s === 'DELIVERED' && area ? `Delivered to ${area}` : label}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{detail}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The design's four-bar progress on order cards: done green, the current step cyan. */
export function TrackBar({ status }: { status: OrderStatus }) {
  const reached = STEPS.findIndex(([s]) => s === status)
  const labels = ['Placed', 'Packed', 'With rider', 'Delivered']
  return (
    <div className="bar4" role="img" aria-label={`Order progress: ${labels[Math.max(0, reached)]}`}>
      {labels.map((label, i) => (
        <div key={label} className={i < reached || (i === reached && status === 'DELIVERED') ? 'on' : i === reached ? 'now' : undefined}>
          <i />
          {label}
        </div>
      ))}
    </div>
  )
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  PACKED: 'Packed',
  SHIPPED: 'With rider',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}
