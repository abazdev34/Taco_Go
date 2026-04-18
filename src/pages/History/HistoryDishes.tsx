import { useMemo, useState } from 'react'
import { useOrderHistory } from '../../hooks/useOrderHistory'
import './history.scss'

function HistoryDishes() {
	const { history } = useOrderHistory()
	const data = Array.isArray(history) ? history : []

	const [openDay, setOpenDay] = useState<string | null>(null)

	const grouped = useMemo(() => {
		const map = new Map<string, any[]>()

		data.forEach(o => {
			const d = o.created_at?.slice(0, 10)
			if (!d) return
			if (!map.has(d)) map.set(d, [])
			map.get(d)?.push(o)
		})

		return Array.from(map.entries())
	}, [data])

	return (
		<div className='history'>
			<h2>История блюд</h2>

			{grouped.map(([date, orders]) => {
				const dishMap = new Map<string, number>()

				orders.forEach(o => {
					o.items?.forEach((i: any) => {
						dishMap.set(i.title, (dishMap.get(i.title) || 0) + i.quantity)
					})
				})

				return (
					<div key={date}>
						<button onClick={() => setOpenDay(openDay === date ? null : date)}>
							📄 {date}
						</button>

						{openDay === date &&
							Array.from(dishMap.entries()).map(([t, q]) => (
								<div key={t}>
									{t} — {q} шт
								</div>
							))}
					</div>
				)
			})}
		</div>
	)
}

export default HistoryDishes