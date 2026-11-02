import { useEffect } from 'react'

/** Sets the tab title to "<title> | Senpai Supply" while the page is open. */
export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | Senpai Supply` : 'Senpai Supply'
  }, [title])
}
