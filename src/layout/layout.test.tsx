import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { envelope, mockApi } from '../test/api'
import { categories, deliveryOptions, tokens } from '../test/fixtures'
import { renderWithProviders, storeSession } from '../test/render'
import { AppLayout } from './AppLayout'
import { navItems } from './nav'

function renderShell(path = '/') {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="*" element={<p>page</p>} />
      </Route>
    </Routes>,
    path,
  )
}

const shopApi = () =>
  mockApi({
    'GET /api/categories': () => envelope(200, categories),
    'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
  })

describe('store menu', () => {
  it('lists New, the categories on sale, Characters, Sets, then what is coming soon', () => {
    expect(navItems(categories)).toEqual([
      { to: '/shop', label: 'New' },
      { to: '/shop/figures', label: 'Figures' },
      { to: '/shop/costumes', label: 'Costumes' },
      { to: '/shop/bottles', label: 'Bottles' },
      { to: '/shop/bags', label: 'Bags' },
      { to: '/characters', label: 'Characters' },
      { to: '/sets', label: 'Sets' },
      { to: '/shop/apparel', label: 'Apparel', soon: true },
    ])
  })
})

describe('app shell', () => {
  it('marks the current category and shows apparel as coming soon', async () => {
    shopApi()
    renderShell('/shop/bottles')
    const navs = await screen.findAllByRole('navigation', { name: 'Shop' })
    const phone = within(navs[navs.length - 1])
    expect(await phone.findByRole('link', { name: 'Bottles' })).toHaveClass('on')
    expect(phone.getByRole('link', { name: /Apparel\s*soon/ })).toHaveAttribute('href', '/shop/apparel')
  })

  it('announces cash on delivery and the free-delivery threshold', async () => {
    shopApi()
    renderShell()
    expect(await screen.findByText(/Free delivery over ৳ 3,000/)).toBeInTheDocument()
  })

  it('opens the phone menu with the shop links and sign-in', async () => {
    shopApi()
    renderShell()
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const menu = screen.getByRole('dialog', { name: 'Menu' })
    expect(await within(menu).findByRole('link', { name: 'Bags' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
    await userEvent.click(within(menu).getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('links the account icon to the account once signed in', async () => {
    storeSession()
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
    })
    renderShell()
    expect(await screen.findByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account')
  })
})
