import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchAddress, reverseGeocode, formatReverseResult } from './geocoding'

/** Minimal Nominatim response shape used across tests */
const MOCK_RESULTS = [
  { place_id: '1', display_name: 'Berlin, Germany', lat: '52.52', lon: '13.405' },
  { place_id: '2', display_name: 'Berlin, NH, USA',  lat: '44.46', lon: '-71.18' },
]

function mockFetch(status, body) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('searchAddress — unit', () => {
  it('returns an empty array for a falsy query', async () => {
    expect(await searchAddress('')).toEqual([])
    expect(await searchAddress(null)).toEqual([])
    expect(await searchAddress(undefined)).toEqual([])
  })

  it('returns an empty array for a non-string query', async () => {
    expect(await searchAddress(42)).toEqual([])
  })

  it('calls Nominatim with the correct URL and headers', async () => {
    mockFetch(200, MOCK_RESULTS)
    await searchAddress('Berlin')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('nominatim.openstreetmap.org/search')
    expect(url).toContain('q=Berlin')
    expect(url).toContain('format=json')
    expect(url).toContain('limit=5')
    expect(opts.headers['User-Agent']).toBe('UrbanHikingApp/1.0')
  })

  it('trims whitespace before sending the query', async () => {
    mockFetch(200, MOCK_RESULTS)
    await searchAddress('  Berlin  ')
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('q=Berlin')
    expect(url).not.toContain('q=+Berlin')
  })

  it('returns the parsed JSON array on success', async () => {
    mockFetch(200, MOCK_RESULTS)
    const results = await searchAddress('Berlin')
    expect(results).toHaveLength(2)
    expect(results[0].display_name).toBe('Berlin, Germany')
  })

  it('throws a descriptive error on non-200 response', async () => {
    mockFetch(500, {})
    await expect(searchAddress('Berlin')).rejects.toThrow('Address search failed (500)')
  })

  it('throws when fetch itself rejects (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(searchAddress('Berlin')).rejects.toThrow('Network error')
  })
})

// ---------------------------------------------------------------------------
// Security tests
// ---------------------------------------------------------------------------

describe('searchAddress — security', () => {
  it('does not throw or execute when query contains script injection', async () => {
    mockFetch(200, [])
    // The value must be URL-encoded and treated as plain text, not executed
    const results = await searchAddress('<script>alert(1)</script>')
    expect(results).toEqual([])
    const [url] = fetch.mock.calls[0]
    // Confirm the raw tag is percent-encoded in the URL
    expect(url).toContain('%3Cscript%3E')
    expect(url).not.toContain('<script>')
  })

  it('handles unusually long query strings without throwing', async () => {
    mockFetch(200, [])
    const longQuery = 'A'.repeat(2000)
    await expect(searchAddress(longQuery)).resolves.toEqual([])
  })

  it('does not leak sensitive headers in the request', async () => {
    mockFetch(200, [])
    await searchAddress('test')
    const [, opts] = fetch.mock.calls[0]
    const headerKeys = Object.keys(opts.headers).map((k) => k.toLowerCase())
    expect(headerKeys).not.toContain('authorization')
    expect(headerKeys).not.toContain('cookie')
  })
})

// ---------------------------------------------------------------------------
// formatReverseResult — unit
// ---------------------------------------------------------------------------

describe('formatReverseResult — unit', () => {
  it('prefers amenity name + road', () => {
    const result = formatReverseResult({ address: { amenity: 'Café Central', road: 'Main St' } })
    expect(result).toBe('Café Central, Main St')
  })

  it('includes house number with road', () => {
    const result = formatReverseResult({ address: { road: 'Elm St', house_number: '42' } })
    expect(result).toBe('42 Elm St')
  })

  it('appends area when road is present', () => {
    const result = formatReverseResult({ address: { road: 'Oak Ave', suburb: 'Greenwood' } })
    expect(result).toBe('Oak Ave, Greenwood')
  })

  it('falls back to display_name first segment when address is empty', () => {
    const result = formatReverseResult({ display_name: 'Some Place, City, Country', address: {} })
    expect(result).toBe('Some Place')
  })

  it('returns empty string when data is null', () => {
    expect(formatReverseResult(null)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// reverseGeocode — unit
// ---------------------------------------------------------------------------

describe('reverseGeocode — unit', () => {
  it('calls the Nominatim reverse endpoint with lat/lon params', async () => {
    mockFetch(200, { address: { road: 'Test St' }, display_name: 'Test St, City' })
    await reverseGeocode(52.52, 13.405)
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('nominatim.openstreetmap.org/reverse')
    expect(url).toContain('lat=52.52')
    expect(url).toContain('lon=13.405')
  })

  it('returns a non-empty label on success', async () => {
    mockFetch(200, { address: { road: 'Unter den Linden', suburb: 'Mitte' }, display_name: '' })
    const label = await reverseGeocode(52.52, 13.405)
    expect(label).toBe('Unter den Linden, Mitte')
  })

  it('returns empty string on non-200 response', async () => {
    mockFetch(429, {})
    const label = await reverseGeocode(52.52, 13.405)
    expect(label).toBe('')
  })

  it('returns empty string on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'))
    const label = await reverseGeocode(52.52, 13.405)
    expect(label).toBe('')
  })

  it('returns empty string for NaN coordinates', async () => {
    const label = await reverseGeocode(NaN, 13.405)
    expect(label).toBe('')
  })
})

// ---------------------------------------------------------------------------
// reverseGeocode — security
// ---------------------------------------------------------------------------

describe('reverseGeocode — security', () => {
  it('does not throw when the response contains script tags in display_name', async () => {
    mockFetch(200, { display_name: '<script>alert(1)</script>, City', address: {} })
    const label = await reverseGeocode(52.52, 13.405)
    // Returns the raw string — rendering components are responsible for safe display
    expect(label).toBe('<script>alert(1)</script>')
  })

  it('sends no Authorization header', async () => {
    mockFetch(200, { address: {}, display_name: '' })
    await reverseGeocode(52.52, 13.405)
    const [, opts] = fetch.mock.calls[0]
    expect(Object.keys(opts.headers).map(k => k.toLowerCase())).not.toContain('authorization')
  })
})
