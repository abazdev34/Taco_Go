/** @format */
import { actionTypeKeys } from "./actionTypes/actionTypes"
import { IAction, IState, IOrder } from "./actionTypes/types"
import { tacosData } from "./tacosData/tacosData"

const initialState: IState = {
	showCart: false,
	showModal: false,
	tacos: tacosData,
	cart: [],
	orders: [], 
    history: [], // Жабылган заказдар ушул жерге түшөт
	toggleBurgerMenu: false,
}

const rootReducer = (state = initialState, action: IAction): IState => {
	switch (action.type) {
		case actionTypeKeys.CREATE_ORDER:
			return {
				...state,
				// Жаңы заказга бош readyItems массивин кошуп баштайбыз
				orders: [{ ...action.payload, readyItems: [] } as any, ...state.orders], 
				cart: [], 
			}

		case "MOVE_TO_READY": {
			const { orderId, item } = (action as any).payload;
			return {
				...state,
				orders: state.orders.map(order => {
					if (order.id === orderId) {
						// 1. "Даярдоо керек" тизмесинен санын азайтуу
						const updatedItems = order.items.map((i: any) => 
							i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
						).filter((i: any) => i.quantity > 0);

						// 2. "Даяр болду" тизмесине кошуу
						const readyList = (order as any).readyItems || [];
						const alreadyInReady = readyList.find((i: any) => i.id === item.id);
						
						const updatedReadyItems = alreadyInReady 
							? readyList.map((i: any) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
							: [...readyList, { ...item, quantity: 1 }];

						return { ...order, items: updatedItems, readyItems: updatedReadyItems };
					}
					return order;
				})
			};
		}

		case actionTypeKeys.UPDATE_ORDER_STATUS: {
            // Тарыхка жылдыруу логикасы
            const orderToHistory = state.orders.find(o => o.id === action.payload.id);
            if (!orderToHistory) return state;

			return {
				...state,
				// Заказды тарыхка кошуу + бүткөн убактысын жазуу
				history: [{ ...orderToHistory, completedAt: new Date().toLocaleTimeString() }, ...state.history],
				// Активдүү заказдардан өчүрүү
				orders: state.orders.filter(order => order.id !== action.payload.id)
			};
        }

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
					item.id === payload.id ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 } : item
				)
				.filter(item => item.quantity > 0)
			return { ...state, cart: updatedCart }
		}

		case actionTypeKeys.TOGGLE_CART:
			return { ...state, showCart: !state.showCart }

		default:
			return state
	}
}

export default rootReducer
