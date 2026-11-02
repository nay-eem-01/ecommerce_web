import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** An optional action in the toast, e.g. ["View cart", "/cart"]. */
export type ToastLink = [label: string, to: string]

interface ToastState {
  message: string
  link: ToastLink | null
  id: number
}

const ToastContext = createContext<(message: string, link?: ToastLink | null) => void>(() => {})

/** The prototype's single toast: light card at the bottom, one message at a time, gone after 3.2 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null)
  const [shown, setShown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const toast = useCallback((message: string, link: ToastLink | null = null) => {
    setState((current) => ({ message, link, id: (current?.id ?? 0) + 1 }))
    setShown(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShown(false), 3200)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => toast, [toast])
  return (
    <ToastContext value={value}>
      {children}
      <div className={shown ? 'toast show' : 'toast'} role="status" aria-live="polite">
        {state && (
          <>
            <span>{state.message}</span>
            {state.link && (
              <Link to={state.link[1]} onClick={() => setShown(false)}>
                {state.link[0]}
              </Link>
            )}
          </>
        )}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
