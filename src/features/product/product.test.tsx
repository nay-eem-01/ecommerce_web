import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { ReviewPage } from '../../api/types'
import { bodyOf, envelope, mockApi, page } from '../../test/api'
import { deliveryOptions, detail, summary, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { degrees, frameIndex } from './viewer/Viewer'
import { ProductPage } from './ProductPage'

const noReviews: ReviewPage = { summary: { average: null, count: 0, distribution: {} }, reviews: page([]) }
const someReviews: ReviewPage = {
  summary: { average: 4.67, count: 3, distribution: { '5': 2, '4': 1 } },
  reviews: page([{ id: 1, rating: 5, body: 'Looks even better than the 360 view.', authorName: 'Tasnim R.', verifiedBuyer: true, creationDate: '2026-10-20T10:00:00Z', mine: false }]),
}

function api(overrides: Record<string, Parameters<typeof mockApi>[0][string]> = {}) {
  return mockApi({
    'GET /api/products/ronin-swordsman': () => envelope(200, detail()),
    'GET /api/products/ronin-swordsman/related': () => envelope(200, [summary()]),
    'GET /api/products/ronin-swordsman/reviews': () => envelope(200, noReviews),
    'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
    ...overrides,
  })
}

const renderPage = (path = '/p/ronin-swordsman') =>
  renderWithProviders(
    <Routes>
      <Route path="/p/:slug" element={<ProductPage />} />
    </Routes>,
    path,
  )

describe('product page', () => {
  it('shows price, saving, stock, the fact grid and delivery before the fold', async () => {
    api()
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Ronin Swordsman 1/7 scale figure' })).toBeInTheDocument()
    const buy = screen.getByRole('heading', { level: 1 }).closest('.buy') as HTMLElement
    expect(within(buy.querySelector('.price-row') as HTMLElement).getByText('৳ 6,800')).toBeInTheDocument()
    expect(within(buy).getByText('Save ৳ 700')).toBeInTheDocument()
    expect(within(buy).getByText('Only 3 left')).toBeInTheDocument()
    expect(within(buy).getByText('24 cm with base')).toBeInTheDocument()
    expect(await within(buy).findByText('Delivery in 1 to 2 days')).toBeInTheDocument()
    expect(within(buy).getByText(/bKash/)).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /360 degree view of Ronin/ })).toBeInTheDocument()
  })

  it('prices the chosen option and caps the quantity at its stock', async () => {
    api()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Deluxe, with alt face +৳ 1,200' }))
    const buy = screen.getByRole('heading', { level: 1 }).closest('.buy') as HTMLElement
    expect(within(buy.querySelector('.price-row') as HTMLElement).getByText('৳ 8,000')).toBeInTheDocument()
    expect(within(buy).getByText('Only 1 left')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Quantity' })).getByRole('button', { name: 'One more' })).toBeDisabled()
  })

  it('adds the chosen option and quantity to a guest cart in the browser', async () => {
    api()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'One more' }))
    await userEvent.click(screen.getAllByRole('button', { name: /Add to cart/ })[0])
    expect(await screen.findByText('Added to cart: Ronin Swordsman 1/7 scale figure')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('senpai.cart') ?? '[]')).toEqual([{ productId: 1, optionId: 11, quantity: 2 }])
  })

  it('adds to a member’s cart on the server, on top of what is there', async () => {
    storeSession()
    const fetchMock = api({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [{ itemId: 9, productId: 1, optionId: 11, quantity: 1, available: true }], itemCount: 1, subtotal: 6800 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'PUT /api/cart/items': (_u, init) => envelope(200, { items: [{ itemId: 9, ...(bodyOf(init) as object), available: true }], itemCount: 2, subtotal: 13600 }),
    })
    renderPage()
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/api/cart'))).toBe(true))
    await userEvent.click(screen.getAllByRole('button', { name: /Add to cart/ })[0])
    await screen.findByText(/Added to cart/)
    const put = fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/api/cart/items') && i?.method === 'PUT')
    expect(bodyOf(put?.[1])).toEqual({ productId: 1, optionId: 11, quantity: 2 })
  })

  it('offers the wishlist instead of the buttons when sold out, and names sold-out sizes', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({ stockState: 'SOLD_OUT', stockLeft: null, options: [] })),
    })
    renderPage()
    expect(await screen.findByText('Sold out', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add to cart/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Save to wishlist' })[0])
    expect(await screen.findByText('Saved to your wishlist')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('senpai.wishlist') ?? '[]')).toEqual([1])
  })

  it('has a size guide for sized products and says which sizes are gone', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({
          sized: true, optionName: 'Size', stockState: 'IN_STOCK', stockLeft: null,
          options: [
            { id: 1, value: 'M', priceDelta: 0, price: 4200, stockState: 'IN_STOCK', stockLeft: null, swatch: null },
            { id: 2, value: 'XL', priceDelta: 200, price: 4400, stockState: 'SOLD_OUT', stockLeft: null, swatch: null },
          ],
        })),
    })
    renderPage()
    expect(await screen.findByText('XL is sold out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'XL +৳ 200' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Size guide' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Size guide' })).toBeInTheDocument()
  })

  it('reserves a pre-order without promising a deposit charge', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({ stockState: 'PREORDER', stockLeft: null, preorder: true, preorderRelease: '2027-01', deposit: 1000, options: [] })),
    })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Reserve it' })).toBeInTheDocument()
    expect(document.querySelector('.ship')).toHaveTextContent('Pre-order: arrives January 2027.')
    expect(screen.queryByRole('button', { name: 'Buy now' })).not.toBeInTheDocument()
  })

  it('renders description, story and specs as text, with the first lead-in bold', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({ description: 'Who it is for: collectors.\n\n<b>Paint:</b> by hand.' })),
    })
    renderPage()
    expect(await screen.findByText('Who it is for:', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/<b>Paint:<\/b> by hand\./)).toBeInTheDocument()
    expect(screen.getByText('“We wanted the figure to look like it was about to move.”')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Made by' })).toBeInTheDocument()
    expect(screen.getByText('Two swords')).toBeInTheDocument()
  })

  it('shows the rating summary and verified reviews, and asks guests to sign in to review', async () => {
    api({ 'GET /api/products/ronin-swordsman/reviews': () => envelope(200, someReviews) })
    renderPage()
    expect(await screen.findByText('4.7')).toBeInTheDocument()
    expect(screen.getByText('from 3 reviews')).toBeInTheDocument()
    expect(screen.getByText('Looks even better than the 360 view.')).toBeInTheDocument()
    expect(screen.getByText('Verified buyer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to write a review' })).toHaveAttribute('href', expect.stringContaining('/sign-in?back='))
  })

  it('lets a member post a review and shows the backend’s refusal for non-buyers', async () => {
    storeSession()
    api({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'POST /api/products/ronin-swordsman/reviews': () => envelope(403, null, 'Only shoppers who received this product can review it.'),
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Write a review' }))
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 1 to 5 stars.')
    await userEvent.click(screen.getByRole('button', { name: '4 stars' }))
    await userEvent.type(screen.getByLabelText('Your review'), 'Solid paint job, sturdy base.')
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))
    expect(await screen.findByText('Only shoppers who received this product can review it.')).toBeInTheDocument()
  })

  it('lists related products and shows not found for an unknown product', async () => {
    api()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Goes well with' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sakura steel bottle, 750 ml' })).toBeInTheDocument()
  })

  it('shows not found for an unknown slug', async () => {
    api({ 'GET /api/products/nope': () => envelope(404, null, 'Product not found.') })
    renderPage('/p/nope')
    expect(await screen.findByRole('heading', { name: 'This page moved' })).toBeInTheDocument()
  })
})

describe('viewer maths', () => {
  it('maps an angle to degrees and to a turntable frame', () => {
    expect(degrees(0)).toBe(0)
    expect(degrees(-Math.PI / 18)).toBe(350)
    expect(frameIndex(0, 36)).toBe(0)
    expect(frameIndex(Math.PI, 36)).toBe(18)
    expect(frameIndex(-Math.PI / 18, 36)).toBe(35)
    expect(frameIndex(2 * Math.PI - 0.01, 36)).toBe(0)
    expect(frameIndex(1, 0)).toBe(0)
  })
})
