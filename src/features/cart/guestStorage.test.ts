import { addLine, readGuestCart, setLine, writeGuestCart } from './guestStorage'

describe('guest cart', () => {
  it('adds to an existing line and caps at 10', () => {
    const one = addLine([], { productId: 1, optionId: 2, quantity: 4 })
    expect(addLine(one, { productId: 1, optionId: 2, quantity: 9 })).toEqual([{ productId: 1, optionId: 2, quantity: 10 }])
    expect(addLine(one, { productId: 1, optionId: null, quantity: 1 })).toHaveLength(2)
  })

  it('sets and removes lines', () => {
    const lines = [{ productId: 1, optionId: null, quantity: 2 }]
    expect(setLine(lines, { productId: 1, optionId: null, quantity: 5 })[0].quantity).toBe(5)
    expect(setLine(lines, { productId: 1, optionId: null, quantity: 0 })).toEqual([])
  })

  it('ignores tampered storage', () => {
    localStorage.setItem('senpai.cart', '{"not":"a list"}')
    expect(readGuestCart()).toEqual([])
    localStorage.setItem('senpai.cart', '[{"productId":1,"quantity":99},{"productId":"x"}]')
    expect(readGuestCart()).toEqual([{ productId: 1, optionId: null, quantity: 10 }])
    writeGuestCart([])
    expect(localStorage.getItem('senpai.cart')).toBeNull()
  })
})
