import React, { useMemo, useState } from "react"
import Navbar from "../Navbar/Navbar"
import "../Navbar/monitor.scss"
import { useOrders } from "../../hooks/useOrders"
import { formatPrice } from "../../utils/currency"

type DayGroup = {
	dateKey: string
	dateLabel: string
	orders: any[]
	totalRevenue: number
	totalOrders: number
	itemsSummary: {
		title: string
		quantity: number
		total: number
	}[]
}

const HistoryMonitor = () => {
	const { history, loading, error } = useOrders()

	const [openedDay, setOpenedDay] = useState<string | null>(null)
	const [openedOrderId, setOpenedOrderId] = useState<string | null>(null)
	const [openedReportDay, setOpenedReportDay] = useState<string | null>(null)

	const dayGroups: DayGroup[] = useMemo(() => {
		const groups = new Map<string, any[]>()

		history.forEach((order) => {
			const date = new Date(order.created_at)
			const dateKey = date.toISOString().slice(0, 10)

			if (!groups.has(dateKey)) {
				groups.set(dateKey, [])
			}

			groups.get(dateKey)?.push(order)
		})

		return Array.from(groups.entries())
			.map(([dateKey, orders]) => {
				const dateLabel = new Date(orders[0].created_at).toLocaleDateString("ru-RU", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})

				const itemsMap = new Map<
					string,
					{ title: string; quantity: number; total: number }
				>()

				orders.forEach((order) => {
					order.items.forEach((item: any) => {
						const prev = itemsMap.get(item.title)

						const qty = Number(item.quantity || 0)
						const sum = Number(item.price || 0) * qty

						if (prev) {
							itemsMap.set(item.title, {
								title: item.title,
								quantity: prev.quantity + qty,
								total: prev.total + sum,
							})
						} else {
							itemsMap.set(item.title, {
								title: item.title,
								quantity: qty,
								total: sum,
							})
						}
					})
				})

				return {
					dateKey,
					dateLabel,
					orders,
					totalRevenue: orders.reduce(
						(acc, order) => acc + Number(order.total || 0),
						0
					),
					totalOrders: orders.length,
					itemsSummary: Array.from(itemsMap.values()).sort(
						(a, b) => b.quantity - a.quantity
					),
				}
			})
			.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
	}, [history])

	const totalRevenueAll = useMemo(() => {
		return history.reduce((acc, order) => acc + Number(order.total || 0), 0)
	}, [history])

	const handleOpenOrder = (orderId: string) => {
		setOpenedOrderId(orderId)

		setTimeout(() => {
			setOpenedOrderId((current) => (current === orderId ? null : current))
		}, 5000)
	}

	const handlePrintDayReport = () => {
		window.print()
	}

	return (
		<div className="monitor-page history-theme">
			<Navbar />

			<div className="page-header">
				<div>
					<h1>История заказов</h1>
					<p>Заказы сгруппированы по дням</p>
				</div>

				<div className="history-summary-box">
					<div>
						<span>Всего заказов</span>
						<strong>{history.length}</strong>
					</div>
					<div>
						<span>Общая выручка</span>
						<strong>{formatPrice(totalRevenueAll)}</strong>
					</div>
				</div>
			</div>

			{error && <div className="error-box">{error}</div>}

			<div className="history-actions">
				<button className="day-close-btn">
					День закончился
				</button>
			</div>

			<div className="history-day-list">
				{loading ? (
					<div className="empty-monitor">
						<h2>Загрузка...</h2>
					</div>
				) : dayGroups.length === 0 ? (
					<div className="empty-monitor">
						<h2>История пока пуста</h2>
					</div>
				) : (
					dayGroups.map((day) => (
						<div key={day.dateKey} className="history-day-folder">
							<div className="history-day-folder__header">
								<button
									className="history-day-folder__title"
									onClick={() =>
										setOpenedDay((prev) =>
											prev === day.dateKey ? null : day.dateKey
										)
									}
								>
									📁 {day.dateLabel}
								</button>

								<div className="history-day-folder__stats">
									<span>{day.totalOrders} заказов</span>
									<strong>{formatPrice(day.totalRevenue)}</strong>
								</div>
							</div>

							{openedDay === day.dateKey && (
								<div className="history-day-folder__content">
									<div className="history-mini-orders">
										{day.orders.map((order) => (
											<div key={order.id} className="history-mini-order-card">
												<button
													className="history-mini-order-btn"
													onClick={() => handleOpenOrder(order.id)}
												>
													№ {order.order_number}
												</button>

												{openedOrderId === order.id && (
													<div className="history-order-details">
														<div className="history-order-meta">
															<p>
																<strong>Дата:</strong>{" "}
																{new Date(order.created_at).toLocaleString()}
															</p>
															<p>
																<strong>Сумма:</strong>{" "}
																{formatPrice(order.total)}
															</p>
														</div>

														<div className="history-order-items">
															{order.items.map((item: any, index: number) => (
																<div
																	key={`${item.id}-${index}`}
																	className="history-item-row"
																>
																	<span>{item.title}</span>
																	<b>
																		{item.quantity} шт ×{" "}
																		{formatPrice(item.price)}
																	</b>
																</div>
															))}
														</div>
													</div>
												)}
											</div>
										))}
									</div>

									<div className="day-report-folder">
										<div className="day-report-folder__header">
											<button
												className="day-report-folder__title"
												onClick={() =>
													setOpenedReportDay((prev) =>
														prev === day.dateKey ? null : day.dateKey
													)
												}
											>
												📄 Отчет за день
											</button>

											{openedReportDay === day.dateKey && (
												<button
													className="print-report-btn"
													onClick={handlePrintDayReport}
												>
													Печать
												</button>
											)}
										</div>

										{openedReportDay === day.dateKey && (
											<div className="day-report-card print-area">
												<div className="day-report-header">
													<h2>Отчет за {day.dateLabel}</h2>
													<p>Сводка по проданным блюдам</p>
												</div>

												<div className="day-report-table">
													<div className="day-report-row day-report-head">
														<span>Блюдо</span>
														<span>Количество</span>
														<span>Сумма</span>
													</div>

													{day.itemsSummary.map((item) => (
														<div className="day-report-row" key={item.title}>
															<span>{item.title}</span>
															<span>{item.quantity} шт</span>
															<span>{formatPrice(item.total)}</span>
														</div>
													))}
												</div>

												<div className="day-report-total">
													<div>
														<span>Всего заказов</span>
														<strong>{day.totalOrders}</strong>
													</div>
													<div>
														<span>Общая выручка</span>
														<strong>{formatPrice(day.totalRevenue)}</strong>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					))
				)}
			</div>
		</div>
	)
}

export default HistoryMonitor