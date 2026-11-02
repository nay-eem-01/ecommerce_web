import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { retryPayment, trackOrder } from '../../api/orders'
import type { Order, Tracking } from '../../api/types'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'
import { PageLoading } from '../../layout/AppLayout'
import { Icon } from '../../ui/Icon'
import { useSession } from '../auth/session'
import { NotFoundPage } from '../errors/NotFoundPage'
import { OrderTimeline } from '../orders/OrderTimeline'
import { Confirmation } from './DonePage'
import { lastOrder } from './lastOrder'

/**
 * Where a payment provider sends the shopper back (`PAYMENT_RETURN_URL?order=SS-...&payment=PAID|FAILED|...`).
 * The query string is only a hint: the order is loaded again (members: their order; guests: tracking with the phone
 * remembered for this tab). Unpaid online orders are cancelled after 30 minutes, so a retry is offered at once.
 */
export function PaymentResultPage() {
  useTitle('Payment')
  const [params] = useSearchParams()
  const orderNumber = params.get('order') ?? ''
  const hint = (params.get('payment') ?? 'UNKNOWN').toUpperCase()
  const { status } = useSession()
  const remembered = lastOrder(orderNumber)
  const member = status === 'signed-in'

  const order = useQuery({
    queryKey: ['payment-result', orderNumber, member],
    queryFn: async (): Promise<{ order?: Order; tracking?: Tracking }> => {
      if (member) return { order: await api<Order>(`/api/orders/me/${encodeURIComponent(orderNumber)}`) }
      if (remembered) return { tracking: await trackOrder(orderNumber, remembered.phone) }
      return {}
    },
    enabled: !!orderNumber && status !== 'restoring',
  })

  if (!orderNumber) return <NotFoundPage />
  if (status === 'restoring' || order.isPending) return <PageLoading />

  const full = order.data?.order
  const tracking = order.data?.tracking
  const paymentStatus = full?.paymentStatus ?? hint
  const cancelled = (full?.status ?? tracking?.status) === 'CANCELLED'

  if (paymentStatus === 'PAID' && full) return <Confirmation order={full} heading={`Payment received. Thank you, ${full.fullName.split(/\s+/)[0]}.`} />

  const phone = full?.phone ?? remembered?.phone ?? null
  const total = full?.total ?? tracking?.total ?? remembered?.total
  const method = full?.paymentMethod ?? tracking?.paymentMethod ?? remembered?.paymentMethod
  const failed = ['FAILED', 'CANCELLED', 'EXPIRED'].includes(paymentStatus)

  return (
    <div className="wrap">
      <div className="done">
        {paymentStatus === 'PAID' ? (
          <div className="tick">
            <Icon name="check" />
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 10 }}>
          <h1 className="page-title" style={{ padding: 0 }}>
            {paymentStatus === 'PAID'
              ? 'Payment received. Thank you.'
              : cancelled
                ? 'This order was cancelled'
                : failed
                  ? 'Your payment did not go through'
                  : 'We are confirming your payment'}
          </h1>
          <p className="muted" style={{ fontSize: 17 }}>
            Order <strong style={{ color: 'var(--text)' }}>{orderNumber}</strong>
            {total != null && method ? `, ${tk(total)} by ${METHOD_NAMES[method]}` : ''}.{' '}
            {cancelled
              ? 'Nothing was charged; if money left your account it is refunded automatically.'
              : failed
                ? 'Your order is kept for 30 minutes. Try again, or choose another way to pay.'
                : paymentStatus === 'PAID'
                  ? ''
                  : 'This can take a minute. Refresh this page to check again.'}
          </p>
        </div>
        {order.error && <p role="alert">{errorMessage(order.error)}</p>}
        {(full || tracking) && !cancelled && (
          <div className="panel" style={{ padding: 24 }}>
            <OrderTimeline
              status={(full ?? tracking)!.status}
              timeline={(full ?? tracking)!.timeline}
              deliveryEstimate={(full ?? tracking)!.deliveryEstimate}
              area={full?.area}
              paymentMethod={(full ?? tracking)!.paymentMethod}
              paid={paymentStatus === 'PAID'}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {failed && !cancelled && phone && <RetryButton orderNumber={orderNumber} phone={phone} />}
          {!failed && paymentStatus !== 'PAID' && (
            <button className="btn alt" type="button" onClick={() => order.refetch()}>
              Check again
            </button>
          )}
          <Link className="btn alt" to={member ? `/orders/${orderNumber}` : `/track?order=${encodeURIComponent(orderNumber)}`}>
            Track this order
          </Link>
        </div>
        {failed && !phone && (
          <p className="muted">
            To pay again, <Link className="link" to={`/track?order=${encodeURIComponent(orderNumber)}`}>open the order with your phone number</Link>.
          </p>
        )}
      </div>
    </div>
  )
}

/** Opens a new payment for an unpaid online order and goes to the provider's page. */
export function RetryButton({ orderNumber, phone, label = 'Try paying again' }: { orderNumber: string; phone: string; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function retry() {
    setBusy(true)
    setError('')
    try {
      const action = await retryPayment(orderNumber, phone)
      if (action?.url) window.location.assign(action.url)
      else setError('The payment page did not open. Please try again in a minute.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button className="btn" type="button" disabled={busy} onClick={retry}>
        {busy ? 'Opening the payment page…' : label}
      </button>
      {error && (
        <p className="err" role="alert" style={{ color: 'var(--bad)', width: '100%', display: 'flex', gap: 6 }}>
          <Icon name="alert" />
          {error}
        </p>
      )}
    </>
  )
}
