import { useEffect, useMemo, useRef, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { fetchMenuItems } from '../../api/menuItems'
import { IMenuItem, IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  buildDailyNumberOrders,
  getDailyOrderNumber,
} from '../../utils/orderNumber'
import {
  canShowInHallMonitor,
  getOrderPlaceValue,
} from '../../utils/orderHelpers'
import './HallMonitor.scss'

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
  is_active?: boolean
  sort_order?: number | null
  categories?: THallMenuCategory | null
  category?: string | null
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80'

const getItemImage = (item: THallMenuItem) =>
  item.image_url || item.image || item.photo || DEFAULT_IMAGE

const getCategoryName = (item: THallMenuItem) =>
  item.categories?.name || item.categories?.title || item.category || ''

const uniqueOrdersById = <T extends { id: string }>(orders: T[]) => {
  const map = new Map<string, T>()
  orders.forEach((order) => map.set(order.id, order))
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
  const [activeMenuIndex, setActiveMenuIndex] = useState(0)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [showReadyBanner, setShowReadyBanner] = useState(false)

  const prevReadyIdsRef = useRef<string[]>([])
  const audioUnlockedRef = useRef(false)

  const safeOrders = useMemo(
    () => (Array.isArray(orders) ? uniqueOrdersById(orders) : []),
    [orders],
  )

  const numberingOrders = useMemo(
    () => buildDailyNumberOrders(safeOrders),
    [safeOrders],
  )

  const getDisplayNumber = (order: IOrderRow) => {
    if (order.daily_order_number) {
      return String(order.daily_order_number).padStart(3, '0')
    }

    return getDailyOrderNumber(order, numberingOrders)
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

  const orderHasAssembly = (order: IOrderRow) => {
    return (order.items || []).some(
      (item) => getCategoryType(item) === 'assembly',
    )
  }

  const isOrderReadyForHall = (order: IOrderRow) => {
    const hasAssembly = orderHasAssembly(order)

    if (hasAssembly) {
      return order.status === 'ready' && order.assembly_status === 'ready'
    }

    return order.status === 'ready'
  }

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setMenuLoading(true)

        const data = await fetchMenuItems()

        const prepared = (data || [])
          .filter((item: THallMenuItem) => item.is_active !== false)
          .filter((item: THallMenuItem) => {
            const categoryName = getCategoryName(item).toLowerCase().trim()
            return (
              categoryName.includes('популяр') ||
              categoryName.includes('popular')
            )
          })
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
    if (menuItems.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveMenuIndex((prev) => (prev + 1) % menuItems.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [menuItems.length])

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
          isOrderReadyForHall(order) && getOrderPlaceValue(order) === 'hall',
      )
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })
  }, [safeOrders])

  const preparingOrders = useMemo(() => {
    return safeOrders
      .filter(
        (order) =>
          canShowInHallMonitor(order) &&
          getOrderPlaceValue(order) === 'hall' &&
          !isOrderReadyForHall(order),
      )
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
        audioCtx.currentTime + 0.16,
      )
      oscillator.frequency.linearRampToValueAtTime(
        1318,
        audioCtx.currentTime + 0.32,
      )

      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        audioCtx.currentTime + 0.02,
      )
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.55,
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
      (id) => !prevReadyIdsRef.current.includes(id),
    )

    if (newReadyIds.length > 0) {
      setHighlightedIds((prev) => [...prev, ...newReadyIds])
      setShowReadyBanner(true)
      playReadySound()

      const timeoutA = window.setTimeout(() => {
        setHighlightedIds((prev) =>
          prev.filter((id) => !newReadyIds.includes(id)),
        )
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

  const activeMenuItem = menuItems[activeMenuIndex]

  return (
    <div className='hall-monitor'>
      {showReadyBanner && <div className='hall-ready-alert'>Заказ готов</div>}
      {error && <div className='hall-error'>{error}</div>}

      <main className='hall-screen'>
        <section className='hall-orders'>
          <div className='hall-order-column hall-order-column--preparing'>
            <h2>Готовится</h2>

            <div className='hall-number-list'>
              {loading ? (
                <p className='hall-empty'>Загрузка...</p>
              ) : preparingOrders.length === 0 ? (
                <p className='hall-empty'>Нет заказов</p>
              ) : (
                preparingOrders.map((order) => (
                  <span
                    className='hall-number hall-number--preparing'
                    key={order.id}
                  >
                    {getDisplayNumber(order)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className='hall-order-column hall-order-column--ready'>
            <h2>Готов</h2>

            <div className='hall-number-list'>
              {loading ? (
                <p className='hall-empty'>Загрузка...</p>
              ) : readyOrders.length === 0 ? (
                <p className='hall-empty'>Нет готовых</p>
              ) : (
                readyOrders.map((order) => (
                  <span
                    className={`hall-number hall-number--ready ${
                      highlightedIds.includes(order.id)
                        ? 'hall-number--active'
                        : ''
                    }`}
                    key={order.id}
                  >
                    {getDisplayNumber(order)}
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className='hall-food'>
          {menuLoading ? (
            <div className='hall-food-empty'>Загрузка меню...</div>
          ) : !activeMenuItem ? (
            <div className='hall-food-empty'>Нет блюд</div>
          ) : (
            <article className='hall-food-slide' key={activeMenuItem.id}>
              <img src={getItemImage(activeMenuItem)} alt={activeMenuItem.title} />

              <div className='hall-food-info'>
                <h3>{activeMenuItem.title}</h3>
                <strong>{formatPrice(Number(activeMenuItem.price || 0))}</strong>
              </div>
            </article>
          )}
        </aside>
      </main>
    </div>
  )
}

export default HallMonitor