import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAddresses, useDeleteAddress, useSaveAddress, useUpdateMe } from '../../api/account'
import { fetchWishlist } from '../../api/cart'
import { useDeliveryOptions } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import { useMyOrders } from '../../api/orders'
import type { Address } from '../../api/types'
import { localDigits, phoneError } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useSession } from '../auth/session'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'
import { OrderCard } from './OrderCard'

/** Your name and receipt email; the number is how you sign in, so it is shown, not edited. */
export function DetailsPage() {
  useTitle('Your details')
  return (
    <>
      <h1 className="display acct-h1">Your details</h1>
      <DetailsForm />
    </>
  )
}

function DetailsForm() {
  const { user, updateUser } = useSession()
  const update = useUpdateMe()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Use 2 to 80 characters for your name.')
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter a valid email.')
    setError('')
    update.mutate(
      { name: name.trim(), email: email.trim() || undefined },
      {
        onSuccess: (me) => {
          updateUser(me)
          toast('Details saved')
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <form className="panel acct-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="me-name">Your name</label>
        <input className="input" id="me-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="me-email">
          Email for receipts<span style={{ fontWeight: 400, color: 'var(--muted)' }}> (optional)</span>
        </label>
        <input className="input" id="me-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Mobile number</span>
        <p style={{ minHeight: 50, display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>+88 {user?.phone} · used to sign in</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button className="btn" type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save details'}
        </button>
      </div>
      {error && (
        <div style={{ gridColumn: '1 / -1' }}>
          <FormError message={error} />
        </div>
      )}
    </form>
  )
}

export function OrdersPage() {
  useTitle('My orders')
  const orders = useMyOrders()
  return (
    <>
      <h1 className="display acct-h1">My orders</h1>
      {orders.isPending ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : orders.error ? (
        <p role="alert">{errorMessage(orders.error)}</p>
      ) : orders.data.content.length ? (
        <div className="acct-list">
          {orders.data.content.map((o) => (
            <OrderCard key={o.orderNumber} order={o} />
          ))}
        </div>
      ) : (
        <div className="empty panel acct-empty">
          <h2 className="display" style={{ fontSize: 20 }}>No orders yet</h2>
          <p style={{ color: 'var(--text-2)' }}>When you order, it shows here with tracking. Ordered as a guest? Track it with the order number.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn" to="/shop">
              Browse products
            </Link>
            <Link className="btn ghost" to="/track">
              Track a guest order
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export function WishlistPage() {
  useTitle('Wishlist')
  const wishlist = useQuery({ queryKey: ['wishlist', 'list'], queryFn: fetchWishlist })
  return (
    <>
      <h1 className="display acct-h1">Wishlist</h1>
      {wishlist.isPending ? (
        <CardSkeletons />
      ) : wishlist.error ? (
        <p role="alert">{errorMessage(wishlist.error)}</p>
      ) : wishlist.data.length ? (
        <div className="pgrid acct-wish">
          {wishlist.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty panel acct-empty">
          <h2 className="display" style={{ fontSize: 20 }}>Nothing saved yet</h2>
          <p style={{ color: 'var(--text-2)' }}>Tap the heart on any product to keep it here.</p>
          <Link className="btn" to="/shop">
            Browse products
          </Link>
        </div>
      )}
    </>
  )
}

export function AddressesPage() {
  useTitle('Addresses')
  const addresses = useAddresses()
  const remove = useDeleteAddress()
  const toast = useToast()
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const { user } = useSession()

  return (
    <>
      <h1 className="display acct-h1">Addresses</h1>
      {editing && (
        <AddressForm
          address={editing === 'new' ? null : editing}
          defaults={{ fullName: user?.name ?? '', phone: user?.phone ?? '' }}
          first={!addresses.data?.length}
          onDone={() => setEditing(null)}
        />
      )}
      {addresses.isPending ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <div className="acct-addrs">
          {(addresses.data ?? []).map((a) => (
            <div className="panel acct-addr" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b>{a.fullName}</b>
                {a.defaultAddress && (
                  <span className="tag" style={{ color: 'var(--ok)' }}>
                    Default
                  </span>
                )}
              </div>
              <span>{a.addressLine}</span>
              <span>
                {a.area}, {a.district}
              </span>
              <span className="meta">+88 {a.phone}</span>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 14 }}>
                <button className="link" type="button" style={{ border: 0, background: 'transparent', padding: 0 }} onClick={() => setEditing(a)}>
                  Edit
                </button>
                <button
                  className="link"
                  type="button"
                  style={{ border: 0, background: 'transparent', padding: 0 }}
                  onClick={() => remove.mutate(a.id, { onSuccess: () => toast('Address removed'), onError: (e) => toast(errorMessage(e)) })}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!addresses.data?.length && !editing && (
            <p style={{ color: 'var(--text-2)' }}>Your address is saved the first time you check out, or add one now.</p>
          )}
          {editing === null && (
            <button className="btn ghost block acct-add" type="button" onClick={() => setEditing('new')}>
              + Add an address
            </button>
          )}
        </div>
      )}
    </>
  )
}

interface AddressFormProps {
  address: Address | null
  defaults: { fullName: string; phone: string }
  first: boolean
  onDone: () => void
}

function AddressForm({ address, defaults, first, onDone }: AddressFormProps) {
  const delivery = useDeliveryOptions()
  const save = useSaveAddress()
  const toast = useToast()
  const [form, setForm] = useState({
    fullName: address?.fullName ?? defaults.fullName,
    phone: address?.phone ?? defaults.phone,
    district: address?.district ?? 'Dhaka',
    area: address?.area ?? '',
    addressLine: address?.addressLine ?? '',
    defaultAddress: address?.defaultAddress ?? first,
  })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem =
      (form.fullName.trim().length < 2 && 'Enter the name the rider should ask for.') ||
      phoneError(form.phone) ||
      (!form.area.trim() && 'Enter your area or thana.') ||
      (form.addressLine.trim().length < 5 && 'Add a house and road number so the rider can find you.') ||
      ''
    if (problem) return setError(problem)
    setError('')
    save.mutate(
      {
        id: address?.id,
        body: { ...form, fullName: form.fullName.trim(), phone: localDigits(form.phone), area: form.area.trim(), addressLine: form.addressLine.trim() },
      },
      {
        onSuccess: () => {
          toast(address ? 'Address updated' : 'Address saved')
          onDone()
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <form className="panel acct-form" style={{ marginBottom: 16 }} onSubmit={submit} noValidate>
      <h2 className="display" style={{ fontSize: 20, gridColumn: '1 / -1' }}>{address ? 'Edit address' : 'New address'}</h2>
      <>
        <div className="field">
          <label htmlFor="ad-name">Full name</label>
          <input className="input" id="ad-name" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ad-phone">Mobile number</label>
          <div className="prefix">
            <span>+88</span>
            <input className="input" id="ad-phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ad-district">District</label>
          <select className="input" id="ad-district" value={form.district} onChange={(e) => set('district', e.target.value)}>
            {(delivery.data?.districts ?? [form.district]).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ad-area">Area or thana</label>
          <input className="input" id="ad-area" value={form.area} placeholder="e.g. Dhanmondi" onChange={(e) => set('area', e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="ad-line">House, road and flat</label>
          <textarea className="input co-textarea" id="ad-line" value={form.addressLine} placeholder="House 12, Road 5, Flat 3B" onChange={(e) => set('addressLine', e.target.value)} />
        </div>
        <label className="check-row" style={{ gridColumn: '1 / -1' }}>
          <input type="checkbox" checked={form.defaultAddress} onChange={(e) => set('defaultAddress', e.target.checked)} />
          Use this address at checkout
        </label>
      </>
      {error && (
        <div style={{ gridColumn: '1 / -1' }}>
          <FormError message={error} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, gridColumn: '1 / -1' }}>
        <button className="btn" type="submit" disabled={save.isPending}>
          Save address
        </button>
        <button className="btn ghost" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <p className="co-err" role="alert" style={{ fontSize: 13 }}>
      <Icon name="alert" small />
      {message}
    </p>
  )
}
