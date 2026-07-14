const EARTH_RADIUS_M = 6_371_000

/**
 * @typedef {Object} BoundingBox
 * @property {number} minLat
 * @property {number} minLng
 * @property {number} maxLat
 * @property {number} maxLng
 */

/**
 * @typedef {Object} ElevationPoint
 * @property {number} distanceM  - Cumulative distance from route start in metres
 * @property {number} elevationM - Elevation above sea level in metres
 */

/**
 * Calculate the Haversine great-circle distance between two WGS-84 coordinates.
 *
 * @param {[number, number]} a - [latitude, longitude] in decimal degrees
 * @param {[number, number]} b - [latitude, longitude] in decimal degrees
 * @returns {number} Distance in metres
 */
export function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

/**
 * Build an elevation profile from raw ORS coordinate triples.
 *
 * ORS returns coordinates as [longitude, latitude, elevation]. This function
 * converts them into cumulative-distance / elevation pairs suitable for charting.
 * If elevation data is absent (2D coordinates), returns an empty array.
 *
 * @param {[number, number, number?][]} rawCoords - ORS coordinate triples [lng, lat, elev?]
 * @returns {ElevationPoint[]} Ordered array of {distanceM, elevationM} points
 */
/**
 * Compute the axis-aligned bounding box of a set of [lat, lng] coordinate pairs.
 *
 * @param {[number, number][]} coordinates - Array of [lat, lng] pairs
 * @returns {BoundingBox}
 * @throws {Error} When the coordinates array is empty
 */
export function getBoundingBox(coordinates) {
  if (!coordinates?.length) throw new Error('Cannot compute bounding box of empty array')
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity
  for (const [lat, lng] of coordinates) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  return { minLat, minLng, maxLat, maxLng }
}

export function buildElevationProfile(rawCoords) {
  if (!rawCoords?.length || rawCoords[0].length < 3) return []

  let cumulative = 0
  return rawCoords.map(([lng, lat, elev], i) => {
    if (i > 0) {
      const [pLng, pLat] = rawCoords[i - 1]
      cumulative += haversineDistance([pLat, pLng], [lat, lng])
    }
    return { distanceM: cumulative, elevationM: elev }
  })
}
