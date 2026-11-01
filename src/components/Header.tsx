import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../cart/useCart'
import { Logo } from './Logo'

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
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

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
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? 'Cerrar' : 'Menú'}
          </button>
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
        </div>
      </div>
    </header>
  )
}
