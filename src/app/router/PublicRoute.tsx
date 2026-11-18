import { Navigate, useLocation } from 'react-router'
import { isAdminUser, useAuthStore } from '@/stores/authStore'
import { toSafeInternalPath } from '@/shared/utils/security'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (isAuthenticated) {
    const defaultPath = isAdminUser(user) ? '/dashboard' : '/articles'
    const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname
    const from = toSafeInternalPath(rawFrom, defaultPath)
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
