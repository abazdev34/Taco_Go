type ReportItem = {
	title: string
	quantity: number
	total: number
}

type DayReportData = {
	dateLabel: string
	totalOrders: number
	totalRevenue: number
	itemsSummary: ReportItem[]
}

const formatRub = (value: number) => {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value)
}

export const generateDayReportPdf = (report: DayReportData) => {
	const reportWindow = window.open('', '_blank', 'width=1000,height=800')

	if (!reportWindow) {
		alert('Браузер заблокировал окно печати. Разрешите pop-up.')
		return
	}

	const rows = report.itemsSummary
		.map(
			item => `
				<tr>
					<td>${item.title}</td>
					<td>${item.quantity} шт</td>
					<td>${formatRub(item.total)}</td>
				</tr>
			`
		)
		.join('')

	reportWindow.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8" />
			<title>Отчет за ${report.dateLabel}</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					padding: 30px;
					color: #111827;
				}
				h1 {
					margin-bottom: 8px;
					font-size: 28px;
				}
				.meta {
					margin-bottom: 20px;
					font-size: 16px;
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
					font-size: 14px;
				}
				th {
					background: #111827;
					color: white;
				}
				.summary {
					margin-top: 24px;
					display: flex;
					gap: 20px;
				}
				.summary-box {
					padding: 16px;
					border-radius: 12px;
					background: #f3f4f6;
					min-width: 220px;
				}
				.summary-box strong {
					display: block;
					margin-top: 8px;
					font-size: 22px;
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
			<h1>Отчет за ${report.dateLabel}</h1>

			<div class="meta">
				<div>Всего заказов: <strong>${report.totalOrders}</strong></div>
				<div>Общая выручка: <strong>${formatRub(report.totalRevenue)}</strong></div>
			</div>

			<table>
				<thead>
					<tr>
						<th>Блюдо</th>
						<th>Количество</th>
						<th>Сумма</th>
					</tr>
				</thead>
				<tbody>
					${rows}
				</tbody>
			</table>

			<div class="summary">
				<div class="summary-box">
					<span>Всего заказов</span>
					<strong>${report.totalOrders}</strong>
				</div>
				<div class="summary-box">
					<span>Общая выручка</span>
					<strong>${formatRub(report.totalRevenue)}</strong>
				</div>
			</div>

			<button class="print-btn" onclick="window.print()">Печать / Сохранить в PDF</button>
		</body>
		</html>
	`)

	reportWindow.document.close()
}

export const generatePDF = (element: HTMLElement) => {
	const reportWindow = window.open('', '_blank', 'width=1000,height=800')

	if (!reportWindow) {
		alert('Браузер заблокировал окно печати. Разрешите pop-up.')
		return
	}

	reportWindow.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8" />
			<title>PDF</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					padding: 20px;
				}
				.print-btn {
					margin-top: 20px;
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
			${element.outerHTML}
			<button class="print-btn" onclick="window.print()">Печать / Сохранить в PDF</button>
		</body>
		</html>
	`)

	reportWindow.document.close()
}