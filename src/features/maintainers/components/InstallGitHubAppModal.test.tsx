import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { InstallGitHubAppModal } from './InstallGitHubAppModal'
import { getAuthToken } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getAuthToken: vi.fn(),
}))

const noop = () => {}

function mockFetchOnce(response: { ok: boolean; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

describe('InstallGitHubAppModal', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithProviders(
      <InstallGitHubAppModal isOpen={false} onClose={noop} onSuccess={noop} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the modal content when isOpen is true', () => {
    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={noop} />)

    expect(screen.getByText('Install Grainlify GitHub App')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install GitHub App' })).toBeInTheDocument()
  })

  it('calls onClose when the close (X) button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<InstallGitHubAppModal isOpen onClose={onClose} onSuccess={noop} />)

    // The header close button is icon-only (no accessible name) and renders first in DOM order.
    const closeButton = screen.getAllByRole('button')[0]
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <InstallGitHubAppModal isOpen onClose={onClose} onSuccess={noop} />
    )

    const backdrop = container.querySelector('[class*="backdrop-blur"]')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<InstallGitHubAppModal isOpen onClose={onClose} onSuccess={noop} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a sign-in message and never calls fetch when no auth token is present', async () => {
    vi.mocked(getAuthToken).mockReturnValue(null)
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={onSuccess} />)
    await user.click(screen.getByRole('button', { name: 'Install GitHub App' }))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please sign in to install the GitHub App')
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
  })

  it('does not redirect and shows an error alert when the response is not ok', async () => {
    vi.mocked(getAuthToken).mockReturnValue('test-token')
    const fetchMock = mockFetchOnce({
      ok: false,
      json: async () => ({ message: 'Installation not allowed' }),
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={onSuccess} />)
    await user.click(screen.getByRole('button', { name: 'Install GitHub App' }))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Installation not allowed')
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/github/app/install/start',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('redirects to exactly data.install_url and calls onSuccess on a successful response', async () => {
    vi.mocked(getAuthToken).mockReturnValue('test-token')
    mockFetchOnce({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/grainlify/installations/new' }),
    })
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={onSuccess} />)
    await user.click(screen.getByRole('button', { name: 'Install GitHub App' }))

    await waitFor(() => {
      expect(window.location.href).toBe('https://github.com/apps/grainlify/installations/new')
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('persists the "don\'t show again" preference to localStorage on a successful install', async () => {
    vi.mocked(getAuthToken).mockReturnValue('test-token')
    mockFetchOnce({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/grainlify/installations/new' }),
    })
    const user = userEvent.setup()

    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={noop} />)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Install GitHub App' }))

    await waitFor(() => {
      expect(window.location.href).toBe('https://github.com/apps/grainlify/installations/new')
    })
    expect(window.localStorage.getItem('github_app_modal_dismissed')).toBe('true')
  })

  it('does not persist a "don\'t show again" preference when the checkbox is left unchecked', async () => {
    vi.mocked(getAuthToken).mockReturnValue('test-token')
    mockFetchOnce({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/grainlify/installations/new' }),
    })
    const user = userEvent.setup()

    renderWithProviders(<InstallGitHubAppModal isOpen onClose={noop} onSuccess={noop} />)
    await user.click(screen.getByRole('button', { name: 'Install GitHub App' }))

    await waitFor(() => {
      expect(window.location.href).toBe('https://github.com/apps/grainlify/installations/new')
    })
    expect(window.localStorage.getItem('github_app_modal_dismissed')).toBeNull()
  })
})
