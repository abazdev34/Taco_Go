import { useEffect, useMemo, useRef, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrders } from '../../hooks/useOrders'
import { IOrderRow } from '../../types/order'
import {
  buildDailyNumberOrders,
  getDailyOrderNumber,
} from '../../utils/orderNumber'
import {
  canShowInHallMonitor,
  getOrderPlaceValue,
} from '../../utils/orderHelpers'

const uniqueOrdersById = <T extends { id: string }>(orders: T[]) => {
  const map = new Map<string, T>()

  orders.forEach((order) => {
    map.set(order.id, order)
  })

  return Array.from(map.values())
}

const HallMonitor = () => {
  const { orders, loading, error } = useOrders() as {
    orders?: IOrderRow[]
    loading: boolean
    error: string
  }

  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const prevReadyIdsRef = useRef<string[]>([])
  const audioUnlockedRef = useRef(false)

  const safeOrders = useMemo(() => {
    return Array.isArray(orders) ? uniqueOrdersById(orders) : []
  }, [orders])

  const numberingOrders = useMemo(() => {
    return buildDailyNumberOrders(safeOrders)
  }, [safeOrders])

  const getDisplayNumber = (order: IOrderRow) => {
    if (order.daily_order_number) {
      return String(order.daily_order_number).padStart(3, '0')
    }

    return getDailyOrderNumber(order, numberingOrders)
  }

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

  const readyOrders = useMemo(() => {
    return safeOrders
      .filter(
        (order) =>
          order.status === 'ready' && getOrderPlaceValue(order) === 'hall'
      )
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })
  }, [safeOrders])

  const preparingOrders = useMemo(() => {
    return safeOrders
      .filter((order) => canShowInHallMonitor(order) && order.status !== 'ready')
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })
  }, [safeOrders])

  const playReadySound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & {
          webkitAudioContext?: typeof AudioContext
        }).webkitAudioContext

      if (!AudioContextClass) return
      if (!audioUnlockedRef.current) return

      const audioCtx = new AudioContextClass()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
      oscillator.frequency.linearRampToValueAtTime(
        1046,
        audioCtx.currentTime + 0.16
      )
      oscillator.frequency.linearRampToValueAtTime(
        1318,
        audioCtx.currentTime + 0.32
      )

      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        audioCtx.currentTime + 0.02
      )
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.55
      )

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.6)

      oscillator.onended = () => {
        void audioCtx.close()
      }
    } catch (err) {
      console.error('Sound playback error:', err)
    }
  }

  useEffect(() => {
    const currentReadyIds = readyOrders.map((order) => order.id)
    const newReadyIds = currentReadyIds.filter(
      (id) => !prevReadyIdsRef.current.includes(id)
    )

    if (newReadyIds.length > 0) {
      setHighlightedIds((prev) => [...prev, ...newReadyIds])
      playReadySound()

      const timeout = window.setTimeout(() => {
        setHighlightedIds((prev) =>
          prev.filter((id) => !newReadyIds.includes(id))
        )
      }, 3200)

      prevReadyIdsRef.current = currentReadyIds
      return () => window.clearTimeout(timeout)
    }

    prevReadyIdsRef.current = currentReadyIds
  }, [readyOrders])

  const preparingLoopedOrders =
    preparingOrders.length > 10
      ? [...preparingOrders, ...preparingOrders]
      : preparingOrders

  const readyLoopedOrders =
    readyOrders.length > 10 ? [...readyOrders, ...readyOrders] : readyOrders

  return (
    <div className='hall-clean-tv'>
      {error && <div className='hall-clean-tv__error'>{error}</div>}

      <div className='hall-clean-tv__layout'>
        <section className='clean-column clean-column--preparing'>
          <div className='clean-column__head'>
            <h2>Готовится</h2>
            <span>{preparingOrders.length}</span>
          </div>

          <div className='clean-column__body'>
            {loading ? (
              <div className='clean-empty'>Загрузка...</div>
            ) : preparingOrders.length === 0 ? (
              <div className='clean-empty'>—</div>
            ) : (
              <div
                className={`clean-scroll ${
                  preparingOrders.length > 10 ? 'clean-scroll--animated' : ''
                }`}
              >
                <div className='clean-grid'>
                  {preparingLoopedOrders.map((order, index) => (
                    <div
                      className='clean-number clean-number--preparing'
                      key={`preparing-${order.id}-${index}`}
                    >
                      {getDisplayNumber(order)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className='clean-column clean-column--ready'>
          <div className='clean-column__head'>
            <h2>Готов</h2>
            <span>{readyOrders.length}</span>
          </div>

          <div className='clean-column__body'>
            {loading ? (
              <div className='clean-empty'>Загрузка...</div>
            ) : readyOrders.length === 0 ? (
              <div className='clean-empty'>—</div>
            ) : (
              <div
                className={`clean-scroll ${
                  readyOrders.length > 10 ? 'clean-scroll--animated' : ''
                }`}
              >
                <div className='clean-grid'>
                  {readyLoopedOrders.map((order, index) => (
                    <div
                      className={`clean-number clean-number--ready ${
                        highlightedIds.includes(order.id)
                          ? 'clean-number--pop'
                          : ''
                      }`}
                      key={`ready-${order.id}-${index}`}
                    >
                      {getDisplayNumber(order)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default HallMonitor