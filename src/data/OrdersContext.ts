import { createContext, useContext } from 'react'
import type { CustomerOrder } from '../types'

export interface OrdersContextValue {
  orders: CustomerOrder[]
  activeCount: number
  loading: boolean
  error: string | null
  /** Vuelve a consultar /api/orders (util tras crear una orden). */
  refresh: () => Promise<void>
  /** Inserta el pedido recien creado sin esperar un GET (contador inmediato). */
  addOptimistic: (order: CustomerOrder) => void
}

export const OrdersContext = createContext<OrdersContextValue | null>(null)

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders debe usarse dentro de OrdersProvider.')
  }
  return context
}
