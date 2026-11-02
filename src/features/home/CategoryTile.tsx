import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../../api/types'
import { categorySpec, drawFrame } from '../product/viewer/standIn'

export function CategoryTile({ category: c, angle }: { category: Category; angle: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) drawFrame(ref.current, categorySpec(c.slug), angle)
  }, [c.slug, angle])
  return (
    <Link className="cat-tile" to={`/shop/${c.slug}`}>
      <div className="slot">
        <canvas ref={ref} width={300} height={300} aria-hidden="true" />
      </div>
      {c.label && (
        <span className="jp" aria-hidden="true">
          {c.label}
        </span>
      )}
      <span className="t">
        <strong>{c.name}</strong>
        {c.blurb && <span>{c.blurb}</span>}
      </span>
    </Link>
  )
}
