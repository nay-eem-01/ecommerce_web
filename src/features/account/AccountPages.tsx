import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAddresses, useDeleteAddress, useSaveAddress, useUpdateMe } from '../../api/account'
import { fetchWishlist } from '../../api/cart'
import { useProducts } from '../../api/catalog'
import { useDeliveryOptions } from '../../api/checkout'
import { errorMessage } from '../../api/errors'
import { useMyOrders } from '../../api/orders'
import type { Address } from '../../api/types'
import { localDigits, phoneError } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/Icon'
import { useToast } from '../../ui/Toast'
import { useSession } from '../auth/session'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'
import { OrderCard } from './OrderCard'

export function OverviewPage() {
  useTitle('Your account')
  const { user, signOut } = useSession()
  const orders = useMyOrders()
  const picks = useProducts({ inStock: true, sort: 'newest', pageSize: 4 })
  const navigate = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  if (!user) return null
  const latest = orders.data?.content[0]

  return (
    <>
      <div className="panel acct-head">
        <span className="avatar" aria-hidden="true">
          {(user.name?.trim()[0] ?? '#').toUpperCase()}
        </span>
        <div>
          <h1 className="h3">{user.name || 'Your account'}</h1>
          <p className="muted">+88 {user.phone}</p>
          {user.email && <p className="muted">{user.email}</p>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn alt" type="button" onClick={() => setEditing((e) => !e)}>
            {user.name ? 'Edit details' : 'Add your name'}
          </button>
          <button
            className="btn alt"
            type="button"
            onClick={async () => {
              await signOut()
              navigate('/')
              toast('Signed out')
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {editing && <DetailsForm onDone={() => setEditing(false)} />}
      <div className="sec-head">
        <h2 className="h3">Latest order</h2>
        <Link className="link" to="/account/orders">
          All orders
        </Link>
      </div>
      {orders.isPending ? (
        <p className="muted">Loading…</p>
      ) : latest ? (
        <OrderCard order={latest} />
      ) : (
        <div className="empty panel">
          <h2 className="h3">No orders yet</h2>
          <p className="muted">Your orders appear here, with tracking.</p>
          <Link className="btn" to="/shop">
            Browse products
          </Link>
        </div>
      )}
      <div className="sec-head" style={{ marginTop: 40 }}>
        <h2 className="h3">Picked for you</h2>
      </div>
      {picks.data ? (
        <div className="grid">
          {picks.data.content.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <CardSkeletons />
      )}
    </>
  )
}

function DetailsForm({ onDone }: { onDone: () => void }) {
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
          onDone()
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <form className="panel" style={{ padding: 24, display: 'grid', gap: 18, marginBottom: 24 }} onSubmit={submit} noValidate>
      <div className="fields">
        <div className="field">
          <label htmlFor="me-name">Your name</label>
          <input className="input" id="me-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="me-email">
            Email for receipts<span className="opt-l"> (optional)</span>
          </label>
          <input className="input" id="me-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      {error && <FormError message={error} />}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn" type="submit" disabled={update.isPending}>
          Save
        </button>
        <button className="btn alt" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export function OrdersPage() {
  useTitle('My orders')
  const orders = useMyOrders()
  return (
    <>
      <h1 className="page-title" style={{ paddingTop: 0 }}>
        My orders
      </h1>
      {orders.isPending ? (
        <p className="muted">Loading…</p>
      ) : orders.error ? (
        <p role="alert">{errorMessage(orders.error)}</p>
      ) : orders.data.content.length ? (
        orders.data.content.map((o) => <OrderCard key={o.orderNumber} order={o} />)
      ) : (
        <div className="empty panel">
          <h2 className="h3">No orders yet</h2>
          <p className="muted">When you order, it shows here with tracking. Ordered as a guest? Track it with the order number.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn" to="/shop">
              Browse products
            </Link>
            <Link className="btn alt" to="/track">
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
      <h1 className="page-title" style={{ paddingTop: 0 }}>
        Wishlist
      </h1>
      {wishlist.isPending ? (
        <CardSkeletons />
      ) : wishlist.error ? (
        <p role="alert">{errorMessage(wishlist.error)}</p>
      ) : wishlist.data.length ? (
        <div className="grid">
          {wishlist.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty panel">
          <h2 className="h3">Nothing saved yet</h2>
          <p className="muted">Tap the heart on any product to keep it here.</p>
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
      <div className="sec-head">
        <h1 className="page-title" style={{ padding: 0 }}>
          Addresses
        </h1>
        {editing === null && (
          <button className="btn alt" type="button" onClick={() => setEditing('new')}>
            Add an address
          </button>
        )}
      </div>
      {editing && (
        <AddressForm
          address={editing === 'new' ? null : editing}
          defaults={{ fullName: user?.name ?? '', phone: user?.phone ?? '' }}
          first={!addresses.data?.length}
          onDone={() => setEditing(null)}
        />
      )}
      {addresses.isPending ? (
        <p className="muted">Loading…</p>
      ) : addresses.data?.length ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {addresses.data.map((a) => (
            <div className="panel addr" key={a.id}>
              <strong>
                {a.fullName} {a.defaultAddress && <span className="pill ok" style={{ marginLeft: 8 }}>Default</span>}
              </strong>
              <span>{a.addressLine}</span>
              <span>
                {a.area}, {a.district}
              </span>
              <span className="muted">+88 {a.phone}</span>
              <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                <button className="link" type="button" onClick={() => setEditing(a)}>
                  Edit
                </button>
                <button
                  className="link"
                  type="button"
                  onClick={() => remove.mutate(a.id, { onSuccess: () => toast('Address removed'), onError: (e) => toast(errorMessage(e)) })}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !editing && (
          <div className="empty panel">
            <h2 className="h3">No saved address</h2>
            <p className="muted">Your address is saved the first time you check out, or add one now.</p>
          </div>
        )
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
    <form className="panel co-step" style={{ marginBottom: 24 }} onSubmit={submit} noValidate>
      <h2 className="h3">{address ? 'Edit address' : 'New address'}</h2>
      <div className="fields">
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
        <div className="field full">
          <label htmlFor="ad-line">House, road and flat</label>
          <textarea className="input" id="ad-line" value={form.addressLine} placeholder="House 12, Road 5, Flat 3B" onChange={(e) => set('addressLine', e.target.value)} />
        </div>
        <label className="check field full">
          <input type="checkbox" checked={form.defaultAddress} onChange={(e) => set('defaultAddress', e.target.checked)} />
          Use this address at checkout
        </label>
      </div>
      {error && <FormError message={error} />}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn" type="submit" disabled={save.isPending}>
          Save address
        </button>
        <button className="btn alt" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function FormError({ message }: { message: string }) {
  return (
    <p className="err" role="alert" style={{ color: 'var(--bad)', display: 'flex', gap: 6, alignItems: 'center' }}>
      <Icon name="alert" />
      {message}
    </p>
  )
}
