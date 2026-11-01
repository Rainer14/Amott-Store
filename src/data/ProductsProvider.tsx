import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category, Product } from '../types'
import { getUserFacingError } from '../lib/userFacingError'
import { ProductsContext } from './ProductsContext'
import { fetchProductsPage } from './products'

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([
    { id: 'todo', label: 'Todo' },
  ])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const loadedPage = useRef(0)
  const hasMoreRef = useRef(false)
  const requestInFlight = useRef(false)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const requestController = new AbortController()
    controller.current = requestController

    async function loadProducts() {
      try {
        const result = await fetchProductsPage(1, requestController.signal)
        setProducts(result.products)
        setCategories(result.categories)
        loadedPage.current = result.page
        hasMoreRef.current = result.page < result.totalPages
        setHasMore(hasMoreRef.current)
        setTotalProducts(result.total)
        setError(null)
      } catch (cause) {
        if (requestController.signal.aborted) return
        setError(getUserFacingError(cause, 'catalog'))
      } finally {
        if (!requestController.signal.aborted) setLoading(false)
      }
    }

    void loadProducts()
    return () => {
      requestController.abort()
      controller.current = null
    }
  }, [])

  const loadMore = useCallback(async () => {
    const activeController = controller.current
    if (
      !activeController ||
      activeController.signal.aborted ||
      requestInFlight.current ||
      !hasMoreRef.current
    ) {
      return
    }

    requestInFlight.current = true
    setLoadingMore(true)
    setLoadMoreError(null)

    try {
      const nextPage = loadedPage.current + 1
      const result = await fetchProductsPage(
        nextPage,
        activeController.signal,
      )
      if (activeController.signal.aborted) return

      setProducts((current) => {
        const currentIds = new Set(current.map((product) => product.id))
        return [
          ...current,
          ...result.products.filter((product) => !currentIds.has(product.id)),
        ]
      })
      setCategories((current) => {
        const knownIds = new Set(current.map((category) => category.id))
        return [
          ...current,
          ...result.categories.filter(
            (category) => category.id !== 'todo' && !knownIds.has(category.id),
          ),
        ]
      })
      loadedPage.current = result.page
      hasMoreRef.current = result.page < result.totalPages
      setHasMore(hasMoreRef.current)
      setTotalProducts(result.total)
    } catch (cause) {
      if (activeController.signal.aborted) return
      setLoadMoreError(getUserFacingError(cause, 'catalog'))
    } finally {
      requestInFlight.current = false
      if (!activeController.signal.aborted) setLoadingMore(false)
    }
  }, [])

  return (
    <ProductsContext.Provider
      value={{
        products,
        categories,
        loading,
        loadingMore,
        error,
        loadMoreError,
        hasMore,
        totalProducts,
        loadMore,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}
