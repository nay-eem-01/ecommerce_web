import type { ArtSpec } from '../art/art'

const TAU = Math.PI * 2

/** Degrees 0..359 for an angle in radians. */
export function degrees(angle: number): number {
  return Math.round((((angle * 180) / Math.PI) % 360) + 360) % 360
}

/** The frame to show for an angle, out of `count` evenly spaced turntable frames. */
export function frameIndex(angle: number, count: number): number {
  if (count <= 0) return 0
  const turn = (((angle % TAU) + TAU) % TAU) / TAU
  return Math.round(turn * count) % count
}

/** One still view of the product: a photo, or the stand-in art framed like the design's views. */
export interface View {
  label: string
  /** Thumbnail text on phone. */
  short: string
  photo?: { url: string; alt: string }
  art?: { spec: ArtSpec; back?: boolean; inset?: string; zoom?: boolean; bg?: string }
}

/**
 * The still views after the 360: the product's photos when it has them, else the design's stand-in set (back,
 * print close-up, a detail and the product in use) drawn from the art.
 */
export function stillViews(spec: ArtSpec, photos: Array<{ url: string; altText: string | null }>, name: string): View[] {
  if (photos.length) {
    return photos.map((m, i) => ({ label: m.altText || `${name}, photo ${i + 1}`, short: String(i + 1), photo: { url: m.url, alt: m.altText ?? `${name}, photo ${i + 1}` } }))
  }
  const back: View = { label: 'Back', short: 'Back', art: { spec, back: true } }
  const print: View = { label: 'Print close-up', short: 'Print', art: { spec, inset: '-40% -30% -20%' } }
  if (spec.kind === 'bottle') {
    return [
      back,
      print,
      { label: 'In a 18 L backpack', short: 'Bag', art: { spec: { ...spec, kind: 'set' }, inset: '10% 8% 8%', bg: 'oklch(26% 0.04 300)' } },
      { label: 'Lid and seal', short: 'Lid', art: { spec, back: true, zoom: true } },
    ]
  }
  if (spec.kind === 'set') {
    return [
      { label: 'The backpack', short: 'Bag', art: { spec: { ...spec, kind: 'pack' } } },
      { label: 'The bottle', short: 'Bottle', art: { spec: { ...spec, kind: 'bottle' }, inset: '8% 30% 10%' } },
      print,
      back,
    ]
  }
  return [back, print, { label: 'Worn, for scale', short: 'Scale', art: { spec, inset: '22% 30% 14%', bg: 'oklch(26% 0.04 300)' } }]
}
