import { describe, it, expect } from 'vitest'
import {
  expandWayTypes,
  findMainRoadSegments,
  spliceSubRoute,
  nearestCoordIndex,
  findLocalSegment,
  MIN_MAIN_ROAD_LENGTH_M,
} from './routeRefine'

// ---------------------------------------------------------------------------
// expandWayTypes
// ---------------------------------------------------------------------------
describe('expandWayTypes', () => {
  it('returns all-zero array when values is empty', () => {
    expect(expandWayTypes([], 4)).toEqual([0, 0, 0, 0])
  })

  it('returns all-zero array when values is not an array', () => {
    expect(expandWayTypes(null, 3)).toEqual([0, 0, 0])
  })

  it('expands a single range correctly', () => {
    // [0, 3, 1] covers indices 0,1,2
    expect(expandWayTypes([[0, 3, 1]], 5)).toEqual([1, 1, 1, 0, 0])
  })

  it('expands multiple non-overlapping ranges', () => {
    expect(expandWayTypes([[0, 2, 1], [2, 4, 7]], 4)).toEqual([1, 1, 7, 7])
  })

  it('clamps end index to coordCount', () => {
    expect(expandWayTypes([[0, 10, 2]], 3)).toEqual([2, 2, 2])
  })
})

// ---------------------------------------------------------------------------
// findMainRoadSegments
// ---------------------------------------------------------------------------

// Build a simple straight line: 5 coords, each ~200m apart along same longitude
const COORD_STEP = 0.0018 // ≈ 200m in latitude
function makeCoords(n) {
  return Array.from({ length: n }, (_, i) => [52.0 + i * COORD_STEP, 13.0])
}

describe('findMainRoadSegments', () => {
  it('returns empty array when no main roads', () => {
    const coords = makeCoords(5)
    const wayTypes = [3, 3, 3, 3, 3] // all street
    expect(findMainRoadSegments(coords, wayTypes)).toEqual([])
  })

  it('returns empty array when main road segment is shorter than minLengthM', () => {
    // Only one coord of main road — zero length segment
    const coords = makeCoords(5)
    const wayTypes = [3, 1, 3, 3, 3]
    expect(findMainRoadSegments(coords, wayTypes, 150)).toEqual([])
  })

  it('returns a segment when main road run exceeds minLengthM', () => {
    // coords[1..3] are main road = 2 steps × ~200m = ~400m > 122m
    const coords = makeCoords(5)
    const wayTypes = [3, 1, 1, 1, 3]
    const segs = findMainRoadSegments(coords, wayTypes, MIN_MAIN_ROAD_LENGTH_M)
    expect(segs).toHaveLength(1)
    expect(segs[0].startIdx).toBe(1)
    expect(segs[0].endIdx).toBe(3)
  })

  it('returns multiple non-contiguous segments', () => {
    // main at 0-1, then quiet, then main at 3-4
    const coords = makeCoords(6)
    const wayTypes = [1, 1, 3, 1, 1, 3]
    const segs = findMainRoadSegments(coords, wayTypes, 100)
    expect(segs).toHaveLength(2)
    expect(segs[0]).toEqual({ startIdx: 0, endIdx: 1 })
    expect(segs[1]).toEqual({ startIdx: 3, endIdx: 4 })
  })

  it('handles main road run ending at the last coordinate', () => {
    const coords = makeCoords(4)
    const wayTypes = [3, 1, 1, 1]
    const segs = findMainRoadSegments(coords, wayTypes, 100)
    expect(segs).toHaveLength(1)
    expect(segs[0].endIdx).toBe(3)
  })

  it('returns empty array for empty inputs', () => {
    expect(findMainRoadSegments([], [], 122)).toEqual([])
    expect(findMainRoadSegments(null, null, 122)).toEqual([])
  })

  it('treats waytype 2 (Road/secondary) as main road', () => {
    const coords = makeCoords(5)
    const wayTypes = [3, 2, 2, 2, 3]
    const segs = findMainRoadSegments(coords, wayTypes, 100)
    expect(segs).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// spliceSubRoute
// ---------------------------------------------------------------------------
describe('spliceSubRoute', () => {
  const main = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]

  it('replaces a middle segment', () => {
    const sub = [[2.1, 0], [2.5, 0], [2.9, 0]]
    const result = spliceSubRoute(main, 1, 3, sub)
    expect(result).toEqual([[1, 0], [2.1, 0], [2.5, 0], [2.9, 0], [5, 0]])
  })

  it('replaces from the start', () => {
    const sub = [[1.5, 0]]
    const result = spliceSubRoute(main, 0, 1, sub)
    expect(result).toEqual([[1.5, 0], [3, 0], [4, 0], [5, 0]])
  })

  it('replaces to the end', () => {
    const sub = [[3.5, 0], [4.5, 0]]
    const result = spliceSubRoute(main, 3, 4, sub)
    expect(result).toEqual([[1, 0], [2, 0], [3, 0], [3.5, 0], [4.5, 0]])
  })

  it('does not mutate the input arrays', () => {
    const mainCopy = main.map((c) => [...c])
    spliceSubRoute(main, 1, 3, [[2.5, 0]])
    expect(main).toEqual(mainCopy)
  })
})

// ---------------------------------------------------------------------------
// nearestCoordIndex
// ---------------------------------------------------------------------------
describe('nearestCoordIndex', () => {
  const coords = [[52.0, 13.0], [52.01, 13.0], [52.02, 13.0]]

  it('returns 0 for a point near the first coord', () => {
    expect(nearestCoordIndex(coords, { lat: 52.0005, lng: 13.0 })).toBe(0)
  })

  it('returns 2 for a point near the last coord', () => {
    expect(nearestCoordIndex(coords, { lat: 52.019, lng: 13.0 })).toBe(2)
  })

  it('returns 1 for a point exactly at the middle coord', () => {
    expect(nearestCoordIndex(coords, { lat: 52.01, lng: 13.0 })).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// findLocalSegment
// ---------------------------------------------------------------------------
describe('findLocalSegment', () => {
  // 10 coords; wayTypes: street at 0, main at 1-6, street at 7-9
  const coords = makeCoords(10)
  const wayTypes = [3, 1, 1, 1, 2, 2, 1, 3, 3, 3]

  it('expands to the full contiguous main-road run from center', () => {
    const seg = findLocalSegment(coords, wayTypes, 3)
    expect(seg.startIdx).toBe(1)
    expect(seg.endIdx).toBe(6)
  })

  it('stops at a non-main-road boundary', () => {
    const seg = findLocalSegment(coords, wayTypes, 5)
    expect(seg.startIdx).toBe(1)
    expect(seg.endIdx).toBe(6)
  })

  it('clamps to start of array', () => {
    const wt = [1, 1, 1, 3, 3, 3, 3, 3, 3, 3]
    const seg = findLocalSegment(coords, wt, 1)
    expect(seg.startIdx).toBe(0)
  })

  it('clamps to end of array', () => {
    const wt = [3, 3, 3, 3, 3, 3, 3, 1, 1, 1]
    const seg = findLocalSegment(coords, wt, 8)
    expect(seg.endIdx).toBe(9)
  })

  it('applies fallback window when clicked on a non-main-road coord', () => {
    // All street — should use fallback ±30 (capped to array bounds)
    const allStreet = new Array(10).fill(3)
    const seg = findLocalSegment(coords, allStreet, 5)
    expect(seg.startIdx).toBeLessThanOrEqual(5)
    expect(seg.endIdx).toBeGreaterThanOrEqual(5)
  })
})
