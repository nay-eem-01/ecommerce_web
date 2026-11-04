import { Icon } from './icons'

/** Five stars, `rating` of them lit (rounded), read out as "4 out of 5". */
export function Stars({ rating }: { rating: number }) {
  const lit = Math.round(rating)
  return (
    <span className="stars" role="img" aria-label={`${lit} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= lit ? undefined : 'off'} style={{ display: 'inline-flex' }}>
          <Icon name="star" />
        </span>
      ))}
    </span>
  )
}
