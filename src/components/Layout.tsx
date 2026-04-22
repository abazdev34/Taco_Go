import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoImg from '../assets/img/logo-burritos.jpg'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import './Layout.scss'

const MenuIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M4 7h16M4 12h16M4 17h16'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		/>
	</svg>
)

const GiftIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M12 7v14M4 10h16M5 10h14v10H5zM7 10V7a2 2 0 0 1 3.4-1.4L12 7l1.6-1.4A2 2 0 1 1 17 7v3'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
	</svg>
)

const InfoIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<circle
			cx='12'
			cy='12'
			r='9'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		/>
		<path
			d='M12 10v5M12 7.5h.01'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		/>
	</svg>
)

const LoginIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M10 17l5-5-5-5M15 12H4'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
		<path
			d='M20 4v16'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		/>
	</svg>
)

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
	const { totalItems, setCartOpen } = useCart()
	const navigate = useNavigate()
	const location = useLocation()

	const logout = async () => {
		await signOut()
		navigate('/login')
	}

	const isActive = (path: string) => location.pathname.startsWith(path)

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
						<span className='nav-link__icon'>
							<MenuIcon />
						</span>
						<span>Меню</span>
					</Link>

					<button type='button' className='nav-link'>
						<span className='nav-link__icon'>
							<GiftIcon />
						</span>
						<span>Акция</span>
					</button>

					<button type='button' className='nav-link'>
						<span className='nav-link__icon'>
							<InfoIcon />
						</span>
						<span>О нас</span>
					</button>

					<button
						type='button'
						className='nav-link nav-link--cart'
						onClick={() => setCartOpen(true)}
					>
						<span className='nav-link__icon'>
							<CartIcon />
						</span>
						<span>Корзина</span>
						{totalItems > 0 && (
							<span className='nav-cart-count'>{totalItems}</span>
						)}
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
							<span className='auth-btn__icon'>
								<LoginIcon />
							</span>
							<span>Войти</span>
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
