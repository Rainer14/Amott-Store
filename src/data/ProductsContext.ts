import { createContext, useContext } from 'react'
import type { Category, Product } from '../types'

export interface ProductsContextValue {
  products: Product[]
  categories: Category[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  loadMoreError: string | null
  hasMore: boolean
  totalProducts: number
  loadMore: () => Promise<void>
}

export const ProductsContext = createContext<ProductsContextValue | null>(null)

export function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts debe usarse dentro de ProductsProvider.')
  }
  return context
}
