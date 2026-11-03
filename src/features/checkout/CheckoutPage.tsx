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
import { Icon } from '../../ui/Icon'
import { useSession } from '../auth/session'
import { useCart } from '../cart/CartProvider'
import { CartPage } from '../cart/CartPage'
import { ProductImage } from '../catalog/ProductImage'
import { rememberOrder } from './lastOrder'
import { LABELS, validate, type FieldId } from './validate'

const PAY_COPY: Record<PaymentMethod, string> = {
  COD: 'Pay the rider. You can check the item first.',
  BKASH: 'You approve the payment on bKash’s page next.',
  NAGAD: 'You approve the payment on Nagad’s page next.',
  CARD: 'Visa, Mastercard or Amex, on a secure payment page.',
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
  if (!cart.lines.length) return <CartPage />
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
  const field = (id: FieldId, label: string, input: ReactNode, opts: { full?: boolean; optional?: boolean; help?: string } = {}) => (
    <div className={opts.full ? 'field full' : 'field'}>
      <label htmlFor={`co-${id}`}>
        {label}
        {opts.optional && <span className="opt-l"> (optional)</span>}
      </label>
      {input}
      <div id={`co-${id}-msg`} aria-live="polite">
        {errors[id] ? (
          <span className="err">
            <Icon name="alert" />
            {errors[id]}
          </span>
        ) : id === 'phone' && form.phone && tried ? (
          <span className="okmsg">Looks good</span>
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

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/cart">Cart</Link>
        <span aria-hidden="true">/</span>
        <span>Checkout</span>
      </nav>
      <h1 className="page-title">Checkout</h1>
      <form className="co-layout" onSubmit={submit} noValidate>
        <div className="co-steps">
          {member ? (
            <p className="muted">
              Signed in as <strong style={{ color: 'var(--text)' }}>{user?.name || user?.phone}</strong>.
              {saved ? ' We filled in your saved address.' : ' We save this address for next time.'}
            </p>
          ) : (
            <div className="panel" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Checking out as a guest. No account needed.</span>
              <Link className="link" to="/sign-in?back=/checkout" style={{ marginLeft: 'auto' }}>
                Sign in to use a saved address
              </Link>
            </div>
          )}
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
          <section className="panel co-step" aria-labelledby="st1">
            <div className="co-step-head">
              <span className="n">1</span>
              <h2 id="st1">Where should we deliver?</h2>
            </div>
            <div className="fields">
              {field('fullName', 'Full name', <input {...inputProps('fullName')} autoComplete="name" aria-required="true" onChange={(e) => set('fullName', e.target.value)} />)}
              {field(
                'phone',
                'Mobile number',
                <div className="prefix">
                  <span>+88</span>
                  <input {...inputProps('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" aria-required="true" onChange={(e) => set('phone', e.target.value)} />
                </div>,
                { help: 'The rider calls this number before arriving.' },
              )}
              <div className="field">
                <label htmlFor="co-district">District</label>
                <select className="input" id="co-district" value={form.district} onChange={(e) => set('district', e.target.value)}>
                  {(delivery.data?.districts ?? [form.district]).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              {field('area', 'Area or thana', <input {...inputProps('area')} autoComplete="address-level2" placeholder="e.g. Dhanmondi" aria-required="true" onChange={(e) => set('area', e.target.value)} />)}
              {field(
                'addressLine',
                'House, road and flat',
                <textarea {...inputProps('addressLine')} autoComplete="street-address" placeholder="House 12, Road 5, Flat 3B" onChange={(e) => set('addressLine', e.target.value)} />,
                { full: true },
              )}
              <div className="field full">
                <button type="button" className="link" style={{ justifySelf: 'start', textAlign: 'left' }} aria-expanded={more || !!form.note} aria-controls="co-more" onClick={() => setMore((m) => !m)}>
                  Add an email receipt or a note for the rider
                </button>
              </div>
              <div className="field full" id="co-more" hidden={!(more || form.note || errors.email)}>
                <div className="fields">
                  {field('email', 'Email for the receipt', <input {...inputProps('email')} type="email" autoComplete="email" onChange={(e) => set('email', e.target.value)} />, { optional: true })}
                  <div className="field">
                    <label htmlFor="co-note">
                      Note for the rider<span className="opt-l"> (optional)</span>
                    </label>
                    <input className="input" id="co-note" value={form.note} maxLength={200} placeholder="Call when at the gate" onChange={(e) => set('note', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="panel co-step" aria-labelledby="st2">
            <div className="co-step-head">
              <span className="n">2</span>
              <h2 id="st2">How do you want to pay?</h2>
            </div>
            <div className="choices" role="radiogroup" aria-labelledby="st2">
              {methods.map((m) => (
                // The method name inside <strong> is the label's text; the rule cannot read it through the lookup.
                // eslint-disable-next-line jsx-a11y/label-has-associated-control
                <label className="choice" key={m}>
                  <input type="radio" name="pay" value={m} checked={method === m} onChange={() => set('paymentMethod', m)} />
                  <span>
                    <strong>{METHOD_NAMES[m]}</strong>
                    <span>{PAY_COPY[m]}</span>
                  </span>
                  <span className="tag" />
                </label>
              ))}
            </div>
            {preorderLines.length > 0 && (
              <p className="muted">
                Your cart has a pre-order: {preorderLines.map((l) => `${l.name} arrives ${releaseMonth(l.preorderRelease) || 'soon'}`).join('; ')}.
              </p>
            )}
          </section>
        </div>
        <aside className="panel co-summary" aria-label="Order summary">
          <h2 className="h3">Your order</h2>
          <div className="mini-items">
            {(q?.lines ?? []).map((l) => (
              <div className="mini" key={`${l.productId}-${l.optionId}`}>
                <span className="slot">
                  <ProductImage slug={l.slug} url={l.thumbnailUrl} />
                  <span className="q">{l.quantity}</span>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div>{l.name}</div>
                  {l.optionLabel && <div className="v">{l.optionLabel}</div>}
                  {!l.enoughStock && (
                    <div className="v" style={{ color: 'var(--bad)' }}>
                      Not enough left. <Link className="link" to="/cart">Change it in the cart</Link>
                    </div>
                  )}
                </div>
                <span>{tk(l.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="promo">
            <label className="vh" htmlFor="promo">
              Promo code
            </label>
            <input className="input" id="promo" placeholder="Promo code" autoComplete="off" value={promo} onChange={(e) => setPromo(e.target.value)} />
            <button
              type="button"
              className="btn alt"
              onClick={() => setPromoMsg(promo.trim() ? `The code ${promo.trim().toUpperCase()} is not active. Check the spelling or the end date.` : '')}
            >
              Apply
            </button>
          </div>
          <div aria-live="polite">
            {promoMsg && (
              <span className="err" style={{ color: 'var(--bad)', fontSize: 14, display: 'flex', gap: 6 }}>
                <Icon name="alert" />
                {promoMsg}
              </span>
            )}
          </div>
          {q ? (
            <>
              <div className="sum-row">
                <span>Subtotal</span>
                <span>{tk(q.subtotal)}</span>
              </div>
              <div className="sum-row">
                <span>Delivery to {q.district}</span>
                <span>{q.deliveryFee ? tk(q.deliveryFee) : 'Free'}</span>
              </div>
              <div className="sum-row total">
                <span>Total</span>
                <span>{tk(q.total)}</span>
              </div>
            </>
          ) : quote.error ? (
            <p role="alert">{errorMessage(quote.error)}</p>
          ) : (
            <p className="muted">Pricing…</p>
          )}
          <button className="btn lg block" type="submit" disabled={placing || !q || !q.allInStock}>
            {placing ? 'Placing your order…' : total != null ? `Place order, ${tk(total)}` : 'Place order'}
          </button>
          <p className="muted" style={{ fontSize: 14 }}>
            {method === 'COD' ? 'Nothing is charged now. You pay when it arrives.' : 'You confirm the payment on the next screen.'}
          </p>
          <div className="trust">
            {q && (
              <div>
                <Icon name="truck" />
                <span>Arrives in {q.deliveryEstimate}</span>
              </div>
            )}
            <div>
              <Icon name="return" />
              <span>7-day returns on unopened items</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
