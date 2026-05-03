import { useEffect, useMemo, useRef } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderWorkflow } from '../../api/orders'
import { IMenuItem, IOrderRow } from '../../types/order'
import { getDailyOrderNumber } from '../../utils/orderNumber'
import './KitchenMonitor.scss'

const KitchenMonitor = () => {
  const { orders = [], loading, error } = useOrders()

  const audioUnlockedRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const alertIntervalRef = useRef<number | null>(null)
  const prevNewIdsRef = useRef<string[]>([])

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext

        if (!AudioContextClass) return

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass()
        }

        if (audioCtxRef.current.state === 'suspended') {
          void audioCtxRef.current.resume()
        }

        audioUnlockedRef.current = true

        window.removeEventListener('click', unlockAudio)
        window.removeEventListener('touchstart', unlockAudio)
        window.removeEventListener('keydown', unlockAudio)
      } catch (e) {
        console.error('AUDIO UNLOCK ERROR', e)
      }
    }

    window.addEventListener('click', unlockAudio)
    window.addEventListener('touchstart', unlockAudio)
    window.addEventListener('keydown', unlockAudio)

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)

      if (audioCtxRef.current) {
        void audioCtxRef.current.close()
        audioCtxRef.current = null
      }
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
      if (!audioUnlockedRef.current) return

      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextClass) return

      const audioCtx = audioCtxRef.current || new AudioContextClass()
      audioCtxRef.current = audioCtx

      if (audioCtx.state === 'suspended') {
        void audioCtx.resume()
      }

      const now = audioCtx.currentTime
      const masterGain = audioCtx.createGain()

      masterGain.gain.setValueAtTime(0.0001, now)
      masterGain.gain.exponentialRampToValueAtTime(0.12, now + 0.04)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15)
      masterGain.connect(audioCtx.destination)

      const notes = [
        { freq: 523.25, start: 0, duration: 0.18 },
        { freq: 659.25, start: 0.18, duration: 0.18 },
        { freq: 783.99, start: 0.36, duration: 0.28 },
      ]

      notes.forEach((note) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(note.freq, now + note.start)

        gain.gain.setValueAtTime(0.0001, now + note.start)
        gain.gain.exponentialRampToValueAtTime(0.18, now + note.start + 0.02)
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + note.start + note.duration,
        )

        osc.connect(gain)
        gain.connect(masterGain)

        osc.start(now + note.start)
        osc.stop(now + note.start + note.duration + 0.04)
      })
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

  const getRawItem = (item: IMenuItem) => {
    const raw = item as any
    return raw.menu_item || raw.menuItem || raw.product || raw.item || raw
  }

  const getCategoryType = (item: IMenuItem) => {
    const raw = item as any
    const realItem = getRawItem(item)

    return (
      realItem.categories?.type ||
      realItem.category?.type ||
      raw.categories?.type ||
      raw.category?.type ||
      null
    )
  }

  const getItemTitle = (item: IMenuItem) => {
    const raw = item as any
    const realItem = getRawItem(item)

    return String(
      realItem.title ||
        realItem.name ||
        raw.title ||
        raw.name ||
        'Без названия',
    )
  }

  const getOrderItemQty = (item: IMenuItem) => {
    const raw = item as any
    const realItem = getRawItem(item)

    const qty = Number(
      raw.order_quantity ||
        raw.quantity ||
        raw.qty ||
        raw.cart_quantity ||
        realItem.order_quantity ||
        realItem.quantity ||
        realItem.qty ||
        1,
    )

    return Number.isFinite(qty) && qty > 0 ? qty : 1
  }

  const getKitchenItems = (order: IOrderRow): IMenuItem[] => {
    return (order.items || []).filter(
      (item) => getCategoryType(item) !== 'assembly',
    )
  }

  const kitchenRelevantOrders = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        const items = Array.isArray(order.items) ? order.items : []
        const hasKitchen = items.some(
          (item) => getCategoryType(item) !== 'assembly',
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
    () => kitchenRelevantOrders.filter((order) => order.kitchen_status === 'new'),
    [kitchenRelevantOrders],
  )

  const preparingOrders = useMemo(
    () =>
      kitchenRelevantOrders.filter(
        (order) => order.kitchen_status === 'preparing',
      ),
    [kitchenRelevantOrders],
  )

  const readyOrders = useMemo(
    () =>
      kitchenRelevantOrders.filter((order) => order.kitchen_status === 'ready'),
    [kitchenRelevantOrders],
  )

  useEffect(() => {
    const currentNewIds = newOrders.map((order) => order.id)
    const hasNewOrders = currentNewIds.length > 0

    const arrivedNewOrders = currentNewIds.some(
      (id) => !prevNewIdsRef.current.includes(id),
    )

    if (arrivedNewOrders) {
      playKitchenAlert()
    }

    if (hasNewOrders && !alertIntervalRef.current) {
      alertIntervalRef.current = window.setInterval(() => {
        playKitchenAlert()
      }, 8000)
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

  const getNextFlowLabel = (order: IOrderRow) => {
    if (order.kitchen_status === 'ready') return 'Передано в сборку'
    if (order.kitchen_status === 'preparing') return 'После кухни — сборка'
    return 'После принятия — кухня'
  }

  const handleKitchenStart = async (order: IOrderRow) => {
    try {
      await updateOrderWorkflow(order.id, {
        kitchen_status: 'preparing',
        assembly_status: 'waiting',
        status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка принятия кухни:', err)
      alert('Не удалось принять заказ')
    }
  }

  const handleKitchenReady = async (order: IOrderRow) => {
    try {
      await updateOrderWorkflow(order.id, {
        kitchen_status: 'ready',
        assembly_status: 'new',
        status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка завершения кухни:', err)
      alert('Не удалось отметить кухню как готовую')
    }
  }

  const renderOrderCard = (order: IOrderRow) => {
    const kitchenItems = getKitchenItems(order)

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
            <span className='kitchen-badge assembly'>Сборка после кухни</span>
          </div>
        </div>

        <div className='kitchen-meta-grid'>
          <div>
            <span>Статус кухни</span>
            <strong>{getKitchenStatusLabel(order)}</strong>
          </div>

          <div>
            <span>Далее</span>
            <strong>{getNextFlowLabel(order)}</strong>
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
                <span>{getItemTitle(item)}</span>
                <strong>x{getOrderItemQty(item)}</strong>
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
              Передано в сборку
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
            <span>Передано</span>
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
            <h3>Передано в сборку</h3>
            <span>{readyOrders.length}</span>
          </div>

          <div className='kitchen-orders-stack'>
            {loading ? (
              <div className='kitchen-empty'>Загрузка...</div>
            ) : readyOrders.length === 0 ? (
              <div className='kitchen-empty'>Переданных заказов нет</div>
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