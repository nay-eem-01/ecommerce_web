import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { IconSprite } from '../ui/Icon'
import { Footer } from './Footer'
import { Header } from './Header'
import { HighlightProvider } from './highlight'

/** Scroll to the top on a new page, or to the #section the link names (footer help links). */
function ScrollOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export function AppLayout() {
  return (
    <HighlightProvider>
      <IconSprite />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollOnNavigate />
    </HighlightProvider>
  )
}

export function PageLoading() {
  return (
    <div className="wrap" aria-busy="true">
      <div className="empty" style={{ paddingBlock: 96 }}>
        <span className="spin-dot muted" role="status" aria-label="Loading" />
      </div>
    </div>
  )
}
