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

export interface Category {
  id: string
  label: string
  /** Productos activos en la categoria (`todo` = catalogo completo). */
  count: number
}
