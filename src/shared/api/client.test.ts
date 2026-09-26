import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkHealth,
  getCurrentUser,
  updateProfile,
  unassignApplicant,
  getPublicProjects,
  getEcosystems,
  bootstrapAdmin,
  getGitHubLoginUrl,
  captureReferralCodeFromURL,
  readStoredReferralCode,
  submitSupportRequest,
} from './client'

// This codebase's convention is 100% manual fetch mocking (no msw). The base
// URL is pinned to http://localhost:8080 via vitest.config.ts's `env` block,
// so exact-URL assertions below are deterministic.
const BASE_URL = 'http://localhost:8080'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    json: async () => body,
  } as unknown as Response
}

function nonOkJsonResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response
}

function nonOkUnparsableResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('not valid json')
    },
  } as unknown as Response
}

function okUnparsableResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('not valid json')
    },
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

describe('apiRequest (exercised through the exported endpoint functions)', () => {
  it('sends default headers with no Content-Type or Authorization for a plain unauthenticated GET request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, service: 'patchwork-api' }))

    const result = await checkHealth()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE_URL}/health`)
    expect(init.headers).toEqual({})
    // apiRequest never injects a normalized "GET" back into the fetch call;
    // it just omits `method` and lets fetch's own default apply.
    expect(init.method).toBeUndefined()
    expect(result).toEqual({ ok: true, service: 'patchwork-api' })
  })

  it('adds Content-Type: application/json when a JSON body is sent, and Authorization when a token exists', async () => {
    localStorage.setItem('patchwork_jwt', 'tok-1')
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'ok' }))

    await updateProfile({ first_name: 'Ada' })

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(url).toBe(`${BASE_URL}/profile/update`)
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['Authorization']).toBe('Bearer tok-1')
    expect(init.body).toBe(JSON.stringify({ first_name: 'Ada' }))
  })

  it('defaults Content-Type to application/json for a non-GET/HEAD request even when no body is sent', async () => {
    // Real, deliberate behavior (see the inline comment in client.ts above the
    // header logic): any non-GET/HEAD request without an explicit Content-Type
    // gets "application/json" by default, regardless of whether a body is
    // present. unassignApplicant sends a POST with no body at all.
    localStorage.setItem('patchwork_jwt', 'tok-2')
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await unassignApplicant('proj-1', 42)

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(url).toBe(`${BASE_URL}/projects/proj-1/issues/42/unassign`)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBeUndefined()
  })

  it('refuses to send a requiresAuth request with no token, rather than earning a 401', async () => {
    // The old behaviour sent it anyway. The server answered 401, and the 401
    // branch below clears the stored token -- so a call made a moment too
    // early, before AuthContext had settled, could sign a real user out. With
    // 118 requiresAuth call sites, refusing to send is the only guarantee.
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not clear a stored token when the failure was our own missing-token guard', async () => {
    // Nothing was sent, so nothing was rejected: there is no reason to log
    // anybody out.
    localStorage.removeItem('patchwork_jwt')
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem('patchwork_jwt')).toBeNull()
  })

  it('still sends an optionalAuth request with no token: anonymous support is legitimate', async () => {
    // Somebody who cannot sign in is exactly the person most likely to need
    // support, so this endpoint must keep working without a token.
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, support_id: 's1', delivered: [] }))

    await submitSupportRequest({ category: 'bug', message: 'the page is broken' })

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('throws a friendly message and clears the stored token on a 401 response', async () => {
    localStorage.setItem('patchwork_jwt', 'expiring-token')
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(401, {}))

    await expect(getCurrentUser()).rejects.toThrow(
      'Authentication failed. Please sign in again.'
    )
    expect(localStorage.getItem('patchwork_jwt')).toBeNull()
  })

  it('throws the parsed error/message field for a generic non-OK error with a JSON body', async () => {
    // Regression coverage: the throw using the parsed message previously sat
    // INSIDE the try that guards response.json(), so it was immediately
    // caught by that same block's own catch and every backend error code
    // (this one, and every .includes(...)-based mapping built on it across
    // the app) silently never reached callers - only the generic
    // status-code fallback ever did. Fixed by moving the throw outside the
    // parse-guarding try.
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(500, { message: 'Server exploded' }))
    await expect(checkHealth()).rejects.toThrow('Server exploded')

    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(502, { error: 'github_installation_not_found' }))
    await expect(checkHealth()).rejects.toThrow('github_installation_not_found')
  })

  it('prefers message over error when a non-OK JSON body has both', async () => {
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(400, { message: 'human readable', error: 'machine_code' }))
    await expect(checkHealth()).rejects.toThrow('human readable')
  })

  it('falls back to a status-code message when a non-OK response body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(nonOkUnparsableResponse(502))

    await expect(checkHealth()).rejects.toThrow('API request failed with status 502')
  })

  it('surfaces the refusal code on a 403, so a feature can turn it into words', async () => {
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(403, { error: 'not_project_owner' }))

    await expect(checkHealth()).rejects.toThrow(
      'not_project_owner'
    )
  })

  it('says plainly that permission was refused when the 403 body is unreadable', async () => {
    fetchMock.mockResolvedValueOnce(nonOkUnparsableResponse(403))

    await expect(checkHealth()).rejects.toThrow(
      'You do not have permission to do that.'
    )
  })

  it('maps a network-level fetch rejection (TypeError mentioning fetch) to a friendly network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(checkHealth()).rejects.toThrow(
      'Network error: Unable to connect to the server. Please check your connection.'
    )
  })

  it('re-throws a non-network fetch rejection unchanged', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'))

    await expect(checkHealth()).rejects.toThrow('boom')
  })

  it('throws "Invalid response from server" when an OK response body is not valid JSON (non-projects endpoint)', async () => {
    fetchMock.mockResolvedValueOnce(okUnparsableResponse())

    await expect(checkHealth()).rejects.toThrow('Invalid response from server')
  })

  it('returns an empty array instead of throwing when a /projects response body is not valid JSON', async () => {
    fetchMock.mockResolvedValueOnce(okUnparsableResponse())

    const result = await getPublicProjects()

    expect(result).toEqual([])
  })
})

interface EndpointCase {
  name: string
  run: () => Promise<unknown>
  expectedUrl: string
  expectedMethod: string | undefined
  requiresAuth: boolean
  responseBody: unknown
}

const endpointCases: EndpointCase[] = [
  {
    name: 'getPublicProjects',
    run: () => getPublicProjects(),
    expectedUrl: `${BASE_URL}/projects`,
    expectedMethod: undefined,
    requiresAuth: false,
    responseBody: { projects: [], total: 0, limit: 20, offset: 0 },
  },
  {
    name: 'getEcosystems',
    run: () => getEcosystems(),
    expectedUrl: `${BASE_URL}/ecosystems`,
    expectedMethod: undefined,
    requiresAuth: false,
    responseBody: { ecosystems: [] },
  },
  {
    name: 'getCurrentUser',
    run: () => getCurrentUser(),
    expectedUrl: `${BASE_URL}/me`,
    expectedMethod: undefined,
    requiresAuth: true,
    responseBody: { id: 'u1', role: 'contributor' },
  },
  {
    name: 'updateProfile',
    run: () => updateProfile({ first_name: 'Ada' }),
    expectedUrl: `${BASE_URL}/profile/update`,
    expectedMethod: 'PUT',
    requiresAuth: true,
    responseBody: { message: 'ok' },
  },
  {
    name: 'bootstrapAdmin',
    run: () => bootstrapAdmin('boot-token'),
    expectedUrl: `${BASE_URL}/admin/bootstrap`,
    expectedMethod: 'POST',
    requiresAuth: true,
    responseBody: { ok: true, token: 't', role: 'admin' },
  },
]

describe('endpoint exports (table-driven spot checks)', () => {
  it.each(endpointCases)(
    '$name sends the expected method, URL, and auth header',
    async ({ run, expectedUrl, expectedMethod, requiresAuth, responseBody }) => {
      if (requiresAuth) {
        localStorage.setItem('patchwork_jwt', 'table-token')
      }
      fetchMock.mockResolvedValueOnce(jsonResponse(responseBody))

      await run()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ]
      expect(url).toBe(expectedUrl)
      expect(init.method).toBe(expectedMethod)
      if (requiresAuth) {
        expect(init.headers.Authorization).toBe('Bearer table-token')
      } else {
        expect(init.headers.Authorization).toBeUndefined()
      }
    }
  )
})

describe('referral code capture and injection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Capture is a server call now: the backend signs the code with its
    // capture time so the 30-day window is enforced where it cannot be edited.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ token: 'signed-capture-token', valid_days: 30 }),
    } as unknown as Response)))
  })
  afterEach(() => {
    window.history.pushState({}, '', '/')
    vi.unstubAllGlobals()
  })

  it('captureReferralCodeFromURL stores a signed token from the server', async () => {
    window.history.pushState({}, '', '/?ref=ABC123')
    await captureReferralCodeFromURL()
    expect(readStoredReferralCode()).toBe('signed-capture-token')
  })

  it('captureReferralCodeFromURL does nothing when there is no "ref" param', async () => {
    window.history.pushState({}, '', '/?foo=bar')
    await captureReferralCodeFromURL()
    expect(window.localStorage.getItem('grainlify_ref_code')).toBeNull()
  })

  it('getGitHubLoginUrl sends the signed token, never a bare code', async () => {
    window.history.pushState({}, '', '/?ref=XYZ789')
    await captureReferralCodeFromURL()

    const url = new URL(getGitHubLoginUrl())
    // ref_token, not ref: login-start no longer honours a bare code, because
    // a bare code carries no capture time and so cannot be expired.
    expect(url.searchParams.get('ref_token')).toBe('signed-capture-token')
    expect(url.searchParams.get('ref')).toBeNull()
    expect(url.searchParams.get('redirect')).toBe(window.location.origin)
  })

  it('getGitHubLoginUrl omits "ref" when no code was ever captured', () => {
    const url = new URL(getGitHubLoginUrl())
    expect(url.searchParams.has('ref')).toBe(false)
  })
})
