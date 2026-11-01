import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/useCart'
import { formatPrice } from '../lib/format'
import { getUserFacingError } from '../lib/userFacingError'
import type { Product } from '../types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { customer } = useAuth()
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const handleAdd = async () => {
    setAdding(true)
    setAddError(null)
    try {
      await add(product.id)
      setAdded(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setAdded(false), 1600)
    } catch (cause) {
      setAddError(getUserFacingError(cause, 'cart'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className={`product product--${product.category}`}>
      <div className="product__art">
        <span className="product__tag">
          <i aria-hidden="true" />
          {product.categoryName}
        </span>
        {product.imageUrl ? (
          <img
            className="product__image"
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div
            className="product__image-placeholder"
            role="img"
            aria-label={`Imagen no disponible: ${product.name}`}
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M8 16h32v24H8zM15 16l3-7h12l3 7M8 23h32M20 28h8v12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="product__body">
        <h3>{product.name}</h3>
        <p className="product__blurb">
          {product.description || 'Sin descripción disponible.'}
        </p>
        <div className="product__meta">
          <span>{product.brand || product.categoryName}</span>
          <span>SKU {product.sku}</span>
        </div>
        <div className="product__foot">
          <span className="product__price">{formatPrice(product.price)}</span>
          {customer && (
            <button
              type="button"
              className={`product__add${added ? ' product__add--added' : ''}`}
              onClick={() => void handleAdd()}
              disabled={adding}
              aria-label={`Añadir ${product.name} a la bolsa`}
            >
              {adding ? 'Añadiendo…' : added ? 'Añadido' : 'Añadir'}
            </button>
          )}
        </div>
        {!customer && (
          <Link className="product__signin" to="/iniciar-sesion">
            Inicia sesión para comprar
          </Link>
        )}
        {addError && (
          <p className="product__error" role="alert">
            {addError}
          </p>
        )}
      </div>
    </article>
  )
}
