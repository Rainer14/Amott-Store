import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { getUserFacingError } from '../lib/userFacingError'
import type { CustomerOrder } from '../types'
import { OrdersContext, type OrdersContextValue } from './OrdersContext'
import { fetchMyOrders, isActiveOrder } from './orders'

const NO_ORDERS: CustomerOrder[] = []

/**
 * Comparte los pedidos del cliente entre el header (contador), Mi cuenta y
 * el checkout. Tras crear una orden se inserta el resumen devuelto por la API
 * para que el badge cambie en el mismo instante, sin esperar otro GET.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const { customer, accessToken } = useAuth()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer || !accessToken) return

    const controller = new AbortController()
    void fetchMyOrders(accessToken, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setOrders(items)
        setOwnerId(customer.id)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setOrders([])
        setOwnerId(customer.id)
        setError(getUserFacingError(cause, 'orders'))
      })

    return () => controller.abort()
  }, [customer, accessToken])

  const refresh = useCallback(async () => {
    if (!customer || !accessToken) return
    const items = await fetchMyOrders(accessToken)
    setOrders(items)
    setOwnerId(customer.id)
    setError(null)
  }, [accessToken, customer])

  const addOptimistic = useCallback(
    (order: CustomerOrder) => {
      if (!customer) return
      setOwnerId(customer.id)
      setOrders((current) =>
        current.some((item) => item.id === order.id)
          ? current
          : [order, ...current],
      )
      setError(null)
    },
    [customer],
  )

  // Si la sesión cambia, no mostramos los pedidos del usuario anterior
  // mientras llega la respuesta del nuevo.
  const visibleOrders =
    customer && ownerId === customer.id ? orders : NO_ORDERS
  const activeCount = useMemo(
    () => visibleOrders.filter(isActiveOrder).length,
    [visibleOrders],
  )

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders: visibleOrders,
      activeCount,
      loading: Boolean(customer && ownerId !== customer.id),
      error: customer && ownerId === customer.id ? error : null,
      refresh,
      addOptimistic,
    }),
    [
      visibleOrders,
      activeCount,
      customer,
      ownerId,
      error,
      refresh,
      addOptimistic,
    ],
  )

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  )
}
