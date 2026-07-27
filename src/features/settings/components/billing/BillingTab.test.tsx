import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BillingTab } from './BillingTab'
import { toast } from 'sonner'

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

vi.mock('../../../../shared/api/client', () => ({
  getBillingProfiles: vi.fn().mockResolvedValue([]),
  getKYCStatus: (...args: unknown[]) => mockGetKYCStatus(...args),
  startKYCVerification: vi.fn().mockResolvedValue({ url: 'https://example.com' }),
}))

async function navigateToDetailView() {
  render(<BillingTab />)
  const card = await screen.findByText('John Doe')
  await act(async () => {
    fireEvent.click(card)
  })
}

describe('BillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetKYCStatus.mockResolvedValue({ status: 'verified' })
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
  })

  it('shows an error toast when trying to create a duplicate individual profile', async () => {
    render(<BillingTab />)

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
})
