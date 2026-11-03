/**
 * Stand-in product art (the design canvas's "Product art" component) until real photos exist. Each demo product has
 * its look; other products take their character's, then their category's. A colour swatch recolours the body.
 */
export type ArtKind = 'bottle' | 'pack' | 'sling' | 'tee' | 'set'
export type ArtFace = 'fox' | 'cat' | 'ronin' | 'pins' | 'none'

export interface ArtSpec {
  kind: ArtKind
  a: string
  b: string
  c: string
  face: ArtFace
  eye: string
}

const KITSUNE_BOTTLE: ArtSpec = { kind: 'bottle', a: '#f2a7c3', b: '#1d1838', c: '#ff5fa2', face: 'fox', eye: '#e0245e' }
const CAT_BOTTLE: ArtSpec = { kind: 'bottle', a: '#ffd27a', b: '#fff3d6', c: '#ff7a45', face: 'cat', eye: '#3a2a1a' }
const RONIN_BOTTLE: ArtSpec = { kind: 'bottle', a: '#2b2f45', b: '#c8333f', c: '#e9e2cf', face: 'ronin', eye: '#e9e2cf' }
const KITSUNE_PACK: ArtSpec = { kind: 'pack', a: '#f2a7c3', b: '#1d1838', c: '#ff5fa2', face: 'fox', eye: '#e0245e' }
const ITA_PACK: ArtSpec = { kind: 'pack', a: '#1b1b26', b: '#9fd8ff', c: '#ff5fa2', face: 'pins', eye: '#ffd27a' }

const BY_SLUG: Record<string, ArtSpec> = {
  'kitsune-night-bottle': KITSUNE_BOTTLE,
  'ramen-cat-bottle': CAT_BOTTLE,
  'ronin-bottle': RONIN_BOTTLE,
  'sakura-shaker': { kind: 'bottle', a: '#cfe9ff', b: '#ffffff', c: '#ff8fb8', face: 'fox', eye: '#ff5fa2' },
  'kitsune-tritan-bottle': { kind: 'bottle', a: '#ff8fb8', b: '#1d1838', c: '#ffffff', face: 'fox', eye: '#1d1838' },
  'kitsune-backpack': KITSUNE_PACK,
  'ita-backpack': ITA_PACK,
  'ramen-cat-mini-backpack': { kind: 'pack', a: '#ffd27a', b: '#ff7a45', c: '#3a2a1a', face: 'cat', eye: '#3a2a1a' },
  'ronin-sling': { kind: 'sling', a: '#2b2f45', b: '#c8333f', c: '#e9e2cf', face: 'none', eye: '#e9e2cf' },
  'kitsune-school-run-set': { ...KITSUNE_PACK, kind: 'set' },
}

/** A character's tile on the home page (design: Kitsune backpack, Ramen Cat and Ronin bottles). */
export const CHARACTER_ART: Record<string, ArtSpec> = {
  kitsune: KITSUNE_PACK,
  'ramen-cat': CAT_BOTTLE,
  ronin: RONIN_BOTTLE,
}

/** A category's tile. */
export const CATEGORY_ART: Record<string, ArtSpec> = {
  bottles: { kind: 'bottle', a: '#cfe9ff', b: '#ffffff', c: '#ff8fb8', face: 'fox', eye: '#ff5fa2' },
  bags: ITA_PACK,
  apparel: { kind: 'tee', a: '#ece8f6', b: '#ff5fa2', c: '#ff5fa2', face: 'fox', eye: '#e0245e' },
}

/** The tile background of each character (design canvas). */
export const CHARACTER_BG: Record<string, string> = {
  kitsune: 'oklch(24% 0.06 340)',
  'ramen-cat': 'oklch(25% 0.05 60)',
  ronin: 'oklch(22% 0.04 260)',
}

export function artFor(input: { slug: string; characterSlug?: string | null; categorySlug?: string | null; set?: boolean }, swatch?: string | null): ArtSpec {
  const base =
    BY_SLUG[input.slug] ??
    (input.set ? { ...KITSUNE_PACK, kind: 'set' as const } : null) ??
    (input.categorySlug === 'bags' ? (input.characterSlug && CHARACTER_ART[input.characterSlug]?.kind === 'pack' ? CHARACTER_ART[input.characterSlug] : ITA_PACK) : null) ??
    (input.characterSlug ? { ...CHARACTER_ART[input.characterSlug], kind: 'bottle' as const } : null) ??
    CATEGORY_ART[input.categorySlug ?? ''] ??
    KITSUNE_BOTTLE
  return swatch && /^#[0-9a-f]{6}$/i.test(swatch) ? { ...base, a: swatch } : base
}
