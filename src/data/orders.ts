import { apiUrl } from '../lib/api'
import { HttpRequestError } from '../lib/userFacingError'
import type { CustomerOrder } from '../types'

/** Tope del endpoint (el backend admite como maximo 100 por pagina). */
const ORDERS_PAGE_SIZE = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asOrders(value: unknown): CustomerOrder[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(
    (item): item is CustomerOrder =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.status === 'string' &&
      typeof item.total === 'number',
  )
}

/** Pedidos propios del cliente; requiere el access token de la sesion. */
export async function fetchMyOrders(
  accessToken: string,
  signal?: AbortSignal,
): Promise<CustomerOrder[]> {
  const response = await fetch(
    apiUrl(`/api/orders?page=1&limit=${ORDERS_PAGE_SIZE}`),
    {
      method: 'GET',
      credentials: 'include',
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) throw new HttpRequestError(response.status)

  const payload: unknown = await response.json()
  const data: Record<string, unknown> = isRecord(payload)
    ? isRecord(payload.data)
      ? payload.data
      : payload
    : {}
  const orders = asOrders(data.items) ?? asOrders(data.orders) ?? asOrders(data)
  return orders ?? []
}
