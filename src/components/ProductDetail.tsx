import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/useCart'
import { fetchProductsPage, parseProductDetail } from '../data/products'
import { useProducts } from '../data/ProductsContext'
import { formatPrice } from '../lib/format'
import { getUserFacingError, HttpRequestError } from '../lib/userFacingError'
import type { Product } from '../types'
import { ProductCard } from './ProductCard'

interface ProductImage {
  url: string
  alt: string
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false
  const product = value as Partial<Product>
  return (
    typeof product.id === 'string' &&
    typeof product.slug === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number'
  )
}

function parseImages(payload: unknown): ProductImage[] {
  let items: unknown = payload
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    const data =
      typeof record.data === 'object' && record.data !== null
        ? (record.data as Record<string, unknown>)
        : record
    items = data.items ?? data.images
  }
  if (!Array.isArray(items)) return []

  const images: ProductImage[] = []
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      images.push({ url: item, alt: '' })
      continue
    }
    if (typeof item !== 'object' || item === null) continue
    const image = item as Record<string, unknown>
    const url =
      image.url ??
      image.image_url ??
      image.public_url ??
      image.src ??
      image.path
    if (typeof url !== 'string' || !url.trim()) continue
    images.push({
      url: url.trim(),
      alt:
        typeof image.alt === 'string'
          ? image.alt
          : typeof image.alt_text === 'string'
            ? image.alt_text
            : '',
    })
  }
  return images
}

async function fetchProductImages(productId: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/images`,
    { signal },
  )
  if (!response.ok) throw new HttpRequestError(response.status)
  return parseImages(await response.json())
}

async function fetchProductDetail(productId: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}`,
    { signal },
  )
  if (!response.ok) throw new HttpRequestError(response.status)
  const product = parseProductDetail(await response.json())
  if (!product) throw new Error('Invalid product response')
  return product
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={`product-detail__arrow-icon product-detail__arrow-icon--${direction}`}
    >
      <path
        d="M5 12h14M13 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProductDetail() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const navigationState =
    typeof location.state === 'object' && location.state !== null
      ? (location.state as {
          returnTo?: unknown
          catalogSnapshot?: unknown
        })
      : null
  const catalogReturnTo =
    typeof navigationState?.returnTo === 'string' &&
    navigationState.returnTo.startsWith('/') &&
    !navigationState.returnTo.startsWith('//')
      ? navigationState.returnTo
      : '/'
  const { products, loading: catalogLoading } = useProducts()
  const { customer } = useAuth()
  const { add } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [imageSelection, setImageSelection] = useState({ slug: '', index: 0 })
  const [loadedSlug, setLoadedSlug] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imagesError, setImagesError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const recommendationsRef = useRef<HTMLDivElement | null>(null)
  const catalogProduct = products.find(
    (item) => item.slug === slug || item.id === slug,
  )
  const stateProduct =
    typeof location.state === 'object' &&
    location.state !== null &&
    'product' in location.state &&
    isProduct(location.state.product)
      ? location.state.product
      : null
  const routedProduct =
    catalogProduct ??
    (stateProduct?.slug === slug || stateProduct?.id === slug
      ? stateProduct
      : null)
  const selectedImage =
    imageSelection.slug === slug ? imageSelection.index : 0

  useEffect(() => {
    const controller = new AbortController()
    if (!routedProduct && catalogLoading) return

    async function loadProduct() {
      try {
        let sourceProduct = routedProduct

        if (!sourceProduct) {
          const result = await fetchProductsPage(1, controller.signal, slug)
          sourceProduct =
            result.products.find(
              (item) => item.slug === slug || item.id === slug,
            ) ?? null
        }

        if (controller.signal.aborted) return
        if (!sourceProduct) {
          setNotFound(true)
          setProduct(null)
          setError(null)
          return
        }

        const detail = await fetchProductDetail(
          sourceProduct.id,
          controller.signal,
        )
        if (controller.signal.aborted) return
        setProduct(detail)
        setError(null)
        setNotFound(false)
        setImagesError(null)

        try {
          const extraImages = await fetchProductImages(
            detail.id,
            controller.signal,
          )
          if (controller.signal.aborted) return
          const allImages = [
            ...(detail.imageUrl
              ? [{ url: detail.imageUrl, alt: detail.name }]
              : []),
            ...extraImages,
          ]
          setImages(
            allImages.filter(
              (image, index) =>
                allImages.findIndex((candidate) => candidate.url === image.url) ===
                index,
            ),
          )
        } catch (cause) {
          if (controller.signal.aborted) return
          setImagesError(getUserFacingError(cause, 'catalog'))
          setImages(
            detail.imageUrl
              ? [{ url: detail.imageUrl, alt: detail.name }]
              : [],
          )
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(getUserFacingError(cause, 'catalog'))
      } finally {
        if (!controller.signal.aborted) setLoadedSlug(slug)
      }
    }

    void loadProduct()
    return () => controller.abort()
  }, [catalogLoading, location.state, routedProduct, slug])

  const recommendedProducts = useMemo(() => {
    if (!product) return []
    const otherProducts = products.filter((item) => item.id !== product.id)
    const sameCategory = otherProducts.filter(
      (item) => item.category === product.category,
    )
    const chosen = [...sameCategory]
    for (const item of otherProducts) {
      if (chosen.length >= 12) break
      if (!chosen.some((candidate) => candidate.id === item.id)) {
        chosen.push(item)
      }
    }
    return chosen.slice(0, 12)
  }, [product, products])

  const moveRecommendations = (direction: 'left' | 'right') => {
    recommendationsRef.current?.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    })
  }

  const handleAdd = async () => {
    if (!product) return
    setAdding(true)
    setAddError(null)
    try {
      await add(product.id)
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1800)
    } catch (cause) {
      setAddError(getUserFacingError(cause, 'cart'))
    } finally {
      setAdding(false)
    }
  }

  if (loadedSlug !== slug || catalogLoading) {
    return (
      <section className="product-detail-state" aria-live="polite">
        <p>Cargando producto…</p>
      </section>
    )
  }

  if (notFound || !product) {
    return (
      <section className="product-detail-state">
        <h1>Producto no encontrado</h1>
        <p>
          No encontramos ese producto en el catálogo. Vuelve a la tienda para
          seguir explorando.
        </p>
        {error && <p role="alert">{error}</p>}
        <Link className="button button--solid" to="/">
          Volver al catálogo
        </Link>
      </section>
    )
  }

  const currentImage = images[selectedImage]

  return (
    <div className="product-detail-page">
      <div className="container">
        <Link
          className="button button--outline product-detail__back"
          to={catalogReturnTo}
        >
          <ArrowIcon direction="left" />
          Volver al catálogo
        </Link>
        <nav className="product-detail__breadcrumbs" aria-label="Migas de pan">
          <Link to="/">Tienda</Link>
          <span aria-hidden="true">/</span>
          <span>{product.categoryName}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        {error && (
          <p className="product-detail__notice" role="alert">
            {error}
          </p>
        )}

        <section className="product-detail">
          <div className="product-detail__gallery">
            <div className="product-detail__main-image">
              {currentImage ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt || product.name}
                />
              ) : (
                <div
                  className="product__image-placeholder"
                  role="img"
                  aria-label={`Imagen no disponible: ${product.name}`}
                >
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      d="M8 16h32v24H8zM15 16l3-7h12l3 7M8 23h32M20 28h8v12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-detail__image-nav product-detail__image-nav--previous"
                    aria-label="Ver imagen anterior"
                    onClick={() =>
                      setImageSelection({
                        slug,
                        index: (selectedImage - 1 + images.length) % images.length,
                      })
                    }
                  >
                    <ArrowIcon direction="left" />
                  </button>
                  <button
                    type="button"
                    className="product-detail__image-nav product-detail__image-nav--next"
                    aria-label="Ver imagen siguiente"
                    onClick={() =>
                      setImageSelection({
                        slug,
                        index: (selectedImage + 1) % images.length,
                      })
                    }
                  >
                    <ArrowIcon direction="right" />
                  </button>
                  <span className="product-detail__image-count" aria-live="polite">
                    {selectedImage + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div
                className="product-detail__thumbnails"
                role="group"
                aria-label="Imágenes del producto"
              >
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image.url}-${index}`}
                    className={`product-detail__thumbnail${index === selectedImage ? ' product-detail__thumbnail--selected' : ''}`}
                    aria-label={`Mostrar imagen ${index + 1}`}
                    aria-pressed={index === selectedImage}
                    onClick={() => setImageSelection({ slug, index })}
                  >
                    <img src={image.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {imagesError && (
              <p className="product-detail__image-error" role="status">
                No se pudieron cargar imágenes adicionales.
              </p>
            )}
          </div>

          <div className="product-detail__info">
            <p className="product-detail__eyebrow">{product.categoryName}</p>
            <h1>{product.name}</h1>
            <p className="product-detail__sku">SKU {product.sku}</p>
            <p className="product-detail__price">{formatPrice(product.price)}</p>
            <p className="product-detail__description">
              {product.fullDescription ||
                product.description ||
                'No hay una descripción adicional disponible para este producto.'}
            </p>

            <dl className="product-detail__specs">
              <div>
                <dt>Categoría</dt>
                <dd>{product.categoryName}</dd>
              </div>
              <div>
                <dt>Marca</dt>
                <dd>{product.brand || 'No especificada'}</dd>
              </div>
              <div>
                <dt>SKU</dt>
                <dd>{product.sku}</dd>
              </div>
            </dl>

            {customer ? (
              <button
                type="button"
                className="button button--solid product-detail__add"
                onClick={() => void handleAdd()}
                disabled={adding}
              >
                {adding ? 'Añadiendo…' : added ? 'Añadido a la bolsa' : 'Añadir a la bolsa'}
              </button>
            ) : (
              <Link
                className="button button--solid product-detail__add"
                to="/iniciar-sesion"
                state={{ from: location.pathname }}
              >
                Inicia sesión para comprar
              </Link>
            )}
            {addError && (
              <p className="product-detail__notice" role="alert">
                {addError}
              </p>
            )}
          </div>
        </section>

        {recommendedProducts.length > 0 && (
          <section className="product-recommendations">
            <div className="product-recommendations__head">
              <div>
                <p className="product-detail__eyebrow">PARA SEGUIR EXPLORANDO</p>
                <h2>También te puede interesar</h2>
              </div>
              <div className="product-recommendations__controls">
                <button
                  type="button"
                  aria-label="Ver recomendaciones anteriores"
                  onClick={() => moveRecommendations('left')}
                >
                  <ArrowIcon direction="left" />
                </button>
                <button
                  type="button"
                  aria-label="Ver más recomendaciones"
                  onClick={() => moveRecommendations('right')}
                >
                  <ArrowIcon direction="right" />
                </button>
              </div>
            </div>
            <div
              className="product-recommendations__track"
              ref={recommendationsRef}
              aria-label="Productos recomendados"
            >
              {recommendedProducts.map((item) => (
                <div className="product-recommendations__item" key={item.id}>
                  <ProductCard
                    product={item}
                    catalogReturnTo={catalogReturnTo}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
