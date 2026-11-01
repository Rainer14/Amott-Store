import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getUserFacingError } from '../lib/userFacingError'

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
        await register(name, email, password)
      } else {
        await login(email, password)
      }
      navigate(destination, { replace: true })
    } catch (cause) {
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

        {loading && (
          <p className="customer-access__notice" role="status">
            Comprobando tu sesión…
          </p>
        )}
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
              Usa al menos 8 caracteres.
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

export function CustomerAccount() {
  const { customer, loading, logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <section className="customer-access">
        <p role="status">Comprobando tu cuenta…</p>
      </section>
    )
  }
  if (!customer) {
    return <Navigate to="/iniciar-sesion" replace />
  }

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
      <div className="customer-access__panel">
        <p className="customer-access__eyebrow">AMOTT · TU CUENTA</p>
        <h1>Hola, {customer.name}.</h1>
        <p className="customer-access__intro">{customer.email}</p>
        {error && (
          <p className="customer-access__error" role="alert">
            {error}
          </p>
        )}
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
