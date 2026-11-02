import { lazy, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ListingPage } from './features/catalog/ListingPage'
import { NotFoundPage } from './features/errors/NotFoundPage'
import { HomePage } from './features/home/HomePage'
import { AppLayout } from './layout/AppLayout'

// Home and the listings load with the app (most visits start there); other pages are fetched when first opened.
// AppLayout's Suspense shows a spinner meanwhile.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const SearchPage = page(() => import('./features/search/SearchPage'), 'SearchPage')
const CartPage = page(() => import('./features/cart/CartPage'), 'CartPage')
const CheckoutPage = page(() => import('./features/checkout/CheckoutPage'), 'CheckoutPage')
const DonePage = page(() => import('./features/checkout/DonePage'), 'DonePage')
const PaymentResultPage = page(() => import('./features/checkout/PaymentResultPage'), 'PaymentResultPage')
const TrackPage = page(() => import('./features/orders/TrackPage'), 'TrackPage')
const OrderPage = page(() => import('./features/orders/OrderPage'), 'OrderPage')
const HelpPage = page(() => import('./features/site/HelpPage'), 'HelpPage')
const ProductPage = page(() => import('./features/product/ProductPage'), 'ProductPage')

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ListingPage />} />
        <Route path="/shop/:category" element={<ListingPage />} />
        <Route path="/preorders" element={<ListingPage preorders />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/p/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/done" element={<DonePage />} />
        <Route path="/checkout/result" element={<PaymentResultPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/orders/:orderNumber" element={<OrderPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
