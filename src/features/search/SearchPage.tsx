import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProducts } from '../../api/catalog'
import { errorMessage } from '../../api/errors'
import { Icon } from '../../ui/Icon'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'

const POPULAR = ['figure', 'wig', 'bottle', 'backpack']

/** Search as you type (180 ms pause), with the query in the URL. Empty: the newest products. */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const urlQ = params.get('q') ?? ''
  const [text, setText] = useState(urlQ)
  const [seen, setSeen] = useState(urlQ)
  if (seen !== urlQ) {
    // The header search changed the URL: follow it.
    setSeen(urlQ)
    setText(urlQ)
  }
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!urlQ) input.current?.focus()
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (text === urlQ) return
    const timer = setTimeout(() => setParams(text.trim() ? { q: text } : {}, { replace: true }), 180)
    return () => clearTimeout(timer)
  }, [text, urlQ, setParams])

  const q = urlQ.trim()
  const results = useProducts({ q, sort: 'newest', pageSize: 48 }, q !== '')
  const trending = useProducts({ sort: 'newest', pageSize: 4 }, q === '')
  const shown = q ? results : trending
  const count = results.data?.totalElements ?? 0

  return (
    <div className="wrap">
      <h1 className="page-title" style={{ paddingTop: 24 }}>
        Search
      </h1>
      <form
        className="search-big"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(text.trim() ? { q: text } : {}, { replace: true })
        }}
      >
        <Icon name="search" />
        <label className="vh" htmlFor="q2">
          Search products
        </label>
        <input
          ref={input}
          id="q2"
          type="search"
          value={text}
          placeholder="Try “wig”, “750 ml” or “1/7”"
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
        />
      </form>
      <div className="suggest">
        <span>Popular:</span>
        {POPULAR.map((s) => (
          <button key={s} type="button" onClick={() => setParams({ q: s }, { replace: true })}>
            {s}
          </button>
        ))}
        <button type="button" onClick={() => navigate('/preorders')}>
          pre-order
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 20 }} aria-live="polite">
        {q ? (results.isPending ? 'Searching…' : `${count} result${count === 1 ? '' : 's'} for “${q}”`) : 'New this week'}
      </p>
      {shown.error ? (
        <div className="empty panel" role="alert">
          <h2 className="h3">Search did not load</h2>
          <p className="muted">{errorMessage(shown.error)}</p>
        </div>
      ) : !shown.data ? (
        <CardSkeletons />
      ) : shown.data.content.length ? (
        <div className="grid">
          {shown.data.content.map((p) => (
            <ProductCard key={p.id} product={p} highlight={q} />
          ))}
        </div>
      ) : (
        <div className="empty panel">
          <h2 className="h3">No products match “{q}”</h2>
          <p className="muted">Check the spelling, or try a broader word like figure, wig or bottle.</p>
          <Link className="btn alt" to="/shop">
            Browse all products
          </Link>
        </div>
      )}
      <div style={{ height: 64 }} />
    </div>
  )
}
