import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { ProductRequestBody } from '../../../api/types'
import { bodyOf, envelope, mockApi, page } from '../../../test/api'
import { renderWithProviders, storeSession } from '../../../test/render'
import { adminSession, productEdit } from '../fixtures'
import { ProductEditorPage } from './ProductEditorPage'
import { fromEdit, toRequest } from './productForm'

const routes = (
  <Routes>
    <Route path="/admin/products" element={<p>products list</p>} />
    <Route path="/admin/products/:id" element={<ProductEditorPage />} />
  </Routes>
)

const lookups = {
  ...adminSession,
  'GET /api/admin/categories': () => envelope(200, [{ id: 3, slug: 'bottles', name: 'Bottles', label: null, blurb: null, sortOrder: 0, active: true, productCount: 4, comingSoon: false }]),
  'GET /api/admin/characters': () => envelope(200, [{ id: 4, slug: 'kitsune', name: 'Kitsune', label: '狐', blurb: null, sortOrder: 0, active: true, productCount: 3 }]),
  'GET /api/admin/products': () => envelope(200, page([])),
  'GET /api/admin/products/7/edit': () => envelope(200, productEdit),
}

const png = (name: string) => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' })
const nameOf = (init: RequestInit | undefined) => ((init!.body as FormData).get('file') as File).name
const putBody = (fetchMock: ReturnType<typeof mockApi>) =>
  bodyOf(fetchMock.mock.calls.filter(([, i]) => i?.method === 'PUT').at(-1)?.[1]) as ProductRequestBody

describe('product editor', () => {
  beforeEach(() => storeSession())
  afterEach(() => vi.restoreAllMocks())

  it('saves the document it loaded with only the edited field changed', async () => {
    const fetchMock = mockApi({ ...lookups, 'PUT /api/admin/products/7': () => envelope(200, { id: 7 }) })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    const summary = await screen.findByLabelText('Summary')
    await user.clear(summary)
    await user.type(summary, 'Steel, 750 ml, keeps tea hot.')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
    expect(putBody(fetchMock)).toEqual({ ...toRequest(fromEdit(productEdit)), summary: 'Steel, 750 ml, keeps tea hot.' })
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('creates a product and goes to its edit page', async () => {
    const fetchMock = mockApi({ ...lookups, 'POST /api/admin/products': () => envelope(201, { id: 7 }) })
    renderWithProviders(routes, '/admin/products/new')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Name'), 'Kitsune Night bottle, 750 ml')
    expect(screen.getByLabelText('Address name (slug)')).toHaveValue('kitsune-night-bottle-750-ml')
    await user.selectOptions(screen.getByLabelText('Category'), '3')
    await user.type(screen.getByLabelText('Summary'), 'Steel.')
    await user.type(screen.getByLabelText('Price (৳)'), '1450')
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/admin/products/7'))
    const body = bodyOf(fetchMock.mock.calls.find(([u, i]) => i?.method === 'POST' && String(u).endsWith('/api/admin/products'))?.[1]) as ProductRequestBody
    expect(body).toMatchObject({ slug: 'kitsune-night-bottle-750-ml', categoryId: 3, price: 1450, status: 'DRAFT', stock: 0, media: [] })
  })

  it('shows field errors from the backend beside the field', async () => {
    mockApi({
      ...lookups,
      'PUT /api/admin/products/7': () => envelope(400, { field: 'options[1].stock' }, 'Stock is too large.'),
    })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    const stock = screen.getByLabelText('Stock (option 2)')
    expect(await screen.findByText('Stock is too large.')).toBeInTheDocument()
    expect(stock.closest('.field')).toHaveTextContent('Stock is too large.')
    expect(stock).toHaveFocus()
  })

  it('checks numbers before sending anything', async () => {
    const fetchMock = mockApi(lookups)
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    const price = await screen.findByLabelText('Price (৳)')
    await user.clear(price)
    await user.type(price, '14,50')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(price.closest('.field')).toHaveTextContent('Enter the price as a number, like 1450.')
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(false)
  })

  it('uploads many frames in file-name order', async () => {
    const fetchMock = mockApi({
      ...lookups,
      'POST /api/admin/uploads': (_, init) => envelope(201, { url: `https://cdn/${nameOf(init).replace('.png', '')}.webp` }),
      'PUT /api/admin/products/7': () => envelope(200, { id: 7 }),
    })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    const frames = await screen.findByRole('group', { name: '360 frames' })
    await user.upload(within(frames).getByLabelText(/Add images/), [png('frame-10.png'), png('frame-2.png'), png('frame-1.png')])
    // thumbnails are decorative (alt=""), so count the images themselves
    await waitFor(() => expect(frames.querySelectorAll('img')).toHaveLength(5))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved.')
    const urls = putBody(fetchMock).media.filter((m) => m.kind === 'SPIN_FRAME').map((m) => m.url)
    expect(urls).toEqual(['https://cdn/s1.webp', 'https://cdn/s2.webp', 'https://cdn/frame-1.webp', 'https://cdn/frame-2.webp', 'https://cdn/frame-10.webp'])
  })

  it('uploads at most three images at a time', async () => {
    const pending: Array<() => void> = []
    mockApi({
      ...lookups,
      'POST /api/admin/uploads': (_, init) =>
        new Promise<Response>((resolve) => pending.push(() => resolve(envelope(201, { url: `https://cdn/${nameOf(init)}.webp` })))),
    })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    const photos = await screen.findByRole('group', { name: 'Photos' })
    await user.upload(within(photos).getByLabelText(/Add images/), ['1', '2', '3', '4', '5'].map((n) => png(`${n}.png`)))
    await waitFor(() => expect(pending).toHaveLength(3))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled() // waits for uploads
    pending[0]()
    await waitFor(() => expect(pending).toHaveLength(4))
    pending.slice(1).forEach((done) => done())
    await waitFor(() => expect(pending).toHaveLength(5))
    pending[4]()
    await waitFor(() => expect(photos.querySelectorAll('img')).toHaveLength(6))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('a failed upload stays in place and can be retried', async () => {
    let tries = 0
    const fetchMock = mockApi({
      ...lookups,
      'POST /api/admin/uploads': (_, init) =>
        nameOf(init) === 'b.png' && ++tries === 1
          ? envelope(400, null, 'That image could not be read. Save it again as an RGB JPEG or PNG and retry.')
          : envelope(201, { url: `https://cdn/${nameOf(init).replace('.png', '')}.webp` }),
      'PUT /api/admin/products/7': () => envelope(200, { id: 7 }),
    })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    const photos = await screen.findByRole('group', { name: 'Photos' })
    await user.upload(within(photos).getByLabelText(/Add images/), [png('a.png'), png('b.png'), png('c.png')])
    expect(await within(photos).findByRole('alert')).toHaveTextContent('b.png: That image could not be read.')
    // while one is failed the save leaves it out; saving is allowed
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    await user.click(within(photos).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(within(photos).queryByRole('alert')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved.')
    const urls = putBody(fetchMock).media.filter((m) => m.kind === 'PHOTO').map((m) => m.url)
    expect(urls).toEqual(['https://cdn/p1.webp', 'https://cdn/a.webp', 'https://cdn/b.webp', 'https://cdn/c.webp'])
  })

  it('moves an image with the keyboard buttons', async () => {
    const fetchMock = mockApi({ ...lookups, 'PUT /api/admin/products/7': () => envelope(200, { id: 7 }) })
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Move 360 frames 2 earlier' }))
    expect(screen.getByRole('button', { name: 'Move 360 frames 1 earlier' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved.')
    expect(putBody(fetchMock).media.filter((m) => m.kind === 'SPIN_FRAME').map((m) => m.url)).toEqual(['https://cdn/s2.webp', 'https://cdn/s1.webp'])
  })

  it('asks before leaving with unsaved changes', async () => {
    mockApi(lookups)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWithProviders(routes, '/admin/products/7')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Maker'), 'Senpai')
    await user.click(screen.getByRole('link', { name: 'Products' }))
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?')
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/products/7')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/products/7')
    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('products list')).toBeInTheDocument()
  })
})
