/** Average walking speed used for duration ↔ distance conversions (m/s). */
const WALKING_SPEED_MS = 5000 / 3600 // 5 km/h

/**
 * Format a duration in seconds as a human-readable string.
 *
 * @param {number} seconds - Duration in seconds (non-negative)
 * @returns {string} E.g. "1h 5min" or "23 min"
 */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

/**
 * Format a distance in metres as a human-readable string.
 *
 * @param {number} meters - Distance in metres (non-negative)
 * @returns {string} E.g. "2.50 km" or "850 m"
 */
export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

/**
 * Convert a walking duration in minutes to an approximate distance in metres,
 * using a fixed average walking speed of 5 km/h.
 *
 * @param {number} minutes - Desired walk duration in minutes (positive)
 * @returns {number} Approximate distance in metres
 */
export function minutesToMeters(minutes) {
  return Math.round(minutes * 60 * WALKING_SPEED_MS)
}
