import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { TermsTab, CURRENT_TERMS_VERSION, SKELETON_DELAY_MS } from './TermsTab'
import { getTermsStatus, acceptTerms } from '../../../../shared/api/client'
import { ThemeProvider } from '../../../../shared/contexts/ThemeContext'
import { I18nProvider, en } from '../../../../shared/i18n'

// Mock the API client
vi.mock('../../../../shared/api/client', () => ({
  getTermsStatus: vi.fn(),
  acceptTerms: vi.fn(),
}))

const renderWithTheme = (ui: React.ReactElement, messages: Record<string, string> = en) => {
  return render(
    <I18nProvider messages={messages}>
      <ThemeProvider>{ui}</ThemeProvider>
    </I18nProvider>
  )
}

describe('TermsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders copy from the i18n catalog', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    })

    renderWithTheme(<TermsTab />, {
      ...en,
      'terms.title': 'Catalog Terms Title',
      'terms.description': 'Catalog terms description.',
      'terms.service.title': 'Catalog Service Heading',
      'terms.service.bodyPrefix': 'Catalog service prefix',
      'terms.service.bodySuffix': ' catalog service suffix.',
      'terms.privacy.title': 'Catalog Privacy Heading',
      'terms.privacy.bodyPrefix': 'Catalog privacy prefix',
      'terms.privacy.bodySuffix': 'catalog privacy suffix.',
      'terms.dataCollection.title': 'Catalog Data Heading',
      'terms.dataCollection.body': 'Catalog data body.',
      'terms.userResponsibilities.title': 'Catalog Responsibilities Heading',
      'terms.userResponsibilities.body': 'Catalog responsibilities body.',
      'terms.acceptance.title': 'Catalog Accept Heading',
      'terms.actions.accept': 'Catalog Accept CTA',
    })

    expect(await screen.findByRole('heading', { name: 'Catalog Terms Title' })).toBeInTheDocument()
    expect(screen.getByText('Catalog terms description.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Catalog Service Heading' })).toBeInTheDocument()
    expect(screen.getByText(/Catalog service prefix/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Catalog Privacy Heading' })).toBeInTheDocument()
    expect(screen.getByText(/Catalog privacy prefix/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Catalog Data Heading' })).toBeInTheDocument()
    expect(screen.getByText('Catalog data body.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Catalog Responsibilities Heading' })
    ).toBeInTheDocument()
    expect(screen.getByText('Catalog responsibilities body.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Catalog Accept Heading' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Catalog Accept CTA' })).toBeInTheDocument()
    expect(screen.queryByText('Terms and Conditions')).not.toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    vi.mocked(getTermsStatus).mockImplementation(() => new Promise(() => {}))
    renderWithTheme(<TermsTab />)

    const button = screen.getByRole('button', { name: /loading/i })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('renders terms content and accept button when not accepted', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    })

    renderWithTheme(<TermsTab />)

    const button = await screen.findByRole('button', { name: 'Accept' })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()

    // Check links exist
    const tosLinks = screen.getAllByRole('link', { name: /terms of service/i })
    expect(tosLinks.length).toBeGreaterThan(0)
    expect(tosLinks[0]).toHaveAttribute('href', '/terms')

    const privacyLinks = screen.getAllByRole('link', { name: /privacy policy/i })
    expect(privacyLinks.length).toBeGreaterThan(0)
    expect(privacyLinks[0]).toHaveAttribute('href', '/privacy')
  })

  it('shows accepted state if already accepted from API', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: true,
      version: '1.0.0',
      accepted_at: '2023-10-01T12:00:00Z',
    })

    renderWithTheme(<TermsTab />)

    const button = await screen.findByRole('button', { name: 'Accepted' })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()

    // Check version and date message
    const message = await screen.findByText(/✓ Accepted version 1\.0\.0 on/)
    expect(message).toBeInTheDocument()
  })

  it('handles successful terms acceptance', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    })

    const acceptedDate = '2023-10-02T12:00:00Z'
    vi.mocked(acceptTerms).mockResolvedValue({
      ok: true,
      version: CURRENT_TERMS_VERSION,
      accepted_at: acceptedDate,
    })

    renderWithTheme(<TermsTab />)

    const button = await screen.findByRole('button', { name: 'Accept' })

    fireEvent.click(button)

    expect(button).toHaveTextContent('Accepting...')
    expect(button).toBeDisabled()

    await waitFor(() => {
      expect(acceptTerms).toHaveBeenCalledWith(CURRENT_TERMS_VERSION)
      expect(button).toHaveTextContent('Accepted')
      expect(button).toBeDisabled()
    })

    const message = await screen.findByText(
      new RegExp(`✓ Accepted version ${CURRENT_TERMS_VERSION} on`)
    )
    expect(message).toBeInTheDocument()
  })

  it('handles error when accepting terms', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    })

    vi.mocked(acceptTerms).mockRejectedValue(new Error('Network error'))

    renderWithTheme(<TermsTab />)

    const button = await screen.findByRole('button', { name: 'Accept' })

    fireEvent.click(button)

    const errorMessage = await screen.findByText('Network error')
    expect(errorMessage).toBeInTheDocument()

    // Button should be re-enabled
    expect(button).toHaveTextContent('Accept')
    expect(button).not.toBeDisabled()
  })

  it('handles error when getting status', async () => {
    // Should suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(getTermsStatus).mockRejectedValue(new Error('Fetch failed'))

    renderWithTheme(<TermsTab />)

    const button = await screen.findByRole('button', { name: 'Accept' })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch terms status:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('exposes an aria-busy live status region while loading', () => {
    vi.mocked(getTermsStatus).mockImplementation(() => new Promise(() => {}))
    renderWithTheme(<TermsTab />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('shows a delayed skeleton during slow loads but not for fast loads', async () => {
    vi.useFakeTimers()
    try {
      // Never resolves: simulates a slow load.
      vi.mocked(getTermsStatus).mockImplementation(() => new Promise(() => {}))
      renderWithTheme(<TermsTab />)

      // No skeleton before the delay threshold elapses.
      expect(screen.queryByTestId('terms-status-skeleton')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(SKELETON_DELAY_MS + 10)
      })

      expect(screen.getByTestId('terms-status-skeleton')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not flash the skeleton when the status resolves quickly', async () => {
    vi.mocked(getTermsStatus).mockResolvedValue({
      accepted: false,
      version: null,
      accepted_at: null,
    })

    renderWithTheme(<TermsTab />)
    await screen.findByRole('button', { name: 'Accept' })

    expect(screen.queryByTestId('terms-status-skeleton')).not.toBeInTheDocument()
  })

  it('shows an error state when the status fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getTermsStatus).mockRejectedValue(new Error('Fetch failed'))

    renderWithTheme(<TermsTab />)

    expect(await screen.findByText('Fetch failed')).toBeInTheDocument()
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'false')
    consoleSpy.mockRestore()
  })
})
