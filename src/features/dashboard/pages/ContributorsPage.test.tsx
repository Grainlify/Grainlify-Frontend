import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ContributorsPage } from './ContributorsPage'

// ContributorsPage itself fetches nothing and takes no props - it is a pure tab
// shell around three fully static children (ContributionsTab, ProjectsTab,
// RewardsTab), each of which renders its own hardcoded mock data with zero API
// calls (confirmed by reading ContributorsPage.tsx, ContributionsTab.tsx,
// ProjectsTab.tsx, and RewardsTab.tsx in full - none of them import anything from
// shared/api/client or useAuth). So there is no fetch to mock, and no
// loading/empty/failure state tied to a network call; these tests instead cover
// the page's real behavior: which static tab content renders by default and on tab
// switch.
describe('ContributorsPage', () => {
  it('renders the Contributions tab by default', () => {
    renderWithProviders(<ContributorsPage />)

    expect(screen.getByRole('button', { name: 'Contributions' })).toBeInTheDocument()
    // Static content owned by ContributionsTab. It renders twice (once in the
    // desktop kanban layout, once in the mobile stacked layout - both are always
    // present in jsdom since there's no real viewport to apply the Tailwind
    // `hidden md:block` / `md:hidden` breakpoint classes).
    expect(
      screen.getAllByText('Add dark mode support to the dashboard').length,
    ).toBeGreaterThan(0)
    // Rewards-only action buttons are not shown on the Contributions tab.
    expect(screen.queryByText('Request payment')).not.toBeInTheDocument()
  })

  it('switches to the Projects tab content when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect(screen.getByText('Project name')).toBeInTheDocument()
    expect(screen.getAllByText('React Ecosystem').length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Add dark mode support to the dashboard'),
    ).not.toBeInTheDocument()
  })

  it('switches to the Rewards tab content and reveals its action buttons', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Rewards' }))

    expect(screen.getByText('See transactions')).toBeInTheDocument()
    expect(screen.getByText('Request payment')).toBeInTheDocument()
    // Rewards mock data.
    expect(screen.getAllByText('Pending request').length).toBeGreaterThan(0)
  })

  it('renders in both light and dark theme without crashing', () => {
    const { unmount } = renderWithProviders(<ContributorsPage />, { theme: 'light' })
    expect(
      screen.getAllByText('Add dark mode support to the dashboard').length,
    ).toBeGreaterThan(0)
    unmount()

    renderWithProviders(<ContributorsPage />, { theme: 'dark' })
    expect(
      screen.getAllByText('Add dark mode support to the dashboard').length,
    ).toBeGreaterThan(0)
  })
})
