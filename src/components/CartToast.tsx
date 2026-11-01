import { useCart } from '../cart/useCart'

export function CartToast() {
  const { lastAdded } = useCart()

  return (
    <div
      className={`cart-toast${lastAdded ? ' cart-toast--visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {lastAdded ? `${lastAdded.name} añadido a la bolsa.` : ''}
    </div>
  )
}
