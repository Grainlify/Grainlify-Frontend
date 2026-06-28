import { useState, useEffect } from 'react'
import { Search, ArrowRight, X, FileText, FolderGit2, User, ChevronLeft } from 'lucide-react'
import { useTheme } from '../../../shared/contexts/ThemeContext'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'

/**
 * Props for the {@link SearchPage} component.
 */
interface SearchPageProps {
  /** Callback triggered when clicking the back button. */
  onBack: () => void
  /** Callback triggered when clicking a search result of type 'issue'. */
  onIssueClick: (issueId: string) => void
  /** Callback triggered when clicking a search result of type 'project'. */
  onProjectClick: (projectId: string) => void
  /** Callback triggered when clicking a search result of type 'contributor'. */
  onContributorClick: (contributorId: string) => void
}

interface SearchResult {
  id: string
  type: 'issue' | 'project' | 'contributor'
  title: string
  subtitle?: string
  icon: any
}

/**
 * SearchPage component that provides accessible search functionality for
 * issues, projects, and contributors. Includes debounced search input,
 * clear search button, decorative icons hidden from screen readers,
 * and keyboard-friendly focus styling.
 *
 * @param props - Component props containing navigation and selection callbacks.
 * @returns An accessible search page interface.
 */
export function SearchPage({
  onBack,
  onIssueClick,
  onProjectClick,
  onContributorClick,
}: SearchPageProps) {
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const darkTheme = theme === 'dark'

  // Debounce the query so filtering only runs once the user pauses typing.
  const debouncedQuery = useDebouncedValue(searchQuery, 300)

  const searchSuggestions = [
    'Terminal-based markdown editors worth checking out',
    'Unity projects for procedural terrain generation',
    'Find the best GraphQL clients for TypeScript',
    'AI-powered tools for reviewing pull requests',
  ]

  // Mock data for search - in real app, this would come from API
  const allData = {
    issues: [
      { id: '1', title: 'Add dark mode support', project: 'React Dashboard' },
      { id: '2', title: 'Fix navigation bug in mobile view', project: 'Mobile App' },
      { id: '3', title: 'Implement user authentication', project: 'Backend API' },
      { id: '4', title: 'Update documentation for API endpoints', project: 'Backend API' },
      { id: '5', title: 'Refactor component structure', project: 'React Dashboard' },
    ],
    projects: [
      {
        id: '1',
        name: 'React Dashboard',
        description: 'Modern dashboard with React and TypeScript',
      },
      { id: '2', name: 'Mobile App', description: 'Cross-platform mobile application' },
      { id: '3', name: 'Backend API', description: 'RESTful API built with Node.js' },
      { id: '4', name: 'Design System', description: 'Component library and design tokens' },
    ],
    contributors: [
      { id: '1', name: 'Sarah Johnson', contributions: 245 },
      { id: '2', name: 'Mike Chen', contributions: 189 },
      { id: '3', name: 'Emily Rodriguez', contributions: 156 },
      { id: '4', name: 'David Park', contributions: 134 },
    ],
  }

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = debouncedQuery.toLowerCase()
    const results: SearchResult[] = []

    // Search issues
    allData.issues.forEach((issue) => {
      if (
        issue.title.toLowerCase().includes(query) ||
        issue.project.toLowerCase().includes(query)
      ) {
        results.push({
          id: issue.id,
          type: 'issue',
          title: issue.title,
          subtitle: issue.project,
          icon: FileText,
        })
      }
    })

    // Search projects
    allData.projects.forEach((project) => {
      if (
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
      ) {
        results.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: project.description,
          icon: FolderGit2,
        })
      }
    })

    // Search contributors
    allData.contributors.forEach((contributor) => {
      if (contributor.name.toLowerCase().includes(query)) {
        results.push({
          id: contributor.id,
          type: 'contributor',
          title: contributor.name,
          subtitle: `${contributor.contributions} contributions`,
          icon: User,
        })
      }
    })

    setSearchResults(results)
  }, [debouncedQuery])

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'issue') {
      onIssueClick(result.id)
    } else if (result.type === 'project') {
      onProjectClick(result.id)
    } else if (result.type === 'contributor') {
      onContributorClick(result.id)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
  }

  return (
    <div
      className={`min-h-screen rounded-[29px] transition-colors ${
        darkTheme ? 'bg-[#2d2820]/[0.4]' : 'bg-white/[0.35]'
      }`}
    >
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 mb-8 px-4 py-2 rounded-[12px] transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
            darkTheme
              ? 'bg-[#2d2820]/60 hover:bg-[#2d2820]/80 text-[#d4c5b0] focus-visible:ring-offset-[#2d2820]'
              : 'bg-white/60 hover:bg-white/80 text-[#6b5d4d] focus-visible:ring-offset-white'
          }`}
          style={{ backdropFilter: 'blur(20px)' }}
        >
          <ChevronLeft aria-hidden="true" className="w-4 h-4" />
          <span className="text-[14px] font-medium">Back</span>
        </button>

        {/* Main Heading */}
        <h1
          className={`text-[42px] font-bold text-center mb-4 leading-tight transition-colors ${
            darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          Search Open Source Projects and
          <br />
          Build Your Confidence
        </h1>

        {/* Subtitle */}
        <p
          className={`text-center text-[15px] mb-8 transition-colors ${
            darkTheme ? 'text-[#b8a898]/80' : 'text-[#6b5d4d]/80'
          }`}
        >
          Build your open source portfolio to optimize your chances of getting funded.
          <br />
          Explore projects that help you stand out.
        </p>

        {/* Search Input */}
        <div
          className={`relative h-[64px] rounded-[32px] mb-8 transition-colors ${
            darkTheme
              ? 'bg-[#2d2820]/60 border border-white/10'
              : 'bg-white/60 border border-black/10'
          }`}
          style={{ backdropFilter: 'blur(40px)' }}
        >
          <div className="absolute inset-0 flex items-center px-6">
            <Search
              aria-hidden="true"
              className={`w-5 h-5 mr-4 flex-shrink-0 transition-colors ${
                darkTheme ? 'text-white/50' : 'text-black/50'
              }`}
            />
            <input
              type="text"
              id="search-input"
              aria-label="Search issues, projects, and contributors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, projects, contributors..."
              autoFocus
              className={`flex-1 bg-transparent outline-none text-[16px] transition-colors ${
                darkTheme
                  ? 'text-white placeholder:text-white/40'
                  : 'text-[#2d2820] placeholder:text-black/40'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className={`w-8 h-8 rounded-full flex items-center justify-center ml-4 flex-shrink-0 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                  darkTheme
                    ? 'bg-white/10 hover:bg-white/20 text-white/60 focus-visible:ring-offset-[#2d2820]'
                    : 'bg-black/10 hover:bg-black/20 text-black/60 focus-visible:ring-offset-white'
                }`}
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              aria-label="Submit search"
              className={`w-10 h-10 rounded-full flex items-center justify-center ml-3 flex-shrink-0 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                darkTheme
                  ? 'bg-[#c9983a] hover:bg-[#d4a645] focus-visible:ring-offset-[#2d2820]'
                  : 'bg-[#c9983a] hover:bg-[#e8c571] focus-visible:ring-offset-white'
              }`}
            >
              <ArrowRight aria-hidden="true" className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h2
              className={`font-semibold mb-4 transition-colors ${
                darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}
            >
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  type="button"
                  onClick={() => handleResultClick(result)}
                  className={`group w-full flex items-center gap-4 px-6 py-4 rounded-[16px] transition-all hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                    darkTheme
                      ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 hover:border-white/10 focus-visible:ring-offset-[#2d2820]'
                      : 'bg-white/40 hover:bg-white/60 border border-black/5 hover:border-black/10 focus-visible:ring-offset-white'
                  }`}
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <div
                    className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${
                      darkTheme ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/30'
                    }`}
                  >
                    <result.icon
                      aria-hidden="true"
                      className={`w-5 h-5 ${darkTheme ? 'text-[#e8c77f]' : 'text-[#a2792c]'}`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div
                      className={`font-medium text-[15px] mb-1 transition-colors ${
                        darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
                      }`}
                    >
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div
                        className={`text-[13px] transition-colors ${
                          darkTheme ? 'text-[#b8a898]/70' : 'text-[#6b5d4d]/70'
                        }`}
                      >
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-colors ${
                      darkTheme
                        ? 'bg-[#c9983a]/20 text-[#e8c77f]'
                        : 'bg-[#c9983a]/30 text-[#a2792c]'
                    }`}
                  >
                    {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className={`w-4 h-4 flex-shrink-0 transition-all group-hover:translate-x-1 ${
                      darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery && searchResults.length === 0 && (
          <div
            className={`text-center py-12 transition-colors ${
              darkTheme ? 'text-[#b8a898]/60' : 'text-[#6b5d4d]/60'
            }`}
          >
            <Search aria-hidden="true" className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-[16px] font-medium mb-2">No results found</p>
            <p className="text-[14px]">Try searching for something else</p>
          </div>
        )}

        {/* Search Suggestions */}
        {!searchQuery && (
          <div>
            <h2
              className={`font-semibold mb-2 transition-colors ${
                darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}
            >
              Search suggestions
            </h2>
            <p
              className={`text-[13px] mb-4 transition-colors ${
                darkTheme ? 'text-[#b8a898]/70' : 'text-[#6b5d4d]/70'
              }`}
            >
              Discover interesting projects across different technologies
            </p>

            {/* Suggestion Pills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`group flex items-center justify-between px-5 py-4 rounded-[16px] transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                    darkTheme
                      ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 hover:border-white/10 focus-visible:ring-offset-[#2d2820]'
                      : 'bg-white/40 hover:bg-white/60 border border-black/5 hover:border-black/10 focus-visible:ring-offset-white'
                  }`}
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  <span
                    className={`text-left text-[14px] transition-colors ${
                      darkTheme ? 'text-[#d4c5b0]' : 'text-[#6b5d4d]'
                    }`}
                  >
                    {suggestion}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className={`w-4 h-4 ml-3 flex-shrink-0 transition-all group-hover:translate-x-1 ${
                      darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
