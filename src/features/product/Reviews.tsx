import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import { useCreateReview, useDeleteReview, useReviews } from '../../api/products'
import { shortDate } from '../../lib/dates'
import { Icon } from '../../ui/icons'
import { Stars } from '../../ui/Stars'
import { useToast } from '../../ui/Toast'
import { useSession } from '../auth/session'

/** Rating summary, reviews from verified buyers, and the form for shoppers who received the product. */
export function Reviews({ slug }: { slug: string }) {
  const reviews = useReviews(slug)
  const { status } = useSession()
  const [writing, setWriting] = useState(false)
  const remove = useDeleteReview(slug)
  const toast = useToast()

  if (reviews.isPending) return <p className="muted">Loading reviews…</p>
  if (reviews.error) return <p className="muted">{errorMessage(reviews.error)}</p>

  const summary = reviews.data.pages[0].summary
  const list = reviews.data.pages.flatMap((p) => p.reviews.content)
  const average = summary.average ?? 0

  return (
    <>
      {summary.count > 0 ? (
        <div className="reviews-head">
          <Stars rating={average} />
          <span>
            <strong>{average.toFixed(1)}</strong>{' '}
            <span className="muted">
              from {summary.count} review{summary.count === 1 ? '' : 's'}
            </span>
          </span>
          <div className="dist" aria-label="Ratings">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[String(star)] ?? 0
              return (
                <div key={star}>
                  <span>{star}★</span>
                  <span className="bar">
                    <i style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} />
                  </span>
                  <span>{n}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 16 }}>
          No reviews yet. Reviews come from shoppers who received this product.
        </p>
      )}
      {list.map((r) => (
        <article className="review" key={r.id}>
          <header>
            <span className="who">{r.authorName}</span>
            <Stars rating={r.rating} />
            {r.verifiedBuyer && <span className="pill ok">Verified buyer</span>}
            <span className="muted" style={{ fontSize: 14 }}>
              {shortDate(r.creationDate)}
            </span>
          </header>
          <p>{r.body}</p>
          {r.mine && (
            <div>
              <button
                type="button"
                className="link"
                disabled={remove.isPending}
                onClick={() => remove.mutate(r.id, { onSuccess: () => toast('Review deleted'), onError: (e) => toast(errorMessage(e)) })}
              >
                Delete my review
              </button>
            </div>
          )}
        </article>
      ))}
      {reviews.hasNextPage && (
        <button className="btn alt" type="button" style={{ marginTop: 16, marginRight: 12 }} disabled={reviews.isFetchingNextPage} onClick={() => reviews.fetchNextPage()}>
          {reviews.isFetchingNextPage ? 'Loading…' : 'Show more reviews'}
        </button>
      )}
      {status !== 'signed-in' ? (
        <Link className="btn alt" style={{ marginTop: 16 }} to={`/sign-in?back=${encodeURIComponent(`/p/${slug}#reviews`)}`}>
          Sign in to write a review
        </Link>
      ) : writing ? (
        <ReviewForm slug={slug} onDone={() => setWriting(false)} />
      ) : (
        <button className="btn alt" type="button" style={{ marginTop: 16 }} onClick={() => setWriting(true)}>
          Write a review
        </button>
      )}
    </>
  )
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const create = useCreateReview(slug)
  const toast = useToast()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!rating) return setError('Choose 1 to 5 stars.')
    if (body.trim().length < 10) return setError('Use 10 to 1000 characters for your review.')
    setError('')
    create.mutate(
      { rating, body: body.trim() },
      {
        onSuccess: () => {
          toast('Thanks for your review')
          onDone()
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  return (
    <form className="panel" style={{ padding: 20, display: 'grid', gap: 16, marginTop: 16, maxWidth: '66ch' }} onSubmit={submit} noValidate>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>Your rating</legend>
        <div className="star-pick">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={n <= rating} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setRating(n)}>
              <Icon name="star" />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="review-body">Your review</label>
        <textarea className="input" id="review-body" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was it in hand? Did it match the 360 view?" />
      </div>
      {error && (
        <p className="err" role="alert" style={{ color: 'var(--bad)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="alert" />
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={create.isPending}>
          {create.isPending ? 'Posting…' : 'Post review'}
        </button>
        <button className="btn alt" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
