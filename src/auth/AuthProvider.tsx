import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Customer, RegisterResult } from './AuthContext'
import { AuthContext } from './AuthContext'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import { apiUrl } from '../lib/api'
import { rememberPendingEmail } from './verificationStorage'

interface ApiPayload {
  [key: string]: unknown
}

function isRecord(value: unknown): value is ApiPayload {
  return typeof value === 'object' && value !== null
}

function getNestedRecord(payload: unknown, key: string): ApiPayload | null {
  if (!isRecord(payload)) return null
  const value = payload[key]
  return isRecord(value) ? value : null
}

function readErrorDetails(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      code: undefined,
      message:
        typeof payload === 'string' && payload.trim()
          ? payload.trim()
          : undefined,
    }
  }

  const data = getNestedRecord(payload, 'data')
  const error = getNestedRecord(payload, 'error')
  const code =
    payload.code ??
    payload.error_code ??
    payload.errorCode ??
    error?.code ??
    data?.code ??
    (typeof payload.error === 'string' ? payload.error : undefined)
  const message =
    payload.message ??
    payload.detail ??
    (typeof payload.error === 'string' ? payload.error : undefined) ??
    error?.message ??
    data?.message

  return {
    code: typeof code === 'string' ? code : undefined,
    message: typeof message === 'string' ? message : undefined,
  }
}

function getAccessToken(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const nested = getNestedRecord(payload, 'data')
  const tokens =
    getNestedRecord(payload, 'tokens') ?? getNestedRecord(nested, 'tokens')
  const token =
    payload.accessToken ??
    payload.access_token ??
    nested?.accessToken ??
    nested?.access_token ??
    tokens?.accessToken ??
    tokens?.access_token
  return typeof token === 'string' && token.length > 0 ? token : null
}

function parseCustomer(payload: unknown): Customer | null {
  if (!isRecord(payload)) return null
  const data = getNestedRecord(payload, 'data')
  const customer =
    getNestedRecord(payload, 'customer') ??
    getNestedRecord(data, 'customer') ??
    getNestedRecord(payload, 'user') ??
    getNestedRecord(data, 'user') ??
    data ??
    payload
  const id = customer.id ?? customer.customerId ?? customer.customer_id
  const email = customer.email
  const firstName =
    typeof customer.first_name === 'string' ? customer.first_name : ''
  const lastName =
    typeof customer.last_name === 'string' ? customer.last_name : ''
  const name =
    customer.name ??
    customer.full_name ??
    customer.fullName ??
    [firstName, lastName].filter(Boolean).join(' ')
  const verifiedValue =
    customer.email_verified ??
    customer.emailVerified ??
    customer.is_email_verified ??
    customer.isEmailVerified

  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof email !== 'string'
  ) {
    return null
  }

  return {
    id: String(id),
    email,
    name: typeof name === 'string' && name.trim() ? name.trim() : email,
    // Las APIs anteriores no enviaban este dato; en ese caso asumimos
    // que la cuenta ya estaba verificada para no bloquear a nadie.
    emailVerified: typeof verifiedValue === 'boolean' ? verifiedValue : true,
  }
}

async function requestApi(
  path: string,
  options: RequestInit = {},
  accessToken: string | null = null,
) {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const details = readErrorDetails(payload)
    throw new HttpRequestError(response.status, details.code, details.message)
  }

  return payload
}

async function loadCustomer(accessToken: string | null) {
  const payload = await requestApi('/api/customer-auth/me', {}, accessToken)
  const customer = parseCustomer(payload)
  if (!customer) {
    throw new Error('La API devolvió un perfil de cliente inválido.')
  }
  return customer
}

function assertEmailVerified(customer: Customer) {
  if (!customer.emailVerified) {
    throw new HttpRequestError(403, 'EMAIL_NOT_VERIFIED')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function restoreSession() {
      try {
        const payload = await requestApi('/api/customer-auth/refresh', {
          method: 'POST',
          signal: controller.signal,
        })
        const refreshedToken = getAccessToken(payload)
        const restoredCustomer = await loadCustomer(refreshedToken)
        if (controller.signal.aborted) return
        setAccessToken(refreshedToken)
        setCustomer(restoredCustomer)
      } catch (cause) {
        if (controller.signal.aborted) return
        if (
          !(cause instanceof HttpRequestError) ||
          ![400, 401, 403, 422].includes(cause.status)
        ) {
          setError(getUserFacingError(cause, 'session'))
        }
        setAccessToken(null)
        setCustomer(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void restoreSession()
    return () => controller.abort()
  }, [])

  const completeSession = useCallback(
    async (payload: unknown, email: string, password: string) => {
      let token = getAccessToken(payload)

      try {
        const profile = await loadCustomer(token)
        assertEmailVerified(profile)
        setAccessToken(token)
        setCustomer(profile)
        setError(null)
        return
      } catch (cause) {
        if (
          !(cause instanceof HttpRequestError) ||
          (cause.status !== 401 && cause.status !== 403)
        ) {
          throw cause
        }
        if (cause.code === 'EMAIL_NOT_VERIFIED') throw cause
        const loginPayload = await requestApi(
          '/api/customer-auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          },
          token,
        )
        token = getAccessToken(loginPayload) ?? token
      }

      const profile = await loadCustomer(token)
      assertEmailVerified(profile)
      setAccessToken(token)
      setCustomer(profile)
      setError(null)
    },
    [],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await requestApi('/api/customer-auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      const token = getAccessToken(payload)
      const profile = parseCustomer(payload)

      if (token && profile) {
        assertEmailVerified(profile)
        setAccessToken(token)
        setCustomer(profile)
        setError(null)
        return
      }

      await completeSession(payload, email, password)
    },
    [completeSession],
  )

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<RegisterResult> => {
      const normalizedEmail = email.trim()
      const payload = await requestApi('/api/customer-auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name.trim(),
          email: normalizedEmail,
          password,
        }),
      })

      // La API nueva no abre sesión hasta verificar el correo. Si una
      // versión anterior todavía la abre, la cerramos en segundo plano.
      try {
        await requestApi(
          '/api/customer-auth/logout',
          { method: 'POST' },
          getAccessToken(payload),
        )
      } catch {
        // El cierre de sesión es best-effort y no debe bloquear el registro.
      }

      setAccessToken(null)
      setCustomer(null)
      setError(null)
      rememberPendingEmail(normalizedEmail)
      return { email: normalizedEmail }
    },
    [],
  )

  const verifyEmail = useCallback(
    async (token: string) => {
      const value = token.trim()
      if (!value) throw new HttpRequestError(400, 'INVALID_TOKEN')

      await requestApi('/api/customer-auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: value }),
      })

      if (!customer) return

      try {
        const profile = await loadCustomer(accessToken)
        setCustomer(profile)
        setError(null)
      } catch {
        // La verificación ya se completó; un fallo al refrescar el perfil
        // no debe invalidarla.
      }
    },
    [accessToken, customer],
  )

  const resendVerification = useCallback(async (email: string) => {
    const value = email.trim()
    if (!value) throw new HttpRequestError(422, 'VALIDATION_ERROR')

    await requestApi('/api/customer-auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: value }),
    })
  }, [])

  const logout = useCallback(async () => {
    const activeToken = accessToken
    setAccessToken(null)
    setCustomer(null)
    setError(null)
    await requestApi(
      '/api/customer-auth/logout',
      { method: 'POST' },
      activeToken,
    )
  }, [accessToken])

  const value = useMemo(
    () => ({
      customer,
      accessToken,
      loading,
      error,
      login,
      register,
      verifyEmail,
      resendVerification,
      logout,
    }),
    [
      accessToken,
      customer,
      error,
      loading,
      login,
      logout,
      register,
      resendVerification,
      verifyEmail,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
