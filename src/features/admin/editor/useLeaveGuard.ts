import { useEffect } from 'react'

export const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?'

/**
 * Asks before unsaved edits are lost: on closing or reloading the tab, and on any in-app link click. (The app uses
 * BrowserRouter, where React Router's blocker is not available, so links are caught in the capture phase.)
 */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    const click = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]')
      if (!link || link.getAttribute('target') === '_blank') return
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', click, true)
    }
  }, [dirty])
}
