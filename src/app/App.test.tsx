import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// App.tsx renders its own <BrowserRouter> internally, so wrapping it in
// renderWithProviders's <MemoryRouter> would double-nest routers and throw
// ("You cannot render a <Router> inside another <Router>"). Instead, drive
// navigation the way BrowserRouter itself reads it: via window.history/location.
// This is a pure routing smoke test, so every page component is mocked away.
vi.mock('../features/landing', () => ({
  LandingPage: () => <div data-testid="landing-page" />,
}))
vi.mock('../features/auth', () => ({
  SignInPage: () => <div data-testid="signin-page" />,
  SignUpPage: () => <div data-testid="signup-page" />,
  AuthCallbackPage: () => <div data-testid="auth-callback-page" />,
}))
vi.mock('../features/dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page" />,
}))

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => mockUseAuth(),
}))

function renderAppAt(route: string) {
  window.history.pushState({}, '', route)
  return render(<App />)
}

describe('App routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
  })

  it('renders LandingPage at /', () => {
    renderAppAt('/')
    expect(screen.getByTestId('landing-page')).toBeInTheDocument()
  })

  it('renders SignInPage at /signin', () => {
    renderAppAt('/signin')
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
  })

  it('renders SignUpPage at /signup', () => {
    renderAppAt('/signup')
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
  })

  it('renders AuthCallbackPage at /auth/callback', () => {
    renderAppAt('/auth/callback')
    expect(screen.getByTestId('auth-callback-page')).toBeInTheDocument()
  })

  it('redirects unauthenticated access to /dashboard to /signin with a returnTo param', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })

    renderAppAt('/dashboard')

    expect(await screen.findByTestId('signin-page')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/signin')
    expect(window.location.search).toBe(`?returnTo=${encodeURIComponent('/dashboard')}`)
  })

  it('renders Dashboard for authenticated access to /dashboard', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })

    renderAppAt('/dashboard')

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
  })
})
