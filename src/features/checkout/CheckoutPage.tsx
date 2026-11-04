import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAddresses } from '../../api/account'
import { useDeliveryOptions, useQuote } from '../../api/checkout'
import { ApiError, errorMessage } from '../../api/errors'
import { placeOrder } from '../../api/orders'
import type { PaymentMethod } from '../../api/types'
import { releaseMonth } from '../../lib/dates'
import { tk } from '../../lib/money'
import { METHOD_NAMES } from '../../lib/payments'
import { localDigits } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { PageLoading } from '../../layout/AppLayout'
import { Icon } from '../../ui/icons'
import { useSession } from '../auth/session'
import { useCart } from '../cart/CartProvider'
import { useBag } from '../cart/BagContext'
import { CartPage } from '../cart/Bag'
import { ProductImage } from '../catalog/ProductImage'
import { rememberOrder } from './lastOrder'
import { LABELS, validate, type FieldId } from './validate'

const PAY_COPY: Record<PaymentMethod, string> = {
  COD: 'Pay the rider when it arrives',
  BKASH: 'Approve on bKash’s page next',
  NAGAD: 'Approve on Nagad’s page next',
  CARD: 'Visa, Mastercard, Amex',
}

interface Form {
  fullName: string
  phone: string
  district: string
  area: string
  addressLine: string
  email: string
  note: string
  paymentMethod: PaymentMethod
}

const FIELDS: FieldId[] = ['fullName', 'phone', 'area', 'addressLine', 'email']

export function CheckoutPage() {
  useTitle('Checkout')
  const cart = useCart()
  const { status } = useSession()
  const addresses = useAddresses(status === 'signed-in')
  if (!cart.ready || status === 'restoring' || (status === 'signed-in' && addresses.isPending)) return <PageLoading />
  if (!cart.lines.length)
    return (
      <>
        <CheckoutHeader />
        <CartPage />
      </>
    )
  return <Checkout />
}

function Checkout() {
  const cart = useCart()
  const { status, user, updateUser } = useSession()
  const member = status === 'signed-in'
  const addresses = useAddresses(member)
  const saved = addresses.data?.find((a) => a.defaultAddress) ?? addresses.data?.[0]
  const delivery = useDeliveryOptions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Form>(() => ({
    fullName: saved?.fullName ?? user?.name ?? '',
    phone: saved?.phone ?? user?.phone ?? '',
    district: saved?.district ?? 'Dhaka',
    area: saved?.area ?? '',
    addressLine: saved?.addressLine ?? '',
    email: user?.email ?? '',
    note: '',
    paymentMethod: 'COD',
  }))
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({})
  const [tried, setTried] = useState(false)
  const [more, setMore] = useState(false)
  const [problem, setProblem] = useState<{ title: string; items: Array<[FieldId | null, string]> } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [promo, setPromo] = useState('')
  const [promoMsg, setPromoMsg] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  // One key per checkout attempt; a retry after a network error reuses it, so the order is never placed twice.
  const idempotencyKey = useRef(crypto.randomUUID())
  const problemBox = useRef<HTMLDivElement>(null)

  const quote = useQuote(cart.lines, form.district)
  const methods = delivery.data?.paymentMethods ?? ['COD']
  const method = methods.includes(form.paymentMethod) ? form.paymentMethod : 'COD'
  const q = quote.data

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (key in errors && errors[key as FieldId]) setErrors((e) => ({ ...e, [key]: validate(key as FieldId, String(value)) }))
  }

  function blur(id: FieldId) {
    if (form[id] || tried) setErrors((e) => ({ ...e, [id]: validate(id, form[id]) }))
  }

  function showProblem(title: string, items: Array<[FieldId | null, string]>) {
    setProblem({ title, items })
    requestAnimationFrame(() => problemBox.current?.focus())
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    const found = Object.fromEntries(FIELDS.map((id) => [id, validate(id, form[id])])) as Record<FieldId, string>
    setErrors(found)
    const bad = FIELDS.filter((id) => found[id])
    if (bad.length) {
      showProblem(`${bad.length} thing${bad.length > 1 ? 's' : ''} to fix before we can deliver`, bad.map((id) => [id, found[id]]))
      return
    }
    setProblem(null)
    setPlacing(true)
    try {
      const order = await placeOrder(
        {
          items: cart.lines.map((l) => ({ productId: l.productId, optionId: l.optionId ?? undefined, quantity: l.quantity })),
          fullName: form.fullName.trim(),
          phone: localDigits(form.phone),
          email: form.email.trim() || undefined,
          district: form.district,
          area: form.area.trim(),
          addressLine: form.addressLine.trim(),
          note: form.note.trim() || undefined,
          paymentMethod: method,
          saveAddress: member,
        },
        idempotencyKey.current,
      )
      rememberOrder(order)
      // The backend names a nameless account after its first order; show that without a reload.
      if (member && !user?.name) updateUser({ name: order.fullName })
      idempotencyKey.current = crypto.randomUUID()
      await cart.clear().catch(() => undefined)
      if (method === 'COD') {
        navigate('/checkout/done', { state: { order } })
      } else if (order.paymentAction?.type === 'REDIRECT' && order.paymentAction.url) {
        window.location.assign(order.paymentAction.url)
      } else {
        // The order is placed but the payment page could not be opened; the result page offers a retry.
        navigate(`/checkout/result?order=${encodeURIComponent(order.orderNumber)}&payment=FAILED`)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Stock changed since the quote: show what is short now.
        await queryClient.invalidateQueries({ queryKey: ['quote'] })
        showProblem('Something in your cart changed', [[null, error.message]])
      } else if (error instanceof ApiError && error.status === 0) {
        showProblem('Your order did not go through', [[null, `${error.message} Press "Place order" again; you will not be charged twice.`]])
      } else {
        showProblem('Your order did not go through', [[null, errorMessage(error)]])
      }
    } finally {
      setPlacing(false)
    }
  }

  const preorderLines = q?.lines.filter((l) => l.preorder) ?? []
  const total = q?.total
  const inside = delivery.data?.insideDistricts ?? ['Dhaka']
  const outsideList = (delivery.data?.districts ?? []).filter((d) => !inside.includes(d))
  const isInside = inside.includes(form.district)
  const itemCount = q?.lines.reduce((n, l) => n + l.quantity, 0) ?? cart.count
  const payNote = method === 'COD' ? 'Nothing is charged now. You pay when it arrives.' : 'You confirm the payment on the next screen.'
  const placeLabel = placing ? 'Placing your order…' : total != null ? `Place order · ${tk(total)}` : 'Place order'
  const canPlace = !placing && !!q && q.allInStock

  const field = (id: FieldId, label: string, input: ReactNode, opts: { full?: boolean; optional?: boolean; help?: string } = {}) => (
    <div className="field" style={opts.full ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={`co-${id}`}>
        {label}
        {opts.optional && <span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>}
      </label>
      {input}
      <div id={`co-${id}-msg`} aria-live="polite">
        {errors[id] ? (
          <span className="co-err">
            <Icon name="alert" small />
            {errors[id]}
          </span>
        ) : id === 'phone' && form.phone && !validate('phone', form.phone) ? (
          <span className="help" style={{ color: 'var(--ok)' }}>Looks good. The rider calls this number before arriving.</span>
        ) : opts.help ? (
          <span className="help">{opts.help}</span>
        ) : null}
      </div>
    </div>
  )
  const inputProps = (id: FieldId) => ({
    className: 'input',
    id: `co-${id}`,
    value: form[id],
    'aria-invalid': errors[id] ? true : undefined,
    'aria-describedby': `co-${id}-msg`,
    onBlur: () => blur(id),
  })

  const summaryLines = (
    <>
      {(q?.lines ?? []).map((l) => (
        <div className="line co-mini" key={`${l.productId}-${l.optionId}`}>
          <div className="thumb">
            <div className="art">
              <ProductImage slug={l.slug} url={l.thumbnailUrl} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {[l.optionLabel?.replace(/^[^:]+:\s*/, ''), `×${l.quantity}`].filter(Boolean).join(' · ')}
            </p>
            {!l.enoughStock && (
              <p style={{ fontSize: 12, color: 'var(--bad)' }}>
                Not enough left. <Link className="link" to="/cart">Change it in the bag</Link>
              </p>
            )}
          </div>
          <span className="price" style={{ fontSize: 13 }}>
            {tk(l.lineTotal)}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" aria-label="Promo code" placeholder="Promo code" autoComplete="off" style={{ minHeight: 44 }} value={promo} onChange={(e) => setPromo(e.target.value)} />
        <button
          type="button"
          className="tbtn"
          style={{ minHeight: 44 }}
          onClick={() => setPromoMsg(promo.trim() ? `The code ${promo.trim().toUpperCase()} is not active. Check the spelling or the end date.` : '')}
        >
          Apply
        </button>
      </div>
      <div aria-live="polite">
        {promoMsg && (
          <span className="co-err">
            <Icon name="alert" small />
            {promoMsg}
          </span>
        )}
      </div>
      {q ? (
        <>
          <div className="row">
            <span>Subtotal</span>
            <span>{tk(q.subtotal)}</span>
          </div>
          <div className="row">
            <span>Delivery to {q.district}</span>
            <span>{q.deliveryFee ? tk(q.deliveryFee) : 'Free'}</span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{tk(q.total)}</span>
          </div>
        </>
      ) : quote.error ? (
        <p role="alert">{errorMessage(quote.error)}</p>
      ) : (
        <p style={{ color: 'var(--muted)' }}>Pricing…</p>
      )}
    </>
  )
  const trust = (
    <div className="trust" style={{ flexDirection: 'column', gap: 8 }}>
      <span>
        <Icon name="shield" />
        Open the parcel and check it before you pay
      </span>
      <span>
        <Icon name="return" />
        7-day returns on unopened items
      </span>
    </div>
  )

  return (
    <div className="co">
      <CheckoutHeader />
      <form onSubmit={submit} noValidate>
        <div className="ph-only">
          <button type="button" className="co-sum-toggle" aria-expanded={summaryOpen} aria-controls="co-sum" onClick={() => setSummaryOpen((o) => !o)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="bag" small />
              {summaryOpen ? 'Hide order summary' : `Show order summary · ${itemCount} item${itemCount === 1 ? '' : 's'}`}
            </span>
            <span className="price" style={{ color: 'var(--text)', fontSize: 16 }}>
              {total != null ? tk(total) : ''}
            </span>
          </button>
          <div id="co-sum" className="co-sum-body" hidden={!summaryOpen}>
            {summaryLines}
          </div>
        </div>

        <div className="page co-layout">
          <div className="co-main">
            <div className="steps ph-only" aria-hidden="true">
              <i className="on" />
              <i className={form.fullName && form.phone && form.area && form.addressLine ? 'on' : undefined} />
            </div>
            <div className="co-title">
              <h1 className="display co-h1">Checkout</h1>
              {member ? (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                  Signed in as <b style={{ color: 'var(--text)' }}>{user?.name || user?.phone}</b>.{saved ? ' We filled in your saved address.' : ' We save this address for next time.'}
                </p>
              ) : (
                <div className="co-guest">
                  <span>Checking out as a guest. No account needed.</span>
                  <Link className="link" to="/sign-in?back=/checkout">
                    Sign in<span className="d-only-inline"> to use a saved address</span>
                  </Link>
                </div>
              )}
            </div>

            {problem && (
              <div className="err-summary" role="alert" tabIndex={-1} ref={problemBox}>
                <strong>{problem.title}</strong>
                <ul>
                  {problem.items.map(([id, message], i) => (
                    <li key={i}>
                      {id ? (
                        <>
                          <a
                            href={`#co-${id}`}
                            onClick={(e) => {
                              e.preventDefault()
                              document.getElementById(`co-${id}`)?.focus()
                            }}
                          >
                            {LABELS[id]}
                          </a>
                          : {message}
                        </>
                      ) : (
                        message
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section className="co-step" aria-labelledby="st1">
              <div className="co-step-head">
                <span className="co-n d-only">1</span>
                <h2 id="st1" className="display">
                  <span className="ph-only-inline">1 · </span>Where should we deliver?
                </h2>
              </div>
              <div className="co-fields">
                {field(
                  'phone',
                  'Mobile number',
                  <div className="prefix">
                    <span>+88</span>
                    <input {...inputProps('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" aria-required="true" onChange={(e) => set('phone', e.target.value)} />
                  </div>,
                  { help: 'The rider calls this number before arriving.' },
                )}
                {field('fullName', 'Full name', <input {...inputProps('fullName')} autoComplete="name" aria-required="true" onChange={(e) => set('fullName', e.target.value)} />)}
                <fieldset className="field" style={{ gridColumn: '1 / -1', border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>District</legend>
                  <div className="co-choices two">
                    {/* The zone name inside <b> is the label's text; the rule does not look that deep. */}
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label className={isInside ? 'choice on' : 'choice'}>
                      <input className="vh" type="radio" name="zone" checked={isInside} onChange={() => set('district', inside[0])} />
                      <span className="radio" />
                      <span>
                        <b style={{ display: 'block', fontSize: 14 }}>Inside Dhaka</b>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {delivery.data ? `${delivery.data.insideEstimate} · ${tk(delivery.data.insideFee)}` : ''}
                        </span>
                      </span>
                    </label>
                    {/* The zone name inside <b> is the label's text; the rule does not look that deep. */}
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                    <label className={!isInside ? 'choice on' : 'choice'}>
                      <input className="vh" type="radio" name="zone" checked={!isInside} disabled={!outsideList.length} onChange={() => set('district', outsideList[0])} />
                      <span className="radio" />
                      <span>
                        <b style={{ display: 'block', fontSize: 14 }}>Outside Dhaka</b>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {delivery.data ? `${delivery.data.outsideEstimate} · ${tk(delivery.data.outsideFee)}` : ''}
                        </span>
                      </span>
                    </label>
                  </div>
                  {!isInside && (
                    <select className="input" aria-label="Your district" style={{ marginTop: 8, maxWidth: 320 }} value={form.district} onChange={(e) => set('district', e.target.value)}>
                      {outsideList.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  )}
                </fieldset>
                {field('area', 'Area or thana', <input {...inputProps('area')} autoComplete="address-level2" placeholder="e.g. Mirpur 10" aria-required="true" onChange={(e) => set('area', e.target.value)} />)}
                {field(
                  'addressLine',
                  'House, road and flat',
                  <textarea {...inputProps('addressLine')} className="input co-textarea" autoComplete="street-address" placeholder="House 9, Road 1, Flat 4A" onChange={(e) => set('addressLine', e.target.value)} />,
                )}
                <div className="ph-only" style={{ gridColumn: '1 / -1' }}>
                  {!(more || form.note || errors.email) && (
                    <button type="button" className="link" style={{ border: 0, background: 'transparent', padding: 0, fontSize: 14 }} aria-expanded={false} aria-controls="co-more" onClick={() => setMore(true)}>
                      Add an email receipt or a note for the rider
                    </button>
                  )}
                </div>
                <div id="co-more" className={more || form.note || errors.email ? 'co-more open' : 'co-more'}>
                  {field('email', 'Email for the receipt', <input {...inputProps('email')} type="email" autoComplete="email" placeholder="you@example.com" onChange={(e) => set('email', e.target.value)} />, { optional: true })}
                  <div className="field">
                    <label htmlFor="co-note">
                      Note for the rider<span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>
                    </label>
                    <input className="input" id="co-note" value={form.note} maxLength={200} placeholder="Call when at the gate" onChange={(e) => set('note', e.target.value)} />
                  </div>
                </div>
              </div>
            </section>

            <section className="co-step" aria-labelledby="st2">
              <div className="co-step-head">
                <span className="co-n d-only">2</span>
                <h2 id="st2" className="display">
                  <span className="ph-only-inline">2 · </span>How do you want to pay?
                </h2>
              </div>
              <div className="co-choices" role="radiogroup" aria-labelledby="st2">
                {methods.map((m) => (
                  // The method name inside <b> is the label's text; the rule cannot read it through the lookup.
                  // eslint-disable-next-line jsx-a11y/label-has-associated-control
                  <label className={method === m ? 'choice on' : 'choice'} key={m}>
                    <input className="vh" type="radio" name="pay" value={m} checked={method === m} onChange={() => set('paymentMethod', m)} />
                    <span className="radio" />
                    <span style={{ flex: 1 }}>
                      <b style={{ display: 'block', fontSize: 15 }}>{METHOD_NAMES[m]}</b>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{PAY_COPY[m]}</span>
                    </span>
                    {m === 'COD' && methods.length > 1 && <span className="tag pink">Most chosen</span>}
                  </label>
                ))}
              </div>
              {preorderLines.length > 0 && (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                  Your bag has a pre-order: {preorderLines.map((l) => `${l.name} arrives ${releaseMonth(l.preorderRelease) || 'soon'}`).join('; ')}.
                </p>
              )}
            </section>
            <div className="ph-only">{trust}</div>
            <div className="ph-only" style={{ height: 120 }} />
          </div>

          <aside className="panel co-aside d-only" aria-label="Order summary">
            <h2 className="display" style={{ fontSize: 22 }}>
              Your order
            </h2>
            {summaryLines}
            <button className="btn block" type="submit" disabled={!canPlace}>
              {placeLabel}
            </button>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>{payNote}</p>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>{trust}</div>
          </aside>
        </div>

        <div className="stickybar ph-only" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, position: 'fixed', left: 0, right: 0 }}>
          <button className="btn block" type="submit" disabled={!canPlace}>
            {placeLabel}
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{payNote}</p>
        </div>
      </form>
    </div>
  )
}

/** The focused checkout header: back to the bag, the wordmark, "Secure". No menu, no search. */
export function CheckoutHeader() {
  const bag = useBag()
  return (
    <header className="co-hdr">
      <div className="page co-hdr-row">
        <button type="button" className="ibtn ph-only" aria-label="Back to bag" onClick={bag.open}>
          <Icon name="back" />
        </button>
        <button type="button" className="ulink d-only" style={{ justifySelf: 'start', border: 0, borderBottom: '1px solid currentColor', background: 'transparent' }} onClick={bag.open}>
          ← Back to bag
        </button>
        <Link className="mark" to="/">
          senpai<span>.</span>supply
        </Link>
        <span className="meta" style={{ justifySelf: 'end', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Icon name="shield" small />
          <span className="ph-only-inline">Secure</span>
          <span className="d-only-inline">Secure checkout</span>
        </span>
      </div>
    </header>
  )
}
