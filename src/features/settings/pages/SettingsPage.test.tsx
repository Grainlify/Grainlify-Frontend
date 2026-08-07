import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { SettingsPage } from './SettingsPage'

vi.mock('../components/profile/ProfileTab', () => ({
  ProfileTab: () => <div data-testid="profile-tab" />,
}))
vi.mock('../components/notifications/NotificationsTab', () => ({
  NotificationsTab: () => <div data-testid="notifications-tab" />,
}))
vi.mock('../components/referrals/ReferralsTab', () => ({
  ReferralsTab: () => <div data-testid="referrals-tab" />,
}))
vi.mock('../components/rewards/RewardsTab', () => ({
  RewardsTab: () => <div data-testid="rewards-tab" />,
}))
vi.mock('../components/payout/PayoutTab', () => ({
  PayoutTab: () => <div data-testid="payout-tab" />,
}))
vi.mock('../components/billing/BillingTab', () => ({
  BillingTab: () => <div data-testid="billing-tab" />,
}))
vi.mock('../components/terms/TermsTab', () => ({
  TermsTab: () => <div data-testid="terms-tab" />,
}))

describe('SettingsPage', () => {
  it('renders with the default active tab (Profile)', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('notifications-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('referrals-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rewards-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('payout-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('billing-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('terms-tab')).not.toBeInTheDocument()
  })

  it('honors an explicit initialTab prop', () => {
    renderWithProviders(<SettingsPage initialTab="billing" />)
    expect(screen.getByTestId('billing-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()
  })

  it('clicking each of the 7 tab buttons swaps which mocked tab renders', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    // Starts on Profile.
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByTestId('notifications-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Referrals' }))
    expect(screen.getByTestId('referrals-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('notifications-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rewards' }))
    expect(screen.getByTestId('rewards-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('referrals-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Payout Preferences' }))
    expect(screen.getByTestId('payout-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('rewards-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Billing Profiles' }))
    expect(screen.getByTestId('billing-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('payout-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terms and Conditions' }))
    expect(screen.getByTestId('terms-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('billing-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('terms-tab')).not.toBeInTheDocument()
  })
})
