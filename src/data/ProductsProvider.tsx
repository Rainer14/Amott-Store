import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Category, Product } from '../types'
import { getUserFacingError } from '../lib/userFacingError'
import { ProductsContext } from './ProductsContext'
import { fetchCategories, fetchProductsPage, type ProductQuery } from './products'

/** Espera antes de consultar la API mientras se escribe. */
const SEARCH_DEBOUNCE_MS = 220

function queryFromLocation() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? ''
}

function requestKey(categoryId: string, search: string) {
  return `${categoryId}\u0000${search}`
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([
    { id: 'todo', label: 'Todo', count: 0 },
  ])
  const [query, setQuery] = useState(queryFromLocation)
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [categoryId, setCategoryId] = useState('todo')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [appliedKey, setAppliedKey] = useState('')

  const loadedPage = useRef(0)
  const hasMoreRef = useRef(false)
  const requestInFlight = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const requestKeyRef = useRef('')
  const appliedKeyRef = useRef('')
  const activeQuery = useRef<ProductQuery>({})

  // Cache de todos los productos vistos: el carrito y el detalle los usan
  // aunque la pagina actual ya no los muestre.
  const cache = useRef(new Map<string, Product>())
  const [cachedProducts, setCachedProducts] = useState<Product[]>([])

  const rememberMany = useCallback((items: Product[]) => {
    let changed = false
    for (const product of items) {
      if (cache.current.get(product.id) !== product) {
        cache.current.set(product.id, product)
        changed = true
      }
    }
    if (changed) setCachedProducts(Array.from(cache.current.values()))
  }, [])

  const rememberProduct = useCallback((product: Product) => {
    if (cache.current.get(product.id) === product) return
    cache.current.set(product.id, product)
    setCachedProducts(Array.from(cache.current.values()))
  }, [])

  const productsById = useMemo(
    () => new Map(cachedProducts.map((product) => [product.id, product])),
    [cachedProducts],
  )
  const findProduct = useCallback(
    (id: string) => productsById.get(id),
    [productsById],
  )

  // Busqueda con retardo: cada tecla actualiza `query`, pero la API solo se
  // consulta cuando el usuario deja de escribir.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === debouncedQuery) return
    const timeout = window.setTimeout(
      () => setDebouncedQuery(trimmed),
      SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [query, debouncedQuery])

  // Categorias del catalogo completo (independientes de la busqueda).
  useEffect(() => {
    const requestController = new AbortController()
    void fetchCategories(requestController.signal)
      .then((result) => {
        if (requestController.signal.aborted) return
        setCategories(result)
      })
      .catch(() => {
        // Sin categorias se mantiene "Todo"; el catalogo sigue funcionando.
      })
    return () => requestController.abort()
  }, [])

  // Reinicia el listado cada vez que cambia la busqueda o la categoria.
  useEffect(() => {
    const requestController = new AbortController()
    controller.current = requestController

    const key = requestKey(categoryId, debouncedQuery)
    requestKeyRef.current = key
    const params: ProductQuery = {
      search: debouncedQuery || undefined,
      categoryId: categoryId === 'todo' ? undefined : categoryId,
    }
    activeQuery.current = params

    async function loadProducts() {
      setLoading(true)
      setError(null)
      setLoadMoreError(null)

      try {
        const result = await fetchProductsPage(1, requestController.signal, params)
        if (requestController.signal.aborted) return

        setProducts(result.products)
        rememberMany(result.products)
        loadedPage.current = result.page
        hasMoreRef.current = result.page < result.totalPages
        setHasMore(hasMoreRef.current)
        setTotalProducts(result.total)
        appliedKeyRef.current = key
        setAppliedKey(key)
      } catch (cause) {
        if (requestController.signal.aborted) return
        setProducts([])
        setError(getUserFacingError(cause, 'catalog'))
        hasMoreRef.current = false
        setHasMore(false)
        setTotalProducts(0)
        appliedKeyRef.current = key
        setAppliedKey(key)
      } finally {
        if (!requestController.signal.aborted) setLoading(false)
      }
    }

    void loadProducts()
    return () => {
      requestController.abort()
      if (controller.current === requestController) controller.current = null
    }
  }, [categoryId, debouncedQuery, rememberMany])

  const loadMore = useCallback(async () => {
    const activeController = controller.current
    if (
      !activeController ||
      activeController.signal.aborted ||
      requestInFlight.current ||
      !hasMoreRef.current ||
      appliedKeyRef.current !== requestKeyRef.current
    ) {
      return
    }

    requestInFlight.current = true
    setLoadingMore(true)
    setLoadMoreError(null)

    try {
      const result = await fetchProductsPage(
        loadedPage.current + 1,
        activeController.signal,
        activeQuery.current,
      )
      if (activeController.signal.aborted) return

      setProducts((current) => {
        const currentIds = new Set(current.map((product) => product.id))
        return [
          ...current,
          ...result.products.filter((product) => !currentIds.has(product.id)),
        ]
      })
      rememberMany(result.products)
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
  }, [rememberMany])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todo: 0 }
    let total = 0
    for (const category of categories) {
      if (category.id === 'todo') continue
      counts[category.id] = category.count
      total += category.count
    }
    // Si la lista de categorias no cargo, se usa el total del listado actual.
    counts.todo = total > 0 ? total : totalProducts
    return counts
  }, [categories, totalProducts])

  const isPending =
    loading ||
    query.trim() !== debouncedQuery ||
    appliedKey !== requestKey(categoryId, debouncedQuery)

  return (
    <ProductsContext.Provider
      value={{
        products,
        cachedProducts,
        categories,
        categoryCounts,
        loading,
        loadingMore,
        error,
        loadMoreError,
        hasMore,
        totalProducts,
        loadMore,
        query,
        setQuery,
        categoryId,
        setCategoryId,
        isPending,
        findProduct,
        rememberProduct,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}
