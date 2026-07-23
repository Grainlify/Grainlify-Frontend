import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { InstallGitHubAppModal } from './InstallGitHubAppModal'
import { toast } from 'sonner'
import { logger } from '../../../shared/utils/logger'

// Mock contexts and modules
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

vi.mock('../../../shared/api/client', () => ({
  getAuthToken: vi.fn(() => 'mock-token'),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('InstallGitHubAppModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Mock window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' } as Location,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('does not render when isOpen is false', () => {
    render(<InstallGitHubAppModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />)
    expect(screen.queryByText('Install Grainlify GitHub App')).not.toBeInTheDocument()
  })

  it('renders correctly when isOpen is true', () => {
    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)
    expect(screen.getByText('Install Grainlify GitHub App')).toBeInTheDocument()
  })

  it('validates the "don\'t show again" flag on mount and calls onClose', () => {
    localStorage.setItem('github_app_modal_dismissed', 'true')
    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('renders the privacy and permissions link', () => {
    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)
    const link = screen.getByRole('link', {
      name: /Learn more about GitHub App permissions and privacy/i,
    })
    expect(link).toHaveAttribute(
      'href',
      'https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps'
    )
  })

  it('calls onSuccess and redirects on successful install', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/test/install' }),
    })

    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const installButton = screen.getByRole('button', { name: /install github app/i })
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(window.location.href).toBe('https://github.com/apps/test/install')
    })
  })

  it('shows toast.error on install failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Installation failed' }),
    })

    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const installButton = screen.getByRole('button', { name: /install github app/i })
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start GitHub App installation:',
        expect.any(Error)
      )
      expect(toast.error).toHaveBeenCalledWith('Installation failed')
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  it('saves "don\'t show again" flag when checked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/test/install' }),
    })

    render(<InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const checkbox = screen.getByRole('checkbox')
    await userEvent.click(checkbox)

    const installButton = screen.getByRole('button', { name: /install github app/i })
    fireEvent.click(installButton)

    await waitFor(() => {
      expect(localStorage.getItem('github_app_modal_dismissed')).toBe('true')
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('aborts an in-flight install request when unmounted', async () => {
    let resolveInstall: (value: { ok: true; json: () => Promise<{ install_url: string }> }) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInstall = resolve
      })
    )

    const { unmount } = render(
      <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    await userEvent.click(screen.getByRole('button', { name: /install github app/i }))

    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit
    const signal = fetchOptions.signal as AbortSignal

    expect(signal).toBeInstanceOf(AbortSignal)

    unmount()

    expect(signal.aborted).toBe(true)

    resolveInstall!({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/test/install' }),
    })

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })
  })

  it('aborts an in-flight install request when the modal closes', async () => {
    let resolveInstall: (value: { ok: true; json: () => Promise<{ install_url: string }> }) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInstall = resolve
      })
    )

    const { rerender } = render(
      <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    await userEvent.click(screen.getByRole('button', { name: /install github app/i }))

    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit
    const signal = fetchOptions.signal as AbortSignal

    rerender(
      <InstallGitHubAppModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    )

    expect(signal.aborted).toBe(true)

    resolveInstall!({
      ok: true,
      json: async () => ({ install_url: 'https://github.com/apps/test/install' }),
    })

    await waitFor(() => {
      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('cancellation, confirmation failure, and retry flows', () => {
    it('displays a clear, non-error cancelled state when user cancels on GitHub', async () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, search: '?setup_action=cancel' } as Location,
      })

      render(
        <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('github-app-cancelled-state')).toBeInTheDocument()
        expect(screen.getByText('Installation Cancelled')).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('surfaces an actionable error and prevents false success when backend confirmation fails', async () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, search: '?installation_id=12345' } as Location,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Confirmation backend error' }),
      })

      render(
        <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/github/app/install/confirm'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ installation_id: '12345' }),
          })
        )
        expect(screen.getByTestId('github-app-error-state')).toBeInTheDocument()
        expect(screen.getByText('Confirmation backend error')).toBeInTheDocument()
        expect(toast.error).toHaveBeenCalledWith('Confirmation backend error')
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('calls onSuccess when backend confirmation succeeds', async () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, search: '?installation_id=12345' } as Location,
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      })

      render(
        <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/github/app/install/confirm'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ installation_id: '12345' }),
          })
        )
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        expect(toast.error).not.toHaveBeenCalled()
      })
    })

    it('allows retrying after cancellation without restarting modal flow', async () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, search: '?setup_action=cancel' } as Location,
      })

      render(
        <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const retryBtn = await screen.findByRole('button', { name: /retry/i })
      expect(screen.getByTestId('github-app-cancelled-state')).toBeInTheDocument()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ install_url: 'https://github.com/apps/test/install' }),
      })

      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/github/app/install/start'),
          expect.anything()
        )
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        expect(window.location.href).toBe('https://github.com/apps/test/install')
      })
    })

    it('allows retrying after confirmation failure without restarting modal flow', async () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, search: '?installation_id=99999' } as Location,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Server temp unavailable' }),
      })

      render(
        <InstallGitHubAppModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('github-app-error-state')).toBeInTheDocument()
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      })

      const retryBtn = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('/auth/github/app/install/confirm'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ installation_id: '99999' }),
          })
        )
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })
  })
})
