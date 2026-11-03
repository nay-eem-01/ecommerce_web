import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BagDrawer } from '../features/cart/Bag'
import { Icon } from '../ui/icons'
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
  // Phone sign-in and order-placed pages carry only the wordmark (sign-in adds a close button), as in the design.
  const minimal = pathname === '/checkout/done' ? 'done' : pathname === '/sign-in' ? 'sign-in' : null
  return (
    <HighlightProvider>
      <div className="app">
        <a className="skip" href="#main">
          Skip to content
        </a>
        {!focused && (minimal ? <MinimalHeader kind={minimal} /> : <Header />)}
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

function MinimalHeader({ kind }: { kind: 'done' | 'sign-in' }) {
  return (
    <>
      <div className="d-only">
        <Header />
      </div>
      {kind === 'done' ? (
        <header className="ph-only done-hdr">
          <Link className="mark" to="/">
            senpai<span>.</span>supply
          </Link>
        </header>
      ) : (
        <header className="ph-only phone-hdr">
          <Link className="ibtn" to="/" aria-label="Close">
            <Icon name="close" />
          </Link>
          <Link className="mark" to="/">
            senpai<span>.</span>supply
          </Link>
          <span />
        </header>
      )}
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
