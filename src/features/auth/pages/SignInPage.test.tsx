import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { SignInPage } from './SignInPage'
import { getGitHubLoginUrl } from '../../../shared/api/client'

// Mocked wholesale so the component's click handler never hits the network —
// we only care that it calls this function and uses its return value verbatim.
vi.mock('../../../shared/api/client', () => ({
  getGitHubLoginUrl: vi.fn(),
}))

const GITHUB_URL = 'https://mock-github-oauth.example.com/authorize?client_id=mock'

describe('SignInPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getGitHubLoginUrl).mockReturnValue(GITHUB_URL)
    sessionStorage.clear()

    // SignInPage reads window.location.search/.href directly (not through
    // react-router hooks), and calling the real jsdom navigation setter
    // throws "Not implemented: navigation". Replace it with a plain,
    // writable/spy-able stand-in.
    delete (window as any).location
    ;(window as any).location = { href: '', search: '' }
  })

  it('renders a GitHub sign-in button', () => {
    renderWithProviders(<SignInPage />)

    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('calls getGitHubLoginUrl and sets window.location.href to exactly its return value when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.click(screen.getByRole('button', { name: /sign in with github/i }))

    expect(getGitHubLoginUrl).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe(GITHUB_URL)
  })

  it('shows a disabled "Redirecting..." state after clicking', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignInPage />)

    await user.click(screen.getByRole('button', { name: /sign in with github/i }))

    const redirectingButton = screen.getByRole('button', { name: /redirecting/i })
    expect(redirectingButton).toBeDisabled()
  })

  it('persists the returnTo query param to sessionStorage on mount', () => {
    // The MemoryRouter `route` option only affects react-router's internal
    // history — SignInPage reads window.location.search directly, so that
    // must be set explicitly for the effect under test to see it.
    window.location.search = '?returnTo=/dashboard/foo'

    renderWithProviders(<SignInPage />, { route: '/signin?returnTo=/dashboard/foo' })

    expect(sessionStorage.getItem('authReturnTo')).toBe('/dashboard/foo')
  })

  it('does not touch sessionStorage when no returnTo param is present', () => {
    renderWithProviders(<SignInPage />)

    expect(sessionStorage.getItem('authReturnTo')).toBeNull()
  })
})
