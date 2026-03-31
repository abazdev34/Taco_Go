import { useEffect, useRef, useState } from 'react'
import { updateOrderStatus } from '../../api/orders'
import { useOrders } from '../../hooks/useOrders'
import { broadcastOrderUpdated, patchOrderStatus } from '../../lib/orderSync'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import Navbar from '../Navbar/Navbar'
import '../Navbar/monitor.scss'

const playKitchenSound = () => {
	try {
		const AudioContextClass =
			window.AudioContext || (window as any).webkitAudioContext

		if (!AudioContextClass) return

		const ctx = new AudioContextClass()
		const osc1 = ctx.createOscillator()
		const gain = ctx.createGain()

		osc1.type = 'triangle'
		osc1.frequency.setValueAtTime(880, ctx.currentTime)
		osc1.frequency.setValueAtTime(988, ctx.currentTime + 0.08)
		osc1.frequency.setValueAtTime(740, ctx.currentTime + 0.18)

		gain.gain.setValueAtTime(0.001, ctx.currentTime)
		gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02)
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)

		osc1.connect(gain)
		gain.connect(ctx.destination)

		osc1.start(ctx.currentTime)
		osc1.stop(ctx.currentTime + 0.42)
	} catch (error) {
		console.error('Sound error:', error)
	}
}

const KitchenMonitor = () => {
	const { orders, loading, error, setOrders } = useOrders()
	const [clock, setClock] = useState(new Date())
	const [busyId, setBusyId] = useState('')
	const prevNewIdsRef = useRef<string[]>([])

	useEffect(() => {
		const timer = setInterval(() => setClock(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		const newOrders = orders.filter((order) => order.status === 'new')
		const currentIds = newOrders.map((order) => order.id)

		if (prevNewIdsRef.current.length > 0) {
			const hasNewOrder = currentIds.some(
				(id) => !prevNewIdsRef.current.includes(id),
			)
			if (hasNewOrder) playKitchenSound()
		}

		prevNewIdsRef.current = currentIds
	}, [orders])

	const newOrders = orders.filter((order) => order.status === 'new')
	const preparingOrders = orders.filter((order) => order.status === 'preparing')
	const readyOrders = orders.filter((order) => order.status === 'ready')

	const handleAccept = async (id: string) => {
		try {
			setBusyId(id)

			const current = orders.find((order) => order.id === id)
			if (!current) return

			const optimistic = patchOrderStatus(current, 'preparing')
			setOrders((prev: IOrderRow[]) =>
				prev.map((order) => (order.id === id ? optimistic : order)),
			)
			broadcastOrderUpdated(optimistic)

			const saved = await updateOrderStatus(id, 'preparing')
			setOrders((prev: IOrderRow[]) =>
				prev.map((order) => (order.id === id ? saved : order)),
			)
			broadcastOrderUpdated(saved)
		} catch (e) {
			console.error(e)
			alert('Не удалось принять заказ')
		} finally {
			setBusyId('')
		}
	}

	const handleReady = async (id: string) => {
		try {
			setBusyId(id)

			const current = orders.find((order) => order.id === id)
			if (!current) return

			const optimistic = patchOrderStatus(current, 'ready')
			setOrders((prev: IOrderRow[]) =>
				prev.map((order) => (order.id === id ? optimistic : order)),
			)
			broadcastOrderUpdated(optimistic)

			const saved = await updateOrderStatus(id, 'ready')
			setOrders((prev: IOrderRow[]) =>
				prev.map((order) => (order.id === id ? saved : order)),
			)
			broadcastOrderUpdated(saved)
		} catch (e) {
			console.error(e)
			alert('Не удалось отметить готовность')
		} finally {
			setBusyId('')
		}
	}

	return (
		<div className='monitor-page kitchen-theme'>
			<Navbar />

			<div className='page-header'>
				<div>
					<h1>Монитор кухни</h1>
					<p>Новые, готовящиеся и готовые заказы</p>
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
								<div
									className='order-card new-card kitchen-flash'
									key={order.id}
								>
									<div className='order-card__header'>
										<h2>Заказ №{order.order_number}</h2>
										<span className='status-badge new'>Новый</span>
									</div>

									<div className='order-meta'>
										<p>
											Создан: {new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>Сумма: {formatPrice(order.total)}</p>
									</div>

									<div className='order-items'>
										{order.items.map((item) => (
											<div key={item.id} className='order-item-line'>
												<span>{item.title}</span>
												<strong>x{item.quantity}</strong>
											</div>
										))}
									</div>

									<button
										className='primary-btn'
										disabled={busyId === order.id}
										onClick={() => handleAccept(order.id)}
									>
										{busyId === order.id ? '...' : 'Принять в работу'}
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
											Создан: {new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>Сумма: {formatPrice(order.total)}</p>
									</div>

									<div className='order-items'>
										{order.items.map((item) => (
											<div key={item.id} className='order-item-line'>
												<span>{item.title}</span>
												<strong>x{item.quantity}</strong>
											</div>
										))}
									</div>

									<button
										className='success-btn'
										disabled={busyId === order.id}
										onClick={() => handleReady(order.id)}
									>
										{busyId === order.id ? '...' : 'Готов'}
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
											Создан: {new Date(order.created_at).toLocaleTimeString()}
										</p>
										<p>Сумма: {formatPrice(order.total)}</p>
									</div>

									<div className='order-items'>
										{order.items.map((item) => (
											<div key={item.id} className='order-item-line'>
												<span>{item.title}</span>
												<strong>x{item.quantity}</strong>
											</div>
										))}
									</div>
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
