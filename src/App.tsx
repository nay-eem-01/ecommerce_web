import { lazy, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { CharactersPage } from './features/catalog/CharactersPage'
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
const SignInPage = page(() => import('./features/auth/SignInPage'), 'SignInPage')
const AccountLayout = page(() => import('./features/account/AccountLayout'), 'AccountLayout')
const OverviewPage = page(() => import('./features/account/AccountPages'), 'OverviewPage')
const OrdersPage = page(() => import('./features/account/AccountPages'), 'OrdersPage')
const WishlistPage = page(() => import('./features/account/AccountPages'), 'WishlistPage')
const AddressesPage = page(() => import('./features/account/AccountPages'), 'AddressesPage')
const ProductPage = page(() => import('./features/product/ProductPage'), 'ProductPage')

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ListingPage mode="all" />} />
        <Route path="/shop/:category" element={<ListingPage mode="category" />} />
        <Route path="/preorders" element={<ListingPage mode="preorders" />} />
        <Route path="/sets" element={<ListingPage mode="sets" />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:character" element={<ListingPage mode="character" />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/p/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/done" element={<DonePage />} />
        <Route path="/checkout/result" element={<PaymentResultPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/orders/:orderNumber" element={<OrderPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AccountLayout />}>
            <Route path="/account" element={<OverviewPage />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/account/wishlist" element={<WishlistPage />} />
            <Route path="/account/addresses" element={<AddressesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
