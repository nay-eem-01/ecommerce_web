import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { bodyOf, envelope, mockApi, page } from '../../test/api'
import { categories, characters, summary } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { HomePage } from './HomePage'

const set = summary({ id: 20, slug: 'kitsune-school-run-set', name: 'Kitsune school-run set', specLine: 'Backpack + 750 ml bottle', price: 3990, compareAtPrice: 4400, set: true })

function api(extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/categories': () => envelope(200, categories),
    'GET /api/characters': () => envelope(200, characters),
    'GET /api/products': (url) =>
      envelope(200, url.searchParams.get('set') === 'true' ? page([set]) : { ...page([summary(), set]), totalElements: 11 }),
    ...extra,
  })
}

const renderHome = () => renderWithProviders(<Routes><Route path="/" element={<HomePage />} /></Routes>, '/')

describe('home', () => {
  it('opens with the drop and its call to shop', async () => {
    api()
    renderHome()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Carry your character.')
    expect(screen.getByText('Drop 01 · Back to school')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Shop the drop' })).toHaveAttribute('href', '/shop')
    expect(await screen.findByRole('link', { name: 'Shop all 11' })).toHaveAttribute('href', '/shop')
  })

  it('tiles the categories on sale and the characters with their counts', async () => {
    api()
    renderHome()
    expect(await screen.findByRole('link', { name: /Bottles\s*3 items/ })).toHaveAttribute('href', '/shop/bottles')
    expect(await screen.findByRole('link', { name: /Kitsune\s*4 pieces/ })).toHaveAttribute('href', '/characters/kitsune')
  })

  it('features the set with its saving', async () => {
    api()
    renderHome()
    const card = (await screen.findByText('Backpack and bottle, matched.')).closest('a') as HTMLElement
    expect(card).toHaveAttribute('href', '/p/kitsune-school-run-set')
    expect(within(card).getByText('Set · save ৳ 410')).toBeInTheDocument()
    expect(within(card).getByText('৳ 4,400')).toHaveClass('was')
  })

  it('takes an early-access signup for a coming-soon category', async () => {
    const fetchMock = api({ 'POST /api/early-access': () => envelope(200, null, 'You are on the list.') })
    renderHome()
    const buttons = await screen.findAllByRole('button', { name: /Apparel/ })
    await userEvent.click(buttons[0])
    const dialog = screen.getByRole('dialog', { name: 'Apparel: get first access' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Get first access' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a mobile number or an email')
    await userEvent.type(within(dialog).getByLabelText('Mobile number'), '01712345678')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Get first access' }))
    expect(await within(dialog).findByText(/You are on the list/)).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/early-access'))
    expect(bodyOf(call?.[1])).toEqual({ categorySlug: 'apparel', phone: '01712345678' })
  })
})
