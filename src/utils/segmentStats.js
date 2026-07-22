import { haversineDistance } from './geo'
import { nearestCoordIndex } from './routeRefine'

/**
 * @typedef {Object} SegmentStat
 * @property {string} from       - Label for the segment start point
 * @property {string} to         - Label for the segment end point
 * @property {number} distanceM  - Segment distance in metres
 * @property {number} durationS  - Estimated segment duration in seconds (proportional to distance)
 */

/**
 * Split a route polyline into labelled segments at the given boundary points
 * and compute distance and proportional duration for each segment.
 *
 * The last boundary is always snapped to the final route coordinate so the
 * segments cover the entire polyline — important for loops where start and end
 * share the same latlng but `nearestCoordIndex` would return 0 for both.
 *
 * @param {[number, number][]} coordinates - Route [lat, lng] pairs
 * @param {number} totalDurationS          - Total route duration in seconds
 * @param {{ lat: number, lng: number, label: string }[]} boundaries
 *   Ordered boundary points including start and end (min 2 entries)
 * @returns {SegmentStat[]} One entry per consecutive pair of boundaries
 */
export function computeSegmentStats(coordinates, totalDurationS, boundaries) {
  if (!coordinates || coordinates.length < 2) return []
  if (!boundaries || boundaries.length < 2) return []

  const indices = boundaries.map((b) => nearestCoordIndex(coordinates, b))

  // Snap the last boundary to the final coordinate (handles loops where
  // start === end and nearestCoordIndex would return 0 for the last point).
  indices[indices.length - 1] = coordinates.length - 1

  // Ensure all intermediate indices are strictly increasing.
  for (let i = 1; i < indices.length - 1; i++) {
    if (indices[i] <= indices[i - 1]) {
      indices[i] = Math.min(indices[i - 1] + 1, coordinates.length - 2)
    }
  }

  let totalDist = 0
  for (let i = 1; i < coordinates.length; i++) {
    totalDist += haversineDistance(coordinates[i - 1], coordinates[i])
  }

  return boundaries.slice(0, -1).map((boundary, s) => {
    let segDist = 0
    for (let i = indices[s] + 1; i <= indices[s + 1]; i++) {
      segDist += haversineDistance(coordinates[i - 1], coordinates[i])
    }
    return {
      from: boundary.label,
      to: boundaries[s + 1].label,
      distanceM: segDist,
      durationS: totalDist > 0 ? (segDist / totalDist) * totalDurationS : 0,
    }
  })
}
