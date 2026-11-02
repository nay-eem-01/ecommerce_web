import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { useAddresses } from '../../api/account'
import { fetchWishlist } from '../../api/cart'
import { useMyOrders } from '../../api/orders'

/** The account's side navigation with counts, as in the prototype. */
export function AccountLayout() {
  const orders = useMyOrders()
  const wishlist = useQuery({ queryKey: ['wishlist', 'list'], queryFn: fetchWishlist })
  const addresses = useAddresses()
  const links: Array<[to: string, label: string, count: number | undefined]> = [
    ['/account', 'Overview', undefined],
    ['/account/orders', 'My orders', orders.data?.totalElements],
    ['/account/wishlist', 'Wishlist', wishlist.data?.length],
    ['/account/addresses', 'Addresses', addresses.data?.length],
  ]
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="acct">
        <nav className="acct-nav" aria-label="Account">
          {links.map(([to, label, count]) => (
            <NavLink key={to} to={to} end>
              {label}
              {count !== undefined && <span className="n">{count}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
