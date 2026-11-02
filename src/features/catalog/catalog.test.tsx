import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { envelope, mockApi, page } from '../../test/api'
import { categories, deliveryOptions, summary } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { HomePage } from '../home/HomePage'
import { SearchPage } from '../search/SearchPage'
import { ListingPage } from './ListingPage'

const products = [
  summary({ id: 1, slug: 'ronin-swordsman', name: 'Ronin Swordsman 1/7 scale figure', categorySlug: 'figures', price: 6800, compareAtPrice: 7500, stockState: 'LOW_STOCK', stockLeft: 4, hasOptions: true }),
  summary({ id: 2, slug: 'mecha-unit-07', name: 'Mecha Unit-07 model kit', categorySlug: 'figures', price: 2950, stockState: 'PREORDER', preorderRelease: '2027-01', deposit: 1000 }),
  summary({ id: 3, slug: 'silver-wig', name: 'Silver long wig', categorySlug: 'costumes', price: 1350, stockState: 'SOLD_OUT' }),
]

function routes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ListingPage />} />
      <Route path="/shop/:category" element={<ListingPage />} />
      <Route path="/preorders" element={<ListingPage preorders />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  )
}

describe('home', () => {
  it('features a figure, tiles the categories and lists the newest products', async () => {
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'GET /api/products': (url) => envelope(200, url.searchParams.get('category') === 'figures' ? page([products[0]]) : { ...page(products), totalElements: 12 }),
    })
    renderWithProviders(routes(), '/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Akihabara, delivered to your door.')
    expect(await screen.findByRole('link', { name: 'See this week’s figure' })).toHaveAttribute('href', '/p/ronin-swordsman')
    expect(await screen.findByText('Free delivery over ৳ 3,000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bottles/ })).toHaveAttribute('href', '/shop/bottles')
    expect(await screen.findByRole('link', { name: 'See all 12 products' })).toBeInTheDocument()
    expect(screen.getAllByText('Save ৳ 700').length).toBeGreaterThan(0)
  })

  it('draws a practice gacha capsule', async () => {
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/checkout/delivery-options': () => envelope(200, deliveryOptions),
      'GET /api/products': () => envelope(200, page(products)),
    })
    renderWithProviders(routes(), '/')
    await userEvent.click(screen.getByRole('button', { name: 'Turn the handle' }))
    expect(screen.getByRole('button', { name: 'Turn again' })).toBeInTheDocument()
    expect(screen.getByText(/Practice draw\./)).toBeInTheDocument()
  })
})

describe('listing', () => {
  it('shows a category with its blurb, stock lines and quick actions', async () => {
    const fetchMock = mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/products': () => envelope(200, page(products.slice(0, 2))),
    })
    renderWithProviders(routes(), '/shop/figures')
    expect(await screen.findByRole('heading', { name: 'Figures', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Scale figures, chibi figures and model kits')).toBeInTheDocument()
    expect(await screen.findByText('Only 4 left')).toBeInTheDocument()
    expect(screen.getByText('Pre-order, arrives January 2027')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose' })).toHaveAttribute('href', '/p/ronin-swordsman')
    expect(screen.getByRole('link', { name: 'Reserve' })).toBeInTheDocument()
    const url = new URL(String(fetchMock.mock.calls.find(([u]) => String(u).includes('/api/products'))?.[0]), 'http://x')
    expect(url.searchParams.get('category')).toBe('figures')
    expect(url.searchParams.get('sortBy')).toBe('creationDate')
  })

  it('filters by stock and price through the URL and shows removable chips', async () => {
    const fetchMock = mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/products': () => envelope(200, page(products)),
    })
    renderWithProviders(routes(), '/shop')
    await screen.findByText('3 products')
    await userEvent.click(screen.getByRole('checkbox', { name: 'In stock only' }))
    await userEvent.type(screen.getByLabelText('Maximum price'), '3000{Enter}')
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/shop?inStock=1&max=3000'))
    const last = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), 'http://x')
    expect(last.searchParams.get('inStock')).toBe('true')
    expect(last.searchParams.get('maxPrice')).toBe('3000')
    await userEvent.click(screen.getByRole('button', { name: '0 to 3000 taka ×' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/shop?inStock=1')
  })

  it('merges several ticked categories', async () => {
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/products': (url) =>
        envelope(200, page(products.filter((p) => !url.searchParams.get('category') || p.categorySlug === url.searchParams.get('category')))),
    })
    renderWithProviders(routes(), '/shop?cat=figures,costumes&sort=price-asc')
    await screen.findByText('3 products')
    const names = screen.getAllByRole('article').map((a) => within(a).getAllByRole('link')[0].textContent)
    expect(names).toEqual(['Silver long wig', 'Mecha Unit-07 model kit', 'Ronin Swordsman 1/7 scale figure'])
  })

  it('invites clearing the filters when nothing matches', async () => {
    mockApi({
      'GET /api/categories': () => envelope(200, categories),
      'GET /api/products': () => envelope(200, page([])),
    })
    renderWithProviders(routes(), '/shop?inStock=1')
    expect(await screen.findByRole('heading', { name: 'Nothing matches these filters' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/shop$/)
  })
})

describe('search', () => {
  it('searches as you type and marks the match', async () => {
    const fetchMock = mockApi({
      'GET /api/products': (url) => envelope(200, url.searchParams.get('q') ? page([products[2]]) : page(products)),
    })
    renderWithProviders(routes(), '/search')
    expect(await screen.findByText('New this week')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'wig')
    expect(await screen.findByText('1 result for “wig”')).toBeInTheDocument()
    expect(screen.getByText('wig', { selector: 'mark' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('q=wig'))).toBe(true)
  })

  it('says when nothing matches', async () => {
    mockApi({ 'GET /api/products': () => envelope(200, page([])) })
    renderWithProviders(routes(), '/search?q=zzz')
    expect(await screen.findByRole('heading', { name: 'No products match “zzz”' })).toBeInTheDocument()
  })
})

describe('product image', () => {
  it('falls back to the stand-in render when a photo fails to load', async () => {
    const { ProductImage } = await import('./ProductImage')
    const { render, fireEvent } = await import('@testing-library/react')
    const { container } = render(<ProductImage slug="ronin-swordsman" url="https://cdn.invalid/x.jpg" alt="Ronin" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('canvas')).not.toBeNull()
  })
})
