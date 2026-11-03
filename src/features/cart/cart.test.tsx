import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { LineInput, Quote, QuoteLine } from '../../api/types'
import { CartBadge } from '../../layout/CartBadge'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { deliveryOptions, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { CartPage } from './CartPage'

function qLine(over: Partial<QuoteLine> = {}): QuoteLine {
  return {
    productId: 7, optionId: null, slug: 'sakura-bottle', name: 'Sakura steel bottle, 750 ml', optionLabel: null, unitPrice: 1450,
    quantity: 1, lineTotal: 1450, preorder: false, preorderRelease: null, depositPerUnit: 0, stockState: 'IN_STOCK', enoughStock: true,
    thumbnailUrl: null, ...over,
  }
}

/** A quote the way the server computes it, for the lines asked. */
function quoteFor(items: LineInput[], over: Partial<QuoteLine> = {}): Quote {
  const lines = items.map((i) => qLine({ ...over, productId: i.productId, optionId: i.optionId, quantity: i.quantity, lineTotal: 1450 * i.quantity }))
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0)
  const fee = subtotal >= 3000 ? 0 : 70
  return {
    lines, subtotal, district: 'Dhaka', deliveryFee: fee, total: subtotal + fee, depositTotal: 0, freeDeliveryThreshold: 3000,
    amountToFreeDelivery: Math.max(0, 3000 - subtotal), deliveryEstimate: '1 to 2 days', allInStock: lines.every((l) => l.enoughStock),
  }
}

const renderCart = () =>
  renderWithProviders(
    <>
      <CartBadge />
      <Routes>
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </>,
    '/cart',
  )

function guestCart(lines: LineInput[]) {
  localStorage.setItem('senpai.cart', JSON.stringify(lines))
}

describe('cart page', () => {
  it('invites browsing when empty', async () => {
    mockApi({ 'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions) })
    renderCart()
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/shop')
  })

  it('shows the server’s quote: lines, free-delivery progress, delivery fee and total', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    const fetchMock = mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': (_u, init) => envelope(200, quoteFor((bodyOf(init) as { items: LineInput[] }).items)),
    })
    renderCart()
    const summaryBox = await screen.findByRole('complementary', { name: 'Order summary' })
    expect(await within(summaryBox).findByText('৳ 1,550')).toBeInTheDocument()
    expect(within(summaryBox).getByText('৳ 1,550', { selector: 'strong' })).toBeInTheDocument()
    expect(within(summaryBox).getByText('৳ 70')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart, 1 item' })).toBeInTheDocument()
    expect(bodyOf(fetchMock.mock.calls.find(([u]) => String(u).endsWith('/quote'))?.[1])).toEqual({
      items: [{ productId: 7, optionId: null, quantity: 1 }],
      district: 'Dhaka',
    })
  })

  it('re-quotes when the quantity changes and unlocks free delivery', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': (_u, init) => envelope(200, quoteFor((bodyOf(init) as { items: LineInput[] }).items)),
    })
    renderCart()
    await userEvent.click(await screen.findByRole('button', { name: 'One more' }))
    await userEvent.click(screen.getByRole('button', { name: 'One more' }))
    expect(await screen.findByText('Free delivery')).toBeInTheDocument()
    expect(screen.getByText('৳ 1,450 each')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument()
  })

  it('moves a line to the wishlist with save for later', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': (_u, init) => envelope(200, quoteFor((bodyOf(init) as { items: LineInput[] }).items)),
    })
    renderCart()
    await userEvent.click(await screen.findByRole('button', { name: 'Save for later' }))
    expect(await screen.findByText('Moved to your wishlist')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('senpai.wishlist') ?? '[]')).toEqual([7])
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
  })

  it('blocks checkout and explains when there is not enough stock', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 5 }])
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': (_u, init) =>
        envelope(200, quoteFor((bodyOf(init) as { items: LineInput[] }).items, { enoughStock: false, stockState: 'LOW_STOCK' })),
    })
    renderCart()
    expect(await screen.findByText('Not enough left for this quantity. Lower it to check out.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to checkout' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('drops products the shop no longer sells from a guest cart', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }, { productId: 99, optionId: null, quantity: 1 }])
    mockApi({
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'POST /api/checkout/quote': (_u, init) => {
        const items = (bodyOf(init) as { items: LineInput[] }).items
        return items.some((i) => i.productId === 99)
          ? envelope(404, null, 'This product is not available right now.')
          : envelope(200, quoteFor(items))
      },
    })
    renderCart()
    expect(await screen.findByText('Removed 1 item we no longer sell')).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(localStorage.getItem('senpai.cart') ?? '[]')).toEqual([{ productId: 7, optionId: null, quantity: 1 }]))
    expect((await screen.findAllByRole('link', { name: 'Sakura steel bottle, 750 ml' })).length).toBeGreaterThan(0)
  })

  it('shows a member’s archived line apart and removes it by id', async () => {
    storeSession()
    const archived = { itemId: 31, productId: 5, optionId: null, slug: 'old-thing', name: 'Old thing', optionName: null, optionValue: null, unitPrice: 100, quantity: 1, lineTotal: 100, stockState: 'IN_STOCK', available: false, preorder: false, preorderRelease: null, thumbnailUrl: null }
    const fetchMock = mockApi({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'GET /api/cart': () => envelope(200, { items: [archived], itemCount: 0, subtotal: 0 }),
      'DELETE /api/cart/items/31': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
    })
    renderCart()
    expect(await screen.findByText('No longer available. It is not in your total.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith('/api/cart/items/31') && i?.method === 'DELETE')).toBe(true)
  })
})
