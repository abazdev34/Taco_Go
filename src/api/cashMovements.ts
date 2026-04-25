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

const CASH_MOVEMENT_SELECT = `
  id,
  movement_type,
  amount,
  description,
  requested_by,
  source_name,
  approved_by,
  status,
  created_at,
  approved_at
`

const MAX_CASH_MOVEMENTS = 200

function normalizeCashMovement(row: any): ICashMovementRow {
  return {
    id: row.id,
    movement_type: row.movement_type,
    amount: Number(row.amount || 0),
    description: row.description || null,
    requested_by: row.requested_by || null,
    source_name: row.source_name || null,
    approved_by: row.approved_by || null,
    status: row.status,
    created_at: row.created_at,
    approved_at: row.approved_at || null,
  }
}

export async function fetchCashMovements(
  limit = MAX_CASH_MOVEMENTS
): Promise<ICashMovementRow[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select(CASH_MOVEMENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data || []).map(normalizeCashMovement)
}

export async function fetchPendingCashMovements(): Promise<ICashMovementRow[]> {
  const { data, error } = await supabase
    .from('cash_movements')
    .select(CASH_MOVEMENT_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(MAX_CASH_MOVEMENTS)

  if (error) throw new Error(error.message)

  return (data || []).map(normalizeCashMovement)
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
    .select(CASH_MOVEMENT_SELECT)
    .single()

  if (error) throw new Error(error.message)

  return normalizeCashMovement(data)
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
    .select(CASH_MOVEMENT_SELECT)
    .single()

  if (error) throw new Error(error.message)

  return normalizeCashMovement(data)
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
    .select(CASH_MOVEMENT_SELECT)
    .single()

  if (error) throw new Error(error.message)

  return normalizeCashMovement(data)
}

export async function deleteCashMovement(id: string): Promise<void> {
  if (!id) return

  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteCashMovements(ids: string[]): Promise<void> {
  const safeIds = ids.filter(Boolean)
  if (!safeIds.length) return

  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .in('id', safeIds)

  if (error) throw new Error(error.message)
}

export async function clearCashMovementsByStatus(
  statuses: TCashMovementStatus[]
): Promise<void> {
  const safeStatuses = statuses.filter(Boolean)
  if (!safeStatuses.length) return

  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .in('status', safeStatuses)

  if (error) throw new Error(error.message)
}

export async function clearAllCashMovements(): Promise<void> {
  const { error } = await supabase
    .from('cash_movements')
    .delete()
    .not('id', 'is', null)

  if (error) throw new Error(error.message)
}