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
  price: number
  description: string
  fullDescription?: string
  brand: string | null
  imageUrl: string | null
}

export interface CartLine {
  productId: string
  qty: number
}

export interface Category {
  id: string
  label: string
  /** Productos activos en la categoria (`todo` = catalogo completo). */
  count: number
}
