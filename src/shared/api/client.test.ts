import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getCurrentUser,
  getPublicProjects,
  checkHealth,
} from './client';

const API_BASE_URL = 'http://localhost:8080';

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_API_BASE_URL', API_BASE_URL);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function createMockResponse(status: number, body: unknown, ok?: boolean) {
  const isOk = ok ?? (status >= 200 && status < 300);
  return {
    ok: isOk,
    status,
    json: () => (typeof body === 'object' ? Promise.resolve(body) : Promise.reject(new Error(String(body)))),
  } as Response;
}

function mockFetch(status: number, body: unknown, ok?: boolean) {
  globalThis.fetch = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(createMockResponse(status, body, ok)),
  );
}

function mockFetchNetworkError() {
  globalThis.fetch = vi.fn(() =>
    Promise.reject(new TypeError('Failed to fetch')),
  );
}

function mockFetchJsonError() {
  globalThis.fetch = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('not json')),
    } as Response),
  );
}

describe('token management', () => {
  it('returns null when no token is stored', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setAuthToken('my-jwt');
    expect(getAuthToken()).toBe('my-jwt');
    expect(localStorage.getItem('patchwork_jwt')).toBe('my-jwt');
  });

  it('removes a token', () => {
    setAuthToken('my-jwt');
    removeAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('patchwork_jwt')).toBeNull();
  });

  it('dispatches patchwork-auth-token CustomEvent on set', () => {
    const listener = vi.fn();
    window.addEventListener('patchwork-auth-token', listener);
    setAuthToken('new-token');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { token: 'new-token' },
      }),
    );
    window.removeEventListener('patchwork-auth-token', listener);
  });

  it('dispatches patchwork-auth-token CustomEvent with null on remove', () => {
    setAuthToken('existing');
    const listener = vi.fn();
    window.addEventListener('patchwork-auth-token', listener);
    removeAuthToken();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { token: null },
      }),
    );
    window.removeEventListener('patchwork-auth-token', listener);
  });
});

describe('apiRequest — 401 handling', () => {
  it('removes the token and throws on 401', async () => {
    setAuthToken('expired-jwt');
    mockFetch(401, { message: 'Unauthorized' }, false);

    await expect(getCurrentUser()).rejects.toThrow(
      'Authentication failed. Please sign in again.',
    );
    expect(getAuthToken()).toBeNull();
  });
});

describe('apiRequest — 403 handling', () => {
  it('parses 403 error message from response body', async () => {
    setAuthToken('valid-jwt');
    mockFetch(403, { message: 'Admin only' }, false);

    await expect(getCurrentUser()).rejects.toThrow(
      'Permission denied: Admin only. You may need admin privileges to perform this action.',
    );
  });

  it('falls back to error field when message is absent in 403', async () => {
    setAuthToken('valid-jwt');
    mockFetch(403, { error: 'Forbidden resource' }, false);

    await expect(getCurrentUser()).rejects.toThrow(
      'Permission denied: Forbidden resource. You may need admin privileges to perform this action.',
    );
  });

  it('uses default message when 403 body has no known fields', async () => {
    setAuthToken('valid-jwt');
    mockFetch(403, {}, false);

    await expect(getCurrentUser()).rejects.toThrow(
      'Permission denied: Access forbidden. You may need admin privileges to perform this action.',
    );
  });

  it('uses default message when 403 body is not valid JSON', async () => {
    setAuthToken('valid-jwt');
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.reject(new Error('parse failure')),
      } as Response),
    );

    await expect(getCurrentUser()).rejects.toThrow(
      'Permission denied: Access forbidden. You may need admin privileges to perform this action.',
    );
  });
});

describe('apiRequest — network error', () => {
  it('maps TypeError with fetch to a user-friendly network error', async () => {
    mockFetchNetworkError();

    await expect(checkHealth()).rejects.toThrow(
      'Network error: Unable to connect to the server. Please check your connection.',
    );
  });
});

describe('apiRequest — empty body fallback for /projects', () => {
  it('returns empty array when /projects response is not JSON', async () => {
    mockFetchJsonError();

    const result = await getPublicProjects();
    expect(result).toEqual([]);
  });

  it('returns empty array when /projects/mine response is not JSON', async () => {
    setAuthToken('valid-jwt');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    const { getMyProjects } = await import('./client');
    const result = await getMyProjects();
    expect(result).toEqual([]);
  });
});

describe('apiRequest — generic error handling', () => {
  it('throws parsed error message for non-401/403 failures', async () => {
    mockFetch(400, { message: 'Bad request data' }, false);

    await expect(getCurrentUser()).rejects.toThrow('Bad request data');
  });

  it('falls back to status code when error body is unparseable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse failure')),
    } as Response);

    await expect(checkHealth()).rejects.toThrow(
      'API request failed with status 500',
    );
  });

  it('uses error field when message is absent', async () => {
    mockFetch(422, { error: 'Validation failed' }, false);

    await expect(getCurrentUser()).rejects.toThrow('Validation failed');
  });
});

describe('apiRequest — successful requests', () => {
  it('returns parsed JSON on success', async () => {
    const healthData = { ok: true, service: 'api' };
    mockFetch(200, healthData);

    const result = await checkHealth();
    expect(result).toEqual(healthData);
  });
});
