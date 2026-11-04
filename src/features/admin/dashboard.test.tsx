import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { envelope, mockApi } from '../../test/api'
import { renderWithProviders, storeSession } from '../../test/render'
import { DashboardPage } from './DashboardPage'
import { adminSession, overview, totals } from './fixtures'
import { changePct, dhakaToday, periodDays, periodFor, pct } from './insightsFormat'

const routes = (
  <Routes>
    <Route path="/admin" element={<DashboardPage />} />
  </Routes>
)

/** The KPI tile with this label (the same word can appear in a table header). */
const tile = async (label: string) =>
  (await screen.findAllByText(label)).find((e) => e.classList.contains('eyebrow'))!.closest('li')!

const signals = [
  { type: 'RESTOCK_SOON', title: 'Restock soon', reason: 'Kitsune bottle: about 5.0 days of stock left (5 left, 30 sold).',
    productId: 7, productSlug: 'kitsune-bottle', term: null, categorySlug: null, value: 5 },
  { type: 'SEARCH_GAP', title: 'Searched, not found', reason: '"naruto" was searched 4 times and found nothing.',
    productId: null, productSlug: null, term: 'naruto', categorySlug: null, value: 4 },
]

describe('period helpers', () => {
  it('works in Dhaka days', () => {
    const at = new Date('2026-11-04T20:00:00Z') // 02:00 on 5 Nov in Dhaka
    expect(dhakaToday(at)).toBe('2026-11-05')
    expect(periodFor(30, at)).toEqual({ from: '2026-10-07', to: '2026-11-05' })
    expect(periodDays(periodFor(7, at))).toBe(7)
  })

  it('compares with the previous period only when there is one', () => {
    expect(changePct(120, 100)).toBe(20)
    expect(changePct(80, 100)).toBe(-20)
    expect(changePct(5, 0)).toBeNull()
    expect(pct(0.0253)).toBe('2.5%')
    expect(pct(0.25, 0)).toBe('25%')
    expect(pct(null)).toBe('–')
  })
})

describe('dashboard', () => {
  beforeEach(() => storeSession())

  it('shows the totals against the previous period, the signals and the breakdown', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/insights/overview': () =>
        envelope(200, overview(totals({ orders: 6, revenue: 12400, averageOrder: 2066.67, units: 8, cancelled: 2, cancelRate: 0.25 }),
          totals({ orders: 5, revenue: 10000, cancelRate: 0.5 }))),
      'GET /api/admin/insights/signals': () => envelope(200, signals),
      'GET /api/admin/insights/searches': () => envelope(200, { top: [{ term: 'kitsune', searches: 9, zeroResults: 0 }], zeroResults: [{ term: 'naruto', searches: 4, zeroResults: 4 }] }),
      'GET /api/admin/insights/breakdown': (url) =>
        envelope(200, url.searchParams.get('by') === 'CHARACTER'
          ? [{ name: 'Kitsune', orders: 4, units: 5, revenue: 9000, share: 0.7258 }]
          : [{ name: 'Bottles', orders: 6, units: 8, revenue: 12400, share: 1 }]),
    })
    renderWithProviders(routes, '/admin')

    const revenue = await tile('Revenue')
    expect(within(revenue).getByText('৳ 12,400')).toBeInTheDocument()
    expect(within(revenue).getByText(/▲ 24% vs the 30 days before/)).toBeInTheDocument()
    const cancelled = await tile('Cancelled')
    expect(within(cancelled).getByText('25%')).toBeInTheDocument()
    expect(within(cancelled).getByText(/▼ 50%/)).toHaveClass('up') // fewer cancellations is good

    const restock = await screen.findByRole('link', { name: /Kitsune bottle: about 5.0 days/ })
    expect(restock).toHaveAttribute('href', expect.stringContaining('/admin/products?'))
    expect(restock.getAttribute('href')).toContain('highlight=kitsune-bottle')
    expect(screen.getByText('"naruto" was searched 4 times and found nothing.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Revenue per day' })).toBeInTheDocument()

    expect(await screen.findByText('Bottles')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Character' }))
    expect(await screen.findByText('Kitsune')).toBeInTheDocument()
    const breakdownCalls = fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/breakdown'))
    expect(breakdownCalls.at(-1)).toContain('by=CHARACTER')
  })

  it('says so when the period has no orders, instead of an empty chart', async () => {
    mockApi({
      ...adminSession,
      'GET /api/admin/insights/overview': () => envelope(200, overview(totals())),
      'GET /api/admin/insights/signals': () => envelope(200, []),
      'GET /api/admin/insights/searches': () => envelope(200, { top: [], zeroResults: [] }),
      'GET /api/admin/insights/breakdown': () => envelope(200, []),
    })
    renderWithProviders(routes, '/admin')
    expect(await screen.findByText('No orders in this period.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Revenue per day' })).not.toBeInTheDocument()
    expect(screen.getByText('Nothing needs attention in this period.')).toBeInTheDocument()
    expect(await tile('Average order')).toHaveTextContent('–')
  })

  it('keeps the chosen period in the address and asks the API for it', async () => {
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/insights/overview': () => envelope(200, overview(totals())),
      'GET /api/admin/insights/signals': () => envelope(200, []),
      'GET /api/admin/insights/searches': () => envelope(200, { top: [], zeroResults: [] }),
      'GET /api/admin/insights/breakdown': () => envelope(200, []),
    })
    renderWithProviders(routes, '/admin?from=2026-10-01&to=2026-10-31')
    await screen.findByText('No orders in this period.')
    const first = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes('/overview'))
    expect(first).toContain('from=2026-10-01')
    expect(first).toContain('to=2026-10-31')
    await userEvent.setup().click(screen.getByRole('button', { name: '7 days' }))
    expect(screen.getByTestId('path').textContent).toContain(`to=${periodFor(7).to}`)
  })
})
