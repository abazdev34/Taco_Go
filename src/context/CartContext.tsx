import {
	createContext,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import type { IMenuItem } from '../types/order'

type TCartItem = IMenuItem & {
	quantity?: number
}

type TCartContextValue = {
	cart: TCartItem[]
	cartOpen: boolean
	setCartOpen: React.Dispatch<React.SetStateAction<boolean>>
	totalItems: number
	totalSum: number
	addToCart: (item: TCartItem) => void
	removeFromCart: (item: TCartItem) => void
	clearCart: () => void
}

const CartContext = createContext<TCartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
	const [cart, setCart] = useState<TCartItem[]>([])
	const [cartOpen, setCartOpen] = useState(false)

	const totalItems = useMemo(
		() => cart.reduce((acc, item) => acc + (item.quantity || 1), 0),
		[cart],
	)

	const totalSum = useMemo(
		() =>
			cart.reduce(
				(acc, item) => acc + Number(item.price || 0) * (item.quantity || 1),
				0,
			),
		[cart],
	)

	const addToCart = (item: TCartItem) => {
		setCart((prev) => {
			const existing = prev.find((p) => p.id === item.id)

			if (existing) {
				return prev.map((p) =>
					p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p,
				)
			}

			return [...prev, { ...item, quantity: 1 }]
		})
	}

	const removeFromCart = (item: TCartItem) => {
		setCart((prev) =>
			prev
				.map((p) =>
					p.id === item.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p,
				)
				.filter((p) => (p.quantity || 0) > 0),
		)
	}

	const clearCart = () => {
		setCart([])
		setCartOpen(false)
	}

	return (
		<CartContext.Provider
			value={{
				cart,
				cartOpen,
				setCartOpen,
				totalItems,
				totalSum,
				addToCart,
				removeFromCart,
				clearCart,
			}}
		>
			{children}
		</CartContext.Provider>
	)
}

export function useCart() {
	const context = useContext(CartContext)
	if (!context) {
		throw new Error('useCart must be used inside CartProvider')
	}
	return context
}
