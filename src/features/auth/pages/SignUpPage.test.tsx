import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SignUpPage } from './SignUpPage'
import { I18nProvider, en } from '../../../shared/i18n'

const AUTH_TRANSLATED_MESSAGES: Record<string, string> = {
  ...en,
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

const { mockGetGitHubLoginUrl } = vi.hoisted(() => ({
  mockGetGitHubLoginUrl: vi.fn(),
}))

vi.mock('../../../shared/api/client', () => ({
  getGitHubLoginUrl: mockGetGitHubLoginUrl,
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

describe('SignUpPage', () => {
  beforeEach(() => {
    mockGetGitHubLoginUrl.mockReturnValue('https://github.com/login/oauth')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('renders all i18n strings', () => {
    it('renders sign-up labels from the default English catalog', () => {
      renderSignUp('/signup')

      expect(screen.getByText(en['auth.signup.backToHome'])).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: en['auth.signup.title'] })).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.subtitle'])).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      ).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.oauthSecurity'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessHeading'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessPublicProfile'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessPublicRepositories'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessActivity'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.privateReposDisclaimer'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.signinPrompt'])).toBeInTheDocument()
    })

    it('renders localized strings when provided', () => {
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
    })

    it('renders the redirecting label after clicking the button', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup', AUTH_TRANSLATED_MESSAGES)

      await user.click(screen.getByRole('button', { name: 'Localized sign-up GitHub' }))

      expect(await screen.findByText('Localized sign-up redirecting')).toBeInTheDocument()
    })
  })

  describe('navigation links', () => {
    it('back-to-home link points to /', () => {
      renderSignUp('/signup')

      const backLink = screen.getByRole('link', { name: /back to home/i })
      expect(backLink).toHaveAttribute('href', '/')
    })

    it('sign-in link points to /signin', () => {
      renderSignUp('/signup')

      const signInLink = screen.getByRole('link', { name: en['auth.signup.signinLink'] })
      expect(signInLink).toHaveAttribute('href', '/signin')
    })

    it('terms of service link renders as anchor', () => {
      renderSignUp('/signup')

      const termsLink = screen.getByRole('link', { name: en['auth.signup.termsOfService'] })
      expect(termsLink).toBeInTheDocument()
    })

    it('privacy policy link renders as anchor', () => {
      renderSignUp('/signup')

      const privacyLink = screen.getByRole('link', { name: en['auth.signup.privacyPolicy'] })
      expect(privacyLink).toBeInTheDocument()
    })
  })

  describe('Grainlify branding', () => {
    it('displays the Grainlify brand name', () => {
      renderSignUp('/signup')

      expect(screen.getByText('Grainlify')).toBeInTheDocument()
    })
  })

  describe('GitHub sign-up button behavior', () => {
    it('calls getGitHubLoginUrl and sets window.location.href on click', async () => {
      const hrefSetter = vi.fn()
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          set href(v: string) {
            hrefSetter(v)
          },
          get href() {
            return window.location.origin + '/signup'
          },
        },
        configurable: true,
      })

      const user = userEvent.setup()
      renderSignUp('/signup')

      await user.click(screen.getByRole('button', { name: en['auth.signup.githubButton'] }))

      expect(mockGetGitHubLoginUrl).toHaveBeenCalledTimes(1)
      expect(hrefSetter).toHaveBeenCalledWith('https://github.com/login/oauth')
    })

    it('disables the button and shows spinner while redirecting', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      const button = screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })

    it('shows the redirecting text after clicking', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      await user.click(screen.getByRole('button', { name: en['auth.signup.githubButton'] }))

      expect(await screen.findByText(en['auth.signup.redirecting'])).toBeInTheDocument()
    })

    it('hides the GitHub icon text when in redirecting state', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      await user.click(screen.getByRole('button', { name: en['auth.signup.githubButton'] }))

      await waitFor(() => {
        expect(screen.getByText(en['auth.signup.redirecting'])).toBeInTheDocument()
      })
    })
  })

  describe('double-click prevention', () => {
    it('does not call getGitHubLoginUrl a second time when clicked while redirecting', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      const button = screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      await user.click(button)

      expect(mockGetGitHubLoginUrl).toHaveBeenCalledTimes(1)
    })

    it('remains disabled after a rapid double-click', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      const button = screen.getByRole('button', { name: en['auth.signup.githubButton'] })

      await user.click(button)
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      expect(mockGetGitHubLoginUrl).toHaveBeenCalledTimes(1)
    })
  })

  describe('OAuth token redirect (useEffect)', () => {
    it('does not redirect when no token is in the URL', () => {
      renderSignUp('/signup')

      expect(mockGetGitHubLoginUrl).not.toHaveBeenCalled()
    })

    it('renders the sign-up button even when a token is present in the URL', () => {
      renderSignUp('/signup?token=abc123')

      expect(
        screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      ).toBeInTheDocument()
    })

    it('does not invoke the GitHub OAuth flow when a token is already present', () => {
      renderSignUp('/signup?token=abc123')

      expect(mockGetGitHubLoginUrl).not.toHaveBeenCalled()
    })
  })

  describe('logger integration', () => {
    it('logs a debug message when the sign-up button is clicked', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      await user.click(screen.getByRole('button', { name: en['auth.signup.githubButton'] }))

      const { logger } = await import('../../../shared/utils/logger')
      expect(logger.debug).toHaveBeenCalledWith('Sign up button clicked')
    })

    it('logs the redirect URL', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      await user.click(screen.getByRole('button', { name: en['auth.signup.githubButton'] }))

      const { logger } = await import('../../../shared/utils/logger')
      expect(logger.debug).toHaveBeenCalledWith('Redirecting to:', 'https://github.com/login/oauth')
    })
  })

  describe('access permissions section', () => {
    it('lists all three permission items', () => {
      renderSignUp('/signup')

      expect(screen.getByText(en['auth.signup.accessPublicProfile'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessPublicRepositories'])).toBeInTheDocument()
      expect(screen.getByText(en['auth.signup.accessActivity'])).toBeInTheDocument()
    })

    it('displays the private repos disclaimer', () => {
      renderSignUp('/signup')

      expect(screen.getByText(en['auth.signup.privateReposDisclaimer'])).toBeInTheDocument()
    })
  })

  describe('terms and legal section', () => {
    it('renders terms prefix, terms link, and privacy link', () => {
      renderSignUp('/signup')

      expect(screen.getByText(/By continuing, you agree to our/)).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: en['auth.signup.termsOfService'] })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: en['auth.signup.privacyPolicy'] })
      ).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('does not call getGitHubLoginUrl on mount', () => {
      renderSignUp('/signup')

      expect(mockGetGitHubLoginUrl).not.toHaveBeenCalled()
    })

    it('button is not disabled initially', () => {
      renderSignUp('/signup')

      const button = screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      expect(button).not.toBeDisabled()
    })

    it('handles multiple rapid clicks without duplicate API calls', async () => {
      const user = userEvent.setup()
      renderSignUp('/signup')

      const button = screen.getByRole('button', { name: en['auth.signup.githubButton'] })
      await user.click(button)
      await user.click(button)
      await user.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
      expect(mockGetGitHubLoginUrl).toHaveBeenCalledTimes(1)
    })
  })
})
