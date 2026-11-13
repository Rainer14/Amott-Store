import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useProducts } from '../data/ProductsContext'
import type { CategoryFilter } from '../types'
import {
  clearCatalogSnapshot,
  readCatalogSnapshot,
} from '../lib/catalogNavigation'
import { formatPrice } from '../lib/format'
import { ProductCard } from './ProductCard'

export function Collection() {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const [catalogSnapshot] = useState(() => readCatalogSnapshot(returnTo))
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const trimmedSearch = searchQuery.trim()
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
  const autoLoadArmed = useRef(true)
  const restoredScroll = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const {
    products,
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
    setCategoryId,
    isPending,
  } = useProducts()
  const activeFilter =
    filter === 'todo' ||
    categories.length <= 1 ||
    categories.some((category) => category.id === filter)
      ? filter
      : 'todo'

  // La URL es la fuente de la busqueda (permite compartir enlaces y usar el
  // historial); el contexto aplica el retardo antes de consultar la API.
  useEffect(() => {
    setQuery(searchQuery)
  }, [searchQuery, setQuery])

  useEffect(() => {
    setCategoryId(activeFilter)
  }, [activeFilter, setCategoryId])

  useEffect(() => {
    if (!catalogSnapshot || restoredScroll.current || loading || isPending) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, catalogSnapshot.scrollY)
      clearCatalogSnapshot()
      restoredScroll.current = true
    })
    return () => window.cancelAnimationFrame(frame)
  }, [catalogSnapshot, loading, isPending])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (
      !sentinel ||
      loading ||
      loadingMore ||
      isPending ||
      error ||
      loadMoreError ||
      !hasMore
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry) return

        if (!entry.isIntersecting) {
          autoLoadArmed.current = true
          return
        }

        if (!autoLoadArmed.current) return
        autoLoadArmed.current = false
        void loadMore()
      },
      { rootMargin: '120px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    error,
    hasMore,
    isPending,
    loadMore,
    loadMoreError,
    loading,
    loadingMore,
  ])

  const priceLimit = useMemo(
    () => Math.max(1, ...products.map((product) => product.price)),
    [products],
  )
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [products],
  )
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesBrand =
          selectedBrands.length === 0 ||
          (product.brand !== null &&
            selectedBrands.includes(product.brand.trim()))
        const matchesPrice = maxPrice === null || product.price <= maxPrice
        return matchesBrand && matchesPrice
      }),
    [maxPrice, products, selectedBrands],
  )
  const hasActiveFilters =
    activeFilter !== 'todo' || selectedBrands.length > 0 || maxPrice !== null
  const catalogSnapshotData = useMemo(
    () => ({ filter: activeFilter, selectedBrands, maxPrice, filtersExpanded }),
    [activeFilter, selectedBrands, maxPrice, filtersExpanded],
  )

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
    setQuery(value)
    const nextParams = new URLSearchParams(searchParams)
    if (value) {
      nextParams.set('q', value)
    } else {
      nextParams.delete('q')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const clearSearch = () => handleSearchChange('')

  const noResults =
    !isPending &&
    !error &&
    visibleProducts.length === 0 &&
    !hasMore &&
    !loadingMore

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

        <p className="sr-only" role="status">
          {!isPending && !error
            ? `${visibleProducts.length} ${visibleProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}.`
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
                        aria-pressed={activeFilter === category.id}
                        key={category.id}
                        className={`filter-option${activeFilter === category.id ? ' filter-option--active' : ''}`}
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
            <div className="collection-search-wrap">
              <form
                className="collection-search"
                role="search"
                onSubmit={(event) => event.preventDefault()}
              >
                <label className="sr-only" htmlFor="product-search">
                  Buscar productos por nombre, SKU o marca
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
                  value={query}
                  onChange={(event) =>
                    handleSearchChange(event.currentTarget.value)
                  }
                  placeholder="¿Qué estás buscando?"
                  aria-describedby="product-search-hint"
                />
                {query && (
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
                  Nombre, SKU o marca
                </span>
              </form>
            </div>

            <div className="collection__toolbar">
              <p>
                {isPending
                  ? trimmedSearch
                    ? 'Buscando productos…'
                    : 'Cargando productos…'
                  : error
                    ? 'Productos no disponibles'
                    : trimmedSearch
                      ? `${visibleProducts.length} ${visibleProducts.length === 1 ? 'resultado' : 'resultados'}`
                      : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'producto' : 'productos'}`}
              </p>
              {!isPending && !error && (
                <span className="collection__progress">
                  {products.length} de {totalProducts} cargados
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

            {error && (
              <p className="collection__message" role="alert">
                No se pudo cargar el catálogo. {error}
              </p>
            )}
            {noResults && (
              <p className="collection__message">
                {trimmedSearch
                  ? `No encontramos productos que coincidan con “${searchQuery}”.`
                  : 'No hay productos que coincidan con estos filtros.'}
              </p>
            )}

            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  product={product}
                  key={product.id}
                  catalogSnapshot={catalogSnapshotData}
                />
              ))}
            </div>

            {hasMore && (
              <div
                className="collection__sentinel"
                ref={sentinelRef}
                aria-hidden="true"
              />
            )}

            {loadingMore && (
              <p className="collection__loading" role="status">
                <span className="collection__spinner" aria-hidden="true" />
                Cargando más productos…
              </p>
            )}
            {loadMoreError && (
              <div className="collection__load-error" role="alert">
                <p>
                  No se pudieron cargar más productos. {loadMoreError}
                </p>
                <button
                  type="button"
                  className="collection__clear"
                  onClick={() => void loadMore()}
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
