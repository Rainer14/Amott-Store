import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/useCart'
import { Logo } from './Logo'
import { getUserFacingError } from '../lib/userFacingError'

function BagIcon() {
  return (
    <svg
      className="bag-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 8h14l-1 12H6L5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Header() {
  const { count, open } = useCart()
  const { customer, loading: authLoading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const handleLogout = async () => {
    setLogoutError(null)
    try {
      await logout()
    } catch (cause) {
      setLogoutError(getUserFacingError(cause, 'logout'))
    }
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link
          className="brand-link"
          to="/"
          aria-label="Amott, ir a la tienda"
          onClick={closeMenu}
        >
          <Logo tone="bone" />
        </Link>

        <nav
          id="menu-principal"
          className={`site-nav${menuOpen ? ' site-nav--open' : ''}`}
          aria-label="Navegación principal"
        >
          <NavLink to="/" end onClick={closeMenu}>
            Tienda
          </NavLink>
          <NavLink to="/nosotros" end onClick={closeMenu}>
            Sobre nosotros
          </NavLink>
          <Link to="/nosotros#comprar" onClick={closeMenu}>
            Guía de compra
          </Link>
          <Link to="/nosotros#casa" onClick={closeMenu}>
            Nuestra tienda
          </Link>
          {!authLoading && (
            <div className="site-nav__account">
              {customer ? (
                <>
                  <Link
                    className="header-account-link"
                    to="/cuenta"
                    onClick={closeMenu}
                  >
                    Mi cuenta
                  </Link>
                  <button
                    type="button"
                    className="header-account-link header-account-link--button"
                    onClick={() => {
                      closeMenu()
                      void handleLogout()
                    }}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link
                    className="header-account-link"
                    to="/iniciar-sesion"
                    onClick={closeMenu}
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    className="header-register-link"
                    to="/registro"
                    onClick={closeMenu}
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span
              className={`menu-toggle__icon${menuOpen ? ' menu-toggle__icon--open' : ''}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          </button>
          {!authLoading &&
            (customer ? (
              <>
                <Link
                  className="header-account-link"
                  to="/cuenta"
                  onClick={closeMenu}
                >
                  Mi cuenta
                </Link>
                <button
                  type="button"
                  className="cart-button"
                  onClick={open}
                  aria-label={`Bolsa ${count}. Abrir la bolsa.`}
                >
                  <BagIcon />
                  <span className="cart-button__label">Bolsa</span>{' '}
                  <span className="cart-button__count" aria-hidden="true">
                    {count}
                  </span>
                </button>
                <button
                  type="button"
                  className="header-account-link header-account-link--button"
                  onClick={() => void handleLogout()}
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  className="header-account-link"
                  to="/iniciar-sesion"
                  onClick={closeMenu}
                >
                  Iniciar sesión
                </Link>
                <Link
                  className="header-register-link"
                  to="/registro"
                  onClick={closeMenu}
                >
                  Registrarse
                </Link>
              </>
            ))}
        </div>
      </div>
      {logoutError && (
        <p className="site-header__error" role="alert">
          {logoutError}
        </p>
      )}
    </header>
  )
}
