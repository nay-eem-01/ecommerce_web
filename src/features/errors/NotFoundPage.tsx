import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="wrap">
      <div className="empty" style={{ paddingBlock: 96 }}>
        <h1 className="page-title">This page moved</h1>
        <Link className="btn" to="/">
          Go to the home page
        </Link>
      </div>
    </div>
  )
}
