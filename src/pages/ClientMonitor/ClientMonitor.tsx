import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createOrder, updateCashierOrder } from '../../api/orders'
import heroBg from '../../assets/img/logo-burritos.jpg'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import {
	ICreateOrderPayload,
	IMenuItem,
	TOrderPlace,
	TPaymentMethod,
} from '../../types/order'
import { formatPrice } from '../../utils/currency'
import { buildOrderComment } from '../../utils/orderHelpers'
import './ClientMonitor.scss'

type TClientCategory = {
	id?: string
	name?: string
	title?: string
	sort_order?: number | null
	type?: 'kitchen' | 'assembly' | null | string
}

type TClientMenuItem = IMenuItem & {
	quantity?: number
	description?: string
	image?: string | null
	image_url?: string | null
	photo?: string | null
	category?: string
	categories?: TClientCategory | null
	is_active?: boolean
	sort_order?: number | null
}

const DEFAULT_IMAGE =
	'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'

const getItemImage = (item: TClientMenuItem) =>
	item.image_url || item.image || item.photo || DEFAULT_IMAGE

const getItemCategoryName = (item: TClientMenuItem) =>
	item.categories?.name || item.categories?.title || item.category || 'Другое'

const formatOrderNumber = (value?: number | null) =>
	String(value || 0).padStart(3, '0')

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error('Таймаут загрузки меню')), ms),
		),
	])
}

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

const CloseIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M6 6l12 12M18 6 6 18'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		/>
	</svg>
)

const HallIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M7 20v-7m10 7v-7M5 11h14M8 11V7a2 2 0 1 1 4 0v4m0 0V7a2 2 0 1 1 4 0v4'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
	</svg>
)

const TakeawayIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M6 8h12l-1 10H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
	</svg>
)

const FireIcon = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true'>
		<path
			d='M12 3s2.5 2.2 2.5 5.2c0 1.3-.6 2.1-1.3 3 .8-.2 1.8-1 2.4-1.9 1.7 1.3 3.4 3.7 3.4 6.4A7 7 0 1 1 5 15.7c0-3.1 1.8-5.8 4.5-7.7.2 1.5.9 2.7 1.8 3.5C11.8 9.9 12 8.7 12 7.7 12 5.9 11.4 4.4 12 3Z'
			fill='currentColor'
		/>
	</svg>
)

const ClientMonitor = () => {
	const { loading: authLoading } = useAuth()
	const {
		cart,
		cartOpen,
		setCartOpen,
		totalItems,
		totalSum,
		addToCart,
		removeFromCart,
		clearCart,
	} = useCart()

	const [menuItems, setMenuItems] = useState<TClientMenuItem[]>([])
	const [comment, setComment] = useState('')
	const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')
	const [paymentMethod] = useState<TPaymentMethod>('online')
	const [loading, setLoading] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [activeCategory, setActiveCategory] = useState('all')
	const [error, setError] = useState('')
	const [successOpen, setSuccessOpen] = useState(false)
	const [lastOrderNumber, setLastOrderNumber] = useState('001')
	const [categoriesOpen, setCategoriesOpen] = useState(false)

	useEffect(() => {
		if (authLoading) return

		let isMounted = true

		const loadMenu = async () => {
			try {
				setLoading(true)
				setError('')

				const data = await withTimeout(fetchMenuItems(), 10000)

				const prepared = (data || [])
					.filter((item: TClientMenuItem) => item.is_active !== false)
					.sort((a: TClientMenuItem, b: TClientMenuItem) => {
						const categorySortA = a.categories?.sort_order ?? 0
						const categorySortB = b.categories?.sort_order ?? 0

						if (categorySortA !== categorySortB) {
							return categorySortA - categorySortB
						}

						return (a.sort_order ?? 0) - (b.sort_order ?? 0)
					})

				if (!isMounted) return
				setMenuItems(prepared)
			} catch (e: any) {
				console.error('CLIENT MENU LOAD ERROR:', e)
				if (!isMounted) return
				setError(e?.message || 'Не удалось загрузить меню')
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		void loadMenu()

		return () => {
			isMounted = false
		}
	}, [authLoading])

	const categories = useMemo(() => {
		const list = menuItems
			.map((item) => ({
				id: item.categories?.id || getItemCategoryName(item),
				name: getItemCategoryName(item),
				sort_order: item.categories?.sort_order ?? 0,
			}))
			.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

		const unique = list.filter(
			(category, index, arr) =>
				arr.findIndex((item) => item.id === category.id) === index,
		)

		return [{ id: 'all', name: 'Все' }, ...unique]
	}, [menuItems])

	const filteredMenuItems = useMemo(() => {
		if (activeCategory === 'all') return menuItems

		return menuItems.filter((item) => {
			const categoryId = item.categories?.id || getItemCategoryName(item)
			return categoryId === activeCategory
		})
	}, [menuItems, activeCategory])

	const resetForm = () => {
		clearCart()
		setComment('')
		setOrderMode('hall')
		setActiveCategory('all')
		setCategoriesOpen(false)
	}

	const handleNextOrder = () => {
		setSuccessOpen(false)
		resetForm()
	}

	const handleSubmit = async () => {
		if (!cart.length || submitting) return

		try {
			setSubmitting(true)

			const hasKitchen = cart.some(
				(item) => item.categories?.type !== 'assembly',
			)
			const hasAssembly = cart.some(
				(item) => item.categories?.type === 'assembly',
			)

			const nextStatus = hasKitchen ? 'new' : 'preparing'
			const nextCashierStatus = hasKitchen ? 'new' : 'assembly'
			const nextKitchenStatus = hasKitchen ? 'new' : 'skipped'
			const nextAssemblyStatus = hasAssembly
				? hasKitchen
					? 'waiting'
					: 'new'
				: 'skipped'

			const payload: ICreateOrderPayload = {
				items: cart,
				total: totalSum,
				comment: buildOrderComment({
					orderPlace: orderMode,
					paymentMethod,
					comment,
				}),
				source: 'client',
				status: nextStatus as any,
				customer_name: 'Гость',
				table_number: null,
				order_place: orderMode,
				payment_method: 'online',
				assembly_progress: [],
			}

			const savedOrder = await createOrder(payload)

			await updateCashierOrder(savedOrder.id, {
				status: nextStatus as any,
				cashier_status: nextCashierStatus as any,
				payment_method: 'online',
				paid_amount: totalSum,
				change_amount: 0,
				paid_at: new Date().toISOString(),
				kitchen_status: nextKitchenStatus as any,
				assembly_status: nextAssemblyStatus as any,
				assembly_progress: [],
			})

			setLastOrderNumber(formatOrderNumber(savedOrder.daily_order_number))
			setSuccessOpen(true)
			resetForm()
		} catch (e: any) {
			console.error('CLIENT CREATE ORDER ERROR:', e)
			alert(e?.message || 'Не удалось отправить заказ')
		} finally {
			setSubmitting(false)
		}
	}

	if (authLoading) {
		return (
			<div className='client-empty client-panel'>Проверка авторизации...</div>
		)
	}

	if (successOpen) {
		return (
			<div
				className='client-success-page'
				style={{
					backgroundImage: `linear-gradient(rgba(0,0,0,.32), rgba(0,0,0,.52)), url(${heroBg})`,
				}}
			>
				<div className='client-success-card animate-pop'>
					<div className='client-success-badge'>
						<FireIcon />
						<span>Заказ успешно отправлен</span>
					</div>

					<h2>Номер заказа</h2>
					<div className='client-success-number'>{lastOrderNumber}</div>
					<p>Заказ автоматически ушёл в работу</p>

					<button
						type='button'
						className='client-success-next-btn'
						onClick={handleNextOrder}
					>
						Новый заказ
					</button>
				</div>
			</div>
		)
	}

	return (
		<div
			className='client-screen-page'
			style={{
				backgroundImage: `linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.36)), url(${heroBg})`,
			}}
		>
			<div className='client-bg-blur client-bg-blur--light' />

			<header className='client-topbar client-topbar--simple'>
				<button
					type='button'
					className='client-mobile-icon'
					onClick={() => setCategoriesOpen(true)}
				>
					<MenuIcon />
				</button>

				<div className='client-topbar__title'>
					<span className='client-badge'>Мексиканская кухня</span>
					<h1>БУРРИТОС</h1>
					<p>Выберите блюда и откройте корзину сверху</p>
				</div>
			</header>

			<div className='client-screen-layout client-screen-layout--no-cart'>
				<aside className='client-categories client-panel client-categories--desktop animate-slide-left'>
					<div className='client-block-head'>
						<div>
							<span className='client-badge'>Категории</span>
							<h2>Все блюда</h2>
						</div>
					</div>

					<div className='client-category-list'>
						{categories.map((category) => (
							<button
								key={category.id}
								type='button'
								className={
									activeCategory === category.id
										? 'client-category-btn active'
										: 'client-category-btn'
								}
								onClick={() => setActiveCategory(category.id)}
							>
								{category.name}
							</button>
						))}
					</div>
				</aside>

				<section className='client-menu client-panel animate-fade-up'>
					<div className='client-block-head client-block-head--menu'>
						<div>
							<span className='client-badge'>Меню</span>
							<h2>Выберите блюда</h2>
						</div>

						<div className='client-menu-meta'>
							<span>{filteredMenuItems.length} позиций</span>
						</div>
					</div>

					{loading ? (
						<div className='client-empty'>Загрузка...</div>
					) : error ? (
						<div className='client-empty'>{error}</div>
					) : filteredMenuItems.length === 0 ? (
						<div className='client-empty'>Меню пустое</div>
					) : (
						<div className='client-menu-grid'>
							{filteredMenuItems.map((item, index) => (
								<article
									key={item.id}
									className='client-menu-card'
									style={{ animationDelay: `${index * 0.04}s` }}
								>
									<div className='client-menu-image-wrap'>
										<img
											src={getItemImage(item)}
											alt={item.title}
											className='client-menu-image'
										/>
										<div className='client-card-category'>
											{getItemCategoryName(item)}
										</div>
									</div>

									<div className='client-menu-content'>
										<div className='client-menu-top'>
											<div>
												<h3>{item.title}</h3>
												<p>
													{item.description || 'Вкусное блюдо из нашего меню'}
												</p>
											</div>

											<strong className='client-price'>
												{formatPrice(item.price)}
											</strong>
										</div>

										<button
											type='button'
											className='client-add-btn'
											onClick={() => addToCart(item)}
										>
											Добавить
										</button>
									</div>
								</article>
							))}
						</div>
					)}
				</section>
			</div>

			{categoriesOpen && (
				<div className='client-drawer'>
					<div
						className='client-drawer__overlay'
						onClick={() => setCategoriesOpen(false)}
					/>
					<div className='client-drawer__panel client-drawer__panel--left'>
						<div className='client-drawer__head'>
							<h3>Категории</h3>
							<button type='button' onClick={() => setCategoriesOpen(false)}>
								<CloseIcon />
							</button>
						</div>

						<div className='client-category-list'>
							{categories.map((category) => (
								<button
									key={category.id}
									type='button'
									className={
										activeCategory === category.id
											? 'client-category-btn active'
											: 'client-category-btn'
									}
									onClick={() => {
										setActiveCategory(category.id)
										setCategoriesOpen(false)
									}}
								>
									{category.name}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{cartOpen && (
				<div className='client-drawer client-drawer--cart'>
					<div
						className='client-drawer__overlay client-drawer__overlay--cart'
						onClick={() => setCartOpen(false)}
					/>
					<div className='client-drawer__panel client-drawer__panel--right client-cart-drawer'>
						<div className='client-cart-drawer__hero'>
							<div>
								<span className='client-badge'>Ваш заказ</span>
								<h3>Корзина</h3>
								<p>
									{totalItems} шт. • {formatPrice(totalSum)}
								</p>
							</div>

							<button type='button' onClick={() => setCartOpen(false)}>
								<CloseIcon />
							</button>
						</div>

						<div className='client-cart-drawer__summary'>
							<div className='client-cart-drawer__stat'>
								<span>Сумма</span>
								<strong>{formatPrice(totalSum)}</strong>
							</div>
							<div className='client-cart-drawer__stat'>
								<span>Позиций</span>
								<strong>{totalItems}</strong>
							</div>
						</div>

						<div className='client-fast-info client-fast-info--drawer'>
							<FireIcon />
							<span>Оплата онлайн • заказ сразу уходит в работу</span>
						</div>

						<div className='client-settings-group'>
							<label className='client-group-title'>Формат заказа</label>

							<div className='client-segments'>
								<button
									type='button'
									className={orderMode === 'hall' ? 'active' : ''}
									onClick={() => setOrderMode('hall')}
								>
									<HallIcon />
									<span>Здесь</span>
								</button>

								<button
									type='button'
									className={orderMode === 'takeaway' ? 'active' : ''}
									onClick={() => setOrderMode('takeaway')}
								>
									<TakeawayIcon />
									<span>С собой</span>
								</button>
							</div>
						</div>

						<div className='client-cart-list client-cart-list--drawer'>
							{cart.length === 0 ? (
								<div className='client-empty'>Корзина пуста</div>
							) : (
								cart.map((item) => (
									<div key={item.id} className='client-cart-item'>
										<div className='client-cart-item-info'>
											<h4>{item.title}</h4>
											<p>{formatPrice(item.price)}</p>
										</div>

										<div className='client-qty'>
											<button
												type='button'
												onClick={() => removeFromCart(item)}
											>
												−
											</button>
											<span>{item.quantity}</span>
											<button type='button' onClick={() => addToCart(item)}>
												+
											</button>
										</div>
									</div>
								))
							)}
						</div>

						<textarea
							className='client-comment'
							placeholder='Комментарий к заказу'
							value={comment}
							onChange={(e) => setComment(e.currentTarget.value)}
							rows={4}
						/>

						<button
							type='button'
							className='client-submit'
							onClick={handleSubmit}
							disabled={!cart.length || submitting}
						>
							{submitting ? 'Отправка...' : 'Оформить заказ'}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default ClientMonitor
