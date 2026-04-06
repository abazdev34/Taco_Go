import { useMemo, useState } from 'react'
import { tacosData } from '../../Redux/tacosData/tacosData'
import { createOrder } from '../../api/orders'
import { broadcastOrderCreated } from '../../lib/orderSync'
import { IMenuItem } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import './ClientMonitor.scss'

type TOrderPlace = 'hall' | 'takeaway'

const ClientMonitor = () => {
	const [cart, setCart] = useState<IMenuItem[]>([])
	const [activeCategory, setActiveCategory] = useState('Все')
	const [search, setSearch] = useState('')
	const [comment, setComment] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const [orderPlace, setOrderPlace] = useState<TOrderPlace>('takeaway')
	const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null)
	const [showSuccess, setShowSuccess] = useState(false)
	const [showNextOrder, setShowNextOrder] = useState(false)

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
		if (!cart.length || submitting) return

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
				order_type: orderPlace,
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

	return (
		<div className='client-monitor'>
			<div className='client-monitor__hero'>
				<div className='client-monitor__hero-badge'>Premium Order</div>

				<div className='client-monitor__hero-text'>
					<h1>Оформление заказа</h1>
					<p>Выберите любимые блюда, настройте заказ и отправьте его за пару нажатий.</p>
				</div>
			</div>

			<div className='client-toolbar'>
				<div className='client-toolbar__search'>
					<input
						type='text'
						className='client-search-input'
						placeholder='Поиск блюда...'
						value={search}
						onChange={(e) => setSearch(e.currentTarget.value)}
					/>
				</div>

				<div className='client-order-type-box'>
					<span className='client-order-type-title'>Способ получения</span>

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
						<span>Текущий выбор</span>
						<strong>{getOrderPlaceLabel(orderPlace)}</strong>
					</div>
				</div>
			</div>

			<div className='client-categories'>
				{categories.map((category, index) => (
					<button
						key={index}
						onClick={() => setActiveCategory(category)}
						className={
							activeCategory === category
								? 'client-category-btn active'
								: 'client-category-btn'
						}
					>
						{category}
					</button>
				))}
			</div>

			<div className='client-layout'>
				<section className='client-panel client-menu-panel'>
					<div className='client-panel__head'>
						<div>
							<h3>Меню</h3>
							<p>
								{activeCategory === 'Все'
									? 'Все доступные блюда'
									: `Категория: ${activeCategory}`}
							</p>
						</div>
					</div>

					<div className='client-food-grid'>
						{filteredFoods.length === 0 ? (
							<div className='client-empty-box'>Ничего не найдено</div>
						) : (
							filteredFoods.map((item: any) => {
								const cartItem = cart.find((c) => c.id === item.id)
								const qty = cartItem?.quantity || 0

								return (
									<div className='client-food-card' key={item.id}>
										<div className='client-food-card__top'>
											{item.img ? (
												<img
													src={item.img}
													alt={item.title}
													className='client-food-card__image'
												/>
											) : (
												<div className='client-food-card__image placeholder'>
													{item.title?.charAt(0)}
												</div>
											)}

											<div className='client-food-card__info'>
												<h4>{item.title}</h4>
												<p>{formatPrice(item.price)}</p>
											</div>
										</div>

										<div className='client-food-card__bottom'>
											{qty === 0 ? (
												<button
													className='client-add-btn'
													onClick={() => addToCart(item)}
												>
													Добавить
												</button>
											) : (
												<div className='client-qty-controls'>
													<button type='button' onClick={() => removeFromCart(item)}>
														−
													</button>
													<span>{qty}</span>
													<button type='button' onClick={() => addToCart(item)}>
														+
													</button>
												</div>
											)}
										</div>
									</div>
								)
							})
						)}
					</div>
				</section>

				<aside className='client-panel client-cart-panel'>
					<div className='client-panel__head'>
						<h3>Корзина</h3>
					</div>

					<div className='client-cart-list'>
						{cart.length === 0 ? (
							<div className='client-empty-box'>Корзина пуста</div>
						) : (
							cart.map((item) => (
								<div className='client-cart-item' key={item.id}>
									<div className='client-cart-item__top'>
										<div>
											<h4>{item.title}</h4>
											<p>{formatPrice(item.price)}</p>
										</div>

										<strong>
											{formatPrice(item.price * (item.quantity || 1))}
										</strong>
									</div>

									<div className='client-qty-controls compact'>
										<button type='button' onClick={() => removeFromCart(item)}>
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

					<div className='client-order-summary'>
						<div className='client-summary-row'>
							<span>Позиций</span>
							<strong>{totalItems}</strong>
						</div>

						<div className='client-summary-total'>
							<span>Итого</span>
							<h2>{formatPrice(totalSum)}</h2>
						</div>

						<textarea
							className='client-comment-input'
							placeholder='Комментарий к заказу: без лука, соус отдельно, не острое...'
							value={comment}
							onChange={(e) => setComment(e.currentTarget.value)}
							rows={4}
						/>

						<button
							className='client-submit-btn'
							onClick={handleCreateOrder}
							disabled={!cart.length || submitting}
						>
							{submitting ? 'Оформление...' : 'Оформить заказ'}
						</button>
					</div>
				</aside>
			</div>

			{showSuccess && (
				<div className='client-success-overlay'>
					<div className='client-success-card'>
						{!showNextOrder ? (
							<>
								<div className='client-success-card__icon'>✓</div>
								<h1>Ваш заказ оформлен</h1>
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
								<div className='client-success-card__icon'>♥</div>
								<h1>Спасибо за заказ</h1>
								<p className='wait-text'>Приятного аппетита!</p>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

export default ClientMonitor