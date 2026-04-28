import { supabase } from '../lib/supabase'

export type ICashSessionRow = {
  id: string
  opened_at: string
  closed_at: string | null
  opened_by: string | null
  closed_by: string | null
  opening_balance: number | null
  closing_balance: number | null
  total_orders: number | null
  total_cash: number | null
  total_online: number | null
  total_in: number | null
  total_out: number | null
}

export type TOpenCashSessionPayload = {
  opened_by: string
  opening_balance: number
}

export type TCloseCashSessionPayload = {
  closed_by: string
  closing_balance: number
  total_orders: number
  total_cash: number
  total_online: number
  total_in: number
  total_out: number
}

export const fetchOpenCashSession = async () => {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .is('closed_at', null)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as ICashSessionRow | null
}

export const openCashSession = async (payload: TOpenCashSessionPayload) => {
  const openedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('cash_sessions')
    .insert({
      opened_at: openedAt,
      closed_at: null,
      opened_by: payload.opened_by,
      opening_balance: payload.opening_balance,
      closing_balance: null,
      total_orders: 0,
      total_cash: 0,
      total_online: 0,
      total_in: 0,
      total_out: 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ICashSessionRow
}

export const closeCashSession = async (
  id: string,
  payload: TCloseCashSessionPayload
) => {
  if (!id) throw new Error('ID смены не найден')

  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      closed_at: new Date().toISOString(),
      closed_by: payload.closed_by,
      closing_balance: payload.closing_balance,
      total_orders: payload.total_orders,
      total_cash: payload.total_cash,
      total_online: payload.total_online,
      total_in: payload.total_in,
      total_out: payload.total_out,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as ICashSessionRow
}