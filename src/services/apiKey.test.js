import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from './apiKey'

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllEnvs()
})

// ---------------------------------------------------------------------------
// getApiKey — unit
// ---------------------------------------------------------------------------

describe('getApiKey — unit', () => {
  it('returns the localStorage key when set', () => {
    localStorage.setItem('ors_api_key', 'local-key-123')
    expect(getApiKey()).toBe('local-key-123')
  })

  it('falls back to the env variable when localStorage is empty', () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'env-key-456')
    expect(getApiKey()).toBe('env-key-456')
  })

  it('prefers localStorage over the env variable', () => {
    localStorage.setItem('ors_api_key', 'local-wins')
    vi.stubEnv('VITE_ORS_API_KEY', 'env-loses')
    expect(getApiKey()).toBe('local-wins')
  })

  it('throws when neither localStorage nor env is set', () => {
    vi.stubEnv('VITE_ORS_API_KEY', undefined)
    expect(() => getApiKey()).toThrow('No ORS API key found')
  })
})

// ---------------------------------------------------------------------------
// setApiKey — unit
// ---------------------------------------------------------------------------

describe('setApiKey — unit', () => {
  it('stores the key in localStorage', () => {
    setApiKey('my-key')
    expect(localStorage.getItem('ors_api_key')).toBe('my-key')
  })

  it('trims whitespace before storing', () => {
    setApiKey('  trimmed  ')
    expect(localStorage.getItem('ors_api_key')).toBe('trimmed')
  })

  it('throws on empty string', () => {
    expect(() => setApiKey('')).toThrow('API key must not be empty')
  })

  it('throws on whitespace-only string', () => {
    expect(() => setApiKey('   ')).toThrow('API key must not be empty')
  })
})

// ---------------------------------------------------------------------------
// clearApiKey — unit
// ---------------------------------------------------------------------------

describe('clearApiKey — unit', () => {
  it('removes the key from localStorage', () => {
    localStorage.setItem('ors_api_key', 'to-be-removed')
    clearApiKey()
    expect(localStorage.getItem('ors_api_key')).toBeNull()
  })

  it('is a no-op when no key is stored', () => {
    expect(() => clearApiKey()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// hasApiKey — unit
// ---------------------------------------------------------------------------

describe('hasApiKey — unit', () => {
  it('returns true when key is in localStorage', () => {
    localStorage.setItem('ors_api_key', 'present')
    expect(hasApiKey()).toBe(true)
  })

  it('returns true when key is only in env', () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'env-present')
    expect(hasApiKey()).toBe(true)
  })

  it('returns false when neither source has a key', () => {
    vi.stubEnv('VITE_ORS_API_KEY', undefined)
    expect(hasApiKey()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

describe('apiKey — security', () => {
  it('does not log or expose the key in thrown error messages', () => {
    vi.stubEnv('VITE_ORS_API_KEY', undefined)
    let message = ''
    try { getApiKey() } catch (e) { message = e.message }
    expect(message).not.toContain('secret')
    expect(message.length).toBeLessThan(200)
  })

  it('setApiKey does not store keys that are only whitespace', () => {
    expect(() => setApiKey('\t\n ')).toThrow()
    expect(localStorage.getItem('ors_api_key')).toBeNull()
  })

  it('clearApiKey does not affect other localStorage entries', () => {
    localStorage.setItem('ors_api_key', 'key')
    localStorage.setItem('saved_routes', '[{"id":1}]')
    clearApiKey()
    expect(localStorage.getItem('saved_routes')).toBe('[{"id":1}]')
  })
})
