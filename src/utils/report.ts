import { formatPrice } from './currency'

type CashReportMovement = {
	createdAt: string
	type: string
	amount: number
	requestedBy?: string
	sourceName?: string
	description?: string
	approvedBy?: string
}

type CashReportPayload = {
	dateLabel: string
	totalOrders: number
	totalCashOrders: number
	totalOnlineOrders: number
	totalOrdersAmount: number
	totalIn: number
	totalOut: number
	cashboxBalance: number
	movements: CashReportMovement[]
}

export const generateCashReportPdf = (payload: CashReportPayload) => {
	const win = window.open('', '_blank', 'width=1100,height=800')

	if (!win) {
		alert('Разрешите popup для PDF')
		return
	}

	const rows = payload.movements
		.map(
			(item) => `
			<tr>
				<td>${item.createdAt}</td>
				<td>${item.type}</td>
				<td>${formatPrice(item.amount)}</td>
				<td>${item.requestedBy || '—'}</td>
				<td>${item.sourceName || '—'}</td>
				<td>${item.description || '—'}</td>
				<td>${item.approvedBy || '—'}</td>
			</tr>
		`
		)
		.join('')

	win.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8" />
			<title>Кассовый отчет</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					padding: 24px;
					color: #111827;
				}
				h1 {
					margin-bottom: 8px;
					font-size: 28px;
				}
				.meta {
					display: grid;
					grid-template-columns: repeat(4, minmax(0, 1fr));
					gap: 12px;
					margin: 18px 0 24px;
				}
				.box {
					padding: 14px;
					border-radius: 12px;
					background: #f3f4f6;
				}
				.box span {
					display: block;
					font-size: 13px;
					color: #6b7280;
				}
				.box strong {
					display: block;
					margin-top: 8px;
					font-size: 22px;
				}
				table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 20px;
				}
				th, td {
					border: 1px solid #d1d5db;
					padding: 10px 12px;
					text-align: left;
					font-size: 13px;
					vertical-align: top;
				}
				th {
					background: #111827;
					color: white;
				}
				.print-btn {
					margin-top: 24px;
					padding: 12px 16px;
					border: none;
					border-radius: 10px;
					background: #111827;
					color: white;
					font-weight: bold;
					cursor: pointer;
				}
				@media print {
					.print-btn {
						display: none;
					}
				}
			</style>
		</head>
		<body>
			<h1>Кассовый отчет</h1>
			<p><b>Период:</b> ${payload.dateLabel}</p>

			<div class="meta">
				<div class="box">
					<span>Заказов</span>
					<strong>${payload.totalOrders}</strong>
				</div>
				<div class="box">
					<span>Наличка заказов</span>
					<strong>${formatPrice(payload.totalCashOrders)}</strong>
				</div>
				<div class="box">
					<span>Онлайн заказов</span>
					<strong>${formatPrice(payload.totalOnlineOrders)}</strong>
				</div>
				<div class="box">
					<span>Сумма заказов</span>
					<strong>${formatPrice(payload.totalOrdersAmount)}</strong>
				</div>
				<div class="box">
					<span>Внесено</span>
					<strong>${formatPrice(payload.totalIn)}</strong>
				</div>
				<div class="box">
					<span>Изъято</span>
					<strong>${formatPrice(payload.totalOut)}</strong>
				</div>
				<div class="box">
					<span>Касса состояние</span>
					<strong>${formatPrice(payload.cashboxBalance)}</strong>
				</div>
			</div>

			<table>
				<thead>
					<tr>
						<th>Дата</th>
						<th>Тип</th>
						<th>Сумма</th>
						<th>Кто отправил</th>
						<th>Источник</th>
						<th>Описание</th>
						<th>Подтвердил</th>
					</tr>
				</thead>
				<tbody>
					${rows || '<tr><td colspan="7">Нет данных</td></tr>'}
				</tbody>
			</table>

			<button class="print-btn" onclick="window.print()">Печать / Сохранить в PDF</button>
		</body>
		</html>
	`)

	win.document.close()
}