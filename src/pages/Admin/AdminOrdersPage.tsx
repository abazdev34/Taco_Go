import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchOrders } from '../../api/orders'
import { useCashMovements } from '../../hooks/useCashMovements'
import { IMenuItem, IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import { getDailyOrderLabel, getOverviewStats } from '../../utils/orderStats'

import './AdminStatsPages.scss'

type DetailFilter = 'all' | 'new' | 'preparing' | 'ready' | 'cash' | 'online' | 'cashPay'

const getCashboxFromMovements = (movements: any[]) => {
  const approved = (movements || []).filter(item => item.status === 'approved')

  const totalIn = approved
    .filter(item => item.movement_type === 'in')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const totalOut = approved
    .filter(item => item.movement_type === 'out')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
  }
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'new':
      return 'Новый'
    case 'preparing':
      return 'Готовится'
    case 'ready':
      return 'Готов'
    case 'completed':
      return 'Завершён'
    case 'cancelled':
      return 'Отменён'
    default:
      return status || '—'
  }
}

function AdminOrdersPage() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeDetail, setActiveDetail] = useState<DetailFilter>('all')

  const { movements } = useCashMovements()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchOrders()
        setOrders(data || [])
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить данные')
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

  const cashbox = useMemo(() => {
    return getCashboxFromMovements(movements || [])
  }, [movements])

  const detailTitle = {
    all: 'Все заказы за сегодня',
    new: 'Новые заказы',
    preparing: 'Заказы в приготовлении',
    ready: 'Готовые заказы',
    cash: 'Движение кассы',
    online: 'Онлайн оплаты за сегодня',
    cashPay: 'Наличные оплаты за сегодня',
  }[activeDetail]

  const detailOrders = useMemo(() => {
    if (activeDetail === 'all') return dayOrders
    if (activeDetail === 'new') return dayOrders.filter(order => order.status === 'new')
    if (activeDetail === 'preparing') {
      return dayOrders.filter(order => order.status === 'preparing')
    }
    if (activeDetail === 'ready') return dayOrders.filter(order => order.status === 'ready')
    if (activeDetail === 'online') {
      return dayOrders.filter(order => order.payment_method === 'online')
    }
    if (activeDetail === 'cashPay') {
      return dayOrders.filter(order => order.payment_method === 'cash')
    }

    return []
  }, [dayOrders, activeDetail])

  const todayMovements = useMemo(() => {
    const now = new Date()

    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const end = new Date(now)
    end.setHours(23, 59, 59, 999)

    return (movements || []).filter(item => {
      const rawDate = item.created_at || item.updated_at
      const time = rawDate ? new Date(rawDate).getTime() : 0

      return time >= start.getTime() && time <= end.getTime()
    })
  }, [movements])

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>Панель управления</span>
          <h1>Главная</h1>
          <p>Быстрый переход к рабочим экранам и подробная статистика за сегодня.</p>
        </div>
      </div>

      <div className='admin-stats-cards'>
        <button type='button' className='admin-stat-card' onClick={() => navigate('/kitchen')}>
          <span>Монитор кухни</span>
          <strong>👨‍🍳 Кухня</strong>
        </button>

        <button type='button' className='admin-stat-card' onClick={() => navigate('/cashier')}>
          <span>Рабочее место кассира</span>
          <strong>🧾 Касса</strong>
        </button>

        <button type='button' className='admin-stat-card' onClick={() => navigate('/monitor')}>
          <span>Экран для зала</span>
          <strong>📺 Зал монитор</strong>
        </button>

        <button type='button' className='admin-stat-card' onClick={() => navigate('/assembly')}>
          <span>Сборка заказов</span>
          <strong>📦 Сборка</strong>
        </button>
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
              className={activeDetail === 'all' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveDetail('all')}
            >
              <span>Заказов сегодня</span>
              <strong>{stats.totalOrders}</strong>
            </button>

            <button
              type='button'
              className={activeDetail === 'new' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveDetail('new')}
            >
              <span>Новые</span>
              <strong>{stats.newCount}</strong>
            </button>

            <button
              type='button'
              className={
                activeDetail === 'preparing' ? 'admin-stat-card active' : 'admin-stat-card'
              }
              onClick={() => setActiveDetail('preparing')}
            >
              <span>Готовятся</span>
              <strong>{stats.preparingCount}</strong>
            </button>

            <button
              type='button'
              className={activeDetail === 'ready' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveDetail('ready')}
            >
              <span>Готовы</span>
              <strong>{stats.readyCount}</strong>
            </button>

            <button
              type='button'
              className={
                activeDetail === 'cash'
                  ? 'admin-stat-card admin-stat-card--cashbox active'
                  : 'admin-stat-card admin-stat-card--cashbox'
              }
              onClick={() => setActiveDetail('cash')}
            >
              <span>Сейчас в кассе</span>
              <strong>{formatPrice(cashbox.balance)}</strong>
            </button>

            <div className='admin-stat-card'>
              <span>Средний чек</span>
              <strong>{formatPrice(stats.averageCheck)}</strong>
            </div>

            <button
              type='button'
              className={activeDetail === 'online' ? 'admin-stat-card active' : 'admin-stat-card'}
              onClick={() => setActiveDetail('online')}
            >
              <span>Онлайн сегодня</span>
              <strong>{formatPrice(stats.onlineAmount)}</strong>
            </button>

            <button
              type='button'
              className={
                activeDetail === 'cashPay' ? 'admin-stat-card active' : 'admin-stat-card'
              }
              onClick={() => setActiveDetail('cashPay')}
            >
              <span>Наличные сегодня</span>
              <strong>{formatPrice(stats.cashAmount)}</strong>
            </button>
          </div>

          <section className='admin-stats-panel'>
            <div className='admin-stats-panel__head'>
              <h3>{detailTitle}</h3>
            </div>

            {activeDetail === 'cash' ? (
              todayMovements.length === 0 ? (
                <div className='admin-stats-empty admin-stats-empty--small'>
                  Движений кассы сегодня нет
                </div>
              ) : (
                <div className='admin-top-items'>
                  {todayMovements.map((item: any) => (
                    <div key={item.id} className='admin-top-item'>
                      <div>
                        <strong>{item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}</strong>
                        <span>
                          {new Date(item.created_at || item.updated_at).toLocaleString('ru-RU')}
                        </span>
                      </div>

                      <b>{formatPrice(Number(item.amount || 0))}</b>
                    </div>
                  ))}
                </div>
              )
            ) : detailOrders.length === 0 ? (
              <div className='admin-stats-empty admin-stats-empty--small'>
                Данных нет
              </div>
            ) : (
              <div className='admin-history-list'>
                {detailOrders.map(order => (
                  <div key={order.id} className='admin-history-card'>
                    <div className='admin-history-card__head'>
                      <div>
                        <strong>Заказ №{getDailyOrderLabel(order)}</strong>
                        <span>{new Date(order.created_at).toLocaleString('ru-RU')}</span>
                      </div>

                      <div className='admin-history-card__meta'>
                        <span>{getStatusLabel(order.status)}</span>
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
        </>
      )}
    </div>
  )
}

export default AdminOrdersPage