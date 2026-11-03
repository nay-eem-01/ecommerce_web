import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface Bag {
  isOpen: boolean
  open: () => void
  close: () => void
}

const BagContext = createContext<Bag>({ isOpen: false, open: () => {}, close: () => {} })

/** Whether the bag drawer is open; the header's bag button and "Add to bag" open it. */
export function BagProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close])
  return <BagContext value={value}>{children}</BagContext>
}

export function useBag(): Bag {
  return useContext(BagContext)
}
