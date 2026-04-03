import { useEffect, useMemo, useState } from 'react'
import { tacosData } from '../../Redux/tacosData/tacosData'
import { createOrder } from '../../api/orders'
import { useOrders } from '../../hooks/useOrders'
import { broadcastOrderCreated } from '../../lib/orderSync'
import { IMenuItem } from '../../types/order'
import { formatPrice } from '../../utils/currency'

import '../Navbar/monitor.scss'

type TOrderPlace = 'hall' | 'takeaway'

const ClientMonitor = () => {
	const [cart, setCart] = useState<IMenuItem[]>([])
	const [activeCategory, setActiveCategory] = useState('Все')
	const [search, setSearch] = useState('')
	const [comment, setComment] = useState('')
	const [clock, setClock] = useState(new Date())
	const [submitting, setSubmitting] = useState(false)

	const [orderPlace, setOrderPlace] = useState<TOrderPlace>('takeaway')
	const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null)
	const [showSuccess, setShowSuccess] = useState(false)
	const [showNextOrder, setShowNextOrder] = useState(false)

	const { orders, loading, error } = useOrders()

	useEffect(() => {
		const timer = setInterval(() => setClock(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	const categories = useMemo(
		() => ['Все', ...tacosData.map((item: any) => item.title)],
		[]
	)

	const allFoods = useMemo(() => {
		return tacosData.flatMap((group: any) =>
			(group.tacoCategory || []).map((item: any) => ({
				...item,
				category: group.title,
			}))
		)
	}, [])

	const filteredFoods = useMemo(() => {
		let data = allFoods

		if (activeCategory !== 'Все') {
			data = data.filter((item: any) => item.category === activeCategory)
		}

		if (search.trim()) {
			data = data.filter((item: any) =>
				item.title.toLowerCase().includes(search.toLowerCase())
			)
		}

		return data
	}, [allFoods, activeCategory, search])

	const totalSum = cart.reduce(
		(acc, item) => acc + item.price * (item.quantity || 1),
		0
	)

	const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0)

	const addToCart = (item: IMenuItem) => {
		setCart((prev) => {
			const existing = prev.find((p) => p.id === item.id)

			if (existing) {
				return prev.map((p) =>
					p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
				)
			}

			return [...prev, { ...item, quantity: 1 }]
		})
	}

	const removeFromCart = (item: IMenuItem) => {
		setCart((prev) =>
			prev
				.map((p) =>
					p.id === item.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p
				)
				.filter((p) => (p.quantity || 0) > 0)
		)
	}

	const clearCart = () => {
		setCart([])
		setSearch('')
		setComment('')
		setActiveCategory('Все')
	}

	const getOrderPlaceLabel = (value: TOrderPlace) => {
		return value === 'hall' ? 'Здесь' : 'С собой'
	}

	const buildOrderComment = () => {
		const placeText = `Тип заказа: ${getOrderPlaceLabel(orderPlace)}`
		const cleanComment = comment.trim()

		if (!cleanComment) return placeText
		return `${placeText} | Комментарий: ${cleanComment}`
	}

	const handleCreateOrder = async () => {
		if (!cart.length) return

		try {
			setSubmitting(true)

			const saved = await createOrder({
				items: cart,
				total: totalSum,
				comment: buildOrderComment(),
				source: 'client',
				status: 'new',
				customer_name: 'Гость',
				table_number: null,
			})

			broadcastOrderCreated(saved)
			setLastOrderNumber(saved.order_number)
			clearCart()

			setShowSuccess(true)
			setShowNextOrder(false)

			setTimeout(() => {
				setShowNextOrder(true)
			}, 4000)

			setTimeout(() => {
				setShowSuccess(false)
				setShowNextOrder(false)
				setLastOrderNumber(null)
			}, 7500)
		} catch (e: any) {
			console.error('CREATE CLIENT ORDER ERROR:', e)
			alert(e?.message || 'Не удалось оформить заказ')
		} finally {
			setSubmitting(false)
		}
	}

	const getStatusText = (status: string) => {
		switch (status) {
			case 'new':
				return 'Новый'
			case 'preparing':
				return 'Готовится'
			case 'ready':
				return 'Готов к выдаче'
			case 'completed':
				return 'Выдан'
			default:
				return 'Неизвестно'
		}
	}

	const clientOrders = orders.filter((order) => order.source === 'client')

	return (
		<div className='monitor-page client-theme client-theme-burritos'>
			

			<div className='page-header'>
				<div>
					<h1>Клиентский монитор</h1>
					<p>Выберите блюда и оформите заказ</p>
				</div>

				<div className='top-info-card'>
					<span>Текущее время</span>
					<strong>
						{clock.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit',
						})}
					</strong>
				</div>
			</div>

			<div className='client-logo-banner'>
			</div>

			<div className='stats-grid'>
				<div className='stat-box'>
					<span>Позиций в корзине</span>
					<h2>{totalItems}</h2>
				</div>
				<div className='stat-box accent'>
					<span>Сумма корзины</span>
					<h2>{formatPrice(totalSum)}</h2>
				</div>
				<div className='stat-box'>
					<span>Активные клиентские заказы</span>
					<h2>{clientOrders.length}</h2>
				</div>
				<div className='stat-box'>
					<span>Готовые к выдаче</span>
					<h2>{clientOrders.filter((o) => o.status === 'ready').length}</h2>
				</div>
			</div>

			{error && <div className='error-box'>{error}</div>}

			<div className='cashier-layout right-category-layout'>
				<aside className='panel right-category-panel'>
					<div className='panel-heading'>
						<h3>Категории</h3>
					</div>

					<div className='category-list'>
						{categories.map((category, index) => (
							<button
								key={index}
								onClick={() => setActiveCategory(category)}
								className={
									activeCategory === category
										? 'category-btn active'
										: 'category-btn'
								}
							>
								{category}
							</button>
						))}
					</div>
				</aside>

				<section className='panel menu-panel simple-menu-panel'>
					<div className='panel-toolbar'>
						<div>
							<h3>Меню</h3>
							<p>Выберите блюда и добавьте их в корзину</p>
						</div>

						<input
							type='text'
							className='search-input'
							placeholder='Поиск блюда...'
							value={search}
							onChange={(e) => setSearch(e.currentTarget.value)}
						/>
					</div>

					<div className='simple-foods-grid'>
						{filteredFoods.map((item: any) => (
							<div className='simple-food-card' key={item.id}>
								<img src={item.img} alt={item.title} />
								<div className='simple-food-card__body'>
									<h4>{item.title}</h4>
									<p>{formatPrice(item.price)}</p>
									<button onClick={() => addToCart(item)}>Добавить</button>
								</div>
							</div>
						))}
					</div>
				</section>

				<aside className='panel order-panel'>
					<div className='panel-heading'>
						<h3>Корзина</h3>
					</div>

					<div className='client-order-type-box'>
						<span className='client-order-type-title'>Выберите способ получения</span>

						<div className='client-order-type-switch'>
							<button
								type='button'
								className={
									orderPlace === 'hall'
										? 'client-order-type-btn active'
										: 'client-order-type-btn'
								}
								onClick={() => setOrderPlace('hall')}
							>
								Здесь
							</button>

							<button
								type='button'
								className={
									orderPlace === 'takeaway'
										? 'client-order-type-btn active'
										: 'client-order-type-btn'
								}
								onClick={() => setOrderPlace('takeaway')}
							>
								С собой
							</button>
						</div>

						<div className='client-order-type-preview'>
							Текущий выбор: <strong>{getOrderPlaceLabel(orderPlace)}</strong>
						</div>
					</div>

					<div className='cart-list'>
						{cart.length === 0 ? (
							<div className='empty-box'>Корзина пуста</div>
						) : (
							cart.map((item) => (
								<div className='cart-item' key={item.id}>
									<div className='cart-item__top'>
										<div>
											<h4>{item.title}</h4>
											<p>{formatPrice(item.price)}</p>
										</div>
										<strong>
											{formatPrice(item.price * (item.quantity || 1))}
										</strong>
									</div>

									<div className='qty-controls'>
										<button onClick={() => removeFromCart(item)}>-</button>
										<span>{item.quantity}</span>
										<button onClick={() => addToCart(item)}>+</button>
									</div>
								</div>
							))
						)}
					</div>

					<div className='order-summary'>
						<div className='summary-row'>
							<span>Позиций</span>
							<strong>{totalItems}</strong>
						</div>

						<div className='summary-total'>
							<span>Итого</span>
							<h2>{formatPrice(totalSum)}</h2>
						</div>

						<div className='client-logo-small'>
							<img src='/logo.png' alt='Бурритос' />
						</div>

						<textarea
							className='order-comment-input'
							placeholder='Комментарий к заказу: без лука, соус отдельно, не острое...'
							value={comment}
							onChange={(e) => setComment(e.currentTarget.value)}
							rows={4}
						/>

						<button
							className='primary-btn client-submit-btn'
							onClick={handleCreateOrder}
							disabled={!cart.length || submitting}
						>
							{submitting ? 'Оформление...' : 'Оформить заказ'}
						</button>
					</div>

					<div className='accepted-orders'>
						<div className='panel-heading'>
							<h3>Мои заказы</h3>
						</div>

						{loading ? (
							<div className='empty-box small'>Загрузка...</div>
						) : clientOrders.length === 0 ? (
							<div className='empty-box small'>Заказов пока нет</div>
						) : (
							clientOrders.slice(0, 8).map((order: any) => (
								<div className='accepted-order-item' key={order.id}>
									<div>
										<h4>Заказ №{order.order_number}</h4>
										<p>{new Date(order.created_at).toLocaleTimeString()}</p>
										{order.comment && (
											<div className='order-comment-preview'>
												{order.comment}
											</div>
										)}
									</div>

									<div className='accepted-order-actions'>
										<span className={`status-badge ${order.status}`}>
											{getStatusText(order.status)}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</aside>
			</div>

			{showSuccess && (
				<div className='client-success-overlay'>
					<div className='client-success-card burritos-success-card'>
				

						{!showNextOrder ? (
							<>
								<h1>Ваш заказ оформлен!</h1>
								<p>Номер вашего заказа</p>

								<div className='success-number'>{lastOrderNumber}</div>

								<div className='success-order-place'>
									{getOrderPlaceLabel(orderPlace)}
								</div>

								<p className='wait-text'>
									Ожидайте готовности. Мы скоро пригласим вас.
								</p>
							</>
						) : (
							<>
								<h1>Следующий заказ</h1>
								<p className='wait-text'>
									Спасибо за заказ. Приятного аппетита!
								</p>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

export default ClientMonitor