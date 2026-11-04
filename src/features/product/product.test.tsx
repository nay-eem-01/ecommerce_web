import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { ReviewPage } from '../../api/types'
import { bodyOf, envelope, mockApi, page } from '../../test/api'
import { deliveryOptions, detail, summary, tokens } from '../../test/fixtures'
import { renderWithProviders, storeSession } from '../../test/render'
import { degrees, frameIndex, stillViews } from './gallery'
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

const bottle = detail({
  id: 3, slug: 'kitsune-night-bottle', name: 'Kitsune Night steel bottle, 750 ml', maker: null,
  category: { slug: 'bottles', name: 'Bottles' }, character: { slug: 'kitsune', name: 'Kitsune', label: '狐' },
  price: 1450, compareAtPrice: null, stockState: 'LOW_STOCK', stockLeft: 4, optionName: 'Colour',
  options: [
    { id: 31, value: 'Petal pink', priceDelta: 0, price: 1450, stockState: 'LOW_STOCK', stockLeft: 4, swatch: '#f2a7c3' },
    { id: 32, value: 'Night navy', priceDelta: 0, price: 1450, stockState: 'IN_STOCK', stockLeft: null, swatch: '#1f2a4d' },
  ],
  facts: [{ label: 'Capacity', value: '750 ml' }, { label: 'Keeps cold', value: '24 hours' }],
  tags: [{ group: 'Material', value: 'Steel' }],
  sets: [{ set: summary({ id: 9, slug: 'kitsune-school-run-set', name: 'Kitsune school-run set', price: 3990, compareAtPrice: 4400, set: true }), saving: 410 }],
})

describe('product page', () => {
  it('shows the eyebrow, price, saving, stock, facts and delivery in the buy box', async () => {
    api()
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Ronin Swordsman 1/7 scale figure' })).toBeInTheDocument()
    const buy = screen.getByRole('heading', { level: 1 }).closest('.buy') as HTMLElement
    expect(within(buy.querySelector('.pd-price-row') as HTMLElement).getByText('৳ 6,800')).toBeInTheDocument()
    expect(within(buy).getByText('৳ 7,500')).toHaveClass('was')
    expect(within(buy).getByText('Only 3 left')).toBeInTheDocument()
    expect(within(buy).getByText('24 cm with base')).toBeInTheDocument()
    expect(await within(buy).findByText('1 to 2 days in Dhaka')).toBeInTheDocument()
    expect(within(buy).getByText(/Or pay ahead with bKash/)).toBeInTheDocument()
    expect(screen.getAllByRole('slider', { name: /360 degree view of Ronin/ }).length).toBeGreaterThan(0)
  })

  it('prices the chosen option and caps the quantity at its stock', async () => {
    api()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Deluxe, with alt face +৳ 1,200' }))
    const buy = screen.getByRole('heading', { level: 1 }).closest('.buy') as HTMLElement
    expect(within(buy.querySelector('.pd-price-row') as HTMLElement).getByText('৳ 8,000')).toBeInTheDocument()
    expect(within(buy).getByText('Only 1 left')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Quantity' })).getByRole('button', { name: 'One more' })).toBeDisabled()
  })

  it('picks a colour swatch, eyebrows the character and offers the set', async () => {
    api({ 'GET /api/products/ronin-swordsman': () => envelope(200, bottle) })
    renderPage()
    expect(await screen.findByText('Kitsune · Bottles')).toBeInTheDocument()
    const colours = within(screen.getByRole('group', { name: 'Colour' }))
    expect(colours.getByRole('button', { name: 'Petal pink' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(colours.getByRole('button', { name: 'Night navy' }))
    expect(colours.getByRole('button', { name: 'Night navy' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Kitsune Night steel bottle, 750 ml, Night navy')).toBeInTheDocument()
    const set = screen.getByText('Complete the set').closest('a')
    expect(set).toHaveAttribute('href', '/p/kitsune-school-run-set')
    expect(set).toHaveTextContent('save ৳ 410')
  })

  it('adds the chosen option and quantity to a guest bag in the browser', async () => {
    api()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'One more' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Add to bag' })[0])
    await waitFor(() => expect(JSON.parse(localStorage.getItem('senpai.cart') ?? '[]')).toEqual([{ productId: 1, optionId: 11, quantity: 2 }]))
  })

  it('adds to a member’s bag on the server', async () => {
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
    await userEvent.click(screen.getAllByRole('button', { name: 'Add to bag' })[0])
    await waitFor(() => {
      const put = fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/api/cart/items') && i?.method === 'PUT')
      expect(bodyOf(put?.[1])).toEqual({ productId: 1, optionId: 11, quantity: 2 })
    })
  })

  it('offers the wishlist instead of Add to bag when sold out', async () => {
    api({ 'GET /api/products/ronin-swordsman': () => envelope(200, detail({ stockState: 'SOLD_OUT', stockLeft: null, options: [] })) })
    renderPage()
    expect(await screen.findByText('Sold out', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to bag' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save to wishlist' }))
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
    const [link, section] = screen.getAllByRole('button', { name: 'Size guide' })
    expect(section).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(link)
    expect(section).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('columnheader', { name: 'Chest, cm' })).toBeVisible()
  })

  it('reserves a pre-order and says when it arrives', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({ stockState: 'PREORDER', stockLeft: null, preorder: true, preorderRelease: '2027-01', deposit: 1000, options: [] })),
    })
    renderPage()
    expect((await screen.findAllByRole('button', { name: 'Reserve it' })).length).toBeGreaterThan(0)
    expect(screen.getByText('Pre-order: arrives January 2027.')).toBeInTheDocument()
  })

  it('opens Description first and the other sections on demand, all as plain text', async () => {
    api({
      'GET /api/products/ronin-swordsman': () =>
        envelope(200, detail({ description: 'Who it is for: collectors.\n\n<b>Paint:</b> by hand.' })),
    })
    renderPage()
    expect(await screen.findByText('Who it is for:', { selector: 'strong' })).toBeVisible()
    expect(screen.getByText(/<b>Paint:<\/b> by hand\./)).toBeInTheDocument()
    const story = screen.getByRole('button', { name: 'The story' })
    expect(story).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('“We wanted the figure to look like it was about to move.”')).not.toBeVisible()
    await userEvent.click(story)
    expect(screen.getByText('“We wanted the figure to look like it was about to move.”')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Specs and what’s in the box' }))
    expect(screen.getByRole('rowheader', { name: 'Made by' })).toBeVisible()
    expect(screen.getByText(/Figure, Two swords/)).toBeVisible()
  })

  it('shows the rating summary and verified reviews, and asks guests to sign in to review', async () => {
    api({ 'GET /api/products/ronin-swordsman/reviews': () => envelope(200, someReviews) })
    renderPage()
    await userEvent.click(await screen.findByRole('link', { name: '★ 4.7 · 3 reviews' }))
    expect(screen.getByRole('button', { name: 'Reviews (3)' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('4.7')).toBeVisible()
    expect(screen.getByText('Looks even better than the 360 view.')).toBeVisible()
    expect(screen.getByText('Verified buyer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to write a review' })).toHaveAttribute('href', `/sign-in?back=${encodeURIComponent('/p/ronin-swordsman#reviews')}`)
  })

  it('lets a member post a review and shows the backend’s refusal for non-buyers', async () => {
    storeSession()
    api({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
      'GET /api/wishlist/ids': () => envelope(200, []),
      'POST /api/products/ronin-swordsman/reviews': () => envelope(403, null, 'Only shoppers who received this product can review it.'),
    })
    renderPage('/p/ronin-swordsman#reviews')
    await userEvent.click(await screen.findByRole('button', { name: 'Write a review' }))
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 1 to 5 stars.')
    await userEvent.click(screen.getByRole('button', { name: '4 stars' }))
    await userEvent.type(screen.getByLabelText('Your review'), 'Solid paint job, sturdy base.')
    await userEvent.click(screen.getByRole('button', { name: 'Post review' }))
    expect(await screen.findByText('Only shoppers who received this product can review it.')).toBeInTheDocument()
  })

  it('lists related products', async () => {
    api()
    renderPage()
    expect(await screen.findByRole('heading', { name: 'You may also like' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sakura steel bottle, 750 ml' }).length).toBeGreaterThan(0)
  })

  it('turns the 360 with the arrow keys and steps through the views', async () => {
    api()
    renderPage()
    const spin = (await screen.findAllByRole('slider', { name: /360 degree view/ }))[0]
    spin.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(spin).toHaveAttribute('aria-valuenow', '10')
    await userEvent.click(screen.getByRole('button', { name: 'Next view' }))
    expect(screen.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows not found for an unknown slug', async () => {
    api({ 'GET /api/products/nope': () => envelope(404, null, 'Product not found.') })
    renderPage('/p/nope')
    expect(await screen.findByRole('heading', { name: 'This page moved' })).toBeInTheDocument()
  })
})

describe('gallery', () => {
  it('maps an angle to degrees and to a turntable frame', () => {
    expect(degrees(0)).toBe(0)
    expect(degrees(-Math.PI / 18)).toBe(350)
    expect(frameIndex(0, 36)).toBe(0)
    expect(frameIndex(Math.PI, 36)).toBe(18)
    expect(frameIndex(-Math.PI / 18, 36)).toBe(35)
    expect(frameIndex(2 * Math.PI - 0.01, 36)).toBe(0)
    expect(frameIndex(1, 0)).toBe(0)
  })

  it('uses photos when there are some, else the stand-in views for the kind', () => {
    const spec = { kind: 'bottle' as const, a: '#000000', b: '#ffffff', c: '#ff0000', face: 'fox' as const, eye: '#000000' }
    expect(stillViews(spec, [{ url: '/a.jpg', altText: 'Front' }], 'X').map((v) => v.label)).toEqual(['Front'])
    expect(stillViews(spec, [], 'X').map((v) => v.short)).toEqual(['Back', 'Print', 'Bag', 'Lid'])
    expect(stillViews({ ...spec, kind: 'pack' }, [], 'X').map((v) => v.short)).toEqual(['Back', 'Print', 'Scale'])
  })
})
