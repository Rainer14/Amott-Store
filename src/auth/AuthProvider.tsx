import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Customer } from './AuthContext'
import { AuthContext } from './AuthContext'
import {
  getUserFacingError,
  HttpRequestError,
} from '../lib/userFacingError'
import { apiUrl } from '../lib/api'

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
    throw new HttpRequestError(response.status)
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
    async (name: string, email: string, password: string) => {
      const payload = await requestApi('/api/customer-auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: name, email, password }),
      })
      await completeSession(payload, email, password)
    },
    [completeSession],
  )

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
    () => ({ customer, accessToken, loading, error, login, register, logout }),
    [accessToken, customer, error, loading, login, logout, register],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
