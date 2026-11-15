export interface BrandMarkProps {
  size?: 'sm' | 'lg'
  variant?: 'pill' | 'plain'
  className?: string
  pulse?: boolean
}

/**
 * Isotipo de Amott (triceratops). Por defecto sobre pastilla cálida;
 * con `plain` solo el isotipo, útil en línea o sobre fondos propios.
 */
export function BrandMark({
  size = 'sm',
  variant = 'pill',
  className,
  pulse = false,
}: BrandMarkProps) {
  const classes = [
    'brand-mark',
    size === 'lg' ? 'brand-mark--lg' : null,
    variant === 'plain' ? 'brand-mark--plain' : null,
    pulse ? 'brand-mark--pulse' : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} aria-hidden="true">
      <img src="/triceratops.webp" alt="" width={512} height={512} draggable={false} />
    </span>
  )
}

export default BrandMark
