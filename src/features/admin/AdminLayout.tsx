import { Suspense } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PageLoading } from '../../layout/AppLayout'
import { useSession } from '../auth/session'

/** The staff frame: wordmark, the three admin areas and sign out. No shop header, footer or bag. */
export function AdminLayout() {
  const { user, signOut } = useSession()
  const navigate = useNavigate()
  return (
    <div className="app adm">
      <header className="adm-top">
        <Link className="mark" to="/admin">
          senpai<span>.</span>supply <span className="eyebrow">staff</span>
        </Link>
        <nav className="adm-nav" aria-label="Admin">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/catalog">Catalog</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/reviews">Reviews</NavLink>
        </nav>
        <span className="muted" style={{ fontSize: 13 }}>
          {user?.email}
        </span>
        <button
          type="button"
          className="tbtn"
          onClick={async () => {
            await signOut()
            navigate('/admin/sign-in', { replace: true })
          }}
        >
          Sign out
        </button>
      </header>
      <main id="main" className="adm-main" tabIndex={-1}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
