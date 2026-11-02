import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoading } from '../../layout/AppLayout'
import { useSession } from './session'

/** Account pages: wait for a stored session to restore, else send the shopper to sign in and back. */
export function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()
  if (status === 'restoring') return <PageLoading />
  if (status === 'anonymous') {
    return <Navigate to={`/sign-in?back=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <Outlet />
}
