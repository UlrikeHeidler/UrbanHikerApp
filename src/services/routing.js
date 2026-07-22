import { buildElevationProfile, stitchElevationProfiles } from '../utils/geo'
import { getApiKey } from './apiKey'

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
 * @property {number[]} wayTypes - Per-coordinate ORS waytype values (0=unknown,1=state road,2=road,3=street,4=path,5=track,6=cycleway,7=footway,8=steps). Same length as coordinates.
 */

/**
 * @typedef {Object} RoutePreferences
 * @property {number}  [green=0]          - Preference for green/park areas (0–0.8). ORS foot-walking only.
 * @property {number}  [quiet=0]          - Preference for quiet roads (0–0.8). ORS foot-walking only.
 * @property {boolean} [refineRoute=false] - After fetching, auto-re-route main-road segments > 122 m.
 */

/**
 * @typedef {Object} RouteOptions
 * @property {import('./routing').LatLng[]} [waypoints=[]] - Intermediate waypoints (A-to-B only)
 * @property {RoutePreferences}             [preferences={}]
 */


/**
 * Expand ORS sparse waytype values into a per-coordinate array.
 * Each entry in `values` is [startIdx, endIdx, waytypeValue].
 *
 * @param {[number,number,number][]} values - ORS extras sparse format
 * @param {number} coordCount
 * @returns {number[]}
 */
function expandWayTypes(values, coordCount) {
  const result = new Array(coordCount).fill(0)
  if (!Array.isArray(values)) return result
  for (const [start, end, type] of values) {
    for (let i = start; i < end && i < coordCount; i++) result[i] = type
  }
  return result
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
  const waytypeValues = feature.properties.extras?.waytype?.values
  return {
    coordinates,
    wayTypes: expandWayTypes(waytypeValues, coordinates.length),
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
 * Build the ORS `options` additions from a RoutePreferences object.
 * Returns an object with only the keys that are actually needed; callers
 * merge this into the top-level `options` block (alongside `round_trip`
 * for loops, or as the sole content for A-to-B routes).
 * Returns an empty object when nothing needs to be sent.
 *
 * @param {RoutePreferences} [preferences]
 * @returns {{ profile_params?: object, avoid_features?: string[] }}
 */
function buildOptions(preferences) {
  if (!preferences) return {}
  const result = {}
  const weightings = {}
  if (preferences.green > 0) weightings.green = preferences.green
  if (preferences.quiet > 0) weightings.quiet = preferences.quiet
  if (Object.keys(weightings).length) result.profile_params = { weightings }
  return result
}

/**
 * POST to the ORS directions endpoint and return all parsed features.
 *
 * @param {string} apiKey
 * @param {object} body - ORS request body
 * @returns {Promise<RouteResult[]>}
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
  return data.features.map(parseFeature)
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
 * @returns {Promise<RouteResult[]>} Primary route first, then up to 2 alternatives
 * @throws {Error} When the API key is missing, the request fails, or ORS returns an error
 */
export async function fetchRoute(start, end, options = {}) {
  const apiKey = getApiKey()
  const { waypoints = [], preferences = {} } = options
  const midpoints = waypoints.map((w) => [w.lng, w.lat])
  const extraOptions = buildOptions(preferences)
  const coordinates = [[start.lng, start.lat], ...midpoints, [end.lng, end.lat]]
  const body = {
    coordinates,
    elevation: true,
    instructions: false,
    extra_info: ['waytype'],
    // ORS rejects alternative_routes when waypoints are present (coords > 2)
    ...(coordinates.length === 2 ? { alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.4 } } : {}),
    ...(Object.keys(extraOptions).length ? { options: extraOptions } : {}),
  }
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
  const extraOptions = buildOptions(options.preferences)
  const body = {
    coordinates: [[start.lng, start.lat]],
    elevation: true,
    instructions: false,
    extra_info: ['waytype'],
    options: {
      round_trip: { length: distanceMeters, points: 3, seed },
      ...extraOptions,
    },
  }
  const results = await postDirections(apiKey, body)
  return results[0]
}

/**
 * @typedef {RouteResult & { outboundDistance: number }} LoopWithWaypointsResult
 */

/**
 * Fetch a loop route that passes through forced waypoints and returns home via
 * a separately routed path — avoiding retracing the outbound leg.
 *
 * Strategy: two independent ORS calls.
 *   Leg 1 (outbound): start → wp1 → … → wpN  (forced waypoints)
 *   Leg 2 (return):   wpN  → start           (ORS finds its own shortest path)
 * The two polylines are stitched into one continuous route.
 *
 * The returned `outboundDistance` (metres) lets callers warn the user when
 * the waypoints alone exceed their target distance.
 *
 * @param {LatLng}       start          - Loop origin and destination
 * @param {LatLng[]}     waypoints      - One or more forced stops (in order)
 * @param {RouteOptions} [options={}]   - Optional routing preferences
 * @returns {Promise<LoopWithWaypointsResult>}
 * @throws {Error} When either leg fails or the API key is missing
 */
export async function fetchLoopWithWaypoints(start, waypoints, options = {}) {
  const lastWp = waypoints[waypoints.length - 1]
  const intermediates = waypoints.slice(0, -1)

  const [[outbound], [returnLeg]] = await Promise.all([
    fetchRoute(start, lastWp, { ...options, waypoints: intermediates }),
    fetchRoute(lastWp, start, options),
  ])

  const coordinates = [...outbound.coordinates, ...returnLeg.coordinates.slice(1)]
  const wayTypes    = [...outbound.wayTypes,    ...returnLeg.wayTypes.slice(1)]
  const elevationProfile = stitchElevationProfiles(outbound.elevationProfile, returnLeg.elevationProfile)

  return {
    coordinates,
    wayTypes,
    elevationProfile,
    info: {
      distance: outbound.info.distance + returnLeg.info.distance,
      duration: outbound.info.duration + returnLeg.info.duration,
      ascent:   (outbound.info.ascent  ?? 0) + (returnLeg.info.ascent  ?? 0),
      descent:  (outbound.info.descent ?? 0) + (returnLeg.info.descent ?? 0),
    },
    outboundDistance: outbound.info.distance,
  }
}

/**
 * Fetch a quiet sub-route between two points, hard-excluding primary-class roads.
 * Used by the route-refinement pass to replace main-road segments.
 *
 * @param {LatLng} start
 * @param {LatLng} end
 * @returns {Promise<RouteResult>} Single best result
 * @throws {Error} When no alternative path exists or the API call fails
 */
export async function fetchSubRoute(start, end) {
  const apiKey = getApiKey()
  const body = {
    coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
    elevation: true,
    instructions: false,
    extra_info: ['waytype'],
    options: { avoid_features: ['highways'] },
  }
  const results = await postDirections(apiKey, body)
  return results[0]
}
