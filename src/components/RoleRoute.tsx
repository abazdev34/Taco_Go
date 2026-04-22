import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = {
  children: React.ReactNode
  allowedRoles: string[]
}

function RoleRoute({ children, allowedRoles }: Props) {
  const { profile, loading } = useAuth()

  if (loading) {
    return null
  }

  // Админ бардык беттерге кирет
  if (profile?.role === 'admin') {
    return <>{children}</>
  }

  // Эгер роль жок же тизмеде жок болсо
  if (!allowedRoles.includes(profile?.role || '')) {
    return <Navigate to='/' replace />
  }

  return <>{children}</>
}

export default RoleRoute