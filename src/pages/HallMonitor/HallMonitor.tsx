import { useEffect, useMemo, useRef, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrders } from '../../hooks/useOrders'

type OrderStatus = 'new' | 'preparing' | 'ready' | string

type Order = {
  id: string
  order_number: number
  status: OrderStatus
  created_at?: string
  order_place?: 'hall' | 'takeaway' | string | null
  order_type?: 'hall' | 'takeaway' | string | null
  comment?: string | null
}

const HallMonitor = () => {
  const { orders, loading, error } = useOrders() as {
    orders?: Order[]
    loading: boolean
    error: string
  }

  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [fullscreen, setFullscreen] = useState(false)

  const prevReadyIdsRef = useRef<string[]>([])
  const audioUnlockedRef = useRef(false)

  const safeOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : []
  }, [orders])

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
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('FULLSCREEN ERROR:', err)
    }
  }

  const getOrderPlace = (order: Order) => {
    const raw = order.order_place || order.order_type
    if (raw === 'hall') return 'hall'
    if (raw === 'takeaway') return 'takeaway'

    const text = (order.comment || '').toLowerCase()
    if (text.includes('тип заказа: здесь')) return 'hall'
    if (text.includes('тип заказа: с собой')) return 'takeaway'
    return 'hall'
  }

  const readyOrders = useMemo(() => {
    return safeOrders
      .filter((order) => order.status === 'ready' && getOrderPlace(order) === 'hall')
      .sort((a, b) => b.order_number - a.order_number)
  }, [safeOrders])

  const preparingOrders = useMemo(() => {
    return safeOrders
      .filter(
        (order) =>
          (order.status === 'new' || order.status === 'preparing') &&
          getOrderPlace(order) === 'hall'
      )
      .sort((a, b) => b.order_number - a.order_number)
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
    } catch (soundError) {
      console.error('Sound playback error:', soundError)
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
    <div className='monitor-page hall-theme'>
      <div className='tv-toolbar'>
        <button className='tv-toolbar__btn' onClick={toggleFullscreen}>
          {fullscreen ? 'Минимизировать' : 'На весь экран'}
        </button>
      </div>

      <div className='tv-board'>
        {error && <div className='error-box'>{error}</div>}

        <div className='tv-board__layout'>
          <section className='tv-column tv-column--preparing'>
            <div className='tv-column__head'>
              <h2>Готовится</h2>
              <span>{preparingOrders.length}</span>
            </div>

            <div className='tv-column__body'>
              {loading ? (
                <div className='empty-box large'>Загрузка...</div>
              ) : preparingOrders.length === 0 ? (
                <div className='empty-box large'>—</div>
              ) : (
                <div
                  className={`tv-scroll ${
                    preparingOrders.length > 10 ? 'tv-scroll--animated' : ''
                  }`}
                >
                  <div className='tv-grid'>
                    {preparingLoopedOrders.map((order, index) => (
                      <div
                        className='tv-number tv-number--preparing'
                        key={`preparing-${order.id}-${index}`}
                      >
                        {order.order_number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className='tv-column tv-column--ready'>
            <div className='tv-column__head'>
              <h2>Готов</h2>
              <span>{readyOrders.length}</span>
            </div>

            <div className='tv-column__body'>
              {loading ? (
                <div className='empty-box large'>Загрузка...</div>
              ) : readyOrders.length === 0 ? (
                <div className='empty-box large'>—</div>
              ) : (
                <div
                  className={`tv-scroll ${
                    readyOrders.length > 10 ? 'tv-scroll--animated' : ''
                  }`}
                >
                  <div className='tv-grid'>
                    {readyLoopedOrders.map((order, index) => (
                      <div
                        className={`tv-number tv-number--ready ${
                          highlightedIds.includes(order.id)
                            ? 'tv-number--pop'
                            : ''
                        }`}
                        key={`ready-${order.id}-${index}`}
                      >
                        {order.order_number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default HallMonitor