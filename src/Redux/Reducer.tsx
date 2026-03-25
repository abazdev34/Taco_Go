/** @format */
import { actionTypeKeys } from "./actionTypes/actionTypes"
import { IAction, IState, IOrder } from "./actionTypes/types"
import { tacosData } from "./tacosData/tacosData"

const initialState: IState = {
	showCart: false,
	showModal: false,
	tacos: tacosData,
	cart: [],
	orders: [], // Баштапкы бош массив
	toggleBurgerMenu: false,
}

const rootReducer = (state = initialState, action: IAction): IState => {
	switch (action.type) {
		case actionTypeKeys.ADD_TO_CART: {
			const payload = (action as any).payload
			const isAdded = state.cart.find(el => el.id === payload.id)
			if (isAdded) {
				return {
					...state,
					cart: state.cart.map(el =>
						el.id === payload.id ? { ...el, quantity: el.quantity + 1 } : el
					),
				}
			}
			return { ...state, cart: [...state.cart, { ...payload, quantity: 1 }] }
		}

		case actionTypeKeys.REMOVE_FROM_CART: {
			const payload = (action as any).payload
			const updatedCart = state.cart
				.map(item =>
					item.id === payload.id
						? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 }
						: item
				)
				.filter(item => item.quantity > 0)
			return { ...state, cart: updatedCart }
		}

		case actionTypeKeys.CREATE_ORDER:
			return {
				...state,
				orders: [...state.orders, action.payload as IOrder], // Заказды кошуу
				cart: [], // Корзинаны тазалоо
			}

		case actionTypeKeys.UPDATE_ORDER_STATUS: {
			const { id, status } = (action as any).payload
			return {
				...state,
				orders: state.orders.map(order =>
					order.id === id ? { ...order, status: status as any } : order
				),
			}
		}

		case actionTypeKeys.CLEAR_CART:
			return { ...state, cart: [] }

		case actionTypeKeys.TOGGLE_CART:
			return { ...state, showCart: !state.showCart }

		case actionTypeKeys.TOGGLE_MODAL:
			return { ...state, showModal: !state.showModal }

		case actionTypeKeys.TOGGLE_BURGER_MENU:
			return { ...state, toggleBurgerMenu: !state.toggleBurgerMenu }

		default:
			return state
	}
}

export default rootReducer
