import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  RESEND_COOLDOWN_SECONDS,
  clearPendingEmail,
  getRemainingCooldownSeconds,
  readPendingEmail,
  rememberPendingEmail,
  setResendAvailableAt,
} from '../auth/verificationStorage'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'

type VerifyStatus =
  | 'verifying'
  | 'success'
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'error'

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, local.length > 2 ? 2 : 1)
  const hidden = '*'.repeat(
    Math.max(1, Math.min(local.length - visible.length, 6)),
  )
  return `${visible}${hidden}@${domain}`
}

export function EmailVerificationNotice() {
  const location = useLocation()
  const { resendVerification } = useAuth()
  const state = location.state as {
    email?: unknown
    reason?: unknown
  } | null
  const stateEmail =
    typeof state?.email === 'string' ? state.email.trim() : ''
  const cameFromLogin = state?.reason === 'login'
  const [email, setEmail] = useState(
    () => stateEmail || readPendingEmail() || '',
  )
  const [emailDraft, setEmailDraft] = useState('')
  const [remaining, setRemaining] = useState(() =>
    email ? getRemainingCooldownSeconds(email) : 0,
  )
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (email) rememberPendingEmail(email)
  }, [email])

  useEffect(() => {
    if (!email) return

    const update = () => setRemaining(getRemainingCooldownSeconds(email))
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [email])

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const target = (email || emailDraft).trim()
    if (!target || sending || remaining > 0) return

    setSending(true)
    setError(null)
    setFeedback(null)

    try {
      await resendVerification(target)
      rememberPendingEmail(target)
      setEmail(target)
      setEmailDraft('')
      setResendAvailableAt(
        target,
        Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
      )
      setRemaining(RESEND_COOLDOWN_SECONDS)
      setFeedback(
        'Solicitud enviada. Revisa tu bandeja de entrada y la carpeta de spam.',
      )
    } catch (cause) {
      setError(getUserFacingError(cause, 'resendVerification'))
    } finally {
      setSending(false)
    }
  }

  const buttonLabel = sending
    ? 'Enviando…'
    : remaining > 0
      ? `Reenviar en ${remaining} s`
      : email
        ? 'Reenviar enlace'
        : 'Enviar enlace de verificación'

  const handleChangeEmail = () => {
    clearPendingEmail()
    setEmail('')
    setEmailDraft('')
    setRemaining(0)
    setFeedback(null)
    setError(null)
  }

  return (
    <section className="customer-access">
      <div className="customer-access__panel">
        <p className="customer-access__eyebrow">
          AMOTT · VERIFICACIÓN DE CORREO
        </p>
        <h1>Revisa tu correo.</h1>

        {cameFromLogin && (
          <p className="customer-access__notice" role="status">
            Tu cuenta todavía no está verificada, así que no pudimos iniciar
            sesión.
          </p>
        )}

        <p className="customer-access__intro">
          {email ? (
            <>
              Enviamos un enlace de verificación a{' '}
              <strong>{maskEmail(email)}</strong>. Ábrelo para activar tu
              cuenta.
            </>
          ) : (
            'Escribe el correo con el que te registraste y te enviaremos un enlace de verificación.'
          )}
        </p>

        <p className="customer-access__hint verification__note">
          El enlace vence en 24 horas. Si no lo encuentras, revisa la carpeta
          de spam.
        </p>

        {feedback && (
          <p className="customer-access__notice" role="status">
            {feedback}
          </p>
        )}
        {error && (
          <p className="customer-access__error" role="alert">
            {error}
          </p>
        )}

        <form
          className="customer-access__form"
          onSubmit={(event) => void handleResend(event)}
        >
          {!email && (
            <>
              <label htmlFor="verification-email">Correo electrónico</label>
              <input
                id="verification-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                disabled={sending}
              />
            </>
          )}
          <button
            className="button button--solid customer-access__submit"
            type="submit"
            disabled={sending || remaining > 0}
          >
            {buttonLabel}
          </button>
        </form>

        {email && (
          <button
            className="verification__change"
            type="button"
            onClick={handleChangeEmail}
            disabled={sending}
          >
            Usar otro correo
          </button>
        )}

        <p className="customer-access__switch">
          ¿Ya verificaste tu correo?{' '}
          <Link to="/iniciar-sesion">Inicia sesión</Link>
        </p>
        <Link className="customer-access__back" to="/">
          Volver a explorar la tienda
        </Link>
      </div>
    </section>
  )
}

export function EmailVerification() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const { verifyEmail, customer } = useAuth()
  const [status, setStatus] = useState<VerifyStatus>(() =>
    token ? 'verifying' : 'missing',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attemptRef = useRef<string | null>(null)
  const verifyRef = useRef(verifyEmail)

  useEffect(() => {
    verifyRef.current = verifyEmail
  }, [verifyEmail])

  useEffect(() => {
    if (!token || attemptRef.current === token) return
    attemptRef.current = token
    setStatus('verifying')
    setErrorMessage(null)

    // El token no debe quedarse en la barra de direcciones ni en el historial.
    if (window.location.search) {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.hash}`,
      )
    }

    void verifyRef.current(token).then(
      () => setStatus('success'),
      (cause: unknown) => {
        const isHttpError = cause instanceof HttpRequestError
        const code = isHttpError ? cause.code : undefined

        if (
          code === 'TOKEN_EXPIRED' ||
          (isHttpError && cause.status === 410)
        ) {
          setStatus('expired')
          return
        }

        if (
          code === 'TOKEN_INVALID' ||
          code === 'INVALID_TOKEN' ||
          (isHttpError && (cause.status === 400 || cause.status === 404))
        ) {
          setStatus('invalid')
          return
        }

        setStatus('error')
        setErrorMessage(getUserFacingError(cause, 'verifyEmail'))
      },
    )
  }, [token])

  if (status === 'verifying') {
    return (
      <section className="customer-access">
        <div className="customer-access__panel">
          <p className="customer-access__eyebrow">
            AMOTT · VERIFICACIÓN DE CORREO
          </p>
          <h1>Verificando…</h1>
          <p className="customer-access__intro" role="status">
            Estamos confirmando tu enlace. Esto toma solo un momento.
          </p>
        </div>
      </section>
    )
  }

  if (status === 'success') {
    return (
      <section className="customer-access">
        <div className="customer-access__panel">
          <p className="customer-access__eyebrow">
            AMOTT · VERIFICACIÓN DE CORREO
          </p>
          <h1>Correo verificado.</h1>
          <p className="customer-access__intro">
            Tu cuenta ya está activa. {customer ? 'Puedes seguir comprando.' : 'Inicia sesión para continuar con tus compras.'}
          </p>
          <div className="verification__actions">
            {customer ? (
              <>
                <Link className="button button--solid" to="/cuenta">
                  Ir a mi cuenta
                </Link>
                <Link className="button button--outline" to="/">
                  Seguir explorando
                </Link>
              </>
            ) : (
              <Link
                className="button button--solid"
                to="/iniciar-sesion"
                state={{ from: '/' }}
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </section>
    )
  }

  const content = {
    missing: {
      title: 'Falta el enlace.',
      description:
        'Abre el enlace completo que llegó a tu correo. Si no lo tienes, solicita uno nuevo.',
    },
    expired: {
      title: 'El enlace expiró.',
      description:
        'Los enlaces de verificación vencen a las 24 horas. Solicita uno nuevo para activar tu cuenta.',
    },
    invalid: {
      title: 'Enlace inválido.',
      description:
        'Este enlace no es válido o ya se usó. Solicita uno nuevo para activar tu cuenta.',
    },
    error: {
      title: 'No pudimos verificar tu correo.',
      description:
        errorMessage ??
        'Ocurrió un problema al confirmar tu enlace. Inténtalo nuevamente.',
    },
  }[status]

  return (
    <section className="customer-access">
      <div className="customer-access__panel">
        <p className="customer-access__eyebrow">
          AMOTT · VERIFICACIÓN DE CORREO
        </p>
        <h1>{content.title}</h1>
        <p className="customer-access__intro">{content.description}</p>
        <div className="verification__actions">
          <Link className="button button--solid" to="/verificar-correo">
            Solicitar un nuevo enlace
          </Link>
          <Link className="button button--outline" to="/iniciar-sesion">
            Iniciar sesión
          </Link>
        </div>
        <Link className="customer-access__back" to="/">
          Volver a explorar la tienda
        </Link>
      </div>
    </section>
  )
}
