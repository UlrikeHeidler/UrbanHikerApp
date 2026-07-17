// Public Overpass endpoints tried in order; on network error or rate-limit the
// next one is attempted so a single overloaded server doesn't break the app.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// 0 in test mode so retry delays don't slow down the test suite
const RETRY_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 1500

/**
 * POST a query to Overpass, trying each endpoint in turn.
 * On a 429 the same endpoint is retried once after RETRY_DELAY_MS before
 * moving on. Network errors move straight to the next endpoint.
 * Non-retriable HTTP errors (5xx etc.) are thrown immediately.
 *
 * @param {string} query - OverpassQL query string
 * @returns {Promise<object>} Parsed JSON response body
 * @throws {Error}
 */
async function overpassFetch(query) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  }
  let rateLimited = false
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      let res = await fetch(url, opts)
      if (res.status === 429) {
        rateLimited = true
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        res = await fetch(url, opts)
        if (res.status === 429) continue   // try next endpoint
        rateLimited = false
      }
      if (!res.ok) throw new Error(`Overpass request failed (${res.status})`)
      return res.json()
    } catch (err) {
      if (err.message.startsWith('Overpass request failed')) throw err
      console.warn('[overpass] endpoint failed, trying next:', url, err.message)
      // network error or rate-limit continuation — try next endpoint
    }
  }
  if (rateLimited) throw new Error('Overpass rate limit reached — please wait a moment and try again')
  throw new Error('Could not reach Overpass — check your connection and try again')
}

/**
 * @typedef {'bench' | 'water' | 'viewpoint' | 'bus_stop' | 'tram_stop' | 'subway'} PoiType
 */

/**
 * @typedef {Object} PoiNode
 * @property {number} id  - Overpass node id
 * @property {number} lat
 * @property {number} lon
 * @property {PoiType} type
 * @property {string}  [name]     - Optional OSM name tag
 * @property {string}  [routeRef] - Semicolon-separated route numbers (bus/tram stops, from OSM route_ref tag)
 * @property {string}  [stopRef]  - Stop identifier (OSM ref tag)
 */

/**
 * @typedef {Object} PoiResult
 * @property {PoiNode[]} bench
 * @property {PoiNode[]} water
 * @property {PoiNode[]} viewpoint
 * @property {PoiNode[]} bus_stop
 * @property {PoiNode[]} tram_stop
 * @property {PoiNode[]} subway
 */

/** Maps PoiType to its Overpass tag filter. */
const TAG_FILTERS = {
  bench:     'node["amenity"="bench"]',
  water:     'node["amenity"="drinking_water"]',
  viewpoint: 'node["tourism"="viewpoint"]',
  bus_stop:  'node["highway"="bus_stop"]',
  tram_stop: 'node["railway"="tram_stop"]',
  subway:    'node["railway"="station"]["subway"="yes"]',
}

/**
 * Fetch points of interest within a bounding box using the Overpass API.
 *
 * Results are categorised by type. Unknown or unsupported types are ignored.
 * Rate-limiting: Overpass allows roughly 10 000 queries/day from a single IP;
 * this is more than sufficient for personal use.
 *
 * @param {import('../utils/geo').BoundingBox} bbox - Route bounding box
 * @param {PoiType[]} types - Which POI types to fetch
 * @returns {Promise<PoiResult>}
 * @throws {Error} On network failure or non-200 response
 */
export async function fetchPois(bbox, types) {
  const { minLat, minLng, maxLat, maxLng } = bbox
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`

  const filters = types
    .filter((t) => TAG_FILTERS[t])
    .map((t) => `${TAG_FILTERS[t]}(${bboxStr});`)
    .join('\n')

  if (!filters) return { bench: [], water: [], viewpoint: [], bus_stop: [], tram_stop: [], subway: [] }

  const query = `[out:json][timeout:15];\n(\n${filters}\n);\nout body;`
  const data = await overpassFetch(query)
  return categorise(data.elements ?? [], types)
}

/**
 * Group raw Overpass elements into typed buckets.
 *
 * @param {object[]} elements - Raw Overpass node objects
 * @param {PoiType[]} types   - The requested types (used to initialise empty buckets)
 * @returns {PoiResult}
 */
function categorise(elements, types) {
  const result = Object.fromEntries(types.map((t) => [t, []]))
  for (const el of elements) {
    const type = resolveType(el.tags)
    if (type && result[type] !== undefined) {
      result[type].push({
        id: el.id, lat: el.lat, lon: el.lon, type,
        name: el.tags?.name,
        routeRef: el.tags?.route_ref,
        stopRef: el.tags?.ref,
      })
    }
  }
  return result
}

/**
 * Fetch transit route numbers/names for a single OSM stop node.
 * Queries Overpass for all route relations that contain the node.
 *
 * @param {number} nodeId - OSM node id (must be a positive integer)
 * @returns {Promise<string[]>} Sorted list of route refs or names
 * @throws {Error} On invalid nodeId, network failure, or non-200 response
 */
export async function fetchStopRoutes(nodeId) {
  if (!Number.isInteger(nodeId) || nodeId <= 0) throw new Error('Invalid node id')
  const query = `[out:json][timeout:10];\nnode(${nodeId});\nrel["route"~"bus|tram|subway|light_rail"](bn);\nout tags;`
  const data = await overpassFetch(query)
  return (data.elements ?? [])
    .map((el) => el.tags?.ref || el.tags?.name)
    .filter(Boolean)
    .sort()
}

/** Maps OSM route type to the matching stop color. */
const TRANSIT_ROUTE_COLOR = {
  bus:        '#f97316',
  tram:       '#0d9488',
  subway:     '#7c3aed',
  light_rail: '#7c3aed',
}

/**
 * @typedef {Object} TransitRoute
 * @property {number}    id    - OSM relation id
 * @property {string}    ref   - Route number / short name
 * @property {string}    name  - Full route name
 * @property {string}    type  - 'bus' | 'tram' | 'subway' | 'light_rail'
 * @property {string}    color - Hex color matching the stop type
 * @property {Array[][]} ways  - Array of [[lat, lng], …] polylines (one per OSM way)
 */

/**
 * Fetch transit route polylines within a bounding box using the Overpass API.
 * Returns one entry per OSM route relation; each entry carries the full geometry
 * split into per-way arrays so Leaflet can render them individually.
 *
 * Only fetches when the map zoom is ≥ 12 to avoid oversized responses.
 *
 * @param {import('../utils/geo').BoundingBox} bbox
 * @returns {Promise<TransitRoute[]>}
 * @throws {Error} On network failure or non-200 response
 */
export async function fetchTransitRoutes(bbox) {
  const { minLat, minLng, maxLat, maxLng } = bbox
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`
  const query = `[out:json][timeout:25];\nrel["route"~"bus|tram|subway|light_rail"](${bboxStr});\nout geom;`
  const data = await overpassFetch(query)
  return (data.elements ?? []).map(parseTransitRelation).filter(Boolean)
}

/**
 * Parse an Overpass relation element into a TransitRoute, or return null
 * if the element is not a supported transit route relation.
 *
 * @param {object} el - Raw Overpass element
 * @returns {TransitRoute|null}
 */
function parseTransitRelation(el) {
  if (el.type !== 'relation') return null
  const type = el.tags?.route
  if (!TRANSIT_ROUTE_COLOR[type]) return null
  const ways = (el.members ?? [])
    .filter((m) => m.type === 'way' && m.geometry?.length >= 2)
    .map((m) => m.geometry.map((p) => [p.lat, p.lon]))
  if (!ways.length) return null
  const ref = el.tags?.ref ?? el.tags?.name ?? String(el.id)
  return {
    id: el.id,
    ref,
    name: el.tags?.name ?? ref,
    type,
    color: TRANSIT_ROUTE_COLOR[type],
    ways,
  }
}

/**
 * Resolve the PoiType for an OSM tags object, or return null if unrecognised.
 *
 * @param {object} tags
 * @returns {PoiType|null}
 */
function resolveType(tags) {
  if (!tags) return null
  if (tags.amenity === 'bench') return 'bench'
  if (tags.amenity === 'drinking_water') return 'water'
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.highway === 'bus_stop') return 'bus_stop'
  if (tags.railway === 'tram_stop') return 'tram_stop'
  if (tags.railway === 'station' && tags.subway === 'yes') return 'subway'
  return null
}
