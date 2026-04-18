import { useMemo, useState } from 'react'
import { useOrderHistory } from '../../hooks/useOrderHistory'
import { formatPrice } from '../../utils/currency'
import './history.scss'

function HistoryOrders() {
	const { history } = useOrderHistory()
	const data = Array.isArray(history) ? history : []

	const [openDay, setOpenDay] = useState<string | null>(null)
	const [openOrder, setOpenOrder] = useState<string | null>(null)

	const grouped = useMemo(() => {
		const map = new Map<string, any[]>()

		data.forEach(o => {
			const d = o.created_at?.slice(0, 10)
			if (!d) return
			if (!map.has(d)) map.set(d, [])
			map.get(d)?.push(o)
		})

		return Array.from(map.entries()).map(([date, orders]) => ({
			date,
			orders,
		}))
	}, [data])

	return (
		<div className='history'>
			<h2>История заказов</h2>

			{grouped.map(day => (
				<div key={day.date} className='folder'>
					<button onClick={() => setOpenDay(openDay === day.date ? null : day.date)}>
						📄 {day.date}
					</button>

					{openDay === day.date && (
						<div className='content'>
							{day.orders.map((o, i) => (
								<div key={o.id}>
									<button onClick={() => setOpenOrder(openOrder === o.id ? null : o.id)}>
										{i + 1} / {o.order_number} | {formatPrice(o.total)}
									</button>

									{openOrder === o.id && (
										<div className='detail'>
											{o.items?.map((it: any, idx: number) => (
												<div key={idx}>
													{it.title} × {it.quantity}
												</div>
											))}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}

export default HistoryOrders