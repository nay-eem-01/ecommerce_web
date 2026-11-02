import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * The product page marks its category in the header's category row, as the prototype does; list pages are matched
 * by URL. Holds the slug the current page asked for, or null.
 */
const HighlightContext = createContext<{ slug: string | null; set: (slug: string | null) => void }>({
  slug: null,
  set: () => {},
})

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [slug, set] = useState<string | null>(null)
  return <HighlightContext value={{ slug, set }}>{children}</HighlightContext>
}

export function useHighlightedCategory(): string | null {
  return useContext(HighlightContext).slug
}

/** Call from a page to mark `slug` in the category row while the page is open. */
export function useHighlightCategory(slug: string | null | undefined): void {
  const { set } = useContext(HighlightContext)
  useEffect(() => {
    set(slug ?? null)
    return () => set(null)
  }, [slug, set])
}
