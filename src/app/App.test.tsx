import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
vi.mock('../features/bounties/pages/WalletLinkPage', () => ({
  WalletLinkPage: () => <div data-testid="wallet-link-page" />,
}))
vi.mock('../features/support/pages/SupportRoutePage', () => ({
  SupportRoutePage: () => <div data-testid="support-page" />,
}))

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => mockUseAuth(),
}))

const at = () => window.location.pathname + window.location.search

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

  it('renders SignInPage at /signin', async () => {
    renderAppAt('/signin')
    // SignInPage is lazy-loaded (see App.tsx), so it resolves behind a Suspense
    // fallback rather than rendering synchronously.
    expect(await screen.findByTestId('signin-page')).toBeInTheDocument()
  })

  it('renders SignUpPage at /signup', async () => {
    renderAppAt('/signup')
    expect(await screen.findByTestId('signup-page')).toBeInTheDocument()
  })

  it('renders AuthCallbackPage at /auth/callback', async () => {
    renderAppAt('/auth/callback')
    expect(await screen.findByTestId('auth-callback-page')).toBeInTheDocument()
  })

  it('redirects unauthenticated access to /dashboard to /signin with a returnTo param', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })

    renderAppAt('/dashboard')

    expect(await screen.findByTestId('signin-page')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/signin')
    expect(window.location.search).toBe(`?returnTo=${encodeURIComponent('/dashboard')}`)
  })

  it('renders Dashboard for authenticated access to /dashboard', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })

    renderAppAt('/dashboard')

    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('captures a "ref" query param from the landing URL into localStorage', async () => {
    // Capture round-trips through the server, which signs the code with its
    // capture time - so this asserts a stored token rather than a bare code.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ token: 'signed-capture-token', valid_days: 30 }),
    } as unknown as Response)))
    renderAppAt('/?ref=WELCOME42')
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem('grainlify_ref_code')!).token).toBe(
        'signed-capture-token',
      ),
    )
    vi.unstubAllGlobals()
  })

  describe('Grainlify Bounties', () => {
    it.each([
      ['/bounties', '/dashboard?tab=bounties'],
      ['/bounties/ledger', '/dashboard?tab=bounties&subtab=ledger'],
    ])('%s signed out goes to sign-in, returning to %s', async (path, target) => {
      renderAppAt(path)
      expect(await screen.findByTestId('signin-page')).toBeInTheDocument()
      expect(at()).toBe(`/signin?returnTo=${encodeURIComponent(target)}`)
    })

    it.each([
      ['/bounties', '/dashboard?tab=bounties'],
      ['/bounties/ledger', '/dashboard?tab=bounties&subtab=ledger'],
    ])('%s signed in lands on %s, inside the dashboard', async (path, target) => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
      renderAppAt(path)
      expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument()
      expect(at()).toBe(target)
    })

    it('/bounties/link signed out goes to sign-in and comes back with its query', async () => {
      renderAppAt('/bounties/link?bounty=b1')
      expect(await screen.findByTestId('signin-page')).toBeInTheDocument()
      expect(at()).toBe(`/signin?returnTo=${encodeURIComponent('/bounties/link?bounty=b1')}`)
    })

    it('/bounties/link signed in is its own page', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
      renderAppAt('/bounties/link?bounty=b1')
      expect(await screen.findByTestId('wallet-link-page')).toBeInTheDocument()
      expect(at()).toBe('/bounties/link?bounty=b1')
    })
  })

  describe('Page not found', () => {
    it.each(['/some-unknown-page', '/bounty', '/bounties/foo', '/dashboardx', '/signin/extra'])(
      '%s shows Page not found, signed out, without a sign-in detour',
      async (path) => {
        renderAppAt(path)
        expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
        expect(window.location.pathname).toBe(path)
        expect(screen.getByText(new RegExp(path.replace(/[/]/g, '\\/') + '$'))).toBeInTheDocument()
      },
    )

    it('also for a signed-in visitor', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
      renderAppAt('/nope')
      expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    })

    it('does not swallow existing routes or deep links', async () => {
      renderAppAt('/support')
      expect(await screen.findByTestId('support-page')).toBeInTheDocument()
      mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
      renderAppAt('/dashboard?tab=leaderboard')
      expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument()
      expect(at()).toBe('/dashboard?tab=leaderboard')
      renderAppAt('/notifications')
      await waitFor(() => expect(at()).toBe('/dashboard?tab=notifications'))
    })
  })
})
