import { haversineDistance } from './geo'

/** ORS waytypes considered "main roads" for refinement purposes */
const MAIN_ROAD_TYPES = new Set([1, 2]) // 1=State Road (primary/trunk), 2=Road (secondary)

/** Minimum segment length in metres that triggers a re-route (≈ 400 ft) */
export const MIN_MAIN_ROAD_LENGTH_M = 122

/**
 * Expand the ORS sparse waytype values array into a per-coordinate flat array.
 * ORS returns entries as [startIdx, endIdx, waytypeValue] covering half-open ranges.
 *
 * @param {[number, number, number][]} values - ORS extras sparse entries
 * @param {number} coordCount - Total number of coordinates in the route
 * @returns {number[]} Array of length coordCount; 0 for any unspecified index
 */
export function expandWayTypes(values, coordCount) {
  const result = new Array(coordCount).fill(0)
  if (!Array.isArray(values)) return result
  for (const [start, end, type] of values) {
    for (let i = start; i < end && i < coordCount; i++) result[i] = type
  }
  return result
}

/**
 * Find contiguous runs of main-road waytype coordinates whose combined
 * walking distance exceeds minLengthM.
 *
 * @param {[number, number][]} coordinates - [lat, lng] pairs
 * @param {number[]} wayTypes - Per-coordinate waytype values (same length)
 * @param {number} [minLengthM=MIN_MAIN_ROAD_LENGTH_M]
 * @returns {{ startIdx: number, endIdx: number }[]} Segments to refine, in order
 */
export function findMainRoadSegments(coordinates, wayTypes, minLengthM = MIN_MAIN_ROAD_LENGTH_M) {
  if (!coordinates?.length || !wayTypes?.length) return []
  const segments = []
  let runStart = -1
  let runLength = 0

  for (let i = 0; i < coordinates.length; i++) {
    const isMain = MAIN_ROAD_TYPES.has(wayTypes[i])
    if (isMain) {
      if (runStart === -1) {
        runStart = i
      } else {
        runLength += haversineDistance(coordinates[i - 1], coordinates[i])
      }
    } else {
      if (runStart !== -1 && runLength >= minLengthM) {
        segments.push({ startIdx: runStart, endIdx: i - 1 })
      }
      runStart = -1
      runLength = 0
    }
  }
  // Handle run ending at last coordinate
  if (runStart !== -1 && runLength >= minLengthM) {
    segments.push({ startIdx: runStart, endIdx: coordinates.length - 1 })
  }
  return segments
}

/**
 * Replace a slice of the main route coordinates with a sub-route's coordinates.
 * The sub-route is expected to start near mainCoords[startIdx] and end near
 * mainCoords[endIdx], so those boundary points are preserved from the main route.
 *
 * @param {[number, number][]} mainCoords - Full route coordinate array
 * @param {number} startIdx - First index of the segment to replace
 * @param {number} endIdx   - Last index of the segment to replace (inclusive)
 * @param {[number, number][]} subCoords - Replacement coordinates from the sub-route
 * @returns {[number, number][]} New coordinate array with the segment spliced out
 */
export function spliceSubRoute(mainCoords, startIdx, endIdx, subCoords) {
  return [
    ...mainCoords.slice(0, startIdx),
    ...subCoords,
    ...mainCoords.slice(endIdx + 1),
  ]
}

/**
 * Find the index in `coordinates` closest to a given latlng point.
 *
 * @param {[number, number][]} coordinates - [lat, lng] pairs
 * @param {{ lat: number, lng: number }} latlng
 * @returns {number} Index of the nearest coordinate
 */
export function nearestCoordIndex(coordinates, latlng) {
  let best = 0
  let bestDist = Infinity
  const target = [latlng.lat, latlng.lng]
  for (let i = 0; i < coordinates.length; i++) {
    const d = haversineDistance(coordinates[i], target)
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

/**
 * Given a coordinate index on a route, expand outward to find the nearest
 * non-main-road boundary in each direction. This defines the local segment
 * to re-route when the user clicks on a main-road portion.
 *
 * Falls back to a ±30 coord window if no good boundary is found within 500 steps.
 *
 * @param {[number, number][]} coordinates
 * @param {number[]} wayTypes
 * @param {number} centerIdx
 * @returns {{ startIdx: number, endIdx: number }}
 */
export function findLocalSegment(coordinates, wayTypes, centerIdx) {
  const MAX_WALK = 500
  const FALLBACK_WINDOW = 30
  const n = coordinates.length

  let startIdx = centerIdx
  for (let steps = 0; steps < MAX_WALK && startIdx > 0; steps++) {
    if (!MAIN_ROAD_TYPES.has(wayTypes[startIdx - 1])) break
    startIdx--
  }

  let endIdx = centerIdx
  for (let steps = 0; steps < MAX_WALK && endIdx < n - 1; steps++) {
    if (!MAIN_ROAD_TYPES.has(wayTypes[endIdx + 1])) break
    endIdx++
  }

  // Apply fallback window if the search hit the cap without finding a boundary
  if (startIdx === Math.max(0, centerIdx - MAX_WALK)) {
    startIdx = Math.max(0, centerIdx - FALLBACK_WINDOW)
  }
  if (endIdx === Math.min(n - 1, centerIdx + MAX_WALK)) {
    endIdx = Math.min(n - 1, centerIdx + FALLBACK_WINDOW)
  }

  return { startIdx, endIdx }
}
