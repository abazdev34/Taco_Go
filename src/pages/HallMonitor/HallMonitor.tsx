import { useEffect, useMemo, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrders } from '../../hooks/useOrders'

const HallMonitor = () => {
	const { orders, loading, error } = useOrders()
	const [clock, setClock] = useState(new Date())

	useEffect(() => {
		const timer = setInterval(() => setClock(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	const readyOrders = useMemo(() => {
		return orders
			.filter((order) => order.status === 'ready')
			.sort((a, b) => b.order_number - a.order_number)
	}, [orders])

	const preparingOrders = useMemo(() => {
		return orders
			.filter(
				(order) => order.status === 'new' || order.status === 'preparing'
			)
			.sort((a, b) => b.order_number - a.order_number)
	}, [orders])

	const getStatusText = (status: string) => {
		switch (status) {
			case 'new':
				return 'Новый'
			case 'preparing':
				return 'Готовится'
			case 'ready':
				return 'Готов'
			default:
				return 'Неизвестно'
		}
	}

	const getSourceText = (source?: string) => {
		switch (source) {
			case 'client':
				return 'Клиент'
			case 'cashier':
				return 'Кассир'
			default:
				return 'Система'
		}
	}

	return (
		<div className='monitor-page hall-theme'>
			

			<div className='page-header hall-header'>
				<div>
					<h1>Монитор зала</h1>
					<p>Здесь отображаются готовые и готовящиеся заказы</p>
				</div>

				<div className='top-info-card hall-clock-card'>
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

			{error && <div className='error-box'>{error}</div>}

			<div className='hall-stats-grid'>
				<div className='stat-box accent'>
					<span>Готовые заказы</span>
					<h2>{readyOrders.length}</h2>
				</div>

				<div className='stat-box'>
					<span>Готовятся</span>
					<h2>{preparingOrders.length}</h2>
				</div>

				<div className='stat-box'>
					<span>Всего активных</span>
					<h2>{orders.length}</h2>
				</div>
			</div>

			<div className='hall-tv-layout'>
				<section className='panel hall-ready-panel'>
					<div className='panel-heading'>
						<h3>Готовые заказы</h3>
					</div>

					{loading ? (
						<div className='empty-box hall-empty'>Загрузка...</div>
					) : readyOrders.length === 0 ? (
						<div className='empty-box hall-empty'>
							Пока нет готовых заказов
						</div>
					) : (
						<div className='hall-ready-grid'>
							{readyOrders.map((order) => (
								<div className='hall-order-card ready' key={order.id}>
									<div className='hall-order-top'>
										<span className='hall-order-number'>
											№{order.order_number}
										</span>

										<span className='status-badge ready'>
											{getStatusText(order.status)}
										</span>
									</div>

									<div className='hall-order-meta'>
										<p>
											<strong>Источник:</strong> {getSourceText(order.source)}
										</p>
										<p>
											<strong>Время:</strong>{' '}
											{new Date(order.created_at).toLocaleTimeString()}
										</p>
									</div>

									{order.comment && (
										<div className='hall-comment-box'>
											<strong>Комментарий:</strong> {order.comment}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</section>

				<aside className='panel hall-progress-panel'>
					<div className='panel-heading'>
						<h3>Заказы в работе</h3>
					</div>

					{loading ? (
						<div className='empty-box small'>Загрузка...</div>
					) : preparingOrders.length === 0 ? (
						<div className='empty-box small'>Нет заказов в работе</div>
					) : (
						<div className='hall-progress-list'>
							{preparingOrders.map((order) => (
								<div className='hall-progress-item' key={order.id}>
									<div>
										<h4>Заказ №{order.order_number}</h4>
										<p>{getStatusText(order.status)}</p>
									</div>

									<div className='hall-progress-right'>
										<span className={`status-badge ${order.status}`}>
											{getStatusText(order.status)}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</aside>
			</div>
		</div>
	)
}

export default HallMonitor