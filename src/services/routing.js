import { buildElevationProfile } from '../utils/geo'

const ORS_BASE = 'https://api.openrouteservice.org/v2'

/**
 * @typedef {Object} LatLng
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {Object} RouteInfo
 * @property {number} distance - Total distance in metres
 * @property {number} duration - Estimated walking duration in seconds
 * @property {number|null} ascent  - Total ascent in metres (may be null)
 * @property {number|null} descent - Total descent in metres (may be null)
 */

/**
 * @typedef {Object} RouteResult
 * @property {[number, number][]} coordinates - Ordered [lat, lng] pairs for the polyline
 * @property {RouteInfo} info - Summary statistics for the route
 * @property {import('../utils/geo').ElevationPoint[]} elevationProfile - Elevation chart data
 */

/**
 * @typedef {Object} RoutePreferences
 * @property {number} [green=0]  - Preference for green/park areas (0–0.8). ORS foot-walking only.
 * @property {number} [quiet=0]  - Preference for quiet roads (0–0.8). ORS foot-walking only.
 */

/**
 * @typedef {Object} RouteOptions
 * @property {import('./routing').LatLng[]} [waypoints=[]] - Intermediate waypoints (A-to-B only)
 * @property {RoutePreferences}             [preferences={}]
 */

/**
 * Resolve and validate the ORS API key from the environment.
 *
 * @returns {string} The API key
 * @throws {Error} When the key is absent
 */
function getApiKey() {
  const key = import.meta.env.VITE_ORS_API_KEY
  if (!key) {
    throw new Error(
      'No ORS API key found. Create a free key at openrouteservice.org and add VITE_ORS_API_KEY to your .env file.'
    )
  }
  return key
}

/**
 * Parse a raw ORS GeoJSON feature into a RouteResult.
 *
 * @param {object} feature - A single GeoJSON feature from the ORS response
 * @returns {RouteResult}
 */
function parseFeature(feature) {
  const summary = feature.properties.summary
  const raw = feature.geometry.coordinates
  // ORS returns [lng, lat, elevation?] — convert to Leaflet-style [lat, lng]
  const coordinates = raw.map(([lng, lat]) => [lat, lng])
  return {
    coordinates,
    elevationProfile: buildElevationProfile(raw),
    info: {
      distance: summary.distance,
      duration: summary.duration,
      ascent: feature.properties.ascent ?? null,
      descent: feature.properties.descent ?? null,
    },
  }
}

/**
 * Build the ORS profile_params block from a RoutePreferences object.
 * Returns undefined when no non-zero preference is set (omits the key entirely).
 *
 * @param {RoutePreferences} [preferences]
 * @returns {object|undefined}
 */
function buildProfileParams(preferences) {
  if (!preferences) return undefined
  const weightings = {}
  if (preferences.green > 0) weightings.green = preferences.green
  if (preferences.quiet > 0) weightings.quiet = preferences.quiet
  if (!Object.keys(weightings).length) return undefined
  return { weightings }
}

/**
 * POST to the ORS directions endpoint and return the parsed response.
 *
 * @param {string} apiKey
 * @param {object} body - ORS request body
 * @returns {Promise<RouteResult>}
 * @throws {Error} On non-2xx response or network failure
 */
async function postDirections(apiKey, body) {
  const res = await fetch(`${ORS_BASE}/directions/foot-walking/geojson`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Routing failed (${res.status})`)
  }

  const data = await res.json()
  return parseFeature(data.features[0])
}

/**
 * Fetch a pedestrian walking route between two points using OpenRouteService.
 *
 * The foot-walking profile automatically excludes non-walkable areas
 * (motorways, railways, etc.) based on OpenStreetMap data.
 *
 * @param {LatLng}       start          - Route origin
 * @param {LatLng}       end            - Route destination
 * @param {RouteOptions} [options={}]   - Optional waypoints and routing preferences
 * @returns {Promise<RouteResult>}
 * @throws {Error} When the API key is missing, the request fails, or ORS returns an error
 */
export async function fetchRoute(start, end, options = {}) {
  const apiKey = getApiKey()
  const { waypoints = [], preferences = {} } = options
  const midpoints = waypoints.map((w) => [w.lng, w.lat])
  const body = {
    coordinates: [[start.lng, start.lat], ...midpoints, [end.lng, end.lat]],
    elevation: true,
    instructions: false,
  }
  const profileParams = buildProfileParams(preferences)
  if (profileParams) body.profile_params = profileParams
  return postDirections(apiKey, body)
}

/**
 * Fetch a round-trip walking loop starting and ending at the same point.
 *
 * Uses the ORS `round_trip` option to generate a loop of approximately the
 * requested distance. The route will vary based on the seed value — increment
 * the seed to get a different loop from the same start point.
 *
 * @param {LatLng}       start            - Loop origin (also the destination)
 * @param {number}       distanceMeters   - Desired loop length in metres (min ~500 m)
 * @param {number}       [seed=0]         - Seed for route variation (0–90)
 * @param {RouteOptions} [options={}]     - Optional routing preferences (waypoints ignored for loops)
 * @returns {Promise<RouteResult>}
 * @throws {Error} When the API key is missing, the request fails, or ORS returns an error
 */
export async function fetchLoopRoute(start, distanceMeters, seed = 0, options = {}) {
  const apiKey = getApiKey()
  // ORS requires profile_params nested inside `options` when `options` is present
  const profileParams = buildProfileParams(options.preferences)
  const body = {
    coordinates: [[start.lng, start.lat]],
    elevation: true,
    instructions: false,
    options: {
      round_trip: { length: distanceMeters, points: 3, seed },
      ...(profileParams ? { profile_params: profileParams } : {}),
    },
  }
  return postDirections(apiKey, body)
}
