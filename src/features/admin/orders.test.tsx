import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { Order } from '../../api/types'
import { bodyOf, envelope, mockApi, page } from '../../test/api'
import { renderWithProviders, storeSession } from '../../test/render'
import { AdminOrderPage } from './AdminOrderPage'
import { adminSession } from './fixtures'
import { OrdersPage } from './OrdersPage'

const routes = (
  <Routes>
    <Route path="/admin/orders" element={<OrdersPage />} />
    <Route path="/admin/orders/:orderNumber" element={<AdminOrderPage />} />
  </Routes>
)

const order = (over: Partial<Order> = {}): Order => ({
  orderNumber: 'SS-7K2M9Q', status: 'PLACED', placedAt: '2026-11-04T06:00:00Z', deliveredAt: null,
  fullName: 'Rahim Uddin', phone: '01712345678', email: null, district: 'Dhaka', area: 'Dhanmondi', addressLine: 'House 4, Road 2',
  note: null, paymentMethod: 'COD', paymentStatus: 'PENDING',
  items: [{ productId: 7, optionId: null, slug: 'kitsune-bottle', name: 'Kitsune bottle', optionLabel: null, unitPrice: 1450,
    quantity: 2, lineTotal: 2900, preorder: false, depositPerUnit: null, thumbnailUrl: null }],
  subtotal: 2900, deliveryFee: 70, total: 2970, depositTotal: 0, amountDueOnDelivery: 2970, deliveryEstimate: '1 to 2 days',
  timeline: [{ status: 'PLACED', at: '2026-11-04T06:00:00Z', note: null }], canCancel: true, paymentAction: null, ...over,
})

describe('admin orders', () => {
  beforeEach(() => storeSession())

  it('filters by status and searches, keeping both in the address', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/orders': () => envelope(200, page([{ orderNumber: 'SS-7K2M9Q', status: 'PLACED', placedAt: '2026-11-04T06:00:00Z',
        total: 2970, paymentMethod: 'COD', itemCount: 2, items: [] }])),
    })
    renderWithProviders(routes, '/admin/orders')
    expect(await screen.findByRole('link', { name: 'SS-7K2M9Q' })).toHaveAttribute('href', '/admin/orders/SS-7K2M9Q')
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Status'), 'PACKED')
    await user.type(screen.getByLabelText('Order number or phone'), '0171')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/orders?status=PACKED&q=0171')
    const last = String(fetchMock.mock.calls.filter(([u]) => String(u).includes('/api/admin/orders')).at(-1)?.[0])
    expect(last).toContain('status=PACKED')
    expect(last).toContain('q=0171')
  })

  it('shows the order and packs it with a note', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/orders/SS-7K2M9Q': () => envelope(200, order()),
      'PATCH /api/admin/orders/SS-7K2M9Q/status': () =>
        envelope(200, order({ status: 'PACKED', timeline: [...order().timeline, { status: 'PACKED', at: '2026-11-04T07:00:00Z', note: 'Gift wrap' }] })),
    })
    renderWithProviders(routes, '/admin/orders/SS-7K2M9Q')
    expect(await screen.findByText('Kitsune bottle')).toBeInTheDocument()
    expect(screen.getByText(/House 4, Road 2, Dhanmondi, Dhaka/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark delivered' })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Note for the history (optional)'), 'Gift wrap')
    await user.click(screen.getByRole('button', { name: 'Mark packed' }))
    expect(await screen.findByRole('button', { name: 'Hand to rider' })).toBeInTheDocument()
    expect(screen.getByText('Gift wrap')).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')
    expect(bodyOf(patch?.[1])).toEqual({ action: 'PACK', note: 'Gift wrap' })
  })

  it('asks before cancelling and shows the backend’s refusal', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/orders/SS-7K2M9Q': () => envelope(200, order()),
      'PATCH /api/admin/orders/SS-7K2M9Q/status': () => envelope(409, null, 'This order cannot move to that status.'),
    })
    renderWithProviders(routes, '/admin/orders/SS-7K2M9Q')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cancel order' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Cancel this order?')
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Yes, cancel order' }))
    expect(await screen.findByText('This order cannot move to that status.')).toBeInTheDocument()
  })

  it('says when there is no such order', async () => {
    mockApi({ ...adminSession, 'GET /api/admin/orders/SS-NOPE00': () => envelope(404, null, 'Order not found.') })
    renderWithProviders(routes, '/admin/orders/SS-NOPE00')
    expect(await screen.findByText('No order with that number.')).toBeInTheDocument()
  })
})
