export type UserErrorContext =
  | 'login'
  | 'register'
  | 'session'
  | 'logout'
  | 'cart'
  | 'checkout'
  | 'catalog'

export class HttpRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`HTTP ${status}`)
    this.name = 'HttpRequestError'
    this.status = status
  }
}

const fallbackMessages: Record<UserErrorContext, string> = {
  login: 'No pudimos iniciar sesión. Inténtalo de nuevo más tarde.',
  register: 'No pudimos crear tu cuenta. Inténtalo de nuevo más tarde.',
  session: 'No pudimos comprobar tu sesión. Inténtalo de nuevo más tarde.',
  logout: 'No pudimos confirmar el cierre de sesión. Inténtalo nuevamente.',
  cart: 'No pudimos actualizar tu carrito. Inténtalo nuevamente.',
  checkout: 'No pudimos procesar tu compra. Inténtalo nuevamente.',
  catalog: 'No pudimos cargar el catálogo. Inténtalo nuevamente.',
}

export function getUserFacingError(
  cause: unknown,
  context: UserErrorContext,
): string {
  if (!(cause instanceof HttpRequestError)) {
    return fallbackMessages[context]
  }

  if (cause.status === 401) {
    if (context === 'login') {
      return 'El correo o la contraseña no son correctos.'
    }
    if (context === 'session' || context === 'cart' || context === 'checkout') {
      return 'Tu sesión pudo haber expirado. Inicia sesión para continuar.'
    }
    if (context === 'logout') {
      return 'La sesión se cerró en esta tienda, pero no pudimos confirmarlo con el servidor.'
    }
  }

  if (cause.status === 403) {
    if (context === 'cart' || context === 'checkout') {
      return 'No tienes permiso para realizar esta acción. Comprueba tu sesión e inténtalo nuevamente.'
    }
    return fallbackMessages[context]
  }

  if (cause.status === 400 || cause.status === 422) {
    if (context === 'register') {
      return 'Revisa los datos ingresados e inténtalo nuevamente.'
    }
    if (context === 'login') {
      return 'Revisa el correo y la contraseña e inténtalo nuevamente.'
    }
    if (context === 'checkout') {
      return 'Revisa los datos de envío e inténtalo nuevamente.'
    }
    return fallbackMessages[context]
  }

  if (cause.status === 409 && context === 'register') {
    return 'No pudimos crear la cuenta con esos datos. Verifícalos o intenta iniciar sesión.'
  }

  if (cause.status === 429) {
    return 'Hubo varios intentos recientes. Espera un momento antes de volver a intentarlo.'
  }

  if (cause.status >= 500) {
    return 'El servicio no está disponible por el momento. Inténtalo más tarde.'
  }

  return fallbackMessages[context]
}
