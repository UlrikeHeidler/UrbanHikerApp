import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRoute, fetchLoopRoute, fetchSubRoute } from './routing'

const START = { lat: 52.52, lng: 13.405 }
const END   = { lat: 52.53, lng: 13.42  }

/** Minimal valid ORS GeoJSON response */
function makeOrsResponse({ distance = 1500, duration = 1080, ascent = 20, descent = 15 } = {}) {
  return {
    features: [{
      geometry: {
        coordinates: [
          [13.405, 52.52, 34],
          [13.41,  52.525, 36],
          [13.42,  52.53, 35],
        ],
      },
      properties: {
        summary: { distance, duration },
        ascent,
        descent,
      },
    }],
  }
}

function mockFetch(status, body) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

function setApiKey(value) {
  vi.stubEnv('VITE_ORS_API_KEY', value)
}

// ---------------------------------------------------------------------------
// fetchRoute — unit
// ---------------------------------------------------------------------------

describe('fetchRoute — unit', () => {
  beforeEach(() => { setApiKey('test-api-key') })

  it('throws when VITE_ORS_API_KEY is not set', async () => {
    setApiKey(undefined)
    await expect(fetchRoute(START, END)).rejects.toThrow('No ORS API key found')
  })

  it('sends coordinates as [lng, lat] to the ORS API', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.coordinates[0]).toEqual([START.lng, START.lat])
    expect(body.coordinates[1]).toEqual([END.lng, END.lat])
  })

  it('uses the foot-walking profile URL', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END)
    expect(fetch.mock.calls[0][0]).toContain('foot-walking')
  })

  it('requests alternative routes when there are no waypoints', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.alternative_routes).toBeDefined()
    expect(body.alternative_routes.target_count).toBeGreaterThan(1)
  })

  it('omits alternative_routes when waypoints are present', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END, { waypoints: [{ lat: 52.525, lng: 13.41 }] })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.alternative_routes).toBeUndefined()
  })

  it('returns an array of RouteResults', async () => {
    mockFetch(200, makeOrsResponse())
    const results = await fetchRoute(START, END)
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns all features when ORS provides multiple alternatives', async () => {
    const multi = {
      features: [
        makeOrsResponse({ distance: 1500 }).features[0],
        makeOrsResponse({ distance: 1800 }).features[0],
      ],
    }
    mockFetch(200, multi)
    const results = await fetchRoute(START, END)
    expect(results).toHaveLength(2)
    expect(results[1].info.distance).toBe(1800)
  })

  it('converts ORS [lng, lat] coordinates to [lat, lng] for Leaflet', async () => {
    mockFetch(200, makeOrsResponse())
    const [result] = await fetchRoute(START, END)
    expect(result.coordinates[0]).toEqual([52.52, 13.405])
  })

  it('includes an elevationProfile array in the result', async () => {
    mockFetch(200, makeOrsResponse())
    const [result] = await fetchRoute(START, END)
    expect(Array.isArray(result.elevationProfile)).toBe(true)
    expect(result.elevationProfile.length).toBe(3)
    expect(result.elevationProfile[0]).toMatchObject({ distanceM: 0, elevationM: 34 })
  })

  it('returns correct distance and duration', async () => {
    mockFetch(200, makeOrsResponse({ distance: 2000, duration: 1440 }))
    const [result] = await fetchRoute(START, END)
    expect(result.info.distance).toBe(2000)
    expect(result.info.duration).toBe(1440)
  })

  it('returns ascent and descent when present', async () => {
    mockFetch(200, makeOrsResponse({ ascent: 30, descent: 25 }))
    const [result] = await fetchRoute(START, END)
    expect(result.info.ascent).toBe(30)
    expect(result.info.descent).toBe(25)
  })

  it('returns null for ascent/descent when absent', async () => {
    const response = makeOrsResponse()
    delete response.features[0].properties.ascent
    delete response.features[0].properties.descent
    mockFetch(200, response)
    const [result] = await fetchRoute(START, END)
    expect(result.info.ascent).toBeNull()
    expect(result.info.descent).toBeNull()
  })

  it('inserts waypoints between start and end in the coordinates array', async () => {
    mockFetch(200, makeOrsResponse())
    const wp = { lat: 52.525, lng: 13.41 }
    await fetchRoute(START, END, { waypoints: [wp] })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.coordinates).toHaveLength(3)
    expect(body.coordinates[1]).toEqual([wp.lng, wp.lat])
  })

  it('nests profile_params inside options (not top-level) for A-to-B routes', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END, { preferences: { green: 0.5 } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.profile_params).toBeUndefined()
    expect(body.options.profile_params.weightings.green).toBe(0.5)
  })

  it('includes quiet weighting inside options.profile_params', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END, { preferences: { quiet: 0.3 } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.profile_params.weightings.quiet).toBe(0.3)
  })

  it('omits options entirely when no preferences are set', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END, {})
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options).toBeUndefined()
  })

  it('omits options when preferences are all zero', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END, { preferences: { green: 0, quiet: 0 } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options).toBeUndefined()
  })

  it('always requests waytype extras', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.extra_info).toContain('waytype')
  })

  it('populates wayTypes array on the result (all-zero when extras absent)', async () => {
    mockFetch(200, makeOrsResponse())
    const [result] = await fetchRoute(START, END)
    expect(Array.isArray(result.wayTypes)).toBe(true)
    expect(result.wayTypes).toHaveLength(result.coordinates.length)
  })

  it('expands sparse waytype values into per-coordinate array', async () => {
    const response = makeOrsResponse()
    response.features[0].properties.extras = {
      waytype: { values: [[0, 2, 1], [2, 3, 3]] },
    }
    mockFetch(200, response)
    const [result] = await fetchRoute(START, END)
    // 3 coords total; first 2 = waytype 1, last = waytype 3
    expect(result.wayTypes).toEqual([1, 1, 3])
  })

  it('throws with the ORS error message on API error', async () => {
    mockFetch(403, { error: { message: 'Invalid API key' } })
    await expect(fetchRoute(START, END)).rejects.toThrow('Invalid API key')
  })

  it('throws a generic message when the error body is not parseable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 503,
      json: () => Promise.reject(new Error('not json')),
    })
    await expect(fetchRoute(START, END)).rejects.toThrow('Routing failed (503)')
  })

  it('throws on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'))
    await expect(fetchRoute(START, END)).rejects.toThrow('Network offline')
  })
})

// ---------------------------------------------------------------------------
// fetchRoute — security
// ---------------------------------------------------------------------------

describe('fetchRoute — security', () => {
  beforeEach(() => { setApiKey('test-api-key') })

  it('sends the API key in Authorization header, not the URL', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchRoute(START, END)
    const [url, opts] = fetch.mock.calls[0]
    expect(opts.headers['Authorization']).toBe('test-api-key')
    expect(url).not.toContain('test-api-key')
  })

  it('does not expose the API key in error messages', async () => {
    mockFetch(401, { error: { message: 'Unauthorized' } })
    await expect(fetchRoute(START, END)).rejects.not.toThrow('test-api-key')
  })

  it('handles NaN coordinates without crashing', async () => {
    mockFetch(400, { error: { message: 'Invalid coordinates' } })
    await expect(fetchRoute({ lat: NaN, lng: NaN }, END)).rejects.toThrow()
  })

  it('does not mutate the input start/end objects', async () => {
    mockFetch(200, makeOrsResponse())
    const startCopy = { ...START }
    await fetchRoute(START, END)
    expect(START).toEqual(startCopy)
  })
})

// ---------------------------------------------------------------------------
// fetchLoopRoute — unit
// ---------------------------------------------------------------------------

describe('fetchLoopRoute — unit', () => {
  beforeEach(() => { setApiKey('test-api-key') })

  it('throws when VITE_ORS_API_KEY is not set', async () => {
    setApiKey(undefined)
    await expect(fetchLoopRoute(START, 3000)).rejects.toThrow('No ORS API key found')
  })

  it('sends only the start coordinate (single point for round-trip)', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.coordinates).toHaveLength(1)
    expect(body.coordinates[0]).toEqual([START.lng, START.lat])
  })

  it('sends the requested distance in the round_trip options', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 5000)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.round_trip.length).toBe(5000)
  })

  it('uses seed 0 by default', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.round_trip.seed).toBe(0)
  })

  it('passes a custom seed when provided', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000, 7)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.round_trip.seed).toBe(7)
  })

  it('returns a parsed RouteResult on success', async () => {
    mockFetch(200, makeOrsResponse({ distance: 3000, duration: 2160 }))
    const result = await fetchLoopRoute(START, 3000)
    expect(result.coordinates.length).toBeGreaterThan(0)
    expect(result.info.distance).toBe(3000)
    expect(result.info.duration).toBe(2160)
  })

  it('throws with the ORS error message on failure', async () => {
    mockFetch(400, { error: { message: 'Loop distance too short' } })
    await expect(fetchLoopRoute(START, 100)).rejects.toThrow('Loop distance too short')
  })

  it('nests profile_params inside options (not at top level) for loop routes', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000, 0, { preferences: { green: 0.6 } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.profile_params).toBeUndefined()
    expect(body.options.profile_params.weightings.green).toBe(0.6)
  })

  it('omits profile_params entirely from options when preferences are zero', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000, 0, { preferences: { green: 0, quiet: 0 } })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.profile_params).toBeUndefined()
  })

  it('always requests waytype extras', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.extra_info).toContain('waytype')
  })
})

// ---------------------------------------------------------------------------
// fetchLoopRoute — security
// ---------------------------------------------------------------------------

describe('fetchLoopRoute — security', () => {
  beforeEach(() => { setApiKey('test-api-key') })

  it('sends the API key in Authorization header, not the URL', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchLoopRoute(START, 3000)
    const [url, opts] = fetch.mock.calls[0]
    expect(opts.headers['Authorization']).toBe('test-api-key')
    expect(url).not.toContain('test-api-key')
  })

  it('does not mutate the input start object', async () => {
    mockFetch(200, makeOrsResponse())
    const startCopy = { ...START }
    await fetchLoopRoute(START, 3000)
    expect(START).toEqual(startCopy)
  })
})

// ---------------------------------------------------------------------------
// fetchSubRoute — unit
// ---------------------------------------------------------------------------

describe('fetchSubRoute — unit', () => {
  beforeEach(() => { setApiKey('test-api-key') })

  it('sends avoid_features: ["highways"] in the options body', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchSubRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.options.avoid_features).toEqual(['highways'])
  })

  it('does not request alternative routes (single best path)', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchSubRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.alternative_routes).toBeUndefined()
  })

  it('requests waytype extras', async () => {
    mockFetch(200, makeOrsResponse())
    await fetchSubRoute(START, END)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.extra_info).toContain('waytype')
  })

  it('returns a single RouteResult', async () => {
    mockFetch(200, makeOrsResponse())
    const result = await fetchSubRoute(START, END)
    expect(result.coordinates.length).toBeGreaterThan(0)
    expect(result.info.distance).toBeDefined()
  })

  it('throws when ORS cannot find a highway-free path', async () => {
    mockFetch(404, { error: { message: 'Unable to find a route' } })
    await expect(fetchSubRoute(START, END)).rejects.toThrow('Unable to find a route')
  })
})
