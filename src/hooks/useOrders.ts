import { useEffect, useRef, useState } from 'react'
import { fetchActiveOrders } from '../api/orders'
import { supabase } from '../lib/supabase'
import { IOrderRow } from '../types/order'

const ACTIVE_STATUSES = ['pending', 'new', 'preparing', 'ready']
const MAX_ACTIVE_ORDERS = 120

function getOrderTime(order: IOrderRow) {
  const raw = order?.updated_at || order?.created_at || ''
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function isActiveOrder(order?: IOrderRow | null) {
  return !!order?.id && ACTIVE_STATUSES.includes(String(order.status || ''))
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
    if (!isActiveOrder(order)) continue
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
    .slice(0, MAX_ACTIVE_ORDERS)
}

function upsertOrder(prev: IOrderRow[], incoming: IOrderRow) {
  if (!isActiveOrder(incoming)) {
    return prev.filter(order => order.id !== incoming.id)
  }

  const index = prev.findIndex(order => order.id === incoming.id)

  if (index === -1) {
    return normalizeOrders([incoming, ...prev])
  }

  const next = [...prev]
  next[index] = mergeOrder(next[index], incoming)

  return normalizeOrders(next)
}

export function useOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchActiveOrders()

        if (!mountedRef.current) return
        setOrders(normalizeOrders(Array.isArray(data) ? data : []))
      } catch (e: any) {
        if (!mountedRef.current) return
        setError(e?.message || 'Не удалось загрузить заказы')
        setOrders([])
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel('orders-active-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=in.(pending,new,preparing,ready,completed,cancelled)',
        },
        payload => {
          if (!mountedRef.current) return

          const newRow = payload.new as IOrderRow | undefined
          const oldRow = payload.old as IOrderRow | undefined

          setOrders(prev => {
            if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newRow) {
              return upsertOrder(prev, newRow)
            }

            if (payload.eventType === 'DELETE' && oldRow?.id) {
              return prev.filter(order => order.id !== oldRow.id)
            }

            return prev
          })
        }
      )
      .subscribe(status => {
        if (!mountedRef.current) return

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Ошибка realtime соединения')
        }
      })

    return () => {
      mountedRef.current = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return {
    orders,
    loading,
    error,
    setOrders,
  }
}