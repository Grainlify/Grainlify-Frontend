import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthCallbackPage } from './AuthCallbackPage';
import { SignInPage } from './SignInPage';

const AUTH_RETURN_TO_KEY = 'authReturnTo';

const { mockGetGitHubLoginUrl, mockUseAuth } = vi.hoisted(() => ({
  mockGetGitHubLoginUrl: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  getGitHubLoginUrl: mockGetGitHubLoginUrl,
}));

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderSignIn(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SignInPage />
    </MemoryRouter>,
  );
}

function renderCallback(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignInPage returnTo lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockGetGitHubLoginUrl.mockReturnValue('/auth/github/login/start');
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('stores an internal dashboard returnTo from the sign-in URL', () => {
    renderSignIn('/signin?returnTo=/dashboard/browse%3Fq%3Dabc');

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe(
      '/dashboard/browse?q=abc',
    );
  });

  it('clears stale returnTo when sign-in is retried without a target', () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/old');

    renderSignIn('/signin');

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull();
  });

  it('rejects absolute external returnTo values and clears stale storage', () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/old');

    renderSignIn('/signin?returnTo=https://evil.com/dashboard');

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull();
  });

  it('rejects protocol-relative returnTo values', () => {
    renderSignIn('/signin?returnTo=//evil.com/dashboard');

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull();
  });

  it('starts GitHub OAuth without changing a valid stored returnTo', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((message?: unknown, ...args: unknown[]) => {
        if (
          message instanceof Error &&
          message.message.includes('Not implemented: navigation')
        ) {
          return;
        }
        throw message ?? args[0];
      });
    renderSignIn('/signin?returnTo=/dashboard/browse');

    await user.click(screen.getByRole('button', { name: /sign in with github/i }));

    await waitFor(() => expect(mockGetGitHubLoginUrl).toHaveBeenCalled());
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe('/dashboard/browse');
    consoleError.mockRestore();
  });
});

describe('AuthCallbackPage returnTo lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('consumes and clears a valid returnTo after authentication', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse?q=abc');

    renderCallback('/auth/callback?token=jwt');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/dashboard/browse?q=abc',
      ),
    );
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull();
  });

  it('falls back to dashboard and clears an external returnTo', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, 'https://evil.com/dashboard');

    renderCallback('/auth/callback?token=jwt');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'),
    );
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull();
  });

  it('clears returnTo when OAuth returns an error', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse');
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: false,
    });

    renderCallback('/auth/callback?error=access_denied');

    await waitFor(() =>
      expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull(),
    );
  });

  it('clears returnTo when token login fails', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse');
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockRejectedValue(new Error('bad token')),
      isAuthenticated: false,
    });

    renderCallback('/auth/callback?token=bad-jwt');

    await waitFor(() =>
      expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull(),
    );
  });
});
