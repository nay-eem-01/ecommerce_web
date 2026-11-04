import { useEffect, useRef, useState } from 'react'
import { uploadImage } from '../../../api/admin'
import { ApiError } from '../../../api/errors'
import type { ImageItem } from './productForm'
import { newKey } from './productForm'

export const UPLOADS_AT_ONCE = 3

interface Props {
  label: string
  help: string
  items: ImageItem[]
  onChange: (update: (items: ImageItem[]) => ImageItem[]) => void
  /** At most this many (the story image is one). */
  max?: number
  /** 360 frames: order picked files by name, so "frame-02" follows "frame-01". */
  sortByName?: boolean
}

/**
 * An ordered list of product images. Picked files upload in the background, a few at a time, each in its own slot:
 * a failed one stays where it was with its message and a retry. Reorder by dragging or with the move buttons.
 */
export function ImageList({ label, help, items, onChange, max, sortByName }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const room = max === undefined ? Infinity : max - items.length

  // Start queued uploads while fewer than UPLOADS_AT_ONCE are running.
  useEffect(() => {
    const running = items.filter((i) => i.status === 'uploading').length
    const next = items.filter((i) => i.status === 'queued').slice(0, Math.max(0, UPLOADS_AT_ONCE - running))
    if (!next.length) return
    const keys = new Set(next.map((i) => i.key))
    onChange((all) => all.map((i) => (keys.has(i.key) ? { ...i, status: 'uploading', error: undefined } : i)))
    for (const item of next) {
      uploadImage(item.file!).then(
        (url) => onChange((all) => all.map((i) => (i.key === item.key ? { ...i, url, status: 'done', file: undefined } : i))),
        (error) =>
          onChange((all) =>
            all.map((i) =>
              i.key === item.key
                ? { ...i, status: 'failed', error: error instanceof ApiError ? error.message : 'Upload failed. Try again.' }
                : i,
            ),
          ),
      )
    }
  }, [items, onChange])

  const add = (files: FileList | null) => {
    if (!files) return
    let picked = Array.from(files)
    if (sortByName) picked.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    picked = picked.slice(0, room)
    onChange((all) => [...all, ...picked.map((file) => ({ key: newKey(), url: null, altText: '', status: 'queued' as const, file }))])
    if (input.current) input.current.value = ''
  }

  const move = (from: number, to: number) =>
    onChange((all) => {
      if (to < 0 || to >= all.length) return all
      const next = [...all]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <fieldset className="adm-images">
      <legend>{label}</legend>
      <p className="help">{help}</p>
      {items.length > 0 && (
        <ol className="adm-thumbs">
          {items.map((item, index) => (
            <li key={item.key} className={item.status === 'failed' ? 'failed' : undefined}>
              {/* mouse reordering; keyboard users have the move buttons below */}
              <div
              className="drag"
              draggable
              onDragStart={() => setDragKey(item.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = items.findIndex((i) => i.key === dragKey)
                if (from >= 0) move(from, index)
                setDragKey(null)
              }}
            >
              <div className="thumb">
                {item.url ? <img src={item.url} alt="" /> : <span className="muted">{item.status === 'failed' ? 'Failed' : 'Uploading…'}</span>}
                <span className="n" aria-hidden="true">{index + 1}</span>
              </div>
              {item.status === 'failed' && (
                <p className="err" role="alert">
                  {item.file?.name}: {item.error}
                </p>
              )}
              {item.status === 'done' && (
                <input className="input" aria-label={`Alt text for ${label.toLowerCase()} ${index + 1}`} placeholder="Alt text"
                  value={item.altText} maxLength={160}
                  onChange={(e) => onChange((all) => all.map((i) => (i.key === item.key ? { ...i, altText: e.target.value } : i)))} />
              )}
              <div className="adm-actions">
                <button type="button" className="tbtn" aria-label={`Move ${label.toLowerCase()} ${index + 1} earlier`} disabled={index === 0}
                  onClick={() => move(index, index - 1)}>↑</button>
                <button type="button" className="tbtn" aria-label={`Move ${label.toLowerCase()} ${index + 1} later`} disabled={index === items.length - 1}
                  onClick={() => move(index, index + 1)}>↓</button>
                {item.status === 'failed' && (
                  <button type="button" className="tbtn" onClick={() => onChange((all) => all.map((i) => (i.key === item.key ? { ...i, status: 'queued' } : i)))}>
                    Retry
                  </button>
                )}
                <button type="button" className="tbtn" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                  onClick={() => onChange((all) => all.filter((i) => i.key !== item.key))}>✕</button>
              </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {room > 0 && (
        <label className="tbtn" htmlFor={`pick-${id}`} style={{ alignSelf: 'flex-start' }}>
          Add {max === 1 ? 'image' : 'images'}
          <input id={`pick-${id}`} ref={input} className="vh" type="file" accept="image/jpeg,image/png,image/webp"
            multiple={max !== 1} onChange={(e) => add(e.target.files)} />
        </label>
      )}
    </fieldset>
  )
}
