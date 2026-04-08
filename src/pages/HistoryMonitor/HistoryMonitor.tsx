import { useMemo, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrderHistory } from '../../hooks/useOrderHistory'
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
  onlineRevenue: number
  cashRevenue: number
  onlineOrders: number
  cashOrders: number
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
  const { history, loading, error } = useOrderHistory()
  const safeHistory = Array.isArray(history) ? history : []

  const [openedMonth, setOpenedMonth] = useState<string | null>(null)
  const [openedDay, setOpenedDay] = useState<string | null>(null)
  const [openedOrderId, setOpenedOrderId] = useState<string | null>(null)
  const [openedReportDay, setOpenedReportDay] = useState<string | null>(null)

  const getSourceText = (source?: string | null) => {
    switch (source) {
      case 'client':
        return 'Клиент'
      case 'cashier':
        return 'Кассир'
      default:
        return 'Неизвестно'
    }
  }

  const getPaymentMethodText = (paymentMethod?: string | null) => {
    switch (paymentMethod) {
      case 'online':
        return 'Онлайн'
      case 'cash':
        return 'Наличные'
      default:
        return 'Неизвестно'
    }
  }

  const revenueStats = useMemo(() => {
    return safeHistory.reduce(
      (acc, order) => {
        const total = Number(order.total || 0)

        if (order.payment_method === 'online') {
          acc.onlineRevenue += total
          acc.onlineOrders += 1
        } else if (order.payment_method === 'cash') {
          acc.cashRevenue += total
          acc.cashOrders += 1
        }

        acc.totalRevenue += total
        acc.totalOrders += 1

        return acc
      },
      {
        onlineRevenue: 0,
        cashRevenue: 0,
        totalRevenue: 0,
        onlineOrders: 0,
        cashOrders: 0,
        totalOrders: 0,
      }
    )
  }, [safeHistory])

  const monthGroups: MonthGroup[] = useMemo(() => {
    const monthMap = new Map<string, IOrderRow[]>()

    safeHistory.forEach((order) => {
      if (!order?.created_at) return

      const date = new Date(order.created_at)
      if (Number.isNaN(date.getTime())) return

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
        if (!monthOrders.length) {
          return {
            monthKey,
            monthLabel: '',
            days: [],
            totalRevenue: 0,
            totalOrders: 0,
          }
        }

        const monthDate = new Date(monthOrders[0].created_at)

        const monthLabel = monthDate.toLocaleDateString('ru-RU', {
          month: 'long',
          year: 'numeric',
        })

        const dayMap = new Map<string, IOrderRow[]>()

        monthOrders.forEach((order) => {
          const d = new Date(order.created_at)
          if (Number.isNaN(d.getTime())) return

          const dayKey = d.toISOString().slice(0, 10)

          if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, [])
          }

          dayMap.get(dayKey)?.push(order)
        })

        const days: DayGroup[] = Array.from(dayMap.entries())
          .map(([dayKey, dayOrders]) => {
            const firstOrder = dayOrders[0]

            const dateLabel = new Date(firstOrder.created_at).toLocaleDateString(
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
              const items = Array.isArray(order.items) ? order.items : []

              items.forEach((item) => {
                const title = item.title || 'Без названия'
                const prev = itemsMap.get(title)
                const qty = Number(item.quantity || 0)
                const sum = Number(item.price || 0) * qty

                if (prev) {
                  itemsMap.set(title, {
                    title,
                    quantity: prev.quantity + qty,
                    total: prev.total + sum,
                  })
                } else {
                  itemsMap.set(title, {
                    title,
                    quantity: qty,
                    total: sum,
                  })
                }
              })
            })

            const onlineRevenue = dayOrders.reduce((acc, order) => {
              return order.payment_method === 'online'
                ? acc + Number(order.total || 0)
                : acc
            }, 0)

            const cashRevenue = dayOrders.reduce((acc, order) => {
              return order.payment_method === 'cash'
                ? acc + Number(order.total || 0)
                : acc
            }, 0)

            const onlineOrders = dayOrders.filter(
              (order) => order.payment_method === 'online'
            ).length

            const cashOrders = dayOrders.filter(
              (order) => order.payment_method === 'cash'
            ).length

            return {
              dateKey: dayKey,
              dateLabel,
              orders: [...dayOrders].sort(
                (a, b) =>
                  Number(b.serial_number || 0) - Number(a.serial_number || 0)
              ),
              totalRevenue: dayOrders.reduce(
                (acc, order) => acc + Number(order.total || 0),
                0
              ),
              totalOrders: dayOrders.length,
              onlineRevenue,
              cashRevenue,
              onlineOrders,
              cashOrders,
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
  }, [safeHistory])

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
      `Онлайн: ${day.onlineOrders} / ${formatPrice(day.onlineRevenue)}`,
      `Наличные: ${day.cashOrders} / ${formatPrice(day.cashRevenue)}`,
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
            <strong>{revenueStats.totalOrders}</strong>
          </div>

          <div>
            <span>Общая выручка</span>
            <strong>{formatPrice(revenueStats.totalRevenue)}</strong>
          </div>

          <div>
            <span>Онлайн</span>
            <strong>
              {revenueStats.onlineOrders} / {formatPrice(revenueStats.onlineRevenue)}
            </strong>
          </div>

          <div>
            <span>Наличные</span>
            <strong>
              {revenueStats.cashOrders} / {formatPrice(revenueStats.cashRevenue)}
            </strong>
          </div>
        </div>
      </div>

      {error && <div className='error-box'>{error}</div>}

      <div className='history-day-list'>
        {loading ? (
          <div className='empty-box large'>Загрузка...</div>
        ) : monthGroups.length === 0 ? (
          <div className='empty-box large'>История пока пуста</div>
        ) : (
          monthGroups.map((month) => (
            <div key={month.monthKey} className='folder-card'>
              <div className='folder-card__header'>
                <button
                  className='folder-card__title'
                  onClick={() =>
                    setOpenedMonth((prev) =>
                      prev === month.monthKey ? null : month.monthKey
                    )
                  }
                >
                  📁 {month.monthLabel}
                </button>

                <div className='folder-card__stats'>
                  <span>{month.totalOrders} заказов</span>
                  <strong>{formatPrice(month.totalRevenue)}</strong>
                </div>
              </div>

              {openedMonth === month.monthKey && (
                <div className='folder-card__content'>
                  {month.days.map((day) => (
                    <div key={day.dateKey} className='folder-card nested'>
                      <div className='folder-card__header'>
                        <button
                          className='folder-card__title'
                          onClick={() =>
                            setOpenedDay((prev) =>
                              prev === day.dateKey ? null : day.dateKey
                            )
                          }
                        >
                          📅 {day.dateLabel}
                        </button>

                        <div className='folder-card__stats'>
                          <span>{day.totalOrders} заказов</span>
                          <strong>{formatPrice(day.totalRevenue)}</strong>
                        </div>
                      </div>

                      {openedDay === day.dateKey && (
                        <div className='folder-card__content'>
                          <div className='day-source-stats'>
                            <div className='day-source-stat'>
                              <span>Онлайн</span>
                              <strong>
                                {day.onlineOrders} / {formatPrice(day.onlineRevenue)}
                              </strong>
                            </div>

                            <div className='day-source-stat'>
                              <span>Наличные</span>
                              <strong>
                                {day.cashOrders} / {formatPrice(day.cashRevenue)}
                              </strong>
                            </div>

                            <div className='day-source-stat'>
                              <span>Итого</span>
                              <strong>
                                {day.totalOrders} / {formatPrice(day.totalRevenue)}
                              </strong>
                            </div>
                          </div>

                          <div className='history-mini-orders'>
                            {day.orders.map((order) => (
                              <div key={order.id} className='history-mini-order-card'>
                                <button
                                  className='history-mini-order-btn'
                                  onClick={() => handleOpenOrder(order.id)}
                                >
                                  История № {order.serial_number ?? '-'} · Заказ №{' '}
                                  {order.order_number ?? '-'}
                                </button>

                                {openedOrderId === order.id && (
                                  <div className='history-order-details'>
                                    <div className='history-order-meta'>
                                      <p>
                                        <strong>Дата:</strong>{' '}
                                        {new Date(order.created_at).toLocaleString()}
                                      </p>

                                      <p>
                                        <strong>История №:</strong>{' '}
                                        {order.serial_number ?? '-'}
                                      </p>

                                      <p>
                                        <strong>Дневной №:</strong>{' '}
                                        {order.order_number ?? '-'}
                                      </p>

                                      <p>
                                        <strong>Сумма:</strong>{' '}
                                        {formatPrice(Number(order.total || 0))}
                                      </p>

                                      <p>
                                        <strong>Источник:</strong>{' '}
                                        {getSourceText(order.source)}
                                      </p>

                                      <p>
                                        <strong>Оплата:</strong>{' '}
                                        {getPaymentMethodText(order.payment_method)}
                                      </p>

                                      {order.comment && (
                                        <div className='comment-box'>
                                          <strong>Комментарий:</strong>{' '}
                                          {order.comment}
                                        </div>
                                      )}
                                    </div>

                                    <div className='history-order-items'>
                                      {(order.items ?? []).map((item, index) => (
                                        <div
                                          key={`${item.id}-${index}`}
                                          className='history-item-row'
                                        >
                                          <span>{item.title}</span>
                                          <b>
                                            {item.quantity || 0} шт ×{' '}
                                            {formatPrice(Number(item.price || 0))}
                                          </b>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className='folder-card report-folder'>
                            <div className='folder-card__header'>
                              <button
                                className='folder-card__title'
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
                                    className='primary-btn'
                                    onClick={() => handlePdfReport(day)}
                                  >
                                    Скачать PDF
                                  </button>

                                  <button
                                    className='secondary-btn'
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
                                    <span>Онлайн</span>
                                    <strong>
                                      {day.onlineOrders} / {formatPrice(day.onlineRevenue)}
                                    </strong>
                                  </div>
                                  <div>
                                    <span>Наличные</span>
                                    <strong>
                                      {day.cashOrders} / {formatPrice(day.cashRevenue)}
                                    </strong>
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