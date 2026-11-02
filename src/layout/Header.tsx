import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCategories } from '../api/catalog'
import { firstName, useSession } from '../features/auth/session'
import { Icon } from '../ui/Icon'
import { useHighlightedCategory } from './highlight'
import { CartBadge } from './CartBadge'

/** Sticky header: wordmark, search, wishlist, account, cart; then the category row. */
export function Header() {
  const { status, user } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const urlQ = location.pathname === '/search' ? (params.get('q') ?? '') : null
  const [q, setQ] = useState(urlQ ?? '')
  // Keep the field in step with the search page's query (adjusting state while rendering, not in an effect).
  const [seenQ, setSeenQ] = useState(urlQ)
  if (urlQ !== seenQ) {
    setSeenQ(urlQ)
    if (urlQ !== null) setQ(urlQ)
  }
  const categories = useCategories()
  const highlighted = useHighlightedCategory()

  function submit(event: FormEvent) {
    event.preventDefault()
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const path = location.pathname
  const current = (to: string, slug?: string) =>
    path === to || (slug !== undefined && highlighted === slug) ? 'page' : undefined

  return (
    <header className="hdr">
      <div className="wrap">
        <div className="hdr-row">
          <Link className="mark" to="/">
            senpai<span>.</span>supply
          </Link>
          <form className="search" role="search" onSubmit={submit}>
            <Icon name="search" />
            <label className="vh" htmlFor="q">
              Search products
            </label>
            <input
              id="q"
              type="search"
              placeholder="Search figures, costumes, bottles, bags"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <div className="hdr-actions">
            <Link className="icon-btn" to="/account/wishlist" aria-label="Wishlist">
              <Icon name="heart" />
            </Link>
            <Link className="icon-btn" to={status === 'signed-in' ? '/account' : '/sign-in'}>
              <Icon name="user" />
              <span className="label-sm">{status === 'signed-in' ? firstName(user) : 'Sign in'}</span>
            </Link>
            <CartBadge />
          </div>
        </div>
        <nav className="cats" aria-label="Categories">
          <Link to="/shop" aria-current={current('/shop')}>
            All products
          </Link>
          {(categories.data ?? []).map((c) => (
            <Link key={c.slug} to={`/shop/${c.slug}`} aria-current={current(`/shop/${c.slug}`, c.slug)}>
              {c.name}
            </Link>
          ))}
          <Link to="/preorders" aria-current={current('/preorders')}>
            Pre-orders
          </Link>
        </nav>
      </div>
    </header>
  )
}
