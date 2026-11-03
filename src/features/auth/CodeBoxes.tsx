import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

/**
 * Six one-digit boxes for the SMS code. Typing moves to the next box, Backspace to the previous one, and pasting
 * (or the phone's SMS autofill into the first box) fills them all. The ref focuses the first empty box.
 */
export const CodeBoxes = forwardRef<HTMLInputElement | null, Props>(function CodeBoxes({ value, onChange, disabled, invalid, describedBy }, ref) {
  const boxes = useRef<Array<HTMLInputElement | null>>([])
  // The value as of the last keystroke: focus moves before React re-renders with it.
  const latest = useRef(value)
  useLayoutEffect(() => {
    latest.current = value
  }, [value])
  const focusAt = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus()
  useImperativeHandle(ref, () => boxes.current[Math.min(value.length, 5)] as HTMLInputElement, [value.length])

  const put = (at: number, typed: string) => {
    const digits = typed.replace(/\D/g, '')
    if (!digits) return
    const next = (value.slice(0, at) + digits).slice(0, 6)
    latest.current = next
    onChange(next)
    focusAt(next.length)
  }
  const typed = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '')
    if (!v) return
    // Several digits at once: the SMS autofill or a paste the browser did not report as one.
    if (v.length > 1 && !value[i]) return put(i, v)
    const next = (value.slice(0, i) + v.slice(-1) + value.slice(i + 1)).slice(0, 6)
    latest.current = next
    onChange(next)
    focusAt(i + 1)
  }
  const key = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const at = value[i] ? i : i - 1
      if (at < 0) return
      latest.current = value.slice(0, at)
      onChange(latest.current)
      focusAt(at)
    } else if (e.key === 'ArrowLeft') focusAt(i - 1)
    else if (e.key === 'ArrowRight') focusAt(i + 1)
  }
  const paste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    put(i, e.clipboardData.getData('text'))
  }

  return (
    <div className="si-code" role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el
          }}
          className="input"
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? 6 : 1}
          value={value[i] ?? ''}
          disabled={disabled}
          // Only the next empty box (or a filled one) takes typing, so digits never land out of order.
          onFocus={(e) => {
            if (i > latest.current.length) focusAt(latest.current.length)
            else e.currentTarget.select()
          }}
          onChange={(e) => typed(i, e.target.value)}
          onKeyDown={key(i)}
          onPaste={paste(i)}
        />
      ))}
    </div>
  )
})
