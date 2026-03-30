/** @format */

import { actionTypeKeys } from "./actionTypes/actionTypes"
import { IAction, IOrder, IState } from "./actionTypes/types"
import { tacosData } from "./tacosData/tacosData"

const initialState: IState = {
	showCart: false,
	showModal: false,
	tacos: tacosData,
	cart: [],
	orders: [],
	history: [],
	toggleBurgerMenu: false,
}

const rootReducer = (state = initialState, action: IAction): IState => {
	switch (action.type) {
		case actionTypeKeys.ADD_TO_CART: {
			const payload = action.payload
			if (!payload) return state

			const isAdded = state.cart.find((el) => el.id === payload.id)

			if (isAdded) {
				return {
					...state,
					cart: state.cart.map((el) =>
						el.id === payload.id
							? { ...el, quantity: (el.quantity || 1) + 1 }
							: el
					),
				}
			}

			return {
				...state,
				cart: [...state.cart, { ...payload, quantity: 1 }],
			}
		}

		case actionTypeKeys.REMOVE_FROM_CART: {
			const payload = action.payload
			if (!payload) return state

			return {
				...state,
				cart: state.cart
					.map((item) =>
						item.id === payload.id
							? {
									...item,
									quantity:
										(item.quantity || 1) > 1 ? (item.quantity || 1) - 1 : 0,
							  }
							: item
					)
					.filter((item) => (item.quantity || 0) > 0),
			}
		}

		case actionTypeKeys.CLEAR_CART:
			return {
				...state,
				cart: [],
			}

		case actionTypeKeys.CREATE_ORDER: {
			if (!action.payload) return state

			const nextOrder: IOrder = {
				...action.payload,
				status: "new",
			}

			return {
				...state,
				orders: [nextOrder, ...state.orders],
				cart: [],
			}
		}

		case actionTypeKeys.ACCEPT_ORDER_TO_KITCHEN:
			if (!action.payload) return state

			return {
				...state,
				orders: state.orders.map((order) =>
					order.id === action.payload.id
						? {
								...order,
								status: "cooking",
								acceptedAt: new Date().toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								}),
						  }
						: order
				),
			}

		case actionTypeKeys.MARK_ORDER_READY:
			if (!action.payload) return state

			return {
				...state,
				orders: state.orders.map((order) =>
					order.id === action.payload.id
						? {
								...order,
								status: "ready",
								readyAt: new Date().toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								}),
						  }
						: order
				),
			}

		case actionTypeKeys.COMPLETE_ORDER: {
			if (!action.payload) return state

			const orderToHistory = state.orders.find((o) => o.id === action.payload.id)
			if (!orderToHistory) return state

			return {
				...state,
				history: [
					{
						...orderToHistory,
						completedAt: new Date().toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						}),
					},
					...state.history,
				],
				orders: state.orders.filter((order) => order.id !== action.payload.id),
			}
		}

		case actionTypeKeys.TOGGLE_CART:
			return {
				...state,
				showCart: !state.showCart,
			}

		default:
			return state
	}
}

export default rootReducer