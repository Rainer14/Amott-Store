import { createContext, useContext } from 'react'

export interface Customer {
  id: string
  email: string
  name: string
  emailVerified: boolean
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
