import { Link } from 'react-router-dom'
import { useCategories, useProducts } from '../../api/catalog'
import { useDeliveryOptions } from '../../api/checkout'
import { tk } from '../../lib/money'
import { stockLine } from '../../lib/stock'
import { Icon } from '../../ui/Icon'
import { CardSkeletons, ProductCard } from '../catalog/ProductCard'
import { ProductImage } from '../catalog/ProductImage'
import { CategoryTile } from './CategoryTile'
import { Gacha } from './Gacha'

export function HomePage() {
  const latest = useProducts({ sort: 'newest', pageSize: 4 })
  const featured = useProducts({ category: 'figures', inStock: true, sort: 'newest', pageSize: 1 })
  const categories = useCategories()
  const delivery = useDeliveryOptions()
  const feature = featured.data?.content[0] ?? latest.data?.content[0]
  const freeAt = delivery.data?.freeDeliveryThreshold

  return (
    <div className="wrap">
      <section className="home-hero">
        <div>
          <h1>
            Akihabara, <span>delivered</span> to your door.
          </h1>
          <p className="lede">Figures, cosplay, bottles and bags. Spin every product in 360 before you buy.</p>
          <div className="actions">
            <Link className="btn lg" to="/shop">
              Shop all products
            </Link>
            {feature && (
              <Link className="btn alt lg" to={`/p/${feature.slug}`}>
                See this week’s figure
              </Link>
            )}
          </div>
          <div className="perks">
            <span>
              <Icon name="cash" />
              Cash on delivery
            </span>
            {freeAt != null && (
              <span>
                <Icon name="truck" />
                Free delivery over {tk(freeAt)}
              </span>
            )}
            <span>
              <Icon name="return" />
              7-day returns
            </span>
          </div>
        </div>
        <div className="feature">
          <div className="slot">
            {feature && (
              <ProductImage slug={feature.slug} categorySlug={feature.categorySlug} url={feature.thumbnailUrl} alt={feature.name} />
            )}
          </div>
          <span className="sign" aria-hidden="true">
            新入荷
          </span>
          {feature && (
            <Link className="feature-cap" to={`/p/${feature.slug}`}>
              <span>
                <strong>{feature.name}</strong>
                <span className="muted">{stockLine(feature).text}</span>
              </span>
              <span className="price">{tk(feature.price)}</span>
            </Link>
          )}
        </div>
      </section>

      <section className="sec">
        <div className="sec-head">
          <h2 className="h2">Shop by category</h2>
        </div>
        <div className="cat-tiles">
          {(categories.data ?? []).map((c, i) => (
            <CategoryTile key={c.slug} category={c} angle={0.3 + i * 0.4} />
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec-head">
          <h2 className="h2">New this week</h2>
          <Link className="link" to="/shop">
            {latest.data ? `See all ${latest.data.totalElements} products` : 'See all products'}
          </Link>
        </div>
        {latest.data ? (
          <div className="grid">
            {latest.data.content.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <CardSkeletons />
        )}
      </section>

      <Gacha />
    </div>
  )
}
