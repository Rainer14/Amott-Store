import { createContext } from 'react'
import type { CartLine } from '../types'

export interface LastAdded {
  name: string
  nonce: number
}

export interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  isOpen: boolean
  lastAdded: LastAdded | null
  add: (productId: string) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
  open: () => void
  close: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
