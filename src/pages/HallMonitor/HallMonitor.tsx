import { useEffect, useMemo, useRef, useState } from 'react'
import './HallMonitor.scss'
import { useOrders } from '../../hooks/useOrders'

type OrderStatus = 'new' | 'preparing' | 'ready' | string

type Order = {
	id: number
	order_number: number
	status: OrderStatus
	created_at: string
}

const HallMonitor = () => {
	const { orders, loading, error } = useOrders() as {
		orders: Order[]
		loading: boolean
		error: string | null
	}

	const [highlightedIds, setHighlightedIds] = useState<number[]>([])
	const prevReadyIdsRef = useRef<number[]>([])
	const audioUnlockedRef = useRef(false)

	useEffect(() => {
		const unlockAudio = () => {
			audioUnlockedRef.current = true
			window.removeEventListener('click', unlockAudio)
			window.removeEventListener('touchstart', unlockAudio)
			window.removeEventListener('keydown', unlockAudio)
		}

		window.addEventListener('click', unlockAudio)
		window.addEventListener('touchstart', unlockAudio)
		window.addEventListener('keydown', unlockAudio)

		return () => {
			window.removeEventListener('click', unlockAudio)
			window.removeEventListener('touchstart', unlockAudio)
			window.removeEventListener('keydown', unlockAudio)
		}
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

	useEffect(() => {
		const currentReadyIds = readyOrders.map((order) => order.id)
		const newReadyIds = currentReadyIds.filter(
			(id) => !prevReadyIdsRef.current.includes(id)
		)

		if (newReadyIds.length > 0) {
			setHighlightedIds((prev) => [...prev, ...newReadyIds])
			playReadySound()

			const timeout = window.setTimeout(() => {
				setHighlightedIds((prev) =>
					prev.filter((id) => !newReadyIds.includes(id))
				)
			}, 2800)

			prevReadyIdsRef.current = currentReadyIds

			return () => window.clearTimeout(timeout)
		}

		prevReadyIdsRef.current = currentReadyIds
	}, [readyOrders])

	const playReadySound = () => {
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as Window & {
					webkitAudioContext?: typeof AudioContext
				}).webkitAudioContext

			if (!AudioContextClass) return
			if (!audioUnlockedRef.current) return

			const audioCtx = new AudioContextClass()
			const oscillator = audioCtx.createOscillator()
			const gainNode = audioCtx.createGain()

			oscillator.type = 'sine'
			oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
			oscillator.frequency.linearRampToValueAtTime(
				1046,
				audioCtx.currentTime + 0.16
			)
			oscillator.frequency.linearRampToValueAtTime(
				1318,
				audioCtx.currentTime + 0.32
			)

			gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
			gainNode.gain.exponentialRampToValueAtTime(
				0.1,
				audioCtx.currentTime + 0.02
			)
			gainNode.gain.exponentialRampToValueAtTime(
				0.0001,
				audioCtx.currentTime + 0.5
			)

			oscillator.connect(gainNode)
			gainNode.connect(audioCtx.destination)

			oscillator.start()
			oscillator.stop(audioCtx.currentTime + 0.55)

			oscillator.onended = () => {
				void audioCtx.close()
			}
		} catch (soundError) {
			console.error('Sound playback error:', soundError)
		}
	}

	const preparingLoopedOrders =
		preparingOrders.length > 10
			? [...preparingOrders, ...preparingOrders]
			: preparingOrders

	const readyLoopedOrders =
		readyOrders.length > 10 ? [...readyOrders, ...readyOrders] : readyOrders

	return (
		<div className='hall-clean-tv'>
			{error && <div className='hall-clean-tv__error'>{error}</div>}

			<div className='hall-clean-tv__layout'>
				<section className='clean-column clean-column--preparing'>
					<div className='clean-column__head'>
						<h2>Готовится</h2>
						<span>{preparingOrders.length}</span>
					</div>

					<div className='clean-column__body'>
						{loading ? (
							<div className='clean-empty'>Загрузка...</div>
						) : preparingOrders.length === 0 ? (
							<div className='clean-empty'>—</div>
						) : (
							<div
								className={`clean-scroll ${
									preparingOrders.length > 10 ? 'clean-scroll--animated' : ''
								}`}
							>
								<div className='clean-grid'>
									{preparingLoopedOrders.map((order, index) => (
										<div
											className='clean-number clean-number--preparing'
											key={`preparing-${order.id}-${index}`}
										>
											{order.order_number}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</section>

				<section className='clean-column clean-column--ready'>
					<div className='clean-column__head'>
						<h2>Готов</h2>
						<span>{readyOrders.length}</span>
					</div>

					<div className='clean-column__body'>
						{loading ? (
							<div className='clean-empty'>Загрузка...</div>
						) : readyOrders.length === 0 ? (
							<div className='clean-empty'>—</div>
						) : (
							<div
								className={`clean-scroll ${
									readyOrders.length > 10 ? 'clean-scroll--animated' : ''
								}`}
							>
								<div className='clean-grid'>
									{readyLoopedOrders.map((order, index) => (
										<div
											className={`clean-number clean-number--ready ${
												highlightedIds.includes(order.id)
													? 'clean-number--pop'
													: ''
											}`}
											key={`ready-${order.id}-${index}`}
										>
											{order.order_number}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	)
}

export default HallMonitor