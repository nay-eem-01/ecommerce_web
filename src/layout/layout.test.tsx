import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { envelope, mockApi } from '../test/api'
import { categories, tokens } from '../test/fixtures'
import { renderWithProviders, storeSession } from '../test/render'
import { AppLayout } from './AppLayout'

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

describe('app shell', () => {
  it('lists the categories from the API and marks the current one', async () => {
    mockApi({ 'GET /api/categories': () => envelope(200, categories) })
    renderShell('/shop/figures')
    const nav = within(await screen.findByRole('navigation', { name: 'Categories' }))
    expect(await nav.findByRole('link', { name: 'Figures' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Pre-orders' })).not.toHaveAttribute('aria-current')
  })

  it('sends the header search to the search page', async () => {
    mockApi({ 'GET /api/categories': () => envelope(200, categories) })
    renderShell()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'wig{Enter}')
    expect(screen.getByTestId('path')).toHaveTextContent('/search?q=wig')
  })

  it('shows the shopper’s first name once a stored session is restored', async () => {
    storeSession()
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
    })
    renderShell()
    expect(await screen.findByRole('link', { name: 'Nayeem' })).toHaveAttribute('href', '/account')
  })

  it('offers sign-in to a guest', async () => {
    mockApi({ 'GET /api/categories': () => envelope(200, categories) })
    renderShell()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })
})
