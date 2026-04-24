import { useEffect, useMemo, useState } from 'react'
import { fetchArchivedOrdersByDateRange } from '../../api/orders'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  buildWeeklyChartData,
  getOverviewStats,
  groupOrdersByDay,
} from '../../utils/orderStats'
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

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7

  const start = new Date(now)
  start.setDate(now.getDate() - day + 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
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

        const { startDate, endDate } = getWeekRange()
        const data = await fetchArchivedOrdersByDateRange(startDate, endDate)

        if (!active) return
        setOrders(data || [])
      } catch (e: any) {
        if (!active) return
        setError(e?.message || 'Не удалось загрузить недельную статистику')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => getOverviewStats(orders), [orders])
  const groupedDays = useMemo(() => groupOrdersByDay(orders), [orders])
  const chartData = useMemo(() => buildWeeklyChartData(orders), [orders])

  return (
    <div className='admin-stats-page'>
      <div className='admin-stats-header'>
        <div>
          <span className='admin-stats-badge'>Статистика</span>
          <h1>Недельная статистика</h1>
          <p>Данные берутся только из архива за текущую неделю.</p>
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
              <div className='admin-stats-panel__head'>
                <h3>Количество заказов по дням</h3>
              </div>

              <div className='admin-chart-box'>
                <ResponsiveContainer width='100%' height={320}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='name' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='Заказы' />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className='admin-stats-panel'>
              <div className='admin-stats-panel__head'>
                <h3>Суммы по дням</h3>
              </div>

              <div className='admin-chart-box'>
                <ResponsiveContainer width='100%' height={320}>
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
              </div>
            </section>
          </div>

          <section className='admin-stats-panel'>
            <div className='admin-stats-panel__head'>
              <h3>Разбивка по дням недели</h3>
            </div>

            {groupedDays.length === 0 ? (
              <div className='admin-stats-empty admin-stats-empty--small'>
                Нет данных
              </div>
            ) : (
              <div className='admin-days-list'>
                {groupedDays.map(day => (
                  <div key={day.dateKey} className='admin-day-row'>
                    <div>
                      <strong>{day.dateLabel}</strong>
                      <span>{day.totalOrders} заказов</span>
                    </div>

                    <div className='admin-day-row__stats'>
                      <span>Онлайн: {formatPrice(day.onlineAmount)}</span>
                      <span>Наличные: {formatPrice(day.cashAmount)}</span>
                      <b>{formatPrice(day.totalAmount)}</b>
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

export default WeeklyStatsPage