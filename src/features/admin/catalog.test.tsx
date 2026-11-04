import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { bodyOf, envelope, mockApi } from '../../test/api'
import { renderWithProviders, storeSession } from '../../test/render'
import { CatalogPage } from './CatalogPage'
import { adminSession } from './fixtures'

const routes = (
  <Routes>
    <Route path="/admin/catalog" element={<CatalogPage />} />
  </Routes>
)

const bottles = { id: 3, slug: 'bottles', name: 'Bottles', label: '水', blurb: 'Steel and tritan.', sortOrder: 1, active: true, productCount: 4, comingSoon: false }
const kitsune = { id: 4, slug: 'kitsune', name: 'Kitsune', label: '狐', blurb: null, sortOrder: 0, active: true, productCount: 3 }
const lists = {
  ...adminSession,
  'GET /api/admin/categories': () => envelope(200, [bottles]),
  'GET /api/admin/characters': () => envelope(200, [kitsune]),
}
const sent = (fetchMock: ReturnType<typeof mockApi>, method: string) =>
  bodyOf(fetchMock.mock.calls.filter(([, i]) => i?.method === method).at(-1)?.[1])

describe('admin catalog', () => {
  beforeEach(() => storeSession())
  afterEach(() => vi.restoreAllMocks())

  it('creates a category with a slug from its name', async () => {
    const fetchMock = mockApi({ ...lists, 'POST /api/admin/categories': () => envelope(201, {}) })
    renderWithProviders(routes, '/admin/catalog')
    const user = userEvent.setup()
    const section = await screen.findByRole('region', { name: 'Categories' })
    await user.click(within(section).getByRole('button', { name: 'New category' }))
    const form = within(section).getByRole('form', { name: 'New category' })
    await user.type(within(form).getByLabelText('Name'), 'School bags')
    await user.type(within(form).getByLabelText('Sign'), '鞄')
    await user.click(within(form).getByLabelText(/Coming soon/))
    await user.click(within(form).getByRole('button', { name: 'Create category' }))
    expect(sent(fetchMock, 'POST')).toEqual({
      slug: 'school-bags', name: 'School bags', label: '鞄', blurb: null, sortOrder: 0, active: true, comingSoon: true,
    })
  })

  it('edits a category inline and keeps its slug', async () => {
    const fetchMock = mockApi({ ...lists, 'PUT /api/admin/categories/3': () => envelope(200, {}) })
    renderWithProviders(routes, '/admin/catalog')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit Bottles' }))
    const form = screen.getByRole('form', { name: 'Edit Bottles' })
    const name = within(form).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Water bottles')
    await user.click(within(form).getByRole('button', { name: 'Save' }))
    expect(sent(fetchMock, 'PUT')).toMatchObject({ slug: 'bottles', name: 'Water bottles', label: '水', sortOrder: 1, comingSoon: false })
  })

  it('asks before deleting and shows the backend refusal while products use it', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true)
    const fetchMock = mockApi({
      ...lists,
      'DELETE /api/admin/categories/3': () => envelope(409, null, 'This category still has products. Move or archive them first.'),
    })
    renderWithProviders(routes, '/admin/catalog')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Bottles' }))
    expect(confirm).toHaveBeenCalled()
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Delete Bottles' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This category still has products.')
  })

  it('creates a character without the coming-soon flag', async () => {
    const fetchMock = mockApi({ ...lists, 'POST /api/admin/characters': () => envelope(201, {}) })
    renderWithProviders(routes, '/admin/catalog')
    const user = userEvent.setup()
    const section = await screen.findByRole('region', { name: 'Characters' })
    await user.click(within(section).getByRole('button', { name: 'New character' }))
    const form = within(section).getByRole('form', { name: 'New character' })
    expect(within(form).queryByLabelText(/Coming soon/)).not.toBeInTheDocument()
    await user.type(within(form).getByLabelText('Name'), 'Ramen Cat')
    await user.click(within(form).getByRole('button', { name: 'Create character' }))
    expect(sent(fetchMock, 'POST')).toEqual({ slug: 'ramen-cat', name: 'Ramen Cat', label: null, blurb: null, sortOrder: 0, active: true })
  })
})
