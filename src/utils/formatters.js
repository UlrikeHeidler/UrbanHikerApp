import { DEFAULT_WALKING_SPEED_KMH } from '../config/defaults'

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
 * Convert a walking duration in minutes to an approximate distance in metres.
 *
 * @param {number} minutes          - Desired walk duration in minutes (positive)
 * @param {number} [walkingSpeedKmh=DEFAULT_WALKING_SPEED_KMH] - Walking speed in km/h
 * @returns {number} Approximate distance in metres
 */
export function minutesToMeters(minutes, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  const speedMs = (walkingSpeedKmh * 1000) / 3600
  return Math.round(minutes * 60 * speedMs)
}

/**
 * Convert a distance in metres to an estimated walk duration in seconds,
 * using the configured walking speed.
 *
 * @param {number} meters           - Distance in metres
 * @param {number} [walkingSpeedKmh=DEFAULT_WALKING_SPEED_KMH] - Walking speed in km/h
 * @returns {number} Estimated duration in seconds
 */
export function metersToSeconds(meters, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  const speedMs = (walkingSpeedKmh * 1000) / 3600
  return Math.round(meters / speedMs)
}
