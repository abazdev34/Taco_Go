import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.scss'

function Header() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className='header'>
      <div className='logo'>TacoGo</div>

      <nav className='nav'>
        {profile?.role === 'admin' && (
          <>
            <NavLink to='/admin'>Админ</NavLink>
            <NavLink to='/cashier'>Касса</NavLink>
            <NavLink to='/kitchen'>Кухня</NavLink>
            <NavLink to='/monitor'>Зал</NavLink>
            <NavLink to='/assembly'>Сборка</NavLink>
            <NavLink to='/history'>История</NavLink>
            <NavLink to='/client'>Клиент</NavLink>
          </>
        )}
      </nav>

      <div className='header-right'>
        <span className='user-role'>{profile?.role}</span>

        <button className='logout-btn' onClick={logout}>
          Выйти
        </button>
      </div>
    </header>
  )
}

export default Header