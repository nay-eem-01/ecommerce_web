import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminReviews, useSetReviewStatus } from '../../api/admin'
import { ApiError } from '../../api/errors'
import type { ReviewStatus } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { shortDate } from '../../lib/dates'
import { useTitle } from '../../lib/useTitle'
import { Stars } from '../../ui/Stars'

const FILTERS: Array<[ReviewStatus | '', string]> = [['', 'All'], ['PUBLISHED', 'Published'], ['HIDDEN', 'Hidden']]

/** Reviews from verified buyers, newest first; hiding takes one off the product page (it can be published again). */
export function ReviewsPage() {
  useTitle('Reviews')
  const [params, setParams] = useSearchParams()
  const status = (['PUBLISHED', 'HIDDEN'].includes(params.get('status') ?? '') ? params.get('status') : '') as ReviewStatus | ''
  const pageNo = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const { data, isPending, isError, error } = useAdminReviews(status, pageNo)
  const moderate = useSetReviewStatus()
  const [message, setMessage] = useState<string | null>(null)

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next)
  }

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Reviews</h1>
        <div className="adm-filters" role="group" aria-label="Show">
          {FILTERS.map(([value, label]) => (
            <button key={label} type="button" className={status === value ? 'chip on' : 'chip'} aria-pressed={status === value}
              onClick={() => go({ status: value, page: '' })}>{label}</button>
          ))}
        </div>
      </div>
      {message && <p className="err" role="alert">{message}</p>}
      {isPending && <PageLoading />}
      {isError && <p className="err" role="alert">{error.message}</p>}
      {data && data.content.length === 0 && <p className="muted">No reviews here yet.</p>}
      {data && data.content.length > 0 && (
        <ul className="adm-signals panel adm-card">
          {data.content.map((r) => (
            <li key={r.id} style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
              <div>
                <p style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Stars rating={r.rating} />
                  <Link className="link" to={`/admin/products/${r.productId}`}>{r.productName ?? `Product ${r.productId}`}</Link>
                  {r.status === 'HIDDEN' && <span className="tag warn">Hidden</span>}
                </p>
                <p style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>{r.body}</p>
                <p style={{ fontSize: 12 }}>{r.authorName} · {shortDate(r.createdAt)}</p>
              </div>
              <button type="button" className="tbtn" style={{ alignSelf: 'start' }} disabled={moderate.isPending}
                aria-label={`${r.status === 'PUBLISHED' ? 'Hide' : 'Publish'} the review by ${r.authorName}`}
                onClick={() => {
                  setMessage(null)
                  moderate.mutate({ id: r.id, status: r.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED' }, {
                    onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Could not update the review. Try again.'),
                  })
                }}>
                {r.status === 'PUBLISHED' ? 'Hide' : 'Publish'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.totalPages > 1 && (
        <nav className="adm-filters" aria-label="Pages">
          <button className="tbtn" type="button" disabled={pageNo === 0} onClick={() => go({ page: String(pageNo - 1) })}>Newer</button>
          <span className="muted" style={{ fontSize: 13 }}>Page {pageNo + 1} of {data.totalPages}</span>
          <button className="tbtn" type="button" disabled={data.last} onClick={() => go({ page: String(pageNo + 1) })}>Older</button>
        </nav>
      )}
    </>
  )
}
