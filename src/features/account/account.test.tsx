import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { deliveryOptions, summary, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { RequireAuth } from '../auth/RequireAuth'
import { SignInPage, safeBack } from '../auth/SignInPage'
import { AccountLayout } from './AccountLayout'
import { AddressesPage, DetailsPage, OrdersPage, WishlistPage } from './AccountPages'
import { CodeBoxes } from '../auth/CodeBoxes'
import { useState } from 'react'
import type { OrderSummary } from '../../api/types'

const emptyPage = { content: [], pageNo: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }

const routes = (
  <Routes>
    <Route path="/sign-in" element={<SignInPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<AccountLayout />}>
        <Route path="/account" element={<OrdersPage />} />
        <Route path="/account/details" element={<DetailsPage />} />
        <Route path="/account/wishlist" element={<WishlistPage />} />
        <Route path="/account/addresses" element={<AddressesPage />} />
      </Route>
    </Route>
  </Routes>
)

const memberRoutes = {
  'POST /api/auth/refresh-token': () => envelope(200, tokens),
  'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
  'GET /api/wishlist/ids': () => envelope(200, [7]),
  'GET /api/wishlist': () => envelope(200, [summary()]),
  'GET /api/users/me/addresses': () => envelope(200, []),
  'GET /api/products': () => envelope(200, { ...emptyPage, content: [summary()] }),
  'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
}

describe('sign in', () => {
  it('only follows same-site paths after sign-in', () => {
    expect(safeBack('/checkout')).toBe('/checkout')
    expect(safeBack('//evil.example')).toBe('/account')
    expect(safeBack('https://evil.example')).toBe('/account')
    expect(safeBack(null)).toBe('/account')
  })

  it('checks the number, texts a code, signs in when 6 digits are typed and merges the browser cart', async () => {
    localStorage.setItem('senpai.cart', JSON.stringify([{ productId: 7, optionId: null, quantity: 2 }]))
    localStorage.setItem('senpai.wishlist', JSON.stringify([9]))
    const fetchMock = mockApi({
      ...memberRoutes,
      'POST /api/auth/otp/request': () => envelope(200, { expiresInSeconds: 300, resendAfterSeconds: 60 }),
      'POST /api/auth/otp/verify': () => envelope(200, tokens),
      'POST /api/cart/merge': () => envelope(200, { items: [], itemCount: 2, subtotal: 2900 }),
      'PUT /api/wishlist/9': () => envelope(200, null),
      'GET /api/orders/me': () => envelope(200, emptyPage),
    })
    renderWithProviders(routes, '/sign-in?back=/account/wishlist')
    await userEvent.type(screen.getByLabelText('Mobile number'), '0171234567')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(screen.getByText('Use an 11-digit number starting with 01.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Mobile number'), '8')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText('+88 01712345678')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send a new code in \d+ s/ })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Digit 1'), '123456')
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/account/wishlist'))
    const verify = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/otp/verify'))
    expect(bodyOf(verify?.[1])).toMatchObject({ phone: '01712345678', code: '123456' })
    const merge = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/cart/merge'))
    expect(bodyOf(merge?.[1])).toEqual({ items: [{ productId: 7, optionId: null, quantity: 2 }] })
    expect(localStorage.getItem('senpai.cart')).toBeNull()
    expect(localStorage.getItem('senpai.refreshToken')).toBe('refresh-2')
  })

  it('shows the backend’s message for a wrong code and clears the field', async () => {
    mockApi({
      'POST /api/auth/otp/request': () => envelope(200, { expiresInSeconds: 300, resendAfterSeconds: 0 }),
      'POST /api/auth/otp/verify': () => envelope(400, null, 'That code is not right. 4 tries left.'),
    })
    renderWithProviders(routes, '/sign-in')
    await userEvent.type(screen.getByLabelText('Mobile number'), '01712345678')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await userEvent.type(await screen.findByLabelText('Digit 1'), '000000')
    expect(await screen.findByText('That code is not right. 4 tries left.')).toBeInTheDocument()
    expect(screen.getByLabelText('Digit 1')).toHaveValue('')
    expect(screen.getByLabelText('Digit 6')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
  })

  it('offers guest checkout when sign-in came from checkout', () => {
    mockApi({})
    renderWithProviders(routes, '/sign-in?back=/checkout')
    expect(screen.getByRole('link', { name: 'Continue to checkout as a guest' })).toHaveAttribute('href', '/checkout')
  })
})

describe('account', () => {
  it('sends guests to sign in and back', async () => {
    mockApi({})
    renderWithProviders(routes, '/account/wishlist')
    expect(await screen.findByTestId('path')).toHaveTextContent('/sign-in?back=%2Faccount%2Fwishlist')
  })

  it('opens on the orders with the profile, counts and an empty history', async () => {
    storeSession()
    mockApi({ ...memberRoutes, 'GET /api/orders/me': () => envelope(200, emptyPage) })
    renderWithProviders(routes, '/account')
    expect(await screen.findByText('Nayeem Ahmed')).toBeInTheDocument()
    expect(screen.getByText('+88 01712345678')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'My orders' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'No orders yet' })).toBeInTheDocument()
    const nav = await screen.findByRole('navigation', { name: 'Account' })
    await waitFor(() => expect(nav.querySelector('a[href="/account/wishlist"]')).toHaveTextContent('Wishlist1'))
    expect(nav.querySelector('a[href="/account"]')).toHaveAttribute('aria-current', 'page')
  })

  it('shows an open order with its progress and a delivered one with buy again and review', async () => {
    storeSession()
    const item = { productId: 7, optionId: null, slug: 'sakura-bottle', name: 'Sakura steel bottle, 750 ml', optionLabel: null, unitPrice: 1450, quantity: 1, lineTotal: 1450, preorder: false, depositPerUnit: null, thumbnailUrl: null }
    const open: OrderSummary = { orderNumber: 'SS-OPEN0001', status: 'SHIPPED', placedAt: '2026-11-03T08:00:00Z', total: 1520, paymentMethod: 'COD', itemCount: 1, items: [item] }
    const done: OrderSummary = { ...open, orderNumber: 'SS-DONE0001', status: 'DELIVERED', paymentMethod: 'BKASH' }
    mockApi({ ...memberRoutes, 'GET /api/orders/me': () => envelope(200, { ...emptyPage, content: [open, done], totalElements: 2 }) })
    renderWithProviders(routes, '/account')
    const openCard = await screen.findByRole('article', { name: 'Order SS-OPEN0001, With rider' })
    expect(openCard).toHaveTextContent('On the way')
    expect(openCard.querySelector('.bar4 .now')).toHaveTextContent('With rider')
    expect(openCard).toHaveTextContent('Have ready')
    const doneCard = screen.getByRole('article', { name: 'Order SS-DONE0001, Delivered' })
    expect(doneCard.querySelector('a[href="/p/sakura-bottle#reviews"]')).toHaveTextContent('Write a review')
    await userEvent.click(screen.getByRole('button', { name: 'Buy again' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('senpai.cart') ?? 'null') ?? []).toBeDefined())
  })

  it('saves your name and email on the details page', async () => {
    storeSession()
    const fetchMock = mockApi({
      ...memberRoutes,
      'GET /api/orders/me': () => envelope(200, emptyPage),
      'PUT /api/users/me': (_u, init) => envelope(200, { ...tokens.user, ...(bodyOf(init) as object) }),
    })
    renderWithProviders(routes, '/account/details')
    const name = await screen.findByLabelText('Your name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Nayeem A.')
    await userEvent.type(screen.getByLabelText(/Email for receipts/), 'n@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }))
    expect(await screen.findByText('Details saved')).toBeInTheDocument()
    expect(bodyOf(fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/api/users/me') && i?.method === 'PUT')?.[1])).toEqual({ name: 'Nayeem A.', email: 'n@example.com' })
    expect(screen.getByText('+88 01712345678 · used to sign in')).toBeInTheDocument()
  })

  it('lists saved products in the wishlist', async () => {
    storeSession()
    mockApi({ ...memberRoutes, 'GET /api/orders/me': () => envelope(200, emptyPage) })
    renderWithProviders(routes, '/account/wishlist')
    expect((await screen.findAllByRole('link', { name: 'Sakura steel bottle, 750 ml' })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Save Sakura/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds an address and validates it first', async () => {
    storeSession()
    let saved = false
    mockApi({
      ...memberRoutes,
      'GET /api/orders/me': () => envelope(200, emptyPage),
      'GET /api/users/me/addresses': () =>
        envelope(200, saved ? [{ id: 1, fullName: 'Nayeem Ahmed', phone: '01712345678', district: 'Dhaka', area: 'Mirpur', addressLine: 'House 9, Road 1', defaultAddress: true }] : []),
      'POST /api/users/me/addresses': (_u, init) => {
        expect(bodyOf(init)).toMatchObject({ fullName: 'Nayeem Ahmed', phone: '01712345678', area: 'Mirpur', defaultAddress: true })
        saved = true
        return envelope(201, {})
      },
    })
    renderWithProviders(routes, '/account/addresses')
    await userEvent.click(await screen.findByRole('button', { name: '+ Add an address' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your area or thana.')
    await userEvent.type(screen.getByLabelText('Area or thana'), 'Mirpur')
    await userEvent.type(screen.getByLabelText('House, road and flat'), 'House 9, Road 1')
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }))
    expect(await screen.findByText('Default')).toBeInTheDocument()
  })
})

describe('code boxes', () => {
  function Harness() {
    const [v, setV] = useState('')
    return (
      <>
        <CodeBoxes value={v} onChange={setV} />
        <output data-testid="code">{v}</output>
      </>
    )
  }

  it('moves forward as you type, back on Backspace, and fills every box from a paste', async () => {
    renderWithProviders(<Harness />)
    await userEvent.click(screen.getByLabelText('Digit 1'))
    await userEvent.keyboard('48')
    expect(screen.getByTestId('code')).toHaveTextContent('48')
    expect(screen.getByLabelText('Digit 3')).toHaveFocus()
    await userEvent.keyboard('{Backspace}')
    expect(screen.getByTestId('code')).toHaveTextContent(/^4$/)
    expect(screen.getByLabelText('Digit 2')).toHaveFocus()
    await userEvent.click(screen.getByLabelText('Digit 5'))
    expect(screen.getByLabelText('Digit 2')).toHaveFocus()
    await userEvent.paste('82-1 93')
    expect(screen.getByTestId('code')).toHaveTextContent('482193')
    expect(screen.getByLabelText('Digit 6')).toHaveValue('3')
  })
})
