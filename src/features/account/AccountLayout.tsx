import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAddresses } from '../../api/account'
import { fetchWishlist } from '../../api/cart'
import { useMyOrders } from '../../api/orders'
import { useToast } from '../../ui/Toast'
import { useSession } from '../auth/session'

/**
 * The account frame. Phone: avatar, name and number with Sign out, then tabs. Desktop: the same head over a side
 * navigation with counts, the page on the right.
 */
export function AccountLayout() {
  const { user, signOut } = useSession()
  const orders = useMyOrders()
  const wishlist = useQuery({ queryKey: ['wishlist', 'list'], queryFn: fetchWishlist })
  const addresses = useAddresses()
  const navigate = useNavigate()
  const toast = useToast()
  const links: Array<[to: string, label: string, count: number | undefined]> = [
    ['/account', 'Orders', orders.data?.totalElements],
    ['/account/wishlist', 'Wishlist', wishlist.data?.length],
    ['/account/addresses', 'Addresses', addresses.data?.length],
    ['/account/details', 'Details', undefined],
  ]
  const out = async () => {
    await signOut()
    navigate('/')
    toast('Signed out')
  }
  if (!user) return null

  return (
    <div className="page acct">
      <aside className="acct-side">
        <div className="acct-head">
          <span className="acct-avatar" aria-hidden="true">
            {(user.name?.trim()[0] ?? '#').toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="display acct-name">{user.name || 'Your account'}</p>
            <p className="meta">+88 {user.phone}</p>
          </div>
          <button className="tbtn ph-only" type="button" onClick={out}>
            Sign out
          </button>
        </div>
        <nav className="acct-nav" aria-label="Account">
          {links.map(([to, label, count]) => (
            <NavLink key={to} to={to} end>
              {label}
              {count !== undefined && <span className="n">{count}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="ulink d-only" type="button" style={{ alignSelf: 'flex-start', border: 0, borderBottom: '1px solid currentColor', background: 'transparent' }} onClick={out}>
          Sign out
        </button>
      </aside>
      <div className="acct-main">
        <Outlet />
      </div>
    </div>
  )
}
