import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchPois, fetchStopRoutes, fetchTransitRoutes } from './overpass'

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
  { id: 5, lat: 38.87, lon: -77.23, tags: { highway: 'bus_stop', name: 'Main St', route_ref: '10;42', ref: 'MS1' } },
  { id: 6, lat: 38.88, lon: -77.22, tags: { railway: 'tram_stop', name: 'Central' } },
  { id: 7, lat: 38.89, lon: -77.21, tags: { railway: 'station', subway: 'yes', name: 'City Hall' } },
]

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('fetchPois — unit', () => {
  it('returns an empty object when types array is empty (no fetch made)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchPois(BBOX, [])
    expect(result).toEqual({ bench: [], water: [], viewpoint: [], bus_stop: [], tram_stop: [], subway: [] })
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
    expect(total).toBe(3) // element 4 (unknown_type) is ignored; transit elements not in requested types
  })

  it('categorises bus stops correctly', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bus_stop'])
    expect(result.bus_stop).toHaveLength(1)
    expect(result.bus_stop[0].name).toBe('Main St')
  })

  it('categorises tram stops correctly', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['tram_stop'])
    expect(result.tram_stop).toHaveLength(1)
    expect(result.tram_stop[0].name).toBe('Central')
  })

  it('categorises subway stations correctly', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['subway'])
    expect(result.subway).toHaveLength(1)
    expect(result.subway[0].name).toBe('City Hall')
  })

  it('does not include transit POIs when not requested', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bench'])
    expect(result.bus_stop).toBeUndefined()
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
    await expect(fetchPois(BBOX, ['bench'])).rejects.toThrow('rate limit')
  })

  it('throws on network failure after retry', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'))
    await expect(fetchPois(BBOX, ['bench'])).rejects.toThrow('Could not reach Overpass')
  })

  it('stores route_ref and ref tags on transit stop nodes', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['bus_stop'])
    expect(result.bus_stop[0].routeRef).toBe('10;42')
    expect(result.bus_stop[0].stopRef).toBe('MS1')
  })

  it('leaves routeRef and stopRef undefined when tags are absent', async () => {
    mockFetch(200, { elements: SAMPLE_ELEMENTS })
    const result = await fetchPois(BBOX, ['tram_stop'])
    expect(result.tram_stop[0].routeRef).toBeUndefined()
    expect(result.tram_stop[0].stopRef).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// fetchStopRoutes — unit tests
// ---------------------------------------------------------------------------

describe('fetchStopRoutes — unit', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns sorted route refs from relation tags', async () => {
    mockFetch(200, {
      elements: [
        { type: 'relation', id: 1, tags: { route: 'bus', ref: '42' } },
        { type: 'relation', id: 2, tags: { route: 'bus', ref: '10' } },
      ],
    })
    const result = await fetchStopRoutes(999)
    expect(result).toEqual(['10', '42'])
  })

  it('falls back to name when ref tag is absent', async () => {
    mockFetch(200, {
      elements: [{ type: 'relation', id: 1, tags: { route: 'bus', name: 'Night Bus' } }],
    })
    const result = await fetchStopRoutes(999)
    expect(result).toEqual(['Night Bus'])
  })

  it('returns empty array when no route relations found', async () => {
    mockFetch(200, { elements: [] })
    const result = await fetchStopRoutes(999)
    expect(result).toEqual([])
  })

  it('throws on non-200 response', async () => {
    mockFetch(429, {})
    await expect(fetchStopRoutes(999)).rejects.toThrow('rate limit')
  })

  it('includes the node id in the query body', async () => {
    mockFetch(200, { elements: [] })
    await fetchStopRoutes(12345)
    const body = decodeURIComponent(fetch.mock.calls[0][1].body)
    expect(body).toContain('node(12345)')
  })
})

// ---------------------------------------------------------------------------
// fetchStopRoutes — security tests
// ---------------------------------------------------------------------------

describe('fetchStopRoutes — security', () => {
  afterEach(() => vi.restoreAllMocks())

  it('throws on nodeId of zero', async () => {
    await expect(fetchStopRoutes(0)).rejects.toThrow('Invalid node id')
  })

  it('throws on negative nodeId', async () => {
    await expect(fetchStopRoutes(-5)).rejects.toThrow('Invalid node id')
  })

  it('throws on float nodeId', async () => {
    await expect(fetchStopRoutes(1.5)).rejects.toThrow('Invalid node id')
  })

  it('throws on string nodeId', async () => {
    await expect(fetchStopRoutes('999')).rejects.toThrow('Invalid node id')
  })

  it('throws on null nodeId', async () => {
    await expect(fetchStopRoutes(null)).rejects.toThrow('Invalid node id')
  })
})

// ---------------------------------------------------------------------------
// fetchTransitRoutes — unit tests
// ---------------------------------------------------------------------------

const TRANSIT_ELEMENTS = [
  {
    type: 'relation', id: 101,
    tags: { route: 'bus', ref: '42', name: 'Bus 42' },
    members: [
      { type: 'way', ref: 1, role: '', geometry: [{ lat: 38.87, lon: -77.23 }, { lat: 38.88, lon: -77.22 }] },
      { type: 'node', ref: 2, role: 'stop' },
    ],
  },
  {
    type: 'relation', id: 102,
    tags: { route: 'tram', ref: 'T1' },
    members: [
      { type: 'way', ref: 3, role: '', geometry: [{ lat: 38.86, lon: -77.24 }, { lat: 38.87, lon: -77.23 }] },
    ],
  },
  {
    type: 'relation', id: 103,
    tags: { route: 'ferry' },           // unsupported type — must be ignored
    members: [
      { type: 'way', ref: 4, role: '', geometry: [{ lat: 38.85, lon: -77.25 }, { lat: 38.86, lon: -77.24 }] },
    ],
  },
  {
    type: 'node', id: 999,              // non-relation element — must be ignored
    tags: { route: 'bus' },
    members: [],
  },
]

describe('fetchTransitRoutes — unit', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns one entry per supported route relation', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    expect(result).toHaveLength(2)
  })

  it('maps route type to the correct color', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    const bus = result.find((r) => r.type === 'bus')
    const tram = result.find((r) => r.type === 'tram')
    expect(bus.color).toBe('#f97316')
    expect(tram.color).toBe('#0d9488')
  })

  it('extracts ref and name tags correctly', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    const bus = result.find((r) => r.type === 'bus')
    expect(bus.ref).toBe('42')
    expect(bus.name).toBe('Bus 42')
  })

  it('falls back to ref when name tag is absent', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    const tram = result.find((r) => r.type === 'tram')
    expect(tram.name).toBe('T1')
  })

  it('converts member geometry to [lat, lng] pairs', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    const bus = result.find((r) => r.type === 'bus')
    expect(bus.ways).toHaveLength(1)
    expect(bus.ways[0][0]).toEqual([38.87, -77.23])
  })

  it('ignores members without geometry', async () => {
    mockFetch(200, {
      elements: [{
        type: 'relation', id: 200,
        tags: { route: 'bus', ref: '99' },
        members: [
          { type: 'way', ref: 5, role: '' },           // no geometry property
          { type: 'node', ref: 6, role: 'stop' },
        ],
      }],
    })
    const result = await fetchTransitRoutes(BBOX)
    expect(result).toHaveLength(0)
  })

  it('ignores unsupported route types (ferry)', async () => {
    mockFetch(200, { elements: TRANSIT_ELEMENTS })
    const result = await fetchTransitRoutes(BBOX)
    expect(result.find((r) => r.type === 'ferry')).toBeUndefined()
  })

  it('returns empty array when elements is missing', async () => {
    mockFetch(200, {})
    const result = await fetchTransitRoutes(BBOX)
    expect(result).toEqual([])
  })

  it('throws on non-200 response', async () => {
    mockFetch(500, {})
    await expect(fetchTransitRoutes(BBOX)).rejects.toThrow('Overpass request failed (500)')
  })

  it('sends bbox coordinates in the Overpass query body', async () => {
    mockFetch(200, { elements: [] })
    await fetchTransitRoutes(BBOX)
    const body = decodeURIComponent(fetch.mock.calls[0][1].body)
    expect(body).toContain('38.86')
    expect(body).toContain('-77.24')
  })
})

describe('fetchTransitRoutes — security', () => {
  afterEach(() => vi.restoreAllMocks())

  it('URL-encodes the query body', async () => {
    mockFetch(200, { elements: [] })
    await fetchTransitRoutes(BBOX)
    const rawBody = fetch.mock.calls[0][1].body
    expect(rawBody.startsWith('data=')).toBe(true)
    expect(rawBody).not.toContain('[out:json]')
  })

  it('does not execute route name values as code', async () => {
    mockFetch(200, {
      elements: [{
        type: 'relation', id: 300,
        tags: { route: 'bus', ref: '<script>x</script>', name: '<script>x</script>' },
        members: [
          { type: 'way', ref: 7, role: '', geometry: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] },
        ],
      }],
    })
    const result = await fetchTransitRoutes(BBOX)
    expect(result[0].ref).toBe('<script>x</script>')
    expect(result[0].name).toBe('<script>x</script>')
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
