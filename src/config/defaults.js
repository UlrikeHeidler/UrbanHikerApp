/**
 * Application base profile — all default values in one place.
 * These are the fallback values used when no user override is saved.
 * Import from here instead of hard-coding literals in components.
 */

/** @type {'a-to-b' | 'loop'} */
export const DEFAULT_ROUTE_MODE = 'a-to-b'

/** @type {{ green: number, quiet: number, refineRoute: boolean }} */
export const DEFAULT_PREFERENCES = { green: 0, quiet: 0, refineRoute: false }

/** Default loop target distance in kilometres. */
export const DEFAULT_LOOP_KM = 5

/** Default loop target duration in minutes. */
export const DEFAULT_LOOP_MINUTES = 60

/** @type {'distance' | 'duration'} */
export const DEFAULT_LOOP_INPUT_MODE = 'distance'

/** Which POI overlay types are visible by default. */
export const DEFAULT_POI_ENABLED = {
  bench: false, water: false, viewpoint: false,
  bus_stop: false, tram_stop: false, subway: false,
}

/** Walking speed used for duration ↔ distance conversions (km/h). */
export const DEFAULT_WALKING_SPEED_KMH = 5

/**
 * Minimum main-road segment length (in feet) that triggers auto-refinement.
 * Converted to metres at the call site (1 ft = 0.3048 m).
 */
export const DEFAULT_REFINE_MIN_FEET = 400

/** Fallback map centre when no default start point is set. */
export const MAP_DEFAULT_CENTER = [38.8737, -77.2311]
