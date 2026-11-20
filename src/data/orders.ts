import { apiUrl } from '../lib/api'
import { HttpRequestError } from '../lib/userFacingError'
import type {
  CustomerOrder,
  CustomerOrderDetail,
  CustomerOrderItem,
} from '../types'

/** Tope del endpoint (el backend admite como maximo 100 por pagina). */
const ORDERS_PAGE_SIZE = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** El detalle puede venir envuelto en `data` o directo, segun el endpoint. */
function unwrapData(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {}
  return isRecord(payload.data) ? payload.data : payload
}

function asOrders(value: unknown): CustomerOrder[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(
    (item): item is CustomerOrder =>
      isRecord(item) && typeof item.id === 'string' && typeof item.total === 'number',
  )
}

/** Pedido activo = aun no entregado ni cancelado (misma regla del panel). */
export function isActiveOrder(order: CustomerOrder) {
  return order.status !== 'delivered' && order.status !== 'cancelled'
}

/**
 * El checkout devuelve el detalle completo; lo convertimos al resumen que
 * usa el contador del header sin esperar un GET adicional.
 */
export function toCustomerOrder(value: unknown): CustomerOrder | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.total !== 'number') return null
  const status = typeof value.status === 'string' ? value.status : 'created'
  const items = Array.isArray(value.items) ? value.items : []
  return {
    id: value.id,
    status: status as CustomerOrder['status'],
    payment_status: (typeof value.payment_status === 'string'
      ? value.payment_status
      : 'unpaid') as CustomerOrder['payment_status'],
    payment_method: (typeof value.payment_method === 'string'
      ? value.payment_method
      : 'bolivares') as CustomerOrder['payment_method'],
    total: value.total,
    item_count:
      typeof value.item_count === 'number' ? value.item_count : items.length,
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
  }
}

function asOrderItem(value: unknown): CustomerOrderItem | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return null
  return {
    id: value.id,
    product_id: typeof value.product_id === 'string' ? value.product_id : null,
    name: value.name,
    sku: typeof value.sku === 'string' && value.sku.trim() ? value.sku : null,
    unit_price: typeof value.unit_price === 'number' ? value.unit_price : 0,
    quantity: typeof value.quantity === 'number' ? value.quantity : 0,
    line_total: typeof value.line_total === 'number' ? value.line_total : 0,
    image_url:
      typeof value.image_url === 'string' && value.image_url.trim()
        ? value.image_url
        : null,
  }
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
  const data = unwrapData(payload)
  const orders = asOrders(data.items) ?? asOrders(data.orders) ?? asOrders(data)
  return orders ?? []
}

/** Detalle de una orden propia (GET /api/orders/:id) para la vista tipo PDP. */
export async function fetchOrderDetail(
  id: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CustomerOrderDetail> {
  const response = await fetch(
    apiUrl(`/api/orders/${encodeURIComponent(id)}`),
    {
      method: 'GET',
      credentials: 'include',
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) throw new HttpRequestError(response.status)

  const data = unwrapData(await response.json())
  const summary = toCustomerOrder(data)
  if (!summary) {
    throw new HttpRequestError(500, undefined, 'Respuesta de pedido inválida')
  }

  const shipping = isRecord(data.shipping) ? data.shipping : {}
  const rawItems = Array.isArray(data.items) ? data.items : []
  return {
    ...summary,
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : summary.total,
    shipping_cost: typeof data.shipping_cost === 'number' ? data.shipping_cost : 0,
    tax_amount: typeof data.tax_amount === 'number' ? data.tax_amount : 0,
    notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes : null,
    shipping: {
      name: typeof shipping.name === 'string' ? shipping.name : null,
      address: typeof shipping.address === 'string' ? shipping.address : null,
      city: typeof shipping.city === 'string' ? shipping.city : null,
      phone: typeof shipping.phone === 'string' ? shipping.phone : null,
      address_id:
        typeof shipping.address_id === 'string' ? shipping.address_id : null,
    },
    items: rawItems
      .map(asOrderItem)
      .filter((item): item is CustomerOrderItem => item !== null),
  }
}
