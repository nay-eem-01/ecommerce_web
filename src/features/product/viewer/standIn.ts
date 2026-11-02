/*
 * The prototype's stand-in turntable render, ported as is. It draws a lit, rotating shape per product kind so the
 * 360 viewer, cards and tiles look like the approved design until real photos exist (`spinFrames`, `thumbnailUrl`).
 * The viewer only needs `drawFrame(canvas, spec, angle)`; a product with spin frames never reaches this file.
 */

export type Rgb = [number, number, number]
export type Kind = 'figure' | 'chibi' | 'mecha' | 'costume' | 'wig' | 'bottle' | 'bag' | 'tote'

/** Colours are oklch triples [lightness %, chroma, hue] as in the prototype. */
type Oklch = [number, number, number]
interface SpecSource {
  kind: Kind
  a: Oklch
  b: Oklch
  c: Oklch
}

export interface SpinSpec {
  kind: Kind
  a: Rgb
  b: Rgb
  c: Rgb
}

/** The demo catalog's products, as the prototype drew them. */
const BY_SLUG: Record<string, SpecSource> = {
  'ronin-swordsman': { kind: 'figure', a: [38, 0.09, 262], b: [62, 0.2, 25], c: [88, 0.03, 80] },
  'chibi-blind-box': { kind: 'chibi', a: [72, 0.17, 352], b: [84, 0.13, 200], c: [92, 0.03, 80] },
  'mecha-unit-07': { kind: 'mecha', a: [86, 0.02, 260], b: [58, 0.16, 255], c: [70, 0.17, 30] },
  'kitsune-set': { kind: 'costume', a: [94, 0.02, 80], b: [55, 0.2, 25], c: [30, 0.04, 285] },
  'sailor-uniform': { kind: 'costume', a: [95, 0.01, 260], b: [35, 0.12, 262], c: [60, 0.2, 25] },
  'silver-wig': { kind: 'wig', a: [88, 0.01, 260], b: [80, 0.01, 260], c: [70, 0.01, 260] },
  'sakura-bottle': { kind: 'bottle', a: [78, 0.1, 355], b: [96, 0.02, 350], c: [55, 0.2, 352] },
  'mecha-shaker': { kind: 'bottle', a: [86, 0.02, 260], b: [84, 0.15, 90], c: [25, 0.02, 260] },
  'ramen-cat-bottle': { kind: 'bottle', a: [90, 0.08, 85], b: [96, 0.02, 80], c: [62, 0.17, 45] },
  'ita-backpack': { kind: 'bag', a: [22, 0.02, 285], b: [80, 0.05, 230], c: [74, 0.19, 352] },
  'canvas-tote': { kind: 'tote', a: [92, 0.03, 85], b: [24, 0.03, 40], c: [60, 0.2, 25] },
  'kunai-sling': { kind: 'bag', a: [30, 0.04, 150], b: [70, 0.05, 150], c: [84, 0.13, 200] },
}

/** A category's look for its tile and for products the table above does not know (first product of each). */
const BY_CATEGORY: Record<string, string> = {
  figures: 'ronin-swordsman',
  costumes: 'kitsune-set',
  bottles: 'sakura-bottle',
  bags: 'ita-backpack',
}

/** oklch -> sRGB 0..255 (the prototype's conversion). */
export function oklchToRgb(l: number, c: number, h: number): Rgb {
  l /= 100
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const b = c * Math.sin(hr)
  let L = l + 0.3963377774 * a + 0.2158037573 * b
  let M = l - 0.1055613458 * a - 0.0638541728 * b
  let S = l - 0.0894841775 * a - 1.291485548 * b
  L = L * L * L
  M = M * M * M
  S = S * S * S
  const r = 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S
  const g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S
  const bb = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S
  const f = (x: number) => {
    x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(x * 255)))
  }
  return [f(r), f(g), f(bb)]
}

/** "#f4a6c0" -> [244, 166, 192]; null for anything else. */
export function hexToRgb(hex: string | null | undefined): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? '')
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The stand-in for a product: its own look when known, else its category's, else a bottle. A colour option's swatch
 * (hex from the API) replaces the main colour, as choosing a swatch did in the prototype.
 */
export function specFor(slug: string | null | undefined, categorySlug?: string | null, swatch?: string | null): SpinSpec {
  const source = BY_SLUG[slug ?? ''] ?? BY_SLUG[BY_CATEGORY[categorySlug ?? ''] ?? ''] ?? BY_SLUG['sakura-bottle']
  const main = hexToRgb(swatch)
  return {
    kind: source.kind,
    a: main ?? oklchToRgb(...source.a),
    b: oklchToRgb(...source.b),
    c: oklchToRgb(...source.c),
  }
}

/** A category tile's stand-in (the category's first demo product). */
export function categorySpec(categorySlug: string): SpinSpec {
  return specFor(BY_CATEGORY[categorySlug] ?? null, categorySlug)
}

type Profile = (t: number) => number
const PROFILES: Record<string, Profile> = {
  bottle: (t) => {
    if (t < 0.06) return 0.3
    if (t < 0.1) return 0.34
    if (t < 0.16) return 0.34 + (t - 0.1) * 1.6
    if (t > 0.97) return 0.4 * (1 - (t - 0.97) * 8)
    return 0.44
  },
  figure: (t) => {
    if (t < 0.13) return 0.12 + 0.05 * Math.sin((t / 0.13) * Math.PI)
    if (t < 0.16) return 0.06
    if (t < 0.4) return 0.16 + (t - 0.16) * 0.5
    if (t < 0.88) return 0.28 + (t - 0.4) * 0.45
    if (t < 0.92) return 0.5
    return 0.56
  },
  chibi: (t) => {
    if (t < 0.48) return 0.34 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.24) / 0.25, 2))) + 0.02
    if (t < 0.52) return 0.14
    if (t < 0.88) return 0.22 + (t - 0.52) * 0.2
    return 0.36
  },
  mecha: (t) => {
    if (t < 0.12) return 0.11
    if (t < 0.18) return 0.08
    if (t < 0.24) return 0.42
    if (t < 0.48) return 0.3 - (t - 0.24) * 0.3
    if (t < 0.55) return 0.2
    if (t < 0.92) return 0.16 + 0.05 * Math.sin(t * 30)
    return 0.4
  },
  costume: (t) => {
    if (t < 0.04) return 0.02
    if (t < 0.08) return 0.08
    if (t < 0.12) return 0.38
    if (t < 0.55) return 0.36 - (t - 0.12) * 0.1
    if (t < 0.62) return 0.3
    return 0.3 + (t - 0.62) * 0.55
  },
  wig: (t) => {
    if (t < 0.3) return 0.3 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.2) / 0.2, 2))) + 0.02
    return 0.32 + (t - 0.3) * 0.12
  },
}

function pattern(kind: Kind, lon: number, t: number, A: Rgb, B: Rgb, C: Rgb): Rgb {
  const s = Math.sin(lon)
  const cs = Math.cos(lon)
  switch (kind) {
    case 'bottle': {
      if (t < 0.1) return C
      if (t < 0.16) return B
      if (t > 0.4 && t < 0.7) {
        // print band
        const u = (((lon / (Math.PI * 2)) % 1) + 1) % 1
        const v = (t - 0.4) / 0.3
        const px = ((u * 14) % 1) - 0.5
        const py = ((v * 3 + Math.floor(u * 14) * 0.37) % 1) - 0.5
        if (px * px + py * py < 0.07) return C
        return B
      }
      if (t > 0.7 && t < 0.72) return C
      return A
    }
    case 'figure':
      if (t < 0.13) return cs > 0.55 && t > 0.05 && t < 0.09 ? C : t < 0.05 ? A : C
      if (t < 0.4) {
        if (cs > 0.2 && t > 0.16 && t < 0.22) return B
        return A
      }
      if (t < 0.88) {
        if (cs < -0.3 && t > 0.5) return B
        if (Math.abs(s) < 0.1 && cs > 0) return C
        return A
      }
      return C
    case 'chibi':
      if (t < 0.48) {
        if (cs > 0.35 && t > 0.24 && t < 0.34) return Math.abs(s) > 0.18 && Math.abs(s) < 0.42 ? A : C
        return t < 0.2 || cs < 0.35 ? A : C
      }
      if (t < 0.88) return B
      return C
    case 'mecha':
      if (t < 0.12) return cs > 0.5 && t > 0.05 && t < 0.08 ? C : A
      if (t < 0.48) return cs > 0.6 && t > 0.26 && t < 0.34 ? B : A
      if (t < 0.55) return C
      return Math.abs(s) < 0.3 ? B : A
    case 'costume': {
      if (t < 0.12) return C
      if (t < 0.62) {
        if (Math.abs(s) < 0.06 && cs > 0) return B
        if (t > 0.52) return B
        const u2 = ((lon * 9) / (Math.PI * 2)) % 1
        return cs < -0.2 && Math.abs(u2 - 0.5) < 0.08 ? B : A
      }
      return Math.floor(t * 40) % 4 === 0 ? B : A
    }
    case 'wig': {
      if (t < 0.3 && cs > 0.4 && t > 0.14) return C
      const st = Math.sin(lon * 40 + t * 6) * 0.5 + 0.5
      return st > 0.8 ? B : A
    }
    default:
      return A
  }
}

function drawLathe(ctx: CanvasRenderingContext2D, w: number, h: number, spec: SpinSpec, ang: number) {
  const prof = PROFILES[spec.kind] ?? PROFILES.bottle
  const { a: A, b: B, c: C } = spec
  const img = ctx.createImageData(w, h)
  const d = img.data
  const top = h * 0.1
  const H = h * 0.72
  const cx = w / 2
  const scale = Math.min(w, H) * 0.6
  const lx = -0.45
  const lz = 0.85
  for (let y = 0; y < h; y++) {
    const t = (y - top) / H
    if (t < 0 || t > 1) continue
    const R = prof(t) * scale
    if (R < 1) continue
    const dr = ((prof(Math.min(1, t + 0.004)) - prof(Math.max(0, t - 0.004))) * scale) / (0.008 * H)
    const x0 = Math.max(0, Math.floor(cx - R))
    const x1 = Math.min(w - 1, Math.ceil(cx + R))
    for (let x = x0; x <= x1; x++) {
      const sx = (x - cx) / R
      if (sx < -1 || sx > 1) continue
      const th = Math.asin(sx)
      const nz = Math.cos(th)
      const lon = th + ang
      const col = pattern(spec.kind, lon, t, A, B, C)
      const ny = -dr * 0.6
      const nl = Math.sqrt(sx * sx + nz * nz + ny * ny)
      const diff = Math.max(0, (sx * lx + nz * lz) / nl)
      const spec2 = Math.pow(Math.max(0, (sx * -0.3 + nz * 0.95) / nl), 40) * 0.5
      const k = 0.28 + 0.78 * diff
      const rim = Math.pow(1 - nz, 3) * 0.25
      const i = (y * w + x) * 4
      d[i] = Math.min(255, col[0] * k + 255 * (spec2 + rim * 0.4))
      d[i + 1] = Math.min(255, col[1] * k + 255 * (spec2 + rim * 0.2))
      d[i + 2] = Math.min(255, col[2] * k + 255 * (spec2 + rim * 0.6))
      d[i + 3] = sx > 0.985 || sx < -0.985 ? 160 : 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

function rgb(c: Rgb, k: number) {
  return `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`
}

interface Face {
  n: number
  x: [number, number]
  z: number
}

/** Bags: a rounded prism with a clear window and pocket on the front, straps on the back. */
function drawBox(ctx: CanvasRenderingContext2D, w: number, h: number, spec: SpinSpec, ang: number) {
  const { a: A, b: B, c: C } = spec
  ctx.clearRect(0, 0, w, h)
  const W = w * 0.24
  const D = w * 0.11
  const top = h * 0.2
  const bot = h * 0.82
  const cx = w / 2
  const tilt = h * 0.035
  const faces: Face[] = [
    { n: 0, x: [-W, W], z: D },
    { n: Math.PI / 2, x: [-D, D], z: W },
    { n: Math.PI, x: [-W, W], z: D },
    { n: -Math.PI / 2, x: [-D, D], z: W },
  ]
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  const vis: Array<{ f: Face; nz: number; l: [number, number]; r: [number, number] }> = []
  for (const f of faces) {
    const nz = Math.cos(f.n + ang)
    if (nz <= 0.01) continue
    const P = (lx: number, lz: number): [number, number] => {
      let bx: number
      let bz: number
      if (f.n === 0) {
        bx = lx
        bz = lz
      } else if (f.n === Math.PI) {
        bx = -lx
        bz = -lz
      } else if (f.n > 0) {
        bx = lz
        bz = -lx
      } else {
        bx = -lz
        bz = lx
      }
      return [cx + bx * ca + bz * sa, -bx * sa + bz * ca]
    }
    vis.push({ f, nz, l: P(f.x[0], f.z), r: P(f.x[1], f.z) })
  }
  vis.sort((p, q) => p.nz - q.nz)
  for (const v of vis) {
    const k = 0.35 + 0.65 * v.nz * (0.6 + 0.4 * Math.cos(v.f.n + ang + 0.5))
    const lx = v.l[0]
    const rx = v.r[0]
    const ty = top + (v.l[1] / w) * tilt
    const ty2 = top + (v.r[1] / w) * tilt
    ctx.fillStyle = rgb(A, k)
    ctx.beginPath()
    ctx.moveTo(lx, ty)
    ctx.lineTo(rx, ty2)
    ctx.lineTo(rx, bot)
    ctx.lineTo(lx, bot)
    ctx.closePath()
    ctx.fill()
    if (spec.kind === 'bag' && v.f.n === 0) {
      // clear window with pins, and the front pocket
      const mx = (lx + rx) / 2
      const fw = rx - lx
      ctx.fillStyle = rgb(B, 0.4 + 0.6 * k)
      ctx.beginPath()
      ctx.ellipse(mx, top + (bot - top) * 0.38, Math.abs(fw) * 0.32, (bot - top) * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgb(C, k)
      for (let j = 0; j < 5; j++) {
        ctx.beginPath()
        ctx.arc(mx + fw * (-0.18 + j * 0.09), top + (bot - top) * (0.34 + (j % 2) * 0.08), Math.abs(fw) * 0.04, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = rgb(A, k * 0.8)
      ctx.fillRect(lx + fw * 0.15, top + (bot - top) * 0.66, fw * 0.7, (bot - top) * 0.22)
      ctx.fillStyle = rgb(C, k)
      ctx.fillRect(lx + fw * 0.15, top + (bot - top) * 0.66, fw * 0.7, 3)
    }
    if (spec.kind === 'bag' && v.f.n === Math.PI) {
      ctx.fillStyle = rgb(A, k * 0.6)
      const fw2 = rx - lx
      ctx.fillRect(lx + fw2 * 0.2, top + 10, fw2 * 0.12, bot - top - 20)
      ctx.fillRect(lx + fw2 * 0.68, top + 10, fw2 * 0.12, bot - top - 20)
    }
    if (Math.abs(v.f.n) === Math.PI / 2) {
      ctx.fillStyle = rgb(C, k)
      ctx.fillRect(Math.min(lx, rx), top + (bot - top) * 0.5, Math.abs(rx - lx), 4)
    }
  }
  ctx.strokeStyle = rgb(A, 0.5)
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(cx, top, W * 0.5 * Math.abs(Math.cos(ang)) + 4, h * 0.08, 0, Math.PI, 0)
  ctx.stroke()
}

/** Flat tote: a thin slab with a manga panel print. */
function drawTote(ctx: CanvasRenderingContext2D, w: number, h: number, spec: SpinSpec, ang: number) {
  const { a: A, b: B, c: C } = spec
  ctx.clearRect(0, 0, w, h)
  const W = w * 0.28
  const cx = w / 2
  const top = h * 0.3
  const bot = h * 0.82
  const ca = Math.cos(ang)
  const fw = W * ca
  const front = ca > 0
  const k = 0.35 + 0.65 * Math.abs(ca)
  ctx.strokeStyle = rgb(A, 0.75 * k)
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(cx, top, Math.max(6, Math.abs(fw) * 0.45), h * 0.16, 0, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = rgb(A, k)
  ctx.fillRect(cx - Math.abs(fw), top, Math.abs(fw) * 2, bot - top)
  if (Math.abs(fw) > 8) {
    const pw = Math.abs(fw) * 2 * 0.8
    const px = cx - pw / 2
    const ph = (bot - top) * 0.8
    const py = top + (bot - top) * 0.1
    ctx.fillStyle = rgb(B, k)
    ctx.fillRect(px, py, pw, ph)
    ctx.fillStyle = rgb(A, k)
    const g = 4
    const cells = front
      ? [[0, 0, 0.6, 0.45], [0.6, 0, 0.4, 0.45], [0, 0.45, 0.35, 0.55], [0.35, 0.45, 0.65, 0.55]]
      : [[0, 0, 1, 0.3], [0, 0.3, 0.5, 0.7], [0.5, 0.3, 0.5, 0.7]]
    for (const r of cells) ctx.fillRect(px + r[0] * pw + g, py + r[1] * ph + g, r[2] * pw - g * 2, r[3] * ph - g * 2)
    ctx.fillStyle = rgb(C, k)
    ctx.beginPath()
    ctx.arc(px + pw * (front ? 0.3 : 0.7), py + ph * 0.25, pw * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Draws one frame at `angle` (radians). Does nothing where canvas is unavailable (tests). */
export function drawFrame(canvas: HTMLCanvasElement, spec: SpinSpec, angle: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  // floor shadow
  const g = ctx.createRadialGradient(w / 2, h * 0.83, 2, w / 2, h * 0.83, w * 0.3)
  g.addColorStop(0, 'rgba(0,0,0,.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, h * 0.76, w, h * 0.16)
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tc = tmp.getContext('2d')
  if (!tc) return
  if (spec.kind === 'bag') drawBox(tc, w, h, spec, angle)
  else if (spec.kind === 'tote') drawTote(tc, w, h, spec, angle)
  else drawLathe(tc, w, h, spec, angle)
  ctx.drawImage(tmp, 0, 0)
}
