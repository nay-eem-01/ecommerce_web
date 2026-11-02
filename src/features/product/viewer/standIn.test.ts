import { categorySpec, hexToRgb, oklchToRgb, specFor } from './standIn'

describe('stand-in render specs', () => {
  it('uses the prototype look of a demo product', () => {
    expect(specFor('ita-backpack', 'bags').kind).toBe('bag')
    expect(specFor('canvas-tote', 'bags').kind).toBe('tote')
  })

  it('falls back to the category look, then to a bottle', () => {
    expect(specFor('new-figure', 'figures')).toEqual(specFor('ronin-swordsman'))
    expect(specFor('unknown', 'unknown').kind).toBe('bottle')
    expect(categorySpec('costumes')).toEqual(specFor('kitsune-set'))
  })

  it('takes a colour option’s swatch as the main colour', () => {
    expect(specFor('sakura-bottle', 'bottles', '#1f2a4d').a).toEqual([31, 42, 77])
    expect(specFor('sakura-bottle', 'bottles', 'navy').a).toEqual(specFor('sakura-bottle').a)
  })

  it('converts colours', () => {
    expect(hexToRgb('#f4a6c0')).toEqual([244, 166, 192])
    expect(hexToRgb('')).toBeNull()
    expect(oklchToRgb(100, 0, 0)).toEqual([255, 255, 255])
    expect(oklchToRgb(0, 0, 0)).toEqual([0, 0, 0])
  })
})
