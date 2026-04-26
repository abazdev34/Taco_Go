import { useEffect, useRef, useState } from 'react'
import { fetchOrders } from '../api/orders'
import { IOrderRow } from '../types/order'

const MAX_ORDERS = 300
const POLLING_INTERVAL_MS = 2000

function getOrderTime(order: IOrderRow) {
  const raw = order?.updated_at || order?.created_at || ''
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function mergeOrder(oldOrder: IOrderRow, newOrder: IOrderRow): IOrderRow {
  return {
    ...oldOrder,
    ...newOrder,
    items:
      Array.isArray(newOrder.items) && newOrder.items.length > 0
        ? newOrder.items
        : oldOrder.items,
    assembly_progress: Array.isArray(newOrder.assembly_progress)
      ? newOrder.assembly_progress
      : oldOrder.assembly_progress,
  }
}

function normalizeOrders(list: IOrderRow[]) {
  const map = new Map<string, IOrderRow>()

  for (const order of list) {
    if (!order?.id) continue

    const existing = map.get(order.id)
    map.set(order.id, existing ? mergeOrder(existing, order) : order)
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const diff = getOrderTime(b) - getOrderTime(a)
      if (diff !== 0) return diff

      return (
        Number(b.daily_order_number || b.order_number || 0) -
        Number(a.daily_order_number || a.order_number || 0)
      )
    })
    .slice(0, MAX_ORDERS)
}

export function useAllOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)
  const firstLoadRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const load = async () => {
      try {
        if (firstLoadRef.current) {
          setLoading(true)
        }

        const data = await fetchOrders()

        if (!mountedRef.current) return

        setOrders(normalizeOrders(Array.isArray(data) ? data : []))
        setError('')
      } catch (err: any) {
        console.error('ALL ORDERS POLLING ERROR:', err)

        if (!mountedRef.current) return

        setError(err?.message || 'Не удалось загрузить заказы')
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          firstLoadRef.current = false
        }
      }
    }

    void load()

    const interval = window.setInterval(() => {
      void load()
    }, POLLING_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      window.clearInterval(interval)
    }
  }, [])

  return {
    orders,
    loading,
    error,
    setOrders,
  }
}