import { describe, it, expect } from 'vitest'
import { formatDuration, formatDistance, minutesToMeters } from './formatters'

describe('formatDuration', () => {
  it('formats sub-hour durations as minutes', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(60)).toBe('1 min')
    expect(formatDuration(1380)).toBe('23 min')
    expect(formatDuration(3540)).toBe('59 min')
  })

  it('formats durations of exactly one hour', () => {
    expect(formatDuration(3600)).toBe('1h 0min')
  })

  it('formats durations over one hour with hours and minutes', () => {
    expect(formatDuration(3660)).toBe('1h 1min')
    expect(formatDuration(5400)).toBe('1h 30min')
    expect(formatDuration(7200)).toBe('2h 0min')
  })
})

describe('formatDistance', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(500)).toBe('500 m')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('formats distances of exactly 1 km', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
  })

  it('formats distances over 1 km with two decimal places', () => {
    expect(formatDistance(1500)).toBe('1.50 km')
    expect(formatDistance(2345)).toBe('2.35 km')
    expect(formatDistance(10000)).toBe('10.00 km')
  })

  it('rounds sub-kilometre values to the nearest metre', () => {
    expect(formatDistance(850.6)).toBe('851 m')
  })
})

describe('minutesToMeters', () => {
  it('converts 60 minutes to 5000 m (5 km/h)', () => {
    expect(minutesToMeters(60)).toBe(5000)
  })

  it('converts 30 minutes to 2500 m', () => {
    expect(minutesToMeters(30)).toBe(2500)
  })

  it('converts 45 minutes to 3750 m', () => {
    expect(minutesToMeters(45)).toBe(3750)
  })

  it('returns 0 for 0 minutes', () => {
    expect(minutesToMeters(0)).toBe(0)
  })

  it('handles non-integer minute values', () => {
    // 1.5 min * 60s * (5000/3600 m/s) = 125 m
    expect(minutesToMeters(1.5)).toBe(125)
  })
})
