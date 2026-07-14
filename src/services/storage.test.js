import { describe, it, expect, beforeEach } from 'vitest'
import { loadRoutes, saveRoute, deleteRoute } from './storage'

const SAMPLE = {
  name: 'Morning loop',
  mode: 'loop',
  startPoint: { lat: 38.87, lng: -77.23 },
  endPoint: null,
  loopMeters: 5000,
  loopSeed: 2,
  coordinates: [[38.87, -77.23], [38.88, -77.22]],
  info: { distance: 4950, duration: 3564, ascent: 20, descent: 18 },
  elevationProfile: [{ distanceM: 0, elevationM: 90 }, { distanceM: 4950, elevationM: 92 }],
}

beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// loadRoutes
// ---------------------------------------------------------------------------

describe('loadRoutes', () => {
  it('returns an empty array when localStorage is empty', () => {
    expect(loadRoutes()).toEqual([])
  })

  it('returns an empty array when the stored value is not an array', () => {
    localStorage.setItem('urban-hiker-routes', JSON.stringify({ bad: true }))
    expect(loadRoutes()).toEqual([])
  })

  it('returns an empty array when the stored JSON is malformed', () => {
    localStorage.setItem('urban-hiker-routes', 'not-json{{{')
    expect(loadRoutes()).toEqual([])
  })

  it('returns saved routes in order', () => {
    saveRoute({ ...SAMPLE, name: 'Route A' })
    saveRoute({ ...SAMPLE, name: 'Route B' })
    const routes = loadRoutes()
    expect(routes).toHaveLength(2)
    // newest first
    expect(routes[0].name).toBe('Route B')
    expect(routes[1].name).toBe('Route A')
  })
})

// ---------------------------------------------------------------------------
// saveRoute
// ---------------------------------------------------------------------------

describe('saveRoute', () => {
  it('assigns a unique string id to the saved route', () => {
    const saved = saveRoute(SAMPLE)
    expect(typeof saved.id).toBe('string')
    expect(saved.id.startsWith('route-')).toBe(true)
  })

  it('assigns a numeric savedAt timestamp', () => {
    const before = Date.now()
    const saved = saveRoute(SAMPLE)
    expect(saved.savedAt).toBeGreaterThanOrEqual(before)
    expect(saved.savedAt).toBeLessThanOrEqual(Date.now())
  })

  it('persists route data so loadRoutes returns it', () => {
    saveRoute(SAMPLE)
    const [loaded] = loadRoutes()
    expect(loaded.name).toBe(SAMPLE.name)
    expect(loaded.mode).toBe(SAMPLE.mode)
    expect(loaded.loopMeters).toBe(SAMPLE.loopMeters)
  })

  it('prepends new routes so newer routes appear first', () => {
    saveRoute({ ...SAMPLE, name: 'First' })
    saveRoute({ ...SAMPLE, name: 'Second' })
    const [first] = loadRoutes()
    expect(first.name).toBe('Second')
  })

  it('does not mutate the input object', () => {
    const input = { ...SAMPLE }
    saveRoute(input)
    expect(input.id).toBeUndefined()
    expect(input.savedAt).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// deleteRoute
// ---------------------------------------------------------------------------

describe('deleteRoute', () => {
  it('removes the route with the given id', () => {
    const saved = saveRoute(SAMPLE)
    expect(loadRoutes()).toHaveLength(1)
    deleteRoute(saved.id)
    expect(loadRoutes()).toHaveLength(0)
  })

  it('returns true when the route was found and deleted', () => {
    const saved = saveRoute(SAMPLE)
    expect(deleteRoute(saved.id)).toBe(true)
  })

  it('returns false when the id does not exist', () => {
    expect(deleteRoute('non-existent-id')).toBe(false)
  })

  it('only removes the matching route, leaving others intact', () => {
    const a = saveRoute({ ...SAMPLE, name: 'A' })
    saveRoute({ ...SAMPLE, name: 'B' })
    deleteRoute(a.id)
    const remaining = loadRoutes()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe('B')
  })
})

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

describe('storage — security', () => {
  it('does not execute stored values as code on load', () => {
    localStorage.setItem(
      'urban-hiker-routes',
      JSON.stringify([{ id: '1', name: '<script>alert(1)</script>', savedAt: 0 }])
    )
    const routes = loadRoutes()
    // Value must be returned as a string, not executed
    expect(routes[0].name).toBe('<script>alert(1)</script>')
  })

  it('handles routes with very long names without throwing', () => {
    const longName = 'x'.repeat(10_000)
    expect(() => saveRoute({ ...SAMPLE, name: longName })).not.toThrow()
    expect(loadRoutes()[0].name).toBe(longName)
  })

  it('generates unique ids for routes saved in the same tick', () => {
    const a = saveRoute({ ...SAMPLE, name: 'A' })
    const b = saveRoute({ ...SAMPLE, name: 'B' })
    expect(a.id).not.toBe(b.id)
  })
})
