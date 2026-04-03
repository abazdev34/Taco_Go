import { useMemo, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrders } from '../../hooks/useOrders'
import { formatPrice } from '../../utils/currency'
import { generatePDF } from '../../utils/pdf'
import { sendEmailReport } from '../../utils/email'
import { IOrderRow } from '../../types/order'

type DayGroup = {
	dateKey: string
	dateLabel: string
	orders: IOrderRow[]
	totalRevenue: number
	totalOrders: number
	itemsSummary: {
		title: string
		quantity: number
		total: number
	}[]
}

type MonthGroup = {
	monthKey: string
	monthLabel: string
	days: DayGroup[]
	totalRevenue: number
	totalOrders: number
}

const HistoryMonitor = () => {
	const { history, loading, error } = useOrders()

	const [openedMonth, setOpenedMonth] = useState<string | null>(null)
	const [openedDay, setOpenedDay] = useState<string | null>(null)
	const [openedOrderId, setOpenedOrderId] = useState<string | null>(null)
	const [openedReportDay, setOpenedReportDay] = useState<string | null>(null)

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

	const monthGroups: MonthGroup[] = useMemo(() => {
		const monthMap = new Map<string, IOrderRow[]>()

		history.forEach((order) => {
			const date = new Date(order.created_at)
			const monthKey = `${date.getFullYear()}-${String(
				date.getMonth() + 1
			).padStart(2, '0')}`

			if (!monthMap.has(monthKey)) {
				monthMap.set(monthKey, [])
			}

			monthMap.get(monthKey)?.push(order)
		})

		return Array.from(monthMap.entries())
			.map(([monthKey, monthOrders]) => {
				const monthDate = new Date(monthOrders[0].created_at)

				const monthLabel = monthDate.toLocaleDateString('ru-RU', {
					month: 'long',
					year: 'numeric',
				})

				const dayMap = new Map<string, IOrderRow[]>()

				monthOrders.forEach((order) => {
					const d = new Date(order.created_at)
					const dayKey = d.toISOString().slice(0, 10)

					if (!dayMap.has(dayKey)) {
						dayMap.set(dayKey, [])
					}

					dayMap.get(dayKey)?.push(order)
				})

				const days: DayGroup[] = Array.from(dayMap.entries())
					.map(([dayKey, dayOrders]) => {
						const dateLabel = new Date(dayOrders[0].created_at).toLocaleDateString(
							'ru-RU',
							{
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							}
						)

						const itemsMap = new Map<
							string,
							{ title: string; quantity: number; total: number }
						>()

						dayOrders.forEach((order) => {
							order.items.forEach((item) => {
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
							dateKey: dayKey,
							dateLabel,
							orders: dayOrders.sort(
								(a, b) => b.order_number - a.order_number
							),
							totalRevenue: dayOrders.reduce(
								(acc, order) => acc + Number(order.total || 0),
								0
							),
							totalOrders: dayOrders.length,
							itemsSummary: Array.from(itemsMap.values()).sort(
								(a, b) => b.quantity - a.quantity
							),
						}
					})
					.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))

				return {
					monthKey,
					monthLabel:
						monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) + ' г.',
					days,
					totalRevenue: monthOrders.reduce(
						(acc, order) => acc + Number(order.total || 0),
						0
					),
					totalOrders: monthOrders.length,
				}
			})
			.sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
	}, [history])

	const totalRevenueAll = useMemo(() => {
		return history.reduce((acc, order) => acc + Number(order.total || 0), 0)
	}, [history])

	const handleOpenOrder = (orderId: string) => {
		setOpenedOrderId((current) => (current === orderId ? null : orderId))
	}

	const handlePdfReport = async (day: DayGroup) => {
		await generatePDF(`report-${day.dateKey}`, `otchet-${day.dateKey}.pdf`)
	}

	const handleEmailReport = (day: DayGroup) => {
		const lines = [
			`Отчет за ${day.dateLabel}`,
			`Количество заказов: ${day.totalOrders}`,
			`Выручка: ${formatPrice(day.totalRevenue)}`,
			'',
			'Проданные блюда:',
			...day.itemsSummary.map(
				(item) =>
					`${item.title} — ${item.quantity} шт. — ${formatPrice(item.total)}`
			),
		]

		sendEmailReport(`Отчет за ${day.dateLabel}`, lines.join('\n'))
	}

	return (
		<div className='monitor-page history-theme'>
			

			<div className='page-header'>
				<div>
					<h1>История заказов</h1>
					<p>История сгруппирована по месяцам и дням</p>
				</div>

				<div className='history-summary-box'>
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

			{error && <div className='error-box'>{error}</div>}

			<div className='history-day-list'>
				{loading ? (
					<div className='empty-monitor'>
						<h2>Загрузка...</h2>
					</div>
				) : monthGroups.length === 0 ? (
					<div className='empty-monitor'>
						<h2>История пока пуста</h2>
					</div>
				) : (
					monthGroups.map((month) => (
						<div key={month.monthKey} className='history-month-folder'>
							<div className='history-day-folder__header'>
								<button
									className='history-day-folder__title'
									onClick={() =>
										setOpenedMonth((prev) =>
											prev === month.monthKey ? null : month.monthKey
										)
									}
								>
									📁 {month.monthLabel}
								</button>

								<div className='history-day-folder__stats'>
									<span>{month.totalOrders} заказов</span>
									<strong>{formatPrice(month.totalRevenue)}</strong>
								</div>
							</div>

							{openedMonth === month.monthKey && (
								<div className='history-month-content'>
									{month.days.map((day) => (
										<div key={day.dateKey} className='history-day-folder nested'>
											<div className='history-day-folder__header'>
												<button
													className='history-day-folder__title'
													onClick={() =>
														setOpenedDay((prev) =>
															prev === day.dateKey ? null : day.dateKey
														)
													}
												>
													📅 {day.dateLabel}
												</button>

												<div className='history-day-folder__stats'>
													<span>{day.totalOrders} заказов</span>
													<strong>{formatPrice(day.totalRevenue)}</strong>
												</div>
											</div>

											{openedDay === day.dateKey && (
												<div className='history-day-folder__content'>
													<div className='history-mini-orders'>
														{day.orders.map((order) => (
															<div
																key={order.id}
																className='history-mini-order-card'
															>
																<button
																	className='history-mini-order-btn'
																	onClick={() => handleOpenOrder(order.id)}
																>
																	Заказ № {order.order_number}
																</button>

																{openedOrderId === order.id && (
																	<div className='history-order-details'>
																		<div className='history-order-meta'>
																			<p>
																				<strong>Дата:</strong>{' '}
																				{new Date(order.created_at).toLocaleString()}
																			</p>

																			<p>
																				<strong>Сумма:</strong>{' '}
																				{formatPrice(order.total)}
																			</p>

																			<p>
																				<strong>Источник:</strong>{' '}
																				{getSourceText(order.source)}
																			</p>

																			{order.comment && (
																				<div className='history-comment-box'>
																					<strong>Комментарий:</strong>{' '}
																					{order.comment}
																				</div>
																			)}
																		</div>

																		<div className='history-order-items'>
																			{order.items.map((item, index) => (
																				<div
																					key={`${item.id}-${index}`}
																					className='history-item-row'
																				>
																					<span>{item.title}</span>
																					<b>
																						{item.quantity} шт ×{' '}
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

													<div className='day-report-folder'>
														<div className='day-report-folder__header'>
															<button
																className='day-report-folder__title'
																onClick={() =>
																	setOpenedReportDay((prev) =>
																		prev === day.dateKey ? null : day.dateKey
																	)
																}
															>
																📄 Отчет за день
															</button>

															{openedReportDay === day.dateKey && (
																<div className='history-report-actions'>
																	<button
																		className='print-report-btn'
																		onClick={() => handlePdfReport(day)}
																	>
																		Скачать PDF
																	</button>

																	<button
																		className='print-report-btn secondary'
																		onClick={() => handleEmailReport(day)}
																	>
																		Отправить на почту
																	</button>
																</div>
															)}
														</div>

														{openedReportDay === day.dateKey && (
															<div
																className='day-report-card print-area'
																id={`report-${day.dateKey}`}
															>
																<div className='day-report-header'>
																	<h2>Отчет за {day.dateLabel}</h2>
																	<p>Сводка по проданным блюдам</p>
																</div>

																<div className='day-report-table'>
																	<div className='day-report-row day-report-head'>
																		<span>Блюдо</span>
																		<span>Количество</span>
																		<span>Сумма</span>
																	</div>

																	{day.itemsSummary.map((item) => (
																		<div className='day-report-row' key={item.title}>
																			<span>{item.title}</span>
																			<span>{item.quantity} шт</span>
																			<span>{formatPrice(item.total)}</span>
																		</div>
																	))}
																</div>

																<div className='day-report-total'>
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
									))}
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