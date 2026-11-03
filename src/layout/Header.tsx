import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCategories } from '../api/catalog'
import { useDeliveryOptions } from '../api/checkout'
import { useSession } from '../features/auth/session'
import { useBag } from '../features/cart/BagContext'
import { useCart } from '../features/cart/CartProvider'
import { tk } from '../lib/money'
import { Icon } from '../ui/icons'
import { useHighlightedCategory } from './highlight'
import { navItems } from './nav'

/**
 * Announcement bar and sticky header. Phone: menu, centred wordmark, search and bag, then a scrolling menu row.
 * Desktop: the menu on the left, wordmark in the middle, search, account and bag on the right.
 */
export function Header() {
  const { status } = useSession()
  const categories = useCategories()
  const delivery = useDeliveryOptions()
  const highlighted = useHighlightedCategory()
  const { pathname } = useLocation()
  const bag = useBag()
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = navItems(categories.data)
  const freeAt = delivery.data ? ` · Free delivery over ${tk(delivery.data.freeDeliveryThreshold)}` : ''

  const isOn = (to: string) =>
    pathname === to || (highlighted !== null && to === `/shop/${highlighted}`) ? 'on' : undefined
  const accountTo = status === 'signed-in' ? '/account' : '/sign-in'

  return (
    <>
      <div className="ann">
        Cash on delivery across Bangladesh{freeAt}
        <span className="d-only"> · 7-day returns</span>
      </div>
      <header className="hdr">
        <div className="hdr-wrap">
          <div className="hdr-row ph-only">
            <div className="hdr-left">
              <button className="ibtn" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
                <Icon name="menu" />
              </button>
            </div>
            <Link className="mark" to="/">
              senpai<span>.</span>supply
            </Link>
            <div className="hdr-right">
              <Link className="ibtn" to="/search" aria-label="Search">
                <Icon name="search" />
              </Link>
              <BagButton count={count} onOpen={bag.open} />
            </div>
          </div>
          <div className="d-hdr-row d-only" style={{ display: 'grid' }}>
            <nav className="d-nav" aria-label="Shop">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={isOn(item.to)}
                  style={isOn(item.to) ? { color: 'var(--text)', borderBottom: '2px solid var(--pink)', paddingBottom: 4 } : item.soon ? { color: 'var(--muted)' } : undefined}
                >
                  {item.label}
                  {item.soon && <span style={{ color: 'var(--cyan)', fontSize: 10, marginLeft: 4 }}>soon</span>}
                </NavLink>
              ))}
            </nav>
            <Link className="mark" to="/" style={{ fontSize: 26 }}>
              senpai<span>.</span>supply
            </Link>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <Link className="d-search" to="/search">
                <Icon name="search" small />
                Search bottles, bags, characters
              </Link>
              <Link className="ibtn" to={accountTo} aria-label={status === 'signed-in' ? 'Account' : 'Sign in'}>
                <Icon name="user" />
              </Link>
              <BagButton count={count} onOpen={bag.open} />
            </div>
          </div>
          <nav className="nav ph-only" aria-label="Shop">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={item.soon ? 'soon' : isOn(item.to)}>
                {item.label}
                {item.soon && <i>soon</i>}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      {menuOpen && <PhoneMenu items={items} accountTo={accountTo} signedIn={status === 'signed-in'} onClose={() => setMenuOpen(false)} />}
    </>
  )
}

function BagButton({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button className="ibtn" aria-label={`Bag, ${count} item${count === 1 ? '' : 's'}`} onClick={onOpen}>
      <Icon name="bag" />
      {count > 0 && (
        <span className="dot" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  )
}

function PhoneMenu({ items, accountTo, signedIn, onClose }: { items: ReturnType<typeof navItems>; accountTo: string; signedIn: boolean; onClose: () => void }) {
  return (
    <>
      <button className="scrim-fill" aria-label="Close menu" onClick={onClose} />
      <div className="drawer left" role="dialog" aria-label="Menu">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 8px 10px 16px', borderBottom: '1px solid var(--line)' }}>
          <span className="mark">
            senpai<span>.</span>supply
          </span>
          <button className="ibtn" aria-label="Close menu" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Menu" style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px' }}>
          {items.map((item) => (
            <Link key={item.to} to={item.to} onClick={onClose} className="display" style={{ fontSize: 24, padding: '10px 0', color: item.soon ? 'var(--muted)' : undefined }}>
              {item.label}
              {item.soon && <span className="eyebrow" style={{ color: 'var(--cyan)', marginLeft: 8 }}>soon</span>}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link className="btn ghost block" to={accountTo} onClick={onClose}>
            {signedIn ? 'My account' : 'Sign in'}
          </Link>
          <div style={{ display: 'flex', gap: 18, fontSize: 14, color: 'var(--text-2)' }}>
            <Link to="/track" onClick={onClose}>Track an order</Link>
            <Link to="/help" onClick={onClose}>Help</Link>
          </div>
        </div>
      </div>
    </>
  )
}
