import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import { trackOrder } from '../../api/orders'
import type { Tracking } from '../../api/types'
import { shortDate } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { localDigits, phoneError } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/Icon'
import { lastOrder } from '../checkout/lastOrder'
import { OrderTimeline, STATUS_LABEL } from './OrderTimeline'

/** Guest tracking by order number and phone (the email links here with `?order=`). */
export function TrackPage() {
  useTitle('Track an order')
  const [params] = useSearchParams()
  const initial = params.get('order') ?? ''
  const [orderNumber, setOrderNumber] = useState(initial)
  const [phone, setPhone] = useState(() => lastOrder(initial)?.phone ?? '')
  const [error, setError] = useState('')
  const track = useMutation({ mutationFn: () => trackOrder(orderNumber.trim().toUpperCase(), localDigits(phone)) })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!orderNumber.trim()) return setError('Enter your order number, like SS-7K2M9QXA.')
    const p = phoneError(phone)
    if (p) return setError(p === 'Enter a mobile number so the rider can reach you.' ? 'Enter the mobile number you ordered with.' : p)
    setError('')
    track.mutate()
  }

  return (
    <div className="wrap">
      <div className="auth" style={{ maxWidth: track.data ? 720 : 460 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className="page-title" style={{ padding: 0 }}>
            Track an order
          </h1>
          <p className="muted">Use the order number from your confirmation and the mobile number you ordered with.</p>
        </div>
        <form className="panel" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="tr-order">Order number</label>
            <input className="input" id="tr-order" value={orderNumber} placeholder="SS-7K2M9QXA" autoComplete="off" onChange={(e) => setOrderNumber(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tr-phone">Mobile number</label>
            <div className="prefix">
              <span>+88</span>
              <input className="input" id="tr-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {(error || track.error) && (
            <p className="err" role="alert" style={{ color: 'var(--bad)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="alert" />
              {error || errorMessage(track.error)}
            </p>
          )}
          <button className="btn lg block" type="submit" disabled={track.isPending}>
            {track.isPending ? 'Looking it up…' : 'Track order'}
          </button>
        </form>
        {track.data && <TrackingResult tracking={track.data} />}
        <p className="muted" style={{ fontSize: 14 }}>
          Signed in? Your orders are under <Link className="link" to="/account/orders">My orders</Link>.
        </p>
      </div>
    </div>
  )
}

function TrackingResult({ tracking: t }: { tracking: Tracking }) {
  return (
    <section className="panel order" aria-label={`Order ${t.orderNumber}`}>
      <div className="order-top">
        <span className="id">{t.orderNumber}</span>
        <span className="meta">{shortDate(t.placedAt)}</span>
        <span className="meta">
          {tk(t.total)}, {METHOD_NAMES[t.paymentMethod]}
        </span>
        <span className={`pill ${t.status === 'DELIVERED' ? 'ok' : t.status === 'CANCELLED' ? 'warn' : 'pre'}`}>{STATUS_LABEL[t.status]}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)' }}>
        {t.items.map((item, i) => (
          <li key={i}>
            {item.name}
            {item.optionLabel ? `, ${item.optionLabel}` : ''} ×{item.quantity}
          </li>
        ))}
      </ul>
      <OrderTimeline status={t.status} timeline={t.timeline} deliveryEstimate={t.deliveryEstimate} paymentMethod={t.paymentMethod} />
    </section>
  )
}
