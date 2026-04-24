export const formatRub = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

/* ================= DAY REPORT ================= */

export const generateDayReportPdf = (report: {
  dateLabel: string
  totalOrders: number
  totalRevenue: number
}) => {
  const win = window.open('', '_blank', 'width=900,height=700')

  if (!win) return alert('Popup blocked')

  win.document.write(`
    <html>
      <head>
        <title>Отчет</title>
      </head>
      <body style="font-family: Arial; padding:20px;">
        <h1>Отчет за ${report.dateLabel}</h1>

        <p>Заказов: <b>${report.totalOrders}</b></p>
        <p>Выручка: <b>${formatRub(report.totalRevenue)}</b></p>

        <button onclick="window.print()">Печать</button>
      </body>
    </html>
  `)

  win.document.close()
}

/* ================= CASH REPORT ================= */

export const generateCashReportPdf = (report: any) => {
  const win = window.open('', '_blank', 'width=900,height=700')

  if (!win) return alert('Popup blocked')

  win.document.write(`
    <html>
      <head>
        <title>Кассовый отчет</title>
      </head>
      <body style="font-family: Arial; padding:20px;">
        <h1>Кассовый отчет</h1>

        <p>Дата: ${report.dateLabel}</p>
        <p>Заказов: ${report.totalOrders}</p>
        <p>Наличные: ${formatRub(report.totalCashOrders)}</p>
        <p>Онлайн: ${formatRub(report.totalOnlineOrders)}</p>
        <p>Внесено: ${formatRub(report.totalIn)}</p>
        <p>Изъято: ${formatRub(report.totalOut)}</p>

        <h2>Итого в кассе: ${formatRub(report.cashboxBalance)}</h2>

        <button onclick="window.print()">Печать</button>
      </body>
    </html>
  `)

  win.document.close()
}