import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

/** The cart button; step 2.4 adds the live count. */
export function CartBadge() {
  return (
    <Link className="icon-btn" to="/cart" aria-label="Cart">
      <Icon name="cart" />
      <span className="badge">0</span>
    </Link>
  )
}
