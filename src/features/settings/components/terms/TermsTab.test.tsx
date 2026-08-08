import { describe, it, expect, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { TermsTab } from './TermsTab'

describe('TermsTab', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('renders without crashing and shows real, platform-specific terms content', () => {
    renderWithProviders(<TermsTab />)
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument()
    expect(screen.getByText('Last updated August 6, 2026')).toBeInTheDocument()

    // Section titles grounded in what the platform actually does, not generic
    // boilerplate - regression coverage for the old thin 4-paragraph version.
    // Each title also appears in the table-of-contents nav, so scope to the
    // actual section heading rather than screen.getByText.
    expect(screen.getByRole('heading', { name: 'Identity Verification (KYC) and Anti-Money Laundering' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Points, Rewards, and the Redemption Process' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cryptocurrency, Wallets, and Blockchain Risk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maintainer and Project Obligations' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()

    expect(screen.getAllByText(/Didit/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Stellar network/).length).toBeGreaterThan(0)
  })

  it('renders without crashing in dark theme', () => {
    renderWithProviders(<TermsTab />, { theme: 'dark' })
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument()
  })

  it('accepting terms updates the button state and persists across remounts', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithProviders(<TermsTab />)

    const acceptButton = screen.getByRole('button', { name: 'Accept' })
    await user.click(acceptButton)

    expect(screen.getByRole('button', { name: 'Accepted' })).toBeDisabled()
    expect(screen.getByText("You've acknowledged the terms above on this device.")).toBeInTheDocument()
    unmount()

    renderWithProviders(<TermsTab />)
    expect(screen.getByRole('button', { name: 'Accepted' })).toBeInTheDocument()
  })
})
