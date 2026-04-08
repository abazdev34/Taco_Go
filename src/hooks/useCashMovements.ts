import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchCashMovements,
  ICashMovementRow,
} from '../api/cashMovements'

export function useCashMovements() {
  const [movements, setMovements] = useState<ICashMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchCashMovements()

        if (mounted) {
          setMovements(Array.isArray(data) ? data : [])
        }
      } catch (err: any) {
        console.error('LOAD CASH MOVEMENTS ERROR:', err)
        if (mounted) {
          setError(err?.message || 'Не удалось загрузить кассовые движения')
          setMovements([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    const channel = supabase
      .channel(`cash-movements-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_movements',
        },
        (payload) => {
          if (!mounted) return

          const eventType = payload.eventType
          const newRow = payload.new as ICashMovementRow | undefined
          const oldRow = payload.old as ICashMovementRow | undefined

          setMovements((prev) => {
            let next = Array.isArray(prev) ? [...prev] : []

            if (eventType === 'INSERT' && newRow) {
              const exists = next.some((item) => item.id === newRow.id)
              if (exists) {
                next = next.map((item) => (item.id === newRow.id ? newRow : item))
              } else {
                next = [newRow, ...next]
              }
            }

            if (eventType === 'UPDATE' && newRow) {
              const exists = next.some((item) => item.id === newRow.id)
              if (exists) {
                next = next.map((item) => (item.id === newRow.id ? newRow : item))
              } else {
                next = [newRow, ...next]
              }
            }

            if (eventType === 'DELETE' && oldRow) {
              next = next.filter((item) => item.id !== oldRow.id)
            }

            return next.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { movements, loading, error }
}