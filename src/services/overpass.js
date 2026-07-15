const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) throw new Error(`POI fetch failed (${res.status})`)

  const data = await res.json()
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
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Route fetch failed (${res.status})`)
  const data = await res.json()
  return (data.elements ?? [])
    .map((el) => el.tags?.ref || el.tags?.name)
    .filter(Boolean)
    .sort()
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
