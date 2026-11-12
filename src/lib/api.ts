const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    throw new Error('API paths must start with "/".')
  }

  if (apiBaseUrl) {
    const apiPath =
      apiBaseUrl.endsWith('/api') && /^\/api(?:\/|\?|$)/.test(path)
        ? path.slice('/api'.length)
        : path
    return `${apiBaseUrl}${apiPath}`
  }

  // Sin VITE_API_BASE_URL se usa el mismo origen. En produccion el hosting
  // reescribe /api/* hacia el backend (Render: routes en render.yaml), de modo
  // que la cookie de sesion es first-party y no la bloquean los navegadores.
  return path
}
