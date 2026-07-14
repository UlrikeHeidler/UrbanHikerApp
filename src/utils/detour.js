/**
 * Compute the straight-line distance between two lat/lng points in metres.
 *
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} Distance in metres
 */
export function directDistance(a, b) {
  const cosLat = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  const dLat = (b.lat - a.lat) * 111111
  const dLng = (b.lng - a.lng) * 111111 * cosLat
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/**
 * Compute a single intermediate waypoint that bows the A-to-B route outward
 * so that the total walking distance approaches `targetMeters`.
 *
 * The waypoint is placed at the midpoint of the A-B line, then shifted
 * perpendicularly by the amount needed to achieve the target length.
 * The geometric approximation: path ≈ 2 × √((direct/2)² + offset²).
 *
 * Returns `null` when the target is not longer than the direct distance
 * (no detour needed) or when the inputs are invalid.
 *
 * @param {{ lat: number, lng: number }} start      - Route origin
 * @param {{ lat: number, lng: number }} end        - Route destination
 * @param {number}                       targetMeters - Desired total walk distance
 * @param {boolean}                      [flip=false] - Flip detour to the other side of the line
 * @returns {{ lat: number, lng: number } | null}
 */
export function computeDetourWaypoint(start, end, targetMeters, flip = false) {
  if (
    !start || !end ||
    !isFinite(start.lat) || !isFinite(start.lng) ||
    !isFinite(end.lat)   || !isFinite(end.lng)   ||
    !isFinite(targetMeters) || targetMeters <= 0
  ) return null

  const midLat = (start.lat + end.lat) / 2
  const midLng = (start.lng + end.lng) / 2
  const cosLat = Math.cos(midLat * (Math.PI / 180))

  // AB vector in flat-earth metres
  const dLatM = (end.lat - start.lat) * 111111
  const dLngM = (end.lng - start.lng) * 111111 * cosLat
  const directM = Math.sqrt(dLatM * dLatM + dLngM * dLngM)

  if (directM < 1) return null // start === end
  if (targetMeters <= directM) return null // already long enough

  // Perpendicular offset needed so 2*sqrt((direct/2)²+offset²) ≈ target
  const halfDirect = directM / 2
  const halfTarget = targetMeters / 2
  if (halfTarget <= halfDirect) return null
  const offsetM = Math.sqrt(halfTarget * halfTarget - halfDirect * halfDirect)

  // Unit perpendicular vector (rotate AB 90° CCW in metre-space)
  const len = directM
  const perpLatM = -dLngM / len
  const perpLngM =  dLatM / len

  const sign = flip ? -1 : 1

  return {
    lat: midLat + sign * perpLatM * offsetM / 111111,
    lng: midLng + sign * perpLngM * offsetM / (111111 * cosLat),
  }
}
