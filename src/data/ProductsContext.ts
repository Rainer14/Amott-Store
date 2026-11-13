import { createContext, useContext } from 'react'
import type { Category, Product } from '../types'

export interface ProductsContextValue {
  /** Resultados de la pagina 1 para la busqueda y categoria actuales. */
  products: Product[]
  /** Todos los productos vistos en esta sesion (carrito y recomendaciones). */
  cachedProducts: Product[]
  categories: Category[]
  categoryCounts: Record<string, number>
  loading: boolean
  loadingMore: boolean
  error: string | null
  loadMoreError: string | null
  hasMore: boolean
  totalProducts: number
  loadMore: () => Promise<void>
  /** Texto del buscador (sin debounce). */
  query: string
  setQuery: (value: string) => void
  /** UUID de la categoria activa; `todo` no filtra. */
  categoryId: string
  setCategoryId: (value: string) => void
  /** Hay una busqueda/categoria pendiente de aplicar. */
  isPending: boolean
  findProduct: (id: string) => Product | undefined
  rememberProduct: (product: Product) => void
}

export const ProductsContext = createContext<ProductsContextValue | null>(null)

export function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts debe usarse dentro de ProductsProvider.')
  }
  return context
}
