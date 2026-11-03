import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'
import { HighlightProvider } from './highlight'

/** Scroll to the top on a new page, or to the #section a link names (help links, reviews). */
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
      <div className="app">
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
      </div>
      <ScrollOnNavigate />
    </HighlightProvider>
  )
}

export function PageLoading() {
  return (
    <div className="empty" style={{ paddingBlock: 96 }} aria-busy="true">
      <span className="spin-dot" role="status" aria-label="Loading" style={{ color: 'var(--muted)' }} />
    </div>
  )
}
