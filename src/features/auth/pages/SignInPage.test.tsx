import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthCallbackPage } from './AuthCallbackPage'
import { SignInPage } from './SignInPage'
import { SignUpPage } from './SignUpPage'
import { I18nProvider, en } from '../../../shared/i18n'

const AUTH_RETURN_TO_KEY = 'authReturnTo'

const AUTH_TRANSLATED_MESSAGES: Record<string, string> = {
  ...en,
  'auth.signin.backToHome': 'Localized sign-in back',
  'auth.signin.title': 'Localized sign-in title',
  'auth.signin.subtitle': 'Localized sign-in subtitle',
  'auth.signin.redirecting': 'Localized sign-in redirecting',
  'auth.signin.githubButton': 'Localized sign-in GitHub',
  'auth.signin.oauthSecurity': 'Localized sign-in OAuth security',
  'auth.signin.consentDisclaimer': 'Localized sign-in consent disclaimer',
  'auth.signin.signupPrompt': 'Localized sign-in account prompt',
  'auth.signin.signupLink': 'Localized sign-in signup link',
  'auth.signup.backToHome': 'Localized sign-up back',
  'auth.signup.title': 'Localized sign-up title',
  'auth.signup.subtitle': 'Localized sign-up subtitle',
  'auth.signup.redirecting': 'Localized sign-up redirecting',
  'auth.signup.githubButton': 'Localized sign-up GitHub',
  'auth.signup.oauthSecurity': 'Localized sign-up OAuth security',
  'auth.signup.accessHeading': 'Localized sign-up access heading:',
  'auth.signup.accessPublicProfile': 'Localized public profile access',
  'auth.signup.accessPublicRepositories': 'Localized repository access',
  'auth.signup.accessActivity': 'Localized activity access',
  'auth.signup.privateReposDisclaimer': 'Localized private repositories disclaimer',
  'auth.signup.termsPrefix': 'Localized terms prefix',
  'auth.signup.termsOfService': 'Localized terms link',
  'auth.signup.termsConnector': 'localized connector',
  'auth.signup.privacyPolicy': 'Localized privacy link',
  'auth.signup.signinPrompt': 'Localized sign-up account prompt',
  'auth.signup.signinLink': 'Localized sign-up signin link',
}

const { mockGetGitHubLoginUrl, mockUseAuth } = vi.hoisted(() => ({
  mockGetGitHubLoginUrl: vi.fn(),
  mockUseAuth: vi.fn(),
}))

vi.mock('../../../shared/api/client', () => ({
  getGitHubLoginUrl: mockGetGitHubLoginUrl,
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function I18nTestProvider({
  children,
  messages = en,
}: {
  children: ReactNode
  messages?: Record<string, string>
}) {
  return <I18nProvider messages={messages}>{children}</I18nProvider>
}

function renderSignIn(path: string, messages: Record<string, string> = en) {
  window.history.pushState({}, '', path)
  return render(
    <I18nTestProvider messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <SignInPage />
      </MemoryRouter>
    </I18nTestProvider>
  )
}

function renderSignUp(path: string, messages: Record<string, string> = en) {
  window.history.pushState({}, '', path)
  return render(
    <I18nTestProvider messages={messages}>
      <MemoryRouter initialEntries={[path]}>
        <SignUpPage />
      </MemoryRouter>
    </I18nTestProvider>
  )
}

function renderCallback(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Auth pages localized strings', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockGetGitHubLoginUrl.mockReturnValue('#github-oauth')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('renders sign-in labels and consent copy from the i18n catalog', () => {
    renderSignIn('/signin', AUTH_TRANSLATED_MESSAGES)

    expect(screen.getByText('Localized sign-in back')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Localized sign-in title' })).toBeInTheDocument()
    expect(screen.getByText('Localized sign-in subtitle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Localized sign-in GitHub' })).toBeInTheDocument()
    expect(screen.getByText('Localized sign-in OAuth security')).toBeInTheDocument()
    expect(screen.getByText('Localized sign-in consent disclaimer')).toBeInTheDocument()
    expect(screen.getByText('Localized sign-in account prompt')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Localized sign-in signup link' })).toHaveAttribute(
      'href',
      '/signup'
    )
  })

  it('renders the sign-in redirecting label from the i18n catalog', async () => {
    const user = userEvent.setup()
    mockGetGitHubLoginUrl.mockReturnValue(new Promise<string>(() => undefined))
    renderSignIn('/signin', AUTH_TRANSLATED_MESSAGES)

    await user.click(screen.getByRole('button', { name: 'Localized sign-in GitHub' }))

    expect(await screen.findByText('Localized sign-in redirecting')).toBeInTheDocument()
  })

  it('renders sign-up labels, consent copy, and legal links from the i18n catalog', () => {
    renderSignUp('/signup', AUTH_TRANSLATED_MESSAGES)

    expect(screen.getByText('Localized sign-up back')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Localized sign-up title' })).toBeInTheDocument()
    expect(screen.getByText('Localized sign-up subtitle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Localized sign-up GitHub' })).toBeInTheDocument()
    expect(screen.getByText('Localized sign-up OAuth security')).toBeInTheDocument()
    expect(screen.getByText('Localized sign-up access heading:')).toBeInTheDocument()
    expect(screen.getByText('Localized public profile access')).toBeInTheDocument()
    expect(screen.getByText('Localized repository access')).toBeInTheDocument()
    expect(screen.getByText('Localized activity access')).toBeInTheDocument()
    expect(screen.getByText('Localized private repositories disclaimer')).toBeInTheDocument()
    expect(screen.getByText(/Localized terms prefix/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Localized terms link' })).toBeInTheDocument()
    expect(screen.getByText(/localized connector/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Localized privacy link' })).toBeInTheDocument()
    expect(screen.getByText('Localized sign-up account prompt')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Localized sign-up signin link' })).toHaveAttribute(
      'href',
      '/signin'
    )
  })

  it('renders the sign-up redirecting label from the i18n catalog', async () => {
    const user = userEvent.setup()
    renderSignUp('/signup', AUTH_TRANSLATED_MESSAGES)

    await user.click(screen.getByRole('button', { name: 'Localized sign-up GitHub' }))

    expect(await screen.findByText('Localized sign-up redirecting')).toBeInTheDocument()
  })
})

describe('SignInPage returnTo lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockGetGitHubLoginUrl.mockReturnValue('#github-oauth')
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('stores an internal dashboard returnTo from the sign-in URL', () => {
    renderSignIn('/signin?returnTo=/dashboard/browse%3Fq%3Dabc')

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe('/dashboard/browse?q=abc')
  })

  it('clears stale returnTo when sign-in is retried without a target', () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/old')

    renderSignIn('/signin')

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('rejects absolute external returnTo values and clears stale storage', () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/old')

    renderSignIn('/signin?returnTo=https://evil.com/dashboard')

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('rejects protocol-relative returnTo values', () => {
    renderSignIn('/signin?returnTo=//evil.com/dashboard')

    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('starts GitHub OAuth without changing a valid stored returnTo', async () => {
    const user = userEvent.setup()
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation((message?: unknown, ...args: unknown[]) => {
        if (message instanceof Error && message.message.includes('Not implemented: navigation')) {
          return
        }
        throw message ?? args[0]
      })
    renderSignIn('/signin?returnTo=/dashboard/browse')

    await user.click(screen.getByRole('button', { name: /sign in with github/i }))

    await waitFor(() => expect(mockGetGitHubLoginUrl).toHaveBeenCalled())
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe('/dashboard/browse')
    consoleError.mockRestore()
  })
})

describe('AuthCallbackPage returnTo lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('consumes and clears a valid returnTo after authentication', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse?q=abc')

    renderCallback('/auth/callback?token=jwt')

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/browse?q=abc')
    )
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('falls back to dashboard and clears an external returnTo', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, 'https://evil.com/dashboard')

    renderCallback('/auth/callback?token=jwt')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('clears returnTo when OAuth returns an error', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse')
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: false,
    })

    renderCallback('/auth/callback?error=access_denied')

    await waitFor(() => expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull())
  })

  it('clears returnTo when token login fails', async () => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, '/dashboard/browse')
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockRejectedValue(new Error('bad token')),
      isAuthenticated: false,
    })

    renderCallback('/auth/callback?token=bad-jwt')

    await waitFor(() => expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull())
  })
})
