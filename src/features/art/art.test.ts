import { artFor } from './art'

describe('stand-in art', () => {
  it('uses the design look of a demo product', () => {
    expect(artFor({ slug: 'ronin-sling' }).kind).toBe('sling')
    expect(artFor({ slug: 'kitsune-school-run-set' }).kind).toBe('set')
  })

  it('falls back to the set, character, then category look', () => {
    expect(artFor({ slug: 'new-set', set: true }).kind).toBe('set')
    expect(artFor({ slug: 'new-bag', categorySlug: 'bags', characterSlug: 'kitsune' })).toMatchObject({ kind: 'pack', face: 'fox' })
    expect(artFor({ slug: 'new-bottle', categorySlug: 'bottles', characterSlug: 'ronin' })).toMatchObject({ kind: 'bottle', face: 'ronin' })
    expect(artFor({ slug: 'new-tee', categorySlug: 'apparel' }).kind).toBe('tee')
  })

  it('takes a colour swatch as the body colour, ignoring anything that is not a hex colour', () => {
    expect(artFor({ slug: 'kitsune-night-bottle' }, '#1f2a4d').a).toBe('#1f2a4d')
    expect(artFor({ slug: 'kitsune-night-bottle' }, 'url(x)').a).toBe('#f2a7c3')
  })
})
