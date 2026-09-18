import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { EcosystemDetailPage } from './EcosystemDetailPage'
import { getPublicProjects, getEcosystemDetail } from '../../../shared/api/client'
import { ApiError } from '../../../shared/api/apiError'

// EcosystemDetailPage fetches the ecosystem's own detail record (getEcosystemDetail)
// and, independently, the list of public projects filtered by ecosystem name
// (getPublicProjects) to populate the Projects tab. Mock only what this page itself
// imports from the client.
vi.mock('../../../shared/api/client', () => ({
  getPublicProjects: vi.fn(),
  getEcosystemDetail: vi.fn(),
}))

const mockedGetPublicProjects = vi.mocked(getPublicProjects)
const mockedGetEcosystemDetail = vi.mocked(getEcosystemDetail)

type PublicProjectsResponse = Awaited<ReturnType<typeof getPublicProjects>>
type ApiProject = PublicProjectsResponse['projects'][number]
type EcosystemDetailResponse = Awaited<ReturnType<typeof getEcosystemDetail>>

function makeApiProject(
  overrides: Partial<ApiProject> & Pick<ApiProject, 'id' | 'github_full_name'>,
): ApiProject {
  return {
    language: 'TypeScript',
    tags: [],
    category: null,
    stars_count: 0,
    forks_count: 0,
    contributors_count: 0,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: null,
    ecosystem_slug: null,
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeDetail(overrides: Partial<EcosystemDetailResponse> = {}): EcosystemDetailResponse {
  return {
    id: 'eco-1',
    slug: 'eco-1',
    name: 'Eco One',
    description: 'A detail description',
    website_url: null,
    logo_url: null,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    about: 'About text',
    links: [],
    key_areas: [],
    technologies: [],
    project_count: 1,
    contributors_count: 1,
    open_issues_count: 0,
    open_prs_count: 0,
    ...overrides,
  }
}

const emptyProjects: PublicProjectsResponse = { projects: [], total: 0, limit: 100, offset: 0 }

describe('EcosystemDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows initialDescription/initialLogoUrl (and "—" loading placeholders) immediately, then swaps in the real detail once the fetch resolves', async () => {
    let resolveDetail: (value: EcosystemDetailResponse) => void
    const detailPromise = new Promise<EcosystemDetailResponse>((resolve) => {
      resolveDetail = resolve
    })
    mockedGetEcosystemDetail.mockReturnValue(detailPromise)
    mockedGetPublicProjects.mockResolvedValue(emptyProjects)

    renderWithProviders(
      <EcosystemDetailPage
        ecosystemId="eco-42"
        ecosystemName="Zeta"
        initialDescription="Initial desc from list page"
        initialLogoUrl="https://cdn.example.com/initial-logo.png"
        onBack={vi.fn()}
      />,
    )

    // Before the detail fetch resolves: initial list-page description/logo show
    // immediately (avoids a blank flash) and numeric stats show the "—" placeholder.
    expect(screen.getByText('Initial desc from list page')).toBeInTheDocument()
    expect(
      document.querySelector('img[src="https://cdn.example.com/initial-logo.png"]'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)

    resolveDetail!(
      makeDetail({
        id: 'eco-42',
        name: 'Zeta',
        description: 'From the real API',
        logo_url: 'https://cdn.example.com/real-logo.png',
        about: 'Real about text',
        links: [{ label: 'Real Link', url: 'https://real.example.com' }],
        key_areas: [{ title: 'Area X', description: 'desc x' }],
        technologies: ['RealTech'],
        project_count: 77,
        contributors_count: 55,
        open_issues_count: 9,
        open_prs_count: 3,
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('From the real API')).toBeInTheDocument()
    })
    expect(screen.getByText('Real about text')).toBeInTheDocument()
    expect(screen.getByText('Area X:')).toBeInTheDocument()
    expect(screen.getByText('desc x')).toBeInTheDocument()
    expect(screen.getByText('RealTech')).toBeInTheDocument()
    const realLinkLabel = screen.getByText('Real Link')
    expect(realLinkLabel.closest('a')).toHaveAttribute('href', 'https://real.example.com')
    expect(
      document.querySelector('img[src="https://cdn.example.com/real-logo.png"]'),
    ).toBeInTheDocument()

    // Real numbers have replaced every "—" placeholder.
    expect(screen.queryAllByText('—').length).toBe(0)
    expect(screen.getAllByText('77').length).toBeGreaterThan(0)
    expect(screen.getAllByText('55').length).toBeGreaterThan(0)
    expect(screen.getByText('9')).toBeInTheDocument()

    expect(getEcosystemDetail).toHaveBeenCalledWith('eco-42')
    expect(getPublicProjects).toHaveBeenCalledWith({ ecosystem: 'Zeta', limit: 100 })
  })

  // Rewritten: this used to assert that a failed detail fetch rendered the
  // hardcoded placeholder content (fake web3.ecosystem.example / discord.gg /
  // twitter.com links, stock about text) — the defect. It must say it failed.
  it('shows a load-failed alert instead of placeholder content when the detail fetch fails', async () => {
    mockedGetEcosystemDetail.mockRejectedValue(
      new ApiError('ecosystem_lookup_failed', 500, { error: 'ecosystem_lookup_failed' }),
    )
    mockedGetPublicProjects.mockResolvedValue(emptyProjects)

    renderWithProviders(
      <EcosystemDetailPage ecosystemId="eco-99" ecosystemName="NoDetail Land" onBack={vi.fn()} />,
    )

    expect(await screen.findByText("Couldn't load this ecosystem")).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ecosystem_lookup_failed')
    expect(screen.queryByText('Official Website')).not.toBeInTheDocument()
    expect(screen.queryByText('Discord Community')).not.toBeInTheDocument()
    expect(screen.queryByText(/paradigm shift/)).not.toBeInTheDocument()
    expect(screen.queryByText('Blockchain Protocols:')).not.toBeInTheDocument()
    // Breadcrumb stays so the user can go back.
    expect(screen.getByText('Ecosystems')).toBeInTheDocument()
    expect(getEcosystemDetail).toHaveBeenCalledWith('eco-99')
  })

  it('retries the detail fetch from the load-failed alert', async () => {
    mockedGetEcosystemDetail
      .mockRejectedValueOnce(new ApiError('ecosystem_lookup_failed', 500, { error: 'ecosystem_lookup_failed' }))
      .mockResolvedValueOnce(makeDetail({ about: 'Real about text' }))
    mockedGetPublicProjects.mockResolvedValue(emptyProjects)
    const user = userEvent.setup()

    renderWithProviders(
      <EcosystemDetailPage ecosystemId="eco-1" ecosystemName="Eco One" onBack={vi.fn()} />,
    )

    await user.click(await screen.findByRole('button', { name: /try again/i }))

    expect(await screen.findByText('Real about text')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load this ecosystem")).not.toBeInTheDocument()
  })

  it('shows a load-failed alert (not "No projects … yet") when the projects fetch fails, and retries', async () => {
    mockedGetEcosystemDetail.mockResolvedValue(makeDetail())
    mockedGetPublicProjects
      .mockRejectedValueOnce(new ApiError('internal_error', 500, { error: 'internal_error' }))
      .mockResolvedValueOnce({
        projects: [makeApiProject({ id: 'proj-1', github_full_name: 'ecoorg/back-again' })],
        total: 1,
        limit: 100,
        offset: 0,
      })
    const user = userEvent.setup()

    renderWithProviders(
      <EcosystemDetailPage ecosystemId="eco-1" ecosystemName="EcoOrg" onBack={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect(await screen.findByText("Couldn't load the projects in EcoOrg")).toBeInTheDocument()
    expect(screen.queryByText('No projects in EcoOrg yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('back-again')).toBeInTheDocument()
    expect(getPublicProjects).toHaveBeenCalledTimes(2)
  })

  it('calls onBack when the "Ecosystems" breadcrumb is clicked', async () => {
    mockedGetEcosystemDetail.mockResolvedValue(makeDetail())
    mockedGetPublicProjects.mockResolvedValue(emptyProjects)
    const onBack = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <EcosystemDetailPage ecosystemId="eco-1" ecosystemName="Foo Chain" onBack={onBack} />,
    )

    await user.click(screen.getByText('Ecosystems'))

    expect(onBack).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(getEcosystemDetail).toHaveBeenCalled())
  })

  it('calls onProjectClick with the clicked project id from the Projects tab', async () => {
    mockedGetEcosystemDetail.mockResolvedValue(makeDetail())
    mockedGetPublicProjects.mockResolvedValue({
      projects: [
        makeApiProject({
          id: 'proj-99',
          github_full_name: 'ecoorg/cool-repo',
          description: 'A cool repo',
        }),
      ],
      total: 1,
      limit: 100,
      offset: 0,
    })
    const onProjectClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <EcosystemDetailPage
        ecosystemId="eco-1"
        ecosystemName="EcoOrg"
        onBack={vi.fn()}
        onProjectClick={onProjectClick}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    await waitFor(() => {
      expect(screen.getByText('cool-repo')).toBeInTheDocument()
    })

    await user.click(screen.getByText('cool-repo'))

    expect(onProjectClick).toHaveBeenCalledTimes(1)
    expect(onProjectClick).toHaveBeenCalledWith('proj-99')
    expect(getPublicProjects).toHaveBeenCalledWith({ ecosystem: 'EcoOrg', limit: 100 })
    await waitFor(() => expect(getEcosystemDetail).toHaveBeenCalled())
  })
})
