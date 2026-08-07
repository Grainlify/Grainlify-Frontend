import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { DataPage } from './DataPage'

// DataPage is a static, admin-only analytics screen: every number/chart/map on it is
// driven by hardcoded sample data declared directly in the component (there is no
// import from shared/api/client, no useEffect, and no fetch of any kind — confirmed
// by reading the full source). So there is no loading state and no fetch-failure path
// to exercise here; these tests are a render/smoke suite plus the one genuinely
// stateful interaction on the page (the interval dropdowns).
//
// recharts' <ResponsiveContainer> measures real layout (0 in jsdom) and
// react-simple-maps' <Geographies> fetches real TopoJSON over the network — both are
// stubbed out per the harness's guidance so rendering stays hermetic.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  ComposedChart: ({ children }: any) => children,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: any) => children,
  Geographies: () => null,
  Geography: () => null,
  Marker: ({ children }: any) => children,
  ZoomableGroup: ({ children }: any) => children,
  Line: () => null,
}))

vi.mock('lucide-react', () => ({
  ChevronDown: () => null,
  Info: () => null,
}))

describe('DataPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders without crashing, showing the headline sections and figures', () => {
    renderWithProviders(<DataPage />)

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contributions' })).toBeInTheDocument()

    expect(screen.getByText('Project activity')).toBeInTheDocument()
    expect(screen.getByText('Contributors map')).toBeInTheDocument()
    expect(screen.getByText('Contributor activity')).toBeInTheDocument()
    expect(screen.getByText('Information')).toBeInTheDocument()

    expect(screen.getByText('Contributors with billing profile')).toBeInTheDocument()
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(
      screen.getByText(/Only data from contributors who have completed a KYC are included/),
    ).toBeInTheDocument()

    // Switching the (purely cosmetic — no section is conditionally rendered per
    // tab) header tabs must not crash the page or unmount its content.
    void userEvent.setup()
    screen.getByRole('button', { name: 'Projects' }).click()
    expect(screen.getByText('Contributors map')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Contributions' }).click()
    expect(screen.getByText('Contributors map')).toBeInTheDocument()
  })

  it('shows the real hardcoded contributors-by-region stats', () => {
    renderWithProviders(<DataPage />)

    expect(screen.getByText('Germany')).toBeInTheDocument()
    expect(screen.getByText('720')).toBeInTheDocument()
    expect(screen.getByText('India')).toBeInTheDocument()
    expect(screen.getByText('560')).toBeInTheDocument()
    expect(screen.getByText('Sweden')).toBeInTheDocument()
    expect(screen.getByText('210')).toBeInTheDocument()
  })

  it('changes the Project activity interval label when a different interval is picked from its dropdown, leaving the Contributor activity interval untouched', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DataPage />)

    const projectActivityRow = screen.getByText('Project activity').parentElement as HTMLElement
    // Both "Project activity" and "Contributor activity" cards default to "Monthly
    // interval" — scope the query to the Project activity row specifically.
    await user.click(within(projectActivityRow).getByText('Monthly interval'))
    await user.click(screen.getByText('Weekly interval'))

    expect(within(projectActivityRow).getByText('Weekly interval')).toBeInTheDocument()
    // The Contributor activity card's own dropdown is untouched.
    expect(screen.getByText('Monthly interval')).toBeInTheDocument()
  })
})
