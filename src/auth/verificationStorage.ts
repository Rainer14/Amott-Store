const PENDING_EMAIL_KEY = 'amott:pending-verification-email'
const RESEND_AVAILABLE_PREFIX = 'amott:resend-verification-at:'

export const RESEND_COOLDOWN_SECONDS = 60

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function readStorage(store: Storage, key: string) {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value)
  } catch {
    // El almacenamiento puede estar bloqueado; la pantalla seguirá funcionando.
  }
}

function removeStorage(store: Storage, key: string) {
  try {
    store.removeItem(key)
  } catch {
    // Ídem.
  }
}

export function rememberPendingEmail(email: string) {
  const value = email.trim()
  if (!value) return
  writeStorage(window.sessionStorage, PENDING_EMAIL_KEY, value)
}

export function readPendingEmail() {
  const value = readStorage(window.sessionStorage, PENDING_EMAIL_KEY)
  return value?.trim() || null
}

export function clearPendingEmail() {
  removeStorage(window.sessionStorage, PENDING_EMAIL_KEY)
}

export function getResendAvailableAt(email: string) {
  const value = readStorage(
    window.localStorage,
    `${RESEND_AVAILABLE_PREFIX}${normalizeEmail(email)}`,
  )
  const timestamp = value ? Number(value) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function setResendAvailableAt(email: string, timestamp: number) {
  writeStorage(
    window.localStorage,
    `${RESEND_AVAILABLE_PREFIX}${normalizeEmail(email)}`,
    String(timestamp),
  )
}

export function getRemainingCooldownSeconds(email: string) {
  return Math.max(
    0,
    Math.ceil((getResendAvailableAt(email) - Date.now()) / 1000),
  )
}
