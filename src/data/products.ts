import type { Category, Product } from '../types'

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
  main_image_url: string | null
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

function slugifyProductName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapApiProduct(item: ApiProduct): Product {
  return {
    id: item.id,
    sku: item.sku,
    slug: item.slug?.trim() || slugifyProductName(item.name),
    name: item.name,
    category: item.category.slug,
    categoryName: item.category.name,
    price: item.price,
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
  categories: Category[]
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

  const products = value.items.map(mapApiProduct)
  const categoryMap = new Map(
    products.map((product) => [
      product.category,
      { id: product.category, label: product.categoryName },
    ]),
  )

  return {
    products,
    categories: [
      { id: 'todo', label: 'Todo' },
      ...Array.from(categoryMap.values()),
    ],
    page: value.page,
    totalPages: value.totalPages,
    total: value.total,
  }
}

export async function fetchProductsPage(
  page: number,
  signal: AbortSignal,
  searchQuery?: string,
) {
  const params = new URLSearchParams({ page: String(page) })
  if (searchQuery?.trim()) params.set('search', searchQuery.trim())

  const response = await fetch(`/api/products?${params}`, { signal })
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
