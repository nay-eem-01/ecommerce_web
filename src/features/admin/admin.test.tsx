import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { AdminLayout } from './AdminLayout'
import { AdminSignInPage, adminBack } from './AdminSignInPage'
import { ChangePasswordPage } from './ChangePasswordPage'
import { adminTokens } from './fixtures'
import { RequireAdmin } from './RequireAdmin'

const routes = (
  <Routes>
    <Route path="/admin/sign-in" element={<AdminSignInPage />} />
    <Route element={<RequireAdmin />}>
      <Route path="/admin/password" element={<ChangePasswordPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<p>dashboard here</p>} />
      </Route>
    </Route>
  </Routes>
)

/** Shop routes a signed-in session touches on start (cart and wishlist load for any member). */
const memberRoutes = {
  'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
  'GET /api/wishlist/ids': () => envelope(200, []),
}

describe('admin access', () => {
  it('keeps the back link inside the admin area', () => {
    expect(adminBack('/admin/orders?status=PLACED')).toBe('/admin/orders?status=PLACED')
    expect(adminBack('/account')).toBe('/admin')
    expect(adminBack('//evil.example/admin')).toBe('/admin')
    expect(adminBack('/admin/sign-in')).toBe('/admin')
    expect(adminBack(null)).toBe('/admin')
  })

  it('sends a guest to staff sign-in', async () => {
    mockApi({})
    renderWithProviders(routes, '/admin')
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/sign-in?back=%2Fadmin')
    expect(screen.queryByText('dashboard here')).not.toBeInTheDocument()
  })

  it('tells a signed-in shopper the account has no staff access', async () => {
    storeSession()
    mockApi({ ...memberRoutes, 'POST /api/auth/refresh-token': () => envelope(200, tokens) })
    renderWithProviders(routes, '/admin')
    expect(await screen.findByRole('alert')).toHaveTextContent('This account has no staff access')
    expect(screen.queryByText('dashboard here')).not.toBeInTheDocument()
  })

  it('holds an admin with a temporary password on the password screen', async () => {
    storeSession()
    const temp = { ...adminTokens, user: { ...adminTokens.user!, mustChangePassword: true } }
    mockApi({ ...memberRoutes, 'POST /api/auth/refresh-token': () => envelope(200, temp) })
    renderWithProviders(routes, '/admin')
    expect(await screen.findByRole('heading', { name: 'Set a new password' })).toBeInTheDocument()
    expect(screen.queryByText('dashboard here')).not.toBeInTheDocument()
  })

  it('lets an admin in, with the admin navigation', async () => {
    storeSession()
    mockApi({ ...memberRoutes, 'POST /api/auth/refresh-token': () => envelope(200, adminTokens) })
    renderWithProviders(routes, '/admin')
    expect(await screen.findByText('dashboard here')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Admin' })
    expect(nav).toHaveTextContent('Dashboard')
    expect(nav).toHaveTextContent('Products')
    expect(nav).toHaveTextContent('Orders')
  })

  it('signs staff in with email and password and shows the backend message when it is wrong', async () => {
    let attempts = 0
    const fetchMock = mockApi({
      ...memberRoutes,
      'POST /api/auth/sign-in': () =>
        ++attempts === 1 ? envelope(401, null, 'Invalid email or password.') : envelope(200, adminTokens),
    })
    renderWithProviders(routes, '/admin/sign-in?back=/admin')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'admin@senpai.local')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')

    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'Senpai-Admin-2026!')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('dashboard here')).toBeInTheDocument()
    const signIn = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/auth/sign-in'))
    expect(bodyOf(signIn[1][1])).toEqual({ email: 'admin@senpai.local', password: 'Senpai-Admin-2026!' })
  })

  it('changes the temporary password, then asks to sign in again', async () => {
    storeSession()
    const temp = { ...adminTokens, user: { ...adminTokens.user!, mustChangePassword: true } }
    const fetchMock = mockApi({
      ...memberRoutes,
      'POST /api/auth/refresh-token': () => envelope(200, temp),
      'POST /api/users/me/change-password': () => envelope(200, null),
      'POST /api/auth/sign-out': () => envelope(401, null),
    })
    renderWithProviders(routes, '/admin/password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Current password'), 'temp-Pass1!')
    await user.type(screen.getByLabelText('New password'), 'Senpai-Admin-2026!')
    await user.type(screen.getByLabelText('New password again'), 'Senpai-Admin-2026?')
    expect(screen.getByText('The two passwords are different.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save password' })).toBeDisabled()
    await user.clear(screen.getByLabelText('New password again'))
    await user.type(screen.getByLabelText('New password again'), 'Senpai-Admin-2026!')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText('Password changed. Sign in with the new one.')).toBeInTheDocument()
    const change = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/change-password'))
    expect(bodyOf(change?.[1])).toEqual({ currentPassword: 'temp-Pass1!', newPassword: 'Senpai-Admin-2026!' })
  })
})
