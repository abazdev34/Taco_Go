import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = {
  children: React.ReactNode
  allowedRoles: string[]
}

function RoleRoute({ children, allowedRoles }: Props) {
  const { profile, loading, user } = useAuth()
  const location = useLocation()

  if (location.pathname.startsWith('/client')) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Загрузка...
      </div>
    )
  }

  if (!user) {
    return <Navigate to='/login' replace />
  }

  if (!profile) {
    return <Navigate to='/pending-approval' replace />
  }

  if (profile.role === 'admin') {
    return <>{children}</>
  }

  if (!allowedRoles.includes(profile.role || '')) {
    return <Navigate to='/' replace />
  }

  return <>{children}</>
}

export default RoleRoute