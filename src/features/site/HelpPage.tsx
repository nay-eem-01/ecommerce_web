import { Link } from 'react-router-dom'
import { useDeliveryOptions } from '../../api/checkout'
import { tk } from '../../lib/money'
import { methodsSentence } from '../../lib/payments'
import { useTitle } from '../../lib/useTitle'

/** Delivery charges, paying on delivery and returns: where the footer's help links go. */
export function HelpPage() {
  useTitle('Help')
  const delivery = useDeliveryOptions()
  const d = delivery.data
  return (
    <div className="wrap" style={{ paddingBottom: 48 }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span>Help</span>
      </nav>
      <h1 className="page-title">Help</h1>
      <section className="pd-sec" id="delivery" aria-labelledby="delivery-h">
        <h2 id="delivery-h">Delivery charges</h2>
        <div className="prose">
          {d ? (
            <>
              <p>
                <strong>Inside Dhaka:</strong> {d.insideEstimate}, {tk(d.insideFee)}.
              </p>
              <p>
                <strong>Everywhere else in Bangladesh:</strong> {d.outsideEstimate}, {tk(d.outsideFee)}.
              </p>
              <p>Orders over {tk(d.freeDeliveryThreshold)} ship free. You see the exact charge for your district at checkout.</p>
            </>
          ) : (
            <p className="muted">Loading delivery charges…</p>
          )}
        </div>
      </section>
      <section className="pd-sec" id="cod" aria-labelledby="cod-h">
        <h2 id="cod-h">Cash on delivery</h2>
        <div className="prose">
          <p>Pay the rider in cash when the parcel arrives. You can open it and check the item before you pay.</p>
          <p>No account is needed: check out as a guest and track the order with its number and your phone.</p>
          {d && d.paymentMethods.length > 1 && <p>You can also pay ahead: {methodsSentence(d.paymentMethods)}.</p>}
        </div>
      </section>
      <section className="pd-sec" id="returns" aria-labelledby="returns-h">
        <h2 id="returns-h">Returns in 7 days</h2>
        <div className="prose">
          <p>Return any unopened item within 7 days of delivery.</p>
          <p>If something arrives damaged, send us a photo and we replace it, at any time.</p>
        </div>
      </section>
    </div>
  )
}
