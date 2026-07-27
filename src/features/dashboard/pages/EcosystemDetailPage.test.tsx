import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { EcosystemDetailPage } from './EcosystemDetailPage'

const mockGetPublicProjects = vi.fn()
const mockGetEcosystemDetail = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getPublicProjects: (...a: unknown[]) => mockGetPublicProjects(...a),
  getEcosystemDetail: (...a: unknown[]) => mockGetEcosystemDetail(...a),
}))

vi.mock('lucide-react', () => {
  const noop = () => null
  return {
    ChevronRight: noop,
    ExternalLink: noop,
    Users: noop,
    FolderGit2: noop,
    AlertCircle: noop,
    GitPullRequest: noop,
    Star: noop,
    GitFork: noop,
    Package: noop,
    Filter: noop,
    Search: noop,
    X: noop,
    Circle: noop,
    ChevronDown: noop,
    Check: noop,
  }
})

const onBack = vi.fn()
const onProjectClick = vi.fn()

const mockProjects = [
  {
    id: 'p1',
    github_full_name: 'owner/ts-project',
    language: 'typescript',
    category: 'frontend',
    tags: ['React'],
    stars_count: 100,
    forks_count: 10,
    contributors_count: 5,
    open_issues_count: 2,
    open_prs_count: 1,
    ecosystem_name: 'TestEco',
    description: 'TypeScript frontend project',
  },
  {
    id: 'p2',
    github_full_name: 'owner/js-project',
    language: 'javascript',
    category: 'backend',
    tags: ['Node'],
    stars_count: 200,
    forks_count: 20,
    contributors_count: 8,
    open_issues_count: 3,
    open_prs_count: 2,
    ecosystem_name: 'TestEco',
    description: 'JavaScript backend project',
  },
  {
    id: 'p3',
    github_full_name: 'owner/py-project',
    language: 'python',
    category: 'fullstack',
    tags: ['Django'],
    stars_count: 300,
    forks_count: 30,
    contributors_count: 12,
    open_issues_count: 5,
    open_prs_count: 3,
    ecosystem_name: 'TestEco',
    description: 'Python fullstack project',
  },
  {
    id: 'p4',
    github_full_name: 'owner/rust-project',
    language: 'rust',
    category: 'devops',
    tags: ['CLI'],
    stars_count: 400,
    forks_count: 40,
    contributors_count: 15,
    open_issues_count: 1,
    open_prs_count: 0,
    ecosystem_name: 'TestEco',
    description: 'Rust devops project',
  },
  {
    id: 'p5',
    github_full_name: 'owner/null-lang-project',
    language: null,
    category: 'frontend',
    tags: [],
    stars_count: 50,
    forks_count: 5,
    contributors_count: 2,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: 'TestEco',
    description: 'Project with null language',
  },
  {
    id: 'p6',
    github_full_name: 'owner/null-cat-project',
    language: 'typescript',
    category: null,
    tags: [],
    stars_count: 60,
    forks_count: 6,
    contributors_count: 3,
    open_issues_count: 1,
    open_prs_count: 1,
    ecosystem_name: 'TestEco',
    description: 'Project with null category',
  },
  {
    id: 'p7',
    github_full_name: 'owner/both-null-project',
    language: null,
    category: null,
    tags: [],
    stars_count: 70,
    forks_count: 7,
    contributors_count: 4,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: 'TestEco',
    description: 'Project with both null',
  },
]

function renderPage() {
  return render(
    <ThemeProvider>
      <EcosystemDetailPage
        ecosystemId="eco-1"
        ecosystemName="TestEco"
        onBack={onBack}
        onProjectClick={onProjectClick}
      />
    </ThemeProvider>
  )
}

async function switchToProjectsTab() {
  await userEvent.click(screen.getByRole('button', { name: /projects/i }))
}

async function waitForProjectsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('ts-project')).toBeInTheDocument()
  })
}

function openFilterPanel() {
  // The SearchWithFilter bar contains a search input and a filter button.
  // The filter button is a sibling of the search input's container.
  // Since lucide icons are mocked to null, the filter button is empty.
  // We find it by locating the search input, then finding the button that's
  // the previous sibling of its parent.
  const searchInput = screen.getByPlaceholderText('Search')
  const searchContainer = searchInput.closest('div.relative')!
  const filterBar = searchContainer.parentElement!
  const filterButton = filterBar.querySelector('button')!
  fireEvent.click(filterButton)
}

function toggleFilterOption(label: string) {
  const option = screen.getByRole('button', { name: label })
  fireEvent.click(option)
}

beforeEach(() => {
  mockGetPublicProjects.mockReset()
  mockGetEcosystemDetail.mockReset()
  onBack.mockReset()
  onProjectClick.mockReset()
  mockGetEcosystemDetail.mockResolvedValue({
    id: 'eco-1',
    name: 'TestEco',
    description: 'Test ecosystem',
    logo_url: null,
    project_count: 7,
    contributors_count: 50,
    open_issues_count: 10,
    open_prs_count: 8,
    links: [],
    key_areas: [],
    technologies: [],
    about: '',
  })
  mockGetPublicProjects.mockResolvedValue({ projects: mockProjects })
})

describe('EcosystemDetailPage — filtering', () => {
  describe('search only', () => {
    it('shows all projects initially', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()
      expect(screen.getByText('ts-project')).toBeInTheDocument()
      expect(screen.getByText('js-project')).toBeInTheDocument()
      expect(screen.getByText('py-project')).toBeInTheDocument()
      expect(screen.getByText('rust-project')).toBeInTheDocument()
      expect(screen.getByText('null-lang-project')).toBeInTheDocument()
      expect(screen.getByText('null-cat-project')).toBeInTheDocument()
      expect(screen.getByText('both-null-project')).toBeInTheDocument()
    })

    it('filters projects by name search', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      const searchInput = screen.getByPlaceholderText('Search')
      await userEvent.type(searchInput, 'ts-project')

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
      })
    })

    it('filters projects by description search', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      const searchInput = screen.getByPlaceholderText('Search')
      await userEvent.type(searchInput, 'Rust devops')

      await waitFor(() => {
        expect(screen.getByText('rust-project')).toBeInTheDocument()
        expect(screen.queryByText('ts-project')).not.toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
      })
    })
  })

  describe('language filter', () => {
    it('filters by selected language', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
        expect(screen.queryByText('rust-project')).not.toBeInTheDocument()
      })
    })

    it('excludes projects with null language when language filter is active', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('null-lang-project')).not.toBeInTheDocument()
        expect(screen.queryByText('both-null-project')).not.toBeInTheDocument()
      })
    })

    it('shows all projects when no language is selected', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.getByText('js-project')).toBeInTheDocument()
        expect(screen.getByText('null-lang-project')).toBeInTheDocument()
      })
    })

    it('filters by multiple selected languages', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      toggleFilterOption('JavaScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.getByText('js-project')).toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
        expect(screen.queryByText('rust-project')).not.toBeInTheDocument()
      })
    })
  })

  describe('category filter', () => {
    it('filters by selected category', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
        expect(screen.queryByText('rust-project')).not.toBeInTheDocument()
      })
    })

    it('excludes projects with null category when category filter is active', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('null-cat-project')).not.toBeInTheDocument()
        expect(screen.queryByText('both-null-project')).not.toBeInTheDocument()
      })
    })

    it('shows all projects when no category is selected', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Categories'))
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.getByText('js-project')).toBeInTheDocument()
        expect(screen.getByText('null-cat-project')).toBeInTheDocument()
      })
    })

    it('filters by multiple selected categories', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      toggleFilterOption('Backend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.getByText('js-project')).toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
        expect(screen.queryByText('rust-project')).not.toBeInTheDocument()
      })
    })
  })

  describe('combined filters', () => {
    it('applies language + category with AND semantics', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
        expect(screen.queryByText('py-project')).not.toBeInTheDocument()
        expect(screen.queryByText('rust-project')).not.toBeInTheDocument()
      })
    })

    it('applies search + language with AND semantics', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search')
      await userEvent.type(searchInput, 'frontend')

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('null-lang-project')).not.toBeInTheDocument()
      })
    })

    it('applies search + category with AND semantics', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search')
      await userEvent.type(searchInput, 'TypeScript')

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('null-cat-project')).not.toBeInTheDocument()
      })
    })

    it('applies search + language + category with AND semantics', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search')
      await userEvent.type(searchInput, 'TypeScript frontend')

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.queryByText('null-lang-project')).not.toBeInTheDocument()
        expect(screen.queryByText('null-cat-project')).not.toBeInTheDocument()
      })
    })
  })

  describe('reset', () => {
    it('clears all filters and restores full project list', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('js-project')).not.toBeInTheDocument()
      })

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Reset'))
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.getByText('ts-project')).toBeInTheDocument()
        expect(screen.getByText('js-project')).toBeInTheDocument()
        expect(screen.getByText('py-project')).toBeInTheDocument()
        expect(screen.getByText('rust-project')).toBeInTheDocument()
        expect(screen.getByText('null-lang-project')).toBeInTheDocument()
        expect(screen.getByText('null-cat-project')).toBeInTheDocument()
        expect(screen.getByText('both-null-project')).toBeInTheDocument()
      })
    })
  })

  describe('null values', () => {
    it('projects with null language are excluded under active language filter', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('null-lang-project')).not.toBeInTheDocument()
        expect(screen.queryByText('both-null-project')).not.toBeInTheDocument()
        expect(screen.getByText('null-cat-project')).toBeInTheDocument()
      })
    })

    it('projects with null category are excluded under active category filter', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Categories'))
      toggleFilterOption('Frontend')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('null-cat-project')).not.toBeInTheDocument()
        expect(screen.queryByText('both-null-project')).not.toBeInTheDocument()
        expect(screen.getByText('null-lang-project')).toBeInTheDocument()
      })
    })

    it('projects with both null language and category are excluded under any active filter', async () => {
      renderPage()
      await switchToProjectsTab()
      await waitForProjectsLoaded()

      openFilterPanel()
      await waitFor(() => {
        expect(screen.getByText('Languages')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Languages'))
      toggleFilterOption('TypeScript')
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('both-null-project')).not.toBeInTheDocument()
      })
    })
  })
})
