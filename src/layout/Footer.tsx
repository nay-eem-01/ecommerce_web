import { Link } from 'react-router-dom'
import { useCategories } from '../api/catalog'

export function Footer() {
  const categories = useCategories()
  return (
    <footer className="ftr">
      <div className="wrap ftr-in">
        <div>
          <Link className="mark" to="/">
            senpai<span>.</span>supply
          </Link>
          <p className="fine">Anime figures, cosplay, bottles and bags, delivered across Bangladesh. Cash on delivery.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            {(categories.data ?? []).map((c) => (
              <li key={c.slug}>
                <Link to={`/shop/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><Link to="/help#delivery">Delivery charges</Link></li>
            <li><Link to="/help#cod">Cash on delivery</Link></li>
            <li><Link to="/help#returns">Returns in 7 days</Link></li>
            <li><Link to="/track">Track an order</Link></li>
          </ul>
        </div>
        <div>
          <h3>Account</h3>
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
