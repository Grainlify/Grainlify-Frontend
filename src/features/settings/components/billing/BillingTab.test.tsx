import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BillingTab } from './BillingTab'
import { toast } from 'sonner'
import { I18nProvider } from '../../../../shared/i18n'

function renderBillingTab() {
  return render(
    <I18nProvider>
      <BillingTab />
    </I18nProvider>
  )
}

vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

const mockProfiles = [{ id: 1, name: 'John Doe', type: 'individual', status: 'verified' }]

const mockAddProfile = vi.fn()
const mockUpdateProfile = vi.fn()

vi.mock('../../contexts/BillingProfilesContext', () => ({
  useBillingProfiles: () => ({
    profiles: mockProfiles,
    setProfiles: vi.fn(),
    addProfile: mockAddProfile,
    updateProfile: mockUpdateProfile,
  }),
}))

const mockGetKYCStatus = vi.fn().mockResolvedValue({ status: 'verified' })
const mockGetInvoices = vi.fn().mockResolvedValue([])

vi.mock('../../../../shared/api/client', () => ({
  getBillingProfiles: vi.fn().mockResolvedValue([]),
  getKYCStatus: (...args: unknown[]) => mockGetKYCStatus(...args),
  startKYCVerification: vi.fn().mockResolvedValue({ url: 'https://example.com' }),
  getInvoices: (...args: unknown[]) => mockGetInvoices(...args),
}))

async function navigateToDetailView() {
  renderBillingTab()
  const card = await screen.findByText('John Doe')
  await act(async () => {
    fireEvent.click(card)
  })
}

describe('BillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetKYCStatus.mockResolvedValue({ status: 'verified' })
    mockGetInvoices.mockResolvedValue([])
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
  })

  it('shows an error toast when trying to create a duplicate individual profile', async () => {
    renderBillingTab()

    const newProfileBtn = await screen.findByText('New Profile')
    fireEvent.click(newProfileBtn)

    const nameInput = screen.getByRole('textbox')
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })

    const createBtn = screen.getByRole('button', { name: 'Create' })
    fireEvent.click(createBtn)

    expect(toast.error).toHaveBeenCalledWith(
      'An individual billing profile already exists. You can only create one individual profile.'
    )
    expect(mockAddProfile).not.toHaveBeenCalled()
  })

  describe('Profile Detail View', () => {
    it('renders the profile detail view without stray text nodes', async () => {
      await navigateToDetailView()

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Back to billing profiles')).toBeInTheDocument()

      const container = screen.getByText('John Doe').closest('.space-y-6')
      expect(container?.textContent).not.toContain(')')
    })

    it('does not render a stray parenthesis between error banner and back button', async () => {
      mockGetKYCStatus.mockRejectedValue(new Error('Connection failed'))

      await navigateToDetailView()

      expect(
        screen.getByText(
          'VerificationFailed: Connection to the identity server failed. Please try again.'
        )
      ).toBeInTheDocument()
      expect(screen.getByText('Back to billing profiles')).toBeInTheDocument()

      const container = document.querySelector('.space-y-6')
      const children = Array.from(container?.childNodes ?? [])
      const textNodes = children.filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
      )
      expect(textNodes).toHaveLength(0)
    })

    it('renders back button and no stray parenthesis when there is no error', async () => {
      await navigateToDetailView()

      expect(screen.getByText('Back to billing profiles')).toBeInTheDocument()

      const container = document.querySelector('.space-y-6')
      const children = Array.from(container?.childNodes ?? [])
      const textNodes = children.filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
      )
      expect(textNodes).toHaveLength(0)
    })

    it('navigates back to list view and re-enters detail view without stray text', async () => {
      await navigateToDetailView()

      expect(screen.getByText('John Doe')).toBeInTheDocument()

      const backBtn = screen.getByText('Back to billing profiles')
      await act(async () => {
        fireEvent.click(backBtn)
      })

      expect(screen.getByText('New Profile')).toBeInTheDocument()

      const card = screen.getByText('John Doe')
      await act(async () => {
        fireEvent.click(card)
      })

      expect(screen.getByText('Back to billing profiles')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()

      const container = document.querySelector('.space-y-6')
      const children = Array.from(container?.childNodes ?? [])
      const textNodes = children.filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
      )
      expect(textNodes).toHaveLength(0)
    })
  })

  describe('Invoices tab', () => {
    async function openInvoicesTab() {
      await navigateToDetailView()
      await act(async () => {
        fireEvent.click(screen.getByText('Invoices'))
      })
    }

    it('fetches invoices for the selected profile when the tab is opened', async () => {
      await openInvoicesTab()

      await waitFor(() => {
        expect(mockGetInvoices).toHaveBeenCalledWith(1)
      })
    })

    it('renders a genuine empty state when the backend returns no invoices', async () => {
      await openInvoicesTab()

      await waitFor(() => expect(mockGetInvoices).toHaveBeenCalled())
      expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
    })

    it('renders real invoice rows returned by the backend', async () => {
      mockGetInvoices.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-2024-001',
          date: '2024-01-01',
          amount: 100,
          currency: 'USD',
          status: 'paid',
          description: 'Monthly fee',
          billingPeriod: 'Jan 2024',
        },
      ])

      await openInvoicesTab()

      expect(await screen.findByText('INV-2024-001')).toBeInTheDocument()
    })

    it('shows the loading state while invoices are being fetched', async () => {
      let resolveInvoices: (value: unknown[]) => void = () => {}
      mockGetInvoices.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInvoices = resolve
          })
      )

      await openInvoicesTab()

      expect(screen.getByTestId('invoices-loading')).toBeInTheDocument()

      resolveInvoices([])
      await waitFor(() => {
        expect(screen.queryByTestId('invoices-loading')).not.toBeInTheDocument()
      })
    })

    it('shows an error state when fetching invoices fails', async () => {
      mockGetInvoices.mockRejectedValue(new Error('network error'))

      await openInvoicesTab()

      expect(await screen.findByTestId('invoices-error')).toBeInTheDocument()
    })
  })
})
