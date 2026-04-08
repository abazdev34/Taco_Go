import { IOrderRow } from '../types/order'
import { formatPrice } from './currency'

export function buildReceiptText(order: IOrderRow): string {
  const lines: string[] = []

  lines.push('КАССОВЫЙ ЧЕК')
  lines.push('----------------------------')
  lines.push(`Заказ № ${order.order_number ?? '-'}`)

  if (order.serial_number) {
    lines.push(`История № ${order.serial_number}`)
  }

  lines.push(
    `Дата: ${
      order.paid_at
        ? new Date(order.paid_at).toLocaleString()
        : new Date(order.created_at).toLocaleString()
    }`
  )

  lines.push(`Тип: ${order.order_place === 'takeaway' ? 'С собой' : 'Здесь'}`)
  lines.push(`Оплата: ${order.payment_method === 'cash' ? 'Наличка' : 'Онлайн'}`)
  lines.push(`Кассир: ${order.cashier_name || '—'}`)
  lines.push('----------------------------')

  ;(order.items || []).forEach((item) => {
    const qty = Number(item.quantity || 0)
    const price = Number(item.price || 0)
    const sum = qty * price
    lines.push(`${item.title}`)
    lines.push(`${qty} x ${formatPrice(price)} = ${formatPrice(sum)}`)
  })

  lines.push('----------------------------')
  lines.push(`Итого: ${formatPrice(Number(order.total || 0))}`)

  if (order.payment_method === 'cash') {
    lines.push(`Получено: ${formatPrice(Number(order.paid_amount || 0))}`)
    lines.push(`Сдача: ${formatPrice(Number(order.change_amount || 0))}`)
  }

  if (order.comment) {
    lines.push('----------------------------')
    lines.push(`Комментарий: ${order.comment}`)
  }

  lines.push('Спасибо!')
  return lines.join('\n')
}

export function printReceipt(order: IOrderRow) {
  const text = buildReceiptText(order)
  const receiptWindow = window.open('', '_blank', 'width=360,height=700')

  if (!receiptWindow) return

  receiptWindow.document.write(`
    <html>
      <head>
        <title>Чек</title>
        <style>
          body {
            font-family: monospace;
            white-space: pre-wrap;
            padding: 16px;
            font-size: 14px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>${text.replace(/\n/g, '<br/>')}</body>
    </html>
  `)

  receiptWindow.document.close()
  receiptWindow.focus()
  receiptWindow.print()
}