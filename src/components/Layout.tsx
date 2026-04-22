import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/img/logo-burritos.jpg'
import './Layout.scss'

const CartIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.7L21 7H7'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <circle cx='10' cy='19' r='1.8' fill='currentColor' />
    <circle cx='18' cy='19' r='1.8' fill='currentColor' />
  </svg>
)

function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const hideNavbarRoutes = ['/monitor']
  const shouldHideNavbar = hideNavbarRoutes.some(path =>
    location.pathname.startsWith(path)
  )

  const logout = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  if (shouldHideNavbar) {
    return (
      <main className='page page--fullscreen'>
        <Outlet />
      </main>
    )
  }

  return (
    <div className='app-shell'>
      <header className='navbar'>
        <div className='navbar__left'>
          <Link to='/client' className='brand'>
            <img src={logoImg} alt='Бурритос' className='brand__logo' />
            <div className='brand__text'>
              <span className='brand__badge'>Mexican Grill</span>
              <strong>БУРРИТОС</strong>
            </div>
          </Link>
        </div>

        <nav className='nav-links'>
          <Link
            to='/client'
            className={isActive('/client') ? 'nav-link active' : 'nav-link'}
          >
            Меню
          </Link>

          <a href='#promo' className='nav-link'>
            Акция
          </a>

          <button
            type='button'
            className='nav-link nav-link--cart'
            onClick={() => window.dispatchEvent(new CustomEvent('open-client-cart'))}
          >
            <span className='nav-link__icon'>
              <CartIcon />
            </span>
            <span>Наша корзина</span>
          </button>

          {profile?.role === 'admin' && (
            <Link
              to='/admin'
              className={isActive('/admin') ? 'nav-link active' : 'nav-link'}
            >
              Админ
            </Link>
          )}
        </nav>

        <div className='auth-block'>
          {user ? (
            <>
              <span className='user-email'>{user.email}</span>
              <button className='auth-btn auth-btn--logout' onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <Link to='/login' className='auth-btn auth-btn--login'>
              Войти
            </Link>
          )}
        </div>
      </header>

      <main className='page'>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout