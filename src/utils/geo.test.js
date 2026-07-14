import { describe, it, expect } from 'vitest'
import { haversineDistance, buildElevationProfile, getBoundingBox } from './geo'

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance([52.52, 13.405], [52.52, 13.405])).toBe(0)
  })

  it('calculates ~111 km per degree of latitude', () => {
    const d = haversineDistance([0, 0], [1, 0])
    expect(d).toBeCloseTo(111_195, -2) // within 100 m
  })

  it('calculates the known distance between Berlin and Paris (~878 km)', () => {
    const berlin = [52.52, 13.405]
    const paris  = [48.857, 2.352]
    const d = haversineDistance(berlin, paris)
    expect(d / 1000).toBeGreaterThan(875)
    expect(d / 1000).toBeLessThan(882)
  })

  it('is symmetric', () => {
    const a = [38.87, -77.23]
    const b = [38.90, -77.20]
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 6)
  })
})

// ---------------------------------------------------------------------------
// buildElevationProfile
// ---------------------------------------------------------------------------

describe('buildElevationProfile', () => {
  it('returns an empty array for empty input', () => {
    expect(buildElevationProfile([])).toEqual([])
  })

  it('returns an empty array when elevation is absent (2D coords)', () => {
    expect(buildElevationProfile([[13.0, 52.0], [13.1, 52.1]])).toEqual([])
  })

  it('returns an empty array for null/undefined input', () => {
    expect(buildElevationProfile(null)).toEqual([])
    expect(buildElevationProfile(undefined)).toEqual([])
  })

  it('first point always has distanceM of 0', () => {
    const coords = [[13.405, 52.52, 34], [13.41, 52.525, 36]]
    const profile = buildElevationProfile(coords)
    expect(profile[0].distanceM).toBe(0)
  })

  it('preserves elevation values from input', () => {
    const coords = [[13.405, 52.52, 34], [13.41, 52.525, 36], [13.42, 52.53, 30]]
    const profile = buildElevationProfile(coords)
    expect(profile.map((p) => p.elevationM)).toEqual([34, 36, 30])
  })

  it('cumulative distance increases monotonically', () => {
    const coords = [
      [13.405, 52.52, 34],
      [13.41,  52.525, 36],
      [13.42,  52.53, 35],
    ]
    const profile = buildElevationProfile(coords)
    for (let i = 1; i < profile.length; i++) {
      expect(profile[i].distanceM).toBeGreaterThan(profile[i - 1].distanceM)
    }
  })

  it('final cumulative distance roughly matches straight-line distance', () => {
    // ~700 m apart
    const coords = [[13.405, 52.52, 34], [13.415, 52.526, 36]]
    const profile = buildElevationProfile(coords)
    const totalM = profile[profile.length - 1].distanceM
    expect(totalM).toBeGreaterThan(500)
    expect(totalM).toBeLessThan(1000)
  })
})

// ---------------------------------------------------------------------------
// getBoundingBox
// ---------------------------------------------------------------------------

describe('getBoundingBox', () => {
  it('throws for an empty array', () => {
    expect(() => getBoundingBox([])).toThrow()
    expect(() => getBoundingBox(null)).toThrow()
  })

  it('returns equal min/max for a single point', () => {
    const box = getBoundingBox([[38.87, -77.23]])
    expect(box).toEqual({ minLat: 38.87, maxLat: 38.87, minLng: -77.23, maxLng: -77.23 })
  })

  it('correctly computes min and max across multiple points', () => {
    const coords = [[38.87, -77.23], [38.90, -77.20], [38.85, -77.25]]
    const box = getBoundingBox(coords)
    expect(box.minLat).toBeCloseTo(38.85)
    expect(box.maxLat).toBeCloseTo(38.90)
    expect(box.minLng).toBeCloseTo(-77.25)
    expect(box.maxLng).toBeCloseTo(-77.20)
  })

  it('handles negative coordinates correctly', () => {
    const coords = [[-33.87, 151.21], [-33.90, 151.18]]
    const box = getBoundingBox(coords)
    expect(box.minLat).toBeCloseTo(-33.90)
    expect(box.maxLat).toBeCloseTo(-33.87)
  })
})
