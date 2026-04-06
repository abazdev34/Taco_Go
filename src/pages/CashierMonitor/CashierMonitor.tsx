import { useEffect, useMemo, useRef, useState } from 'react'
import { tacosData } from '../../Redux/tacosData/tacosData'
import { createOrder, updateOrderStatus } from '../../api/orders'
import { useOrders } from '../../hooks/useOrders'
import {
	broadcastOrderCreated,
	broadcastOrderUpdated,
} from '../../lib/orderSync'
import type { IMenuItem } from '../../types/order'
import './CashierMonitor.scss'

type TOrderPlace = 'hall' | 'takeaway'

type OrderUi = {
	id: string
	status: string
	order_number: number | string
	created_at?: string
	comment?: string
	order_type?: TOrderPlace | string
	order_place?: TOrderPlace | string
}

const CART_PREVIEW_LIMIT = 1
const CART_AUTO_CLOSE_MS = 7000

const CashierMonitor = () => {
	const [cart, setCart] = useState<IMenuItem[]>([])
	const [activeCategory, setActiveCategory] = useState('Все')
	const [search, setSearch] = useState('')
	const [comment, setComment] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [busyOrderId, setBusyOrderId] = useState('')
	const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')
	const [cartExpanded, setCartExpanded] = useState(false)

	const autoCloseTimerRef = useRef<number | null>(null)

	const { orders, error } = useOrders()

	const startAutoCloseTimer = () => {
		if (autoCloseTimerRef.current) {
			window.clearTimeout(autoCloseTimerRef.current)
		}

		autoCloseTimerRef.current = window.setTimeout(() => {
			setCartExpanded(false)
			autoCloseTimerRef.current = null
		}, CART_AUTO_CLOSE_MS)
	}

	const stopAutoCloseTimer = () => {
		if (autoCloseTimerRef.current) {
			window.clearTimeout(autoCloseTimerRef.current)
			autoCloseTimerRef.current = null
		}
	}

	useEffect(() => {
		if (cartExpanded) {
			startAutoCloseTimer()
		} else {
			stopAutoCloseTimer()
		}

		return () => {
			stopAutoCloseTimer()
		}
	}, [cartExpanded])

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
		} else {
			data = []
		}

		if (search.trim()) {
			data = data.filter((item: any) =>
				item.title.toLowerCase().includes(search.toLowerCase())
			)
		}

		return data
	}, [allFoods, activeCategory, search])

	const activeOrders = useMemo(
		() =>
			((orders || []) as OrderUi[]).filter(
				(order) => order.status !== 'completed'
			),
		[orders]
	)

	const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0)

	const totalSum = cart.reduce(
		(acc, item) => acc + item.price * (item.quantity || 1),
		0
	)

	const visibleCartItems = useMemo(() => {
		if (cartExpanded) return cart
		return cart.slice(0, CART_PREVIEW_LIMIT)
	}, [cart, cartExpanded])

	const hiddenItemsCount = Math.max(cart.length - CART_PREVIEW_LIMIT, 0)
	const hasHiddenCartItems = hiddenItemsCount > 0

	const toggleCartExpanded = () => {
		setCartExpanded((prev) => !prev)
	}

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

	const getOrderPlaceLabel = (value: TOrderPlace) => {
		return value === 'hall' ? 'Здесь' : 'С собой'
	}

	const buildOrderComment = () => {
		const placeText = `Тип заказа: ${getOrderPlaceLabel(orderMode)}`
		const cleanComment = comment.trim()

		if (!cleanComment) return placeText
		return `${placeText} | Комментарий: ${cleanComment}`
	}

	const clearCart = () => {
		setCart([])
		setSearch('')
		setComment('')
		setActiveCategory('Все')
		setOrderMode('hall')
		setCartExpanded(false)
		stopAutoCloseTimer()
	}

	const handleCreateOrder = async () => {
		if (!cart.length || submitting) return

		try {
			setSubmitting(true)

			const saved = await createOrder({
				items: cart,
				total: totalSum,
				comment: buildOrderComment(),
				source: 'cashier',
				status: 'new',
				customer_name: 'Гость',
				table_number: null,
				order_type: orderMode,
			})

			broadcastOrderCreated(saved)
			clearCart()
		} catch (e: any) {
			console.error('CREATE ORDER ERROR:', e)
			alert(e?.message || 'Не удалось создать заказ')
		} finally {
			setSubmitting(false)
		}
	}

	const handleComplete = async (id: string) => {
		try {
			setBusyOrderId(id)
			const saved = await updateOrderStatus(id, 'completed')
			broadcastOrderUpdated(saved)
		} catch (e: any) {
			console.error('COMPLETE ORDER ERROR:', e)
			alert(e?.message || 'Не удалось завершить заказ')
		} finally {
			setBusyOrderId('')
		}
	}

	const getTopButtonText = (status: string) => {
		switch (status) {
			case 'new':
				return 'Новый'
			case 'preparing':
				return 'Готовится'
			case 'ready':
				return 'Выдать'
			default:
				return 'Новый'
		}
	}

	const getOrderAgeMinutes = (createdAt?: string) => {
		if (!createdAt) return 0

		const created = new Date(createdAt).getTime()
		const now = Date.now()

		if (Number.isNaN(created)) return 0

		const diffMs = now - created
		const diffMin = Math.floor(diffMs / 60000)

		return diffMin < 0 ? 0 : diffMin
	}

	const getTopButtonClass = (order: OrderUi) => {
		if (order.status === 'ready') return 'is-ready'
		if (order.status === 'preparing') return 'is-preparing'

		const minutes = getOrderAgeMinutes(order.created_at)

		if (minutes >= 10) return 'is-danger'
		if (minutes >= 5) return 'is-warning'
		return 'is-new'
	}

	const getTopButtonLabel = (order: OrderUi) => {
		const minutes = getOrderAgeMinutes(order.created_at)
		const baseText = getTopButtonText(order.status)

		if (busyOrderId === order.id) return '...'

		return `${baseText} · ${minutes} мин`
	}

	const getOrderPlaceLabelFromOrder = (order: OrderUi) => {
		const raw = order.order_type || order.order_place

		if (raw === 'takeaway') return 'С собой'
		if (raw === 'hall') return 'Здесь'

		const text = (order.comment || '').toLowerCase()

		if (text.includes('тип заказа: с собой')) return 'С собой'
		if (text.includes('тип заказа: здесь')) return 'Здесь'
		if (text.includes('с собой')) return 'С собой'
		if (text.includes('здесь')) return 'Здесь'

		return ''
	}

	const getOrderPlaceClassFromOrder = (order: OrderUi) => {
		const raw = order.order_type || order.order_place

		if (raw === 'takeaway') return 'takeaway'
		if (raw === 'hall') return 'hall'

		const text = (order.comment || '').toLowerCase()

		if (text.includes('с собой')) return 'takeaway'
		if (text.includes('здесь')) return 'hall'

		return ''
	}

	return (
		<div className='cashier-monitor-page'>
			<div className='cashier-shell'>
				{error && <div className='cashier-error-box'>{error}</div>}

				<div className='cashier-order-numbers-bar'>
					<div className='cashier-order-numbers-bar__head'>
						<h3>Активные заказы</h3>
						<span>{activeOrders.length}</span>
					</div>

					<div className='cashier-order-numbers-scroll'>
						{activeOrders.length === 0 ? (
							<div className='cashier-empty-box small'>
								Активных заказов нет
							</div>
						) : (
							activeOrders.map((order) => (
								<div key={order.id} className='cashier-order-chip'>
									<div className='cashier-order-chip__number-box'>
										{getOrderPlaceLabelFromOrder(order) && (
											<span
												className={`cashier-order-chip__place-inside ${getOrderPlaceClassFromOrder(
													order
												)}`}
											>
												{getOrderPlaceLabelFromOrder(order)}
											</span>
										)}

										<strong className='cashier-order-chip__number'>
											{order.order_number}
										</strong>
									</div>

									<button
										type='button'
										className={`cashier-order-chip__single-btn ${getTopButtonClass(
											order
										)}`}
										disabled={
											order.status !== 'ready' || busyOrderId === order.id
										}
										onClick={() =>
											order.status === 'ready'
												? handleComplete(order.id)
												: undefined
										}
									>
										{getTopButtonLabel(order)}
									</button>
								</div>
							))
						)}
					</div>
				</div>

				<div className='cashier-top-actions'>
					<button
						className='cashier-top-action-btn'
						type='button'
						onClick={() => setActiveCategory('Все')}
					>
						Все блюда
					</button>

					<button
						className='cashier-top-action-btn'
						type='button'
						onClick={clearCart}
					>
						Очистить корзину
					</button>
				</div>

				<div className='cashier-layout'>
					<aside className='cashier-panel cashier-category-panel'>
						<div className='cashier-panel-heading'>
							<h3>Категории</h3>
						</div>

						<div className='cashier-category-list'>
							{categories.map((category, index) => (
								<button
									key={index}
									type='button'
									onClick={() => setActiveCategory(category)}
									className={
										activeCategory === category
											? 'cashier-category-btn active'
											: 'cashier-category-btn'
									}
								>
									<span className='dot' />
									{category}
								</button>
							))}
						</div>
					</aside>

					<section className='cashier-panel cashier-menu-panel'>
						<div className='cashier-panel-toolbar'>
							<div>
								<h3>Меню</h3>
								<p>
									{activeCategory === 'Все'
										? 'Сначала выберите категорию'
										: `Категория: ${activeCategory}`}
								</p>
							</div>

							<input
								type='text'
								className='cashier-search-input'
								placeholder='Поиск блюда...'
								value={search}
								onChange={(e) => setSearch(e.currentTarget.value)}
							/>
						</div>

						{activeCategory === 'Все' ? (
							<div className='cashier-menu-placeholder'>
								Выберите категорию слева, чтобы открыть блюда
							</div>
						) : (
							<div className='cashier-foods-grid'>
								{filteredFoods.length === 0 ? (
									<div className='cashier-empty-box'>Ничего не найдено</div>
								) : (
									filteredFoods.map((item: any) => (
										<button
											type='button'
											className='cashier-food-btn'
											key={item.id}
											onClick={() => addToCart(item)}
											title={item.title}
										>
											<span className='cashier-food-btn__title'>
												{item.title}
											</span>
										</button>
									))
								)}
							</div>
						)}
					</section>

					<aside
						className={`cashier-panel cashier-cart-panel ${
							cartExpanded ? 'expanded' : ''
						}`}
					>
						<div className='cashier-panel-heading'>
							<h3>Корзина</h3>
						</div>

						<div className='cashier-cart-top'>
							<div className='cashier-cart-list'>
								{cart.length === 0 ? (
									<div className='cashier-empty-box'>Корзина пуста</div>
								) : (
									visibleCartItems.map((item) => (
										<div className='cashier-cart-item' key={item.id}>
											<div className='cashier-cart-item-top'>
												<div>
													<h4>{item.title}</h4>
													<p>{item.price} c</p>
												</div>
												<strong>{item.price * (item.quantity || 1)} c</strong>
											</div>

											<div className='cashier-qty-controls'>
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

							{hasHiddenCartItems && (
								<button
									type='button'
									className={`cashier-more-btn ${cartExpanded ? 'active' : ''}`}
									onClick={toggleCartExpanded}
								>
									{cartExpanded ? 'Свернуть' : `Еще (${hiddenItemsCount})`}
								</button>
							)}

							{cartExpanded && (
								<div className='cashier-cart-hint'>
									Корзина откроется временно и потом закроется автоматически
								</div>
							)}
						</div>

						<div className='cashier-order-summary'>
							<div className='cashier-order-type-switch'>
								<button
									type='button'
									className={
										orderMode === 'hall'
											? 'cashier-order-type-btn active'
											: 'cashier-order-type-btn'
									}
									onClick={() => setOrderMode('hall')}
								>
									Здесь
								</button>

								<button
									type='button'
									className={
										orderMode === 'takeaway'
											? 'cashier-order-type-btn active'
											: 'cashier-order-type-btn'
									}
									onClick={() => setOrderMode('takeaway')}
								>
									С собой
								</button>
							</div>

							<div className='cashier-order-mode-preview'>
								<span>Тип заказа</span>
								<strong>{getOrderPlaceLabel(orderMode)}</strong>
							</div>

							<div className='cashier-summary-inline'>
								<div className='cashier-summary-inline__item'>
									<span>Позиций</span>
									<strong>{totalItems}</strong>
								</div>

								<div className='cashier-summary-inline__divider' />

								<div className='cashier-summary-inline__item total'>
									<span>Итого</span>
									<strong>{totalSum} c</strong>
								</div>
							</div>

							<div className='cashier-order-preview'>
								<span className='cashier-order-preview__label'>Новый заказ</span>
								<strong className='cashier-order-preview__value'>
									{cart.length > 0 ? activeOrders.length + 1 : '--'}
								</strong>
							</div>

							<textarea
								className='cashier-comment-input'
								placeholder='Комментарий к заказу...'
								value={comment}
								onChange={(e) => setComment(e.currentTarget.value)}
								rows={2}
							/>

							<button
								className='cashier-primary-btn'
								onClick={handleCreateOrder}
								disabled={!cart.length || submitting}
							>
								{submitting
									? 'Сохранение...'
									: `Принять заказ · ${getOrderPlaceLabel(orderMode)}`}
							</button>
						</div>
					</aside>
				</div>
			</div>
		</div>
	)
}

export default CashierMonitor