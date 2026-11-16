import type { Category, Product } from '../types'
import { apiUrl } from '../lib/api'

const PRODUCTS_PAGE_SIZE = 80

interface ApiProduct {
  id: string
  sku: string
  slug?: string | null
  name: string
  short_description: string | null
  description: string | null
  brand: string | null
  category: {
    id: string
    name: string
    slug: string
  }
  price: number
  /** Precios adicionales para mayoristas (nombres posibles según la API). */
  wholesale_price?: number | null
  wholesalePrice?: number | null
  price_2?: number | null
  price2?: number | null
  wholesale_price_2?: number | null
  wholesalePrice2?: number | null
  price_3?: number | null
  price3?: number | null
  wholesale_price_3?: number | null
  wholesalePrice3?: number | null
  wholesale_prices?: unknown
  wholesalePrices?: unknown
  main_image_url: string | null
}

interface ApiCategory {
  id: string
  name: string
  slug: string
  product_count: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pushPrice(prices: number[], value: unknown, basePrice: number) {
  if (isFiniteNumber(value) && value !== basePrice && !prices.includes(value)) {
    prices.push(value)
  }
}

function readPricesFromWholesaleEntry(entry: unknown, basePrice: number): number[] {
  if (isFiniteNumber(entry)) return entry !== basePrice ? [entry] : []
  if (!isRecord(entry)) return []

  const candidates: unknown[] = [
    entry.mayor_publico,
    entry.mayorPublico,
    entry.gran_mayor_publico,
    entry.granMayorPublico,
    entry.wholesale_price,
    entry.wholesalePrice,
    entry.large_wholesale_price,
    entry.largeWholesalePrice,
    entry.price_2,
    entry.price2,
    entry.price_3,
    entry.price3,
    entry.precio_mayor,
    entry.precioMayor,
    entry.precio_gran_mayor,
    entry.precioGranMayor,
    entry.precio_mayorista,
    entry.precioMayorista,
  ]

  const prices: number[] = []
  for (const value of candidates) pushPrice(prices, value, basePrice)

  // Si el objeto trae otros campos numéricos de precio no contemplados.
  if (prices.length === 0) {
    for (const [key, value] of Object.entries(entry)) {
      if (!/(price|precio|wholesale|mayor|nivel|tier)/i.test(key)) continue
      pushPrice(prices, value, basePrice)
    }
  }

  return prices
}

function readWholesalePrices(item: ApiProduct): number[] {
  const record = item as unknown as Record<string, unknown>
  const listValue = item.wholesale_prices ?? item.wholesalePrices
  if (Array.isArray(listValue)) {
    const numberPrices = listValue.filter(isFiniteNumber)
    if (numberPrices.length > 0) {
      return numberPrices.filter((value) => value !== item.price)
    }

    // API puede devolver un arreglo de objetos por proveedor, p. ej.
    // [{ supplier_name, mayor_publico, gran_mayor_publico }]
    for (const entry of listValue) {
      const prices = readPricesFromWholesaleEntry(entry, item.price)
      if (prices.length > 0) return prices
    }
  }

  const candidates: unknown[] = [
    item.wholesale_price,
    item.wholesalePrice,
    item.price_2,
    item.price2,
    item.wholesale_price_2,
    item.wholesalePrice2,
    item.price_3,
    item.price3,
    item.wholesale_price_3,
    item.wholesalePrice3,
    record.large_wholesale_price,
    record.largeWholesalePrice,
    record.mayor_publico,
    record.mayorPublico,
    record.gran_mayor_publico,
    record.granMayorPublico,
    record.precio_mayorista,
    record.precioMayorista,
    record.precio_mayorista_2,
    record.precioMayorista2,
    record.precio_mayorista_3,
    record.precioMayorista3,
    record.precio2,
    record.precio_2,
    record.precio3,
    record.precio_3,
    record.mayorista,
    record.mayorista_2,
    record.mayorista_3,
  ]

  const prices: number[] = []
  for (const value of candidates) pushPrice(prices, value, item.price)

  // Fallback: si la API usa nombres no contemplados, buscar campos numéricos
  // que parezcan precios adicionales (price/precio/wholesale/mayorista/nivel/tier).
  if (prices.length === 0) {
    for (const [key, value] of Object.entries(record)) {
      if (!isFiniteNumber(value) || value === item.price) continue
      if (!/(price|precio|wholesale|mayorista|nivel|tier)/i.test(key)) continue
      if (/^price$/i.test(key)) continue
      if (!prices.includes(value)) prices.push(value)
    }
  }

  return prices
}

function isApiProduct(value: unknown): value is ApiProduct {
  if (typeof value !== 'object' || value === null) return false
  const product = value as Partial<ApiProduct>
  const category = product.category
  return (
    typeof product.id === 'string' &&
    typeof product.sku === 'string' &&
    (product.slug === undefined ||
      typeof product.slug === 'string' ||
      product.slug === null) &&
    typeof product.name === 'string' &&
    (typeof product.short_description === 'string' ||
      product.short_description === null) &&
    (typeof product.description === 'string' ||
      product.description === null) &&
    (typeof product.brand === 'string' || product.brand === null) &&
    typeof category === 'object' &&
    category !== null &&
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.slug === 'string' &&
    typeof product.price === 'number' &&
    Number.isFinite(product.price) &&
    (typeof product.main_image_url === 'string' ||
      product.main_image_url === null)
  )
}

function isApiCategory(value: unknown): value is ApiCategory {
  if (typeof value !== 'object' || value === null) return false
  const category = value as Partial<ApiCategory>
  return (
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.slug === 'string' &&
    typeof category.product_count === 'number' &&
    Number.isInteger(category.product_count)
  )
}

function slugifyProductName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapApiProduct(item: ApiProduct): Product {
  const wholesalePrices = readWholesalePrices(item)
  return {
    id: item.id,
    sku: item.sku,
    slug: item.slug?.trim() || slugifyProductName(item.name),
    name: item.name,
    category: item.category.slug,
    categoryId: item.category.id,
    categoryName: item.category.name,
    price: item.price,
    ...(wholesalePrices.length > 0 ? { wholesalePrices } : {}),
    description:
      item.short_description?.trim() || item.description?.trim() || '',
    fullDescription: item.description?.trim() || undefined,
    brand: item.brand,
    imageUrl: item.main_image_url,
  }
}

export function parseProductDetail(value: unknown): Product | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const candidate =
    typeof record.product === 'object' && record.product !== null
      ? record.product
      : typeof record.data === 'object' && record.data !== null
        ? record.data
        : value
  return isApiProduct(candidate) ? mapApiProduct(candidate) : null
}

export function parseProductsResponse(
  value: unknown,
): {
  products: Product[]
  page: number
  totalPages: number
  total: number
} | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('items' in value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isApiProduct) ||
    !('page' in value) ||
    typeof value.page !== 'number' ||
    !Number.isInteger(value.page) ||
    !('totalPages' in value) ||
    typeof value.totalPages !== 'number' ||
    !Number.isInteger(value.totalPages) ||
    !('total' in value) ||
    typeof value.total !== 'number' ||
    !Number.isInteger(value.total)
  ) {
    return null
  }

  return {
    products: value.items.map(mapApiProduct),
    page: value.page,
    totalPages: value.totalPages,
    total: value.total,
  }
}

export interface ProductQuery {
  /** Pedazos de palabras: la API exige que todas aparezcan. */
  search?: string
  /** UUID de la categoria activa; `todo` o vacio no filtra. */
  categoryId?: string
}

export async function fetchProductsPage(
  page: number,
  signal: AbortSignal,
  query: ProductQuery = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PRODUCTS_PAGE_SIZE),
  })
  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.categoryId && query.categoryId !== 'todo') {
    params.set('category_id', query.categoryId)
  }

  const response = await fetch(apiUrl(`/api/products?${params}`), {
    signal,
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}.`)
  }

  const payload: unknown = await response.json()
  const result = parseProductsResponse(payload)
  if (!result) {
    throw new Error('La API devolvió un formato de productos inválido.')
  }
  if (result.page !== page) {
    throw new Error(`La API devolvió la página ${result.page} en vez de ${page}.`)
  }

  return result
}

/**
 * Categorias del catalogo con su conteo de productos activos.
 *
 * El filtro de la tienda usa el UUID (`id`), no el slug: el backend filtra
 * por `category_id`, de modo que la categoria abarca todo el catalogo y no
 * solo los productos ya descargados.
 */
export async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
  const response = await fetch(apiUrl('/api/categories'), {
    signal,
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (!Array.isArray(payload) || !payload.every(isApiCategory)) {
    throw new Error('La API devolvió un formato de categorías inválido.')
  }

  const categories: Category[] = payload.map((category) => ({
    id: category.id,
    label: category.name,
    count: category.product_count,
  }))
  const total = categories.reduce(
    (sum, category) => sum + category.count,
    0,
  )
  return [{ id: 'todo', label: 'Todo', count: total }, ...categories]
}

/** Detalle publico por id (para articulos del carrito fuera de pagina). */
export async function fetchProductById(
  id: string,
  signal?: AbortSignal,
): Promise<Product | null> {
  const response = await fetch(
    apiUrl(`/api/products/${encodeURIComponent(id)}`),
    { signal, credentials: 'include' },
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}.`)
  }
  return parseProductDetail(await response.json())
}

/** Detalle publico por slug (enlaces directos a /producto/:slug). */
export async function fetchProductBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<Product | null> {
  const response = await fetch(
    apiUrl(`/api/products/slug/${encodeURIComponent(slug)}`),
    { signal, credentials: 'include' },
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`La API respondió con estado ${response.status}.`)
  }
  return parseProductDetail(await response.json())
}
