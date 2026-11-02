import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // jsdom always has storage; nothing to do.
  }
})

// Pages load lazily; the first import of a chunk can take a moment under a parallel run.
configure({ asyncUtilTimeout: 3000 })

// jsdom has no canvas: the 360 stand-in renderer checks for a null context and draws nothing.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']

// jsdom lacks these browser APIs the product page uses.
window.scrollTo = (() => {}) as typeof window.scrollTo
Element.prototype.scrollIntoView ??= function () {}
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia
