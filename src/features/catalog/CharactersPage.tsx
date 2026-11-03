import { Link } from 'react-router-dom'
import { useCharacters } from '../../api/catalog'
import { useTitle } from '../../lib/useTitle'
import { CHARACTER_ART, CHARACTER_BG, artFor } from '../art/art'
import { ProductArt } from '../art/ProductArt'

/** All the shop's characters, each a collection. */
export function CharactersPage() {
  useTitle('Characters')
  const characters = useCharacters()
  return (
    <div className="page" style={{ paddingTop: 20, paddingBottom: 64 }}>
      <p className="meta">
        <Link to="/">Home</Link> / Characters
      </p>
      <h1 className="display listing-title" style={{ marginTop: 6 }}>Characters</h1>
      <p className="listing-blurb" style={{ marginBottom: 20 }}>Our own characters, designed in Dhaka. Pick one and see everything they come on.</p>
      <div className="characters-grid">
        {(characters.data ?? []).map((ch) => (
          <Link key={ch.slug} className="tile" to={`/characters/${ch.slug}`} style={{ aspectRatio: '1 / 1', background: CHARACTER_BG[ch.slug] }}>
            {ch.label && (
              <span className="jp" aria-hidden="true" style={{ fontSize: 40 }}>
                {ch.label}
              </span>
            )}
            <div style={{ position: 'absolute', inset: '8% 18% 24%' }}>
              <ProductArt spec={CHARACTER_ART[ch.slug] ?? artFor({ slug: ch.slug, characterSlug: ch.slug })} />
            </div>
            <div className="label">
              <div>
                <h3 style={{ fontSize: 28 }}>{ch.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                  {ch.blurb ? `${ch.blurb} · ` : ''}
                  {ch.productCount} piece{ch.productCount === 1 ? '' : 's'}
                </p>
              </div>
              <span className="ulink">Shop</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
