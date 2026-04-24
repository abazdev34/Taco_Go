import { useEffect, useMemo, useState } from 'react'
import { fetchOrders } from '../../api/orders'
import { IMenuItem, IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  getDailyOrderLabel,
  getOverviewStats,
  getTopItems,
} from '../../utils/orderStats'
import './AdminStatsPages.scss'

function DailyStatsPage() {
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
        setError(e?.message || 'Не удалось загрузить статистику')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const dayOrders = useMemo(() => {
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

  const stats = useMemo(() => getOverviewStats(dayOrders), [dayOrders])
  const topItems = useMemo(() => getTopItems(dayOrders, 10), [dayOrders])

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>Статистика</span>
          <h1>Дневная статистика</h1>
          <p>Подробная информация по заказам за текущий день.</p>
        </div>
      </div>

      {loading ? (
        <div className='admin-stats-empty'>Загрузка...</div>
      ) : error ? (
        <div className='admin-stats-empty'>{error}</div>
      ) : (
        <>
          <div className='admin-stats-cards'>
            <div className='admin-stat-card'><span>Заказов</span><strong>{stats.totalOrders}</strong></div>
            <div className='admin-stat-card'><span>Новые</span><strong>{stats.newCount}</strong></div>
            <div className='admin-stat-card'><span>Готовятся</span><strong>{stats.preparingCount}</strong></div>
            <div className='admin-stat-card'><span>Готовы</span><strong>{stats.readyCount}</strong></div>
            <div className='admin-stat-card'><span>Завершённые</span><strong>{stats.completedCount}</strong></div>
            <div className='admin-stat-card'><span>Средний чек</span><strong>{formatPrice(stats.averageCheck)}</strong></div>
            <div className='admin-stat-card'><span>Онлайн</span><strong>{formatPrice(stats.onlineAmount)}</strong></div>
            <div className='admin-stat-card'><span>Наличные</span><strong>{formatPrice(stats.cashAmount)}</strong></div>
          </div>

          <div className='admin-stats-grid'>
            <section className='admin-stats-panel'>
              <div className='admin-stats-panel__head'>
                <h3>Заказы за день</h3>
              </div>

              {dayOrders.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>Нет заказов</div>
              ) : (
                <div className='admin-history-list'>
                  {dayOrders.map(order => (
                    <div key={order.id} className='admin-history-card'>
                      <div className='admin-history-card__head'>
                        <div>
                          <strong>Заказ №{getDailyOrderLabel(order)}</strong>
                          <span>
                            {new Date(order.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>

                        <div className='admin-history-card__meta'>
                          <span>{order.payment_method === 'online' ? 'Онлайн' : 'Наличные'}</span>
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
                              {formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className='admin-stats-panel'>
              <div className='admin-stats-panel__head'>
                <h3>Блюда за день</h3>
              </div>

              {topItems.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>Нет данных</div>
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
          </div>
        </>
      )}
    </div>
  )
}

export default DailyStatsPage