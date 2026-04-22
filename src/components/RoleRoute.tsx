import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = {
  children: React.ReactNode
  allowedRoles: string[]
}

function RoleRoute({ children, allowedRoles }: Props) {
  const { profile, loading, user } = useAuth()

  // 🔥 1. loading — норм UI көрсөт
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Жүктөлүүдө...
      </div>
    )
  }

  // 🔥 2. эгер login жок болсо → login
  if (!user) {
    return <Navigate to='/login' replace />
  }

  // 🔥 3. profile жок болсо (кеч жүктөлгөндө)
  if (!profile) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Профиль жүктөлүүдө...
      </div>
    )
  }

  // 🔥 4. admin бардык жерге кирет
  if (profile.role === 'admin') {
    return <>{children}</>
  }

  // 🔥 5. роль туура эмес болсо
  if (!allowedRoles.includes(profile.role || '')) {
    return <Navigate to='/' replace />
  }

  return <>{children}</>
}

export default RoleRoute