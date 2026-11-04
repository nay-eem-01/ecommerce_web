import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useCharacters, useProducts } from '../../api/catalog'
import type { Category, Character } from '../../api/types'
import { tk } from '../../lib/money'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { CATEGORY_ART, CHARACTER_ART, CHARACTER_BG, artFor } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'
import { EarlyAccessDialog } from './EarlyAccess'

/** The campaign shown in the hero; a new drop changes these lines. */
const DROP = { pill: 'Drop 01 · Back to school', sign: '新学期' }

export function HomePage() {
  useTitle(null)
  const categories = useCategories()
  const characters = useCharacters()
  const latest = useProducts({ sort: 'newest', pageSize: 4 })
  const bags = useProducts({ category: 'bags', sort: 'newest', pageSize: 4 })
  const sets = useProducts({ set: true, sort: 'newest', pageSize: 1 })
  const [early, setEarly] = useState<Category | null>(null)
  const onSale = (categories.data ?? []).filter((c) => !c.comingSoon)
  const soon = (categories.data ?? []).filter((c) => c.comingSoon)
  const set = sets.data?.content[0]
  const total = latest.data?.totalElements

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <section className="hero home-hero" aria-label={DROP.pill}>
        <span className="sign home-sign" aria-hidden="true">
          {DROP.sign}
        </span>
        <div className="home-hero-art">
          <ProductArt spec={artFor({ slug: 'kitsune-school-run-set' })} label="Kitsune backpack and bottle" />
        </div>
        <div className="scrim ph-only" />
        <div className="home-hero-copy">
          <span className="drop-pill">
            <b />
            {DROP.pill}
          </span>
          <h1 className="display home-h1">
            Carry your <span style={{ color: 'var(--pink)', textShadow: '0 0 18px var(--glow)' }}>character.</span>
          </h1>
          <p className="home-lede">Anime-printed bottles and school bags, designed in Dhaka. Spin every piece in 360 before you buy.</p>
          <div className="home-ctas">
            <Link className="btn" to="/shop">
              Shop the drop
            </Link>
            <Link className="btn ghost" to="/shop/bags">
              School bags
            </Link>
          </div>
        </div>
      </section>

      <div style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="trust home-trust">
          <span>
            <Icon name="cash" />
            Cash on delivery<span className="d-only">, check before you pay</span>
          </span>
          <span>
            <Icon name="truck" />
            1–2 days in Dhaka<span className="d-only">, 2–4 days elsewhere</span>
          </span>
          <span>
            <Icon name="return" />
            7-day returns
          </span>
        </div>
      </div>

      <section className="page" style={{ paddingTop: 36, paddingBottom: 12 }} aria-label="Categories">
        <div className="home-cats">
          {onSale.map((c) => (
            <Link key={c.slug} className="tile home-tile" to={`/shop/${c.slug}`}>
              {c.label && (
                <span className="jp" aria-hidden="true">
                  {c.label}
                </span>
              )}
              <div className="home-tile-art">
                <ProductArt spec={CATEGORY_ART[c.slug] ?? artFor({ slug: c.slug, categorySlug: c.slug })} />
              </div>
              <div className="label">
                <div>
                  <h3>{c.name}</h3>
                  <p className="meta" style={{ marginTop: 4 }}>
                    {c.productCount} item{c.productCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {soon.map((c) => (
            <button key={c.slug} className="tile home-tile home-soon d-only" onClick={() => setEarly(c)} style={{ background: 'oklch(22% 0.03 290)', border: 0, textAlign: 'left', padding: 0, color: 'inherit' }}>
              {c.label && (
                <span className="jp" aria-hidden="true">
                  {c.label}
                </span>
              )}
              <div className="home-tile-art" style={{ opacity: 0.55 }}>
                <ProductArt spec={CATEGORY_ART.apparel} />
              </div>
              <div className="label">
                <div>
                  <p className="eyebrow" style={{ color: 'var(--cyan)' }}>
                    Coming soon
                  </p>
                  <h3>{c.name}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>Get first access to the drop</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {soon.map((c) => (
          <button key={c.slug} className="panel ph-only" onClick={() => setEarly(c)} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', width: '100%', textAlign: 'left', color: 'inherit' }}>
            <span style={{ width: 56, height: 64, flex: 'none' }}>
              <ProductArt spec={CATEGORY_ART.apparel} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="eyebrow pink" style={{ display: 'block' }}>
                Coming soon{c.label ? ` · ${c.label}` : ''}
              </span>
              <span style={{ fontWeight: 700, display: 'block' }}>{c.name}: tees and hoodies</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Get first access when the drop opens</span>
            </span>
            <Icon name="next" small />
          </button>
        ))}
      </section>

      <section className="page sec-v" aria-labelledby="new-in">
        <div className="sec-head">
          <h2 id="new-in">New in</h2>
          <Link className="ulink" to="/shop">
            {total ? `Shop all ${total}` : 'Shop all'}
          </Link>
        </div>
        {latest.data ? (
          <div className="pgrid">
            {latest.data.content.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <CardSkeletons />
        )}
      </section>

      <div className="home-order">
        {(characters.data?.length ?? 0) > 0 && <Characters list={characters.data ?? []} />}
        {set && (
          <section className="page sec-v home-set" aria-label="The school-run set">
            <Link className="panel home-set-card" to={`/p/${set.slug}`}>
              <div className="home-set-art">
                {set.compareAtPrice && set.compareAtPrice > set.price && (
                  <span className="tag pink" style={{ position: 'absolute', top: 12, left: 12 }}>
                    Set · save {tk(set.compareAtPrice - set.price)}
                  </span>
                )}
                <div style={{ position: 'absolute', inset: '8% 6% 6%' }}>
                  <ProductArt spec={artFor(set)} label={set.name} />
                </div>
              </div>
              <div className="home-set-copy">
                <p className="eyebrow pink">The school-run set</p>
                <h2 className="display home-set-h">Backpack and bottle, matched.</h2>
                <p style={{ color: 'var(--text-2)' }}>{set.specLine ?? set.name}. One parcel, one delivery fee.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="price" style={{ fontSize: 22 }}>
                    {tk(set.price)} {set.compareAtPrice && <span className="was" style={{ fontSize: 14 }}>{tk(set.compareAtPrice)}</span>}
                  </span>
                  <span className="ulink">Shop the set</span>
                </div>
              </div>
            </Link>
          </section>
        )}
      </div>

      <section className="page sec-v ph-only" aria-labelledby="home-bags">
        <div className="sec-head">
          <h2 id="home-bags">School bags</h2>
          <Link className="ulink" to="/shop/bags">
            Shop all
          </Link>
        </div>
        {bags.data ? (
          <div className="pgrid">
            {bags.data.content.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <CardSkeletons />
        )}
      </section>

      <section className="page sec-v home-story" aria-labelledby="commute">
        <div>
          <p className="eyebrow pink">Made for the Dhaka commute</p>
          <h2 id="commute" className="display home-story-h">
            Built for 38° afternoons and monsoon rickshaws.
          </h2>
        </div>
        <div className="home-points">
          {[
            ['24h', 'Cold water all day', 'Double-wall steel bottles keep ice through a full school day.'],
            ['雨', 'Water-resistant nylon', 'Bags shrug off a monsoon shower; a padded sleeve guards the laptop.'],
            ['360', 'See it before you buy', 'Spin every product, then pay the rider after you check it.'],
          ].map(([mark, title, text]) => (
            <div key={title} style={{ display: 'flex', gap: 14 }}>
              <span className="display home-point-mark">{mark}</span>
              <div>
                <p className="home-point-title">{title}</p>
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {early && <EarlyAccessDialog category={early} onClose={() => setEarly(null)} />}
    </div>
  )
}

function Characters({ list }: { list: Character[] }) {
  return (
    <section className="page sec-v home-chars" aria-labelledby="chars" style={{ paddingRight: 0 }}>
      <div className="sec-head" style={{ paddingRight: 16 }}>
        <h2 id="chars">Shop by character</h2>
        <Link className="ulink" to="/characters">
          All
        </Link>
      </div>
      <div className="home-char-row">
        {list.map((ch) => (
          <Link key={ch.slug} className="tile home-char" to={`/characters/${ch.slug}`} style={{ background: CHARACTER_BG[ch.slug] }}>
            {ch.label && (
              <span className="jp" aria-hidden="true">
                {ch.label}
              </span>
            )}
            <div style={{ position: 'absolute', inset: '8% 16% 26%' }}>
              <ProductArt spec={CHARACTER_ART[ch.slug] ?? artFor({ slug: ch.slug, characterSlug: ch.slug })} />
            </div>
            <div className="label">
              <div>
                <h3>{ch.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
                  {ch.productCount} piece{ch.productCount === 1 ? '' : 's'}
                </p>
              </div>
              <span className="ulink d-only">Shop</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
