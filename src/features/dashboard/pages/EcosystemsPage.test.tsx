import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { EcosystemsPage } from './EcosystemsPage'
import { getEcosystems } from '../../../shared/api/client'

// EcosystemsPage fetches ecosystems via getEcosystems() on mount and transforms the
// raw API rows (project_count/user_count/etc.) into UI view-model objects. The
// component also has pre-existing debug console.log/warn/error noise sprinkled
// throughout (including an unconditional one at the top of the function body,
// "=== EcosystemsPage (features/dashboard) FUNCTION CALLED ===") — that's out of
// scope to touch, just silence console output here so test runs stay readable.
vi.mock('../../../shared/api/client', () => ({
  getEcosystems: vi.fn(),
}))

const mockedGetEcosystems = vi.mocked(getEcosystems)

type EcosystemsResponse = Awaited<ReturnType<typeof getEcosystems>>
type ApiEcosystem = EcosystemsResponse['ecosystems'][number]

function makeApiEcosystem(
  overrides: Partial<ApiEcosystem> & Pick<ApiEcosystem, 'id' | 'name'>,
): ApiEcosystem {
  return {
    slug: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    description: null,
    logo_url: null,
    website_url: null,
    status: 'active',
    project_count: 0,
    user_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

const ecosystemAlpha = makeApiEcosystem({
  id: 'eco-alpha',
  name: 'Alpha Chain',
  description: 'The Alpha Chain ecosystem for testing.',
  project_count: 12,
  user_count: 340,
})

const ecosystemBeta = makeApiEcosystem({
  id: 'eco-beta',
  name: 'Beta Network',
  description: 'The Beta Network ecosystem for testing.',
  project_count: 5,
  user_count: 80,
})

describe('EcosystemsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows the loading skeleton, then a populated grid of ecosystems', async () => {
    mockedGetEcosystems.mockResolvedValue({ ecosystems: [ecosystemAlpha, ecosystemBeta] })

    const { container } = renderWithProviders(<EcosystemsPage onEcosystemClick={vi.fn()} />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('Alpha Chain')).toBeInTheDocument()
    })
    expect(screen.getByText('Beta Network')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('340')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('renders an empty state when the API returns zero ecosystems', async () => {
    mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })

    renderWithProviders(<EcosystemsPage onEcosystemClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No ecosystems available yet.')).toBeInTheDocument()
    })
  })

  it('does not crash when the ecosystems fetch fails, and settles on the empty state', async () => {
    mockedGetEcosystems.mockRejectedValue(new Error('network exploded'))

    const { container } = renderWithProviders(<EcosystemsPage onEcosystemClick={vi.fn()} />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('No ecosystems available yet.')).toBeInTheDocument()
    })
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('calls onEcosystemClick with the clicked ecosystem id, name, description, and logo url', async () => {
    const ecosystemWithLogo = makeApiEcosystem({
      id: 'eco-zeta',
      name: 'Zeta Protocol',
      description: 'A pretty great ecosystem for testing clicks.',
      logo_url: 'https://example.com/zeta-logo.png',
      project_count: 3,
      user_count: 44,
    })
    mockedGetEcosystems.mockResolvedValue({ ecosystems: [ecosystemWithLogo] })
    const onEcosystemClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<EcosystemsPage onEcosystemClick={onEcosystemClick} />)

    await waitFor(() => {
      expect(screen.getByText('Zeta Protocol')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Zeta Protocol'))

    expect(onEcosystemClick).toHaveBeenCalledTimes(1)
    expect(onEcosystemClick).toHaveBeenCalledWith(
      'eco-zeta',
      'Zeta Protocol',
      'A pretty great ecosystem for testing clicks.',
      'https://example.com/zeta-logo.png',
    )
  })
})
