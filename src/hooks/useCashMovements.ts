import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  clearAllCashMovements,
  clearCashMovementsByStatus,
  deleteCashMovement,
  deleteCashMovements,
  fetchCashMovements,
  ICashMovementRow,
  TCashMovementStatus,
} from '../api/cashMovements'

const MAX_MOVEMENTS = 200

function sortMovements(list: ICashMovementRow[]) {
  return [...list]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, MAX_MOVEMENTS)
}

function upsertMovement(list: ICashMovementRow[], movement: ICashMovementRow) {
  if (!movement?.id) return list

  const index = list.findIndex(item => item.id === movement.id)

  if (index === -1) {
    return sortMovements([movement, ...list])
  }

  const next = [...list]
  next[index] = {
    ...next[index],
    ...movement,
  }

  return sortMovements(next)
}

function removeMovement(list: ICashMovementRow[], id?: string) {
  if (!id) return list
  return list.filter(item => item.id !== id)
}

export const useCashMovements = () => {
  const [movements, setMovements] = useState<ICashMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data = await fetchCashMovements()

      if (!mountedRef.current) return

      setMovements(sortMovements(Array.isArray(data) ? data : []))
    } catch (e: any) {
      if (!mountedRef.current) return

      console.error('LOAD CASH MOVEMENTS ERROR:', e)
      setError(e?.message || 'Не удалось загрузить движения кассы')
      setMovements([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const removeOne = useCallback(async (id: string) => {
    try {
      setError('')
      await deleteCashMovement(id)
      setMovements(prev => removeMovement(prev, id))
    } catch (e: any) {
      console.error('DELETE CASH MOVEMENT ERROR:', e)
      setError(e?.message || 'Не удалось удалить запись')
      throw e
    }
  }, [])

  const removeMany = useCallback(async (ids: string[]) => {
    try {
      const safeIds = ids.filter(Boolean)
      if (!safeIds.length) return

      setError('')
      await deleteCashMovements(safeIds)
      setMovements(prev => prev.filter(item => !safeIds.includes(item.id)))
    } catch (e: any) {
      console.error('DELETE MANY CASH MOVEMENTS ERROR:', e)
      setError(e?.message || 'Не удалось удалить записи')
      throw e
    }
  }, [])

  const clearByStatus = useCallback(async (statuses: TCashMovementStatus[]) => {
    try {
      setError('')
      await clearCashMovementsByStatus(statuses)
      setMovements(prev => prev.filter(item => !statuses.includes(item.status)))
    } catch (e: any) {
      console.error('CLEAR CASH MOVEMENTS BY STATUS ERROR:', e)
      setError(e?.message || 'Не удалось очистить журнал')
      throw e
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      setError('')
      await clearAllCashMovements()
      setMovements([])
    } catch (e: any) {
      console.error('CLEAR ALL CASH MOVEMENTS ERROR:', e)
      setError(e?.message || 'Не удалось очистить все записи')
      throw e
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    void loadMovements()

    const channel = supabase
      .channel('cash-movements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_movements',
        },
        payload => {
          if (!mountedRef.current) return

          const newRow = payload.new as ICashMovementRow | undefined
          const oldRow = payload.old as ICashMovementRow | undefined

          setMovements(prev => {
            if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newRow) {
              return upsertMovement(prev, newRow)
            }

            if (payload.eventType === 'DELETE') {
              return removeMovement(prev, oldRow?.id)
            }

            return prev
          })
        }
      )
      .subscribe(status => {
        if (!mountedRef.current) return

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Ошибка realtime соединения кассы')
        }
      })

    return () => {
      mountedRef.current = false
      void supabase.removeChannel(channel)
    }
  }, [loadMovements])

  return {
    movements,
    loading,
    error,
    refetch: loadMovements,
    removeOne,
    removeMany,
    clearByStatus,
    clearAll,
  }
}