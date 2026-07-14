const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

/**
 * @typedef {'bench' | 'water' | 'viewpoint'} PoiType
 */

/**
 * @typedef {Object} PoiNode
 * @property {number} id  - Overpass node id
 * @property {number} lat
 * @property {number} lon
 * @property {PoiType} type
 * @property {string}  [name] - Optional OSM name tag
 */

/**
 * @typedef {Object} PoiResult
 * @property {PoiNode[]} bench
 * @property {PoiNode[]} water
 * @property {PoiNode[]} viewpoint
 */

/** Maps PoiType to its Overpass tag filter. */
const TAG_FILTERS = {
  bench:     'node["amenity"="bench"]',
  water:     'node["amenity"="drinking_water"]',
  viewpoint: 'node["tourism"="viewpoint"]',
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

  if (!filters) return { bench: [], water: [], viewpoint: [] }

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
      result[type].push({ id: el.id, lat: el.lat, lon: el.lon, type, name: el.tags?.name })
    }
  }
  return result
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
  return null
}
