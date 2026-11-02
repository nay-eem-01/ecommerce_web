import { sortProducts } from '../api/catalog'
import { summary } from '../test/fixtures'
import { stockLine } from './stock'
import { highlightParts, leadIn, paragraphs } from './text'

describe('stockLine', () => {
  it('words each state as the prototype does', () => {
    expect(stockLine({ stockState: 'IN_STOCK', stockLeft: null })).toEqual({ text: 'In stock', tone: 'ok' })
    expect(stockLine({ stockState: 'LOW_STOCK', stockLeft: 3 })).toEqual({ text: 'Only 3 left', tone: 'low' })
    expect(stockLine({ stockState: 'SOLD_OUT', stockLeft: null }).text).toBe('Sold out')
    expect(stockLine({ stockState: 'PREORDER', stockLeft: null, preorderRelease: '2027-01' }).text).toBe('Pre-order, arrives January 2027')
  })
})

describe('text', () => {
  it('splits paragraphs at blank lines', () => {
    expect(paragraphs('One.\n\nTwo\nlines.\n \nThree.')).toEqual(['One.', 'Two\nlines.', 'Three.'])
    expect(paragraphs(null)).toEqual([])
  })

  it('finds a short lead-in like "Who it is for:"', () => {
    expect(leadIn('Who it is for: collectors.')).toEqual(['Who it is for:', 'collectors.'])
    expect(leadIn('Plain sentence. Time: 4 hours')).toEqual([null, 'Plain sentence. Time: 4 hours'])
  })

  it('marks the first match, ignoring case', () => {
    expect(highlightParts('Silver long wig', 'WIG')).toEqual(['Silver long ', 'wig', ''])
    expect(highlightParts('Tote', 'bag')).toBeNull()
    expect(highlightParts('Tote', ' ')).toBeNull()
  })
})

describe('sortProducts', () => {
  const list = [summary({ id: 1, name: 'B', price: 300 }), summary({ id: 2, name: 'A', price: 100 }), summary({ id: 3, name: 'C', price: 200 })]
  it('sorts merged lists like the API', () => {
    expect(sortProducts(list, 'price-asc').map((p) => p.id)).toEqual([2, 3, 1])
    expect(sortProducts(list, 'price-desc').map((p) => p.id)).toEqual([1, 3, 2])
    expect(sortProducts(list, 'name').map((p) => p.id)).toEqual([2, 1, 3])
    expect(sortProducts(list, 'newest').map((p) => p.id)).toEqual([3, 2, 1])
  })
})
