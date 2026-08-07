import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders, screen, waitFor, act } from '../../../test/renderWithProviders'
import { AuthCallbackPage } from './AuthCallbackPage'

// vi.hoisted so this shared mutable state is available both inside the
// hoisted vi.mock factory below and in the test bodies.
const { mockLogin, mockAuthState } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockAuthState: { isAuthenticated: false },
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: mockAuthState.isAuthenticated,
    userRole: null,
    userId: null,
    user: null,
    isLoading: false,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

// AuthCallbackPage navigates with useNavigate() to real paths ('/dashboard',
// a stored returnTo, or '/signin'). Rendering it inside a real <Routes> with
// marker routes lets us assert on the actual navigation outcome instead of
// mocking react-router-dom internals.
function callbackTree() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/dashboard" element={<div>Dashboard Home Marker</div>} />
      <Route path="/dashboard/foo" element={<div>Dashboard Foo Marker</div>} />
      <Route path="/signin" element={<div>Sign In Page Marker</div>} />
    </Routes>
  )
}

function renderCallback(route: string) {
  return renderWithProviders(callbackTree(), { route })
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    mockAuthState.isAuthenticated = false
    sessionStorage.clear()

    // The component reads window.location.search directly (not through
    // react-router hooks), so it must be mocked/set independent of the
    // MemoryRouter `route` option.
    delete (window as any).location
    ;(window as any).location = { href: 'http://localhost:3000/auth/callback', search: '' }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls login with the exact token from the URL and redirects to /dashboard on success', async () => {
    window.location.search = '?token=mock_jwt_token_123'
    mockLogin.mockImplementation(async () => {
      mockAuthState.isAuthenticated = true
    })

    renderCallback('/auth/callback?token=mock_jwt_token_123')

    expect(await screen.findByText('Dashboard Home Marker')).toBeInTheDocument()
    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockLogin).toHaveBeenCalledWith('mock_jwt_token_123')
  })

  it('redirects to the stored authReturnTo path instead of /dashboard when one is set', async () => {
    window.location.search = '?token=mock_jwt_token_123'
    sessionStorage.setItem('authReturnTo', '/dashboard/foo')
    mockLogin.mockImplementation(async () => {
      mockAuthState.isAuthenticated = true
    })

    renderCallback('/auth/callback?token=mock_jwt_token_123')

    expect(await screen.findByText('Dashboard Foo Marker')).toBeInTheDocument()
    expect(sessionStorage.getItem('authReturnTo')).toBeNull()
  })

  it('runs the callback effect exactly once even across a re-render', async () => {
    window.location.search = '?token=mock_jwt_token_123'
    // Resolve without flipping isAuthenticated, so the page stays mounted on
    // the callback screen instead of navigating away — isolates the
    // "ran-once" guard from the navigation behavior covered above.
    mockLogin.mockResolvedValue(undefined)

    const { rerender } = renderCallback('/auth/callback?token=mock_jwt_token_123')

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Authentication Successful')).toBeInTheDocument()

    rerender(callbackTree())

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('shows a cancellation message and redirects to /signin after ~3s when error=access_denied', () => {
    window.location.search = '?error=access_denied'
    vi.useFakeTimers()

    renderCallback('/auth/callback?error=access_denied')

    expect(screen.getByText('Login was cancelled. Please try again.')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Sign In Page Marker')).toBeInTheDocument()
  })

  it('shows an error and does not call login when no token or error param is present', () => {
    window.location.search = ''

    renderCallback('/auth/callback')

    expect(screen.getByText('No authentication token received')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows an error and does not crash when login() rejects', async () => {
    window.location.search = '?token=mock_jwt_token_123'
    mockLogin.mockRejectedValue(new Error('Invalid token'))

    renderCallback('/auth/callback?token=mock_jwt_token_123')

    expect(await screen.findByText('Invalid token')).toBeInTheDocument()
    expect(mockAuthState.isAuthenticated).toBe(false)
  })
})
