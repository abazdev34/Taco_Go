import { useEffect, useMemo, useState } from 'react'
import { fetchArchivedOrdersByDateRange } from '../../api/orders'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './AdminStatsPages.scss'

const START_DATE = '2000-01-01T00:00:00.000Z'
const END_DATE = '2100-01-01T00:00:00.000Z'

const getPayMethod = (order: any) => {
  return order.payment_method || order.paymentMethod || 'cash'
}

const getOrderDate = (order: any) => {
  return order.created_at || order.archived_at || order.paid_at || order.updated_at
}

const getDayKey = (date: string) => {
  return new Date(date).toISOString().slice(0, 10)
}

const getDayLabel = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function WeeklyStatsPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchArchivedOrdersByDateRange(START_DATE, END_DATE)

        console.log('ARCHIVE DATA:', data)

        if (!active) return
        setOrders(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Не удалось загрузить статистику')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    return orders.reduce(
      (acc, order: any) => {
        const total = Number(order.total || 0)
        const method = getPayMethod(order)

        acc.totalOrders += 1
        acc.totalAmount += total

        if (method === 'online') {
          acc.onlineAmount += total
        } else {
          acc.cashAmount += total
        }

        return acc
      },
      {
        totalOrders: 0,
        totalAmount: 0,
        onlineAmount: 0,
        cashAmount: 0,
      }
    )
  }, [orders])

  const groupedDays = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string
        dateLabel: string
        totalOrders: number
        totalAmount: number
        onlineAmount: number
        cashAmount: number
      }
    >()

    orders.forEach((order: any) => {
      const date = getOrderDate(order)
      if (!date) return

      const key = getDayKey(date)
      const total = Number(order.total || 0)
      const method = getPayMethod(order)

      if (!map.has(key)) {
        map.set(key, {
          dateKey: key,
          dateLabel: getDayLabel(date),
          totalOrders: 0,
          totalAmount: 0,
          onlineAmount: 0,
          cashAmount: 0,
        })
      }

      const current = map.get(key)!
      current.totalOrders += 1
      current.totalAmount += total

      if (method === 'online') {
        current.onlineAmount += total
      } else {
        current.cashAmount += total
      }
    })

    return Array.from(map.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    )
  }, [orders])

  const chartData = useMemo(() => {
    return groupedDays.map(day => ({
      name: day.dateLabel,
      Заказы: day.totalOrders,
      Сумма: day.totalAmount,
      Онлайн: day.onlineAmount,
      Наличные: day.cashAmount,
    }))
  }, [groupedDays])

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>Статистика</span>
          <h1>Недельная статистика</h1>
          <p>Данные из архива заказов</p>
        </div>
      </div>

      {loading ? (
        <div className='admin-stats-empty'>Загрузка...</div>
      ) : error ? (
        <div className='admin-stats-empty'>{error}</div>
      ) : orders.length === 0 ? (
        <div className='admin-stats-empty'>
          Архив пуст или нет доступа к orders_archive
        </div>
      ) : (
        <>
          <div className='admin-stats-cards'>
            <div className='admin-stat-card'>
              <span>Заказов</span>
              <strong>{stats.totalOrders}</strong>
            </div>

            <div className='admin-stat-card'>
              <span>Сумма</span>
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
              <h3>Заказы по дням</h3>

              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey='Заказы' />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className='admin-stats-panel'>
              <h3>Суммы</h3>

              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type='monotone' dataKey='Сумма' strokeWidth={2} />
                  <Line type='monotone' dataKey='Онлайн' strokeWidth={2} />
                  <Line type='monotone' dataKey='Наличные' strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>

          <section className='admin-stats-panel'>
            <h3>По дням</h3>

            <div className='admin-days-list'>
              {groupedDays.map(day => (
                <div key={day.dateKey} className='admin-day-row'>
                  <div>
                    <strong>{day.dateLabel}</strong>
                    <span>{day.totalOrders} заказов</span>
                  </div>

                  <div>
                    Онлайн: {formatPrice(day.onlineAmount)} | Наличные:{' '}
                    {formatPrice(day.cashAmount)} |{' '}
                    <b>{formatPrice(day.totalAmount)}</b>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default WeeklyStatsPage