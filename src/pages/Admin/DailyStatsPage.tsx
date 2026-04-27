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

type FilterStatus = 'all' | 'new' | 'preparing' | 'ready'

function DailyStatsPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

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

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return dayOrders
    return dayOrders.filter(order => order.status === activeFilter)
  }, [dayOrders, activeFilter])

  const stats = useMemo(() => getOverviewStats(dayOrders), [dayOrders])
  const topItems = useMemo(() => getTopItems(dayOrders, 10), [dayOrders])

  const filterTitle = {
    all: 'Все заказы',
    new: 'Новые заказы',
    preparing: 'Готовятся',
    ready: 'Готовые',
  }[activeFilter]

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
            <button
              type='button'
              className={activeFilter === 'all' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveFilter('all')}
            >
              <span>Заказов</span>
              <strong>{stats.totalOrders}</strong>
            </button>

            <button
              type='button'
              className={activeFilter === 'new' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveFilter('new')}
            >
              <span>Новые</span>
              <strong>{stats.newCount}</strong>
            </button>

            <button
              type='button'
              className={activeFilter === 'preparing' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveFilter('preparing')}
            >
              <span>Готовятся</span>
              <strong>{stats.preparingCount}</strong>
            </button>

            <button
              type='button'
              className={activeFilter === 'ready' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveFilter('ready')}
            >
              <span>Готовы</span>
              <strong>{stats.readyCount}</strong>
            </button>

            <div className='admin-stat-card'>
              <span>Завершённые</span>
              <strong>{stats.completedCount}</strong>
            </div>

            <div className='admin-stat-card'>
              <span>Средний чек</span>
              <strong>{formatPrice(stats.averageCheck)}</strong>
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
                <h3>{filterTitle}</h3>
              </div>

              {filteredOrders.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>
                  Заказов нет
                </div>
              ) : (
                <div className='admin-history-list'>
                  {filteredOrders.map(order => (
                    <div key={order.id} className='admin-history-card'>
                      <div className='admin-history-card__head'>
                        <div>
                          <strong>Заказ №{getDailyOrderLabel(order)}</strong>
                          <span>
                            {new Date(order.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>

                        <div className='admin-history-card__meta'>
                          <span>
                            {order.status === 'new'
                              ? 'Новый'
                              : order.status === 'preparing'
                                ? 'Готовится'
                                : order.status === 'ready'
                                  ? 'Готов'
                                  : order.status}
                          </span>
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
                                Number(item.price || 0) * Number(item.quantity || 1)
                              )}
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
          </div>
        </>
      )}
    </div>
  )
}

export default DailyStatsPage