import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.scss'

function LoginPage() {
  const { signIn, refreshProfile, profile } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      const normalizedEmail = email.trim().toLowerCase()
      const { error } = await signIn(normalizedEmail, password)

      if (error) {
        alert(error)
        return
      }

      await refreshProfile()

      // Небольшая пауза, чтобы profile успел обновиться
      setTimeout(() => {
        if (normalizedEmail === 'burritos@gmail.com') {
          navigate('/admin', { replace: true })
          return
        }

        switch (profile?.role) {
          case 'admin':
            navigate('/admin', { replace: true })
            break
          case 'cashier':
            navigate('/cashier', { replace: true })
            break
          case 'kitchen':
            navigate('/kitchen', { replace: true })
            break
          case 'hall':
            navigate('/monitor', { replace: true })
            break
          case 'assembly':
            navigate('/assembly', { replace: true })
            break
          case 'history':
            navigate('/history', { replace: true })
            break
          default:
            navigate('/client', { replace: true })
        }
      }, 300)
    } catch (err) {
      console.error(err)
      alert('Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-page'>
      <div className='login-card'>
        <h1 className='login-title'>TacoGo</h1>
        <p className='login-subtitle'>Вход в систему</p>

        <form onSubmit={handleLogin} className='login-form'>
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            type='password'
            placeholder='Пароль'
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button type='submit' disabled={loading}>
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage