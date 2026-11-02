import { useEffect, useRef, useState } from 'react'
import type { Media } from '../../../api/types'
import { Icon } from '../../../ui/Icon'
import { drawFrame, type SpinSpec } from './standIn'

interface Props {
  name: string
  /** Turntable photos in order (36 = one every 10°). Empty: the stand-in render of `spec`. */
  frames: string[]
  spec: SpinSpec
  photos: Media[]
}

const TAU = Math.PI * 2
const SIZE = 720

/** Degrees 0..359 for an angle in radians. */
export function degrees(angle: number): number {
  return Math.round((((angle * 180) / Math.PI) % 360) + 360) % 360
}

/** The frame to show for an angle, out of `count` evenly spaced frames. */
export function frameIndex(angle: number, count: number): number {
  if (count <= 0) return 0
  const turn = (((angle % TAU) + TAU) % TAU) / TAU
  return Math.round(turn * count) % count
}

/**
 * The 360 viewer from the prototype: drag or swipe with inertia, arrow keys turn 10°, auto-rotate, a degree read-out
 * and a track. Views below switch between the 360 and the product's photos.
 */
export function Viewer({ name, frames, spec, photos }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [deg, setDeg] = useState(0)
  const [auto, setAuto] = useState(false)
  const [hint, setHint] = useState(true)
  const [view, setView] = useState<number>(-1) // -1 = 360, else a photo index
  const state = useRef({ ang: 0.35, vel: 0, dragging: false, lastX: 0, raf: 0, lastT: 0, auto: false })
  const images = useRef<HTMLImageElement[]>([])
  const specRef = useRef(spec)
  const renderRef = useRef<() => void>(() => {})
  const kickRef = useRef<() => void>(() => {})

  // Load the turntable photos once per product.
  useEffect(() => {
    images.current = frames.map((src) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
      img.onload = () => renderRef.current()
      return img
    })
  }, [frames])

  useEffect(() => {
    const el = box.current
    const cv = canvas.current
    if (!el || !cv) return
    const s = state.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let pending = false

    function render() {
      pending = false
      if (!cv) return
      if (frames.length) {
        const img = images.current[frameIndex(s.ang, frames.length)]
        const ctx = cv.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, SIZE, SIZE)
          if (img?.complete && img.naturalWidth) {
            const k = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
            const w = img.naturalWidth * k
            const h = img.naturalHeight * k
            ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
          }
        }
      } else {
        drawFrame(cv, specRef.current, s.ang)
      }
      setDeg(degrees(s.ang))
    }
    renderRef.current = render
    const request = () => {
      if (!pending) {
        pending = true
        requestAnimationFrame(render)
      }
    }
    function loop(t: number) {
      const dt = s.lastT ? Math.min(50, t - s.lastT) : 16
      s.lastT = t
      if (!s.dragging) {
        if (s.auto) s.ang += 0.0012 * dt
        else {
          s.ang += s.vel * dt
          s.vel *= Math.pow(0.94, dt / 16)
        }
      }
      if (s.auto || Math.abs(s.vel) > 0.00005 || s.dragging) {
        render()
        s.raf = requestAnimationFrame(loop)
      } else {
        s.raf = 0
        s.lastT = 0
      }
    }
    const kick = () => {
      if (!s.raf) {
        s.lastT = 0
        s.raf = requestAnimationFrame(loop)
      }
    }
    kickRef.current = kick

    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest('button')) return
      s.dragging = true
      s.lastX = e.clientX
      s.vel = 0
      el.setPointerCapture?.(e.pointerId)
      setHint(false)
      s.auto = false
      setAuto(false)
      kick()
    }
    const move = (e: PointerEvent) => {
      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      s.lastX = e.clientX
      const k = TAU / (el.clientWidth || 1)
      s.ang -= dx * k
      s.vel = (-dx * k) / 16
      request()
    }
    const end = () => {
      if (!s.dragging) return
      s.dragging = false
      if (reduce) s.vel = 0
      kick()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') s.ang += Math.PI / 18
      else if (e.key === 'ArrowRight') s.ang -= Math.PI / 18
      else return
      e.preventDefault()
      setHint(false)
      s.auto = false
      setAuto(false)
      request()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('keydown', key)
    render()
    if (!reduce) {
      // A short spin on arrival shows that it turns.
      s.vel = 0.006
      kick()
    }
    return () => {
      cancelAnimationFrame(s.raf)
      s.raf = 0
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      el.removeEventListener('keydown', key)
    }
  }, [frames])

  // A colour option recolours the stand-in without resetting the angle.
  useEffect(() => {
    specRef.current = spec
    renderRef.current()
  }, [spec])

  function toggleAuto() {
    const s = state.current
    setHint(false)
    s.auto = !s.auto
    setAuto(s.auto)
    if (s.auto) kickRef.current()
  }

  const is360 = view === -1
  const hide = is360 ? undefined : ({ visibility: 'hidden' } as const)
  return (
    <div className="gallery">
      <div
        className="viewer"
        ref={box}
        tabIndex={is360 ? 0 : -1}
        role="slider"
        aria-label={`360 degree view of ${name}. Drag, swipe or use the arrow keys to turn it.`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={deg}
        aria-valuetext={`Turned ${deg} degrees`}
      >
        <canvas ref={canvas} width={SIZE} height={SIZE} style={hide} />
        <span className="deg" style={hide}>
          {deg}°
        </span>
        <div className="ctrls" style={hide}>
          <button type="button" aria-pressed={auto} aria-label={auto ? 'Stop rotating' : 'Auto rotate'} onClick={toggleAuto}>
            <Icon name={auto ? 'pause' : 'play'} />
          </button>
        </div>
        <div className="track" aria-hidden="true" style={hide}>
          <i style={{ left: `${(deg / 360) * 100}%` }} />
        </div>
        <span className={hint ? 'hint' : 'hint gone'} style={hide}>
          <Icon name="rotate" />
          Drag to turn it round
        </span>
        {!is360 && photos[view] && <img className="frame" src={photos[view].url} alt={photos[view].altText ?? name} />}
      </div>
      <div className="thumbs" role="group" aria-label="Views">
        <button type="button" aria-current={is360} onClick={() => setView(-1)} aria-label="360 degree view">
          <span className="t360">360°</span>
        </button>
        {photos.slice(0, 4).map((photo, i) => (
          <button type="button" key={photo.url} aria-current={view === i} onClick={() => setView(i)} aria-label={photo.altText ?? `Photo ${i + 1}`}>
            <img src={photo.url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
