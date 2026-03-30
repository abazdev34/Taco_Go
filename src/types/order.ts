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

export interface ICategoryItem {
	id: string
	img: string
	title: string
	measure: string
	quantity: number
	price: number
	description: string
}

export interface ICategoryBlock {
	id: string
	title: string
	tacoCategory: ICategoryItem[]
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