import { useEffect, useMemo, useState } from 'react'
import {
  deleteOrdersByIds,
  fetchHistoryOrders,
} from '../../api/orders'
import { IMenuItem, IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  getCommonOrderLabel,
  groupOrdersByDay,
} from '../../utils/orderStats'
import './AdminStatsPages.scss'

function buildHistoryHtml(days: ReturnType<typeof groupOrdersByDay>) {
  const body = days
    .map(
      day => `
        <section style="margin-bottom:24px;">
          <h2 style="margin:0 0 12px;">${day.dateLabel}</h2>
          <div style="margin-bottom:8px;font-size:14px;">
            Заказов: ${day.totalOrders} |
            Онлайн: ${formatPrice(day.onlineAmount)} |
            Наличные: ${formatPrice(day.cashAmount)} |
            Итого: ${formatPrice(day.totalAmount)}
          </div>

          ${day.orders
            .map(
              order => `
                <div style="border:1px solid #ccc;border-radius:12px;padding:12px;margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;">
                    <div>
                      <strong>Заказ №${getCommonOrderLabel(order)}</strong><br/>
                      <span>${new Date(order.created_at).toLocaleString('ru-RU')}</span>
                    </div>
                    <div style="text-align:right;">
                      <div>${order.payment_method === 'online' ? 'Онлайн' : 'Наличные'}</div>
                      <strong>${formatPrice(Number(order.total || 0))}</strong>
                    </div>
                  </div>

                  <div>
                    ${((order.items || []) as IMenuItem[])
                      .map(
                        item => `
                          <div style="display:grid;grid-template-columns:1fr auto auto;gap:12px;padding:6px 0;border-top:1px solid #eee;">
                            <span>${item.title}</span>
                            <span>${item.quantity || 1} шт.</span>
                            <strong>${formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                </div>
              `
            )
            .join('')}
        </section>
      `
    )
    .join('')

  return `
    <html>
      <head>
        <title>История заказов</title>
        <meta charset="utf-8" />
      </head>
      <body style="font-family:Arial,sans-serif;padding:24px;">
        <h1 style="margin-top:0;">История заказов</h1>
        ${body}
      </body>
    </html>
  `
}

function OrderHistoryPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openDay, setOpenDay] = useState('')
  const [busy, setBusy] = useState(false)

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchHistoryOrders()
      setOrders(data || [])
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить историю заказов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const groupedDays = useMemo(() => groupOrdersByDay(orders), [orders])

  useEffect(() => {
    if (!openDay && groupedDays.length > 0) {
      setOpenDay(groupedDays[0].dateKey)
    }
  }, [groupedDays, openDay])

  const handleExportPdf = () => {
    const html = buildHistoryHtml(groupedDays)
    const printWindow = window.open('', '_blank', 'width=1200,height=800')

    if (!printWindow) {
      alert('Не удалось открыть окно печати')
      return
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const handleExportAndDelete = async () => {
    if (!orders.length) return

    const confirmed = window.confirm(
      'Сначала сохраните PDF. После этого история будет удалена. Продолжить?'
    )

    if (!confirmed) return

    handleExportPdf()

    const secondConfirm = window.confirm(
      'PDF окно открыто. Удалить историю завершённых заказов?'
    )

    if (!secondConfirm) return

    try {
      setBusy(true)
      await deleteOrdersByIds(orders.map(order => order.id))
      await loadHistory()
      alert('История заказов удалена')
    } catch (e: any) {
      alert(e?.message || 'Не удалось удалить историю')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>История</span>
          <h1>История заказов</h1>
          <p>
            Только завершённые заказы. Можно сохранить в PDF и затем удалить,
            чтобы не перегружать сервер.
          </p>
        </div>

        <div className='admin-stats-actions'>
          <button
            type='button'
            className='admin-action-btn'
            onClick={handleExportPdf}
            disabled={!orders.length || busy}
          >
            Сохранить в PDF
          </button>

          <button
            type='button'
            className='admin-action-btn admin-action-btn--danger'
            onClick={handleExportAndDelete}
            disabled={!orders.length || busy}
          >
            {busy ? 'Удаление...' : 'PDF + удалить историю'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='admin-stats-empty'>Загрузка...</div>
      ) : error ? (
        <div className='admin-stats-empty'>{error}</div>
      ) : groupedDays.length === 0 ? (
        <div className='admin-stats-empty'>История пуста</div>
      ) : (
        <div className='admin-history-days'>
          {groupedDays.map(day => {
            const isOpen = openDay === day.dateKey

            return (
              <div key={day.dateKey} className='admin-history-day'>
                <button
                  type='button'
                  className='admin-history-day__head'
                  onClick={() => setOpenDay(isOpen ? '' : day.dateKey)}
                >
                  <div>
                    <strong>{day.dateLabel}</strong>
                    <span>{day.totalOrders} заказов</span>
                  </div>

                  <div className='admin-history-day__summary'>
                    <span>Онлайн: {formatPrice(day.onlineAmount)}</span>
                    <span>Наличные: {formatPrice(day.cashAmount)}</span>
                    <b>{formatPrice(day.totalAmount)}</b>
                  </div>
                </button>

                {isOpen && (
                  <div className='admin-history-day__body'>
                    {day.orders.map(order => (
                      <div key={order.id} className='admin-history-card'>
                        <div className='admin-history-card__head'>
                          <div>
                            <strong>Заказ №{getCommonOrderLabel(order)}</strong>
                            <span>
                              {new Date(order.created_at).toLocaleString('ru-RU')}
                            </span>
                          </div>

                          <div className='admin-history-card__meta'>
                            <span>
                              {order.payment_method === 'online'
                                ? 'Онлайн'
                                : 'Наличные'}
                            </span>
                            <span>{order.status}</span>
                            <b>{formatPrice(Number(order.total || 0))}</b>
                          </div>
                        </div>

                        <div className='admin-history-items'>
                          {((order.items || []) as IMenuItem[]).map((item, index) => (
                            <div
                              key={`${order.id}-${item.id}-${index}`}
                              className='admin-history-item'
                            >
                              <span>{item.title}</span>
                              <span>{item.quantity || 1} шт.</span>
                              <strong>
                                {formatPrice(
                                  Number(item.price || 0) *
                                    Number(item.quantity || 1)
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default OrderHistoryPage