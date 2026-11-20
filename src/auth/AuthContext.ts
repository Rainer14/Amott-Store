import { createContext, useContext } from 'react'

/** Rol de precios que devuelve el backend; define cuántos precios ve el cliente. */
export type CustomerPriceRole = 'none' | 'oferta' | 'mayorista'

export interface Customer {
  id: string
  email: string
  name: string
  emailVerified: boolean
  /** Compatibilidad con la UI existente: true para oferta y mayorista. */
  isWholesale: boolean
  priceRole: CustomerPriceRole
}

export interface RegisterResult {
  email: string
}

export interface AuthContextValue {
  customer: Customer | null
  accessToken: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<RegisterResult>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
