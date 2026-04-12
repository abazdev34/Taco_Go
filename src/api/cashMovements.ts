import { supabase } from '../lib/supabase'

export type TCashMovementType = 'in' | 'out'
export type TCashMovementStatus = 'pending' | 'approved' | 'rejected'

export interface ICashMovementRow {
  id: string
  movement_type: TCashMovementType
  amount: number
  description?: string | null
  requested_by?: string | null
  source_name?: string | null
  approved_by?: string | null
  status: TCashMovementStatus
  created_at: string
  approved_at?: string | null
}

export async function fetchCashMovements(): Promise<ICashMovementRow[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as ICashMovementRow[]
}

export async function fetchPendingCashMovements(): Promise<ICashMovementRow[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as ICashMovementRow[]
}

export async function createCashMovement(payload: {
  movement_type: TCashMovementType
  amount: number
  description?: string | null
  requested_by?: string | null
  source_name?: string | null
  status?: TCashMovementStatus
  approved_by?: string | null
  approved_at?: string | null
}): Promise<ICashMovementRow> {
  const status = payload.status || 'pending'

  const insertPayload = {
    movement_type: payload.movement_type,
    amount: Number(payload.amount || 0),
    description: payload.description?.trim() || null,
    requested_by: payload.requested_by?.trim() || null,
    source_name: payload.source_name?.trim() || null,
    status,
    approved_by:
      status === 'approved'
        ? payload.approved_by?.trim() ||
          payload.requested_by?.trim() ||
          'Кассир'
        : null,
    approved_at:
      status === 'approved'
        ? payload.approved_at || new Date().toISOString()
        : null,
  }

  const { data, error } = await supabase
    .from('cash_movements')
    .insert([insertPayload])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ICashMovementRow
}

export async function approveCashMovement(
  id: string,
  approvedBy: string
): Promise<ICashMovementRow> {
  const { data, error } = await supabase
    .from('cash_movements')
    .update({
      status: 'approved',
      approved_by: approvedBy.trim() || 'Администратор',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ICashMovementRow
}

export async function rejectCashMovement(
  id: string,
  approvedBy: string
): Promise<ICashMovementRow> {
  const { data, error } = await supabase
    .from('cash_movements')
    .update({
      status: 'rejected',
      approved_by: approvedBy.trim() || 'Администратор',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ICashMovementRow
}

export async function deleteCashMovement(id: string): Promise<void> {
  const { error } = await supabase.from('cash_movements').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteCashMovements(ids: string[]): Promise<void> {
  if (!ids.length) return

  const { error } = await supabase.from('cash_movements').delete().in('id', ids)

  if (error) {
    throw new Error(error.message)
  }
}

export async function clearCashMovementsByStatus(
  statuses: TCashMovementStatus[]
): Promise<void> {
  if (!statuses.length) return

  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .in('status', statuses)

  if (error) {
    throw new Error(error.message)
  }
}

export async function clearAllCashMovements(): Promise<void> {
  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .not('id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }
}