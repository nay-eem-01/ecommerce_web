import type { MediaKind, ProductEdit, ProductRequestBody, ProductStatus } from '../../../api/types'

export const MEDIA_KINDS: MediaKind[] = ['PHOTO', 'SPIN_FRAME', 'STORY']

/** An image in the editor: uploaded (`url`), waiting, uploading, or failed (kept in place to retry). */
export interface ImageItem {
  key: string
  url: string | null
  altText: string
  status: 'done' | 'queued' | 'uploading' | 'failed'
  file?: File
  error?: string
}

/** The editor's state: text as typed (numbers too), so a half-typed value is never lost or rounded. */
export interface ProductForm {
  slug: string
  categoryId: string
  characterId: string
  name: string
  maker: string
  summary: string
  description: string
  story: string
  storyQuote: string
  specLine: string
  price: string
  compareAtPrice: string
  stock: string
  preorder: boolean
  preorderRelease: string
  deposit: string
  sized: boolean
  status: ProductStatus
  optionName: string
  options: Array<{ key: string; value: string; priceDelta: string; stock: string; swatch: string }>
  facts: Array<{ key: string; label: string; value: string }>
  /** One per line. */
  boxItems: string
  /** "Group: Value", one per line. */
  tags: string
  bundleProductIds: number[]
  images: Record<MediaKind, ImageItem[]>
}

let seq = 0
export const newKey = () => `k${++seq}`

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v))
const text = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))
const isWhole = (s: string) => /^\d{1,7}$/.test(s.trim())
const isMoney = (s: string) => /^\d{1,10}(\.\d{1,2})?$/.test(s.trim())

export function emptyForm(): ProductForm {
  return {
    slug: '', categoryId: '', characterId: '', name: '', maker: '', summary: '', description: '', story: '',
    storyQuote: '', specLine: '', price: '', compareAtPrice: '', stock: '0', preorder: false, preorderRelease: '',
    deposit: '', sized: false, status: 'DRAFT', optionName: '', options: [], facts: [], boxItems: '', tags: '',
    bundleProductIds: [], images: { PHOTO: [], SPIN_FRAME: [], STORY: [] },
  }
}

export function fromEdit(e: ProductEdit): ProductForm {
  const images: ProductForm['images'] = { PHOTO: [], SPIN_FRAME: [], STORY: [] }
  for (const m of e.media) images[m.kind].push({ key: newKey(), url: m.url, altText: m.altText ?? '', status: 'done' })
  return {
    slug: e.slug, categoryId: str(e.categoryId), characterId: str(e.characterId), name: e.name, maker: str(e.maker),
    summary: e.summary, description: str(e.description), story: str(e.story), storyQuote: str(e.storyQuote),
    specLine: str(e.specLine), price: str(e.price), compareAtPrice: str(e.compareAtPrice), stock: str(e.stock),
    preorder: e.preorder, preorderRelease: str(e.preorderRelease), deposit: str(e.deposit), sized: e.sized,
    status: e.status, optionName: str(e.optionName),
    options: e.options.map((o) => ({ key: newKey(), value: o.value, priceDelta: str(o.priceDelta), stock: str(o.stock), swatch: str(o.swatch) })),
    facts: e.facts.map((f) => ({ key: newKey(), ...f })),
    boxItems: e.boxItems.join('\n'),
    tags: e.tags.map((t) => `${t.group}: ${t.value}`).join('\n'),
    bundleProductIds: [...e.bundleProductIds],
    images,
  }
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

/** The whole document the backend saves. Images still uploading or failed are left out. */
export function toRequest(f: ProductForm): ProductRequestBody {
  return {
    slug: f.slug.trim(), categoryId: num(f.categoryId), characterId: num(f.characterId), name: f.name.trim(),
    maker: text(f.maker), summary: f.summary.trim(), description: text(f.description), story: text(f.story),
    storyQuote: text(f.storyQuote), specLine: text(f.specLine), price: num(f.price), compareAtPrice: num(f.compareAtPrice),
    stock: num(f.stock) ?? 0, preorder: f.preorder, preorderRelease: f.preorder ? text(f.preorderRelease) : null,
    deposit: f.preorder ? num(f.deposit) : null, sized: f.sized, status: f.status,
    optionName: f.options.length ? text(f.optionName) : null,
    options: f.options.map((o) => ({ value: o.value.trim(), priceDelta: num(o.priceDelta) ?? 0, stock: num(o.stock) ?? 0, swatch: text(o.swatch) })),
    facts: f.facts.filter((x) => x.label.trim() || x.value.trim()).map((x) => ({ label: x.label.trim(), value: x.value.trim() })),
    boxItems: lines(f.boxItems),
    media: MEDIA_KINDS.flatMap((kind) =>
      f.images[kind].filter((i) => i.status === 'done' && i.url).map((i) => ({ kind, url: i.url!, altText: text(i.altText) })),
    ),
    bundleProductIds: [...f.bundleProductIds],
    tags: lines(f.tags).flatMap((l) => {
      const at = l.indexOf(':')
      const group = l.slice(0, at).trim()
      const value = l.slice(at + 1).trim()
      return at > 0 && value ? [{ group, value }] : []
    }),
  }
}

/** Numbers that would otherwise be sent as 0 or dropped; keyed like the backend's field paths. */
export function validate(f: ProductForm): Record<string, string> {
  const errors: Record<string, string> = {}
  const money = 'Enter the price as a number, like 1450.'
  const whole = 'Use a whole number, 0 or more.'
  if (f.price.trim() && !isMoney(f.price)) errors.price = money
  if (f.compareAtPrice.trim() && !isMoney(f.compareAtPrice)) errors.compareAtPrice = money
  if (!f.options.length && !isWhole(f.stock)) errors.stock = whole
  if (f.preorder && f.deposit.trim() && !isMoney(f.deposit)) errors.deposit = money
  f.options.forEach((o, i) => {
    if (o.priceDelta.trim() && !isMoney(o.priceDelta)) errors[`options[${i}].priceDelta`] = money
    if (!isWhole(o.stock)) errors[`options[${i}].stock`] = whole
  })
  return errors
}

/** "Kitsune Night bottle, 750 ml" -> "kitsune-night-bottle-750-ml" (the backend's slug rule). */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '')
}

/** "options[1].stock" -> "f-options-1-stock": the id of the input that field error belongs to. */
export const fieldId = (path: string) => 'f-' + path.replace(/[[\].]+/g, '-').replace(/-+$/, '')
