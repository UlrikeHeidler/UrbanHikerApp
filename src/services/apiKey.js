const STORAGE_KEY = 'ors_api_key'

/**
 * Retrieve the active ORS API key.
 * Checks localStorage first (user-configured), then falls back to the
 * build-time environment variable (local dev with .env).
 *
 * @returns {string} The API key
 * @throws {Error} When no key is available from either source
 */
export function getApiKey() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored
  const env = import.meta.env.VITE_ORS_API_KEY
  if (env) return env
  throw new Error(
    'No ORS API key found. Open Settings in the app and enter your free OpenRouteService API key.'
  )
}

/**
 * Persist a user-supplied API key to localStorage.
 *
 * @param {string} key - The ORS API key to store
 * @throws {Error} When the key is empty or whitespace-only
 */
export function setApiKey(key) {
  if (!key || !key.trim()) throw new Error('API key must not be empty')
  localStorage.setItem(STORAGE_KEY, key.trim())
}

/**
 * Remove a previously stored API key from localStorage.
 * Falls back to the env variable if present; does not affect it.
 */
export function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Check whether any API key is currently available (localStorage or env).
 *
 * @returns {boolean}
 */
export function hasApiKey() {
  return Boolean(localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_ORS_API_KEY)
}
