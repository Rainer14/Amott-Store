import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchMyOrders } from '../data/orders'
import { formatPrice } from '../lib/format'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import type { CustomerOrder } from '../types'
import { LoadingState } from './LoadingState'

export function CustomerAccess({ mode }: { mode: 'login' | 'register' }) {
  const { customer, loading, error: sessionError, login, register } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const destination =
    (location.state as { from?: string } | null)?.from ?? '/'

  if (customer) return <Navigate to={destination} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    try {
      if (isRegister) {
        const name = String(formData.get('name') ?? '').trim()
        const phone = String(formData.get('phone') ?? '').trim()
        const address = String(formData.get('address') ?? '').trim()
        const result = await register(name, email, password, phone, address)
        navigate('/verificar-correo', {
          replace: true,
          state: { email: result.email },
        })
      } else {
        await login(email, password)
        navigate(destination, { replace: true })
      }
    } catch (cause) {
      if (
        !isRegister &&
        cause instanceof HttpRequestError &&
        cause.code === 'EMAIL_NOT_VERIFIED'
      ) {
        navigate('/verificar-correo', {
          replace: true,
          state: { email, reason: 'login' },
        })
        return
      }
      setFormError(getUserFacingError(cause, isRegister ? 'register' : 'login'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="customer-access">
      <div className="customer-access__panel">
        <p className="customer-access__eyebrow">AMOTT · CUENTA DE CLIENTE</p>
        <h1>{isRegister ? 'Crea tu cuenta.' : 'Qué bueno verte.'}</h1>
        <p className="customer-access__intro">
          {isRegister
            ? 'Regístrate para guardar tu carrito y finalizar tus compras.'
            : 'Inicia sesión para acceder a tu carrito y continuar tu compra.'}
        </p>

        {loading && <LoadingState label="Comprobando tu sesión…" />}
        {sessionError && !formError && (
          <p className="customer-access__error" role="alert">
            {sessionError}
          </p>
        )}
        {formError && (
          <p className="customer-access__error" role="alert">
            {formError}
          </p>
        )}

        <form className="customer-access__form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label htmlFor="customer-name">Nombre completo</label>
              <input
                id="customer-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                disabled={submitting || loading}
              />
              <label htmlFor="customer-phone">Número de teléfono</label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+58 416 1234567"
                required
                minLength={7}
                maxLength={25}
                disabled={submitting || loading}
              />
              <label htmlFor="customer-address">Dirección (opcional)</label>
              <input
                id="customer-address"
                name="address"
                type="text"
                autoComplete="street-address"
                maxLength={240}
                disabled={submitting || loading}
              />
            </>
          )}
          <label htmlFor="customer-email">Correo electrónico</label>
          <input
            id="customer-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={submitting || loading}
          />
          <label htmlFor="customer-password">Contraseña</label>
          <div className="customer-access__password">
            <input
              id="customer-password"
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={8}
              disabled={submitting || loading}
            />
            <button
              className="customer-access__password-toggle"
              type="button"
              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
              disabled={submitting || loading}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {passwordVisible ? (
                  <>
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.1 9.5 6.1a2 2 0 0 1 0 1.8 11 11 0 0 1-3.1 3.8M6.2 6.2A12.3 12.3 0 0 0 2.5 11a2 2 0 0 0 0 2c.9 1.9 4.3 6 9.5 6 1.2 0 2.3-.2 3.3-.7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>
          {isRegister && (
            <p className="customer-access__hint">
              Usa al menos 8 caracteres. El teléfono es obligatorio.
            </p>
          )}
          <button
            className="button button--solid customer-access__submit"
            type="submit"
            disabled={submitting || loading}
          >
            {submitting
              ? 'Un momento…'
              : isRegister
                ? 'Crear cuenta'
                : 'Iniciar sesión'}
          </button>
        </form>

        <p className="customer-access__switch">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
          <Link to={isRegister ? '/iniciar-sesion' : '/registro'}>
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </Link>
        </p>
        <Link className="customer-access__back" to="/">
          Volver a explorar la tienda
        </Link>
      </div>
    </section>
  )
}

type AccountTab = 'active' | 'paid' | 'all'

const orderStatusLabels: Record<string, string> = {
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

function formatOrderDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function CustomerAccount() {
  const { customer, accessToken, loading, logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [tab, setTab] = useState<AccountTab>('active')

  useEffect(() => {
    if (!customer || !accessToken) return
    const controller = new AbortController()
    fetchMyOrders(accessToken, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setOrders(items)
        setOrdersError(null)
        setOrdersLoading(false)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setOrdersError(getUserFacingError(cause, 'orders'))
          setOrdersLoading(false)
        }
      })
    return () => controller.abort()
  }, [customer, accessToken])

  if (loading) {
    return (
      <section className="customer-access">
        <LoadingState label="Comprobando tu cuenta…" />
      </section>
    )
  }
  if (!customer) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  const activeOrders = orders.filter(
    (order) => order.status !== 'delivered' && order.status !== 'cancelled',
  )
  const paidOrders = orders.filter((order) => order.payment_status === 'paid')
  const tabs: { key: AccountTab; label: string; items: CustomerOrder[] }[] = [
    { key: 'active', label: 'Activas', items: activeOrders },
    { key: 'paid', label: 'Pagadas', items: paidOrders },
    { key: 'all', label: 'Historial', items: orders },
  ]
  const visibleOrders = tabs.find((option) => option.key === tab)?.items ?? []

  const handleLogout = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await logout()
    } catch (cause) {
      setError(getUserFacingError(cause, 'logout'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="customer-access">
      <div className="customer-access__panel customer-account__panel">
        <p className="customer-access__eyebrow">AMOTT · TU CUENTA</p>
        <h1>Hola, {customer.name}.</h1>
        <p className="customer-access__intro">{customer.email}</p>
        {(customer.phone || customer.address) && (
          <p className="customer-account__contact">
            {customer.phone && <span>Teléfono: {customer.phone}</span>}
            {customer.address && <span>Dirección: {customer.address}</span>}
          </p>
        )}
        {!customer.emailVerified && (
          <p
            className="customer-access__notice customer-account__verification"
            role="status"
          >
            Tu correo todavía no está verificado.{' '}
            <Link to="/verificar-correo" state={{ email: customer.email }}>
              Verificar ahora
            </Link>
          </p>
        )}
        {error && (
          <p className="customer-access__error" role="alert">
            {error}
          </p>
        )}

        <div className="customer-account__orders">
          <h2 className="customer-account__title">Mis pedidos</h2>
          <div className="customer-account__tabs" role="group" aria-label="Filtrar pedidos">
            {tabs.map((option) => (
              <button
                key={option.key}
                type="button"
                className="customer-account__tab"
                aria-pressed={tab === option.key}
                onClick={() => setTab(option.key)}
              >
                {option.label}
                <span className="customer-account__count">{option.items.length}</span>
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <LoadingState label="Cargando tus pedidos…" />
          ) : ordersError ? (
            <p className="customer-access__error" role="alert">
              {ordersError}
            </p>
          ) : visibleOrders.length === 0 ? (
            <p className="customer-account__empty">
              Todavía no tienes pedidos en esta sección.
            </p>
          ) : (
            <ul className="customer-account__order-list">
              {visibleOrders.map((order) => (
                <li className="customer-account__order" key={order.id}>
                  <div className="customer-account__order-head">
                    <strong>Pedido #{order.id.slice(0, 8)}</strong>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                  <p className="customer-account__order-meta">
                    {formatOrderDate(order.created_at)} · {order.item_count}{' '}
                    {order.item_count === 1 ? 'artículo' : 'artículos'} ·{' '}
                    {paymentMethodLabels[order.payment_method] ?? order.payment_method}
                  </p>
                  <div className="customer-account__badges">
                    <span className={`order-badge order-badge--${order.status}`}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                    <span className={`order-badge order-badge--${order.payment_status}`}>
                      {paymentStatusLabels[order.payment_status] ?? order.payment_status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="customer-account__actions">
          <Link className="button button--solid" to="/">
            Seguir explorando
          </Link>
          <button
            className="button button--outline"
            type="button"
            onClick={() => void handleLogout()}
            disabled={submitting}
          >
            {submitting ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </section>
  )
}
