import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (!isSuperAdmin()) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
