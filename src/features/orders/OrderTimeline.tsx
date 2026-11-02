import type { OrderStatus, PaymentMethod, TimelineEntry } from '../../api/types'
import { dateTime } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { Icon } from '../../ui/Icon'

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

/** The prototype's vertical order timeline, driven by the order's real history. */
export function OrderTimeline({ status, timeline, deliveryEstimate, area, paymentMethod, paid, amountDue }: Props) {
  const at = (s: OrderStatus) => timeline.find((t) => t.status === s)?.at
  if (status === 'CANCELLED' || status === 'RETURNED') {
    const entry = timeline.find((t) => t.status === status)
    return (
      <ol className="timeline">
        <li className="on">
          <span className="dot">
            <Icon name="check" />
          </span>
          <div>
            <strong>Order placed</strong>
            <span>{dateTime(at('PLACED'))}</span>
          </div>
        </li>
        <li className="now">
          <span className="dot" />
          <div>
            <strong>{status === 'CANCELLED' ? 'Cancelled' : 'Returned'}</strong>
            <span>
              {dateTime(entry?.at)}
              {entry?.note ? `. ${entry.note}` : ''}
            </span>
          </div>
        </li>
      </ol>
    )
  }
  const reached = STEPS.findIndex(([s]) => s === status)
  return (
    <ol className="timeline">
      {STEPS.map(([s, label], i) => {
        const done = i <= reached
        const next = i === reached + 1
        let detail: string
        if (done) detail = dateTime(at(s)) || 'Done'
        else if (s === 'DELIVERED')
          detail = `In ${deliveryEstimate}. ${
            paid ? `Paid by ${METHOD_NAMES[paymentMethod]}.` : amountDue ? `Have ${tk(amountDue)} ready.` : ''
          }`.trim()
        else detail = next ? 'Next' : 'Coming up'
        return (
          <li key={s} className={done ? 'on' : next ? 'now' : undefined}>
            <span className="dot">{done && <Icon name="check" />}</span>
            <div>
              <strong>{s === 'DELIVERED' && area ? `Delivered to ${area}` : label}</strong>
              <span>{detail}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The compact four-step bar used on order cards. */
export function TrackBar({ status }: { status: OrderStatus }) {
  const reached = STEPS.findIndex(([s]) => s === status)
  const labels = ['Placed', 'Packed', 'With rider', 'Delivered']
  return (
    <div className="track-bar" aria-label="Order progress">
      {labels.map((label, i) => (
        <div key={label} className={i <= reached ? 'on' : undefined}>
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
