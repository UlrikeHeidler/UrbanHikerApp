const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

/**
 * @typedef {Object} GeocodingResult
 * @property {string} place_id   - Nominatim internal place identifier
 * @property {string} display_name - Human-readable full address
 * @property {string} lat        - Latitude as string
 * @property {string} lon        - Longitude as string
 */

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
