import type { Product } from '../types'

const STOP_WORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'el',
  'en',
  'es',
  'esta',
  'este',
  'la',
  'las',
  'los',
  'mas',
  'más',
  'no',
  'o',
  'para',
  'por',
  'se',
  'sin',
  'su',
  'sus',
  'todo',
  'todos',
  'un',
  'una',
  'unas',
  'unos',
])

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  )
}

/** Similitud de Jaccard entre las palabras del nombre/descripcion. */
function wordSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) {
    if (right.has(token)) shared += 1
  }
  return shared / (left.size + right.size - shared)
}

/** 1 cuando ambos precios son iguales y se acerca a 0 cuanto mas se alejan. */
function priceAffinity(reference: number, candidate: number): number {
  if (reference <= 0 || candidate <= 0) return 0
  const ratio = Math.max(reference, candidate) / Math.min(reference, candidate)
  return 1 / (1 + Math.log(ratio))
}

function sameBrand(left: Product, right: Product): boolean {
  return Boolean(
    left.brand &&
      right.brand &&
      normalize(left.brand) === normalize(right.brand),
  )
}

function sameCategory(left: Product, right: Product): boolean {
  return (
    left.category === right.category || left.categoryId === right.categoryId
  )
}

export interface RecommendationContext {
  limit?: number
  /** Productos ya agregados a la bolsa, para dar peso a sus categorias/marcas. */
  cartProducts?: Product[]
}

/** Puntaje determinista: mayor valor significa una recomendacion mas relevante. */
export function scoreRecommendation(
  target: Product,
  candidate: Product,
  context: RecommendationContext = {},
): number {
  const cartAffinity = (context.cartProducts ?? []).reduce((best, item) => {
    if (item.id === candidate.id) return best
    return Math.max(
      best,
      sameCategory(item, candidate) ? 1 : 0,
      sameBrand(item, candidate) ? 0.6 : 0,
    )
  }, 0)

  return (
    (sameCategory(target, candidate) ? 6 : 0) +
    (sameBrand(target, candidate) ? 2.5 : 0) +
    wordSimilarity(
      tokenize(`${target.name} ${target.description}`),
      tokenize(`${candidate.name} ${candidate.description}`),
    ) *
      5 +
    priceAffinity(target.price, candidate.price) * 3 +
    (candidate.imageUrl ? 0.5 : 0) +
    cartAffinity * 2
  )
}

/** Ordena el catalogo por relevancia y devuelve hasta `limit` productos. */
export function getRecommendedProducts(
  target: Product,
  catalog: Product[],
  context: RecommendationContext = {},
): Product[] {
  const limit = context.limit ?? 12
  if (limit <= 0) return []

  return catalog
    .filter((item) => item.id !== target.id && item.slug !== target.slug)
    .map((item) => ({ item, score: scoreRecommendation(target, item, context) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.item.price - right.item.price ||
        left.item.name.localeCompare(right.item.name),
    )
    .slice(0, limit)
    .map(({ item }) => item)
}
