const STORAGE_KEY = 'urban-hiker-routes'

/**
 * @typedef {Object} SavedRoute
 * @property {string}   id               - Unique identifier (timestamp-based)
 * @property {string}   name             - User-provided display name
 * @property {number}   savedAt          - Unix timestamp (ms) when the route was saved
 * @property {string}   mode             - 'a-to-b' | 'loop'
 * @property {object}   startPoint       - {lat, lng}
 * @property {object|null} endPoint      - {lat, lng} or null for loops
 * @property {number|null} loopMeters    - Target loop distance in metres, or null
 * @property {number|null} loopSeed      - Loop seed, or null
 * @property {Array}    coordinates      - [lat, lng] pairs for the polyline
 * @property {object}   info             - RouteInfo summary
 * @property {Array}    elevationProfile - ElevationPoint array
 */

/**
 * Load all saved routes from localStorage.
 *
 * @returns {SavedRoute[]} Stored routes, newest first. Returns [] on parse error.
 */
export function loadRoutes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Persist a new saved route. The route is prepended so the list is newest-first.
 *
 * @param {Omit<SavedRoute, 'id' | 'savedAt'>} route - Route data without generated fields
 * @returns {SavedRoute} The newly saved route with id and savedAt populated
 * @throws {Error} When localStorage is full or unavailable
 */
export function saveRoute(route) {
  const entry = {
    ...route,
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: Date.now(),
  }
  const existing = loadRoutes()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing]))
  return entry
}

/**
 * Delete a saved route by its id.
 *
 * @param {string} id - The route id to remove
 * @returns {boolean} True if a route was removed, false if the id was not found
 */
export function deleteRoute(id) {
  const existing = loadRoutes()
  const filtered = existing.filter((r) => r.id !== id)
  if (filtered.length === existing.length) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}
