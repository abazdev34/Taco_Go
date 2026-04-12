import { useEffect, useState } from 'react'
import { fetchActiveOrders } from '../api/orders'
import { IOrderRow } from '../types/order'
import { supabase } from '../lib/supabase'

const ACTIVE_STATUSES = ['pending', 'new', 'preparing', 'ready']

function getOrderTime(order: IOrderRow) {
  const raw = order?.created_at || order?.updated_at || ''
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
    assembly_progress:
      Array.isArray(newOrder.assembly_progress)
        ? newOrder.assembly_progress
        : oldOrder.assembly_progress,
  }
}

function isActiveOrder(order?: IOrderRow | null) {
  return !!order && ACTIVE_STATUSES.includes(order.status)
}

function sortOrders(list: IOrderRow[]) {
  return [...list].sort((a, b) => {
    const aTime = getOrderTime(a)
    const bTime = getOrderTime(b)

    if (aTime !== bTime) {
      return bTime - aTime
    }

    return Number(b?.order_number || 0) - Number(a?.order_number || 0)
  })
}

function upsertOrder(prev: IOrderRow[], incoming: IOrderRow) {
  const index = prev.findIndex((o) => o.id === incoming.id)

  if (index === -1) {
    return sortOrders([incoming, ...prev])
  }

  const current = prev[index]
  const merged = mergeOrder(current, incoming)

  const next = [...prev]
  next[index] = merged

  return sortOrders(next)
}

export function useOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchActiveOrders()

        if (!mounted) return

        const safeData = Array.isArray(data) ? data : []
        const activeOnly = safeData.filter((order) => isActiveOrder(order))

        setOrders(sortOrders(activeOnly))
      } catch (e: any) {
        console.error('LOAD ACTIVE ORDERS ERROR:', e)

        if (!mounted) return

        setError(e?.message || 'Не удалось загрузить заказы')
        setOrders([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel('orders-active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (!mounted) return

          const newRow = payload.new as IOrderRow | undefined
          const oldRow = payload.old as IOrderRow | undefined

          setOrders((prev) => {
            const safePrev = Array.isArray(prev) ? prev : []

            if (payload.eventType === 'INSERT' && newRow) {
              if (!isActiveOrder(newRow)) return safePrev
              return upsertOrder(safePrev, newRow)
            }

            if (payload.eventType === 'UPDATE' && newRow) {
              const exists = safePrev.some((o) => o.id === newRow.id)
              const active = isActiveOrder(newRow)

              if (active) {
                return upsertOrder(safePrev, newRow)
              }

              if (exists && !active) {
                return safePrev.filter((o) => o.id !== newRow.id)
              }

              return safePrev
            }

            if (payload.eventType === 'DELETE' && oldRow?.id) {
              return safePrev.filter((o) => o.id !== oldRow.id)
            }

            return safePrev
          })
        }
      )
      .subscribe((status) => {
        console.log('ACTIVE ORDERS CHANNEL STATUS:', status)

        if (!mounted) return

        if (status === 'CHANNEL_ERROR') {
          setError('Realtime connection error')
        }
      })

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return { orders, loading, error }
}