export type UserErrorContext =
  | 'login'
  | 'register'
  | 'session'
  | 'logout'
  | 'cart'
  | 'checkout'
  | 'catalog'
  | 'verifyEmail'
  | 'resendVerification'

export class HttpRequestError extends Error {
  readonly status: number
  readonly code?: string
  readonly serverMessage?: string

  constructor(status: number, code?: string, serverMessage?: string) {
    super(serverMessage || `HTTP ${status}`)
    this.name = 'HttpRequestError'
    this.status = status
    this.code = code
    this.serverMessage = serverMessage
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
  verifyEmail: 'No pudimos verificar tu correo. Inténtalo nuevamente.',
  resendVerification:
    'No pudimos enviar el correo de verificación. Inténtalo nuevamente.',
}

export function getUserFacingError(
  cause: unknown,
  context: UserErrorContext,
): string {
  if (!(cause instanceof HttpRequestError)) {
    return fallbackMessages[context]
  }

  if (cause.code === 'EMAIL_NOT_VERIFIED') {
    return 'Tu correo todavía no está verificado. Revisa tu bandeja de entrada o solicita un nuevo enlace.'
  }

  if (context === 'verifyEmail') {
    if (
      cause.code === 'TOKEN_EXPIRED' ||
      cause.code === 'TOKEN_INVALID' ||
      cause.code === 'INVALID_TOKEN' ||
      cause.status === 400 ||
      cause.status === 404 ||
      cause.status === 410
    ) {
      return 'El enlace no es válido o ya expiró. Solicita uno nuevo.'
    }
    if (cause.status === 429 || cause.code === 'RATE_LIMITED') {
      return 'Hiciste varios intentos seguidos. Espera un momento antes de volver a intentarlo.'
    }
    return fallbackMessages.verifyEmail
  }

  if (context === 'resendVerification') {
    if (cause.status === 429 || cause.code === 'RATE_LIMITED') {
      return 'Pediste un correo hace poco. Espera un momento antes de solicitar otro.'
    }
    return fallbackMessages.resendVerification
  }

  if (context === 'register' && cause.code === 'EMAIL_TAKEN') {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.'
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
