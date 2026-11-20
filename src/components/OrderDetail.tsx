import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchOrderDetail } from '../data/orders'
import { formatPrice } from '../lib/format'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import type { CustomerOrderDetail } from '../types'
import { LoadingState } from './LoadingState'

const statusLabels: Record<string, string> = {
  created: 'Creada',
  confirmed: 'Confirmada',
  shipped: 'En camino',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Sin pagar',
  paid: 'Pagada',
  partial: 'Pago parcial',
  failed: 'Pago fallido',
  refunded: 'Reembolsada',
}

const paymentMethodLabels: Record<string, string> = {
  bolivares: 'Bolívares',
  usdt: 'USDT',
  usd: 'USD',
}

interface OrderState {
  key: string
  order: CustomerOrderDetail | null
  error: string | null
}

const INITIAL_STATE: OrderState = { key: '', order: null, error: null }

function formatOrderDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { customer, accessToken, loading: authLoading } = useAuth()
  const [state, setState] = useState<OrderState>(INITIAL_STATE)

  const requestKey = customer ? `${customer.id}:${id ?? ''}` : ''
  const isCurrent = Boolean(requestKey) && state.key === requestKey
  const order = isCurrent ? state.order : null
  const error = isCurrent ? state.error : null
  const loading = Boolean(requestKey) && !isCurrent

  useEffect(() => {
    if (!requestKey || !accessToken || !id) return

    const controller = new AbortController()
    fetchOrderDetail(id, accessToken, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        setState({ key: requestKey, order: detail, error: null })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setState({
          key: requestKey,
          order: null,
          error:
            cause instanceof HttpRequestError && cause.status === 404
              ? 'No encontramos ese pedido o no pertenece a tu cuenta.'
              : getUserFacingError(cause, 'orders'),
        })
      })

    return () => controller.abort()
  }, [accessToken, id, requestKey])

  if (authLoading) {
    return (
      <section className="customer-access">
        <LoadingState label="Comprobando tu sesión…" />
      </section>
    )
  }
  if (!customer) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  const shortId = order?.id.slice(0, 8) ?? id?.slice(0, 8) ?? ''

  return (
    <section className="customer-access">
      <div className="customer-access__panel order-detail__panel">
        <p className="customer-access__eyebrow">AMOTT · DETALLE DEL PEDIDO</p>
        <h1>Tu pedido #{shortId}</h1>

        {loading ? (
          <LoadingState label="Cargando tu pedido…" />
        ) : error ? (
          <>
            <p className="customer-access__error" role="alert">
              {error}
            </p>
            <Link className="button button--outline" to="/cuenta">
              Volver a mis pedidos
            </Link>
          </>
        ) : order ? (
          <>
            <p className="order-detail__meta">
              {formatOrderDate(order.created_at)} ·{' '}
              {order.items.reduce((total, item) => total + item.quantity, 0)}{' '}
              {order.item_count === 1 ? 'artículo' : 'artículos'} ·{' '}
              {paymentMethodLabels[order.payment_method] ?? order.payment_method}
            </p>
            <div className="customer-account__badges">
              <span className={`order-badge order-badge--${order.status}`}>
                {statusLabels[order.status] ?? order.status}
              </span>
              <span
                className={`order-badge order-badge--${order.payment_status}`}
              >
                {paymentStatusLabels[order.payment_status] ??
                  order.payment_status}
              </span>
            </div>

            <ul className="order-detail__items">
              {order.items.map((item) => (
                <li className="order-detail__item" key={item.id}>
                  <div className="order-detail__art">
                    {item.image_url ? (
                      <img
                        className="order-detail__image"
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="order-detail__image-placeholder">
                        Sin imagen
                      </span>
                    )}
                  </div>
                  <div className="order-detail__info">
                    <h2 className="order-detail__name">{item.name}</h2>
                    {item.sku && (
                      <p className="order-detail__sku">SKU: {item.sku}</p>
                    )}
                    <p className="order-detail__quantity">
                      Cantidad: {item.quantity}
                    </p>
                    <p className="order-detail__price">
                      {formatPrice(item.unit_price)} c/u
                    </p>
                  </div>
                  <strong className="order-detail__line-total">
                    {formatPrice(item.line_total)}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="order-detail__summary">
              <div>
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div>
                <span>Envío</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
              <div>
                <span>Impuesto</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="order-detail__total">
                <strong>Total</strong>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </div>

            {order.shipping.name ||
            order.shipping.address ||
            order.shipping.city ||
            order.shipping.phone ? (
              <div className="order-detail__shipping">
                <h2 className="order-detail__section-title">Datos de envío</h2>
                {order.shipping.name && <p>{order.shipping.name}</p>}
                {order.shipping.address && <p>{order.shipping.address}</p>}
                {order.shipping.city && <p>{order.shipping.city}</p>}
                {order.shipping.phone && (
                  <p>Teléfono: {order.shipping.phone}</p>
                )}
              </div>
            ) : null}

            {order.notes && (
              <div className="order-detail__shipping">
                <h2 className="order-detail__section-title">Notas</h2>
                <p>{order.notes}</p>
              </div>
            )}

            <div className="customer-account__actions">
              <Link className="button button--solid" to="/cuenta">
                Volver a mis pedidos
              </Link>
              <Link className="button button--outline" to="/">
                Seguir explorando
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
