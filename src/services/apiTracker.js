import { getAppDefaults } from './settings'

const LOG_KEY       = 'urban-hiker-api-log'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * @typedef {'ors' | 'nominatim' | 'overpass'} ApiEndpoint
 */

/**
 * @typedef {Object} CallRecord
 * @property {number}      ts       - Unix timestamp (ms)
 * @property {ApiEndpoint} endpoint
 * @property {boolean}     success
 */

/** Daily call limits (free / fair-use). Used as reference thresholds in the UI. */
export const DAILY_LIMITS = {
  ors:       2000,
  nominatim:  500,
  overpass: 10000,
}

export const ENDPOINT_COLORS = {
  ors:       '#2563eb',
  nominatim: '#16a34a',
  overpass:  '#d97706',
}

export const ENDPOINT_LABELS = {
  ors:       'ORS (routing)',
  nominatim: 'Nominatim (geocoding)',
  overpass:  'Overpass (POI)',
}

/**
 * Drop entries older than 7 days.
 *
 * @param {CallRecord[]} log
 * @returns {CallRecord[]}
 */
function pruned(log) {
  const cutoff = Date.now() - SEVEN_DAYS_MS
  return log.filter((r) => typeof r.ts === 'number' && r.ts >= cutoff)
}

/**
 * Read and prune the log from localStorage. Always returns a valid array.
 *
 * @returns {CallRecord[]}
 */
export function getCallLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return pruned(parsed)
  } catch {
    return []
  }
}

/**
 * Record one API call. No-op when tracking is disabled in app settings.
 * Prunes entries older than 7 days on every write.
 *
 * @param {ApiEndpoint} endpoint
 * @param {boolean}     success
 */
export function recordCall(endpoint, success) {
  try {
    if (!getAppDefaults().apiTrackingEnabled) return
    const log = getCallLog()
    log.push({ ts: Date.now(), endpoint, success })
    localStorage.setItem(LOG_KEY, JSON.stringify(pruned(log)))
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — silently skip
  }
}

/**
 * Remove all stored call records immediately.
 */
export function clearCallLog() {
  try {
    localStorage.removeItem(LOG_KEY)
  } catch {
    // ignore
  }
}
