import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { IMenuItem } from '../types/order'

type TCartItem = IMenuItem & {
  quantity?: number
}

type TCartContextValue = {
  cart: TCartItem[]
  cartOpen: boolean
  setCartOpen: Dispatch<SetStateAction<boolean>>
  totalItems: number
  totalSum: number
  addToCart: (item: TCartItem) => void
  removeFromCart: (item: TCartItem) => void
  clearCart: () => void
}

const CART_STORAGE_KEY = 'burritos_cart'

const CartContext = createContext<TCartContextValue | undefined>(undefined)

function readSavedCart(): TCartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeCartItem(item: TCartItem): TCartItem {
  return {
    ...item,
    quantity: Math.max(1, Number(item.quantity || 1)),
    price: Number(item.price || 0),
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<TCartItem[]>(() => readSavedCart())
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.quantity || 1), 0),
    [cart]
  )

  const totalSum = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
        0
      ),
    [cart]
  )

  const addToCart = (item: TCartItem) => {
    const safeItem = normalizeCartItem(item)

    setCart(prev => {
      const existing = prev.find(p => p.id === safeItem.id)

      if (existing) {
        return prev.map(p =>
          p.id === safeItem.id
            ? { ...p, quantity: Number(p.quantity || 1) + 1 }
            : p
        )
      }

      return [...prev, { ...safeItem, quantity: 1 }]
    })
  }

  const removeFromCart = (item: TCartItem) => {
    setCart(prev =>
      prev
        .map(p =>
          p.id === item.id
            ? { ...p, quantity: Number(p.quantity || 1) - 1 }
            : p
        )
        .filter(p => Number(p.quantity || 0) > 0)
    )
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem(CART_STORAGE_KEY)
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