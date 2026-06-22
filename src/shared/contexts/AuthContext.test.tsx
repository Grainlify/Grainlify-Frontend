import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockUser = {
  id: 'user-1',
  role: 'contributor',
  github: {
    login: 'testuser',
    avatar_url: 'https://example.com/avatar.png',
  },
};

const {
  mockGetCurrentUser,
  mockGetAuthToken,
  mockSetAuthToken,
  mockRemoveAuthToken,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetAuthToken: vi.fn().mockImplementation(() =>
    localStorage.getItem('patchwork_jwt'),
  ),
  mockSetAuthToken: vi.fn().mockImplementation((token: string) => {
    localStorage.setItem('patchwork_jwt', token);
    window.dispatchEvent(
      new CustomEvent('patchwork-auth-token', { detail: { token } }),
    );
  }),
  mockRemoveAuthToken: vi.fn().mockImplementation(() => {
    localStorage.removeItem('patchwork_jwt');
    window.dispatchEvent(
      new CustomEvent('patchwork-auth-token', { detail: { token: null } }),
    );
  }),
}));

vi.mock('../api/client', () => ({
  getCurrentUser: mockGetCurrentUser,
  getAuthToken: mockGetAuthToken,
  setAuthToken: mockSetAuthToken,
  removeAuthToken: mockRemoveAuthToken,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  mockGetAuthToken.mockImplementation(() => localStorage.getItem('patchwork_jwt'));
  mockSetAuthToken.mockImplementation((token: string) => {
    localStorage.setItem('patchwork_jwt', token);
    window.dispatchEvent(
      new CustomEvent('patchwork-auth-token', { detail: { token } }),
    );
  });
  mockRemoveAuthToken.mockImplementation(() => {
    localStorage.removeItem('patchwork_jwt');
    window.dispatchEvent(
      new CustomEvent('patchwork-auth-token', { detail: { token: null } }),
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthProvider + useAuth', () => {
  it('starts in loading state with no user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('does not authenticate from a token before the user state resolves', async () => {
    localStorage.setItem('patchwork_jwt', 'unverified-jwt');
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resolves to unauthenticated when no token is stored', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('fetches user when token is present on mount', async () => {
    localStorage.setItem('patchwork_jwt', 'valid-jwt');
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.userRole).toBe('contributor');
    expect(result.current.userId).toBe('user-1');
  });

  it('clears auth state when token is invalid on mount', async () => {
    localStorage.setItem('patchwork_jwt', 'expired-jwt');
    mockGetCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockRemoveAuthToken).toHaveBeenCalled();
  });

  it('login saves token and fetches user', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetCurrentUser.mockResolvedValue(mockUser);

    await act(async () => {
      await result.current.login('new-jwt');
    });

    expect(mockSetAuthToken).toHaveBeenCalledWith('new-jwt');
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login failure removes token and throws', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetCurrentUser.mockRejectedValue(new Error('API error'));

    await act(async () => {
      await expect(result.current.login('bad-jwt')).rejects.toThrow(
        'API error',
      );
    });

    expect(mockRemoveAuthToken).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout clears auth state and removes token', async () => {
    localStorage.setItem('patchwork_jwt', 'valid-jwt');
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.logout();
    });

    expect(mockRemoveAuthToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.userRole).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('reacts to patchwork-auth-token CustomEvent with null token', async () => {
    localStorage.setItem('patchwork_jwt', 'valid-jwt');
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('patchwork-auth-token', { detail: { token: null } }),
      );
    });

    expect(result.current.user).toBeNull();
    expect(result.current.userRole).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('reacts to patchwork-auth-token CustomEvent with a new token', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    mockGetCurrentUser.mockResolvedValue(mockUser);

    act(() => {
      // simulate what setAuthToken does: write to localStorage + dispatch event
      localStorage.setItem('patchwork_jwt', 'new-token');
      window.dispatchEvent(
        new CustomEvent('patchwork-auth-token', {
          detail: { token: 'new-token' },
        }),
      );
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(mockUser);
  });

  it('reacts to storage event when patchwork_jwt is removed', async () => {
    localStorage.setItem('patchwork_jwt', 'valid-jwt');
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'patchwork_jwt',
          newValue: null,
          oldValue: 'valid-jwt',
        }),
      );
    });

    expect(result.current.user).toBeNull();
    expect(result.current.userRole).toBeNull();
  });

  it('reacts to storage event when patchwork_jwt is set in another tab', async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockGetCurrentUser.mockResolvedValue(mockUser);

    act(() => {
      // simulate what happens in another tab: localStorage is set + event fires
      localStorage.setItem('patchwork_jwt', 'new-jwt-from-other-tab');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'patchwork_jwt',
          newValue: 'new-jwt-from-other-tab',
          oldValue: null,
        }),
      );
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(mockUser);
  });

  it('ignores storage events for other keys', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'something_else',
          newValue: 'value',
        }),
      );
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
