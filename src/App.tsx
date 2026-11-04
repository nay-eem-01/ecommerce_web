import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { CartPage } from './features/cart/Bag'
import { CharactersPage } from './features/catalog/CharactersPage'
import { ListingPage } from './features/catalog/ListingPage'
import { NotFoundPage } from './features/errors/NotFoundPage'
import { HomePage } from './features/home/HomePage'
import { AppLayout, PageLoading } from './layout/AppLayout'

// Home and the listings load with the app (most visits start there); other pages are fetched when first opened.
// AppLayout's Suspense shows a spinner meanwhile.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const SearchPage = page(() => import('./features/search/SearchPage'), 'SearchPage')
const CheckoutPage = page(() => import('./features/checkout/CheckoutPage'), 'CheckoutPage')
const DonePage = page(() => import('./features/checkout/DonePage'), 'DonePage')
const PaymentResultPage = page(() => import('./features/checkout/PaymentResultPage'), 'PaymentResultPage')
const TrackPage = page(() => import('./features/orders/TrackPage'), 'TrackPage')
const OrderPage = page(() => import('./features/orders/OrderPage'), 'OrderPage')
const HelpPage = page(() => import('./features/site/HelpPage'), 'HelpPage')
const SignInPage = page(() => import('./features/auth/SignInPage'), 'SignInPage')
const AccountLayout = page(() => import('./features/account/AccountLayout'), 'AccountLayout')
const DetailsPage = page(() => import('./features/account/AccountPages'), 'DetailsPage')
const OrdersPage = page(() => import('./features/account/AccountPages'), 'OrdersPage')
const WishlistPage = page(() => import('./features/account/AccountPages'), 'WishlistPage')
const AddressesPage = page(() => import('./features/account/AccountPages'), 'AddressesPage')
const ProductPage = page(() => import('./features/product/ProductPage'), 'ProductPage')
// Staff area: its own chunks, never loaded by shoppers.
const AdminSignInPage = page(() => import('./features/admin/AdminSignInPage'), 'AdminSignInPage')
const ChangePasswordPage = page(() => import('./features/admin/ChangePasswordPage'), 'ChangePasswordPage')
const RequireAdmin = page(() => import('./features/admin/RequireAdmin'), 'RequireAdmin')
const AdminLayout = page(() => import('./features/admin/AdminLayout'), 'AdminLayout')
const DashboardPage = page(() => import('./features/admin/DashboardPage'), 'DashboardPage')
const AdminProductsPage = page(() => import('./features/admin/ProductsPage'), 'ProductsPage')
const ProductEditorPage = page(() => import('./features/admin/editor/ProductEditorPage'), 'ProductEditorPage')
const CatalogPage = page(() => import('./features/admin/CatalogPage'), 'CatalogPage')
const AdminOrdersPage = page(() => import('./features/admin/OrdersPage'), 'OrdersPage')
const AdminOrderPage = page(() => import('./features/admin/AdminOrderPage'), 'AdminOrderPage')

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<PageLoading />}><AdminRoutes /></Suspense>} />
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
            <Route path="/account" element={<OrdersPage />} />
            <Route path="/account/orders" element={<Navigate to="/account" replace />} />
            <Route path="/account/details" element={<DetailsPage />} />
            <Route path="/account/wishlist" element={<WishlistPage />} />
            <Route path="/account/addresses" element={<AddressesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="sign-in" element={<AdminSignInPage />} />
      <Route element={<RequireAdmin />}>
        <Route path="password" element={<ChangePasswordPage />} />
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<ProductEditorPage />} />
          <Route path="products/:id" element={<ProductEditorPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderNumber" element={<AdminOrderPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
