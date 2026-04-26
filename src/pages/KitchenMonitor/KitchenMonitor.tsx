import { useEffect, useMemo, useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderWorkflow } from '../../api/orders'
import { IMenuItem, IOrderRow } from '../../types/order'
import { getDailyOrderNumber } from '../../utils/orderNumber'
import './KitchenMonitor.scss'

const KitchenMonitor = () => {
  const { orders = [], loading, error } = useOrders()

  const audioUnlockedRef = useRef(false)
  const alertIntervalRef = useRef<number | null>(null)
  const prevNewIdsRef = useRef<string[]>([])

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }

    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (alertIntervalRef.current) {
        window.clearInterval(alertIntervalRef.current)
      }
    }
  }, [])

  const playKitchenAlert = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextClass) return
      if (!audioUnlockedRef.current) return

      const audioCtx = new AudioContextClass()
      const masterGain = audioCtx.createGain()

      masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
      masterGain.gain.exponentialRampToValueAtTime(
        0.18,
        audioCtx.currentTime + 0.03
      )
      masterGain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 1.25
      )
      masterGain.connect(audioCtx.destination)

      const notes = [
        { freq: 659.25, start: 0, duration: 0.28 },
        { freq: 783.99, start: 0.22, duration: 0.32 },
        { freq: 987.77, start: 0.48, duration: 0.42 },
      ]

      notes.forEach(note => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime + note.start)

        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + note.start)
        gain.gain.exponentialRampToValueAtTime(
          0.22,
          audioCtx.currentTime + note.start + 0.02
        )
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioCtx.currentTime + note.start + note.duration
        )

        osc.connect(gain)
        gain.connect(masterGain)

        osc.start(audioCtx.currentTime + note.start)
        osc.stop(audioCtx.currentTime + note.start + note.duration + 0.05)
      })

      setTimeout(() => {
        void audioCtx.close()
      }, 1400)
    } catch (e) {
      console.error('ALERT ERROR', e)
    }
  }

  const getDaySequence = (targetOrder: IOrderRow) => {
    if (targetOrder.daily_order_number) {
      return String(targetOrder.daily_order_number).padStart(3, '0')
    }

    return getDailyOrderNumber(targetOrder, orders || [])
  }

  const getKitchenItems = (order: IOrderRow): IMenuItem[] => {
    return (order.items || []).filter(
      item => item.categories?.type !== 'assembly'
    )
  }

  const getAssemblyItems = (order: IOrderRow): IMenuItem[] => {
    return (order.items || []).filter(
      item => item.categories?.type === 'assembly'
    )
  }

  const kitchenRelevantOrders = useMemo(() => {
    return (orders || [])
      .filter(order => {
        const items = Array.isArray(order.items) ? order.items : []
        const hasKitchen = items.some(
          item => item.categories?.type !== 'assembly'
        )

        if (!hasKitchen) return false

        if (order.source === 'client' && order.status === 'pending') {
          return false
        }

        return (
          order.kitchen_status === 'new' ||
          order.kitchen_status === 'preparing' ||
          order.kitchen_status === 'ready'
        )
      })
      .sort((a, b) => {
        const priorityMap: Record<string, number> = {
          new: 3,
          preparing: 2,
          ready: 1,
        }

        const aPriority = priorityMap[a.kitchen_status || ''] || 0
        const bPriority = priorityMap[b.kitchen_status || ''] || 0

        if (aPriority !== bPriority) return bPriority - aPriority

        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })
  }, [orders])

  const newOrders = useMemo(
    () => kitchenRelevantOrders.filter(order => order.kitchen_status === 'new'),
    [kitchenRelevantOrders]
  )

  const preparingOrders = useMemo(
    () =>
      kitchenRelevantOrders.filter(
        order => order.kitchen_status === 'preparing'
      ),
    [kitchenRelevantOrders]
  )

  const readyOrders = useMemo(
    () => kitchenRelevantOrders.filter(order => order.kitchen_status === 'ready'),
    [kitchenRelevantOrders]
  )

  useEffect(() => {
    const currentNewIds = newOrders.map(order => order.id)
    const hasNewOrders = currentNewIds.length > 0

    const arrivedNewOrders = currentNewIds.some(
      id => !prevNewIdsRef.current.includes(id)
    )

    if (arrivedNewOrders) {
      playKitchenAlert()
    }

    if (hasNewOrders && !alertIntervalRef.current) {
      alertIntervalRef.current = window.setInterval(() => {
        playKitchenAlert()
      }, 6000)
    }

    if (!hasNewOrders && alertIntervalRef.current) {
      window.clearInterval(alertIntervalRef.current)
      alertIntervalRef.current = null
    }

    prevNewIdsRef.current = currentNewIds
  }, [newOrders])

  const formatOrderTime = (createdAt?: string) => {
    if (!createdAt) return '--:--'

    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return '--:--'

    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getKitchenStatusLabel = (order: IOrderRow) => {
    if (order.kitchen_status === 'ready') return 'Готово'
    if (order.kitchen_status === 'preparing') return 'Готовится'
    return 'Ожидает принятия'
  }

  const getAssemblyFlowLabel = (order: IOrderRow) => {
    const hasAssembly = getAssemblyItems(order).length > 0

    if (!hasAssembly) return 'Сборка не требуется'
    if (order.kitchen_status === 'ready') return 'Передано в сборку'
    if (order.kitchen_status === 'preparing') return 'Ожидает кухню'
    return 'Появится после готовности кухни'
  }

  const handleKitchenStart = async (order: IOrderRow) => {
    try {
      await updateOrderWorkflow(order.id, {
        kitchen_status: 'preparing',
        status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка принятия кухни:', err)
      alert('Не удалось принять заказ')
    }
  }

  const handleKitchenReady = async (order: IOrderRow) => {
    try {
      const hasAssembly = getAssemblyItems(order).length > 0

      await updateOrderWorkflow(order.id, {
        kitchen_status: 'ready',
        assembly_status: hasAssembly ? 'new' : 'skipped',
        status: hasAssembly ? 'preparing' : 'ready',
      })
    } catch (err) {
      console.error('Ошибка завершения кухни:', err)
      alert('Не удалось отметить кухню как готовую')
    }
  }

  const renderOrderCard = (order: IOrderRow) => {
    const kitchenItems = getKitchenItems(order)
    const hasAssembly = getAssemblyItems(order).length > 0

    const isNewKitchenOrder = order.kitchen_status === 'new'
    const isPreparingKitchenOrder = order.kitchen_status === 'preparing'
    const isReadyKitchenOrder = order.kitchen_status === 'ready'

    return (
      <article
        className={`kitchen-order-card ${
          isNewKitchenOrder ? 'is-new' : ''
        } ${isPreparingKitchenOrder ? 'is-preparing' : ''} ${
          isReadyKitchenOrder ? 'is-ready' : ''
        }`}
        key={order.id}
      >
        <div className='kitchen-order-card__top'>
          <div>
            <span className='kitchen-order-card__small'>Заказ</span>
            <h2>№{getDaySequence(order)}</h2>
            <p>Время: {formatOrderTime(order.created_at)}</p>
          </div>

          <div className='kitchen-badges'>
            {isNewKitchenOrder && <span className='kitchen-badge new'>Новый</span>}
            {isPreparingKitchenOrder && (
              <span className='kitchen-badge preparing'>Готовится</span>
            )}
            {isReadyKitchenOrder && (
              <span className='kitchen-badge ready'>Готово</span>
            )}
            {hasAssembly && (
              <span className='kitchen-badge assembly'>Сборка</span>
            )}
          </div>
        </div>

        <div className='kitchen-meta-grid'>
          <div>
            <span>Статус кухни</span>
            <strong>{getKitchenStatusLabel(order)}</strong>
          </div>

          <div>
            <span>Далее</span>
            <strong>{getAssemblyFlowLabel(order)}</strong>
          </div>
        </div>

        <div className='kitchen-items-box'>
          <div className='kitchen-items-box__title'>Позиции кухни</div>

          <div className='kitchen-items-list'>
            {kitchenItems.map((item, index) => (
              <div
                key={`${order.id}-k-${item.id}-${index}`}
                className={`kitchen-item-line ${
                  isReadyKitchenOrder ? 'done' : ''
                }`}
              >
                <span>{item.title}</span>
                <strong>x{item.quantity || 1}</strong>
              </div>
            ))}
          </div>
        </div>

        {order.comment && <div className='kitchen-comment'>💬 {order.comment}</div>}

        <div className='kitchen-actions'>
          {isNewKitchenOrder && (
            <button
              type='button'
              className='kitchen-btn kitchen-btn--primary'
              onClick={() => handleKitchenStart(order)}
            >
              Принять
            </button>
          )}

          {isPreparingKitchenOrder && (
            <button
              type='button'
              className='kitchen-btn kitchen-btn--success'
              onClick={() => handleKitchenReady(order)}
            >
              Готово
            </button>
          )}

          {isReadyKitchenOrder && (
            <button type='button' className='kitchen-btn kitchen-btn--ready' disabled>
              Кухня завершила
            </button>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className='kitchen-monitor-page'>
      <header className='kitchen-header'>
        <div className='kitchen-brand'>
          <div className='kitchen-logo'>🌯</div>
          <div>
            <h1>Монитор кухни</h1>
            <p>БУРРИТОС • Мексиканская кухня</p>
          </div>
        </div>

        <div className='kitchen-header-stats'>
          <div>
            <span>Новые</span>
            <strong>{newOrders.length}</strong>
          </div>

          <div>
            <span>В работе</span>
            <strong>{preparingOrders.length}</strong>
          </div>

          <div>
            <span>Готово</span>
            <strong>{readyOrders.length}</strong>
          </div>
        </div>
      </header>

      {error && <div className='kitchen-error'>{error}</div>}

      <main className='kitchen-columns'>
        <section className='kitchen-column'>
          <div className='kitchen-column-title new'>
            <h3>Новые</h3>
            <span>{newOrders.length}</span>
          </div>

          <div className='kitchen-orders-stack'>
            {loading ? (
              <div className='kitchen-empty'>Загрузка...</div>
            ) : newOrders.length === 0 ? (
              <div className='kitchen-empty'>Новых заказов нет</div>
            ) : (
              newOrders.map(renderOrderCard)
            )}
          </div>
        </section>

        <section className='kitchen-column'>
          <div className='kitchen-column-title preparing'>
            <h3>Готовятся</h3>
            <span>{preparingOrders.length}</span>
          </div>

          <div className='kitchen-orders-stack'>
            {loading ? (
              <div className='kitchen-empty'>Загрузка...</div>
            ) : preparingOrders.length === 0 ? (
              <div className='kitchen-empty'>Заказов в работе нет</div>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>
        </section>

        <section className='kitchen-column'>
          <div className='kitchen-column-title ready'>
            <h3>Готово</h3>
            <span>{readyOrders.length}</span>
          </div>

          <div className='kitchen-orders-stack'>
            {loading ? (
              <div className='kitchen-empty'>Загрузка...</div>
            ) : readyOrders.length === 0 ? (
              <div className='kitchen-empty'>Готовых заказов нет</div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default KitchenMonitor