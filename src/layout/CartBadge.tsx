import { Link } from 'react-router-dom'
import { useCart } from '../features/cart/CartProvider'
import { Icon } from '../ui/Icon'

export function CartBadge() {
  const { count } = useCart()
  return (
    <Link className="icon-btn" to="/cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <Icon name="cart" />
      <span className="badge" aria-hidden="true">
        {count}
      </span>
    </Link>
  )
}
