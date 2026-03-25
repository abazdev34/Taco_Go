/** @format */
import { actionTypeKeys } from "./actionTypes"

export interface ITaco {
	id: string
	img: string
	title: string
	measure: string
	price: number
	description: string
	quantity: number
}

export interface ITacos {
	id: string
	title: string
	tacoCategory: ITaco[]
}

// Заказдын структурасы (Ашкана үчүн)
export interface IOrder {
	id: string
	items: ITaco[]
	totalSum: number
	personCount: number
	status: 'pending' | 'cooking' | 'ready'
	createdAt: string
}

export interface IState {
	showModal: boolean
	tacos: ITacos[]
	toggleBurgerMenu: boolean
	showCart: boolean
	cart: ITaco[]
	orders: IOrder[] // Бардык заказдар тизмеси
}

export interface IAddToCart {
	type: typeof actionTypeKeys.ADD_TO_CART
	payload: ITaco
}

export interface IRemoveFromCart {
	type: typeof actionTypeKeys.REMOVE_FROM_CART
	payload: ITaco
}

interface ICreateOrder {
	type: typeof actionTypeKeys.CREATE_ORDER
	payload: IOrder
}

interface IUpdateOrderStatus {
	type: typeof actionTypeKeys.UPDATE_ORDER_STATUS
	payload: { id: string; status: string }
}

interface IClearCart { type: typeof actionTypeKeys.CLEAR_CART }
interface IToggleCart { type: typeof actionTypeKeys.TOGGLE_CART }
interface IToggleModal { type: typeof actionTypeKeys.TOGGLE_MODAL }
interface IToggleBurgerMenu { type: typeof actionTypeKeys.TOGGLE_BURGER_MENU }

export type IAction =

	| IAddToCart
	| IRemoveFromCart
	| ICreateOrder

	| IUpdateOrderStatus
	| IClearCart
	| IToggleCart

	| IToggleModal
	| IToggleBurgerMenu
