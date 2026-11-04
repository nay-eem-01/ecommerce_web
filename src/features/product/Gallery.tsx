import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Icon } from '../../ui/icons'
import type { ArtSpec } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { degrees, frameIndex, type View } from './gallery'

interface Props {
  name: string
  spec: ArtSpec
  /** Turntable photos in order (36 = one every 10°). Empty: the stand-in art turns. */
  frames: string[]
  views: View[]
}

/**
 * Phone: one picture at a time (the 360 first, then the stills) with arrows, dots and thumbnails.
 * Desktop: the 360 across both columns, then the stills two by two (the aside sticks beside them).
 */
export function Gallery({ name, spec, frames, views }: Props) {
  const [slide, setSlide] = useState(0)
  const count = views.length + 1
  const go = (i: number) => setSlide((i + count) % count)
  const shortLabels = ['360°', ...views.map((v) => v.short)]
  const labels = ['360 degree view', ...views.map((v) => v.label)]

  return (
    <section aria-label="Product views" className="pd-gallery">
      <div className="ph-only">
        <div className="gal" style={slide ? viewBg(views[slide - 1]) : undefined}>
          {slide === 0 ? <Spin name={name} spec={spec} frames={frames} phone /> : <Still view={views[slide - 1]} />}
          <button className="ibtn pd-arrow" style={{ left: 4 }} aria-label="Previous view" onClick={() => go(slide - 1)}>
            <Icon name="back" />
          </button>
          <button className="ibtn pd-arrow" style={{ right: 4 }} aria-label="Next view" onClick={() => go(slide + 1)}>
            <Icon name="next" />
          </button>
          <div className="count" aria-hidden="true">
            {shortLabels.map((s, i) => (
              <i key={s + i} className={i === slide ? 'on' : undefined} />
            ))}
          </div>
        </div>
        <div className="thumbs" role="group" aria-label="Views">
          {shortLabels.map((s, i) => (
            <button key={s + i} className={i === slide ? 'pd-thumb on' : 'pd-thumb'} aria-label={labels[i]} aria-pressed={i === slide} onClick={() => setSlide(i)}>
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="d-only pd-stack">
        <div className="gal" style={{ gridColumn: '1 / -1', aspectRatio: '5 / 4' }}>
          <Spin name={name} spec={spec} frames={frames} />
        </div>
        {views.slice(0, 4).map((v) => (
          <div key={v.label} className="gal" style={viewBg(v)}>
            <span className="meta" style={{ position: 'absolute', top: 14, left: 14, zIndex: 1 }}>
              {v.label}
            </span>
            <Still view={v} />
          </div>
        ))}
      </div>
    </section>
  )
}

function viewBg(v: View | undefined): CSSProperties | undefined {
  return v?.art?.bg ? { background: v.art.bg } : undefined
}

function Still({ view }: { view: View }) {
  if (view.photo) return <img className="pd-photo" src={view.photo.url} alt={view.photo.alt} loading="lazy" decoding="async" />
  const a = view.art
  if (!a) return null
  const style: CSSProperties = a.zoom ? { inset: '8% 10% 10%', transform: 'scale(2.4)', transformOrigin: '50% 6%' } : a.inset ? { inset: a.inset } : {}
  return (
    <div className="art" style={style}>
      <ProductArt spec={a.spec} back={a.back} label={view.label} />
    </div>
  )
}

/**
 * The 360: drag or swipe to turn, arrow keys turn 10°. Turntable frames when the product has them; until then the
 * stand-in art narrows and flips as it turns, its print hidden while the back faces you.
 */
function Spin({ name, spec, frames, phone = false }: { name: string; spec: ArtSpec; frames: string[]; phone?: boolean }) {
  const [angle, setAngle] = useState(0)
  const drag = useRef<{ x: number; start: number; width: number } | null>(null)
  const deg = degrees(angle)

  // Load every frame once so turning does not flash.
  useEffect(() => {
    frames.forEach((src) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
    })
  }, [frames])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return
    drag.current = { x: e.clientX, start: angle, width: e.currentTarget.clientWidth || 1 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d) setAngle(d.start - ((e.clientX - d.x) / d.width) * Math.PI * 2)
  }
  const up = () => {
    drag.current = null
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = Math.PI / 18
    if (e.key === 'ArrowLeft') setAngle((a) => a + step)
    else if (e.key === 'ArrowRight') setAngle((a) => a - step)
    else return
    e.preventDefault()
  }

  const cos = Math.cos(angle)
  const turn: CSSProperties = { transform: `scaleX(${Math.max(0.18, Math.abs(cos)) * (cos < 0 ? -1 : 1)})` }
  return (
    <div
      className="pd-spin"
      role="slider"
      tabIndex={0}
      aria-label={`360 degree view of ${name}. Drag or use the arrow keys to turn.`}
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={deg}
      aria-valuetext={`${deg} degrees`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <span className="spin360">
        <Icon name="rotate" small />
        {phone ? '360°' : '360° · drag to turn'}
      </span>
      {phone && (
        <span className="meta" style={{ position: 'absolute', top: 18, right: 14 }}>
          Drag to turn
        </span>
      )}
      {frames.length ? (
        <img className="pd-photo" src={frames[frameIndex(angle, frames.length)]} alt="" draggable={false} />
      ) : (
        <div className="art" style={{ ...(phone ? {} : { inset: spec.kind === 'bottle' ? '6% 30% 10%' : '8% 18% 10%' }), ...turn }}>
          <ProductArt spec={spec} back={cos < 0} label={`${name}, 360 view`} />
        </div>
      )}
      <div className={phone ? 'pd-track' : 'pd-track wide'} aria-hidden="true">
        <i style={{ left: `${(deg / 360) * 100}%` }} />
      </div>
    </div>
  )
}
