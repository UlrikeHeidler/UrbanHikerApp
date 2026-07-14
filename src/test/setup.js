// Global test setup — runs before every test file.
// Provides fetch mock reset so tests are isolated.
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})
