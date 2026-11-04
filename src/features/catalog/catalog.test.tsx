import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { Facets } from '../../api/types'
import { envelope, mockApi, page } from '../../test/api'
import { categories, characters, summary } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { SearchPage, readRecent } from '../search/SearchPage'
import { CharactersPage } from './CharactersPage'
import { ListingPage } from './ListingPage'
import { activeCount, readFilters, toggleTag, writeFilters } from './listingQuery'

const bottles = [
  summary({ id: 1, slug: 'kitsune-night-bottle', name: 'Kitsune Night steel bottle, 750 ml', price: 1450, characterSlug: 'kitsune', newArrival: true }),
  summary({ id: 2, slug: 'ramen-cat-bottle', name: 'Ramen Cat kids bottle, 500 ml', price: 890, stockState: 'LOW_STOCK', stockLeft: 3 }),
  summary({ id: 3, slug: 'ronin-bottle', name: 'Ronin black steel bottle, 1 L', price: 1650 }),
  summary({ id: 4, slug: 'sakura-shaker', name: 'Sakura tritan shaker, 600 ml', price: 950 }),
  summary({ id: 5, slug: 'kitsune-tritan-bottle', name: 'Kitsune tritan bottle, 500 ml', price: 790, stockState: 'PREORDER' }),
]
const set = summary({ id: 9, slug: 'kitsune-school-run-set', name: 'Kitsune school-run set', price: 3990, compareAtPrice: 4400, set: true })
const facets: Facets = {
  groups: [
    { name: 'Capacity', values: [{ value: '500 ml', count: 2 }, { value: '750 ml', count: 1 }, { value: '1 L', count: 1 }] },
    { name: 'Material', values: [{ value: 'Steel', count: 2 }, { value: 'Tritan', count: 3 }] },
  ],
}

function api() {
  return mockApi({
    'GET /api/categories': () => envelope(200, categories),
    'GET /api/characters': () => envelope(200, characters),
    'GET /api/products/facets': () => envelope(200, facets),
    'GET /api/products': (url) => envelope(200, url.searchParams.get('set') === 'true' ? page([set]) : { ...page(bottles), totalElements: 14, last: false }),
  })
}

const routes = (
  <Routes>
    <Route path="/shop" element={<ListingPage mode="all" />} />
    <Route path="/shop/:category" element={<ListingPage mode="category" />} />
    <Route path="/sets" element={<ListingPage mode="sets" />} />
    <Route path="/characters" element={<CharactersPage />} />
    <Route path="/characters/:character" element={<ListingPage mode="character" />} />
    <Route path="/search" element={<SearchPage />} />
  </Routes>
)

/** The last listing request, skipping the one-item set promo query. */
const lastProductsUrl = (fetchMock: ReturnType<typeof api>) =>
  fetchMock.mock.calls
    .map(([u]) => new URL(String(u), 'http://x'))
    .filter((u) => u.pathname === '/api/products' && u.searchParams.get('set') !== 'true')
    .at(-1) ?? new URL('http://x')

describe('listing filters in the URL', () => {
  it('round-trips tags, character, stock, price and sort', () => {
    const p = writeFilters({ tags: ['Capacity:750 ml', 'Material:Steel'], character: 'kitsune', inStock: true, min: 500, max: 2000, sort: 'price-asc' })
    expect(readFilters(p)).toEqual({ tags: ['Capacity:750 ml', 'Material:Steel'], character: 'kitsune', inStock: true, min: 500, max: 2000, sort: 'price-asc' })
    expect(readFilters(new URLSearchParams('tag=bad&sort=hack'))).toMatchObject({ tags: [], sort: 'newest' })
    expect(toggleTag(['A:1'], 'A:1')).toEqual([])
    expect(activeCount(readFilters(p))).toBe(5)
  })
})

describe('listing', () => {
  it('shows a category with its sign, count, cards and the set card after the first row', async () => {
    const fetchMock = api()
    renderWithProviders(routes, '/shop/bottles')
    expect(await screen.findByRole('heading', { level: 1, name: /Bottles/ })).toBeInTheDocument()
    expect((await screen.findAllByText('14 items')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Only 3 left')).toBeInTheDocument()
    const setCard = (await screen.findByText('See the set')).closest('a')
    expect(setCard).toHaveAttribute('href', '/p/kitsune-school-run-set')
    expect(lastProductsUrl(fetchMock).searchParams.get('category')).toBe('bottles')
    expect(screen.getByText('Showing 5 of 14')).toBeInTheDocument()
  })

  it('filters by character chip and by facet chips in the sheet, through the URL', async () => {
    const fetchMock = api()
    renderWithProviders(routes, '/shop/bottles')
    const chips = within(await screen.findByRole('group', { name: 'Character' }))
    await userEvent.click(await chips.findByRole('button', { name: 'Kitsune' }))
    await userEvent.click(screen.getByRole('button', { name: /Filter and sort/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Filter and sort' }))
    await userEvent.click(await sheet.findByRole('button', { name: /750 ml/ }))
    await userEvent.click(sheet.getByRole('button', { name: /Steel/ }))
    await userEvent.click(sheet.getByRole('button', { name: 'Price, low to high' }))
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/shop/bottles?tag=Capacity%3A750+ml&tag=Material%3ASteel&char=kitsune&sort=price-asc'))
    const url = lastProductsUrl(fetchMock)
    expect(url.searchParams.getAll('tag')).toEqual(['Capacity:750 ml', 'Material:Steel'])
    expect(url.searchParams.get('character')).toBe('kitsune')
    expect(url.searchParams.get('sortBy')).toBe('price')
    await userEvent.click(sheet.getByRole('button', { name: 'Show 14 results' }))
    expect(screen.queryByRole('dialog', { name: 'Filter and sort' })).not.toBeInTheDocument()
  })

  it('filters from the desktop bar dropdowns', async () => {
    api()
    renderWithProviders(routes, '/shop/bottles')
    await userEvent.click(await screen.findByRole('button', { name: 'Material' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Tritan/ }))
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('tag=Material%3ATritan'))
    expect(screen.getByRole('button', { name: 'Material · Tritan' })).toHaveClass('active')
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/shop\/bottles$/)
  })

  it('switches the phone grid between two and one per row and remembers it', async () => {
    api()
    renderWithProviders(routes, '/shop/bottles')
    await userEvent.click(await screen.findByRole('button', { name: 'One per row' }))
    expect(screen.getByRole('button', { name: 'One per row' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('senpai.grid')).toBe('one')
  })

  it('lists a character collection and the sets', async () => {
    const fetchMock = api()
    renderWithProviders(routes, '/characters/kitsune')
    expect(await screen.findByRole('heading', { level: 1, name: /Kitsune/ })).toBeInTheDocument()
    await waitFor(() => expect(lastProductsUrl(fetchMock).searchParams.get('character')).toBe('kitsune'))
  })

  it('shows a coming-soon category as an early-access page', async () => {
    api()
    renderWithProviders(routes, '/shop/apparel')
    expect(await screen.findByRole('heading', { level: 1, name: 'Apparel' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Get first access' }))
    expect(screen.getByRole('dialog', { name: 'Apparel: get first access' })).toBeInTheDocument()
  })

  it('shows not found for an unknown category', async () => {
    api()
    renderWithProviders(routes, '/shop/nope')
    expect(await screen.findByRole('heading', { name: 'This page moved' })).toBeInTheDocument()
  })

  it('lists every character on the characters page', async () => {
    api()
    renderWithProviders(routes, '/characters')
    expect(await screen.findByRole('link', { name: /Ramen Cat/ })).toHaveAttribute('href', '/characters/ramen-cat')
  })
})

describe('search', () => {
  it('suggests characters, marks the match and remembers the search', async () => {
    api()
    renderWithProviders(routes, '/search')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'kits')
    expect(await screen.findByRole('link', { name: /Kitsune collection/ })).toHaveAttribute('href', '/characters/kitsune')
    expect(await screen.findByText('14 products for “kits”')).toBeInTheDocument()
    expect(screen.getAllByText('Kits', { selector: 'mark' }).length).toBeGreaterThan(0)
    expect(readRecent()).toEqual(['kits'])
  })

  it('offers popular and recent searches when empty', async () => {
    localStorage.setItem('senpai.recentSearches', JSON.stringify(['ronin']))
    api()
    renderWithProviders(routes, '/search')
    expect(screen.getByRole('button', { name: 'ronin' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Kitsune' }))
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/search?q=Kitsune'))
  })
})
