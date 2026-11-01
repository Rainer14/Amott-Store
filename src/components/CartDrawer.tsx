import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import { useProducts } from '../data/ProductsContext'
import { formatPrice } from '../lib/format'

type Step = 'bag' | 'checkout' | 'done'

interface Order {
  number: string
  email: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CartDrawer() {
  const {
    lines,
    count,
    subtotal,
    isOpen,
    close,
    remove,
    setQty,
    clear,
  } = useCart()
  const { products } = useProducts()
  const [step, setStep] = useState<Step>('bag')
  const [order, setOrder] = useState<Order | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

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

  const handleCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')
    setOrder({
      number: `AM-${Math.floor(1000 + Math.random() * 9000)}`,
      email,
    })
    clear()
    setStep('done')
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
          {step === 'bag' && (
            <>
              {lines.length === 0 ? (
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
                    const product = products.find(
                      (item) => item.id === line.productId,
                    )
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
                              {formatPrice(product.price * line.qty)}
                            </span>
                          </div>
                          <p className="cart-item__origin">
                            SKU {product.sku}
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
                                  setQty(product.id, line.qty - 1)
                                }
                                aria-label={`Quitar una unidad de ${product.name}`}
                              >
                                −
                              </button>
                              <span aria-live="polite">{line.qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQty(product.id, line.qty + 1)
                                }
                                aria-label={`Añadir una unidad de ${product.name}`}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-item__remove"
                              onClick={() => remove(product.id)}
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
            <form className="checkout" onSubmit={handleCheckout}>
              <button
                type="button"
                className="cart-back"
                onClick={() => setStep('bag')}
              >
                Volver a la bolsa
              </button>
              <p className="checkout__intro">
                Un pedido de demostración. No se procesará ningún pago.
              </p>

              <label htmlFor="checkout-email">Correo electrónico</label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />

              <label htmlFor="checkout-name">Nombre completo</label>
              <input
                id="checkout-name"
                name="name"
                type="text"
                autoComplete="name"
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
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <button
                type="submit"
                className="button button--solid button--full"
              >
                Confirmar pedido
              </button>
              <p className="cart-demo">
                Demostración: no se procesará ningún pago.
              </p>
            </form>
          )}

          {step === 'done' && order && (
            <div className="cart-done">
              <span className="cart-done__stamp" aria-hidden="true">
                AM
              </span>
              <p className="cart-done__number">Pedido {order.number}</p>
              <h3>¡Gracias por tu pedido!</h3>
              <p>
                El pedido de demostración se registró para{' '}
                <strong>{order.email}</strong>. No se envió ningún correo ni se
                procesó un pago.
              </p>
              <p className="cart-demo">
                Demostración: no se procesó ningún pago.
              </p>
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

        {step === 'bag' && lines.length > 0 && (
          <div className="cart-panel__foot">
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="cart-shipping">
              Envío calculado al finalizar. Embalaje sin plástico.
            </p>
            <button
              type="button"
              className="button button--solid button--full"
              onClick={() => setStep('checkout')}
            >
              Finalizar compra
            </button>
            <p className="cart-demo">
              Demostración: no se procesará ningún pago.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
