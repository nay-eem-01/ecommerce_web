import { productEdit as edit } from '../fixtures'
import { emptyForm, fromEdit, slugify, toRequest, validate } from './productForm'


describe('product form', () => {
  it('turns the edit view back into the same request', () => {
    const { id: _id, options, ...rest } = edit
    expect(toRequest(fromEdit(edit))).toEqual({ ...rest, options: options.map(({ id: _o, ...o }) => o) })
  })

  it('suggests a slug from the name', () => {
    expect(slugify('Kitsune Night bottle, 750 ml')).toBe('kitsune-night-bottle-750-ml')
    expect(slugify('  Ramen Cat — kids’ bottle!  ')).toBe('ramen-cat-kids-bottle')
    expect(slugify('猫')).toBe('')
  })

  it('keeps blank optional text as null and parses tags and box lines', () => {
    const f = { ...emptyForm(), name: 'X', maker: '  ', tags: 'Capacity: 1 L\n\nMaterial:Steel\nbroken line', boxItems: 'Bottle\n  \nLid ' }
    const r = toRequest(f)
    expect(r.maker).toBeNull()
    expect(r.tags).toEqual([{ group: 'Capacity', value: '1 L' }, { group: 'Material', value: 'Steel' }])
    expect(r.boxItems).toEqual(['Bottle', 'Lid'])
  })

  it('leaves images that are not uploaded yet out of the request', () => {
    const f = fromEdit(edit)
    f.images.PHOTO.push({ key: 'k', url: null, altText: '', status: 'uploading' })
    expect(toRequest(f).media).toHaveLength(3)
  })

  it('names fields that are not numbers before anything is sent', () => {
    const f = { ...fromEdit(edit), price: '14,50', stock: '3' }
    f.options[1].stock = 'ten'
    expect(validate(f)).toEqual({ price: 'Enter the price as a number, like 1450.', 'options[1].stock': 'Use a whole number, 0 or more.' })
    expect(validate(fromEdit(edit))).toEqual({})
    expect(validate({ ...fromEdit(edit), images: { ...fromEdit(edit).images, STORY: [] } })).toEqual({})
  })
})
