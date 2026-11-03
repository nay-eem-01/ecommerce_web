import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { LineInput, Quote, QuoteLine } from '../../api/types'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { deliveryOptions, detail, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { useBag } from './BagContext'
import { BagDrawer, CartPage, pickForFreeDelivery } from './Bag'
import { summary } from '../../test/fixtures'

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

function OpenBag() {
  const bag = useBag()
  return (
    <button type="button" onClick={bag.open}>
      Open bag
    </button>
  )
}

const renderCart = () =>
  renderWithProviders(
    <Routes>
      <Route path="/cart" element={<CartPage />} />
    </Routes>,
    '/cart',
  )

const quoteApi = (over: Partial<QuoteLine> = {}) => ({
  'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
  'POST /api/checkout/quote': (_u: URL, init: RequestInit | undefined) => envelope(200, quoteFor((bodyOf(init) as { items: LineInput[] }).items, over)),
})

function guestCart(lines: LineInput[]) {
  localStorage.setItem('senpai.cart', JSON.stringify(lines))
}

describe('bag', () => {
  it('invites shopping when empty', async () => {
    mockApi({ 'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions) })
    renderCart()
    expect(screen.getByText('Your bag is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Shop the drop' })).toHaveAttribute('href', '/shop')
  })

  it('shows the server’s quote: lines, free-delivery progress, delivery fee and total', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    const fetchMock = mockApi(quoteApi())
    renderCart()
    expect(await screen.findByText('৳ 1,550', { selector: 'b' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Towards free delivery' })).toHaveAttribute('aria-valuenow', '48')
    expect(screen.getByText('৳ 70 in Dhaka')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Checkout · ৳ 1,520' })).toHaveAttribute('href', '/checkout')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your bag 1 item')
    expect(bodyOf(fetchMock.mock.calls.find(([u]) => String(u).endsWith('/quote'))?.[1])).toEqual({
      items: [{ productId: 7, optionId: null, quantity: 1 }],
      district: 'Dhaka',
    })
  })

  it('re-quotes when the quantity changes and unlocks free delivery', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi(quoteApi())
    renderCart()
    await userEvent.click(await screen.findByRole('button', { name: 'One more' }))
    await userEvent.click(screen.getByRole('button', { name: 'One more' }))
    expect(await screen.findByText('Free delivery unlocked.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3 items')
  })

  it('moves a line to the wishlist with save for later', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi(quoteApi())
    renderCart()
    await userEvent.click(await screen.findByRole('button', { name: 'Save for later' }))
    expect(await screen.findByText('Moved to your wishlist')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('senpai.wishlist') ?? '[]')).toEqual([7])
    expect(await screen.findByText('Your bag is empty')).toBeInTheDocument()
  })

  it('blocks checkout and explains when there is not enough stock', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 5 }])
    mockApi(quoteApi({ enoughStock: false, stockState: 'LOW_STOCK' }))
    renderCart()
    expect(await screen.findByText('Not enough left for this quantity.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Checkout ·/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('offers to swap a set’s part for the set', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi({
      ...quoteApi(),
      'GET /api/products/sakura-bottle': () =>
        envelope(200, { ...detail(), id: 7, slug: 'sakura-bottle', sets: [{ set: summary({ id: 9, slug: 'kit', name: 'Kitsune school-run set', price: 3990, set: true }), saving: 410 }] }),
      'GET /api/products/sakura-bottle/related': () => envelope(200, []),
    })
    renderCart()
    expect(await screen.findByText('Swap for the set and save ৳ 410')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add Kitsune school-run set' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('senpai.cart') ?? '[]')).toEqual([{ productId: 9, optionId: null, quantity: 1 }]))
  })

  it('picks the cheapest product that reaches free delivery', () => {
    const a = summary({ id: 1, price: 900 })
    const b = summary({ id: 2, price: 1650 })
    const c = summary({ id: 3, price: 2950 })
    const sold = summary({ id: 4, price: 1600, stockState: 'SOLD_OUT' })
    expect(pickForFreeDelivery([c, a, b, sold], new Set(), 1550)?.id).toBe(2)
    expect(pickForFreeDelivery([a, b], new Set([2]), 1550)?.id).toBe(1)
    expect(pickForFreeDelivery([], new Set(), 10)).toBeNull()
  })

  it('opens as a drawer, closes with Escape and when a link inside is followed', async () => {
    guestCart([{ productId: 7, optionId: null, quantity: 1 }])
    mockApi(quoteApi())
    renderWithProviders(
      <>
        <OpenBag />
        <BagDrawer />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </>,
      '/shop',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open bag' }))
    expect(screen.getByRole('dialog', { name: /Your bag/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close bag' }).at(-1)).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open bag' }))
    await userEvent.click(await screen.findByRole('link', { name: /Checkout ·/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/checkout')
  })

  it('drops products the shop no longer sells from a guest bag', async () => {
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
    expect(await screen.findByText('Your bag is empty')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith('/api/cart/items/31') && i?.method === 'DELETE')).toBe(true)
  })
})
