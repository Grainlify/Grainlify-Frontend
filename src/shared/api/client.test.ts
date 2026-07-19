/**
 * @file API Client Tests
 * @description Comprehensive tests for the apiRequest helper covering:
 * - Authentication header injection
 * - Content-Type handling (JSON, FormData, GET/HEAD)
 * - Error handling (HTTP errors, network failures)
 * - Token management
 * - Security assertions (no token leaks)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  apiRequest,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  RateLimitError,
  parseRetryAfter,
  DEFAULT_RETRY_AFTER_SECONDS,
  getRetryDelay,
  sleep,
  MAX_RETRY_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
} from './client'
import { API_BASE_URL } from '../config/api'

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn()
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
})

describe('apiRequest - Core Request Helper', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    vi.clearAllMocks()
    mockFetch.mockClear()
    localStorageMock.clear()
    mockDispatchEvent.mockClear()

    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication Headers', () => {
    it('should attach Authorization Bearer header when requiresAuth is true and token exists', async () => {
      const testToken = 'test-jwt-token-123'
      setAuthToken(testToken)

      await apiRequest('/test', { requiresAuth: true })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
          }),
        })
      )
    })

    it('should NOT attach Authorization header when requiresAuth is false', async () => {
      const testToken = 'test-jwt-token-123'
      setAuthToken(testToken)

      await apiRequest('/test', { requiresAuth: false })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers).not.toHaveProperty('Authorization')
    })

    it('should NOT attach Authorization header when requiresAuth is true but no token exists', async () => {
      removeAuthToken()

      await apiRequest('/test', { requiresAuth: true })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers).not.toHaveProperty('Authorization')
    })

    it('should NOT attach Authorization header when requiresAuth is undefined (defaults to false)', async () => {
      const testToken = 'test-jwt-token-123'
      setAuthToken(testToken)

      await apiRequest('/test')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers).not.toHaveProperty('Authorization')
    })
  })

  describe('Content-Type Header Handling', () => {
    it('should set Content-Type: application/json for JSON body', async () => {
      const jsonBody = { name: 'test', value: 123 }

      await apiRequest('/test', {
        method: 'POST',
        body: JSON.stringify(jsonBody),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should NOT set Content-Type for FormData body', async () => {
      const formData = new FormData()
      formData.append('file', 'test-file')
      formData.append('name', 'test')

      await apiRequest('/upload', {
        method: 'POST',
        body: formData,
      })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers).not.toHaveProperty('Content-Type')
    })

    it('should NOT force Content-Type for GET requests', async () => {
      await apiRequest('/test', { method: 'GET' })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      // Should not have Content-Type since no body
      expect(headers['Content-Type']).toBeUndefined()
    })

    it('should NOT force Content-Type for HEAD requests', async () => {
      await apiRequest('/test', { method: 'HEAD' })

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers['Content-Type']).toBeUndefined()
    })

    it('should default to application/json for POST without explicit Content-Type', async () => {
      await apiRequest('/test', {
        method: 'POST',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should default to application/json for PUT without explicit Content-Type', async () => {
      await apiRequest('/test', {
        method: 'PUT',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should default to application/json for DELETE without explicit Content-Type', async () => {
      await apiRequest('/test', {
        method: 'DELETE',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should respect custom Content-Type header when explicitly provided', async () => {
      await apiRequest('/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
          }),
        })
      )
    })
  })

  describe('HTTP Error Handling', () => {
    it('should throw error with message for 401 Unauthorized and clear token', async () => {
      const testToken = 'expired-token'
      setAuthToken(testToken)

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      await expect(apiRequest('/test', { requiresAuth: true })).rejects.toThrow(
        'Authentication failed. Please sign in again.'
      )

      // Verify token was cleared
      expect(getAuthToken()).toBeNull()
    })

    it('should throw error with message for 403 Forbidden with JSON error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Admin access required' }),
      })

      await expect(apiRequest('/admin/test', { requiresAuth: true })).rejects.toThrow(
        'Permission denied: Admin access required. You may need admin privileges to perform this action.'
      )
    })

    it('should throw default error message for 403 when JSON parsing fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(apiRequest('/test')).rejects.toThrow(
        'Permission denied: Access forbidden. You may need admin privileges to perform this action.'
      )
    })

    it('should throw error for 404 Not Found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Resource not found' }),
      })

      await expect(apiRequest('/test')).rejects.toThrow('Resource not found')
    })

    it('should throw error for 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      await expect(apiRequest('/test')).rejects.toThrow('Internal server error')
    })

    it('should throw error with status code when JSON parsing fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(apiRequest('/test')).rejects.toThrow('API request failed with status 400')
    })

    it('should handle error.message field in JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Validation failed' }),
      })

      await expect(apiRequest('/test')).rejects.toThrow('Validation failed')
    })

    it('should handle error.error field in JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request error' }),
      })

      await expect(apiRequest('/test')).rejects.toThrow('Bad request error')
    })

    it('should throw RateLimitError for 429 with numeric Retry-After header', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name === 'Retry-After' ? '30' : null) },
        json: async () => ({ message: 'Too Many Requests' }),
      })

      const error = (await apiRequest('/test').catch((e) => e)) as RateLimitError
      expect(error).toBeInstanceOf(RateLimitError)
      expect((error as RateLimitError).retryAfterSeconds).toBe(30)
      expect(error.message).toContain('30')
    })

    it('should throw RateLimitError for 429 with HTTP-date Retry-After header', async () => {
      const futureDate = new Date(Date.now() + 45_000).toUTCString()
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (name: string) => (name === 'Retry-After' ? futureDate : null) },
        json: async () => ({}),
      })

      const error = await apiRequest('/test').catch((e) => e)
      expect(error).toBeInstanceOf(RateLimitError)
      // Allow ±2s rounding tolerance
      expect((error as RateLimitError).retryAfterSeconds).toBeGreaterThanOrEqual(43)
      expect((error as RateLimitError).retryAfterSeconds).toBeLessThanOrEqual(47)
    })

    it('should throw RateLimitError with default delay when Retry-After header is absent', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
      })

      const error = await apiRequest('/test').catch((e) => e)
      expect(error).toBeInstanceOf(RateLimitError)
      expect((error as RateLimitError).retryAfterSeconds).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })

    it('RateLimitError should have name "RateLimitError"', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({}),
      })

      const error = (await apiRequest('/test').catch((e) => e)) as RateLimitError
      expect(error.name).toBe('RateLimitError')
    })
  })

  describe('parseRetryAfter', () => {
    it('should return default delay for null header', () => {
      expect(parseRetryAfter(null)).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })

    it('should return default delay for empty string header', () => {
      expect(parseRetryAfter('')).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })

    it('should parse a valid numeric delay-seconds header', () => {
      expect(parseRetryAfter('30')).toBe(30)
    })

    it('should parse zero as a valid delay', () => {
      expect(parseRetryAfter('0')).toBe(0)
    })

    it('should floor fractional numeric values', () => {
      expect(parseRetryAfter('30.9')).toBe(30)
    })

    it('should return default delay for negative numeric value', () => {
      expect(parseRetryAfter('-10')).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })

    it('should return default delay for non-finite numeric value (Infinity)', () => {
      expect(parseRetryAfter('Infinity')).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })

    it('should parse a future HTTP-date header and return positive seconds', () => {
      const futureDate = new Date(Date.now() + 60_000).toUTCString()
      const result = parseRetryAfter(futureDate)
      expect(result).toBeGreaterThanOrEqual(58)
      expect(result).toBeLessThanOrEqual(62)
    })

    it('should return 0 for a past HTTP-date header', () => {
      const pastDate = new Date(Date.now() - 60_000).toUTCString()
      expect(parseRetryAfter(pastDate)).toBe(0)
    })

    it('should return default delay for an unparseable string', () => {
      expect(parseRetryAfter('invalid-value')).toBe(DEFAULT_RETRY_AFTER_SECONDS)
    })
  })

  describe('Network Failure Handling', () => {
    it('should throw network error when fetch throws TypeError', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(apiRequest('/test')).rejects.toThrow(
        'Network error: Unable to connect to the server. Please check your connection.'
      )
    })

    it('should throw network error for CORS failures', async () => {
      mockFetch.mockRejectedValue(new TypeError('NetworkError when attempting to fetch resource.'))

      await expect(apiRequest('/test')).rejects.toThrow(
        'Network error: Unable to connect to the server. Please check your connection.'
      )
    })

    it('should re-throw non-TypeError errors', async () => {
      const customError = new Error('Custom error')
      mockFetch.mockRejectedValue(customError)

      await expect(apiRequest('/test')).rejects.toThrow('Custom error')
    })
  })

  describe('Response Parsing', () => {
    it('should parse and return JSON response for successful request', async () => {
      const mockData = { id: 1, name: 'Test User', active: true }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      })

      const result = await apiRequest<typeof mockData>('/user/1')

      expect(result).toEqual(mockData)
    })

    it('should return empty array for project endpoints with invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await apiRequest<any[]>('/projects/mine')

      expect(result).toEqual([])
    })

    it('should return empty array for projects list endpoint with invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await apiRequest<any[]>('/projects')

      expect(result).toEqual([])
    })

    it('should throw error for non-project endpoints with invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(apiRequest('/user')).rejects.toThrow('Invalid response from server')
    })
  })

  describe('Request Construction', () => {
    it('should construct correct URL with endpoint', async () => {
      await apiRequest('/test/endpoint')

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}/test/endpoint`, expect.any(Object))
    })

    it('should pass through custom headers', async () => {
      await apiRequest('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Request-ID': '123',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'X-Request-ID': '123',
          }),
        })
      )
    })

    it('should pass through fetch options (method, body, etc.)', async () => {
      const body = JSON.stringify({ data: 'test' })

      await apiRequest('/test', {
        method: 'POST',
        body,
        credentials: 'include',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/test`,
        expect.objectContaining({
          method: 'POST',
          body,
          credentials: 'include',
        })
      )
    })

    it('should default to GET method when not specified', async () => {
      await apiRequest('/test')

      const callArgs = mockFetch.mock.calls[0]
      // Method defaults to GET in fetch, may not be explicitly set
      expect(!callArgs[1].method || callArgs[1].method.toUpperCase() === 'GET').toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty body (null)', async () => {
      await apiRequest('/test', {
        method: 'POST',
        body: null,
      })

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].body).toBeNull()
    })

    it('should handle empty body (undefined)', async () => {
      await apiRequest('/test', {
        method: 'POST',
        body: undefined,
      })

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].body).toBeUndefined()
    })

    it('should handle empty endpoint path', async () => {
      await apiRequest('')

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}`, expect.any(Object))
    })

    it('should handle endpoint without leading slash', async () => {
      await apiRequest('test')

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE_URL}test`, expect.any(Object))
    })

    it('should handle mixed auth and content-type requirements', async () => {
      setAuthToken('test-token')
      const formData = new FormData()
      formData.append('data', 'test')

      await apiRequest('/upload', {
        method: 'POST',
        body: formData,
        requiresAuth: true,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/upload`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers['Content-Type']).toBeUndefined()
    })
  })

  describe('Security - Token Leak Prevention', () => {
    it('should not log token in any error messages', async () => {
      const testToken = 'sensitive-token-12345'
      setAuthToken(testToken)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetch.mockRejectedValue(new TypeError('Network error'))

      try {
        await apiRequest('/test', { requiresAuth: true })
      } catch (error) {
        // Verify error message doesn't contain token
        expect((error as Error).message).not.toContain(testToken)
      }

      // Verify console methods were not called with token
      const allCalls = [
        ...consoleErrorSpy.mock.calls,
        ...consoleLogSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
      ].flat()

      allCalls.forEach((call) => {
        const callStr = String(call)
        expect(callStr).not.toContain(testToken)
      })

      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it('should not expose token in successful response', async () => {
      const testToken = 'sensitive-token-12345'
      setAuthToken(testToken)

      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await apiRequest('/test', { requiresAuth: true })

      // Verify result doesn't contain token
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain(testToken)
    })
  })
})

describe('Token Management Functions', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockDispatchEvent.mockClear()
  })

  describe('getAuthToken', () => {
    it('should return token from localStorage', () => {
      const testToken = 'test-token-123'
      localStorageMock.setItem('patchwork_jwt', testToken)

      expect(getAuthToken()).toBe(testToken)
    })

    it('should return null when no token exists', () => {
      expect(getAuthToken()).toBeNull()
    })
  })

  describe('setAuthToken', () => {
    it('should store token in localStorage', () => {
      const testToken = 'test-token-123'
      setAuthToken(testToken)

      expect(localStorageMock.getItem('patchwork_jwt')).toBe(testToken)
    })

    it('should dispatch custom event with token', () => {
      const testToken = 'test-token-123'
      setAuthToken(testToken)

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'patchwork-auth-token',
          detail: { token: testToken },
        })
      )
    })
  })

  describe('removeAuthToken', () => {
    it('should remove token from localStorage', () => {
      localStorageMock.setItem('patchwork_jwt', 'test-token')
      removeAuthToken()

      expect(localStorageMock.getItem('patchwork_jwt')).toBeNull()
    })

    it('should dispatch custom event with null token', () => {
      removeAuthToken()

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'patchwork-auth-token',
          detail: { token: null },
        })
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Retry / backoff tests
// ---------------------------------------------------------------------------

describe('getRetryDelay — exponential backoff', () => {
  it('returns base delay for attempt 1', () => {
    expect(getRetryDelay(1)).toBe(RETRY_BASE_DELAY_MS)
  })

  it('doubles the delay on attempt 2', () => {
    expect(getRetryDelay(2)).toBe(RETRY_BASE_DELAY_MS * 2)
  })

  it('quadruples the delay on attempt 3', () => {
    expect(getRetryDelay(3)).toBe(RETRY_BASE_DELAY_MS * 4)
  })

  it('uses retryAfterMs when provided and positive', () => {
    expect(getRetryDelay(1, 3000)).toBe(3000)
  })

  it('ignores retryAfterMs of 0 and falls back to exponential backoff', () => {
    expect(getRetryDelay(1, 0)).toBe(RETRY_BASE_DELAY_MS)
  })
})

describe('sleep — uses setTimeout (controllable by fake timers)', () => {
  it('resolves after the specified delay', async () => {
    vi.useFakeTimers()
    const resolved = vi.fn()
    sleep(1000).then(resolved)

    expect(resolved).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(resolved).toHaveBeenCalledOnce()

    vi.useRealTimers()
  })
})

describe('apiRequest — retryable status codes (502, 503)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorageMock.clear()
    mockDispatchEvent.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries up to MAX_RETRY_ATTEMPTS on 502 and eventually succeeds', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      if (callCount < MAX_RETRY_ATTEMPTS) {
        return Promise.resolve({ ok: false, status: 502, json: async () => ({ message: 'Bad Gateway' }) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, service: 'api' }) })
    })

    const promise = apiRequest<{ ok: boolean; service: string }>('/health')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: true, service: 'api' })
    expect(callCount).toBe(MAX_RETRY_ATTEMPTS)
  })

  it('retries on 503 and eventually succeeds', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 503, json: async () => ({ message: 'Service Unavailable' }) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, service: 'api' }) })
    })

    const promise = apiRequest<{ ok: boolean; service: string }>('/health')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: true, service: 'api' })
    expect(callCount).toBe(2)
  })

  it('exhausts all retries on persistent 502 and throws', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ message: 'Bad Gateway' }),
    })

    const promise = apiRequest('/health')
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('Bad Gateway')
    expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS)
  })

  it('exhausts all retries on persistent 503 and throws', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Service Unavailable' }),
    })

    const promise = apiRequest('/health')
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('Service Unavailable')
    expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS)
  })

  it('backoff delay grows between attempts (exponential)', () => {
    const delay1 = getRetryDelay(1)
    const delay2 = getRetryDelay(2)
    const delay3 = getRetryDelay(3)

    expect(delay1).toBeLessThan(delay2)
    expect(delay2).toBeLessThan(delay3)
  })
})

describe('apiRequest — non-retryable status codes (4xx except 429)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockDispatchEvent.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does NOT retry on 400 — fails immediately after 1 fetch call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request data' }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('Bad request data')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 401 — clears token and fails after 1 fetch call', async () => {
    setAuthToken('stale-token')
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })

    await expect(apiRequest('/test', { requiresAuth: true })).rejects.toThrow(
      'Authentication failed. Please sign in again.'
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(getAuthToken()).toBeNull()
  })

  it('does NOT retry on 403 — fails immediately after 1 fetch call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Admin only' }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('Permission denied: Admin only.')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 404 — fails immediately after 1 fetch call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('Not found')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 422 — fails immediately after 1 fetch call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Validation failed' }),
    })

    await expect(apiRequest('/test')).rejects.toThrow('Validation failed')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry on 429 — throws RateLimitError immediately after 1 fetch call', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
      json: async () => ({}),
    })

    const err = await apiRequest('/test').catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('apiRequest — network error retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorageMock.clear()
    mockDispatchEvent.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries on network error and succeeds on subsequent attempt', async () => {
    let callCount = 0
    mockFetch.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, service: 'api' }) })
    })

    const promise = apiRequest<{ ok: boolean; service: string }>('/health')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: true, service: 'api' })
    expect(callCount).toBe(2)
  })

  it('exhausts retries on persistent network errors and throws last network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    const promise = apiRequest('/health')
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow(
      'Network error: Unable to connect to the server. Please check your connection.'
    )
    expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS)
  })

  it('does NOT retry non-fetch TypeErrors — throws immediately', async () => {
    mockFetch.mockRejectedValue(new TypeError('some other type error'))

    await expect(apiRequest('/health')).rejects.toThrow('some other type error')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
