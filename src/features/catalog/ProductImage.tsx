import { useEffect, useRef, useState } from 'react'
import { drawFrame, specFor } from '../product/viewer/standIn'

interface Props {
  slug: string
  categorySlug?: string | null
  url?: string | null
  alt?: string
  /** Canvas width in pixels; the height follows `ratio`. */
  width?: number
  ratio?: number
  angle?: number
}

/**
 * A product picture: the photo when the API has one, else the prototype's stand-in render at a fixed angle. A photo
 * that fails to load falls back to the stand-in too, so a card never shows a broken image.
 */
export function ProductImage({ slug, categorySlug, url, alt = '', width = 300, ratio = 1.25, angle = 0.5 }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  if (url && failed !== url) return <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(url)} />
  return <StandIn slug={slug} categorySlug={categorySlug} width={width} ratio={ratio} angle={angle} />
}

function StandIn({ slug, categorySlug, width, ratio, angle }: Required<Pick<Props, 'width' | 'ratio' | 'angle'>> & Pick<Props, 'slug' | 'categorySlug'>) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawFrame(ref.current, specFor(slug, categorySlug), angle)
  }, [slug, categorySlug, angle])
  return <canvas ref={ref} width={width} height={Math.round(width * ratio)} aria-hidden="true" />
}
