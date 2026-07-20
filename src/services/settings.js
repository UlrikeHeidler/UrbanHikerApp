import {
  DEFAULT_ROUTE_MODE,
  DEFAULT_PREFERENCES,
  DEFAULT_LOOP_KM,
  DEFAULT_LOOP_MINUTES,
  DEFAULT_LOOP_INPUT_MODE,
  DEFAULT_POI_ENABLED,
  DEFAULT_REFINE_MIN_FEET,
  DEFAULT_WALKING_SPEED_KMH,
} from '../config/defaults'

const STORAGE_KEY = 'urban-hiker-settings'

const VALID_MODES = new Set(['a-to-b', 'loop'])
const VALID_LOOP_INPUT_MODES = new Set(['distance', 'duration'])
const POI_KEYS = ['bench', 'water', 'viewpoint', 'bus_stop', 'tram_stop', 'subway']

/**
 * @typedef {Object} DefaultStart
 * @property {number}      lat
 * @property {number}      lng
 * @property {string|null} label - Human-readable address, or null
 */

/**
 * @typedef {Object} SavedAppDefaults
 * @property {'a-to-b'|'loop'} [defaultMode]
 * @property {{ green: number, quiet: number, refineRoute: boolean }} [defaultPreferences]
 * @property {number}  [defaultLoopKm]
 * @property {number}  [defaultLoopMinutes]
 * @property {'distance'|'duration'} [defaultLoopInputMode]
 * @property {number}  [defaultRefineMinFeet] - Minimum main-road segment length in feet that triggers auto-refinement
 * @property {{ bench: boolean, water: boolean, viewpoint: boolean, bus_stop: boolean, tram_stop: boolean, subway: boolean }} [defaultPoiEnabled]
 * @property {number}  [walkingSpeedKmh]      - Walking pace used for duration ↔ distance (1–20 km/h)
 */

/**
 * @typedef {Object} AppSettings
 * @property {DefaultStart|null}    [defaultStart]
 * @property {SavedAppDefaults}     [appDefaults]
 */

/**
 * Load persisted settings from localStorage.
 * Invalid or tampered values are silently dropped.
 *
 * @returns {AppSettings}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    if (parsed.defaultStart !== undefined) {
      parsed.defaultStart = _validateDefaultStart(parsed.defaultStart)
    }
    return parsed
  } catch {
    return {}
  }
}

/**
 * Retrieve the saved default start point, or null if none is set.
 *
 * @returns {DefaultStart|null}
 */
export function getDefaultStart() {
  return loadSettings().defaultStart ?? null
}

/**
 * Persist a default start point.
 *
 * @param {{ lat: number, lng: number }} latlng
 * @param {string|null} label - Human-readable address label
 * @returns {DefaultStart} The stored value
 * @throws {Error} When lat/lng are out of valid range
 */
export function setDefaultStart(latlng, label = null) {
  const { lat, lng } = latlng
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates for default start point')
  }
  const entry = {
    lat,
    lng,
    label: typeof label === 'string' ? label : null,
  }
  const settings = loadSettings()
  settings.defaultStart = entry
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  return entry
}

/**
 * Remove the saved default start point.
 */
export function clearDefaultStart() {
  const settings = loadSettings()
  delete settings.defaultStart
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Return the effective app defaults — the base profile from `defaults.js`
 * merged with any user-saved overrides. Invalid saved fields are silently
 * dropped and the base-profile value is used instead.
 *
 * @returns {Required<SavedAppDefaults>}
 */
export function getAppDefaults() {
  const saved = loadSettings().appDefaults ?? {}
  return {
    defaultMode: VALID_MODES.has(saved.defaultMode) ? saved.defaultMode : DEFAULT_ROUTE_MODE,
    defaultPreferences: _validatePreferences(saved.defaultPreferences) ?? { ...DEFAULT_PREFERENCES },
    defaultLoopKm: _validateLoopKm(saved.defaultLoopKm) ?? DEFAULT_LOOP_KM,
    defaultLoopMinutes: _validateLoopMinutes(saved.defaultLoopMinutes) ?? DEFAULT_LOOP_MINUTES,
    defaultLoopInputMode: VALID_LOOP_INPUT_MODES.has(saved.defaultLoopInputMode)
      ? saved.defaultLoopInputMode
      : DEFAULT_LOOP_INPUT_MODE,
    defaultRefineMinFeet: _validateRefineMinFeet(saved.defaultRefineMinFeet) ?? DEFAULT_REFINE_MIN_FEET,
    defaultPoiEnabled: _validatePoiEnabled(saved.defaultPoiEnabled) ?? { ...DEFAULT_POI_ENABLED },
    walkingSpeedKmh: _validateWalkingSpeedKmh(saved.walkingSpeedKmh) ?? DEFAULT_WALKING_SPEED_KMH,
  }
}

/**
 * Persist user-overridden app defaults. Only the provided keys are updated;
 * omitted keys retain their current saved value.
 *
 * @param {Partial<SavedAppDefaults>} patch
 * @throws {Error} On any invalid field value
 */
export function setAppDefaults(patch) {
  if (patch.defaultMode !== undefined && !VALID_MODES.has(patch.defaultMode)) {
    throw new Error(`Invalid defaultMode: ${patch.defaultMode}`)
  }
  if (patch.defaultPreferences !== undefined) {
    if (_validatePreferences(patch.defaultPreferences) === null) {
      throw new Error('Invalid defaultPreferences')
    }
  }
  if (patch.defaultLoopKm !== undefined && _validateLoopKm(patch.defaultLoopKm) === null) {
    throw new Error(`Invalid defaultLoopKm: ${patch.defaultLoopKm}`)
  }
  if (patch.defaultLoopMinutes !== undefined && _validateLoopMinutes(patch.defaultLoopMinutes) === null) {
    throw new Error(`Invalid defaultLoopMinutes: ${patch.defaultLoopMinutes}`)
  }
  if (patch.defaultLoopInputMode !== undefined && !VALID_LOOP_INPUT_MODES.has(patch.defaultLoopInputMode)) {
    throw new Error(`Invalid defaultLoopInputMode: ${patch.defaultLoopInputMode}`)
  }
  if (patch.defaultRefineMinFeet !== undefined && _validateRefineMinFeet(patch.defaultRefineMinFeet) === null) {
    throw new Error(`Invalid defaultRefineMinFeet: ${patch.defaultRefineMinFeet}`)
  }
  if (patch.defaultPoiEnabled !== undefined && _validatePoiEnabled(patch.defaultPoiEnabled) === null) {
    throw new Error('Invalid defaultPoiEnabled')
  }
  if (patch.walkingSpeedKmh !== undefined && _validateWalkingSpeedKmh(patch.walkingSpeedKmh) === null) {
    throw new Error(`Invalid walkingSpeedKmh: ${patch.walkingSpeedKmh}`)
  }
  const settings = loadSettings()
  settings.appDefaults = { ...(settings.appDefaults ?? {}), ...patch }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Remove all saved app-defaults overrides. Effective values revert to the
 * base profile in `defaults.js`.
 */
export function resetAppDefaults() {
  const settings = loadSettings()
  delete settings.appDefaults
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/** @param {unknown} v @returns {{ green: number, quiet: number, refineRoute: boolean }|null} */
function _validatePreferences(v) {
  if (typeof v !== 'object' || v === null) return null
  const { green, quiet, refineRoute } = v
  if (typeof green !== 'number' || green < 0 || green > 0.8) return null
  if (typeof quiet !== 'number' || quiet < 0 || quiet > 0.8) return null
  if (typeof refineRoute !== 'boolean') return null
  return { green, quiet, refineRoute }
}

/** @param {unknown} v @returns {number|null} */
function _validateLoopKm(v) {
  if (typeof v !== 'number' || v < 0.5 || v > 200) return null
  return v
}

/** @param {unknown} v @returns {number|null} */
function _validateLoopMinutes(v) {
  if (typeof v !== 'number' || v < 5 || v > 600) return null
  return v
}

/** @param {unknown} v @returns {number|null} */
function _validateRefineMinFeet(v) {
  if (typeof v !== 'number' || v < 50 || v > 2640) return null
  return v
}

/** @param {unknown} v @returns {number|null} */
function _validateWalkingSpeedKmh(v) {
  if (typeof v !== 'number' || v < 1 || v > 20) return null
  return v
}

/** @param {unknown} v @returns {Record<string,boolean>|null} */
function _validatePoiEnabled(v) {
  if (typeof v !== 'object' || v === null) return null
  if (!POI_KEYS.every((k) => typeof v[k] === 'boolean')) return null
  return Object.fromEntries(POI_KEYS.map((k) => [k, v[k]]))
}

/** @param {unknown} value @returns {DefaultStart|null} */
function _validateDefaultStart(value) {
  if (typeof value !== 'object' || value === null) return null
  const { lat, lng, label } = value
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return {
    lat,
    lng,
    label: typeof label === 'string' ? label : null,
  }
}
