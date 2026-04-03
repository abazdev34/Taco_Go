import { supabase } from '../lib/supabase'
import {
	IMenuItem,
	IOrderRow,
	TOrderSource,
	TOrderStatus,
} from '../types/order'

export interface CreateOrderPayload {
	items: IMenuItem[]
	total: number
	comment?: string
	customer_name?: string
	table_number?: number | null
	source?: TOrderSource
	status?: TOrderStatus
}

export const fetchActiveOrders = async (): Promise<IOrderRow[]> => {
	const { data, error } = await supabase
		.from('orders')
		.select('*')
		.neq('status', 'completed')
		.order('order_number', { ascending: false })

	if (error) {
		console.error('fetchActiveOrders error:', error)
		throw error
	}

	return (data || []) as IOrderRow[]
}

export const fetchHistoryOrders = async (): Promise<IOrderRow[]> => {
	const { data, error } = await supabase
		.from('orders')
		.select('*')
		.eq('status', 'completed')
		.order('order_number', { ascending: false })

	if (error) {
		console.error('fetchHistoryOrders error:', error)
		throw error
	}

	return (data || []) as IOrderRow[]
}

export const createOrder = async ({
	items,
	total,
	comment = '',
	customer_name = 'Гость',
	table_number = null,
	source = 'cashier',
	status = 'new',
}: CreateOrderPayload): Promise<IOrderRow> => {
	const payload = {
		customer_name,
		table_number,
		status,
		items,
		total,
		comment,
		source,
	}

	const { data, error } = await supabase
		.from('orders')
		.insert(payload)
		.select('*')
		.single()

	if (error) {
		console.error('createOrder error:', error)
		throw error
	}

	return data as IOrderRow
}

export const updateOrderStatus = async (
	id: string,
	status: TOrderStatus
): Promise<IOrderRow> => {
	const { data, error } = await supabase
		.from('orders')
		.update({ status })
		.eq('id', id)
		.select('*')
		.single()

	if (error) {
		console.error('updateOrderStatus error:', error)
		throw error
	}

	return data as IOrderRow
}

export const updateOrderComment = async (
	id: string,
	comment: string
): Promise<IOrderRow> => {
	const { data, error } = await supabase
		.from('orders')
		.update({ comment })
		.eq('id', id)
		.select('*')
		.single()

	if (error) {
		console.error('updateOrderComment error:', error)
		throw error
	}

	return data as IOrderRow
}