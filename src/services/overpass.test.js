import { describe, it, expect, vi } from 'vitest'
import { fetchPois } from './overpass'

const BBOX = { minLat: 38.86, minLng: -77.24, maxLat: 38.90, maxLng: -77.20 }

function mockFetch(status, body) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

const SAMPLE_ELEMENTS = [
  { id: 1, lat: 38.87, lon: -77.23, tags: { amenity: 'bench' } },
  { id: 2, lat: 38.88, lon: -77.22, tags: { amenity: 'drinking_water', name: 'Fountain' } },
  { id: 3, lat: 38.89, lon: -77.21, tags: { tourism: 'viewpoint', name: 'Hill View' } },
  { id: 4, lat: 38.86, lon: -77.24, tags: { amenity: 'unknown_type' } },
]

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('fetchPois — unit', () => {
  it('returns an empty object when types array is empty (no fetch made)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchPois(BBOX, [])
    expect(result).toEqual({ bench: [], water: [], viewpoint: [] })
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns categorised results for all three types', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bench', 'water', 'viewpoint'])
    expect(result.bench).toHaveLength(1)
    expect(result.water).toHaveLength(1)
    expect(result.viewpoint).toHaveLength(1)
  })

  it('includes the name tag when present', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['water'])
    expect(result.water[0].name).toBe('Fountain')
  })

  it('sets name to undefined when the name tag is absent', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bench'])
    expect(result.bench[0].name).toBeUndefined()
  })

  it('ignores elements with unrecognised tags', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bench', 'water', 'viewpoint'])
    const total = result.bench.length + result.water.length + result.viewpoint.length
    expect(total).toBe(3) // element 4 (unknown_type) is ignored
  })

  it('sends the bbox coordinates in the Overpass query body', async () => {
    mockFetch(200, { elements: [] })
    await fetchPois(BBOX, ['bench'])
    const body = decodeURIComponent(fetch.mock.calls[0][1].body)
    expect(body).toContain('38.86')
    expect(body).toContain('-77.24')
  })

  it('handles an empty elements array from Overpass', async () => {
    mockFetch(200, { elements: [] })
    const result = await fetchPois(BBOX, ['bench', 'water'])
    expect(result.bench).toEqual([])
    expect(result.water).toEqual([])
  })

  it('handles a missing elements key in the response', async () => {
    mockFetch(200, {})
    const result = await fetchPois(BBOX, ['bench'])
    expect(result.bench).toEqual([])
  })

  it('throws on non-200 response', async () => {
    mockFetch(429, {})
    await expect(fetchPois(BBOX, ['bench'])).rejects.toThrow('POI fetch failed (429)')
  })

  it('throws on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'))
    await expect(fetchPois(BBOX, ['bench'])).rejects.toThrow('Offline')
  })
})

// ---------------------------------------------------------------------------
// Security tests
// ---------------------------------------------------------------------------

describe('fetchPois — security', () => {
  it('URL-encodes the query so tag values cannot break the POST body', async () => {
    mockFetch(200, { elements: [] })
    await fetchPois(BBOX, ['bench'])
    const rawBody = fetch.mock.calls[0][1].body
    // The data= prefix should be there; the query itself must be percent-encoded
    expect(rawBody.startsWith('data=')).toBe(true)
    expect(rawBody).not.toContain('[out:json]') // must be encoded, not raw
  })

  it('does not execute name tag values as code', async () => {
    mockFetch(200, { elements: [
      { id: 1, lat: 38.87, lon: -77.23, tags: { amenity: 'bench', name: '<script>alert(1)</script>' } },
    ]})
    const result = await fetchPois(BBOX, ['bench'])
    expect(result.bench[0].name).toBe('<script>alert(1)</script>')
  })
})
