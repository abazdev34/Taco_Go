import { supabase } from '../lib/supabase'

export type TCashSessionStatus = 'open' | 'closed'

export interface ICashSessionRow {
	id: string
	opened_at: string
	closed_at?: string | null
	opened_by?: string | null
	closed_by?: string | null
	opening_balance: number
	closing_balance: number
	total_orders: number
	total_cash: number
	total_online: number
	total_in: number
	total_out: number
	status: TCashSessionStatus
}

export async function fetchOpenCashSession(): Promise<ICashSessionRow | null> {
	const { data, error } = await supabase
		.from('cash_sessions')
		.select(
			'id, opened_at, closed_at, opened_by, closed_by, opening_balance, closing_balance, total_orders, total_cash, total_online, total_in, total_out, status'
		)
		.eq('status', 'open')
		.order('opened_at', { ascending: false })
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return (data as ICashSessionRow | null) ?? null
}

export async function openCashSession(p0: string, amount: number, payload: {
  opened_by: string
  opening_balance: number
}): Promise<ICashSessionRow> {
	const { data, error } = await supabase
		.from('cash_sessions')
		.insert([
			{
				opened_by: payload.opened_by?.trim() || 'Кассир',
				opening_balance: Number(payload.opening_balance || 0),
				closing_balance: 0,
				total_orders: 0,
				total_cash: 0,
				total_online: 0,
				total_in: 0,
				total_out: 0,
				status: 'open',
			},
		])
		.select(
			'id, opened_at, closed_at, opened_by, closed_by, opening_balance, closing_balance, total_orders, total_cash, total_online, total_in, total_out, status'
		)
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data as ICashSessionRow
}

export async function closeCashSession(
	id: string,
	payload: {
		closed_by: string
		closing_balance: number
		total_orders: number
		total_cash: number
		total_online: number
		total_in: number
		total_out: number
	}
): Promise<ICashSessionRow> {
	const { data, error } = await supabase
		.from('cash_sessions')
		.update({
			closed_by: payload.closed_by?.trim() || 'Кассир',
			closed_at: new Date().toISOString(),
			closing_balance: Number(payload.closing_balance || 0),
			total_orders: Number(payload.total_orders || 0),
			total_cash: Number(payload.total_cash || 0),
			total_online: Number(payload.total_online || 0),
			total_in: Number(payload.total_in || 0),
			total_out: Number(payload.total_out || 0),
			status: 'closed',
		})
		.eq('id', id)
		.select(
			'id, opened_at, closed_at, opened_by, closed_by, opening_balance, closing_balance, total_orders, total_cash, total_online, total_in, total_out, status'
		)
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data as ICashSessionRow
}