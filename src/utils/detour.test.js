import { describe, it, expect } from 'vitest'
import { computeDetourWaypoint, directDistance } from './detour'

const A = { lat: 52.52, lng: 13.405 }  // Berlin-ish points ~1.4 km apart
const B = { lat: 52.53, lng: 13.42  }

// ---------------------------------------------------------------------------
// directDistance — unit
// ---------------------------------------------------------------------------

describe('directDistance — unit', () => {
  it('returns 0 for identical points', () => {
    expect(directDistance(A, A)).toBe(0)
  })

  it('returns a positive value for distinct points', () => {
    expect(directDistance(A, B)).toBeGreaterThan(0)
  })

  it('is symmetric', () => {
    expect(directDistance(A, B)).toBeCloseTo(directDistance(B, A), 0)
  })

  it('returns roughly 1.4 km for the test pair', () => {
    const d = directDistance(A, B)
    expect(d).toBeGreaterThan(1200)
    expect(d).toBeLessThan(1600)
  })
})

// ---------------------------------------------------------------------------
// computeDetourWaypoint — unit
// ---------------------------------------------------------------------------

describe('computeDetourWaypoint — unit', () => {
  it('returns null when target <= direct distance', () => {
    const direct = directDistance(A, B)
    expect(computeDetourWaypoint(A, B, direct * 0.9)).toBeNull()
    expect(computeDetourWaypoint(A, B, direct)).toBeNull()
  })

  it('returns a waypoint object when target > direct distance', () => {
    const wp = computeDetourWaypoint(A, B, 5000)
    expect(wp).not.toBeNull()
    expect(typeof wp.lat).toBe('number')
    expect(typeof wp.lng).toBe('number')
  })

  it('waypoint is finite and within reasonable lat/lng bounds', () => {
    const wp = computeDetourWaypoint(A, B, 5000)
    expect(isFinite(wp.lat)).toBe(true)
    expect(isFinite(wp.lng)).toBe(true)
    expect(wp.lat).toBeGreaterThan(-90)
    expect(wp.lat).toBeLessThan(90)
    expect(wp.lng).toBeGreaterThan(-180)
    expect(wp.lng).toBeLessThan(180)
  })

  it('waypoint sits near the midpoint of A-B (within a few km)', () => {
    const wp = computeDetourWaypoint(A, B, 5000)
    const midLat = (A.lat + B.lat) / 2
    const midLng = (A.lng + B.lng) / 2
    expect(Math.abs(wp.lat - midLat)).toBeLessThan(0.1)
    expect(Math.abs(wp.lng - midLng)).toBeLessThan(0.1)
  })

  it('flip=true produces a waypoint on the opposite side of the A-B line', () => {
    const wp     = computeDetourWaypoint(A, B, 5000, false)
    const wpFlip = computeDetourWaypoint(A, B, 5000, true)
    // Both offset from the same midpoint, so their average should be near mid
    const avgLat = (wp.lat + wpFlip.lat) / 2
    const avgLng = (wp.lng + wpFlip.lng) / 2
    expect(Math.abs(avgLat - (A.lat + B.lat) / 2)).toBeLessThan(0.001)
    expect(Math.abs(avgLng - (A.lng + B.lng) / 2)).toBeLessThan(0.001)
    // And they must differ
    expect(wp.lat).not.toBeCloseTo(wpFlip.lat, 5)
  })

  it('larger target produces a waypoint further from the midpoint', () => {
    const wp3 = computeDetourWaypoint(A, B, 3000)
    const wp8 = computeDetourWaypoint(A, B, 8000)
    const midLat = (A.lat + B.lat) / 2
    const dist3 = Math.abs(wp3.lat - midLat)
    const dist8 = Math.abs(wp8.lat - midLat)
    expect(dist8).toBeGreaterThan(dist3)
  })

  it('returns null for zero target', () => {
    expect(computeDetourWaypoint(A, B, 0)).toBeNull()
  })

  it('returns null for negative target', () => {
    expect(computeDetourWaypoint(A, B, -1000)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeDetourWaypoint — security
// ---------------------------------------------------------------------------

describe('computeDetourWaypoint — security', () => {
  it('returns null when start is null', () => {
    expect(computeDetourWaypoint(null, B, 5000)).toBeNull()
  })

  it('returns null when end is null', () => {
    expect(computeDetourWaypoint(A, null, 5000)).toBeNull()
  })

  it('returns null for NaN coordinates', () => {
    expect(computeDetourWaypoint({ lat: NaN, lng: 13 }, B, 5000)).toBeNull()
    expect(computeDetourWaypoint(A, { lat: 52, lng: NaN }, 5000)).toBeNull()
  })

  it('returns null for Infinity coordinates', () => {
    expect(computeDetourWaypoint({ lat: Infinity, lng: 13 }, B, 5000)).toBeNull()
  })

  it('returns null when start equals end', () => {
    expect(computeDetourWaypoint(A, A, 5000)).toBeNull()
  })

  it('does not mutate the input point objects', () => {
    const aCopy = { ...A }
    const bCopy = { ...B }
    computeDetourWaypoint(A, B, 5000)
    expect(A).toEqual(aCopy)
    expect(B).toEqual(bCopy)
  })
})
