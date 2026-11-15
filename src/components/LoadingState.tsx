import { BrandMark } from './BrandMark'

export interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({ label = 'Cargando…', className }: LoadingStateProps) {
  const classes = ['loading-state', className ?? null].filter(Boolean).join(' ')

  return (
    <div className={classes} role="status" aria-live="polite">
      <BrandMark size="lg" pulse />
      <p className="loading-state__label">{label}</p>
      <span className="loading-state__bar" aria-hidden="true">
        <span />
      </span>
    </div>
  )
}

export default LoadingState
