import { Link } from 'react-router-dom'
import { useCategories } from '../api/catalog'

/** Phone: the wordmark, Shop and Help, and the fine print. Desktop adds an Account column. */
export function Footer() {
  const categories = useCategories()
  const shop = (categories.data ?? []).filter((c) => !c.comingSoon)
  return (
    <footer className="ftr" style={{ marginTop: 'auto' }}>
      <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24 }}>
        <div>
          <Link className="mark" to="/" style={{ fontSize: 22 }}>
            senpai<span>.</span>supply
          </Link>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, maxWidth: '30ch' }}>
            Original characters, designed in Dhaka. Prices include VAT.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            {shop.map((c) => (
              <li key={c.slug}>
                <Link to={`/shop/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
            <li><Link to="/sets">Sets</Link></li>
            <li><Link to="/characters">Characters</Link></li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/help#delivery">Delivery charges</Link></li>
            <li><Link to="/help#cod">Cash on delivery</Link></li>
            <li><Link to="/help#returns">Returns in 7 days</Link></li>
            <li><Link to="/track">Track an order</Link></li>
          </ul>
        </div>
        <div className="d-only">
          <h4>Account</h4>
          <ul>
            <li><Link to="/sign-in">Sign in</Link></li>
            <li><Link to="/account/orders">My orders</Link></li>
            <li><Link to="/account/wishlist">Wishlist</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
