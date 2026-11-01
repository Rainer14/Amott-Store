import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useProducts } from '../data/ProductsContext'
import type { CartLine } from '../types'
import {
  CartContext,
  type CartContextValue,
  type LastAdded,
} from './CartContext'

const STORAGE_KEY = 'amott-bag-v1'

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const line = value as Partial<CartLine>
  return (
    typeof line.productId === 'string' &&
    typeof line.qty === 'number' &&
    Number.isFinite(line.qty) &&
    line.qty > 0
  )
}

function readBag(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, loading, error } = useProducts()
  const [lines, setLines] = useState<CartLine[]>(readBag)
  const [isOpen, setIsOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null)
  const toastTimer = useRef<number | null>(null)
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const cartLines = useMemo(
    () =>
      loading || error
        ? lines
        : lines.filter((line) => productsById.has(line.productId)),
    [loading, error, lines, productsById],
  )

  useEffect(() => {
    if (loading || error) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartLines))
    } catch {
      // Storage can be unavailable in private browsing. The bag still works.
    }
  }, [cartLines, loading, error])

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const add = useCallback((productId: string) => {
    const product = productsById.get(productId)
    if (!product) return

    setLines((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (existing) {
        return current.map((line) =>
          line.productId === productId
            ? { ...line, qty: line.qty + 1 }
            : line,
        )
      }
      return [...current, { productId, qty: 1 }]
    })
    setLastAdded({ name: product.name, nonce: Date.now() })
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setLastAdded(null)
      toastTimer.current = null
    }, 2600)
  }, [productsById])

  const remove = useCallback((productId: string) => {
    setLines((current) =>
      current.filter((line) => line.productId !== productId),
    )
  }, [])

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((current) => {
      if (qty <= 0) {
        return current.filter((line) => line.productId !== productId)
      }
      return current.map((line) =>
        line.productId === productId ? { ...line, qty } : line,
      )
    })
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setLastAdded(null)
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const { count, subtotal } = useMemo(() => {
    return cartLines.reduce(
      (totals, line) => {
        const product = productsById.get(line.productId)
        if (!product) return totals
        return {
          count: totals.count + line.qty,
          subtotal: totals.subtotal + product.price * line.qty,
        }
      },
      { count: 0, subtotal: 0 },
    )
  }, [cartLines, productsById])

  const value = useMemo<CartContextValue>(
    () => ({
      lines: cartLines,
      count,
      subtotal,
      isOpen,
      lastAdded,
      add,
      remove,
      setQty,
      clear,
      open,
      close,
    }),
    [
      cartLines,
      count,
      subtotal,
      isOpen,
      lastAdded,
      add,
      remove,
      setQty,
      clear,
      open,
      close,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
