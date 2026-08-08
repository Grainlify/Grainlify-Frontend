import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { SearchPage } from './SearchPage'
import { searchAll } from '../../../shared/api/client'

// SearchPage debounces (300ms) then calls the real searchAll(query) endpoint
// and renders whatever it returns - no local/mock dataset anymore.
vi.mock('../../../shared/api/client', () => ({
  searchAll: vi.fn(),
}))

const mockedSearchAll = vi.mocked(searchAll)

type SearchResponse = Awaited<ReturnType<typeof searchAll>>

function emptyResults(): SearchResponse {
  return { projects: [], issues: [], contributors: [] }
}

function renderSearchPage() {
  const onBack = vi.fn()
  const onIssueClick = vi.fn()
  const onProjectClick = vi.fn()
  const onContributorClick = vi.fn()

  const utils = renderWithProviders(
    <SearchPage
      onBack={onBack}
      onIssueClick={onIssueClick}
      onProjectClick={onProjectClick}
      onContributorClick={onContributorClick}
    />,
  )

  return { ...utils, onBack, onIssueClick, onProjectClick, onContributorClick }
}

const SEARCH_INPUT_PLACEHOLDER = 'Search issues, projects, contributors...'
const WAIT_OPTS = { timeout: 2000 }

beforeEach(() => {
  mockedSearchAll.mockReset()
})

describe('SearchPage', () => {
  it('shows real, clickable suggestions when the query is empty, and never calls searchAll', () => {
    renderSearchPage()

    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
    expect(screen.getByText('Good first issues')).toBeInTheDocument()
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument()
    expect(mockedSearchAll).not.toHaveBeenCalled()
  })

  it('clicking a suggestion fills the search box with its text', async () => {
    mockedSearchAll.mockResolvedValue(emptyResults())
    const user = userEvent.setup()
    renderSearchPage()

    await user.click(screen.getByText('Good first issues'))

    expect(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER)).toHaveValue('Good first issues')
  })

  it('does not call searchAll for a single-character query', async () => {
    const user = userEvent.setup()
    renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'a')

    // Give the debounce window a chance to fire if it were going to.
    await new Promise((r) => setTimeout(r, 400))
    expect(mockedSearchAll).not.toHaveBeenCalled()
  })

  it('finds a matching project and calls onProjectClick with its id when clicked', async () => {
    mockedSearchAll.mockResolvedValue({
      projects: [{ id: 'proj-1', github_full_name: 'grainlify/alpha-lib', description: 'A library', ecosystem_name: 'Stellar' }],
      issues: [],
      contributors: [],
    })
    const user = userEvent.setup()
    const { onProjectClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'alpha')

    await waitFor(() => expect(screen.getByText('Search Results (1)')).toBeInTheDocument(), WAIT_OPTS)
    // Title is the repo name only (getRepoName strips the owner prefix).
    const result = screen.getByText('alpha-lib')
    expect(screen.getByText('A library')).toBeInTheDocument()

    await user.click(result)

    expect(onProjectClick).toHaveBeenCalledTimes(1)
    expect(onProjectClick).toHaveBeenCalledWith('proj-1')
  })

  it('finds a matching issue and calls onIssueClick with both issue id and project id', async () => {
    mockedSearchAll.mockResolvedValue({
      projects: [],
      issues: [{ id: 'issue-1', title: 'Fix the navigation bug', number: 42, project_id: 'proj-9', project_full_name: 'grainlify/mobile-app' }],
      contributors: [],
    })
    const user = userEvent.setup()
    const { onIssueClick, onProjectClick, onContributorClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'navigation bug')

    await waitFor(() => expect(screen.getByText('Search Results (1)')).toBeInTheDocument(), WAIT_OPTS)
    const result = screen.getByText('Fix the navigation bug')
    expect(screen.getByText('mobile-app')).toBeInTheDocument()

    await user.click(result)

    expect(onIssueClick).toHaveBeenCalledTimes(1)
    expect(onIssueClick).toHaveBeenCalledWith('issue-1', 'proj-9')
    expect(onProjectClick).not.toHaveBeenCalled()
    expect(onContributorClick).not.toHaveBeenCalled()
  })

  it('finds a matching contributor and calls onContributorClick with their login', async () => {
    mockedSearchAll.mockResolvedValue({
      projects: [],
      issues: [],
      contributors: [{ login: 'sarahjohnson', user_id: 'user-5', avatar_url: 'https://cdn.example/sarah.png', contributions: 245 }],
    })
    const user = userEvent.setup()
    const { onContributorClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'sarah')

    await waitFor(() => expect(screen.getByText('Search Results (1)')).toBeInTheDocument(), WAIT_OPTS)
    expect(screen.getByText('245 contributions')).toBeInTheDocument()
    const result = screen.getByText('sarahjohnson')

    await user.click(result)

    expect(onContributorClick).toHaveBeenCalledTimes(1)
    expect(onContributorClick).toHaveBeenCalledWith('sarahjohnson')
  })

  it('shows a no-results state when the API returns nothing', async () => {
    mockedSearchAll.mockResolvedValue(emptyResults())
    const user = userEvent.setup()
    renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'zzz_nonexistent_zzz')

    await waitFor(() => expect(screen.getByText('No results found')).toBeInTheDocument(), WAIT_OPTS)
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument()
  })

  it('shows an unavailable message, not a silent empty state, when the search request fails', async () => {
    mockedSearchAll.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()
    renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'anything')

    await waitFor(() => expect(screen.getByText('Search is temporarily unavailable')).toBeInTheDocument(), WAIT_OPTS)
  })

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = renderSearchPage()

    await user.click(screen.getByRole('button', { name: /Back/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
