export type CategoryFilter = string

export type SpecimenKind =
  | 'ammonite'
  | 'trilobite'
  | 'tooth'
  | 'vertebra'
  | 'loupe'
  | 'notebook'
  | 'amber'
  | 'print'

export interface Product {
  id: string
  sku: string
  slug: string
  name: string
  /** Slug de la categoria (clases CSS y enlaces). */
  category: string
  /** UUID de la categoria (filtro del backend). */
  categoryId: string
  categoryName: string
  /** Precio principal (minorista / precio 1). */
  price: number
  /** Precios adicionales para clientes al por mayor (p. ej. niveles 2 y 3). */
  wholesalePrices?: number[]
  description: string
  fullDescription?: string
  brand: string | null
  imageUrl: string | null
}

export interface CartLine {
  productId: string
  qty: number
}

export type OrderStatus =
  | 'created'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'partial'
  | 'failed'
  | 'refunded'

/** Resumen que GET /api/orders devuelve al cliente autenticado. */
export interface CustomerOrder {
  id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: 'bolivares' | 'usdt' | 'usd'
  total: number
  item_count: number
  created_at: string
}

/** Linea del detalle: nombre/precio son snapshot; image_url se resuelve al leer. */
export interface CustomerOrderItem {
  id: string
  product_id: string | null
  name: string
  sku: string | null
  unit_price: number
  quantity: number
  line_total: number
  image_url: string | null
}

/** Respuesta de GET /api/orders/:id (y del checkout) para la PDP del pedido. */
export interface CustomerOrderDetail extends CustomerOrder {
  subtotal: number
  shipping_cost: number
  tax_amount: number
  notes: string | null
  shipping: {
    name: string | null
    address: string | null
    city: string | null
    phone: string | null
    address_id: string | null
  }
  items: CustomerOrderItem[]
}

export interface Category {
  id: string
  label: string
  /** Productos activos en la categoria (`todo` = catalogo completo). */
  count: number
}
