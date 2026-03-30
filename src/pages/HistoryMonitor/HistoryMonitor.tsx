import React from "react"
import Navbar from "../Navbar/Navbar"
import "../Navbar/monitor.scss"
import { useOrders } from "../../hooks/useOrders"
import { formatPrice } from "../../utils/currency"

const HistoryMonitor = () => {
	const { history, loading, error } = useOrders()

	return (
		<div className="monitor-page history-theme">
			<Navbar />

			<div className="page-header">
				<div>
					<h1>История заказов</h1>
					<p>Завершенные и выданные заказы</p>
				</div>
			</div>

			{error && <div className="error-box">{error}</div>}

			<div className="history-table-wrap">
				{loading ? (
					<div className="empty-monitor">
						<h2>Загрузка...</h2>
					</div>
				) : history.length === 0 ? (
					<div className="empty-monitor">
						<h2>История пока пуста</h2>
					</div>
				) : (
					<table className="history-table">
						<thead>
							<tr>
								<th>№ заказа</th>
								<th>Создан</th>
								<th>Сумма</th>
								<th>Статус</th>
							</tr>
						</thead>
						<tbody>
							{history.map((order) => (
								<tr key={order.id}>
									<td>№ {order.order_number}</td>
									<td>{new Date(order.created_at).toLocaleString()}</td>
									<td>{formatPrice(order.total)}</td>
									<td>
										<span className="status-badge completed">Завершен</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	)
}

export default HistoryMonitor