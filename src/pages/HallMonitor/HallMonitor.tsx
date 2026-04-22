import { useEffect, useMemo, useRef, useState } from 'react'
import '../Navbar/monitor.scss'
import { useOrders } from '../../hooks/useOrders'
import { fetchMenuItems } from '../../api/menuItems'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  buildDailyNumberOrders,
  getDailyOrderNumber,
} from '../../utils/orderNumber'
import {
  canShowInHallMonitor,
  getOrderPlaceValue,
} from '../../utils/orderHelpers'
import logoImg from '../../assets/img/logo-burritos.jpg'

type THallMenuCategory = {
  id?: string
  name?: string
  title?: string
  sort_order?: number | null
}

type THallMenuItem = {
  id: string
  title: string
  price: number
  image_url?: string | null
  image?: string | null
  photo?: string | null
  description?: string | null
  is_active?: boolean
  sort_order?: number | null
  categories?: THallMenuCategory | null
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'

const getItemImage = (item: THallMenuItem) =>
  item.image_url || item.image || item.photo || DEFAULT_IMAGE

const uniqueOrdersById = <T extends { id: string }>(orders: T[]) => {
  const map = new Map<string, T>()
  orders.forEach(order => {
    map.set(order.id, order)
  })
  return Array.from(map.values())
}

function HallMonitor() {
  const { orders, loading, error } = useOrders() as {
    orders?: IOrderRow[]
    loading: boolean
    error: string
  }

  const [menuItems, setMenuItems] = useState<THallMenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [showReadyBanner, setShowReadyBanner] = useState(false)
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
    const loadMenu = async () => {
      try {
        setMenuLoading(true)
        const data = await fetchMenuItems()

        const prepared = (data || [])
          .filter((item: THallMenuItem) => item.is_active !== false)
          .sort((a: THallMenuItem, b: THallMenuItem) => {
            const categorySortA = a.categories?.sort_order ?? 0
            const categorySortB = b.categories?.sort_order ?? 0

            if (categorySortA !== categorySortB) {
              return categorySortA - categorySortB
            }

            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })

        setMenuItems(prepared)
      } catch (e) {
        console.error('HALL MENU LOAD ERROR:', e)
      } finally {
        setMenuLoading(false)
      }
    }

    void loadMenu()
  }, [])

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
        order =>
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
      .filter(order => canShowInHallMonitor(order) && order.status !== 'ready')
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
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextClass || !audioUnlockedRef.current) return

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
    const currentReadyIds = readyOrders.map(order => order.id)
    const newReadyIds = currentReadyIds.filter(
      id => !prevReadyIdsRef.current.includes(id)
    )

    if (newReadyIds.length > 0) {
      setHighlightedIds(prev => [...prev, ...newReadyIds])
      setShowReadyBanner(true)
      playReadySound()

      const timeoutA = window.setTimeout(() => {
        setHighlightedIds(prev => prev.filter(id => !newReadyIds.includes(id)))
      }, 3200)

      const timeoutB = window.setTimeout(() => {
        setShowReadyBanner(false)
      }, 2600)

      prevReadyIdsRef.current = currentReadyIds

      return () => {
        window.clearTimeout(timeoutA)
        window.clearTimeout(timeoutB)
      }
    }

    prevReadyIdsRef.current = currentReadyIds
  }, [readyOrders])

  const menuTickerItems = useMemo(() => {
    if (menuItems.length <= 3) return menuItems
    return [...menuItems, ...menuItems]
  }, [menuItems])

  return (
    <div className='hall-tv-page'>
      <div className='hall-tv-bg-blur' />

      {showReadyBanner && (
        <div className='hall-tv-banner'>
          <span>Заказ готов</span>
        </div>
      )}

      {error && <div className='hall-tv-error'>{error}</div>}

      <div className='hall-tv-shell'>
        <section className='hall-tv-board'>
          <div className='hall-tv-board__hero'>
            <div className='hall-tv-brand'>
              <img src={logoImg} alt='Бурритос' className='hall-tv-brand__logo' />
              <div>
                <span className='hall-tv-badge'>Mexican Grill</span>
                <h1>Статус заказов</h1>
                <p>Следите за номером вашего заказа на экране</p>
              </div>
            </div>
          </div>

          <div className='hall-tv-columns'>
            <section className='hall-tv-column hall-tv-column--preparing'>
              <div className='hall-tv-column__head'>
                <h2>Готовится</h2>
                <span>{preparingOrders.length}</span>
              </div>

              <div className='hall-tv-column__body'>
                {loading ? (
                  <div className='hall-tv-empty'>Загрузка...</div>
                ) : preparingOrders.length === 0 ? (
                  <div className='hall-tv-empty'>Нет заказов</div>
                ) : (
                  <div className='hall-tv-number-grid'>
                    {preparingOrders.map(order => (
                      <div
                        className='hall-tv-number hall-tv-number--preparing'
                        key={order.id}
                      >
                        {getDisplayNumber(order)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className='hall-tv-column hall-tv-column--ready'>
              <div className='hall-tv-column__head'>
                <h2>Готов</h2>
                <span>{readyOrders.length}</span>
              </div>

              <div className='hall-tv-column__body'>
                {loading ? (
                  <div className='hall-tv-empty'>Загрузка...</div>
                ) : readyOrders.length === 0 ? (
                  <div className='hall-tv-empty'>Нет готовых заказов</div>
                ) : (
                  <div className='hall-tv-number-grid'>
                    {readyOrders.map(order => (
                      <div
                        className={`hall-tv-number hall-tv-number--ready ${
                          highlightedIds.includes(order.id)
                            ? 'hall-tv-number--pop'
                            : ''
                        }`}
                        key={order.id}
                      >
                        {getDisplayNumber(order)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <aside className='hall-tv-menu'>
          <div className='hall-tv-menu__head'>
            <span className='hall-tv-badge'>Меню</span>
            <h3>Популярные блюда</h3>
          </div>

          <div className='hall-tv-menu__viewport'>
            {menuLoading ? (
              <div className='hall-tv-empty hall-tv-empty--menu'>
                Загрузка меню...
              </div>
            ) : menuItems.length === 0 ? (
              <div className='hall-tv-empty hall-tv-empty--menu'>Меню пустое</div>
            ) : (
              <div
                className={`hall-tv-menu__track ${
                  menuItems.length > 3 ? 'hall-tv-menu__track--animated' : ''
                }`}
              >
                {menuTickerItems.map((item, index) => (
                  <article className='hall-tv-menu-card' key={`${item.id}-${index}`}>
                    <img
                      src={getItemImage(item)}
                      alt={item.title}
                      className='hall-tv-menu-card__image'
                    />

                    <div className='hall-tv-menu-card__body'>
                      <h4>{item.title}</h4>
                      <strong>{formatPrice(Number(item.price || 0))}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default HallMonitor