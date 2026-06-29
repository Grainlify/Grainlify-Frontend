import { useState, useEffect } from 'react'
import { Search, ArrowRight, X, FileText, FolderGit2, User, ChevronLeft } from 'lucide-react'
import { useTheme } from '../../../shared/contexts/ThemeContext'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { searchCatalog, getSearchSuggestions, type SearchResult } from '../../../shared/api/client'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const darkTheme = theme === 'dark'

  // Debounce the query so filtering only runs once the user pauses typing.
  const debouncedQuery = useDebouncedValue(searchQuery, 300)

  // Fallback default suggestions to maintain test compatibility & UX reliability.
  const fallbackSuggestions = [
    'Terminal-based markdown editors worth checking out',
    'Unity projects for procedural terrain generation',
    'Find the best GraphQL clients for TypeScript',
    'AI-powered tools for reviewing pull requests',
  ]

  // On mount, load recent searches and dynamic suggestions from the API
  useEffect(() => {
    try {
      const stored = localStorage.getItem('patchwork_recent_searches')
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load recent searches from localStorage', e)
    }

    let active = true
    getSearchSuggestions()
      .then((data) => {
        if (active && data && Array.isArray(data) && data.length > 0) {
          setSuggestions(data)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch search suggestions from API', err)
      })

    return () => {
      active = false
    }
  }, [])

  // Execute catalog search when debounced query changes, handles cancellation
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([])
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()

    const fetchResults = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const results = await searchCatalog(debouncedQuery, { signal: controller.signal })
        setSearchResults(results || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Catalog search failed:', err)
          setError(err.message || 'An error occurred while fetching search results.')
          setSearchResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()

    return () => {
      controller.abort()
    }
  }, [debouncedQuery])

  const addRecentSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...filtered].slice(0, 5)
      try {
        localStorage.setItem('patchwork_recent_searches', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save recent search to localStorage', e)
      }
      return updated
    })
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem('patchwork_recent_searches')
    } catch (e) {
      console.error('Failed to clear recent searches from localStorage', e)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    addRecentSearch(searchQuery)
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
    addRecentSearch(suggestion)
  }

  const getIconForType = (type: 'issue' | 'project' | 'contributor') => {
    switch (type) {
      case 'issue':
        return FileText
      case 'project':
        return FolderGit2
      case 'contributor':
        return User
      default:
        return FileText
    }
  }

  const displaySuggestions = suggestions.length > 0 ? suggestions : fallbackSuggestions

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

        {/* Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addRecentSearch(searchQuery)
          }}
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
              type="submit"
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
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12" data-testid="search-loader">
            <div
              className={`animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 ${
                darkTheme ? 'border-[#c9983a]' : 'border-[#a2792c]'
              }`}
            />
            <p
              className={`mt-4 text-[14px] font-medium transition-colors ${
                darkTheme ? 'text-[#b8a898]' : 'text-[#6b5d4d]'
              }`}
            >
              Searching the catalog...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            className={`flex flex-col items-center justify-center py-12 px-6 rounded-[24px] border ${
              darkTheme
                ? 'bg-red-950/20 border-red-900/30 text-red-200'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
            data-testid="search-error"
          >
            <p className="text-[16px] font-semibold mb-2">Search failed</p>
            <p className="text-[14px] text-center mb-4">{error}</p>
            <button
              type="button"
              onClick={() => {
                const currentQuery = searchQuery
                setSearchQuery('')
                setTimeout(() => setSearchQuery(currentQuery), 0)
              }}
              className={`px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                darkTheme
                  ? 'bg-red-900/40 hover:bg-red-900/60 text-white focus-visible:ring-offset-[#2d2820]'
                  : 'bg-red-100 hover:bg-red-200 text-red-900 focus-visible:ring-offset-white'
              }`}
            >
              Try again
            </button>
          </div>
        )}

        {/* Search Results */}
        {!isLoading && !error && searchResults.length > 0 && (
          <div className="mb-12">
            <h2
              className={`font-semibold mb-4 transition-colors ${
                darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}
            >
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {searchResults.map((result, index) => {
                const IconComponent = getIconForType(result.type)
                return (
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
                      <IconComponent
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
                )
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && searchQuery && searchResults.length === 0 && (
          <div
            className={`text-center py-12 transition-colors ${
              darkTheme ? 'text-[#b8a898]/60' : 'text-[#6b5d4d]/60'
            }`}
          >
            <Search aria-hidden="true" className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-[16px] font-medium mb-2">No results found for "{searchQuery}"</p>
            <p className="text-[14px]">Try searching for something else</p>
          </div>
        )}

        {/* Search Suggestions and Recent Searches */}
        {!searchQuery && (
          <div>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-8" data-testid="recent-searches-section">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className={`font-semibold transition-colors ${
                      darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]'
                    }`}
                  >
                    Recent searches
                  </h2>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className={`text-[12px] font-medium transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                      darkTheme ? 'text-[#e8c77f] focus-visible:ring-offset-[#2d2820]' : 'text-[#a2792c] focus-visible:ring-offset-white'
                    }`}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-[20px] text-[13px] font-medium transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] focus-visible:ring-offset-2 ${
                        darkTheme
                          ? 'bg-[#2d2820]/40 hover:bg-[#2d2820]/60 border border-white/5 text-[#d4c5b0] focus-visible:ring-offset-[#2d2820]'
                          : 'bg-white/40 hover:bg-white/60 border border-black/5 text-[#6b5d4d] focus-visible:ring-offset-white'
                      }`}
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* API Suggestions */}
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
                {displaySuggestions.map((suggestion, index) => (
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
          </div>
        )}
      </div>
    </div>
  )
}
