import { useState } from 'react'
import { artFor } from '../art/art'
import { ProductArt } from '../art/ProductArt'

interface Props {
  slug: string
  categorySlug?: string | null
  characterSlug?: string | null
  set?: boolean
  url?: string | null
  alt?: string
  swatch?: string | null
}

/**
 * A product picture: the photo when the API has one, else the design's stand-in art. A photo that fails to load
 * falls back to the art too, so a card never shows a broken image.
 */
export function ProductImage({ slug, categorySlug, characterSlug, set, url, alt = '', swatch }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  if (url && failed !== url) return <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(url)} />
  return <ProductArt spec={artFor({ slug, categorySlug, characterSlug, set }, swatch)} label={alt || undefined} />
}
