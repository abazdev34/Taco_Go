/** @format */

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

export type TOrderStatus = "new" | "cooking" | "ready"

export interface IOrder {
	id: string
	items: IMenuItem[]
	totalSum: number
	status: TOrderStatus
	createdAt: string
	acceptedAt?: string
	readyAt?: string
	completedAt?: string
}

export interface IState {
	showCart: boolean
	showModal: boolean
	tacos: ICategoryBlock[]
	cart: IMenuItem[]
	orders: IOrder[]
	history: IOrder[]
	toggleBurgerMenu: boolean
}

export interface IAction {
	type: string
	payload?: any
}