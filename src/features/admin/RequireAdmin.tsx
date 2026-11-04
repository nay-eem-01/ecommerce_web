import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoading } from '../../layout/AppLayout'
import { useSession } from '../auth/session'

export const isStaff = (roles: string[] | undefined) => roles?.includes('ADMIN') ?? false

/**
 * Staff pages: wait for a stored session, send anyone without the ADMIN role to staff sign-in, and hold a first-time
 * admin on the password screen. This only hides screens; the backend checks the privilege on every call.
 */
export function RequireAdmin() {
  const { status, user } = useSession()
  const { pathname, search } = useLocation()
  if (status === 'restoring') return <PageLoading />
  if (status === 'anonymous' || !isStaff(user?.roles)) {
    return <Navigate to={`/admin/sign-in?back=${encodeURIComponent(pathname + search)}`} replace />
  }
  if (user?.mustChangePassword && pathname !== '/admin/password') return <Navigate to="/admin/password" replace />
  return <Outlet />
}
