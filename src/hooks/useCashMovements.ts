import { useCallback, useEffect, useState } from 'react'
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

export const useCashMovements = () => {
  const [movements, setMovements] = useState<ICashMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchCashMovements()
      setMovements(data)
    } catch (e: any) {
      console.error('LOAD CASH MOVEMENTS ERROR:', e)
      setError(e?.message || 'Не удалось загрузить движения кассы')
    } finally {
      setLoading(false)
    }
  }, [])

  const removeOne = useCallback(
    async (id: string) => {
      try {
        setError('')
        await deleteCashMovement(id)
        await loadMovements()
      } catch (e: any) {
        console.error('DELETE CASH MOVEMENT ERROR:', e)
        setError(e?.message || 'Не удалось удалить запись')
        throw e
      }
    },
    [loadMovements]
  )

  const removeMany = useCallback(
    async (ids: string[]) => {
      try {
        setError('')
        await deleteCashMovements(ids)
        await loadMovements()
      } catch (e: any) {
        console.error('DELETE MANY CASH MOVEMENTS ERROR:', e)
        setError(e?.message || 'Не удалось удалить записи')
        throw e
      }
    },
    [loadMovements]
  )

  const clearByStatus = useCallback(
    async (statuses: TCashMovementStatus[]) => {
      try {
        setError('')
        await clearCashMovementsByStatus(statuses)
        await loadMovements()
      } catch (e: any) {
        console.error('CLEAR CASH MOVEMENTS BY STATUS ERROR:', e)
        setError(e?.message || 'Не удалось очистить журнал')
        throw e
      }
    },
    [loadMovements]
  )

  const clearAll = useCallback(async () => {
    try {
      setError('')
      await clearAllCashMovements()
      await loadMovements()
    } catch (e: any) {
      console.error('CLEAR ALL CASH MOVEMENTS ERROR:', e)
      setError(e?.message || 'Не удалось очистить все записи')
      throw e
    }
  }, [loadMovements])

  useEffect(() => {
    loadMovements()

    const channel = supabase
      .channel('cash-movements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_movements',
        },
        () => {
          loadMovements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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