import { useEffect, useMemo, useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderStatus } from '../../api/orders'
import '../Navbar/monitor.scss'
import { playNewOrderSound } from '../../utils/sound'
import { IOrderRow } from '../../types/order'

const KitchenMonitor = () => {
	const { orders, loading, error } = useOrders()
	const prevOrdersRef = useRef<IOrderRow[]>([])

	useEffect(() => {
		if (!orders.length) {
			prevOrdersRef.current = orders
			return
		}

		const prev = prevOrdersRef.current

		const incomingNewOrders = orders.filter(
			(order) =>
				order.status === 'new' &&
				!prev.some((prevOrder) => prevOrder.id === order.id)
		)

		if (incomingNewOrders.length > 0) {
			playNewOrderSound()
		}

		prevOrdersRef.current = orders
	}, [orders])

	const newOrders = useMemo(() => {
		return orders
			.filter((order) => order.status === 'new')
			.sort((a, b) => b.order_number - a.order_number)
	}, [orders])

	const preparingOrders = useMemo(() => {
		return orders
			.filter((order) => order.status === 'preparing')
			.sort((a, b) => b.order_number - a.order_number)
	}, [orders])

	const readyOrders = useMemo(() => {
		return orders
			.filter((order) => order.status === 'ready')
			.sort((a, b) => b.order_number - a.order_number)
	}, [orders])

	const getSourceText = (source?: string) => {
		switch (source) {
			case 'client':
				return 'Клиент'
			case 'cashier':
				return 'Кассир'
			default:
				return 'Неизвестно'
		}
	}

	const handleStartCooking = async (id: string) => {
		try {
			await updateOrderStatus(id, 'preparing')
		} catch (error) {
			console.error('Ошибка перевода заказа в статус preparing:', error)
			alert('Не удалось принять заказ в работу')
		}
	}

	const handleReady = async (id: string) => {
		try {
			await updateOrderStatus(id, 'ready')
		} catch (error) {
			console.error('Ошибка перевода заказа в статус ready:', error)
			alert('Не удалось отметить заказ как готовый')
		}
	}

	return (
		<div className='monitor-page kitchen-theme'>
			

			<div className='page-header'>
				<div>
					<h1>Монитор кухни</h1>
					<p>Новые, готовящиеся и готовые заказы</p>
				</div>
			</div>

			{error && <div className='error-box'>{error}</div>}

			<div className='kitchen-columns'>
				<div className='kitchen-column'>
					<div className='column-title'>
						<h3>Новые</h3>
						<span>{newOrders.length}</span>
					</div>

					<div className='orders-stack'>
						{loading ? (
							<div className='empty-box'>Загрузка...</div>
						) : newOrders.length === 0 ? (
							<div className='empty-box'>Нет новых заказов</div>
						) : (
							newOrders.map((order) => (
								<div className='order-card new-card' key={order.id}>
									<div className='order-card__header'>
										<h2>Заказ №{order.order_number}</h2>
										<span className='status-badge new'>Новый</span>
									</div>

									<div className='order-meta'>
										<p>
											<strong>Время:</strong>{' '}
											{new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>
											<strong>Источник:</strong> {getSourceText(order.source)}
										</p>
									</div>

									<div className='order-items'>
										{order.items.map((item, index) => (
											<div
												key={`${order.id}-${item.id}-${index}`}
												className='order-item-line'
											>
												<span>{item.title}</span>
												<strong>x{item.quantity || 1}</strong>
											</div>
										))}
									</div>

									{order.comment && (
										<div className='kitchen-comment-box'>
											💬 {order.comment}
										</div>
									)}

									<button
										className='primary-btn'
										onClick={() => handleStartCooking(order.id)}
									>
										Принять в работу
									</button>
								</div>
							))
						)}
					</div>
				</div>

				<div className='kitchen-column'>
					<div className='column-title'>
						<h3>Готовятся</h3>
						<span>{preparingOrders.length}</span>
					</div>

					<div className='orders-stack'>
						{loading ? (
							<div className='empty-box'>Загрузка...</div>
						) : preparingOrders.length === 0 ? (
							<div className='empty-box'>Нет заказов в работе</div>
						) : (
							preparingOrders.map((order) => (
								<div className='order-card cooking-card' key={order.id}>
									<div className='order-card__header'>
										<h2>Заказ №{order.order_number}</h2>
										<span className='status-badge preparing'>Готовится</span>
									</div>

									<div className='order-meta'>
										<p>
											<strong>Время:</strong>{' '}
											{new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>
											<strong>Источник:</strong> {getSourceText(order.source)}
										</p>
									</div>

									<div className='order-items'>
										{order.items.map((item, index) => (
											<div
												key={`${order.id}-${item.id}-${index}`}
												className='order-item-line'
											>
												<span>{item.title}</span>
												<strong>x{item.quantity || 1}</strong>
											</div>
										))}
									</div>

									{order.comment && (
										<div className='kitchen-comment-box'>
											💬 {order.comment}
										</div>
									)}

									<button
										className='success-btn'
										onClick={() => handleReady(order.id)}
									>
										Готово
									</button>
								</div>
							))
						)}
					</div>
				</div>

				<div className='kitchen-column'>
					<div className='column-title'>
						<h3>Готовы</h3>
						<span>{readyOrders.length}</span>
					</div>

					<div className='orders-stack'>
						{loading ? (
							<div className='empty-box'>Загрузка...</div>
						) : readyOrders.length === 0 ? (
							<div className='empty-box'>Нет готовых заказов</div>
						) : (
							readyOrders.map((order) => (
								<div className='order-card ready-card' key={order.id}>
									<div className='order-card__header'>
										<h2>Заказ №{order.order_number}</h2>
										<span className='status-badge ready'>Готов</span>
									</div>

									<div className='order-meta'>
										<p>
											<strong>Время:</strong>{' '}
											{new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>
											<strong>Источник:</strong> {getSourceText(order.source)}
										</p>
									</div>

									<div className='order-items'>
										{order.items.map((item, index) => (
											<div
												key={`${order.id}-${item.id}-${index}`}
												className='order-item-line'
											>
												<span>{item.title}</span>
												<strong>x{item.quantity || 1}</strong>
											</div>
										))}
									</div>

									{order.comment && (
										<div className='kitchen-comment-box'>
											💬 {order.comment}
										</div>
									)}
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default KitchenMonitor