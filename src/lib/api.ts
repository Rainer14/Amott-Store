const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    throw new Error('API paths must start with "/".')
  }

  if (apiBaseUrl) return `${apiBaseUrl}${path}`
  if (import.meta.env.DEV) return path

  throw new Error('VITE_API_BASE_URL must be configured for production.')
}
