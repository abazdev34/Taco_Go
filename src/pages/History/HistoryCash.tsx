import { useMemo, useState } from 'react'
import { useCashMovements } from '../../hooks/useCashMovements'
import { useOrderHistory } from '../../hooks/useOrderHistory'
import { formatPrice } from '../../utils/currency'
import { sendEmailReport } from '../../utils/email'
import { generateCashReportPdf } from '../../utils/report'
import './history.scss'

function HistoryCash() {
	const { movements, loading, error, removeOne } = useCashMovements()
	const { history } = useOrderHistory()

	const orders = Array.isArray(history) ? history : []

	const [openedId, setOpenedId] = useState<string | null>(null)
	const [busyId, setBusyId] = useState('')
	const [search, setSearch] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')

	const approvedMovements = useMemo(() => {
		return (movements || [])
			.filter((item: any) => item.status === 'approved')
			.sort((a: any, b: any) => {
				const aTime = new Date(a.approved_at || a.created_at || '').getTime()
				const bTime = new Date(b.approved_at || b.created_at || '').getTime()
				return bTime - aTime
			})
	}, [movements])

	const filteredMovements = useMemo(() => {
		return approvedMovements.filter((item: any) => {
			const rawDate = String(item.approved_at || item.created_at || '')
			const onlyDate = rawDate.slice(0, 10)

			if (dateFrom && onlyDate < dateFrom) return false
			if (dateTo && onlyDate > dateTo) return false

			if (search.trim()) {
				const q = search.toLowerCase()
				const haystack = [
					item.requested_by,
					item.source_name,
					item.description,
					item.approved_by,
					item.movement_type,
					item.status,
					String(item.amount || ''),
				]
					.join(' ')
					.toLowerCase()

				if (!haystack.includes(q)) return false
			}

			return true
		})
	}, [approvedMovements, search, dateFrom, dateTo])

	const filteredOrders = useMemo(() => {
		return orders.filter((order: any) => {
			const onlyDate = String(order.created_at || '').slice(0, 10)

			if (dateFrom && onlyDate < dateFrom) return false
			if (dateTo && onlyDate > dateTo) return false

			return true
		})
	}, [orders, dateFrom, dateTo])

	const orderStats = useMemo(() => {
		const totalOrders = filteredOrders.length

		const online = filteredOrders.reduce((sum, order: any) => {
			const payment = String(order.payment_method || '').toLowerCase()
			return payment.includes('online') ||
				payment.includes('card') ||
				payment.includes('карта')
				? sum + Number(order.total || 0)
				: sum
		}, 0)

		const cash = filteredOrders.reduce((sum, order: any) => {
			const payment = String(order.payment_method || '').toLowerCase()
			return payment.includes('cash') ||
				payment.includes('нал') ||
				payment.includes('наличные')
				? sum + Number(order.total || 0)
				: sum
		}, 0)

		const total = filteredOrders.reduce(
			(sum, order: any) => sum + Number(order.total || 0),
			0
		)

		return {
			totalOrders,
			online,
			cash,
			total,
		}
	}, [filteredOrders])

	const journalStats = useMemo(() => {
		const income = filteredMovements.reduce((sum: number, item: any) => {
			return item.movement_type === 'in'
				? sum + Number(item.amount || 0)
				: sum
		}, 0)

		const expense = filteredMovements.reduce((sum: number, item: any) => {
			return item.movement_type === 'out'
				? sum + Number(item.amount || 0)
				: sum
		}, 0)

		return {
			income,
			expense,
			balance: income - expense,
			count: filteredMovements.length,
		}
	}, [filteredMovements])

	const groupedByDay = useMemo(() => {
		const map = new Map<string, any[]>()

		filteredMovements.forEach((item: any) => {
			const dateKey = String(item.approved_at || item.created_at || '').slice(0, 10)
			if (!dateKey) return

			if (!map.has(dateKey)) map.set(dateKey, [])
			map.get(dateKey)?.push(item)
		})

		return Array.from(map.entries())
			.sort((a, b) => (a[0] < b[0] ? 1 : -1))
			.map(([date, items]) => {
				const income = items.reduce(
					(sum, item) =>
						item.movement_type === 'in' ? sum + Number(item.amount || 0) : sum,
					0
				)

				const expense = items.reduce(
					(sum, item) =>
						item.movement_type === 'out' ? sum + Number(item.amount || 0) : sum,
					0
				)

				return {
					date,
					items,
					income,
					expense,
					total: income - expense,
				}
			})
	}, [filteredMovements])

	const handleDelete = async (id: string) => {
		try {
			setBusyId(id)
			await removeOne(id)
		} catch (e: any) {
			alert(e?.message || 'Не удалось удалить запись')
		} finally {
			setBusyId('')
		}
	}

	const handleSendEmail = () => {
		const body = `
История кассы

Период: ${dateFrom || 'с начала'} - ${dateTo || 'по сегодня'}
Поиск: ${search || 'нет'}

Заказов: ${orderStats.totalOrders}
Онлайн по заказам: ${formatPrice(orderStats.online)}
Наличка по заказам: ${formatPrice(orderStats.cash)}
Общая сумма заказов: ${formatPrice(orderStats.total)}

Подтверждено операций: ${journalStats.count}
Внесено: ${formatPrice(journalStats.income)}
Изъято: ${formatPrice(journalStats.expense)}
Состояние кассы: ${formatPrice(journalStats.balance)}

Журнал:
${filteredMovements
	.map((item: any) => {
		const date = new Date(item.approved_at || item.created_at || '').toLocaleString('ru-RU')
		const type = item.movement_type === 'in' ? 'ВНЕСЕНИЕ' : 'ИЗЪЯТИЕ'

		return `${date} | ${type} | ${formatPrice(Number(item.amount || 0))} | ${
			item.requested_by || '—'
		} | ${item.source_name || '—'} | ${item.description || '—'} | ${
			item.approved_by || '—'
		}`
	})
	.join('\n')}
`
		sendEmailReport('История кассы', body)
	}

	const handleGeneratePdf = () => {
		generateCashReportPdf({
			dateLabel: `${dateFrom || 'с начала'} - ${dateTo || 'по сегодня'}`,
			totalOrders: orderStats.totalOrders,
			totalCashOrders: orderStats.cash,
			totalOnlineOrders: orderStats.online,
			totalOrdersAmount: orderStats.total,
			totalIn: journalStats.income,
			totalOut: journalStats.expense,
			cashboxBalance: journalStats.balance,
			movements: filteredMovements.map((item: any) => ({
				createdAt: new Date(
					item.approved_at || item.created_at || ''
				).toLocaleString('ru-RU'),
				type: item.movement_type === 'in' ? 'Внесение' : 'Изъятие',
				amount: Number(item.amount || 0),
				requestedBy: item.requested_by || '—',
				sourceName: item.source_name || '—',
				description: item.description || '—',
				approvedBy: item.approved_by || '—',
			})),
		})
	}

	return (
		<div className='history-page'>
			<div className='history-page__title'>История касса</div>

			<div className='history-filters'>
				<input
					type='text'
					placeholder='Поиск по журналу...'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>

				<input
					type='date'
					value={dateFrom}
					onChange={(e) => setDateFrom(e.target.value)}
				/>

				<input
					type='date'
					value={dateTo}
					onChange={(e) => setDateTo(e.target.value)}
				/>

				<button
					type='button'
					className='history-filters__clear'
					onClick={() => {
						setSearch('')
						setDateFrom('')
						setDateTo('')
					}}
				>
					Сброс
				</button>
			</div>

			<div className='history-cash-summary'>
				<div className='history-cash-card'>
					<span>Заказ саны</span>
					<b>{orderStats.totalOrders}</b>
				</div>

				<div className='history-cash-card'>
					<span>Онлайн заказы</span>
					<b>{formatPrice(orderStats.online)}</b>
				</div>

				<div className='history-cash-card'>
					<span>Наличка заказы</span>
					<b>{formatPrice(orderStats.cash)}</b>
				</div>

				<div className='history-cash-card'>
					<span>Общая сумма заказов</span>
					<b>{formatPrice(orderStats.total)}</b>
				</div>

				<div className='history-cash-card income'>
					<span>Внесено</span>
					<b>{formatPrice(journalStats.income)}</b>
				</div>

				<div className='history-cash-card expense'>
					<span>Изъято</span>
					<b>{formatPrice(journalStats.expense)}</b>
				</div>

				<div className='history-cash-card neutral'>
					<span>Касса состояние</span>
					<b>{formatPrice(journalStats.balance)}</b>
				</div>

				<div className='history-cash-card'>
					<span>Журнал записей</span>
					<b>{journalStats.count}</b>
				</div>
			</div>

			<div className='history-cash-toolbar'>
				<button onClick={handleGeneratePdf}>PDF</button>
				<button onClick={handleSendEmail}>Отправ почта</button>
			</div>

			{loading && <div className='history-page__state'>Загрузка...</div>}
			{error && <div className='history-page__state history-page__state--error'>{error}</div>}

			{!loading &&
				!error &&
				groupedByDay.map((day) => (
					<div key={day.date} className='history-folder'>
						<div className='history-folder__button'>
							<span>📄 {day.date}</span>
							<span>
								Внесено: {formatPrice(day.income)} | Изъято: {formatPrice(day.expense)} |
								Баланс: {formatPrice(day.total)}
							</span>
						</div>

						<div className='history-folder__content'>
							<div className='history-cash-table'>
								<div className='history-cash-head'>
									<div>Дата</div>
									<div>Кто отправил</div>
									<div>Тип</div>
									<div>Сумма</div>
									<div>Источник</div>
									<div>Описание</div>
									<div>Подтвердил</div>
									<div>Действие</div>
								</div>

								{day.items.map((item: any) => (
									<div key={item.id} className='history-cash-row-wrap'>
										<button
											type='button'
											className='history-cash-row'
											onClick={() =>
												setOpenedId((prev) => (prev === item.id ? null : item.id))
											}
										>
											<div>
												{new Date(
													item.approved_at || item.created_at || ''
												).toLocaleString('ru-RU')}
											</div>
											<div>{item.requested_by || '—'}</div>
											<div>{item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}</div>
											<div>{formatPrice(Number(item.amount || 0))}</div>
											<div>{item.source_name || '—'}</div>
											<div>{item.description || '—'}</div>
											<div>{item.approved_by || '—'}</div>
											<div>Открыть</div>
										</button>

										{openedId === item.id && (
											<div className='history-cash-detail'>
												<div><b>Кто отправил:</b> {item.requested_by || '—'}</div>
												<div><b>Кто подтвердил:</b> {item.approved_by || '—'}</div>
												<div>
													<b>Когда подтверждено:</b>{' '}
													{item.approved_at
														? new Date(item.approved_at).toLocaleString('ru-RU')
														: '—'}
												</div>
												<div><b>Тип:</b> {item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}</div>
												<div><b>Сумма:</b> {formatPrice(Number(item.amount || 0))}</div>
												<div><b>Источник / направление:</b> {item.source_name || '—'}</div>
												<div><b>Описание:</b> {item.description || '—'}</div>

												<div className='history-cash-actions'>
													<button
														className='danger'
														disabled={busyId === item.id}
														onClick={(e) => {
															e.stopPropagation()
															handleDelete(item.id)
														}}
													>
														{busyId === item.id ? '...' : 'Удалить'}
													</button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				))}
		</div>
	)
}

export default HistoryCash