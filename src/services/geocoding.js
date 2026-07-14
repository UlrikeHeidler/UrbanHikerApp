const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

/**
 * @typedef {Object} GeocodingResult
 * @property {string} place_id     - Nominatim internal place identifier
 * @property {string} display_name - Human-readable full address
 * @property {string} lat          - Latitude as string
 * @property {string} lon          - Longitude as string
 */

/**
 * Build a concise human-readable label from a Nominatim reverse-geocoding
 * response. Prefers building/POI name + road, falls back to road + suburb,
 * and finally to the first segment of display_name.
 *
 * @param {object} data - Raw Nominatim reverse response
 * @returns {string}
 */
export function formatReverseResult(data) {
  const a = data?.address ?? {}

  const name   = a.amenity || a.building || a.tourism || a.leisure || a.shop || null
  const road   = a.road || a.pedestrian || a.path || a.footway || null
  const house  = a.house_number || null
  const area   = a.suburb || a.neighbourhood || a.village || a.town || a.city || null

  const streetPart = road ? (house ? `${house} ${road}` : road) : null

  if (name && streetPart) return `${name}, ${streetPart}`
  if (name && area)       return `${name}, ${area}`
  if (name)               return name
  if (streetPart && area) return `${streetPart}, ${area}`
  if (streetPart)         return streetPart

  // Last resort: first comma-delimited segment of display_name
  return (data?.display_name ?? '').split(',')[0].trim()
}

/**
 * Search for addresses matching a free-text query using the Nominatim API.
 *
 * Rate-limit: Nominatim's usage policy allows max 1 request/second for
 * non-commercial use. The AddressSearch component enforces a 400 ms debounce.
 *
 * @param {string} query - Free-text address query (min 3 chars recommended)
 * @returns {Promise<GeocodingResult[]>} Up to 5 matching results
 * @throws {Error} When the network request fails or the API returns non-200
 */
export async function searchAddress(query) {
  if (!query || typeof query !== 'string') return []

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: '5',
    addressdetails: '0',
  })

  const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'UrbanHikingApp/1.0',
    },
  })

  if (!res.ok) throw new Error(`Address search failed (${res.status})`)

  return res.json()
}

/**
 * Reverse-geocode a lat/lng coordinate to a human-readable address label
 * using the Nominatim reverse endpoint.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Short address label (never throws — returns empty string on failure)
 */
export async function reverseGeocode(lat, lng) {
  if (!isFinite(lat) || !isFinite(lng)) return ''

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    zoom: '18',
    addressdetails: '1',
  })

  try {
    const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'UrbanHikingApp/1.0',
      },
    })
    if (!res.ok) return ''
    const data = await res.json()
    return formatReverseResult(data)
  } catch {
    return ''
  }
}
