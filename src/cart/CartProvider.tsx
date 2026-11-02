import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { useProducts } from '../data/ProductsContext'
import type { CartLine } from '../types'
import {
  CartContext,
  type CartContextValue,
  type LastAdded,
} from './CartContext'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import { apiUrl } from '../lib/api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCartLines(value: unknown) {
  let items: unknown = value
  if (isRecord(value)) {
    const data = isRecord(value.data) ? value.data : value
    const cart = isRecord(data.cart) ? data.cart : data
    items = cart.items
  }
  if (!Array.isArray(items)) {
    throw new Error('La API devolvió un carrito con formato inválido.')
  }

  const lines = new Map<string, number>()
  for (const item of items) {
    if (!isRecord(item)) {
      throw new Error('La API devolvió un artículo de carrito inválido.')
    }
    const product = isRecord(item.product) ? item.product : null
    const rawId =
      item.productId ?? item.product_id ?? product?.id
    const rawQuantity = item.quantity ?? item.qty
    if (
      (typeof rawId !== 'string' && typeof rawId !== 'number') ||
      typeof rawQuantity !== 'number' ||
      !Number.isInteger(rawQuantity) ||
      rawQuantity < 1
    ) {
      throw new Error('La API devolvió un artículo de carrito inválido.')
    }
    lines.set(String(rawId), rawQuantity)
  }

  return Array.from(lines, ([productId, qty]) => ({ productId, qty }))
}

async function cartRequest(
  path: string,
  accessToken: string | null,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = text
    }
  }

  if (!response.ok) throw new HttpRequestError(response.status)
  return payload
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { customer, accessToken } = useAuth()
  const { products } = useProducts()
  const [lines, setLines] = useState<CartLine[]>([])
  const [cartOwnerId, setCartOwnerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpenState, setIsOpen] = useState(false)
  const [lastAddedState, setLastAdded] = useState<LastAdded | null>(null)
  const toastTimer = useRef<number | null>(null)
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const cartLines = useMemo(
    () => (customer && cartOwnerId === customer.id ? lines : []),
    [cartOwnerId, customer, lines],
  )
  const isOpen = Boolean(customer && isOpenState)
  const lastAdded =
    customer && lastAddedState?.customerId === customer.id
      ? lastAddedState
      : null

  useEffect(() => {
    if (!customer) return

    const controller = new AbortController()
    void cartRequest('/api/cart', accessToken, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return
        setLines(parseCartLines(payload))
        setCartOwnerId(customer.id)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(getUserFacingError(cause, 'cart'))
        setLines([])
        setCartOwnerId(customer.id)
      })

    return () => controller.abort()
  }, [accessToken, customer])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const add = useCallback(
    async (productId: string) => {
      if (!customer) throw new Error('Inicia sesión para añadir productos.')
      const product = productsById.get(productId)
      if (!product) throw new Error('No se encontró el producto seleccionado.')

      const currentQty =
        cartOwnerId === customer.id
          ? lines.find((line) => line.productId === productId)?.qty ?? 0
          : 0
      const quantity = currentQty + 1
      try {
        await cartRequest(`/api/cart/items/${encodeURIComponent(productId)}`, accessToken, {
          method: 'PUT',
          body: JSON.stringify({ quantity }),
        })
        setLines((current) => {
          const exists = current.some((line) => line.productId === productId)
          return exists
            ? current.map((line) =>
                line.productId === productId ? { ...line, qty: quantity } : line,
              )
            : [...current, { productId, qty: quantity }]
        })
        setCartOwnerId(customer.id)
        setError(null)
        setLastAdded({
          name: product.name,
          nonce: Date.now(),
          customerId: customer.id,
        })
        if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => {
          setLastAdded(null)
          toastTimer.current = null
        }, 2600)
      } catch (cause) {
        setError(getUserFacingError(cause, 'cart'))
        throw cause
      }
    },
    [accessToken, cartOwnerId, customer, lines, productsById],
  )

  const remove = useCallback(
    async (productId: string) => {
      if (!customer) throw new Error('Inicia sesión para administrar el carrito.')
      try {
        await cartRequest(
          `/api/cart/items/${encodeURIComponent(productId)}`,
          accessToken,
          { method: 'DELETE' },
        )
        setLines((current) =>
          current.filter((line) => line.productId !== productId),
        )
        setError(null)
      } catch (cause) {
        setError(getUserFacingError(cause, 'cart'))
        throw cause
      }
    },
    [accessToken, customer],
  )

  const setQty = useCallback(
    async (productId: string, qty: number) => {
      if (!customer) throw new Error('Inicia sesión para administrar el carrito.')
      if (!Number.isInteger(qty)) {
        throw new Error('La cantidad debe ser un número entero.')
      }
      if (qty <= 0) {
        await remove(productId)
        return
      }

      try {
        await cartRequest(
          `/api/cart/items/${encodeURIComponent(productId)}`,
          accessToken,
          { method: 'PUT', body: JSON.stringify({ quantity: qty }) },
        )
        setLines((current) =>
          current.map((line) =>
            line.productId === productId ? { ...line, qty } : line,
          ),
        )
        setError(null)
      } catch (cause) {
        setError(getUserFacingError(cause, 'cart'))
        throw cause
      }
    },
    [accessToken, customer, remove],
  )

  const clear = useCallback(async () => {
    if (!customer) throw new Error('Inicia sesión para administrar el carrito.')
    try {
      await cartRequest('/api/cart', accessToken, { method: 'DELETE' })
      setLines([])
      setError(null)
      setLastAdded(null)
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current)
        toastTimer.current = null
      }
    } catch (cause) {
      setError(getUserFacingError(cause, 'cart'))
      throw cause
    }
  }, [accessToken, customer])

  const refresh = useCallback(async () => {
    if (!customer) throw new Error('Inicia sesión para consultar el carrito.')
    try {
      const payload = await cartRequest('/api/cart', accessToken)
      setLines(parseCartLines(payload))
      setCartOwnerId(customer.id)
      setError(null)
    } catch (cause) {
      setError(getUserFacingError(cause, 'cart'))
      throw cause
    }
  }, [accessToken, customer])

  const open = useCallback(() => {
    if (customer) setIsOpen(true)
  }, [customer])
  const close = useCallback(() => setIsOpen(false), [])

  const { count, subtotal } = useMemo(
    () =>
      cartLines.reduce(
        (totals, line) => {
          const product = productsById.get(line.productId)
          if (!product) return totals
          return {
            count: totals.count + line.qty,
            subtotal: totals.subtotal + product.price * line.qty,
          }
        },
        { count: 0, subtotal: 0 },
      ),
    [cartLines, productsById],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines: cartLines,
      count,
      subtotal,
      loading: Boolean(customer && cartOwnerId !== customer.id),
      error:
        customer && cartOwnerId === customer.id ? error : null,
      isOpen,
      lastAdded,
      add,
      remove,
      setQty,
      clear,
      refresh,
      open,
      close,
    }),
    [
      cartLines,
      count,
      subtotal,
      cartOwnerId,
      customer,
      error,
      isOpen,
      lastAdded,
      add,
      remove,
      setQty,
      clear,
      refresh,
      open,
      close,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
