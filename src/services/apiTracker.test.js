import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use a vi.fn so individual tests can override the return value
vi.mock('./settings', () => ({
  getAppDefaults: vi.fn(() => ({ apiTrackingEnabled: true })),
}))

import { recordCall, getCallLog, clearCallLog, DAILY_LIMITS, ENDPOINT_COLORS, ENDPOINT_LABELS } from './apiTracker'
import { getAppDefaults } from './settings'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('getCallLog', () => {
  it('returns empty array when nothing stored', () => {
    expect(getCallLog()).toEqual([])
  })

  it('returns empty array for corrupt data', () => {
    localStorage.setItem('urban-hiker-api-log', 'not-json')
    expect(getCallLog()).toEqual([])
  })

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('urban-hiker-api-log', JSON.stringify({ ors: 1 }))
    expect(getCallLog()).toEqual([])
  })

  it('prunes entries older than 7 days on read', () => {
    const old = { ts: Date.now() - SEVEN_DAYS_MS - 1000, endpoint: 'ors', success: true }
    const fresh = { ts: Date.now() - 1000, endpoint: 'ors', success: true }
    localStorage.setItem('urban-hiker-api-log', JSON.stringify([old, fresh]))
    const log = getCallLog()
    expect(log).toHaveLength(1)
    expect(log[0].ts).toBe(fresh.ts)
  })
})

describe('recordCall', () => {
  it('writes a record with correct shape', () => {
    recordCall('ors', true)
    const log = getCallLog()
    expect(log).toHaveLength(1)
    expect(log[0].endpoint).toBe('ors')
    expect(log[0].success).toBe(true)
    expect(typeof log[0].ts).toBe('number')
  })

  it('appends multiple records', () => {
    recordCall('ors', true)
    recordCall('nominatim', false)
    recordCall('overpass', true)
    expect(getCallLog()).toHaveLength(3)
  })

  it('records failure correctly', () => {
    recordCall('overpass', false)
    const log = getCallLog()
    expect(log[0].success).toBe(false)
    expect(log[0].endpoint).toBe('overpass')
  })

  it('is a no-op when tracking disabled', () => {
    vi.mocked(getAppDefaults).mockReturnValueOnce({ apiTrackingEnabled: false })
    recordCall('ors', true)
    expect(getCallLog()).toHaveLength(0)
  })

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => recordCall('ors', true)).not.toThrow()
  })

  it('prunes entries older than 7 days on write', () => {
    const old = { ts: Date.now() - SEVEN_DAYS_MS - 1000, endpoint: 'ors', success: true }
    localStorage.setItem('urban-hiker-api-log', JSON.stringify([old]))
    recordCall('ors', false)
    const log = getCallLog()
    expect(log).toHaveLength(1)
    expect(log[0].endpoint).toBe('ors')
    expect(log[0].success).toBe(false)
  })
})

describe('clearCallLog', () => {
  it('removes all records', () => {
    recordCall('ors', true)
    recordCall('nominatim', true)
    clearCallLog()
    expect(getCallLog()).toHaveLength(0)
  })

  it('does not throw when storage is already empty', () => {
    expect(() => clearCallLog()).not.toThrow()
  })
})

describe('constants', () => {
  it('DAILY_LIMITS contains ors, nominatim, overpass', () => {
    expect(DAILY_LIMITS.ors).toBe(2000)
    expect(DAILY_LIMITS.nominatim).toBe(500)
    expect(DAILY_LIMITS.overpass).toBe(10000)
  })

  it('ENDPOINT_COLORS has valid hex values', () => {
    for (const color of Object.values(ENDPOINT_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('ENDPOINT_LABELS has non-empty strings', () => {
    for (const label of Object.values(ENDPOINT_LABELS)) {
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
