import { supabase } from "../lib/supabase"
import { IMenuItem, IOrderRow, TOrderStatus } from "../types/order"

export const fetchActiveOrders = async (): Promise<IOrderRow[]> => {
	const { data, error } = await supabase
		.from("orders")
		.select("*")
		.neq("status", "completed")
		.order("order_number", { ascending: false })

	if (error) throw error
	return (data || []) as IOrderRow[]
}

export const fetchHistoryOrders = async (): Promise<IOrderRow[]> => {
	const { data, error } = await supabase
		.from("orders")
		.select("*")
		.eq("status", "completed")
		.order("order_number", { ascending: false })

	if (error) throw error
	return (data || []) as IOrderRow[]
}

export const createOrder = async (items: IMenuItem[], total: number) => {
	const { data, error } = await supabase
		.from("orders")
		.insert({
			customer_name: "Guest",
			table_number: null,
			status: "new",
			items,
			total,
		})
		.select("*")
		.single()

	if (error) throw error
	return data as IOrderRow
}

export const updateOrderStatus = async (
	id: string,
	status: TOrderStatus
): Promise<IOrderRow> => {
	const { data, error } = await supabase
		.from("orders")
		.update({ status })
		.eq("id", id)
		.select("*")
		.single()

	if (error) throw error
	return data as IOrderRow
}