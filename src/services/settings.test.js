import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettings, getDefaultStart, setDefaultStart, clearDefaultStart, getAppDefaults, setAppDefaults, resetAppDefaults } from './settings'
import { DEFAULT_ROUTE_MODE, DEFAULT_PREFERENCES, DEFAULT_LOOP_KM, DEFAULT_LOOP_MINUTES, DEFAULT_LOOP_INPUT_MODE, DEFAULT_REFINE_MIN_FEET, DEFAULT_POI_ENABLED } from '../config/defaults'

beforeEach(() => {
  localStorage.clear()
})

describe('getDefaultStart', () => {
  it('returns null when nothing is stored', () => {
    expect(getDefaultStart()).toBeNull()
  })

  it('returns the stored default start', () => {
    setDefaultStart({ lat: 52.52, lng: 13.405 }, 'Berlin')
    const result = getDefaultStart()
    expect(result).toEqual({ lat: 52.52, lng: 13.405, label: 'Berlin' })
  })

  it('returns null label when none provided', () => {
    setDefaultStart({ lat: 48.85, lng: 2.35 })
    expect(getDefaultStart()?.label).toBeNull()
  })
})

describe('setDefaultStart', () => {
  it('persists and returns the entry', () => {
    const entry = setDefaultStart({ lat: 51.5, lng: -0.12 }, 'London')
    expect(entry).toEqual({ lat: 51.5, lng: -0.12, label: 'London' })
    expect(getDefaultStart()).toEqual(entry)
  })

  it('overwrites a previous default', () => {
    setDefaultStart({ lat: 52.52, lng: 13.405 }, 'Berlin')
    setDefaultStart({ lat: 48.85, lng: 2.35 }, 'Paris')
    expect(getDefaultStart()?.label).toBe('Paris')
  })

  it('throws on invalid lat', () => {
    expect(() => setDefaultStart({ lat: 91, lng: 0 })).toThrow('Invalid coordinates')
  })

  it('throws on invalid lng', () => {
    expect(() => setDefaultStart({ lat: 0, lng: 181 })).toThrow('Invalid coordinates')
  })

  it('throws on non-number coords', () => {
    expect(() => setDefaultStart({ lat: 'x', lng: 0 })).toThrow('Invalid coordinates')
  })
})

describe('clearDefaultStart', () => {
  it('removes a stored default', () => {
    setDefaultStart({ lat: 52.52, lng: 13.405 }, 'Berlin')
    clearDefaultStart()
    expect(getDefaultStart()).toBeNull()
  })

  it('is a no-op when nothing is stored', () => {
    expect(() => clearDefaultStart()).not.toThrow()
  })

  it('does not delete other settings keys', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ someOtherKey: 42, defaultStart: { lat: 1, lng: 1, label: null } }))
    clearDefaultStart()
    const settings = loadSettings()
    expect(settings.someOtherKey).toBe(42)
    expect(settings.defaultStart).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getAppDefaults / setAppDefaults / resetAppDefaults
// ---------------------------------------------------------------------------

describe('getAppDefaults', () => {
  it('returns base-profile values when nothing is saved', () => {
    const d = getAppDefaults()
    expect(d.defaultMode).toBe(DEFAULT_ROUTE_MODE)
    expect(d.defaultPreferences).toEqual(DEFAULT_PREFERENCES)
    expect(d.defaultLoopKm).toBe(DEFAULT_LOOP_KM)
    expect(d.defaultLoopMinutes).toBe(DEFAULT_LOOP_MINUTES)
    expect(d.defaultLoopInputMode).toBe(DEFAULT_LOOP_INPUT_MODE)
    expect(d.defaultPoiEnabled).toEqual(DEFAULT_POI_ENABLED)
  })

  it('returns saved overrides when present', () => {
    setAppDefaults({ defaultMode: 'loop', defaultLoopKm: 8 })
    const d = getAppDefaults()
    expect(d.defaultMode).toBe('loop')
    expect(d.defaultLoopKm).toBe(8)
    expect(d.defaultLoopInputMode).toBe(DEFAULT_LOOP_INPUT_MODE) // unset key → base profile
  })

  it('silently drops invalid saved mode, falls back to base', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ appDefaults: { defaultMode: 'flying' } }))
    expect(getAppDefaults().defaultMode).toBe(DEFAULT_ROUTE_MODE)
  })

  it('silently drops invalid loopKm (out of range), falls back to base', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ appDefaults: { defaultLoopKm: 9999 } }))
    expect(getAppDefaults().defaultLoopKm).toBe(DEFAULT_LOOP_KM)
  })

  it('silently drops invalid loopMinutes (out of range), falls back to base', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ appDefaults: { defaultLoopMinutes: 9999 } }))
    expect(getAppDefaults().defaultLoopMinutes).toBe(DEFAULT_LOOP_MINUTES)
  })

  it('returns base-profile refineMinFeet when nothing is saved', () => {
    expect(getAppDefaults().defaultRefineMinFeet).toBe(DEFAULT_REFINE_MIN_FEET)
  })

  it('silently drops invalid refineMinFeet (out of range), falls back to base', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ appDefaults: { defaultRefineMinFeet: 9999 } }))
    expect(getAppDefaults().defaultRefineMinFeet).toBe(DEFAULT_REFINE_MIN_FEET)
  })

  it('silently drops invalid preferences (bad slider value), falls back to base', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ appDefaults: { defaultPreferences: { green: 5, quiet: 0, refineRoute: false } } }))
    expect(getAppDefaults().defaultPreferences).toEqual(DEFAULT_PREFERENCES)
  })
})

describe('setAppDefaults', () => {
  it('persists mode override', () => {
    setAppDefaults({ defaultMode: 'loop' })
    expect(getAppDefaults().defaultMode).toBe('loop')
  })

  it('persists preferences override', () => {
    setAppDefaults({ defaultPreferences: { green: 0.4, quiet: 0.2, refineRoute: true } })
    expect(getAppDefaults().defaultPreferences).toEqual({ green: 0.4, quiet: 0.2, refineRoute: true })
  })

  it('persists POI enabled override', () => {
    const poi = { bench: false, water: true, viewpoint: true, bus_stop: false, tram_stop: true, subway: false }
    setAppDefaults({ defaultPoiEnabled: poi })
    expect(getAppDefaults().defaultPoiEnabled).toEqual(poi)
  })

  it('merges partial patch without overwriting other keys', () => {
    setAppDefaults({ defaultMode: 'loop', defaultLoopKm: 10 })
    setAppDefaults({ defaultLoopKm: 12 })
    const d = getAppDefaults()
    expect(d.defaultMode).toBe('loop')
    expect(d.defaultLoopKm).toBe(12)
  })

  it('throws on invalid mode', () => {
    expect(() => setAppDefaults({ defaultMode: 'bike' })).toThrow('Invalid defaultMode')
  })

  it('throws on invalid loopKm', () => {
    expect(() => setAppDefaults({ defaultLoopKm: -1 })).toThrow('Invalid defaultLoopKm')
  })

  it('persists loopMinutes override', () => {
    setAppDefaults({ defaultLoopMinutes: 90 })
    expect(getAppDefaults().defaultLoopMinutes).toBe(90)
  })

  it('throws on invalid loopMinutes', () => {
    expect(() => setAppDefaults({ defaultLoopMinutes: 2 })).toThrow('Invalid defaultLoopMinutes')
  })

  it('persists refineMinFeet override', () => {
    setAppDefaults({ defaultRefineMinFeet: 200 })
    expect(getAppDefaults().defaultRefineMinFeet).toBe(200)
  })

  it('throws on invalid refineMinFeet (below minimum)', () => {
    expect(() => setAppDefaults({ defaultRefineMinFeet: 10 })).toThrow('Invalid defaultRefineMinFeet')
  })

  it('throws on invalid preferences (slider out of range)', () => {
    expect(() => setAppDefaults({ defaultPreferences: { green: 2, quiet: 0, refineRoute: false } })).toThrow('Invalid defaultPreferences')
  })
})

describe('resetAppDefaults', () => {
  it('reverts to base-profile values after reset', () => {
    setAppDefaults({ defaultMode: 'loop', defaultLoopKm: 15 })
    resetAppDefaults()
    const d = getAppDefaults()
    expect(d.defaultMode).toBe(DEFAULT_ROUTE_MODE)
    expect(d.defaultLoopKm).toBe(DEFAULT_LOOP_KM)
  })

  it('does not remove other settings keys (e.g. defaultStart)', () => {
    setDefaultStart({ lat: 52.52, lng: 13.405 }, 'Berlin')
    setAppDefaults({ defaultMode: 'loop' })
    resetAppDefaults()
    expect(getDefaultStart()?.label).toBe('Berlin')
  })

  it('is a no-op when nothing is saved', () => {
    expect(() => resetAppDefaults()).not.toThrow()
    expect(getAppDefaults().defaultMode).toBe(DEFAULT_ROUTE_MODE)
  })
})

describe('loadSettings — security / tamper resistance', () => {
  it('returns {} on non-JSON garbage', () => {
    localStorage.setItem('urban-hiker-settings', 'not json {{}}')
    expect(loadSettings()).toEqual({})
  })

  it('returns {} when root value is an array', () => {
    localStorage.setItem('urban-hiker-settings', '[]')
    expect(loadSettings()).toEqual({})
  })

  it('drops defaultStart with out-of-range lat', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ defaultStart: { lat: -999, lng: 0, label: null } }))
    expect(getDefaultStart()).toBeNull()
  })

  it('drops defaultStart with out-of-range lng', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ defaultStart: { lat: 0, lng: 999, label: null } }))
    expect(getDefaultStart()).toBeNull()
  })

  it('drops defaultStart when lat is a string', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ defaultStart: { lat: '52.52', lng: 13.4, label: null } }))
    expect(getDefaultStart()).toBeNull()
  })

  it('coerces non-string label to null', () => {
    localStorage.setItem('urban-hiker-settings', JSON.stringify({ defaultStart: { lat: 10, lng: 10, label: 12345 } }))
    expect(getDefaultStart()?.label).toBeNull()
  })

  it('ignores __proto__ injection attempt', () => {
    localStorage.setItem('urban-hiker-settings', '{"__proto__":{"polluted":true}}')
    loadSettings()
    expect(({}).polluted).toBeUndefined()
  })
})
