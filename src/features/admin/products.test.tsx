import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { renderWithProviders, storeSession } from '../../test/render'
import { adminSession, insight } from './fixtures'
import { ProductsPage } from './ProductsPage'

const routes = (
  <Routes>
    <Route path="/admin/products" element={<ProductsPage />} />
  </Routes>
)

const rows = [
  insight(),
  insight({ id: 9, slug: 'ramen-bag', name: 'Ramen Cat bag', stock: 2, daysLeft: 3, signals: ['RESTOCK_SOON'] }),
]

describe('admin products', () => {
  beforeEach(() => storeSession())

  it('sorts by a column header and shows each row’s signals', async () => {
    const fetchMock = mockApi({ ...adminSession, 'GET /api/admin/insights/products': () => envelope(200, rows) })
    renderWithProviders(routes, '/admin/products')
    const bag = (await screen.findByRole('link', { name: 'Ramen Cat bag' })).closest('tr')!
    expect(within(bag).getByText('Restock')).toBeInTheDocument()
    expect(within(bag).getAllByRole('cell')[2]).toHaveTextContent('3')

    await userEvent.setup().click(screen.getByRole('button', { name: /Sold/ }))
    const last = fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/insights/products')).at(-1)
    expect(last).toContain('sort=units')
    expect(last).toContain('dir=desc')
    expect(screen.getByRole('columnheader', { name: /Sold/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('marks the product a signal pointed at', async () => {
    mockApi({ ...adminSession, 'GET /api/admin/insights/products': () => envelope(200, rows) })
    renderWithProviders(routes, '/admin/products?highlight=ramen-bag')
    const bag = (await screen.findByRole('link', { name: 'Ramen Cat bag' })).closest('tr')!
    expect(bag).toHaveClass('hl')
  })

  it('edits stock per option and shows the backend’s message when it refuses', async () => {
    let patches = 0
    const fetchMock = mockApi({
      ...adminSession,
      'GET /api/admin/insights/products': () => envelope(200, rows),
      'GET /api/admin/products/7/stock': () =>
        envelope(200, { productId: 7, stock: 4, options: [{ id: 1, value: 'Petal pink', stock: 4 }, { id: 2, value: 'Night navy', stock: 0 }] }),
      'PATCH /api/admin/products/7/stock': () =>
        ++patches === 1 ? envelope(200, {}) : envelope(400, null, 'Option not found.'),
    })
    renderWithProviders(routes, '/admin/products')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit stock of Kitsune bottle' }))
    const navy = await screen.findByLabelText('Night navy')
    await user.clear(navy)
    await user.type(navy, '12')
    await user.click(screen.getByRole('button', { name: 'Save stock' }))
    expect(await screen.findByText('Stock saved.')).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/products/7/stock') && i?.method === 'PATCH')
    expect(bodyOf(patch?.[1])).toEqual({ optionId: 2, stock: 12 })

    const pink = screen.getByLabelText('Petal pink')
    await user.clear(pink)
    await user.type(pink, '-1')
    expect(screen.getByText('Use a whole number, 0 or more.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save stock' })).toBeDisabled()
    await user.clear(pink)
    await user.type(pink, '3')
    await user.click(screen.getByRole('button', { name: 'Save stock' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Option not found.')
  })
})
