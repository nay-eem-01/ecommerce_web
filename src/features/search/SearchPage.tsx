import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCategories, useCharacters, useProducts } from '../../api/catalog'
import { errorMessage } from '../../api/errors'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { CATEGORY_ART } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'

const POPULAR = ['Kitsune', '750 ml bottle', 'school backpack', 'kids bottle']
const RECENT_KEY = 'senpai.recentSearches'

export function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}

export function rememberSearch(q: string): string[] {
  const next = [q, ...readRecent().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 5)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Not remembered on this device.
  }
  return next
}

/**
 * Search as you type (180 ms pause), query in the URL. Empty: recent and popular searches and the categories.
 * Typed: matching characters and categories as suggestions, then the products with the match marked.
 */
export function SearchPage() {
  useTitle('Search')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const urlQ = params.get('q') ?? ''
  const [text, setText] = useState(urlQ)
  const [seen, setSeen] = useState(urlQ)
  if (seen !== urlQ) {
    setSeen(urlQ)
    setText(urlQ)
  }
  const [recent, setRecent] = useState(readRecent)
  const input = useRef<HTMLInputElement>(null)
  const categories = useCategories()
  const characters = useCharacters()

  useEffect(() => {
    input.current?.focus()
  }, [])

  useEffect(() => {
    if (text === urlQ) return
    const timer = setTimeout(() => {
      setParams(text.trim() ? { q: text } : {}, { replace: true })
      if (text.trim().length >= 3) setRecent(rememberSearch(text.trim()))
    }, 180)
    return () => clearTimeout(timer)
  }, [text, urlQ, setParams])

  const q = urlQ.trim()
  const lower = q.toLowerCase()
  const results = useProducts({ q, sort: 'newest', pageSize: 24 }, q !== '')
  const fresh = useProducts({ sort: 'newest', pageSize: 4 }, q === '')
  const shown = q ? results : fresh
  const count = results.data?.totalElements ?? 0
  const suggestions = q
    ? [
        ...(characters.data ?? []).filter((c) => c.name.toLowerCase().includes(lower)).map((c) => ({ to: `/characters/${c.slug}`, text: `${c.name} collection`, n: c.productCount })),
        ...(categories.data ?? []).filter((c) => !c.comingSoon && c.name.toLowerCase().includes(lower)).map((c) => ({ to: `/shop/${c.slug}`, text: c.name, n: c.productCount })),
      ]
    : []
  const choose = (s: string) => setText(s)

  return (
    <div className="search-page">
      <div className="page search-bar">
        <form
          role="search"
          style={{ flex: 1, position: 'relative' }}
          onSubmit={(e) => {
            e.preventDefault()
            setParams(text.trim() ? { q: text } : {}, { replace: true })
          }}
        >
          <span style={{ position: 'absolute', left: 14, top: 14, color: 'var(--muted)' }}>
            <Icon name="search" />
          </span>
          <label className="vh" htmlFor="q2">
            Search products
          </label>
          <input
            ref={input}
            id="q2"
            className="input search-input"
            type="search"
            value={text}
            placeholder="Bottles, bags, characters"
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
          />
        </form>
        {q && (
          <button className="ulink d-only" style={{ border: 0, borderBottom: '1px solid currentColor', background: 'transparent' }} onClick={() => setText('')}>
            Clear
          </button>
        )}
        <button className="ibtn" aria-label="Close search" onClick={() => navigate(-1)}>
          <Icon name="close" />
        </button>
      </div>

      <div className="page search-body">
        <aside className="search-side">
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Suggestions</p>
              {suggestions.map((s) => (
                <Link key={s.to} to={s.to} className="search-suggest">
                  <span>{s.text}</span>
                  <span className="meta">{s.n}</span>
                </Link>
              ))}
            </div>
          )}
          <div className={q ? 'd-only' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="eyebrow">Popular</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR.map((s) => (
                  <button key={s} className="chip" onClick={() => choose(s)}>
                    {s}
                  </button>
                ))}
                <button className="chip" onClick={() => navigate('/preorders')}>
                  pre-order
                </button>
              </div>
          </div>
          {recent.length > 0 && (
            <div className={q ? 'd-only' : undefined} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p className="eyebrow">Recent</p>
                <button
                  className="meta"
                  style={{ border: 0, background: 'transparent', padding: 0 }}
                  onClick={() => {
                    try {
                      localStorage.removeItem(RECENT_KEY)
                    } catch {
                      // Nothing stored.
                    }
                    setRecent([])
                  }}
                >
                  Clear
                </button>
              </div>
              {recent.map((s) => (
                <button key={s} className="search-recent" onClick={() => choose(s)}>
                  <Icon name="clock" small />
                  {s}
                </button>
              ))}
            </div>
          )}
          {!q && (
            <div className="ph-only" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {(categories.data ?? []).filter((c) => !c.comingSoon).slice(0, 2).map((c) => (
                <Link key={c.slug} className="tile" to={`/shop/${c.slug}`} style={{ aspectRatio: '1 / 1' }}>
                  {c.label && <span className="jp" aria-hidden="true">{c.label}</span>}
                  <div style={{ position: 'absolute', inset: '10% 20% 24%' }}>
                    <ProductArt spec={CATEGORY_ART[c.slug] ?? CATEGORY_ART.bottles} />
                  </div>
                  <div className="label">
                    <h3 style={{ fontSize: 18 }}>{c.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>

        <section className="search-results" aria-live="polite" aria-label="Results">
          <div className={q ? 'sec-head' : 'sec-head d-only'}>
            <p className="eyebrow">{q ? (results.isPending ? 'Searching…' : `${count} product${count === 1 ? '' : 's'} for “${q}”`) : 'New this week'}</p>
            {q && count > 0 && (
              <Link className="ulink" to={`/shop`}>
                Shop all
              </Link>
            )}
          </div>
          <div className={q ? undefined : 'd-only'}>
            {shown.error ? (
              <p role="alert">{errorMessage(shown.error)}</p>
            ) : !shown.data ? (
              <CardSkeletons />
            ) : shown.data.content.length ? (
              <div className="pgrid">
                {shown.data.content.map((p) => (
                  <ProductCard key={p.id} product={p} highlight={q} />
                ))}
              </div>
            ) : (
              <div className="empty panel">
                <h2 className="display" style={{ fontSize: 20 }}>No products match “{q}”</h2>
                <p style={{ color: 'var(--muted)' }}>Check the spelling, or try a broader word like bottle, backpack or Kitsune.</p>
              </div>
            )}
          </div>
          {q && (
            <button className="link ph-only" style={{ marginTop: 20, border: 0, background: 'transparent', padding: 0 }} onClick={() => setText('')}>
              Clear search
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
