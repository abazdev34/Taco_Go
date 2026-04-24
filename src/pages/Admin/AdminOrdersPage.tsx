import { useMemo } from 'react'
import { fetchOrders } from '../../api/orders'
import { useEffect, useState } from 'react'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  getDailyOrderLabel,
  getOverviewStats,
  getTopItems,
  groupOrdersByDay,
} from '../../utils/orderStats'
import './AdminStatsPages.scss'

function AdminOrdersPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await fetchOrders()
        setOrders(data || [])
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить заказы')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const todayOrders = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    return orders.filter(order => {
      const createdAt = new Date(order.created_at)
      return createdAt >= start && createdAt <= end
    })
  }, [orders])

  const stats = useMemo(() => getOverviewStats(todayOrders), [todayOrders])
  const topItems = useMemo(() => getTopItems(todayOrders, 6), [todayOrders])
  const groupedDays = useMemo(() => groupOrdersByDay(todayOrders), [todayOrders])

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>Главная панель</span>
          <h1>Сводка за сегодня</h1>
          <p>Текущая статистика заказов, оплаты и популярных блюд.</p>
        </div>
      </div>

      {loading ? (
        <div className='admin-stats-empty'>Загрузка...</div>
      ) : error ? (
        <div className='admin-stats-empty'>{error}</div>
      ) : (
        <>
          <div className='admin-stats-cards'>
            <div className='admin-stat-card'>
              <span>Новые</span>
              <strong>{stats.newCount}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Готовятся</span>
              <strong>{stats.preparingCount}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Готовы</span>
              <strong>{stats.readyCount}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Завершённые</span>
              <strong>{stats.completedCount}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Всего заказов</span>
              <strong>{stats.totalOrders}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Сумма за день</span>
              <strong>{formatPrice(stats.totalAmount)}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Онлайн</span>
              <strong>{formatPrice(stats.onlineAmount)}</strong>
            </div>
            <div className='admin-stat-card'>
              <span>Наличные</span>
              <strong>{formatPrice(stats.cashAmount)}</strong>
            </div>
          </div>

          <div className='admin-stats-grid'>
            <section className='admin-stats-panel'>
              <div className='admin-stats-panel__head'>
                <h3>Популярные блюда за сегодня</h3>
              </div>

              {topItems.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>
                  Нет данных
                </div>
              ) : (
                <div className='admin-top-items'>
                  {topItems.map(item => (
                    <div key={item.id} className='admin-top-item'>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.quantity} шт.</span>
                      </div>
                      <b>{formatPrice(item.revenue)}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className='admin-stats-panel'>
              <div className='admin-stats-panel__head'>
                <h3>Заказы за сегодня</h3>
              </div>

              {groupedDays.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>
                  Сегодня заказов нет
                </div>
              ) : (
                <div className='admin-orders-list'>
                  {groupedDays[0].orders.map(order => (
                    <div key={order.id} className='admin-order-row'>
                      <div>
                        <strong>Заказ №{getDailyOrderLabel(order)}</strong>
                        <span>
                          {new Date(order.created_at).toLocaleTimeString('ru-RU')}
                        </span>
                      </div>
                      <div className='admin-order-row__right'>
                        <span>{order.payment_method === 'online' ? 'Онлайн' : 'Наличные'}</span>
                        <b>{formatPrice(Number(order.total || 0))}</b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminOrdersPage