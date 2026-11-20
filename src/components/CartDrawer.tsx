import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/useCart'
import { useProducts } from '../data/ProductsContext'
import type { Product } from '../types'
import { formatPrice } from '../lib/format'
import { LoadingState } from './LoadingState'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import { apiUrl } from '../lib/api'

type Step = 'bag' | 'checkout' | 'done'
type WholesalePaymentMethod = 'VES' | 'USDT'

interface Order {
  id: string | null
}

function getWholesaleUnitPrice(
  product: Product,
  method: WholesalePaymentMethod,
) {
  const mayor = product.wholesalePrices?.[0]
  const usdt = product.wholesalePrices?.[1]
  if (method === 'VES') return mayor ?? product.price
  return usdt ?? mayor ?? product.price
}

function getPaymentMethodLabel(method: WholesalePaymentMethod) {
  return method === 'VES'
    ? 'Bolívares (precio MAYOR)'
    : 'USDT / USD (precio USDT)'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CartDrawer() {
  const { customer, accessToken } = useAuth()
  const {
    lines,
    count,
    subtotal,
    isOpen,
    close,
    remove,
    setQty,
    loading: cartLoading,
    error: cartError,
    refresh,
  } = useCart()
  const { findProduct } = useProducts()
  const [step, setStep] = useState<Step>('bag')
  const [order, setOrder] = useState<Order | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [cartActionError, setCartActionError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<WholesalePaymentMethod>('VES')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  const isWholesale = Boolean(customer?.isWholesale)
  const effectiveSubtotal = useMemo(() => {
    if (!isWholesale) return subtotal
    return lines.reduce((sum, line) => {
      const product = findProduct(line.productId)
      if (!product) return sum
      return sum + getWholesaleUnitPrice(product, paymentMethod) * line.qty
    }, 0)
  }, [findProduct, isWholesale, lines, paymentMethod, subtotal])

  const handleClose = useCallback(() => {
    setStep('bag')
    setOrder(null)
    close()
  }, [close])

  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return

    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    bodyRef.current?.scrollTo({ top: 0 })

    const getFocusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          element.getAttribute('aria-hidden') !== 'true',
      )

    const frame = window.requestAnimationFrame(() => {
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        getFocusable()[0]
      target?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!panel.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus()
    }
  }, [isOpen, handleClose])

  useEffect(() => {
    if (!isOpen) return
    if (step === 'checkout') {
      const email = panelRef.current?.querySelector<HTMLInputElement>(
        '#checkout-email',
      )
      email?.focus()
    }
    if (step === 'done') {
      panelRef.current
        ?.querySelector<HTMLElement>('[data-done-focus]')
        ?.focus()
    }
    bodyRef.current?.scrollTo({ top: 0 })
  }, [isOpen, step])

  const handleCartAction = async (action: () => Promise<void>) => {
    setCartActionError(null)
    try {
      await action()
    } catch (cause) {
      setCartActionError(getUserFacingError(cause, 'cart'))
    }
  }

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!customer?.emailVerified) {
      setCheckoutError('Verifica tu correo antes de confirmar el pedido.')
      return
    }
    setCheckoutError(null)
    setCheckoutSubmitting(true)
    const data = new FormData(event.currentTarget)
    const shippingName = String(data.get('name') ?? '').trim()
    const shippingAddress = String(data.get('address') ?? '').trim()
    const shippingCity = String(data.get('city') ?? '').trim()
    const shippingPostal = String(data.get('postal') ?? '').trim()
    const body: Record<string, string> = {
      shipping_name: shippingName,
      shipping_address: shippingPostal
        ? `${shippingAddress}, ${shippingPostal}`
        : shippingAddress,
      shipping_city: shippingCity,
      // La API exige el método de pago explícito: si falta asume "bolivares"
      // y factura con el precio mayor equivocado.
      payment_method: paymentMethod === 'USDT' ? 'usdt' : 'bolivares',
    }
    if (isWholesale) {
      body.notes = `Método de pago: ${getPaymentMethodLabel(paymentMethod)}`
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    try {
      const response = await fetch(apiUrl('/api/orders/checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify(body),
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

      if (!response.ok) {
        throw new HttpRequestError(response.status)
      }

      const responseData =
        isRecord(payload) && isRecord(payload.data) ? payload.data : payload
      const orderData =
        isRecord(responseData) && isRecord(responseData.order)
          ? responseData.order
          : responseData
      const rawOrderId = isRecord(orderData)
        ? orderData.id ??
          orderData.orderId ??
          orderData.order_id ??
          orderData.number ??
          orderData.code
        : null
      setOrder({
        id:
          typeof rawOrderId === 'string' || typeof rawOrderId === 'number'
            ? String(rawOrderId)
            : null,
      })
      setStep('done')
      try {
        await refresh()
      } catch {
        setCheckoutError(
          'El pedido se confirmó, pero no se pudo actualizar la vista del carrito.',
        )
      }
    } catch (cause) {
      setCheckoutError(
        getUserFacingError(cause, 'checkout'),
      )
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const title =
    step === 'checkout'
      ? 'Finalizar compra'
      : step === 'done'
        ? 'Pedido confirmado'
        : 'Tu bolsa'

  const subtitle =
    step === 'checkout'
      ? 'Datos de envío'
      : step === 'done'
        ? 'Gracias por mirar de cerca.'
        : `${count} ${count === 1 ? 'producto' : 'productos'} en la bolsa`

  if (!customer) return null

  return (
    <div
      className={`cart-layer${isOpen ? ' cart-layer--open' : ''}`}
      aria-hidden={isOpen ? undefined : true}
    >
      <div
        className="cart-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="cart-panel__head">
          <div>
            <h2 id="cart-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="cart-close"
            onClick={handleClose}
            aria-label="Cerrar la bolsa"
            data-autofocus
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="cart-panel__body" ref={bodyRef}>
          {cartError && (
            <p className="cart-action-error" role="alert">
              No se pudo sincronizar el carrito. {cartError}
            </p>
          )}
          {cartActionError && (
            <p className="cart-action-error" role="alert">
              {cartActionError}
            </p>
          )}
          {step === 'bag' && (
            <>
              {cartLoading ? (
                <LoadingState label="Cargando tu carrito…" />
              ) : lines.length === 0 ? (
                <div className="cart-empty">
                  <svg
                    className="cart-empty__icon"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 17h28l-2 23H12l-2-23Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 18v-4a6 6 0 0 1 12 0v4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <h3>Tu bolsa está esperando.</h3>
                  <p>
                    Todavía no agregaste productos. Explora la tienda y
                    encuentra lo que necesitas.
                  </p>
                  <Link
                    className="button button--solid"
                    to="/"
                    onClick={handleClose}
                  >
                    Ir a la tienda
                  </Link>
                </div>
              ) : (
                <ul className="cart-list">
                  {lines.map((line) => {
                    const product = findProduct(line.productId)
                    if (!product) return null
                    return (
                      <li className="cart-item" key={line.productId}>
                        <div className="cart-item__art">
                          {product.imageUrl ? (
                            <img
                              className="cart-item__image"
                              src={product.imageUrl}
                              alt=""
                            />
                          ) : (
                            <span
                              className="cart-item__image-placeholder"
                              aria-label="Imagen no disponible"
                            >
                              Sin imagen
                            </span>
                          )}
                        </div>
                        <div className="cart-item__body">
                          <div className="cart-item__top">
                            <h3>{product.name}</h3>
                            <span>
                              {formatPrice(
                                (isWholesale
                                  ? getWholesaleUnitPrice(product, paymentMethod)
                                  : product.price) * line.qty,
                              )}
                            </span>
                          </div>
                          <p className="cart-item__origin">
                            SKU {product.sku}
                            {isWholesale && (
                              <> · {formatPrice(getWholesaleUnitPrice(product, paymentMethod))} c/u</>
                            )}
                          </p>
                          <div className="cart-item__controls">
                            <div
                              className="qty"
                              role="group"
                              aria-label={`Cantidad de ${product.name}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCartAction(() =>
                                    setQty(product.id, line.qty - 1),
                                  )
                                }
                                disabled={cartLoading}
                                aria-label={`Quitar una unidad de ${product.name}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                inputMode="numeric"
                                defaultValue={line.qty}
                                key={`${product.id}-${line.qty}`}
                                disabled={cartLoading}
                                aria-label={`Cantidad de ${product.name}`}
                                onBlur={(event) => {
                                  const next = Number.parseInt(event.currentTarget.value, 10)
                                  if (!Number.isFinite(next) || next < 1) {
                                    event.currentTarget.value = String(line.qty)
                                    return
                                  }
                                  if (next !== line.qty) {
                                    void handleCartAction(() => setQty(product.id, next))
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    event.currentTarget.blur()
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCartAction(() =>
                                    setQty(product.id, line.qty + 1),
                                  )
                                }
                                disabled={cartLoading}
                                aria-label={`Añadir una unidad de ${product.name}`}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-item__remove"
                              onClick={() =>
                                void handleCartAction(() =>
                                  remove(product.id),
                                )
                              }
                              disabled={cartLoading}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form
              className="checkout"
              onSubmit={(event) => void handleCheckout(event)}
            >
              <button
                type="button"
                className="cart-back"
                onClick={() => setStep('bag')}
              >
                Volver a la bolsa
              </button>
              <p className="checkout__intro">
                Los datos se enviarán de forma segura para crear tu pedido.
              </p>

              {!customer?.emailVerified && (
                <div className="checkout__verification" role="status">
                  <strong>Confirma tu correo para comprar.</strong>{' '}
                  Te enviamos un enlace de verificación.{' '}
                  <Link
                    to="/verificar-correo"
                    state={{ email: customer?.email }}
                    onClick={handleClose}
                  >
                    Verificar correo
                  </Link>
                </div>
              )}

              {checkoutError && (
                <p className="cart-action-error" role="alert">
                  {checkoutError}
                </p>
              )}

              <label htmlFor="checkout-email">Correo electrónico</label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={customer.email}
                required
              />

              <label htmlFor="checkout-name">Nombre completo</label>
              <input
                id="checkout-name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={customer.name}
                required
              />

              <label htmlFor="checkout-address">Dirección</label>
              <input
                id="checkout-address"
                name="address"
                type="text"
                autoComplete="street-address"
                required
              />

              <div className="checkout__row">
                <div>
                  <label htmlFor="checkout-city">Ciudad</label>
                  <input
                    id="checkout-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="checkout-postal">Código postal</label>
                  <input
                    id="checkout-postal"
                    name="postal"
                    type="text"
                    autoComplete="postal-code"
                    required
                  />
                </div>
              </div>

              <div className="checkout__summary">
                <span>Subtotal</span>
                <strong>{formatPrice(effectiveSubtotal)}</strong>
              </div>
              {isWholesale && (
                <p className="checkout__intro">
                  Método de pago: {getPaymentMethodLabel(paymentMethod)}
                </p>
              )}

              <button
                type="submit"
                className="button button--solid button--full"
                disabled={checkoutSubmitting || !customer?.emailVerified}
              >
                {checkoutSubmitting ? 'Procesando…' : 'Confirmar pedido'}
              </button>
            </form>
          )}

          {step === 'done' && order && (
            <div className="cart-done">
              <span className="cart-done__stamp" aria-hidden="true">
                AM
              </span>
              {order.id && (
                <p className="cart-done__number">Pedido {order.id}</p>
              )}
              <h3>¡Gracias por tu pedido!</h3>
              <p>
                Tu pedido se registró correctamente. Recibirás las novedades
                en el correo asociado a tu cuenta.
              </p>
              {checkoutError && (
                <p className="cart-action-error" role="alert">
                  {checkoutError}
                </p>
              )}
              <button
                type="button"
                className="button button--solid"
                onClick={handleClose}
                data-done-focus
              >
                Seguir mirando
              </button>
            </div>
          )}
        </div>

        {step === 'bag' && !cartLoading && lines.length > 0 && (
          <div className="cart-panel__foot">
            {isWholesale && (
              <div
                role="group"
                aria-label="Método de pago"
                style={{
                  marginBottom: '10px',
                  padding: '8px 10px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: 'rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600 }}>
                    Pago
                  </span>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      type="button"
                      className={`button ${paymentMethod === 'VES' ? 'button--solid' : 'button--outline'}`}
                      onClick={() => setPaymentMethod('VES')}
                      aria-pressed={paymentMethod === 'VES'}
                      style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      Bs (MAYOR)
                    </button>
                    <button
                      type="button"
                      className={`button ${paymentMethod === 'USDT' ? 'button--solid' : 'button--outline'}`}
                      onClick={() => setPaymentMethod('USDT')}
                      aria-pressed={paymentMethod === 'USDT'}
                      style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      USDT/USD
                    </button>
                  </div>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.72rem', lineHeight: 1.3, color: 'rgba(0,0,0,0.68)' }}>
                  {paymentMethod === 'VES' ? 'Precios MAYOR por producto.' : 'Precios USDT por producto.'}
                </p>
              </div>
            )}
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>{formatPrice(effectiveSubtotal)}</strong>
            </div>
            <p className="cart-shipping">
              Envío calculado al finalizar. Embalaje sin plástico.
            </p>
            <button
              type="button"
              className="button button--solid button--full"
              disabled={cartLoading}
              onClick={() => setStep('checkout')}
            >
              Finalizar compra
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
