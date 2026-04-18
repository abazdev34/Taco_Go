import { useMemo } from 'react'
import { useOrderHistory } from '../../hooks/useOrderHistory'
import './history.scss'

function HistoryProducts() {
	const { history } = useOrderHistory()
	const data = Array.isArray(history) ? history : []

	const products = useMemo(() => {
		const map = new Map<string, number>()

		data.forEach(o => {
			o.items?.forEach((i: any) => {
				map.set(i.title, (map.get(i.title) || 0) + i.quantity)
			})
		})

		return Array.from(map.entries())
	}, [data])

	return (
		<div className='history'>
			<h2>Продукты</h2>

			{products.map(([t, q]) => (
				<div key={t}>
					{t} — {q} шт
				</div>
			))}
		</div>
	)
}

export default HistoryProducts