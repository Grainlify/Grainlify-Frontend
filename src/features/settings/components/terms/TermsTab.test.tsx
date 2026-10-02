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
    expect(screen.getByText('Last updated October 2, 2026')).toBeInTheDocument()

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

describe('TermsTab: the email disclosure', () => {
  // Storing somebody's address without saying so is the part of this that
  // cannot be undone by a later fix. These pin the three things the text has
  // to say, so a reword cannot quietly drop one.
  it('says what is stored, why, and that it is not shown to anybody else', async () => {
    renderWithProviders(<TermsTab />)
    const what = await screen.findByText(/we store the primary email address/i)
    expect(what).toHaveTextContent(/notifications you have switched on/i)
    expect(what).toHaveTextContent(/never show it to maintainers/i)
    expect(what).toHaveTextContent(/do not use it to market/i)
  })

  it('says how to turn it off and how to delete it', async () => {
    renderWithProviders(<TermsTab />)
    const how = await screen.findByText(/switch off every email from us/i)
    expect(how).toHaveTextContent(/you can delete the address/i)
    expect(how).toHaveTextContent(/signing in again does not\s*store it again/i)
  })

  it('says what happens to somebody who signed up before this, and to one who never returns', async () => {
    renderWithProviders(<TermsTab />)
    const backfill = await screen.findByText(/before we began storing addresses/i)
    expect(backfill).toHaveTextContent(/next\s*time you sign in/i)
    expect(backfill).toHaveTextContent(/never sign in again/i)
  })

  it('does not claim deletion reaches backups', async () => {
    renderWithProviders(<TermsTab />)
    // An absolute claim we cannot keep is worse than the honest one.
    expect(screen.queryByText(/nothing retains a copy/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/encrypted database backups/i)).toBeInTheDocument()
  })
})
