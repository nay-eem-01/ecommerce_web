import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BagDrawer } from '../features/cart/Bag'
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

/**
 * The shop's frame. Checkout is focused (its own header, no footer); the order-placed page shows only the wordmark
 * on phone, as in the design. The bag drawer opens over any page.
 */
export function AppLayout() {
  const { pathname } = useLocation()
  const focused = pathname === '/checkout'
  const done = pathname === '/checkout/done'
  return (
    <HighlightProvider>
      <div className="app">
        <a className="skip" href="#main">
          Skip to content
        </a>
        {!focused && (done ? <DoneHeader /> : <Header />)}
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
        {!focused && <Footer />}
        <BagDrawer />
      </div>
      <ScrollOnNavigate />
    </HighlightProvider>
  )
}

function DoneHeader() {
  return (
    <>
      <div className="d-only">
        <Header />
      </div>
      <header className="ph-only done-hdr">
        <Link className="mark" to="/">
          senpai<span>.</span>supply
        </Link>
      </header>
    </>
  )
}

export function PageLoading() {
  return (
    <div className="empty" style={{ paddingBlock: 96 }} aria-busy="true">
      <span className="spin-dot" role="status" aria-label="Loading" style={{ color: 'var(--muted)' }} />
    </div>
  )
}
