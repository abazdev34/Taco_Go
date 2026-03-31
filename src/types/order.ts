export interface IMenuItem {
	id: string
	title: string
	price: number
	img: string
	measure?: string
	quantity?: number
	description?: string
	category: string
}

export type TOrderStatus = "new" | "preparing" | "ready" | "completed"

export interface IOrderRow {
	id: string
	order_number: number
	customer_name: string
	table_number: number | null
	status: TOrderStatus
	items: IMenuItem[]
	total: number
	created_at: string
	updated_at: string
}