import { describe, it, expect } from 'vitest'
import { computeSegmentStats } from './segmentStats'

// Straight north-south route: 4 coords, ~111 km apart per degree latitude
const COORDS = [
  [52.00, 13.0],
  [52.10, 13.0],
  [52.20, 13.0],
  [52.30, 13.0],
]

const START = { lat: 52.00, lng: 13.0, label: 'Start' }
const MID   = { lat: 52.10, lng: 13.0, label: 'Waypoint 1' }
const END   = { lat: 52.30, lng: 13.0, label: 'End' }

describe('computeSegmentStats', () => {
  it('returns empty array for fewer than 2 boundaries', () => {
    expect(computeSegmentStats(COORDS, 3600, [START])).toEqual([])
    expect(computeSegmentStats(COORDS, 3600, [])).toEqual([])
  })

  it('returns empty array for empty coordinates', () => {
    expect(computeSegmentStats([], 3600, [START, END])).toEqual([])
    expect(computeSegmentStats(null, 3600, [START, END])).toEqual([])
  })

  it('returns one segment when no intermediate boundaries', () => {
    const result = computeSegmentStats(COORDS, 3600, [START, END])
    expect(result).toHaveLength(1)
    expect(result[0].from).toBe('Start')
    expect(result[0].to).toBe('End')
  })

  it('returns two segments when one intermediate boundary is present', () => {
    const result = computeSegmentStats(COORDS, 3600, [START, MID, END])
    expect(result).toHaveLength(2)
    expect(result[0].from).toBe('Start')
    expect(result[0].to).toBe('Waypoint 1')
    expect(result[1].from).toBe('Waypoint 1')
    expect(result[1].to).toBe('End')
  })

  it('segment distances sum to approximately the total route distance', () => {
    const result = computeSegmentStats(COORDS, 3600, [START, MID, END])
    const total = result.reduce((s, r) => s + r.distanceM, 0)
    // Total route is 3 steps × ~11.1 km; allow 1% tolerance
    expect(total).toBeGreaterThan(33_000)
    expect(total).toBeLessThan(34_000)
  })

  it('segment durations sum to the total duration', () => {
    const result = computeSegmentStats(COORDS, 3600, [START, MID, END])
    const totalDur = result.reduce((s, r) => s + r.durationS, 0)
    expect(totalDur).toBeCloseTo(3600, 0)
  })

  it('longer segment gets proportionally more duration', () => {
    // MID is at index 1 (1 step from START); END is at index 3 (2 steps from MID)
    const result = computeSegmentStats(COORDS, 3600, [START, MID, END])
    expect(result[1].durationS).toBeGreaterThan(result[0].durationS)
  })

  it('snaps last boundary to end of route for loops (start === end latlng)', () => {
    const loopBoundaries = [START, MID, { ...START, label: 'Start (return)' }]
    const result = computeSegmentStats(COORDS, 3600, loopBoundaries)
    expect(result).toHaveLength(2)
    // Second segment should cover the rest of the route (not zero length)
    expect(result[1].distanceM).toBeGreaterThan(0)
  })
})
