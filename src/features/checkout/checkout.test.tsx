import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { LineInput, Order, Quote } from '../../api/types'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { deliveryOptions, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { OrderPage } from '../orders/OrderPage'
import { TrackPage } from '../orders/TrackPage'
import { CheckoutPage } from './CheckoutPage'
import { DonePage } from './DonePage'
import { PaymentResultPage } from './PaymentResultPage'
import { validate } from './validate'

function quote(items: LineInput[], district = 'Dhaka'): Quote {
  const fee = district === 'Dhaka' ? 70 : 130
  return {
    lines: items.map((i) => ({
      productId: i.productId, optionId: i.optionId, slug: 'sakura-bottle', name: 'Sakura steel bottle, 750 ml', optionLabel: 'Colour: Petal pink',
      unitPrice: 1450, quantity: i.quantity, lineTotal: 1450 * i.quantity, preorder: false, preorderRelease: null, depositPerUnit: 0,
      stockState: 'IN_STOCK', enoughStock: true, thumbnailUrl: null,
    })),
    subtotal: 1450, district, deliveryFee: fee, total: 1450 + fee, depositTotal: 0, freeDeliveryThreshold: 3000, amountToFreeDelivery: 1550,
    deliveryEstimate: district === 'Dhaka' ? '1 to 2 days' : '2 to 4 days', allInStock: true,
  }
}

function order(over: Partial<Order> = {}): Order {
  return {
    orderNumber: 'SS-7K2M9QXA', status: 'PLACED', placedAt: '2026-11-02T08:00:00Z', deliveredAt: null, fullName: 'Tasnim Rahman',
    phone: '01812345678', email: null, district: 'Gazipur', area: 'Tongi', addressLine: 'House 4, Road 2', note: null,
    paymentMethod: 'COD', paymentStatus: 'PENDING', items: [], subtotal: 1450, deliveryFee: 130, total: 1580, depositTotal: 0,
    amountDueOnDelivery: 1580, deliveryEstimate: '2 to 4 days', timeline: [{ status: 'PLACED', at: '2026-11-02T08:00:00Z', note: null }],
    canCancel: true, paymentAction: { type: 'NONE', url: null }, ...over,
  }
}

const routes = (
  <Routes>
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/checkout/done" element={<DonePage />} />
    <Route path="/checkout/result" element={<PaymentResultPage />} />
    <Route path="/track" element={<TrackPage />} />
    <Route path="/orders/:orderNumber" element={<OrderPage />} />
  </Routes>
)

function withCart() {
  localStorage.setItem('senpai.cart', JSON.stringify([{ productId: 7, optionId: 14, quantity: 1 }]))
}

async function fillAddress() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Tasnim Rahman')
  await userEvent.type(screen.getByLabelText('Mobile number'), '01812345678')
  await userEvent.selectOptions(screen.getByLabelText('District'), 'Gazipur')
  await userEvent.type(screen.getByLabelText('Area or thana'), 'Tongi')
  await userEvent.type(screen.getByLabelText('House, road and flat'), 'House 4, Road 2')
}

const quoteRoute = (_u: URL, init: RequestInit | undefined) => {
  const body = bodyOf(init) as { items: LineInput[]; district?: string }
  return envelope(200, quote(body.items, body.district))
}

describe('checkout fields', () => {
  it('validates like the prototype', () => {
    expect(validate('fullName', 'A')).toBe('Enter the name the rider should ask for.')
    expect(validate('addressLine', 'H 1')).toBe('Add a house and road number so the rider can find you.')
    expect(validate('email', 'a@b')).toBe('This email looks incomplete. Check for the @ and the domain.')
    expect(validate('email', '')).toBe('')
  })
})

describe('checkout', () => {
  it('lists what to fix and focuses the summary', async () => {
    withCart()
    mockApi({ 'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions), 'POST /api/checkout/quote': quoteRoute })
    renderWithProviders(routes, '/checkout')
    await userEvent.click(await screen.findByRole('button', { name: 'Place order, ৳ 1,520' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('4 things to fix before we can deliver')
    await waitFor(() => expect(alert).toHaveFocus())
    await userEvent.click(within(alert).getByRole('link', { name: 'Mobile number' }))
    expect(screen.getByLabelText('Mobile number')).toHaveFocus()
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true')
  })

  it('re-quotes for the district and places a cash order with an idempotency key', async () => {
    withCart()
    const fetchMock = mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': quoteRoute,
      'POST /api/orders': () => envelope(201, order()),
    })
    renderWithProviders(routes, '/checkout')
    await screen.findByRole('button', { name: 'Place order, ৳ 1,520' })
    await fillAddress()
    expect(await screen.findByRole('button', { name: 'Place order, ৳ 1,580' })).toBeInTheDocument()
    expect(screen.getByText('Delivery to Gazipur')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Place order, ৳ 1,580' }))
    expect(await screen.findByRole('heading', { name: 'Order placed. Thank you, Tasnim.' })).toBeInTheDocument()
    expect(screen.getByText('In 2 to 4 days. Have ৳ 1,580 ready.')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/orders'))
    const headers = call?.[1]?.headers as Record<string, string>
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(bodyOf(call?.[1])).toMatchObject({
      items: [{ productId: 7, optionId: 14, quantity: 1 }], fullName: 'Tasnim Rahman', phone: '01812345678', district: 'Gazipur',
      area: 'Tongi', addressLine: 'House 4, Road 2', paymentMethod: 'COD', saveAddress: false,
    })
    expect(localStorage.getItem('senpai.cart')).toBeNull()
  })

  it('retries with the same key after a network error, so the order is never doubled', async () => {
    withCart()
    let attempts = 0
    const keys: string[] = []
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': quoteRoute,
      'POST /api/orders': (_u, init) => {
        keys.push((init?.headers as Record<string, string> | undefined)?.['Idempotency-Key'] ?? '')
        attempts += 1
        if (attempts === 1) throw new TypeError('Failed to fetch')
        return envelope(201, order())
      },
    })
    renderWithProviders(routes, '/checkout')
    await screen.findByRole('button', { name: /Place order/ })
    await fillAddress()
    await userEvent.click(await screen.findByRole('button', { name: 'Place order, ৳ 1,580' }))
    expect(await screen.findByText(/you will not be charged twice/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Place order, ৳ 1,580' }))
    expect(await screen.findByRole('heading', { name: /Order placed/ })).toBeInTheDocument()
    expect(keys[0]).toBe(keys[1])
  })

  it('shows the stock conflict and re-quotes', async () => {
    withCart()
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': quoteRoute,
      'POST /api/orders': () => envelope(409, { productIds: [7] }, 'Some items just sold out. Check your cart.'),
    })
    renderWithProviders(routes, '/checkout')
    await screen.findByRole('button', { name: /Place order/ })
    await fillAddress()
    await userEvent.click(await screen.findByRole('button', { name: 'Place order, ৳ 1,580' }))
    expect(await screen.findByText('Something in your cart changed')).toBeInTheDocument()
    expect(screen.getByText('Some items just sold out. Check your cart.')).toBeInTheDocument()
  })

  it('sends an online payment to the provider page', async () => {
    withCart()
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': quoteRoute,
      'POST /api/orders': () => envelope(201, order({ paymentMethod: 'BKASH', amountDueOnDelivery: 0, paymentAction: { type: 'REDIRECT', url: 'https://pay.example/bkash/1' } })),
    })
    renderWithProviders(routes, '/checkout')
    await screen.findByRole('button', { name: /Place order/ })
    await fillAddress()
    await userEvent.click(screen.getByRole('radio', { name: /bKash/ }))
    expect(screen.getByText('You confirm the payment on the next screen.')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Place order, ৳ 1,580' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/bkash/1'))
  })

  it('fills in a member’s saved address', async () => {
    storeSession()
    withCart()
    mockApi({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [{ itemId: 1, productId: 7, optionId: 14, quantity: 1, available: true }], itemCount: 1, subtotal: 1450 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'GET /api/users/me/addresses': () =>
        envelope(200, [{ id: 3, fullName: 'Nayeem Ahmed', phone: '01712345678', district: 'Dhaka', area: 'Mirpur', addressLine: 'House 9, Road 1', defaultAddress: true }]),
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': quoteRoute,
    })
    renderWithProviders(routes, '/checkout')
    expect(await screen.findByText(/We filled in your saved address/)).toBeInTheDocument()
    expect(screen.getByLabelText('Area or thana')).toHaveValue('Mirpur')
    expect(screen.getByLabelText('Mobile number')).toHaveValue('01712345678')
  })
})

describe('after checkout', () => {
  it('offers a retry when the online payment failed', async () => {
    sessionStorage.setItem('senpai.lastOrder', JSON.stringify(order({ paymentMethod: 'BKASH' })))
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    mockApi({
      'POST /api/orders/track': () => envelope(200, { orderNumber: 'SS-7K2M9QXA', status: 'PLACED', placedAt: '2026-11-02T08:00:00Z', items: [], total: 1580, paymentMethod: 'BKASH', deliveryEstimate: '2 to 4 days', timeline: [] }),
      'POST /api/orders/pay': (_u, init) => {
        expect(bodyOf(init)).toEqual({ orderNumber: 'SS-7K2M9QXA', phone: '01812345678' })
        return envelope(200, { type: 'REDIRECT', url: 'https://pay.example/again' })
      },
    })
    renderWithProviders(routes, '/checkout/result?order=SS-7K2M9QXA&payment=FAILED')
    expect(await screen.findByRole('heading', { name: 'Your payment did not go through' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try paying again' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.example/again'))
  })

  it('tracks a guest order by number and phone', async () => {
    mockApi({
      'POST /api/orders/track': (_u, init) =>
        (bodyOf(init) as { phone: string }).phone === '01812345678'
          ? envelope(200, { orderNumber: 'SS-7K2M9QXA', status: 'PACKED', placedAt: '2026-11-02T08:00:00Z', items: [{ name: 'Sakura steel bottle', optionLabel: 'Colour: Petal pink', quantity: 1 }], total: 1580, paymentMethod: 'COD', deliveryEstimate: '2 to 4 days', timeline: [{ status: 'PLACED', at: '2026-11-02T08:00:00Z', note: null }, { status: 'PACKED', at: '2026-11-02T10:00:00Z', note: null }] })
          : envelope(404, null, 'We could not find that order. Check the number and phone.'),
    })
    renderWithProviders(routes, '/track?order=SS-7K2M9QXA')
    expect(screen.getByLabelText('Order number')).toHaveValue('SS-7K2M9QXA')
    await userEvent.type(screen.getByLabelText('Mobile number'), '01900000000')
    await userEvent.click(screen.getByRole('button', { name: 'Track order' }))
    expect(await screen.findByText('We could not find that order. Check the number and phone.')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Mobile number'))
    await userEvent.type(screen.getByLabelText('Mobile number'), '01812345678')
    await userEvent.click(screen.getByRole('button', { name: 'Track order' }))
    expect(await screen.findByText('Packed', { selector: '.pill' })).toBeInTheDocument()
    expect(screen.getByText('Sakura steel bottle, Colour: Petal pink ×1')).toBeInTheDocument()
  })

  it('lets a member cancel an order while it is placed', async () => {
    storeSession()
    mockApi({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'GET /api/orders/me/SS-7K2M9QXA': () => envelope(200, order()),
      'POST /api/orders/me/SS-7K2M9QXA/cancel': () =>
        envelope(200, order({ status: 'CANCELLED', canCancel: false, timeline: [...order().timeline, { status: 'CANCELLED', at: '2026-11-02T09:00:00Z', note: 'Cancelled by the customer' }] })),
      'GET /api/orders/me': () => envelope(200, { content: [], pageNo: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }),
    })
    renderWithProviders(routes, '/orders/SS-7K2M9QXA')
    expect(await screen.findByRole('heading', { name: 'Order SS-7K2M9QXA' })).toBeInTheDocument()
    expect(screen.getByText('Have ৳ 1,580 ready for the rider.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel this order' }))
    expect(await screen.findByText('Cancelled', { selector: '.pill' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
  })

  it('asks a guest to sign in or track instead of showing a member order', () => {
    mockApi({})
    renderWithProviders(routes, '/orders/SS-7K2M9QXA')
    expect(screen.getByRole('link', { name: 'Track without signing in' })).toHaveAttribute('href', '/track?order=SS-7K2M9QXA')
  })
})
