import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BagDrawer } from '../cart/Bag'
import { mockApi } from '../../test/api'
import { summary } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { ProductCard, cardTag } from './ProductCard'

const swatches = [
  { optionId: 11, value: 'Petal pink', swatch: '#f2a7c3', stockState: 'IN_STOCK' as const },
  { optionId: 12, value: 'Night navy', swatch: '#1f2a4d', stockState: 'IN_STOCK' as const },
]

describe('card tag', () => {
  it('shows one tag, most useful first', () => {
    expect(cardTag(summary({ set: true, price: 3990, compareAtPrice: 4400 }))?.text).toBe('Set · save ৳ 410')
    expect(cardTag(summary({ compareAtPrice: 1650, price: 1450 }))?.text).toBe('Save ৳ 200')
    expect(cardTag(summary({ stockState: 'PREORDER' }))).toEqual({ text: 'Pre-order', tone: 'cyan' })
    expect(cardTag(summary({ stockState: 'LOW_STOCK', stockLeft: 3 }))?.text).toBe('Only 3 left')
    expect(cardTag(summary({ newArrival: true }))?.text).toBe('New')
    expect(cardTag(summary())).toBeNull()
  })
})

describe('product card', () => {
  it('shows the picture, name, price, saving and colour dots', () => {
    mockApi({})
    renderWithProviders(<ProductCard product={summary({ price: 1450, compareAtPrice: 1650, swatches })} />)
    expect(screen.getAllByRole('link', { name: 'Sakura steel bottle, 750 ml' })[0]).toHaveAttribute('href', '/p/sakura-bottle')
    expect(screen.getByText('৳ 1,650')).toHaveClass('was')
    expect(screen.getByLabelText('2 colours')).toBeInTheDocument()
  })

  it('quick-adds the chosen colour and opens the bag', async () => {
    mockApi({})
    renderWithProviders(
      <>
        <BagDrawer />
        <ProductCard product={summary({ hasOptions: true, swatches })} />
      </>,
    )
    const colours = within(screen.getByRole('group', { name: 'Colour for Sakura steel bottle, 750 ml' }))
    await userEvent.click(colours.getByRole('button', { name: 'Night navy' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
    expect(JSON.parse(localStorage.getItem('senpai.cart') ?? '[]')).toEqual([{ productId: 7, optionId: 12, quantity: 1 }])
    expect(await screen.findByRole('dialog', { name: /Your bag/ })).toHaveTextContent('1 item')
  })

  it('has no quick add when the choice is not a colour, or when sold out', () => {
    mockApi({})
    renderWithProviders(
      <>
        <ProductCard product={summary({ id: 1, hasOptions: true, swatches: [] })} />
        <ProductCard product={summary({ id: 2, slug: 'x', stockState: 'SOLD_OUT' })} />
      </>,
    )
    expect(screen.queryByRole('button', { name: 'Add to bag' })).not.toBeInTheDocument()
  })

  it('saves to the wishlist with the heart', async () => {
    mockApi({})
    renderWithProviders(<ProductCard product={summary()} />)
    const heart = screen.getByRole('button', { name: 'Save Sakura steel bottle, 750 ml to wishlist' })
    await userEvent.click(heart)
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(localStorage.getItem('senpai.wishlist') ?? '[]')).toEqual([7])
  })
})
