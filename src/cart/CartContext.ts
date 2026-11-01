import { createContext } from 'react'
import type { CartLine } from '../types'

export interface LastAdded {
  name: string
  nonce: number
  customerId: string
}

export interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  loading: boolean
  error: string | null
  isOpen: boolean
  lastAdded: LastAdded | null
  add: (productId: string) => Promise<void>
  remove: (productId: string) => Promise<void>
  setQty: (productId: string, qty: number) => Promise<void>
  clear: () => Promise<void>
  refresh: () => Promise<void>
  open: () => void
  close: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)
