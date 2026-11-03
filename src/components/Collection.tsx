import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { fetchProductsPage } from '../data/products'
import { useProducts } from '../data/ProductsContext'
import type { CategoryFilter, Product } from '../types'
import {
  clearCatalogSnapshot,
  readCatalogSnapshot,
} from '../lib/catalogNavigation'
import { formatPrice } from '../lib/format'
import { getUserFacingError } from '../lib/userFacingError'
import { ProductCard } from './ProductCard'

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function matchesSearch(product: Product, query: string) {
  return [product.name, product.sku, product.slug].some((value) =>
    normalizeSearchText(value).includes(query),
  )
}

async function fetchCatalogSearchPage(
  page: number,
  signal: AbortSignal,
  query: string,
) {
  const isSlugQuery = /[-_]/.test(query)
  const words = query
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
  const usePrefixFallback = query.length > 48 || words.length > 6
  const fallbackSearchTerm = usePrefixFallback
    ? words.slice(0, 3).join(' ')
    : words.join(' ')
  const fetchFilteredFallback = async () => {
    const fallback = await fetchProductsPage(
      page,
      signal,
      fallbackSearchTerm,
    )
    return {
      ...fallback,
      products: fallback.products.filter((product) =>
        matchesSearch(product, normalizeSearchText(query)),
      ),
      searchTerm: fallbackSearchTerm,
      filteredFallback: true,
    }
  }

  if (usePrefixFallback) {
    return fetchFilteredFallback()
  }

  if (!isSlugQuery) {
    const result = await fetchProductsPage(page, signal, query)
    return { ...result, searchTerm: query, filteredFallback: false }
  }

  try {
    const result = await fetchProductsPage(page, signal, query)
    if (result.products.length > 0) {
      return { ...result, searchTerm: query, filteredFallback: false }
    }
  } catch (cause) {
    if (signal.aborted) throw cause
  }

  return fetchFilteredFallback()
}

export function Collection() {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const [catalogSnapshot] = useState(() => readCatalogSnapshot(returnTo))
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const normalizedSearch = normalizeSearchText(searchQuery)
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchResultQuery, setSearchResultQuery] = useState('')
  const [searchApiQuery, setSearchApiQuery] = useState('')
  const [searchUsesFilteredFallback, setSearchUsesFilteredFallback] =
    useState(false)
  const [searchLoadingQuery, setSearchLoadingQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchErrorQuery, setSearchErrorQuery] = useState('')
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [searchPage, setSearchPage] = useState(0)
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  const [searchMoreError, setSearchMoreError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CategoryFilter>(
    catalogSnapshot?.filter ?? 'todo',
  )
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    catalogSnapshot?.selectedBrands ?? [],
  )
  const [maxPrice, setMaxPrice] = useState<number | null>(
    catalogSnapshot?.maxPrice ?? null,
  )
  const [filtersExpanded, setFiltersExpanded] = useState(
    catalogSnapshot?.filtersExpanded ??
      (typeof window === 'undefined' ||
      !window.matchMedia('(max-width: 560px)').matches),
  )
  const restoredScroll = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const searchControllerRef = useRef<AbortController | null>(null)
  const searchMoreInFlight = useRef(false)
  const {
    products,
    categories,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    totalProducts,
    loadMore,
  } = useProducts()

  useEffect(() => {
    if (!normalizedSearch) {
      searchControllerRef.current?.abort()
      return
    }

    const controller = new AbortController()
    searchControllerRef.current = controller
    const timeout = window.setTimeout(() => {
      setSearchLoadingQuery(normalizedSearch)
      setSearchError(null)
      setSearchMoreError(null)

      void fetchCatalogSearchPage(1, controller.signal, searchQuery)
        .then((result) => {
          if (controller.signal.aborted) return
          setSearchResults(result.products)
          setSearchResultQuery(normalizedSearch)
          setSearchApiQuery(result.searchTerm)
          setSearchUsesFilteredFallback(result.filteredFallback)
          setSearchPage(result.page)
          setSearchHasMore(result.page < result.totalPages)
          setSearchTotal(result.total)
          setSearchErrorQuery('')
          setSearchLoadingQuery('')
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          setSearchError(getUserFacingError(cause, 'catalog'))
          setSearchErrorQuery(normalizedSearch)
          setSearchLoadingQuery('')
        })
    }, 220)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null
      }
    }
  }, [normalizedSearch, searchQuery])

  const loadMoreSearchResults = useCallback(async () => {
    const controller = searchControllerRef.current
    if (
      !normalizedSearch ||
      searchResultQuery !== normalizedSearch ||
      !searchHasMore ||
      !controller ||
      controller.signal.aborted ||
      searchMoreInFlight.current
    ) {
      return
    }

    searchMoreInFlight.current = true
    setSearchLoadingMore(true)
    setSearchMoreError(null)

    try {
      const result = await fetchProductsPage(
        searchPage + 1,
        controller.signal,
        searchApiQuery,
      )
      if (controller.signal.aborted) return

      setSearchResults((current) => {
        const currentIds = new Set(current.map((product) => product.id))
        const nextProducts = searchUsesFilteredFallback
          ? result.products.filter((product) =>
              matchesSearch(product, normalizedSearch),
            )
          : result.products
        return [
          ...current,
          ...nextProducts.filter((product) => !currentIds.has(product.id)),
        ]
      })
      setSearchPage(result.page)
      setSearchHasMore(result.page < result.totalPages)
      setSearchTotal(result.total)
    } catch (cause) {
      if (controller.signal.aborted) return
      setSearchMoreError(getUserFacingError(cause, 'catalog'))
    } finally {
      searchMoreInFlight.current = false
      if (!controller.signal.aborted) setSearchLoadingMore(false)
    }
  }, [
    normalizedSearch,
    searchApiQuery,
    searchHasMore,
    searchPage,
    searchResultQuery,
    searchUsesFilteredFallback,
  ])

  const searchIsPending =
    Boolean(normalizedSearch) &&
    searchErrorQuery !== normalizedSearch &&
    (searchResultQuery !== normalizedSearch ||
      searchLoadingQuery === normalizedSearch)

  useEffect(() => {
    if (
      !catalogSnapshot ||
      restoredScroll.current ||
      loading ||
      searchIsPending
    ) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, catalogSnapshot.scrollY)
      clearCatalogSnapshot()
      restoredScroll.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [catalogSnapshot, loading, searchIsPending])
  const searchHasNextPage =
    normalizedSearch && searchResultQuery === normalizedSearch
      ? searchHasMore
      : false
  const isLoadingMore =
    normalizedSearch && searchResultQuery === normalizedSearch
      ? searchLoadingMore
      : loadingMore
  const currentLoadMoreError =
    normalizedSearch && searchResultQuery === normalizedSearch
      ? searchMoreError
      : loadMoreError

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (
      !sentinel ||
      loading ||
      isLoadingMore ||
      error ||
      currentLoadMoreError ||
      (normalizedSearch ? !searchHasNextPage : !hasMore)
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          if (normalizedSearch) {
            void loadMoreSearchResults()
          } else {
            void loadMore()
          }
        }
      },
      { rootMargin: '700px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    currentLoadMoreError,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    loadMoreSearchResults,
    loading,
    normalizedSearch,
    searchHasNextPage,
  ])

  const currentProducts = useMemo(() => {
    if (!normalizedSearch) return products
    const results = new Map(
      [...products, ...searchResults]
        .filter((product) => matchesSearch(product, normalizedSearch))
        .map((product) => [product.id, product]),
    )
    if (searchResultQuery === normalizedSearch) {
      for (const product of searchResults) {
        results.set(product.id, product)
      }
    }
    return Array.from(results.values())
  }, [normalizedSearch, products, searchResultQuery, searchResults])
  const priceLimit = useMemo(
    () => Math.max(1, ...currentProducts.map((product) => product.price)),
    [currentProducts],
  )
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          currentProducts
            .map((product) => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [currentProducts],
  )
  const visibleProducts = useMemo(
    () =>
      currentProducts.filter((product) => {
        const matchesCategory =
          filter === 'todo' || product.category === filter
        const matchesBrand =
          selectedBrands.length === 0 ||
          (product.brand !== null &&
            selectedBrands.includes(product.brand.trim()))
        const matchesPrice = maxPrice === null || product.price <= maxPrice
        return (
          matchesCategory && matchesBrand && matchesPrice
        )
      }),
    [currentProducts, filter, maxPrice, selectedBrands],
  )
  const categoryCounts = useMemo(
    () =>
      categories.reduce<Record<string, number>>((counts, category) => {
        counts[category.id] =
          category.id === 'todo'
            ? currentProducts.length
            : currentProducts.filter((product) => product.category === category.id)
                .length
        return counts
      }, {}),
    [categories, currentProducts],
  )
  const hasActiveFilters =
    filter !== 'todo' || selectedBrands.length > 0 || maxPrice !== null

  const toggleBrand = (brand: string) => {
    setSelectedBrands((current) =>
      current.includes(brand)
        ? current.filter((selected) => selected !== brand)
        : [...current, brand],
    )
  }

  const clearFilters = () => {
    setFilter('todo')
    setSelectedBrands([])
    setMaxPrice(null)
  }

  const handleSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (value) {
      nextParams.set('q', value)
    } else {
      nextParams.delete('q')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const clearSearch = () => handleSearchChange('')

  return (
    <section className="collection" id="tienda">
      <div className="container">
        <div className="section-head">
          <h2>Explora nuestros productos</h2>
          <p>
            Encuentra lo que necesitas entre nuestros distintos rubros y
            categorías. Explora el catálogo y elige los productos ideales para
            ti.
          </p>
        </div>

        <div className="collection-search-wrap">
          <form
            className="collection-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sr-only" htmlFor="product-search">
              Buscar productos por nombre, SKU o slug
            </label>
            <svg
              className="collection-search__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="10.8"
                cy="10.8"
                r="6.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="m15.5 15.5 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              id="product-search"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) =>
                handleSearchChange(event.currentTarget.value)
              }
              placeholder="¿Qué estás buscando?"
              aria-describedby="product-search-hint"
            />
            {searchQuery && (
              <button
                className="collection-search__clear"
                type="button"
                onClick={clearSearch}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            )}
            <span
              className="collection-search__hint"
              id="product-search-hint"
            >
              Nombre, SKU o slug
            </span>
          </form>
        </div>

        <p className="sr-only" role="status">
          {!loading && !error
            ? searchIsPending
              ? 'Buscando productos…'
              : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}.`
            : ''}
        </p>

        <div className="collection__layout">
          <aside className="filter-panel" aria-label="Filtros de productos">
            <div className="filter-panel__heading">
              <h3>Filtrar por</h3>
              <button
                type="button"
                className="filter-panel__toggle"
                aria-expanded={filtersExpanded}
                aria-controls="filter-panel-content"
                onClick={() => setFiltersExpanded((expanded) => !expanded)}
              >
                {filtersExpanded ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {filtersExpanded && (
              <div id="filter-panel-content" className="filter-panel__content">
                <section className="filter-group" aria-labelledby="category-filter-heading">
                  <h4 id="category-filter-heading">Categoría</h4>
                  <div className="filter-options" role="group" aria-label="Categoría">
                    {categories.map((category) => (
                      <button
                        type="button"
                        aria-pressed={filter === category.id}
                        key={category.id}
                        className={`filter-option${filter === category.id ? ' filter-option--active' : ''}`}
                        onClick={() => setFilter(category.id)}
                      >
                        <span>{category.label}</span>
                        <span className="filter-option__count">
                          {categoryCounts[category.id] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {brands.length > 0 && (
                  <section className="filter-group" aria-labelledby="brand-filter-heading">
                    <h4 id="brand-filter-heading">Marca</h4>
                    <div className="filter-options">
                      {brands.map((brand) => (
                        <label className="filter-checkbox" key={brand}>
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => toggleBrand(brand)}
                          />
                          <span>{brand}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                )}

                <section className="filter-group" aria-labelledby="price-filter-heading">
                  <div className="filter-group__title">
                    <h4 id="price-filter-heading">Precio</h4>
                    <span>
                      {formatPrice(maxPrice ?? priceLimit)}
                    </span>
                  </div>
                  <label className="sr-only" htmlFor="max-price">
                    Precio máximo
                  </label>
                  <input
                    className="price-range"
                    id="max-price"
                    type="range"
                    min="0"
                    max={priceLimit}
                    step="0.01"
                    value={maxPrice ?? priceLimit}
                    onChange={(event) =>
                      setMaxPrice(Number(event.currentTarget.value))
                    }
                  />
                  <div className="price-range__labels">
                    <span>{formatPrice(0)}</span>
                    <span>{formatPrice(priceLimit)}</span>
                  </div>
                </section>

              </div>
            )}
          </aside>

          <div className="collection__products">
            <div className="collection__toolbar">
              <p>
                {searchIsPending
                  ? 'Buscando productos…'
                  : loading
                  ? 'Cargando productos…'
                  : error
                    ? 'Productos no disponibles'
                  : normalizedSearch
                    ? `${visibleProducts.length} ${visibleProducts.length === 1 ? 'resultado' : 'resultados'}`
                    : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'producto' : 'productos'}`}
              </p>
              {!loading && !error && (
                <span className="collection__progress">
                  {normalizedSearch
                    ? searchResultQuery === normalizedSearch
                      ? searchUsesFilteredFallback
                        ? `${searchResults.length} ${searchResults.length === 1 ? 'coincidencia cargada' : 'coincidencias cargadas'}`
                        : `${searchResults.length} de ${searchTotal} ${searchTotal === 1 ? 'resultado' : 'resultados'}`
                      : `${currentProducts.length} resultados locales`
                    : `${products.length} de ${totalProducts} cargados`}
                </span>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="collection__clear"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {loading && <p className="collection__message">Cargando productos…</p>}
            {error && (
              <p className="collection__message" role="alert">
                No se pudo cargar la tienda. {error}
              </p>
            )}
            {searchError && searchErrorQuery === normalizedSearch && (
              <p className="collection__message" role="alert">
                No se pudo completar la búsqueda en el catálogo. {searchError}
              </p>
            )}
            {!searchIsPending &&
              !loading &&
              !error &&
              visibleProducts.length === 0 &&
              !searchHasNextPage &&
              !searchLoadingMore && (
              <p className="collection__message">
                {searchQuery
                  ? `No encontramos productos que coincidan con “${searchQuery}”.`
                  : 'No hay productos que coincidan con estos filtros.'}
              </p>
            )}

            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  product={product}
                  key={product.id}
                  catalogSnapshot={{
                    filter,
                    selectedBrands,
                    maxPrice,
                    filtersExpanded,
                  }}
                />
              ))}
              {isLoadingMore &&
                Array.from({ length: 3 }, (_, index) => (
                  <div
                    className="product-skeleton"
                    key={`skeleton-${index}`}
                    aria-hidden="true"
                  >
                    <div className="product-skeleton__art" />
                    <div className="product-skeleton__body">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
            </div>

            {(normalizedSearch ? searchHasNextPage : hasMore) && (
              <div
                className="collection__sentinel"
                ref={sentinelRef}
                aria-hidden="true"
              />
            )}

            {isLoadingMore && (
              <p className="collection__loading" role="status">
                <span className="collection__spinner" aria-hidden="true" />
                Cargando más productos…
              </p>
            )}
            {currentLoadMoreError && (
              <div className="collection__load-error" role="alert">
                <p>
                  No se pudieron cargar más productos. {currentLoadMoreError}
                </p>
                <button
                  type="button"
                  className="collection__clear"
                  onClick={() =>
                    normalizedSearch
                      ? void loadMoreSearchResults()
                      : void loadMore()
                  }
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="collection__note">
          Precios en USD. Para comprar, inicia sesión o crea una cuenta de
          cliente.
        </p>
      </div>
    </section>
  )
}
