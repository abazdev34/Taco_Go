import { supabase } from '../lib/supabase'

export type TCashMovementType = 'in' | 'out'
export type TCashMovementStatus = 'pending' | 'approved' | 'rejected'

export interface ICashMovementRow {
  id: string
  movement_type: TCashMovementType
  amount: number
  description?: string | null
  requested_by?: string | null
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
}): Promise<ICashMovementRow> {
  const insertPayload = {
    movement_type: payload.movement_type,
    amount: Number(payload.amount || 0),
    description: payload.description?.trim() || null,
    requested_by: payload.requested_by?.trim() || null,
    status: 'pending',
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
      approved_by: approvedBy.trim() || 'Админ',
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
      approved_by: approvedBy.trim() || 'Админ',
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