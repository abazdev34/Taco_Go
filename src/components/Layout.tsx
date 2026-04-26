import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import './Layout.scss'

// Иконкалар
const MenuIcon = () => (
  <svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
    <path d='M4 7h16M4 12h16M4 17h16' />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
    <path d='M6 6l12 12M18 6 6 18' />
  </svg>
)

const GiftIcon = () => (
  <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M12 7v14M4 10h16M5 10h14v10H5zM7 10V7a2 2 0 0 1 3.4-1.4L12 7l1.6-1.4A2 2 0 1 1 17 7v3' />
  </svg>
)

const InfoIcon = () => (
  <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2'>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 10v5M12 7.5h.01' strokeLinecap='round' />
  </svg>
)

const LoginIcon = () => (
  <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M10 17l5-5-5-5M15 12H4M20 4v16' />
  </svg>
)

const CartIcon = () => (
  <svg viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.7L21 7H7' />
    <circle cx='10' cy='19' r='1.8' fill='currentColor' />
    <circle cx='18' cy='19' r='1.8' fill='currentColor' />
  </svg>
)

function Layout() {
  const { user, profile, signOut } = useAuth()
  const { totalItems, setCartOpen } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const pathname = location.pathname
  const isActive = (path: string) => pathname.startsWith(path)

  const isClientPage = pathname.startsWith('/client')
  const isMonitorPage =
    pathname.startsWith('/monitor') ||
    pathname.startsWith('/kitchen') ||
    pathname.startsWith('/assembly') ||
    pathname.startsWith('/cashier')

  const hideNavbar = isMonitorPage

  const logout = async () => {
    await signOut()
    setMobileMenuOpen(false)
    navigate('/login')
  }

  if (hideNavbar) {
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
          <Link to='/client' className='brand' onClick={() => setMobileMenuOpen(false)}>
            <div className='brand__text'>
              <span className='brand__badge'>Mexican Grill</span>
              <strong>БУРРИТОС</strong>
            </div>
          </Link>
        </div>

        <nav className='nav-links nav-links--desktop'>
          <Link to='/client' className={isActive('/client') ? 'nav-link active' : 'nav-link'}>
            <span className='nav-link__icon'><MenuIcon /></span>
            <span>Меню</span>
          </Link>

          <button type='button' className='nav-link'>
            <span className='nav-link__icon'><GiftIcon /></span>
            <span>Акция</span>
          </button>

          <button type='button' className='nav-link'>
            <span className='nav-link__icon'><InfoIcon /></span>
            <span>О нас</span>
          </button>

          {isClientPage && (
            <button type='button' className='nav-link nav-link--cart' onClick={() => setCartOpen(true)}>
              <span className='nav-link__icon'><CartIcon /></span>
              <span>Корзина</span>
              {totalItems > 0 && <span className='nav-cart-count'>{totalItems}</span>}
            </button>
          )}

          {profile?.role === 'admin' && (
            <Link to='/admin' className={isActive('/admin') ? 'nav-link active' : 'nav-link'}>Админ</Link>
          )}
        </nav>

        <div className='auth-block auth-block--desktop'>
          {user ? (
            <>
              <span className='user-email'>{user.email}</span>
              <button className='auth-btn auth-btn--logout' onClick={logout}>Выйти</button>
            </>
          ) : (
            <Link to='/login' className='auth-btn auth-btn--login'>
              <span className='auth-btn__icon'><LoginIcon /></span>
              <span>Войти</span>
            </Link>
          )}
        </div>

        <div className='mobile-actions'>
          {isClientPage && (
            <button type='button' className='mobile-action mobile-action--cart' onClick={() => setCartOpen(true)}>
              <span className='mobile-action__icon'><CartIcon /></span>
              {totalItems > 0 && <span className='mobile-cart-count'>{totalItems}</span>}
            </button>
          )}
          <button type='button' className='mobile-action mobile-action--burger' onClick={() => setMobileMenuOpen(true)}>
            <span className='mobile-action__icon'><MenuIcon /></span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className='mobile-drawer-wrap'>
            <motion.div
              className='mobile-drawer__overlay'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className='mobile-drawer__panel'
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className='mobile-drawer__head'>
                <div className='mobile-drawer__brand'>
                  <div>
                    <strong>БУРРИТОС</strong>
                    <span>Mexican Grill</span>
                  </div>
                </div>
                <button type='button' className='mobile-drawer__close' onClick={() => setMobileMenuOpen(false)}>
                  <CloseIcon />
                </button>
              </div>

              <div className='mobile-drawer__links'>
                <Link to='/client' className='mobile-drawer__link' onClick={() => setMobileMenuOpen(false)}>
                  <span className='mobile-drawer__icon'><MenuIcon /></span>
                  Меню
                </Link>
                <button type='button' className='mobile-drawer__link'><span className='mobile-drawer__icon'><GiftIcon /></span>Акция</button>
                <button type='button' className='mobile-drawer__link'><span className='mobile-drawer__icon'><InfoIcon /></span>О нас</button>
                {profile?.role === 'admin' && (
                  <Link to='/admin' className='mobile-drawer__link' onClick={() => setMobileMenuOpen(false)}>Админ панель</Link>
                )}
              </div>

              <div className='mobile-drawer__footer'>
                {user ? (
                  <button className='auth-btn auth-btn--logout' onClick={logout}>Выйти</button>
                ) : (
                  <Link to='/login' className='auth-btn auth-btn--login' onClick={() => setMobileMenuOpen(false)}>Войти</Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className='page-content'>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
