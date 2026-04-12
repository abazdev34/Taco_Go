import { useMemo, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrderHistory } from '../../hooks/useOrderHistory'
import { formatPrice } from '../../utils/currency'
import { generatePDF } from '../../utils/pdf'
import { sendEmailReport } from '../../utils/email'
import { IOrderRow } from '../../types/order'
import { deleteOrder, deleteOrdersByIds } from '../../api/orders'

const HistoryMonitor = () => {
  const { history, loading, error, setHistory } = useOrderHistory()
  const safeHistory = Array.isArray(history) ? history : []

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'yesterday'>('all')

  const [openedDay, setOpenedDay] = useState<string | null>(null)
  const [openedOrderId, setOpenedOrderId] = useState<string | null>(null)

  // 🔍 FILTER + SEARCH
  const filteredHistory = useMemo(() => {
    const now = new Date()

    return safeHistory.filter((order) => {
      if (!order.created_at) return false

      const date = new Date(order.created_at)

      if (filter === 'today') {
        if (date.toDateString() !== now.toDateString()) return false
      }

      if (filter === 'yesterday') {
        const y = new Date()
        y.setDate(now.getDate() - 1)
        if (date.toDateString() !== y.toDateString()) return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()

        const matchTitle = (order.items || []).some((item) =>
          item.title?.toLowerCase().includes(q)
        )

        const matchNumber = String(order.order_number || '').includes(q)

        if (!matchTitle && !matchNumber) return false
      }

      return true
    })
  }, [safeHistory, search, filter])

  // 📅 GROUP BY DAY
  const grouped = useMemo(() => {
    const map = new Map<string, IOrderRow[]>()

    filteredHistory.forEach((order) => {
      const key = order.created_at?.slice(0, 10)
      if (!key) return

      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(order)
    })

    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filteredHistory])

  // 🔥 TOP ITEMS
  const topItems = useMemo(() => {
    const map = new Map<string, number>()

    safeHistory.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : []

      items.forEach((item) => {
        const key = item.title || 'Без названия'
        const qty = Number(item.quantity || 0)

        map.set(key, (map.get(key) || 0) + qty)
      })
    })

    return Array.from(map.entries())
      .map(([title, qty]) => ({ title, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [safeHistory])

  // 🧾 PDF ЧЕК
  const generateOrderPDF = (order: IOrderRow) => {
    const el = document.createElement('div')

    el.innerHTML = `
      <div style="padding:20px;font-family:monospace">
        <h2>Чек</h2>
        <p>Заказ № ${order.order_number}</p>
        <p>${new Date(order.created_at || '').toLocaleString()}</p>
        <hr/>
        ${(order.items || [])
          .map(
            (i) =>
              `<div>${i.title} x${i.quantity} — ${formatPrice(
                i.price * i.quantity
              )}</div>`
          )
          .join('')}
        <hr/>
        <h3>Итого: ${formatPrice(order.total)}</h3>
      </div>
    `

    document.body.appendChild(el)
    generatePDF(el, `order-${order.order_number}.pdf`)
    setTimeout(() => document.body.removeChild(el), 500)
  }

  // 📧 EMAIL
  const sendOrderEmail = (order: IOrderRow) => {
    sendEmailReport(
      `Заказ № ${order.order_number}`,
      `
Заказ № ${order.order_number}

Дата: ${new Date(order.created_at || '').toLocaleString()}
Сумма: ${formatPrice(order.total)}

Состав:
${(order.items || [])
  .map((i) => `${i.title} × ${i.quantity}`)
  .join('\n')}
`
    )
  }

  // ❌ DELETE ORDER
  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Удалить заказ?')) return

    await deleteOrder(id)
    setHistory((prev = []) => prev.filter((o) => o.id !== id))
  }

  // ❌ DELETE DAY
  const handleDeleteDay = async (ids: string[], date: string) => {
    if (!window.confirm(`Удалить все заказы за ${date}?`)) return

    await deleteOrdersByIds(ids)
    setHistory((prev = []) => prev.filter((o) => !ids.includes(o.id)))
  }

  return (
    <div className='monitor-page'>
      <h1>История заказов</h1>

      {/* 🔥 TOP ITEMS */}
      <div style={{ marginBottom: 20 }}>
        <h3>🔥 Топ блюд</h3>
        {topItems.map((item) => (
          <div key={item.title}>
            {item.title} — {item.qty} шт
          </div>
        ))}
      </div>

      {/* 🔍 FILTER */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          placeholder='Поиск...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value='all'>Все</option>
          <option value='today'>Сегодня</option>
          <option value='yesterday'>Вчера</option>
        </select>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p>{error}</p>}

      {grouped.map(([date, orders]) => {
        const total = orders.reduce(
          (a, o) => a + Number(o.total || 0),
          0
        )

        return (
          <div key={date} className='folder-card'>
            <div className='folder-card__header'>
              <button onClick={() => setOpenedDay(date === openedDay ? null : date)}>
                📅 {date}
              </button>

              <b>{formatPrice(total)}</b>

              <button onClick={() => handleDeleteDay(orders.map((o) => o.id), date)}>
                Удалить день
              </button>
            </div>

            {openedDay === date && (
              <div className='folder-card__content'>
                {orders.map((order) => (
                  <div key={order.id} className='history-mini-order-card'>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        onClick={() =>
                          setOpenedOrderId((prev) =>
                            prev === order.id ? null : order.id
                          )
                        }
                      >
                        Заказ № {String(order.order_number || 0).padStart(3, '0')}
                      </button>

                      <button onClick={() => handleDeleteOrder(order.id)}>✕</button>
                    </div>

                    {openedOrderId === order.id && (
                      <div>
                        <p><b>Сумма:</b> {formatPrice(order.total)}</p>
                        <p>
                          <b>Дата:</b>{' '}
                          {new Date(order.created_at || '').toLocaleString()}
                        </p>

                        <p><b>Оплата:</b> {order.payment_method}</p>

                        {(order.items || []).map((i, idx) => (
                          <div key={idx}>
                            {i.title} × {i.quantity}
                          </div>
                        ))}

                        <button onClick={() => generateOrderPDF(order)}>
                          PDF чек
                        </button>

                        <button onClick={() => sendOrderEmail(order)}>
                          Email отчет
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default HistoryMonitor