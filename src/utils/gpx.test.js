import { describe, it, expect } from 'vitest'
import { buildGpx, escapeXml } from './gpx'

const COORDS = [[38.87, -77.23], [38.88, -77.22], [38.89, -77.21]]

// ---------------------------------------------------------------------------
// buildGpx
// ---------------------------------------------------------------------------

describe('buildGpx', () => {
  it('produces a valid GPX 1.1 XML header', () => {
    const gpx = buildGpx(COORDS, 'Test Route')
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(gpx).toContain('version="1.1"')
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"')
  })

  it('embeds the track name', () => {
    const gpx = buildGpx(COORDS, 'Morning Walk')
    expect(gpx).toContain('<name>Morning Walk</name>')
  })

  it('outputs one trkpt per coordinate pair', () => {
    const gpx = buildGpx(COORDS, 'Test')
    const matches = gpx.match(/<trkpt /g)
    expect(matches).toHaveLength(3)
  })

  it('places lat on the trkpt element, not lon', () => {
    const gpx = buildGpx([[38.87, -77.23]], 'Test')
    expect(gpx).toContain('lat="38.87"')
    expect(gpx).toContain('lon="-77.23"')
  })

  it('wraps points inside a trkseg', () => {
    const gpx = buildGpx(COORDS, 'Test')
    expect(gpx).toContain('<trkseg>')
    expect(gpx).toContain('</trkseg>')
  })

  it('handles an empty coordinate array without throwing', () => {
    expect(() => buildGpx([], 'Empty')).not.toThrow()
    const gpx = buildGpx([], 'Empty')
    expect(gpx).toContain('<trkseg>')
  })
})

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------

describe('escapeXml', () => {
  it('escapes ampersands', () => {
    expect(escapeXml('A & B')).toBe('A &amp; B')
  })

  it('escapes less-than and greater-than', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('coerces non-string input to string', () => {
    expect(escapeXml(42)).toBe('42')
    expect(escapeXml(null)).toBe('null')
  })
})

// ---------------------------------------------------------------------------
// Security tests
// ---------------------------------------------------------------------------

describe('buildGpx — security', () => {
  it('escapes a script-injection attempt in the track name', () => {
    const gpx = buildGpx(COORDS, '<script>alert(1)</script>')
    expect(gpx).not.toContain('<script>')
    expect(gpx).toContain('&lt;script&gt;')
  })

  it('escapes XML injection in the track name', () => {
    const gpx = buildGpx(COORDS, '"></trk><evil/><trk name="')
    expect(gpx).not.toContain('<evil/>')
  })

  it('coordinate values are placed in attributes as-is (numbers, not strings)', () => {
    const gpx = buildGpx([[38.87, -77.23]], 'Test')
    // lat/lon values must not contain injected quotes
    expect(gpx).toContain('lat="38.87"')
    expect(gpx).toContain('lon="-77.23"')
  })
})
