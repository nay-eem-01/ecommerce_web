import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { AdminReview, AdminUser } from '../../api/types'
import { bodyOf, envelope, mockApi, page } from '../../test/api'
import { renderWithProviders, storeSession } from '../../test/render'
import { adminSession } from './fixtures'
import { ReviewsPage } from './ReviewsPage'
import { UsersPage } from './UsersPage'

const routes = (
  <Routes>
    <Route path="/admin/users" element={<UsersPage />} />
    <Route path="/admin/reviews" element={<ReviewsPage />} />
  </Routes>
)

const shopper: AdminUser = { id: 9, name: 'Tasnim Rahman', phone: '01712345678', email: null, status: 'ACTIVE', roles: ['CUSTOMER'], creationDate: '2026-10-01T10:00:00Z' }
const staff: AdminUser = { id: 1, name: null, phone: null, email: 'admin@senpai.local', status: 'ACTIVE', roles: ['ADMIN'], creationDate: '2026-09-01T10:00:00Z' }
const review: AdminReview = { id: 31, productId: 4, productName: 'Kitsune school-run set', authorName: 'Tasnim R.', rating: 2, body: 'Arrived scratched.', status: 'PUBLISHED', createdAt: '2026-11-01T10:00:00Z' }

describe('admin users', () => {
  beforeEach(() => storeSession())
  afterEach(() => vi.restoreAllMocks())

  it('searches by name, phone or email', async () => {
    const fetchMock = mockApi({ ...adminSession, 'GET /api/admin/users': () => envelope(200, page([shopper, staff])) })
    renderWithProviders(routes, '/admin/users')
    const user = userEvent.setup()
    expect(await screen.findByText('Tasnim Rahman')).toBeInTheDocument()
    expect(screen.getByText('admin@senpai.local').closest('tr')).toHaveTextContent('Staff')
    await user.type(screen.getByLabelText('Name, phone or email'), '01712')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/users?q=01712')
    expect(String(fetchMock.mock.calls.filter(([u]) => String(u).includes('/api/admin/users')).at(-1)?.[0])).toContain('q=01712')
  })

  it('asks before suspending and sends BANNED', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/users': () => envelope(200, page([shopper])),
      'PUT /api/admin/users/9/status': () => envelope(200, { ...shopper, status: 'BANNED' }),
    })
    renderWithProviders(routes, '/admin/users')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Suspend Tasnim Rahman' }))
    expect(confirm).toHaveBeenCalledWith('Suspend Tasnim Rahman? They are signed out and cannot sign in.')
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')
    expect(bodyOf(put?.[1])).toEqual({ status: 'BANNED' })
  })

  it('shows the backend refusing to suspend your own account', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockApi({
      ...adminSession,
      'GET /api/admin/users': () => envelope(200, page([staff])),
      'PUT /api/admin/users/1/status': () => envelope(400, null, 'You cannot suspend your own account.'),
    })
    renderWithProviders(routes, '/admin/users')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Suspend admin@senpai.local' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot suspend your own account.')
  })

  it('offers to allow a suspended account back', async () => {
    mockApi({ ...adminSession, 'GET /api/admin/users': () => envelope(200, page([{ ...shopper, status: 'BANNED' }])) })
    renderWithProviders(routes, '/admin/users')
    expect(await screen.findByRole('button', { name: 'Allow back Tasnim Rahman' })).toBeInTheDocument()
    expect(screen.getByText('Suspended')).toBeInTheDocument()
  })
})

describe('admin reviews', () => {
  beforeEach(() => storeSession())

  it('filters by status and hides a review', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/reviews': (url) => envelope(200, page(url.searchParams.get('status') === 'HIDDEN' ? [] : [review])),
      'PATCH /api/admin/reviews/31/status': () => envelope(200, null),
    })
    renderWithProviders(routes, '/admin/reviews')
    const user = userEvent.setup()
    expect(await screen.findByText('Arrived scratched.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kitsune school-run set' })).toHaveAttribute('href', '/admin/products/4')
    expect(screen.getByRole('img', { name: '2 out of 5' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide the review by Tasnim R.' }))
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')
    expect(bodyOf(patch?.[1])).toEqual({ status: 'HIDDEN' })
    await user.click(within(screen.getByRole('group', { name: 'Show' })).getByRole('button', { name: 'Hidden' }))
    expect(await screen.findByText('No reviews here yet.')).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('status=HIDDEN')
  })

  it('publishes a hidden review again', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/reviews': () => envelope(200, page([{ ...review, status: 'HIDDEN' }])),
      'PATCH /api/admin/reviews/31/status': () => envelope(200, null),
    })
    renderWithProviders(routes, '/admin/reviews?status=HIDDEN')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Publish the review by Tasnim R.' }))
    expect(bodyOf(fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')?.[1])).toEqual({ status: 'PUBLISHED' })
  })
})
